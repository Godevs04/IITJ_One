import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { isProduction } from '../config';

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

export const devicesRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many device registrations, please try again later' },
});

// Client batches every 30s or every 20 events — a few per minute per IP is
// expected; this just guards against a runaway client or abuse.
export const analyticsEventsRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many analytics uploads, please try again later' },
});

// Heartbeat fires every 60s per session — generous headroom for shared NATs.
export const analyticsPingRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many pings, please try again later' },
});

export const adminLoginRateLimiter = rateLimit({
  windowMs: config.rateLimit.adminLoginWindowMs,
  // In development/test, allow many more login attempts for automated testing
  max: isProduction ? config.rateLimit.adminLoginMax : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
});
