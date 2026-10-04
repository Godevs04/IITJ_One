import express from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { initFallbackStore } from '../../store/fallback';
import { isDbConnected } from '../../db';
import routes from '../../routes';
import { errorHandler, notFoundHandler } from '../../middleware/errorHandler';
import { bootstrapTestAdmin } from './testAdmin';

/**
 * The real /api/v1 routes on an ephemeral localhost port, backed only by the in-memory fallback store —
 * an isolated alternative to the integration suites that call a running server on localhost:6002.
 * Import './isolatedEnv' before this module. Never calls connectDb().
 */
export interface InProcessApi {
  base: string;
  close: () => Promise<void>;
  adminToken: (role?: 'superadmin' | 'editor') => Promise<string>;
}

export async function startInProcessApi(port = 0): Promise<InProcessApi> {
  if (isDbConnected()) throw new Error('Refusing to run isolated tests against a connected database');
  initFallbackStore();
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use('/api/v1', routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(port, '127.0.0.1', () => resolve(s));
  });
  const { port: boundPort } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${boundPort}/api/v1`;

  return {
    base,
    close: () => new Promise((resolve) => server.close(() => resolve())),
    adminToken: async (role = 'superadmin') => {
      const admin = await bootstrapTestAdmin(role);
      const res = await fetch(`${base}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(admin),
      });
      if (!res.ok) throw new Error(`Test admin login failed: ${res.status}`);
      return ((await res.json()) as { accessToken: string }).accessToken;
    },
  };
}
