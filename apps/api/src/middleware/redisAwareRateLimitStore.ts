import { MemoryStore, type Store, type Options, type ClientRateLimitInfo } from 'express-rate-limit';
import { getRedisClient } from '../services/redisClient';
import { log } from '../utils/logger';

/**
 * Makes every existing rate limiter (middleware/rateLimit.ts) correct across
 * multiple backend instances: without shared storage, "120 req/min" is
 * actually 120×N req/min once scaled horizontally, since each instance's
 * default MemoryStore only ever sees its own traffic. When Redis is
 * unavailable, this delegates to a real `MemoryStore` instance — the exact
 * same class express-rate-limit uses by default — so single-instance
 * behavior is unchanged from Phase 1–5.
 */
export class RedisAwareStore implements Store {
  // True JS private fields (not TS `private`) — TS's structural typing
  // against express-rate-limit's plain `Store` object type otherwise trips
  // over a "private in type A but not B" quirk with class-declared `private`.
  #memoryStore = new MemoryStore();
  #windowMs = 60_000;
  #prefix: string;

  constructor(prefix: string) {
    this.#prefix = prefix;
  }

  #key(key: string): string {
    return `ratelimit:${this.#prefix}:${key}`;
  }

  init(options: Options): void {
    this.#windowMs = options.windowMs ?? this.#windowMs;
    this.#memoryStore.init(options);
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const redis = getRedisClient();
    if (!redis) return this.#memoryStore.increment(key);
    try {
      const redisKey = this.#key(key);
      const totalHits = await redis.incr(redisKey);
      if (totalHits === 1) await redis.pexpire(redisKey, this.#windowMs);
      const ttl = await redis.pttl(redisKey);
      return { totalHits, resetTime: new Date(Date.now() + (ttl > 0 ? ttl : this.#windowMs)) };
    } catch (err) {
      log.warn('redis rate-limit increment failed — falling back to in-memory store', { prefix: this.#prefix, error: (err as Error).message });
      return this.#memoryStore.increment(key);
    }
  }

  async decrement(key: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      await this.#memoryStore.decrement(key);
      return;
    }
    try {
      await redis.decr(this.#key(key));
    } catch (err) {
      log.warn('redis rate-limit decrement failed', { prefix: this.#prefix, error: (err as Error).message });
    }
  }

  async resetKey(key: string): Promise<void> {
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.del(this.#key(key));
      } catch (err) {
        log.warn('redis rate-limit reset failed', { prefix: this.#prefix, error: (err as Error).message });
      }
    }
    await this.#memoryStore.resetKey(key);
  }
}
