import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { log, runWithLogContext } from '../utils/logger';

export type RequestWithId = Request & { requestId?: string };

/**
 * Attach X-Request-Id, seed the AsyncLocalStorage log context for the rest
 * of this request's call stack (every log.* call made while handling this
 * request — including inside store functions, services, etc. — now
 * automatically includes requestId/correlationId), and log completion.
 * A caller-supplied `X-Correlation-Id` (e.g. from a mobile client tracing a
 * multi-request flow) is threaded through separately from requestId, which
 * always identifies this one HTTP request.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const requestId = incoming && incoming.trim() ? incoming.trim() : randomUUID();
  const correlationId = req.header('x-correlation-id')?.trim() || requestId;
  (req as RequestWithId).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Correlation-Id', correlationId);

  const started = Date.now();
  res.on('finish', () => {
    // Explicit requestId/correlationId here too (not just relying on the
    // AsyncLocalStorage context) — 'finish' fires via the http.Server's own
    // event emitter, registered outside runWithLogContext below, so context
    // propagation through it isn't guaranteed the way it is for awaited
    // async calls made directly inside a request handler.
    log.info('request', {
      requestId,
      correlationId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ms: Date.now() - started,
    });
  });

  runWithLogContext({ requestId, correlationId }, next);
}
