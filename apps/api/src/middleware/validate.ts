import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { log } from '../utils/logger';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      log.warn('REST validation failed', { path: req.originalUrl, method: req.method, issues: result.error.flatten() });
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten(),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      log.warn('REST validation failed', { path: req.originalUrl, method: req.method, issues: result.error.flatten() });
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten(),
      });
      return;
    }
    (req as Request & { validatedQuery: T }).validatedQuery = result.data;
    next();
  };
}
