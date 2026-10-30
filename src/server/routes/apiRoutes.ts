import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.ts';
import { compilerLimiter, quizSubmissionLimiter } from '../middleware/rateLimiter.ts';
import { isSupabaseConfigured, isJudge0Configured, isSupabaseAdminConfigured, ENV } from '../config/env.ts';

import * as profileController from '../controllers/profileController.ts';
import * as courseController from '../controllers/courseController.ts';
import * as quizController from '../controllers/quizController.ts';
import * as compilerController from '../controllers/compilerController.ts';
import * as certificateController from '../controllers/certificateController.ts';
import * as leaderboardController from '../controllers/leaderboardController.ts';

const router = Router();

// System Configuration & Health Status (safe public metadata)
router.get('/config/status', (_req, res) => {
  res.json({
    supabaseConfigured: isSupabaseConfigured(),
    supabaseAdminConfigured: isSupabaseAdminConfigured(),
    judge0Configured: isJudge0Configured(),
    supabaseUrl: isSupabaseConfigured() ? ENV.SUPABASE_URL : null,
    supabaseAnonKey: isSupabaseConfigured() ? ENV.SUPABASE_ANON_KEY : null,
  });
});

// Profile endpoints
router.get('/profile', requireAuth, profileController.getProfile);
router.patch('/profile', requireAuth, profileController.updateProfile);

// Courses & Levels endpoints
router.get('/courses', optionalAuth, courseController.getCourses);
router.get('/courses/:courseId', optionalAuth, courseController.getCourse);
router.get('/courses/:courseId/progress', requireAuth, courseController.getCourse);
router.get('/levels/:levelId', requireAuth, courseController.getLevel);

// Quiz endpoints (Server-side grading & sequential unlock)
router.post(
  '/levels/:levelId/quiz-attempts',
  requireAuth,
  quizSubmissionLimiter,
  quizController.submitQuizAttempt
);

// Online Compiler endpoints
router.get('/compiler/languages', compilerController.getCompilerLanguages);
router.post('/compiler/execute', optionalAuth, compilerLimiter, compilerController.runCode);

// Certificates endpoints
router.get('/certificates', requireAuth, certificateController.getMyCertificates);
router.post('/certificates/issue', requireAuth, certificateController.requestCertificateIssuance);
router.get('/certificates/verify/:certificateNumber', certificateController.publicVerifyCertificate);

// Leaderboard endpoint
router.get('/leaderboard', optionalAuth, leaderboardController.getLeaderboardData);

export default router;
