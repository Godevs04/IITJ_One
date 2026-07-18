#!/usr/bin/env node
/**
 * Render / CI build for the API when Root Directory is `apps/api`
 * (or when invoked from the monorepo root via `npm run build:render -w @iitj1/api`).
 *
 * Installs only @iitj1/types + @iitj1/api, then compiles both.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const apiRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(apiRoot, '../..');

function run(cmd, cwd) {
  console.log(`[render-build] $ ${cmd}  (cwd=${cwd})`);
  execSync(cmd, { cwd, stdio: 'inherit', env: process.env });
}

if (!fs.existsSync(path.join(repoRoot, 'package.json'))) {
  console.error('[render-build] Monorepo root not found at', repoRoot);
  console.error('Set Render Root Directory to the repo root OR apps/api (full clone required).');
  process.exit(1);
}

const lockfile = path.join(repoRoot, 'package-lock.json');
const installCmd = fs.existsSync(lockfile)
  ? 'npm ci --workspace=@iitj1/types --workspace=@iitj1/api --include-workspace-root=false'
  : 'npm install --workspace=@iitj1/types --workspace=@iitj1/api --include-workspace-root=false';

run(installCmd, repoRoot);
run('npm run build -w @iitj1/types', repoRoot);
run('npm run build -w @iitj1/api', repoRoot);

const distEntry = path.join(apiRoot, 'dist', 'index.js');
if (!fs.existsSync(distEntry)) {
  console.error('[render-build] Expected output missing:', distEntry);
  process.exit(1);
}

console.log('[render-build] OK →', distEntry);
