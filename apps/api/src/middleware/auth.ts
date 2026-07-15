import { Request, Response, NextFunction } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import type { JwtPayload } from '../types';
import { findAdminByEmail } from '../store';
import { asyncHandler } from './asyncHandler';

export interface AuthRequest extends Request {
  admin?: JwtPayload;
}

/**
 * Verifies the JWT AND re-checks the admin's live active/tokenVersion state
 * on every request. A signature-valid but revoked access token (account
 * deactivated, or admin logged out elsewhere) would otherwise keep working
 * for the full access-token TTL — this closes that window immediately.
 */
export const requireAuth = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = header.slice(7);
  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  if (payload.type !== 'access') {
    res.status(401).json({ error: 'Invalid token type' });
    return;
  }

  const admin = await findAdminByEmail(payload.email);
  if (!admin || admin.active === false || payload.tokenVersion !== (admin.tokenVersion ?? 0)) {
    res.status(401).json({ error: 'Session revoked — please log in again' });
    return;
  }

  req.admin = payload;
  next();
});

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

export function requireRole(role: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (req.admin?.role !== role) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}
