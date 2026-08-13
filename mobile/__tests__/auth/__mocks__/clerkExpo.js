// Mutable mock state, reached into directly by test files (not reset by
// jest.clearAllMocks()'s call-history reset alone — tests set `.isLoaded`
// and swap `.mockResolvedValueOnce(...)` per case).
const signInMock = {
  create: jest.fn(),
  attemptFirstFactor: jest.fn(),
};
const setActiveMock = jest.fn();
const useSignInReturn = {
  signIn: signInMock,
  setActive: setActiveMock,
  isLoaded: true,
};

const signUpMock = {
  create: jest.fn(),
  prepareEmailAddressVerification: jest.fn(),
  attemptEmailAddressVerification: jest.fn(),
};
const setSignUpActiveMock = jest.fn();
const useSignUpReturn = {
  signUp: signUpMock,
  setActive: setSignUpActiveMock,
  isLoaded: true,
};

const startOAuthFlowMock = jest.fn();
const useOAuthReturn = { startOAuthFlow: startOAuthFlowMock };

const getTokenMock = jest.fn(() => Promise.resolve("test-token"));
const useAuthReturn = { getToken: getTokenMock };

module.exports = {
  useSignIn: () => useSignInReturn,
  useSignUp: () => useSignUpReturn,
  useOAuth: () => useOAuthReturn,
  useAuth: () => useAuthReturn,
  __mocks: {
    signInMock,
    setActiveMock,
    useSignInReturn,
    signUpMock,
    setSignUpActiveMock,
    useSignUpReturn,
    startOAuthFlowMock,
    getTokenMock,
  },
};
