import crypto from 'crypto';
import { getSupabaseAdmin } from '../config/supabase.ts';
import { isSupabaseConfigured } from '../config/env.ts';

export interface CertificateRecord {
  id: string;
  user_id: string;
  course_id: string;
  certificate_number: string;
  issued_at: string;
  final_score: number;
  verification_status: 'valid' | 'revoked';
  course_title?: string;
  programming_language?: string;
  learner_name?: string;
}

export const getUserCertificates = async (userId: string): Promise<CertificateRecord[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const admin = getSupabaseAdmin();
  const { data: certs, error } = await admin
    .from('certificates')
    .select(`
      id,
      user_id,
      course_id,
      certificate_number,
      issued_at,
      final_score,
      verification_status,
      courses (title, programming_language),
      profiles (full_name)
    `)
    .eq('user_id', userId)
    .order('issued_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch certificates: ${error.message}`);
  }

  return (certs || []).map((c: any) => ({
    id: c.id,
    user_id: c.user_id,
    course_id: c.course_id,
    certificate_number: c.certificate_number,
    issued_at: c.issued_at,
    final_score: c.final_score,
    verification_status: c.verification_status,
    course_title: c.courses?.title,
    programming_language: c.courses?.programming_language,
    learner_name: c.profiles?.full_name,
  }));
};

export const issueCertificate = async (userId: string, courseId: string): Promise<CertificateRecord> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase database is not configured');
  }

  const admin = getSupabaseAdmin();

  // 1. Check if certificate already exists
  const { data: existingCert } = await admin
    .from('certificates')
    .select(`
      id,
      user_id,
      course_id,
      certificate_number,
      issued_at,
      final_score,
      verification_status,
      courses (title, programming_language),
      profiles (full_name)
    `)
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single();

  if (existingCert) {
    return {
      id: existingCert.id,
      user_id: existingCert.user_id,
      course_id: existingCert.course_id,
      certificate_number: existingCert.certificate_number,
      issued_at: existingCert.issued_at,
      final_score: existingCert.final_score,
      verification_status: existingCert.verification_status,
      course_title: (existingCert.courses as any)?.title,
      programming_language: (existingCert.courses as any)?.programming_language,
      learner_name: (existingCert.profiles as any)?.full_name,
    };
  }

  // 2. Fetch all published levels for this course
  const { data: levels, error: lvlErr } = await admin
    .from('levels')
    .select('id, level_number, title')
    .eq('course_id', courseId)
    .eq('published', true);

  if (lvlErr || !levels || levels.length === 0) {
    throw new Error('No published levels found for this course');
  }

  // 3. Verify user has completed EVERY level in this course
  const { data: userLevels, error: userLvlErr } = await admin
    .from('user_level_progress')
    .select('level_id, status, best_score')
    .eq('user_id', userId)
    .in('level_id', levels.map(l => l.id));

  if (userLvlErr || !userLevels) {
    throw new Error('Could not verify level completion status');
  }

  const completedMap = new Map<string, number>();
  userLevels.forEach(ul => {
    if (ul.status === 'completed') {
      completedMap.set(ul.level_id, ul.best_score);
    }
  });

  const uncompletedLevels = levels.filter(l => !completedMap.has(l.id));
  if (uncompletedLevels.length > 0) {
    const error: any = new Error(
      `Certificate cannot be issued: ${uncompletedLevels.length} level(s) remain uncompleted.`
    );
    error.status = 400;
    throw error;
  }

  // 4. Calculate Final Average Score across all levels
  let totalScore = 0;
  levels.forEach(l => {
    totalScore += completedMap.get(l.id) || 0;
  });
  const finalScore = Math.round(totalScore / levels.length);

  // 5. Fetch course details for code prefix
  const { data: course } = await admin
    .from('courses')
    .select('title, programming_language')
    .eq('id', courseId)
    .single();

  const langCode = (course?.programming_language || 'DEV').substring(0, 3).toUpperCase();
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const year = new Date().getFullYear();
  const certificateNumber = `CE-${langCode}-${year}-${randomSuffix}`;

  // 6. Insert Certificate
  const { data: newCert, error: insertErr } = await admin
    .from('certificates')
    .insert({
      user_id: userId,
      course_id: courseId,
      certificate_number: certificateNumber,
      issued_at: new Date().toISOString(),
      final_score: finalScore,
      verification_status: 'valid',
    })
    .select(`
      id,
      user_id,
      course_id,
      certificate_number,
      issued_at,
      final_score,
      verification_status,
      profiles (full_name)
    `)
    .single();

  if (insertErr || !newCert) {
    throw new Error(`Failed to issue certificate: ${insertErr?.message}`);
  }

  return {
    id: newCert.id,
    user_id: newCert.user_id,
    course_id: newCert.course_id,
    certificate_number: newCert.certificate_number,
    issued_at: newCert.issued_at,
    final_score: newCert.final_score,
    verification_status: newCert.verification_status,
    course_title: course?.title,
    programming_language: course?.programming_language,
    learner_name: (newCert.profiles as any)?.full_name,
  };
};

export const verifyCertificate = async (certificateNumber: string) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Database is not configured');
  }

  const admin = getSupabaseAdmin();

  // Try RPC verify_certificate function if available
  try {
    const { data: rpcData, error: rpcErr } = await admin.rpc('verify_certificate', {
      p_certificate_number: certificateNumber,
    });
    if (!rpcErr && rpcData && rpcData.length > 0) {
      return rpcData[0];
    }
  } catch {
    // Fall back to direct query
  }

  // Safe minimal query (no private emails or credentials)
  const { data: cert, error } = await admin
    .from('certificates')
    .select(`
      certificate_number,
      issued_at,
      final_score,
      verification_status,
      courses (title, programming_language),
      profiles (full_name)
    `)
    .eq('certificate_number', certificateNumber)
    .single();

  if (error || !cert) {
    const err: any = new Error('Certificate not found or invalid');
    err.status = 404;
    throw err;
  }

  return {
    certificate_number: cert.certificate_number,
    course_title: (cert.courses as any)?.title,
    programming_language: (cert.courses as any)?.programming_language,
    learner_name: (cert.profiles as any)?.full_name || 'Verified Learner',
    issued_at: cert.issued_at,
    final_score: cert.final_score,
    verification_status: cert.verification_status,
  };
};
