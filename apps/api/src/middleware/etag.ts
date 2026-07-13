import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';

export function etagMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!config.enableEtag || req.method !== 'GET') {
    next();
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    const etag = `"${crypto.createHash('md5').update(JSON.stringify(body)).digest('hex')}"`;
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return res;
    }
    return originalJson(body);
  };
  next();
}
