import rateLimit from 'express-rate-limit';
import { config } from '../config';

export const publicRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.rateLimit.publicPerMin,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

export const suggestionsRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many suggestions submitted, please try again later' },
});

export const adminLoginRateLimiter = rateLimit({
  windowMs: config.rateLimit.adminLoginWindowMs,
  max: config.rateLimit.adminLoginMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
});
