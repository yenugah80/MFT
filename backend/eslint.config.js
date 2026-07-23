import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**', 'drizzle/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'no-unreachable': 'warn',
      'no-const-assign': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-duplicate-case': 'error',
      'no-fallthrough': 'warn',
      'no-irregular-whitespace': 'warn',
      'no-unsafe-negation': 'error',
      'no-case-declarations': 'error',
      'no-empty': 'warn',
      'no-cond-assign': 'error',
      'valid-typeof': 'error',
      'use-isnan': 'error',
    },
  },
];
