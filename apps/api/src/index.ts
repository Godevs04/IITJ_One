import express from 'express';
import helmet from 'helmet';
import { config } from './config';
import { connectDb } from './db';
import { initFallbackStore } from './store/fallback';
import { publicCors } from './middleware/cors';
import { publicRateLimiter } from './middleware/rateLimit';
import { etagMiddleware } from './middleware/etag';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes';

async function bootstrap(): Promise<void> {
  initFallbackStore();

  const dbConnected = await connectDb();
  if (!dbConnected) {
    console.warn('[api] Running in fallback mode — campus data served from in-memory seed');
  }

  const app = express();

  app.use(helmet());
  app.use(publicCors);
  app.use(express.json({ limit: '2mb' }));
  app.use(etagMiddleware);
  app.use('/api/v1', publicRateLimiter, routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  app.listen(config.port, () => {
    console.log(`[api] IITJ1 API listening on http://localhost:${config.port}/api/v1`);
    console.log(`[api] Health: http://localhost:${config.port}/api/v1/health`);
    console.log(`[api] Storage: ${dbConnected ? 'mongodb' : 'fallback'}`);
  });
}

bootstrap().catch((err) => {
  console.error('[api] Failed to start:', err);
  process.exit(1);
});
