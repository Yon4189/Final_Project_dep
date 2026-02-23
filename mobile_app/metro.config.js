// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for more file extensions
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'mjs',
  'cjs',
  'js',
  'jsx',
  'ts',
  'tsx',
  'json',
];

// Ensure proper asset handling
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
];

// Force CJS resolution for packages that ship ESM files with import.meta
// zustand v5 uses import.meta.env in its ESM middleware.mjs which Metro cannot handle
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Redirect zustand ESM imports to CJS equivalents
  if (moduleName === 'zustand' || moduleName === 'zustand/') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/zustand/index.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName.startsWith('zustand/')) {
    const subPath = moduleName.replace('zustand/', '');
    const cjsPath = path.resolve(__dirname, `node_modules/zustand/${subPath}.js`);
    return {
      filePath: cjsPath,
      type: 'sourceFile',
    };
  }

  // Default resolver for everything else
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;