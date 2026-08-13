// Default: nothing stored yet ("not seen before"). Tests override per case
// with getItem.mockResolvedValueOnce(...) to simulate a returning session.
const getItem = jest.fn(() => Promise.resolve(null));
const setItem = jest.fn(() => Promise.resolve(true));

module.exports = { __esModule: true, getItem, setItem, __mocks: { getItem, setItem } };
