/**
 * Jest config for pure unit tests (no React Native/Expo dependencies)
 */
module.exports = {
  testMatch: [
    '**/__tests__/**/analytics.test.js',
    '**/__tests__/**/foodAnalyticsCalculations.test.js',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  globals: {
    __DEV__: true,
  },
};
