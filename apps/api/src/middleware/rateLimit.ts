import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { isProduction } from '../config';
import { RedisAwareStore } from './redisAwareRateLimitStore';

// Every limiter below gets its own RedisAwareStore instance (keyed by a
// distinct prefix) — when REDIS_URL is configured and connected, rate
// limits are enforced correctly across every backend instance instead of
// silently becoming "limit × instance count." Falls back to the identical
// in-memory behavior these limiters already had when Redis is unset.

export const publicRateLimiter = rateLimit({
  skip: () => process.env.NODE_ENV === 'test',
  windowMs: 60 * 1000,
  max: config.rateLimit.publicPerMin,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  store: new RedisAwareStore('public'),
});

export const suggestionsRateLimiter = rateLimit({
  skip: () => process.env.NODE_ENV === 'test',
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many suggestions submitted, please try again later' },
  store: new RedisAwareStore('suggestions'),
});

export const devicesRateLimiter = rateLimit({
  skip: () => process.env.NODE_ENV === 'test',
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many device registrations, please try again later' },
  store: new RedisAwareStore('devices'),
});

// Client batches every 30s or every 20 events — a few per minute per IP is
// expected; this just guards against a runaway client or abuse.
export const analyticsEventsRateLimiter = rateLimit({
  skip: () => process.env.NODE_ENV === 'test',
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many analytics uploads, please try again later' },
  store: new RedisAwareStore('analytics-events'),
});

// Heartbeat fires every 60s per session — generous headroom for shared NATs.
export const analyticsPingRateLimiter = rateLimit({
  skip: () => process.env.NODE_ENV === 'test',
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many pings, please try again later' },
  store: new RedisAwareStore('analytics-ping'),
});

// A Discover screen can mount many campaign cards near-simultaneously (each fires
// its own view POST, not batched like the generic analytics pipeline) — generous
// headroom, same reasoning as the ping limiter, for shared NATs plus a big list.
export const campaignTrackRateLimiter = rateLimit({
  skip: () => process.env.NODE_ENV === 'test',
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many tracking requests, please try again later' },
  store: new RedisAwareStore('campaign-track'),
});

// GPS pings themselves travel over Socket.IO (throttled separately, Redis-
// aware when available — see busFusion.ts/rideSocket.ts); this only guards
// the REST session-lifecycle endpoint, which a rider hits once per ride at most.
export const rideStartRateLimiter = rateLimit({
  skip: () => process.env.NODE_ENV === 'test',
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many ride-start requests, please try again later' },
  store: new RedisAwareStore('ride-start'),
});

export const adminLoginRateLimiter = rateLimit({
  skip: () => process.env.NODE_ENV === 'test',
  windowMs: config.rateLimit.adminLoginWindowMs,
  // In development/test, allow many more login attempts for automated testing
  max: isProduction ? config.rateLimit.adminLoginMax : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
  store: new RedisAwareStore('admin-login'),
});
