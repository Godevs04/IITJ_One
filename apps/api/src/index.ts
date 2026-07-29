import express from 'express';
import helmet from 'helmet';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { assertProductionSecrets, config } from './config';
import { connectDb, disconnectDb, startReconnectLoop } from './db';
import { initFallbackStore } from './store/fallback';
import { startAnalyticsAggregationScheduler } from './services/analytics';
import { startHealthCenterSyncScheduler } from './services/healthCenterSync';
import { registerRideSocketHandlers } from './services/rideSocket';
import { startMetricsLogging } from './services/metrics';
import { initRedis, disconnectRedis, isRedisConnected, createRedisDuplicate } from './services/redisClient';
import { metricsMiddleware } from './services/prometheusMetrics';
import { publicRateLimiter } from './middleware/rateLimit';
import { etagMiddleware } from './middleware/etag';
import { requestIdMiddleware } from './middleware/requestId';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { setLogLevel, setLogFormat, log } from './utils/logger';
import routes from './routes';
import metricsRoute from './routes/metrics';
import path from 'path';
import type { Server } from 'http';

async function bootstrap(): Promise<void> {
  setLogLevel(config.logLevel);
  setLogFormat(config.logFormat);
  assertProductionSecrets();
  initFallbackStore();

  // Defense-in-depth for async code outside the Express request cycle
  // (route handlers themselves are wrapped via middleware/asyncHandler).
  process.on('unhandledRejection', (reason) => {
    log.error('Unhandled promise rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  const dbConnected = await connectDb();
  if (!dbConnected) {
    log.warn('Running in fallback mode — campus data served from in-memory seed');
    if (config.nodeEnv === 'production') {
      log.warn('Production + fallback: admin writes are disabled until MongoDB is available');
    }
    startReconnectLoop();
  }

  // Optional — every Redis-backed feature (Socket.IO adapter, shared
  // contributor/BusState cache, distributed GPS throttle) falls back to its
  // existing in-memory behavior automatically when REDIS_URL is unset or
  // unreachable. See services/redisClient.ts.
  await initRedis();

  startAnalyticsAggregationScheduler();
  startHealthCenterSyncScheduler();

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
  app.use(metricsMiddleware);
  app.use(express.json({ limit: '2mb' }));
  app.use(etagMiddleware);
  // CORS is applied per-router: open on public, locked on /admin
  app.use(
    '/uploads',
    express.static(path.join(process.cwd(), 'uploads'), {
      setHeaders: (res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
      },
    }),
  );
  // Unversioned, standard Prometheus convention — mounted ahead of the
  // /api/v1 rate limiter so scraping is never throttled. Access-restrict at
  // the network/reverse-proxy level in production (or set METRICS_TOKEN).
  app.use('/metrics', metricsRoute);
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

  // Live Bus Tracking — real-time channel for ride-sharing sessions and
  // fused bus position updates. CORS defaults to '*' (mirrors Phase 1's
  // behavior exactly — mobile clients send no fixed Origin); set
  // SOCKET_CORS_ORIGIN to a comma-separated allowlist to restrict it.
  // Kept under /api/v1 for consistency with the rest of the API.
  const socketCorsOrigin =
    config.socketCorsOrigin === '*' ? '*' : config.socketCorsOrigin.split(',').map((o) => o.trim()).filter(Boolean);
  const io = new SocketIOServer(server, {
    path: '/api/v1/socket.io',
    cors: { origin: socketCorsOrigin, methods: ['GET', 'POST'] },
    // Graceful reconnect handling (Phase 6 §2): a brief network drop (e.g. a
    // rider going through a dead zone) restores the socket's room
    // memberships automatically within this window, instead of requiring
    // the client to re-emit join:campus/join:trip from scratch.
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
    },
  });

  // Multi-instance: without this, `bus:update`/`trip:update` broadcasts only
  // reach clients connected to the *same* instance that computed them. When
  // REDIS_URL is unset/unreachable, Socket.IO's default in-memory adapter is
  // used instead — correct and unchanged for a single-instance deployment.
  if (isRedisConnected()) {
    const pubClient = createRedisDuplicate();
    const subClient = createRedisDuplicate();
    if (pubClient && subClient) {
      io.adapter(createAdapter(pubClient, subClient));
      log.info('Socket.IO using Redis adapter (multi-instance broadcast enabled)');
    }
  } else if (config.redisUrl) {
    log.warn('REDIS_URL is set but Redis is not connected — Socket.IO running with the in-memory adapter (single-instance only)');
  }

  registerRideSocketHandlers(io);
  startMetricsLogging();

  const shutdown = async (signal: string) => {
    log.info(`Shutting down (${signal})`);
    io.close();
    server.close(async () => {
      try {
        await disconnectDb();
      } catch (err) {
        log.error('Error during DB disconnect', { error: (err as Error).message });
      }
      await disconnectRedis();
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
