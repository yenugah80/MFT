// Setup for the "components" Jest project (__tests__/auth/**). Deliberately
// does NOT mock react-native itself — jest.setup.js (used by the "unit"
// project) replaces the whole module with a `{ Platform }` stub, which is
// fine for pure-logic tests but means View/Text/Pressable etc. don't exist,
// so no component can render. This file keeps the same supporting mocks
// (AsyncStorage, fetch, __DEV__) without that stub.
require('@testing-library/react-native/build/matchers/extend-expect');

global.__DEV__ = true;

jest.mock('expo/src/winter/runtime.native', () => ({}), { virtual: true });

require('./jest.expoWinterShim');

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-constants', () => ({
  expoConfig: { version: '1.0.0', extra: {} },
  deviceName: 'TestDevice',
}));

// Importing Clerk's real browser/headless singleton starts a MessagePort even
// when a test only renders a leaf component. That kept the entire component
// suite alive after all assertions passed. Screen-level auth tests provide
// their own richer per-file Clerk mocks, while ordinary component tests only
// need stable signed-in hook values.
jest.mock('@clerk/clerk-expo', () => ({
  ClerkProvider: ({ children }) => children,
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    userId: 'test-user',
    getToken: jest.fn(async () => 'test-token'),
  }),
  useUser: () => ({
    isLoaded: true,
    isSignedIn: true,
    user: { id: 'test-user' },
  }),
  useClerk: () => ({ signOut: jest.fn(async () => undefined) }),
  useOAuth: () => ({ startOAuthFlow: jest.fn() }),
  useSignIn: () => ({ isLoaded: true, signIn: null, setActive: jest.fn() }),
  useSignUp: () => ({ isLoaded: true, signUp: null, setActive: jest.fn() }),
}));

global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch.mockClear();
});
