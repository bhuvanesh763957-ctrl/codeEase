import { Request, Response, NextFunction } from 'express';
import { codeExecutionSchema } from '../validation/schemas.ts';
import { executeCode } from '../services/compilerService.ts';
import { JUDGE0_LANGUAGES } from '../config/judge0.ts';
import { isJudge0Configured } from '../config/env.ts';

export const runCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = codeExecutionSchema.parse(req.body);
    const result = await executeCode({
      ...validated,
      user_id: req.user?.id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getCompilerLanguages = (_req: Request, res: Response): void => {
  res.json({
    configured: isJudge0Configured(),
    languages: Object.entries(JUDGE0_LANGUAGES).map(([key, value]) => ({
      key,
      name: value.name,
      extension: value.extension,
      sampleCode: value.sampleCode,
    })),
  });
};
