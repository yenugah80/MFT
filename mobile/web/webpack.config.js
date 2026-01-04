const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  // Set the app root for Expo Router
  process.env.EXPO_ROUTER_APP_ROOT = path.resolve(__dirname, '../app');

  const config = await createExpoWebpackConfigAsync(env, argv);

  // Handle WASM files
  config.module.rules.push({
    test: /\.wasm$/,
    type: 'webassembly/async',
  });

  // Enable WebAssembly
  config.experiments = {
    ...config.experiments,
    asyncWebAssembly: true,
    layers: true,
  };

  return config;
};
