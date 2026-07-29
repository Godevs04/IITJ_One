import { config } from '../config';
import { log } from '../utils/logger';

/**
 * Optional Redis client shared by every Phase 6 feature that benefits from
 * it (Socket.IO adapter, contributor/BusState cache, distributed rate
 * limiting, replay ring buffer). REDIS_URL unset or unreachable ⇒ every
 * caller falls back to its existing in-memory implementation automatically
 * — this module never throws, it just reports connected/disconnected.
 *
 * Soft dependency: if `ioredis` is not installed (incomplete local
 * node_modules), Redis stays permanently disconnected and all callers use
 * their in-memory fallbacks. Production installs include ioredis via
 * package.json.
 */

/** Minimal ioredis surface used by this module — avoids a hard type import. */
interface RedisLike {
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  connect(): Promise<void>;
  quit(): Promise<unknown>;
}

type RedisCtor = new (
  url: string,
  options: {
    lazyConnect?: boolean;
    maxRetriesPerRequest?: number;
    retryStrategy?: (times: number) => number;
    reconnectOnError?: () => boolean;
  },
) => RedisLike;

function loadRedisCtor(): RedisCtor | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('ioredis') as { default?: RedisCtor } & RedisCtor;
    return (mod.default ?? mod) as RedisCtor;
  } catch {
    return null;
  }
}

const RedisClient = loadRedisCtor();

let client: RedisLike | null = null;
let connected = false;
let connectAttempted = false;

function createClient(): RedisLike {
  if (!RedisClient) {
    throw new Error('ioredis is not installed');
  }
  const redis = new RedisClient(config.redisUrl!, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    retryStrategy: (times: number) => Math.min(times * 500, 5000),
    reconnectOnError: () => true,
  });

  redis.on('ready', () => {
    connected = true;
    log.info('redis connected');
  });
  redis.on('error', (...args: unknown[]) => {
    const err = args[0] as Error | undefined;
    if (connected) log.warn('redis error', { error: err?.message ?? 'unknown' });
    connected = false;
  });
  redis.on('close', () => {
    if (connected) log.warn('redis connection closed — falling back to in-memory mode');
    connected = false;
  });

  return redis;
}

/** Call once at boot. Never throws — a failed/absent Redis just means every feature runs in-memory, exactly as it did before Phase 6. */
export async function initRedis(): Promise<void> {
  if (!config.redisUrl || connectAttempted) return;
  connectAttempted = true;
  if (!RedisClient) {
    log.warn('ioredis not installed — running in in-memory fallback mode');
    return;
  }
  client = createClient();
  try {
    await client.connect();
  } catch (err) {
    log.warn('redis initial connection failed — running in in-memory fallback mode', {
      error: (err as Error).message,
    });
  }
}

export function isRedisConnected(): boolean {
  return connected;
}

/** Returns the client only when actually connected — callers should always check this rather than assuming a non-null client is usable (ioredis queues commands while reconnecting, which we deliberately avoid relying on for these use cases). */
export function getRedisClient(): RedisLike | null {
  return connected ? client : null;
}

/** For the Socket.IO adapter, which needs its own dedicated pub/sub connections regardless of the shared client's state — still gated by the same REDIS_URL/connected check. */
export function createRedisDuplicate(): RedisLike | null {
  if (!config.redisUrl || !RedisClient) return null;
  return createClient();
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit().catch(() => undefined);
    client = null;
    connected = false;
  }
}
