// Jest setup file for MyFoodTracker mobile app

// Set __DEV__ for tests
global.__DEV__ = true;

// Mock expo module system
jest.mock('expo/src/winter/runtime.native', () => ({}), { virtual: true });

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    version: '1.0.0',
    extra: {},
  },
  deviceName: 'TestDevice',
}));

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  Version: '15.0',
  select: jest.fn((obj) => obj.ios || obj.default),
}));

// Mock fetch globally
global.fetch = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch.mockClear();
});

// Suppress console warnings in tests (optional)
const originalWarn = console.warn;
console.warn = (...args) => {
  // Suppress specific warnings if needed
  if (args[0]?.includes?.('[Analytics]')) return;
  originalWarn.apply(console, args);
};
