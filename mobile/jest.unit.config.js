/**
 * Jest config for pure unit tests (no React Native/Expo dependencies)
 */
module.exports = {
  testMatch: [
    '**/__tests__/**/analytics.test.js',
    '**/__tests__/**/foodAnalyticsCalculations.test.js',
    '**/__tests__/**/profileCache.test.js',
    '**/__tests__/**/pairingSelector.test.js',
    '**/__tests__/**/waterTarget.test.js',
    '**/__tests__/**/hydrationCorrelationInput.test.js',
    '**/__tests__/**/syncRetryPolicy.test.js',
    '**/__tests__/**/uiContractGuards.test.js',
    '**/__tests__/**/sleepWindow.test.js',
    '**/__tests__/**/spacingScale.test.js',
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
