import { getSupabaseAdmin, getSupabaseClient } from '../config/supabase.ts';
import { isSupabaseConfigured } from '../config/env.ts';

export interface CourseData {
  id: string;
  title: string;
  description: string;
  programming_language: string;
  difficulty: string;
  thumbnail_url: string;
  published: boolean;
  total_levels?: number;
  user_progress?: {
    completed_levels: number;
    current_level: number;
    total_xp: number;
    has_certificate: boolean;
  };
}

export interface LevelSummary {
  id: string;
  course_id: string;
  level_number: number;
  title: string;
  description: string;
  difficulty: string;
  passing_score: number;
  status: 'locked' | 'unlocked' | 'in_progress' | 'completed';
  best_score: number;
  attempts: number;
}

export const listCourses = async (userId?: string): Promise<CourseData[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data: courses, error } = await supabase
    .from('courses')
    .select(`
      id,
      title,
      description,
      programming_language,
      difficulty,
      thumbnail_url,
      published,
      levels (id)
    `)
    .eq('published', true)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch courses: ${error.message}`);
  }

  let progressMap: Record<string, any> = {};
  let certMap: Record<string, boolean> = {};

  if (userId) {
    const { data: progress } = await supabase
      .from('user_course_progress')
      .select('course_id, completed_levels, current_level, total_xp')
      .eq('user_id', userId);

    if (progress) {
      progress.forEach(p => {
        progressMap[p.course_id] = p;
      });
    }

    const { data: certs } = await supabase
      .from('certificates')
      .select('course_id')
      .eq('user_id', userId)
      .eq('verification_status', 'valid');

    if (certs) {
      certs.forEach(c => {
        certMap[c.course_id] = true;
      });
    }
  }

  return (courses || []).map(c => {
    const totalLevels = Array.isArray(c.levels) ? c.levels.length : 0;
    const prog = progressMap[c.id];
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      programming_language: c.programming_language,
      difficulty: c.difficulty,
      thumbnail_url: c.thumbnail_url,
      published: c.published,
      total_levels: totalLevels,
      user_progress: userId
        ? {
            completed_levels: prog?.completed_levels || 0,
            current_level: prog?.current_level || 1,
            total_xp: prog?.total_xp || 0,
            has_certificate: Boolean(certMap[c.id]),
          }
        : undefined,
    };
  });
};

export const getCourseDetails = async (courseId: string, userId?: string) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Database is not configured');
  }

  const supabase = getSupabaseClient();

  // 1. Get Course
  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .eq('published', true)
    .single();

  if (courseErr || !course) {
    throw new Error('Course not found');
  }

  // 2. Get Levels ordered by level_number
  const { data: levels, error: levelsErr } = await supabase
    .from('levels')
    .select('id, course_id, level_number, title, description, difficulty, passing_score')
    .eq('course_id', courseId)
    .eq('published', true)
    .order('level_number', { ascending: true });

  if (levelsErr) {
    throw new Error(`Failed to fetch levels: ${levelsErr.message}`);
  }

  // 3. Get User Level Progress if authenticated
  let levelProgressMap: Record<string, { status: 'locked' | 'unlocked' | 'in_progress' | 'completed'; best_score: number; attempts: number }> = {};
  
  if (userId) {
    const { data: progressList } = await supabase
      .from('user_level_progress')
      .select('level_id, status, best_score, attempts')
      .eq('user_id', userId);

    if (progressList) {
      progressList.forEach(p => {
        levelProgressMap[p.level_id] = {
          status: p.status as any,
          best_score: p.best_score,
          attempts: p.attempts,
        };
      });
    }
  }

  // Calculate sequential unlock statuses
  let previousLevelPassed = true;
  const processedLevels: LevelSummary[] = (levels || []).map(lvl => {
    const existingProg = levelProgressMap[lvl.id];
    let status: 'locked' | 'unlocked' | 'in_progress' | 'completed' = 'locked';

    if (existingProg) {
      status = existingProg.status;
    } else if (lvl.level_number === 1 || previousLevelPassed) {
      status = 'unlocked';
    }

    if (status === 'completed') {
      previousLevelPassed = true;
    } else {
      previousLevelPassed = false;
    }

    return {
      id: lvl.id,
      course_id: lvl.course_id,
      level_number: lvl.level_number,
      title: lvl.title,
      description: lvl.description,
      difficulty: lvl.difficulty,
      passing_score: lvl.passing_score,
      status,
      best_score: existingProg?.best_score || 0,
      attempts: existingProg?.attempts || 0,
    };
  });

  return {
    course,
    levels: processedLevels,
  };
};

export const getLevelDetails = async (levelId: string, userId: string) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Database is not configured');
  }

  const supabase = getSupabaseClient();

  // 1. Fetch level details
  const { data: level, error: levelErr } = await supabase
    .from('levels')
    .select('*, courses (title, programming_language)')
    .eq('id', levelId)
    .eq('published', true)
    .single();

  if (levelErr || !level) {
    const err: any = new Error('Level not found');
    err.status = 404;
    throw err;
  }

  // 2. Sequential Unlocking Check
  if (level.level_number > 1) {
    // Check if previous level in this course was completed by user
    const { data: prevLevel } = await supabase
      .from('levels')
      .select('id')
      .eq('course_id', level.course_id)
      .eq('level_number', level.level_number - 1)
      .single();

    if (prevLevel) {
      const { data: prevProgress } = await supabase
        .from('user_level_progress')
        .select('status')
        .eq('user_id', userId)
        .eq('level_id', prevLevel.id)
        .single();

      if (!prevProgress || prevProgress.status !== 'completed') {
        const err: any = new Error('Access Denied: You must pass Level ' + (level.level_number - 1) + ' before accessing this level.');
        err.status = 403;
        throw err;
      }
    }
  }

  // 3. Fetch questions without correct answers
  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select('id, level_id, question_text, question_type, options, points, explanation')
    .eq('level_id', levelId)
    .order('created_at', { ascending: true });

  if (qErr) {
    throw new Error(`Failed to fetch questions: ${qErr.message}`);
  }

  // 4. Fetch user's current progress for this level
  const { data: userLevelProg } = await supabase
    .from('user_level_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('level_id', levelId)
    .single();

  return {
    level,
    questions: questions || [],
    user_progress: userLevelProg || {
      status: 'unlocked',
      best_score: 0,
      attempts: 0,
    },
  };
};
