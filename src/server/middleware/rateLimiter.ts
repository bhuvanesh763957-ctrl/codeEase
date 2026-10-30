import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [ip: string]: { count: number; resetTime: number };
}

const stores: Record<string, RateLimitStore> = {};

export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
}) => {
  const storeKey = `limiter_${options.windowMs}_${options.max}`;
  if (!stores[storeKey]) {
    stores[storeKey] = {};
  }
  const store = stores[storeKey];

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    if (!store[ip] || now > store[ip].resetTime) {
      store[ip] = {
        count: 1,
        resetTime: now + options.windowMs,
      };
      return next();
    }

    store[ip].count += 1;

    if (store[ip].count > options.max) {
      const retryAfter = Math.ceil((store[ip].resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({
        error: 'Too Many Requests',
        message: options.message,
        retryAfterSeconds: retryAfter,
      });
      return;
    }

    next();
  };
};

export const compilerLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // max 20 executions per minute per IP
  message: 'Code execution rate limit exceeded. Please wait a moment before running more code.',
});

export const quizSubmissionLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Quiz submission rate limit reached. Please pace your attempts.',
});
