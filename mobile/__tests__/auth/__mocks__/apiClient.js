const post = jest.fn(() => Promise.resolve({ data: {} }));
const get = jest.fn(() => Promise.resolve({ data: {} }));

module.exports = { __esModule: true, default: { post, get }, __mocks: { post, get } };
