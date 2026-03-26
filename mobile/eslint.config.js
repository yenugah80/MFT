// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

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
]);
