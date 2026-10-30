import { getSupabaseAdmin } from '../config/supabase.ts';
import { isSupabaseConfigured } from '../config/env.ts';

export interface QuizSubmissionAnswer {
  question_id: string;
  answer: string;
}

export interface QuizGradingResult {
  passed: boolean;
  score: number;
  total_questions: number;
  correct_count: number;
  passing_score: number;
  xp_awarded: number;
  results: Array<{
    question_id: string;
    question_text: string;
    user_answer: string;
    is_correct: boolean;
    correct_answer?: string;
    explanation?: string;
  }>;
  next_level_id?: string;
}

export const submitAndGradeQuiz = async (
  userId: string,
  levelId: string,
  answers: QuizSubmissionAnswer[]
): Promise<QuizGradingResult> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase database is not configured');
  }

  const admin = getSupabaseAdmin();

  // Try PostgreSQL RPC function first (atomic transaction)
  try {
    const { data, error } = await admin.rpc('submit_quiz_attempt', {
      p_user_id: userId,
      p_level_id: levelId,
      p_answers: answers,
    });

    if (!error && data) {
      return data as QuizGradingResult;
    }
    // If RPC is missing or failed with custom message, log and fall through to direct admin queries
    if (error && error.message.includes('locked')) {
      const err: any = new Error(error.message);
      err.status = 403;
      throw err;
    }
  } catch (rpcErr: any) {
    if (rpcErr.status === 403) throw rpcErr;
    console.warn('RPC submit_quiz_attempt call failed or not found, using server-side grading transaction fallback:', rpcErr.message);
  }

  // Fallback Server-Side Grading Transaction using Supabase Admin
  // 1. Get level details
  const { data: level, error: lvlErr } = await admin
    .from('levels')
    .select('id, course_id, level_number, passing_score')
    .eq('id', levelId)
    .single();

  if (lvlErr || !level) {
    const err: any = new Error('Level not found');
    err.status = 404;
    throw err;
  }

  // 2. Sequential unlock verification
  if (level.level_number > 1) {
    const { data: prevLevel } = await admin
      .from('levels')
      .select('id')
      .eq('course_id', level.course_id)
      .eq('level_number', level.level_number - 1)
      .single();

    if (prevLevel) {
      const { data: prevProg } = await admin
        .from('user_level_progress')
        .select('status')
        .eq('user_id', userId)
        .eq('level_id', prevLevel.id)
        .single();

      if (!prevProg || prevProg.status !== 'completed') {
        const err: any = new Error('This level is locked. Complete previous levels first.');
        err.status = 403;
        throw err;
      }
    }
  }

  // 3. Fetch all questions and their protected correct answers
  const { data: questions, error: qErr } = await admin
    .from('questions')
    .select('id, question_text, explanation')
    .eq('level_id', levelId);

  if (qErr || !questions) {
    throw new Error('Failed to retrieve quiz questions');
  }

  const { data: answersKey, error: ansErr } = await admin
    .from('question_answers')
    .select('question_id, correct_answer')
    .in('question_id', questions.map(q => q.id));

  if (ansErr || !answersKey) {
    throw new Error('Failed to retrieve answer key');
  }

  const correctAnswersMap: Record<string, string> = {};
  answersKey.forEach(a => {
    correctAnswersMap[a.question_id] = a.correct_answer;
  });

  const userAnswersMap: Record<string, string> = {};
  answers.forEach(a => {
    userAnswersMap[a.question_id] = a.answer;
  });

  let correctCount = 0;
  const results: QuizGradingResult['results'] = [];

  for (const q of questions) {
    const userAnswer = userAnswersMap[q.id] || '';
    const correctAnswer = correctAnswersMap[q.id] || '';
    const isCorrect = Boolean(
      userAnswer &&
      correctAnswer &&
      userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
    );

    if (isCorrect) correctCount++;

    results.push({
      question_id: q.id,
      question_text: q.question_text,
      user_answer: userAnswer,
      is_correct: isCorrect,
      correct_answer: correctAnswer,
      explanation: q.explanation || undefined,
    });
  }

  const totalQuestions = questions.length;
  const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 100;
  const passed = scorePercentage >= (level.passing_score || 70);

  // 4. Log quiz attempt
  await admin.from('quiz_attempts').insert({
    user_id: userId,
    level_id: levelId,
    score: scorePercentage,
    total_questions: totalQuestions,
    passed,
    submitted_at: new Date().toISOString(),
  });

  let xpAwarded = 0;
  let nextLevelId: string | undefined;

  // 5. Update progress and award XP if passed
  if (passed) {
    // Upsert level progress
    const { data: existingProgress } = await admin
      .from('user_level_progress')
      .select('attempts, best_score')
      .eq('user_id', userId)
      .eq('level_id', levelId)
      .single();

    const attempts = (existingProgress?.attempts || 0) + 1;
    const bestScore = Math.max(existingProgress?.best_score || 0, scorePercentage);

    await admin.from('user_level_progress').upsert({
      user_id: userId,
      level_id: levelId,
      status: 'completed',
      best_score: bestScore,
      attempts,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Calculate XP: 50 base for passing + 10 per correct answer
    xpAwarded = 50 + correctCount * 10;

    // Record unique XP event
    const { error: xpErr } = await admin.from('xp_events').insert({
      user_id: userId,
      source_type: 'level_quiz',
      source_id: levelId,
      xp: xpAwarded,
      created_at: new Date().toISOString(),
    });

    // If duplicate XP event constraint hit, set xpAwarded to 0 for this attempt
    if (xpErr) {
      xpAwarded = 0;
    } else {
      // Update daily activity
      const today = new Date().toISOString().split('T')[0];
      const { data: daily } = await admin
        .from('daily_activity')
        .select('xp_earned')
        .eq('user_id', userId)
        .eq('activity_date', today)
        .single();

      if (daily) {
        await admin
          .from('daily_activity')
          .update({ xp_earned: daily.xp_earned + xpAwarded })
          .eq('user_id', userId)
          .eq('activity_date', today);
      } else {
        await admin.from('daily_activity').insert({
          user_id: userId,
          activity_date: today,
          xp_earned: xpAwarded,
        });
      }
    }

    // Unlock next level
    const { data: nextLevel } = await admin
      .from('levels')
      .select('id')
      .eq('course_id', level.course_id)
      .eq('level_number', level.level_number + 1)
      .single();

    if (nextLevel) {
      nextLevelId = nextLevel.id;
      await admin.from('user_level_progress').upsert({
        user_id: userId,
        level_id: nextLevel.id,
        status: 'unlocked',
        best_score: 0,
        attempts: 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,level_id', ignoreDuplicates: true });
    }

    // Update user course progress
    const { count: completedLevelsCount } = await admin
      .from('user_level_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');

    const { data: totalXpData } = await admin
      .from('xp_events')
      .select('xp')
      .eq('user_id', userId);

    const totalXp = (totalXpData || []).reduce((sum, item) => sum + (item.xp || 0), 0);

    await admin.from('user_course_progress').upsert({
      user_id: userId,
      course_id: level.course_id,
      completed_levels: completedLevelsCount || 1,
      current_level: level.level_number + 1,
      total_xp: totalXp,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  } else {
    // Record failed attempt
    const { data: existingProgress } = await admin
      .from('user_level_progress')
      .select('attempts, best_score, status')
      .eq('user_id', userId)
      .eq('level_id', levelId)
      .single();

    await admin.from('user_level_progress').upsert({
      user_id: userId,
      level_id: levelId,
      status: existingProgress?.status === 'completed' ? 'completed' : 'in_progress',
      best_score: Math.max(existingProgress?.best_score || 0, scorePercentage),
      attempts: (existingProgress?.attempts || 0) + 1,
      updated_at: new Date().toISOString(),
    });
  }

  return {
    passed,
    score: scorePercentage,
    total_questions: totalQuestions,
    correct_count: correctCount,
    passing_score: level.passing_score || 70,
    xp_awarded: xpAwarded,
    results,
    next_level_id: nextLevelId,
  };
};
