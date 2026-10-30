import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../config/supabase.ts';
import { profileUpdateSchema } from '../validation/schemas.ts';
import { calculateStreak } from '../services/leaderboardService.ts';
import { isSupabaseConfigured } from '../config/env.ts';

export const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }

    const admin = getSupabaseAdmin();

    // 1. Fetch profile
    const { data: profile, error } = await admin
      .from('profiles')
      .select('id, full_name, email, avatar_url, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // 2. Fetch total verified XP
    const { data: xpData } = await admin
      .from('xp_events')
      .select('xp')
      .eq('user_id', userId);

    const totalXp = (xpData || []).reduce((acc, curr) => acc + curr.xp, 0);

    // 3. Compute streak
    const streak = await calculateStreak(userId);

    // 4. Fetch enrolled/completed courses summary
    const { data: coursesProgress } = await admin
      .from('user_course_progress')
      .select('course_id, completed_levels, current_level, courses (title, programming_language)')
      .eq('user_id', userId);

    // 5. Fetch certificates
    const { data: certs } = await admin
      .from('certificates')
      .select('id, certificate_number, course_id, issued_at, final_score, courses (title)')
      .eq('user_id', userId);

    res.json({
      profile: {
        id: userId,
        full_name: profile?.full_name || req.user!.user_metadata?.full_name || 'CodeEase Learner',
        email: profile?.email || req.user!.email || '',
        avatar_url: profile?.avatar_url || '',
        created_at: profile?.created_at,
      },
      stats: {
        total_xp: totalXp,
        streak_days: streak,
        completed_courses_count: certs?.length || 0,
        enrolled_courses_count: coursesProgress?.length || 0,
      },
      enrolled_courses: coursesProgress || [],
      certificates: certs || [],
    });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const validated = profileUpdateSchema.parse(req.body);

    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('profiles')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      message: 'Profile updated successfully',
      profile: data,
    });
  } catch (err) {
    next(err);
  }
};
