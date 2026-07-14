import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger';

export type RequestWithId = Request & { requestId?: string };

/** Attach X-Request-Id and log request completion. */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const requestId = incoming && incoming.trim() ? incoming.trim() : randomUUID();
  (req as RequestWithId).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const started = Date.now();
  res.on('finish', () => {
    log.info('request', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ms: Date.now() - started,
    });
  });

  next();
}
