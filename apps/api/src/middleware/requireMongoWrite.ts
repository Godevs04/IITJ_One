import { Request, Response, NextFunction } from 'express';
import { isProduction } from '../config';
import { isDbConnected } from '../db';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** In production, refuse admin mutations when MongoDB is unavailable. */
export function requireMongoForAdminWrites(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (isProduction && !isDbConnected() && WRITE_METHODS.has(req.method)) {
    res.status(503).json({
      error: 'Admin writes require MongoDB in production (fallback store is read-only)',
    });
    return;
  }
  next();
}
