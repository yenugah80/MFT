const transformIgnorePatterns = [
  'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
];

const collectCoverageFrom = [
  'services/**/*.{js,jsx}',
  'hooks/**/*.{js,jsx}',
  'utils/**/*.{js,jsx}',
  '!**/node_modules/**',
];

module.exports = {
  projects: [
    {
      displayName: 'unit',
      preset: 'jest-expo',
      transformIgnorePatterns,
      // Unchanged from before this file became a multi-project config —
      // every pre-existing test here still runs exactly as it did.
      testMatch: ['**/__tests__/**/*.test.{js,jsx,ts,tsx}'],
      testPathIgnorePatterns: ['<rootDir>/__tests__/auth/', '<rootDir>/__tests__/consent/', '<rootDir>/__tests__/log/', '<rootDir>/__tests__/analytics/'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
      testEnvironment: 'node',
      globals: { __DEV__: true },
    },
    {
      // Component/interaction tests for screens — needs a real react-native,
      // which jest.setup.js deliberately stubs down to `{ Platform }` for the
      // unit project above. Routing these through a separate setup file (no
      // react-native mock) is what lets both live in one `npm test` without
      // the unit project paying for full RN rendering it never uses.
      displayName: 'components',
      preset: 'jest-expo',
      transformIgnorePatterns,
      testMatch: [
        '<rootDir>/__tests__/auth/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/__tests__/consent/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/__tests__/log/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/__tests__/analytics/**/*.test.{js,jsx,ts,tsx}',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.components.js'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
      testEnvironment: 'node',
      globals: { __DEV__: true },
    },
  ],
  collectCoverageFrom,
};
