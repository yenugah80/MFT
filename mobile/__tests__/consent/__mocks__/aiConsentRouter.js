// Shared instance so a test file can both mock the module AND import
// `mockRouter` to assert on it — `router.push("/profile/privacy")` etc.
const mockRouter = {
  replace: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => false),
};

function useRouter() {
  return mockRouter;
}

module.exports = { useRouter, mockRouter };
