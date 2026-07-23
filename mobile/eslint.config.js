// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // Allow apostrophes and quotes in JSX text (common in English)
      'react/no-unescaped-entities': 'off',
      // Allow namespace imports where property may not be statically analyzed
      'import/namespace': 'off',
    },
  },
  // Jest globals (describe/it/expect/jest/beforeEach/...) — without this,
  // every test file reports ~10-30 false-positive no-undef errors that bury
  // real ones in lint output.
  {
    files: ['**/__tests__/**', '**/*.test.js', '**/*.test.jsx', '**/jest.setup.js'],
    languageOptions: {
      globals: globals.jest,
    },
  },
  // Node globals (__dirname/module/require/process/...) for build/config
  // scripts that run under Node rather than the app's React Native runtime.
  {
    files: ['**/webpack.config.js', '**/metro.config.js', '**/babel.config.js', '**/jest.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
