import { Router, Request, Response } from 'express';
import { config } from '../config';
import { registry } from '../services/prometheusMetrics';

const router = Router();

/**
 * Standard Prometheus scrape target — unauthenticated by default (matches
 * how most self-hosted Prometheus setups restrict access at the network/
 * reverse-proxy level, not the application level, since Prometheus doesn't
 * send bearer tokens). Set METRICS_TOKEN for defense-in-depth: when set,
 * requests must include it as `?token=` or an `Authorization: Bearer` header.
 */
router.get('/', async (req: Request, res: Response) => {
  if (config.metricsToken) {
    const provided = req.header('authorization')?.replace(/^Bearer\s+/i, '') || (req.query.token as string | undefined);
    if (provided !== config.metricsToken) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }
  res.setHeader('Content-Type', registry.contentType);
  res.send(await registry.metrics());
});

export default router;
