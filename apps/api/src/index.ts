import express from 'express';
import helmet from 'helmet';
import { assertProductionSecrets, config } from './config';
import { connectDb, disconnectDb } from './db';
import { initFallbackStore } from './store/fallback';
import { publicRateLimiter } from './middleware/rateLimit';
import { etagMiddleware } from './middleware/etag';
import { requestIdMiddleware } from './middleware/requestId';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { setLogLevel, log } from './utils/logger';
import routes from './routes';
import path from 'path';
import type { Server } from 'http';

async function bootstrap(): Promise<void> {
  setLogLevel(config.logLevel);
  assertProductionSecrets();
  initFallbackStore();

  const dbConnected = await connectDb();
  if (!dbConnected) {
    log.warn('Running in fallback mode — campus data served from in-memory seed');
    if (config.nodeEnv === 'production') {
      log.warn('Production + fallback: admin writes are disabled until MongoDB is available');
    }
  }

  const app = express();

  // Render / reverse proxies: use X-Forwarded-For for rate limits
  app.set('trust proxy', 1);

  // cross-origin so browser admin (localhost:3000) can read API responses
  // CSP allows Scalar docs (/api/v1/docs) to load the CDN reference UI
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
          'style-src': [
            "'self'",
            "'unsafe-inline'",
            'https://cdn.jsdelivr.net',
            'https://fonts.googleapis.com',
          ],
          'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
          'img-src': ["'self'", 'data:', 'https:', 'blob:'],
          'connect-src': ["'self'", 'http:', 'https:', 'ws:', 'wss:'],
          'worker-src': ["'self'", 'blob:'],
          'frame-src': ["'self'", 'blob:'],
        },
      },
    }),
  );
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: '2mb' }));
  app.use(etagMiddleware);
  // CORS is applied per-router: open on public, locked on /admin
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  app.use('/api/v1', publicRateLimiter, routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  const server: Server = app.listen(config.port, config.host, () => {
    const lanHint = config.apiBaseUrl.replace(
      'localhost',
      config.host === '0.0.0.0' ? '<your-lan-ip>' : config.host,
    );
    log.info(`IITJ One API listening on http://${config.host}:${config.port}/api/v1`);
    log.info(`Health: ${config.apiBaseUrl}/api/v1/health`);
    log.info(`Docs (Scalar): ${config.apiBaseUrl}/api/v1/docs`);
    log.info(`OpenAPI: ${config.apiBaseUrl}/api/v1/openapi.json`);
    log.info(`LAN: ${lanHint}/api/v1/health`);
    log.info(`CORS origins (admin): ${config.corsOrigin.join(', ')}`);
    log.info(`Storage: ${dbConnected ? 'mongodb' : 'fallback'}`);
  });

  const shutdown = async (signal: string) => {
    log.info(`Shutting down (${signal})`);
    server.close(async () => {
      try {
        await disconnectDb();
      } catch (err) {
        log.error('Error during DB disconnect', { error: (err as Error).message });
      }
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('[api] Failed to start:', err);
  process.exit(1);
});
