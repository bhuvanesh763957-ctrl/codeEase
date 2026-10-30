import { Request, Response, NextFunction } from 'express';
import { getSupabaseClient } from '../config/supabase.ts';
import { isSupabaseConfigured } from '../config/env.ts';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: string;
  user_metadata?: Record<string, any>;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!isSupabaseConfigured()) {
    res.status(503).json({
      error: 'Authentication service not configured',
      message: 'Supabase credentials are not set in the environment.',
      code: 'AUTH_UNCONFIGURED',
    });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'Missing or malformed Authorization header with Bearer token',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const supabase = getSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        error: 'Invalid or expired session',
        message: error ? error.message : 'User session token could not be verified',
        code: 'SESSION_EXPIRED',
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      user_metadata: user.user_metadata,
    };

    next();
  } catch (err: any) {
    res.status(500).json({
      error: 'Authentication error',
      message: err.message || 'An error occurred while validating the session token',
    });
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!isSupabaseConfigured()) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          user_metadata: user.user_metadata,
        };
      }
    } catch {
      // Continue unauthenticated if token fails in optionalAuth
    }
  }

  next();
};
