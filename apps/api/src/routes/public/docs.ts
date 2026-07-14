import { Router, Request, Response } from 'express';
import { openApiSpec } from '../../openapi/spec';

const router = Router();

/** Raw OpenAPI JSON — used by Scalar and external tooling. */
router.get('/openapi.json', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json(openApiSpec);
});

/** Scalar API Reference UI — interactive docs for every endpoint. */
router.get('/docs', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>IITJ One API · Scalar</title>
    <style>
      html, body { margin: 0; height: 100%; background: #0f172a; }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/api/v1/openapi.json"
      data-configuration='${JSON.stringify({
        theme: 'default',
        layout: 'modern',
        defaultHttpClient: { targetKey: 'javascript', clientKey: 'fetch' },
        hideModels: false,
        authentication: { preferredSecurityScheme: 'bearerAuth' },
      }).replace(/'/g, '&#39;')}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.25.74"></script>
  </body>
</html>`);
});

export default router;
