import { Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger';
import type { RequestWithId } from './requestId';
import { VersionConflictError } from '../store';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  log.error(err.message, {
    requestId: (req as RequestWithId).requestId,
    method: req.method,
    path: req.originalUrl,
    stack: err.stack,
  });
  if (err.message === 'Not allowed by CORS') {
    // publicCors (open, `Access-Control-Allow-Origin: *`) runs on every
    // request before it falls through to /admin, since it's mounted at '/'
    // ahead of adminCors. adminCors's own rejection never sets a header, so
    // without this the '*' from publicCors survives on rejected admin-CORS
    // responses — defeating "locked on /admin" for the one response that's
    // supposed to prove the lock works.
    res.removeHeader('Access-Control-Allow-Origin');
    res.status(403).json({ error: 'CORS not allowed' });
    return;
  }
  if (err instanceof VersionConflictError) {
    res.status(409).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found' });
}
