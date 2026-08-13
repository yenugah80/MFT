const isAvailableAsync = jest.fn(() => Promise.resolve(true));
const signInAsync = jest.fn();

module.exports = {
  isAvailableAsync,
  signInAsync,
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  __mocks: { isAvailableAsync, signInAsync },
};
