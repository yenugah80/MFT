const React = require("react");

// Shared instance so a test file can both mock the module AND import
// `mockRouter` to assert on it — `router.replace("/onboarding/step-1")` etc.
const mockRouter = {
  replace: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => false),
};

function useRouter() {
  return mockRouter;
}

// Real useFocusEffect (react-navigation) re-runs the callback on every
// focus; in these tests there's only ever one "screen," so running it once
// on mount reproduces the one behavior sign-in.jsx/sign-up.jsx actually
// depend on (clearing any stale notice).
function useFocusEffect(callback) {
  React.useEffect(() => {
    const cleanup = callback();
    return typeof cleanup === "function" ? cleanup : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

module.exports = { useRouter, useFocusEffect, mockRouter };
