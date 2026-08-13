// Setup for the "components" Jest project (__tests__/auth/**). Deliberately
// does NOT mock react-native itself — jest.setup.js (used by the "unit"
// project) replaces the whole module with a `{ Platform }` stub, which is
// fine for pure-logic tests but means View/Text/Pressable etc. don't exist,
// so no component can render. This file keeps the same supporting mocks
// (AsyncStorage, fetch, __DEV__) without that stub.
require('@testing-library/react-native/build/matchers/extend-expect');

global.__DEV__ = true;

jest.mock('expo/src/winter/runtime.native', () => ({}), { virtual: true });

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-constants', () => ({
  expoConfig: { version: '1.0.0', extra: {} },
  deviceName: 'TestDevice',
}));

global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch.mockClear();
});
