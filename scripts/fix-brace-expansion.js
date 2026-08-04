#!/usr/bin/env node
/**
 * minimatch@9 expects brace-expansion's CJS default export (2.0.2).
 * minimatch@10 expects the named `expand` export (5.x).
 * npm often hoists 5.x to the root, which breaks @expo/cli's minimatch@9
 * (fingerprint / pod codegen). Ensure a nested 2.0.2 copy where needed.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const targets = [
  'node_modules/@expo/cli/node_modules/minimatch',
];

function copyDir(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

function ensureBraceExpansion(minimatchDir) {
  const pkgPath = path.join(root, minimatchDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return;

  const { version } = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (!version.startsWith('9.')) return;

  const destBe = path.join(root, minimatchDir, 'node_modules', 'brace-expansion');
  const destBm = path.join(root, minimatchDir, 'node_modules', 'balanced-match');
  const srcBe = path.join(root, 'node_modules', 'minimatch', 'node_modules', 'brace-expansion');
  const srcBm = path.join(root, 'node_modules', 'minimatch', 'node_modules', 'balanced-match');

  // Fallback: @next nest (also pins 2.0.2 for minimatch@9)
  const altBe = path.join(
    root,
    'node_modules/@next/eslint-plugin-next/node_modules/brace-expansion',
  );
  const altBm = path.join(
    root,
    'node_modules/@next/eslint-plugin-next/node_modules/balanced-match',
  );

  const beSrc = fs.existsSync(srcBe) ? srcBe : altBe;
  const bmSrc = fs.existsSync(srcBm) ? srcBm : altBm;

  if (!fs.existsSync(beSrc) || !fs.existsSync(bmSrc)) {
    console.warn(
      `[fix-brace-expansion] skip ${minimatchDir}: no brace-expansion@2.0.2 source found`,
    );
    return;
  }

  const beVer = JSON.parse(fs.readFileSync(path.join(beSrc, 'package.json'), 'utf8')).version;
  if (beVer !== '2.0.2') {
    console.warn(
      `[fix-brace-expansion] skip ${minimatchDir}: source brace-expansion is ${beVer}, want 2.0.2`,
    );
    return;
  }

  let needsCopy = true;
  if (fs.existsSync(path.join(destBe, 'package.json'))) {
    const installed = JSON.parse(fs.readFileSync(path.join(destBe, 'package.json'), 'utf8')).version;
    needsCopy = installed !== '2.0.2';
  }

  if (!needsCopy && fs.existsSync(destBm)) return;

  fs.rmSync(path.join(root, minimatchDir, 'node_modules'), { recursive: true, force: true });
  copyDir(beSrc, destBe);
  copyDir(bmSrc, destBm);
  console.log(`[fix-brace-expansion] nested brace-expansion@2.0.2 under ${minimatchDir}`);
}

for (const target of targets) {
  ensureBraceExpansion(target);
}
