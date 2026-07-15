const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Monorepo: watch workspace root so Metro's HasteFS knows about
// workspaceRoot/node_modules and can resolve @iitj1/types (which is a
// workspace junction to packages/types).
config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Next.js (Admin) rewrites apps/admin/.next on every dev-server restart or
// rebuild. Since watchFolders covers the whole workspace root, Metro's
// watcher used to race those writes on Windows — Next mid-write to
// routes-manifest.json / webpack's cache while Metro's crawler touched the
// same files — corrupting .next and throwing ENOENT. Block build-output
// dirs outright so Metro never watches them; it has no reason to.
config.resolver.blockList = /apps[\\/](admin[\\/]\.next|api[\\/]dist)[\\/].*/;

module.exports = config;


