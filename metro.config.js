const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Alias so require('assets/samples/...') resolves to project assets folder
// without . / .. in path, avoiding Metro asset server ENOENT on .%2Fassets%2Fsamples
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  assets: path.resolve(__dirname, 'assets'),
};

module.exports = config;
