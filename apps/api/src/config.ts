import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

/** Defaults that must never ship in production. */
export const INSECURE_DEFAULTS = {
  jwtSecret: 'dev-secret-change-me-min-32-characters-long',
  bootstrapPassword: 'change-me-on-first-login',
} as const;

export const config = {
  host: process.env.HOST ?? '0.0.0.0',
  port: parseInt(process.env.PORT ?? '6002', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:6002',
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/iitj1',
  campusId: process.env.CAMPUS_ID ?? 'iitj',
  jwt: {
    secret: process.env.JWT_SECRET ?? INSECURE_DEFAULTS.jwtSecret,
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ??
      process.env.JWT_SECRET ??
      INSECURE_DEFAULTS.jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  rateLimit: {
    publicPerMin: parseInt(process.env.RATE_LIMIT_PUBLIC_PER_MIN ?? '120', 10),
    adminLoginMax: parseInt(process.env.RATE_LIMIT_ADMIN_LOGIN_MAX ?? '5', 10),
    adminLoginWindowMs: parseInt(process.env.RATE_LIMIT_ADMIN_LOGIN_WINDOW_MS ?? '900000', 10),
  },
  cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS ?? '60', 10),
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
  enableEtag: process.env.ENABLE_ETAG !== 'false',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  /** 'json' for structured single-line JSON logs (production/log aggregators); 'pretty' for the existing human-readable console format (local dev default). */
  logFormat: (process.env.LOG_FORMAT ?? (process.env.NODE_ENV === 'production' ? 'json' : 'pretty')) as 'json' | 'pretty',
  /**
   * Phase 6 — optional. When unset, every Redis-backed feature (Socket.IO
   * adapter, shared contributor/BusState cache, distributed rate limiting)
   * automatically falls back to its existing in-memory implementation —
   * single-instance behavior is byte-for-byte unchanged from Phase 1–5.
   */
  redisUrl: process.env.REDIS_URL || null,
  /** Optional shared-secret gate for GET /metrics, in addition to network-level restriction (the standard Prometheus scraping practice). Unset = open, matching most self-hosted Prometheus setups. */
  metricsToken: process.env.METRICS_TOKEN || null,
  /** Socket.IO CORS — defaults to '*' to preserve Phase 1's behavior exactly (mobile clients send no fixed Origin); set to a comma-separated allowlist to restrict in production. */
  socketCorsOrigin: process.env.SOCKET_CORS_ORIGIN ?? '*',
  fcm: {
    projectId: process.env.FCM_PROJECT_ID,
    clientEmail: process.env.FCM_CLIENT_EMAIL,
    privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    serviceAccountPath: process.env.FCM_SERVICE_ACCOUNT_PATH,
    topicPrefix: process.env.FCM_TOPIC_PREFIX ?? 'iitj',
  },
  adminBootstrap: {
    email: process.env.ADMIN_BOOTSTRAP_EMAIL ?? 'admin@iitjone.in',
    password: process.env.ADMIN_BOOTSTRAP_PASSWORD ?? INSECURE_DEFAULTS.bootstrapPassword,
    name: process.env.ADMIN_BOOTSTRAP_NAME ?? 'IITJ One Admin',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_UPLOAD_FOLDER ?? 'iitj1',
  },
  docsRoot:
    process.env.DOCS_ROOT ?? path.resolve(__dirname, '../../../docs/FinalDoc'),
} as const;

export const isProduction = config.nodeEnv === 'production';

/** Fail fast when production would run with forgeable auth secrets. */
export function assertProductionSecrets(): void {
  if (!isProduction) return;

  const failures: string[] = [];
  if (
    !process.env.JWT_SECRET ||
    config.jwt.secret === INSECURE_DEFAULTS.jwtSecret ||
    config.jwt.secret.length < 32
  ) {
    failures.push('JWT_SECRET must be set to a unique value (≥32 chars)');
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
    failures.push('JWT_REFRESH_SECRET must be set to a unique value (≥32 chars)');
  } else if (process.env.JWT_REFRESH_SECRET === process.env.JWT_SECRET) {
    failures.push('JWT_REFRESH_SECRET must be different from JWT_SECRET');
  }
  if (
    !process.env.ADMIN_BOOTSTRAP_PASSWORD ||
    config.adminBootstrap.password === INSECURE_DEFAULTS.bootstrapPassword
  ) {
    failures.push('ADMIN_BOOTSTRAP_PASSWORD must be set to a non-default value');
  }
  if (failures.length > 0) {
    throw new Error(`[config] Refusing to start in production:\n- ${failures.join('\n- ')}`);
  }

  // Soft warnings only — none of these block boot, since every feature they
  // relate to (Socket.IO adapter, shared caches, metrics scraping) already
  // degrades gracefully without them. Surfaced so a real misconfiguration
  // doesn't go silently unnoticed in production specifically.
  const warnings: string[] = [];
  if (!config.redisUrl) {
    warnings.push('REDIS_URL is unset — running single-instance only (Socket.IO/contributor cache/rate limits are in-memory, not shared across instances)');
  }
  if (!config.metricsToken) {
    warnings.push('METRICS_TOKEN is unset — GET /metrics is unauthenticated; restrict access at the network/reverse-proxy level');
  }
  if (config.socketCorsOrigin === '*') {
    warnings.push('SOCKET_CORS_ORIGIN is "*" — acceptable for mobile-only clients (no fixed Origin), but restrict it if browser clients besides the admin panel connect to the Socket.IO server');
  }
  for (const warning of warnings) {
    // eslint-disable-next-line no-console -- logger.ts isn't guaranteed configured yet this early in boot
    console.warn(`[config] Production warning: ${warning}`);
  }
}
