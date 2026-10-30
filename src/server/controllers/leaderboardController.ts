import { Request, Response, NextFunction } from 'express';
import { getLeaderboard } from '../services/leaderboardService.ts';

export const getLeaderboardData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string || '50', 10);
    const data = await getLeaderboard(req.user?.id, limit);
    res.json(data);
  } catch (err) {
    next(err);
  }
};
