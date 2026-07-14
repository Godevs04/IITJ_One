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
  if (
    process.env.JWT_REFRESH_SECRET &&
    process.env.JWT_REFRESH_SECRET.length < 32
  ) {
    failures.push('JWT_REFRESH_SECRET must be ≥32 chars when set');
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
}
