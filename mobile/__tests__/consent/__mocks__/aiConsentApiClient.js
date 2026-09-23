// apiClient.get/post return the parsed body directly (not an axios-style
// `.data` wrapper) — matching the real client, see services/apiClient.js.
const get = jest.fn(() => Promise.resolve({}));
const post = jest.fn(() => Promise.resolve({}));

module.exports = { __esModule: true, default: { get, post }, __mocks: { get, post } };
