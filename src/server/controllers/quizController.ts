import { Request, Response, NextFunction } from 'express';
import { quizSubmissionSchema } from '../validation/schemas.ts';
import { submitAndGradeQuiz } from '../services/quizService.ts';

export const submitQuizAttempt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { levelId } = req.params;
    const userId = req.user!.id;
    const validated = quizSubmissionSchema.parse(req.body);

    const result = await submitAndGradeQuiz(userId, levelId, validated.answers);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
