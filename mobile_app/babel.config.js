// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      '@babel/plugin-syntax-import-meta',
      // If you're using Reanimated, add it after syntax plugins
      // 'react-native-reanimated/plugin',
    ],
  };
};