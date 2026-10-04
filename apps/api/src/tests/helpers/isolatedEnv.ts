/**
 * Import FIRST in a test file (before any app module). apps/api/.env can point at a real database; this
 * forces an unreachable MongoDB address, no Redis and no Firebase credentials before config loads (dotenv never overrides
 * variables that are already set), so an isolated test can never touch real data.
 */
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/iitj1-isolated-test';
process.env.REDIS_URL = '';
process.env.NODE_ENV = 'test';
// No Firebase credentials: an isolated test must never be able to send a real push notification.
process.env.FCM_PROJECT_ID = '';
process.env.FCM_CLIENT_EMAIL = '';
process.env.FCM_PRIVATE_KEY = '';
process.env.FCM_SERVICE_ACCOUNT_PATH = '';
process.env.GOOGLE_APPLICATION_CREDENTIALS = '';

export {};
