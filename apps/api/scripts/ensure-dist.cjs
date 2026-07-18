#!/usr/bin/env node
/**
 * Safety net for misconfigured hosts that run `yarn start` / `npm start`
 * without a compile step. Prefer fixing the Build Command to
 * `node scripts/render-build.cjs` instead of relying on this.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const apiRoot = path.resolve(__dirname, '..');
const distEntry = path.join(apiRoot, 'dist', 'index.js');

if (fs.existsSync(distEntry)) {
  process.exit(0);
}

console.warn('[api] dist/index.js missing — running render-build.cjs before start…');
try {
  execSync('node scripts/render-build.cjs', {
    cwd: apiRoot,
    stdio: 'inherit',
    env: process.env,
  });
} catch {
  console.error(
    [
      '',
      'Failed to compile the API. In the Render dashboard set:',
      '  Root Directory : apps/api   (or leave empty for repo root)',
      '  Build Command  : node scripts/render-build.cjs',
      '  Start Command  : npm start',
      '  NODE_VERSION   : 20.18.1',
      'Do not use yarn — this repo uses npm (package-lock.json).',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

if (!fs.existsSync(distEntry)) {
  console.error('[api] Still missing after build:', distEntry);
  process.exit(1);
}
