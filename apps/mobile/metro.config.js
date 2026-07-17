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

// Force a single copy of React and its store shim to avoid the
// "Invalid hook call" crash caused by posthog-react-native / @react-navigation
// packages each hoisting their own react / use-sync-external-store instance.
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'use-sync-external-store': path.resolve(projectRoot, 'node_modules/use-sync-external-store'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react') {
    return context.resolveRequest(
      context,
      path.resolve(projectRoot, 'node_modules/react'),
      platform
    );
  }
  if (moduleName === 'react-native') {
    return context.resolveRequest(
      context,
      path.resolve(projectRoot, 'node_modules/react-native'),
      platform
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Next.js (Admin) rewrites apps/admin/.next on every dev-server restart or
// rebuild. Since watchFolders covers the whole workspace root, Metro's
// watcher used to race those writes on Windows — Next mid-write to
// routes-manifest.json / webpack's cache while Metro's crawler touched the
// same files — corrupting .next and throwing ENOENT. Block build-output
// dirs outright so Metro never watches them; it has no reason to.
config.resolver.blockList = /apps[\\/](admin[\\/]\.next|api[\\/]dist)[\\/].*/;

module.exports = config;


