const saveProfileBasics = jest.fn(() => Promise.resolve({}));

module.exports = { saveProfileBasics, __mocks: { saveProfileBasics } };
