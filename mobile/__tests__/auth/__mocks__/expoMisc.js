// Grouped: small, single-export modules that only need a no-op stub.
const webBrowser = { maybeCompleteAuthSession: jest.fn() };
const authSession = { makeRedirectUri: jest.fn(() => "my-food-tracker://oauth-native-callback") };

module.exports = { webBrowser, authSession };
