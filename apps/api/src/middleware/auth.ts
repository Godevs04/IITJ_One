import { Request, Response, NextFunction } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import type { JwtPayload } from '../types';

export interface AuthRequest extends Request {
  admin?: JwtPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
    if (payload.type !== 'access') {
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

const accessSignOptions: SignOptions = { expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'] };
const refreshSignOptions: SignOptions = {
  expiresIn: config.jwt.refreshExpiresIn as SignOptions['expiresIn'],
};

export function signAccessToken(payload: Omit<JwtPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'access' }, config.jwt.secret, accessSignOptions);
}

export function signRefreshToken(payload: Omit<JwtPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'refresh' }, config.jwt.refreshSecret, refreshSignOptions);
}

export function verifyRefreshToken(token: string): JwtPayload {
  const payload = jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return payload;
}
