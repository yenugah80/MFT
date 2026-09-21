import { resolveAppleAuthResult } from "../utils/appleAuth";

describe("resolveAppleAuthResult", () => {
  const setActive = jest.fn();

  it("accepts a returning Apple user only when Clerk created a session", () => {
    expect(
      resolveAppleAuthResult({
        createdSessionId: "sess_returning",
        setActive,
        signIn: { status: "complete", createdSessionId: "sess_returning" },
        signUp: { status: null, createdSessionId: null },
      })
    ).toEqual({
      cancelled: false,
      sessionId: "sess_returning",
      setActive,
      isNewUser: false,
    });
  });

  it("identifies a new Apple user from the completed sign-up session", () => {
    expect(
      resolveAppleAuthResult({
        createdSessionId: "sess_new",
        setActive,
        signIn: { status: "needs_identifier", createdSessionId: null },
        signUp: { status: "complete", createdSessionId: "sess_new" },
      }).isNewUser
    ).toBe(true);
  });

  it("rejects missing requirements instead of navigating without a session", () => {
    expect(() =>
      resolveAppleAuthResult({
        createdSessionId: null,
        setActive,
        signIn: { status: "needs_identifier" },
        signUp: { status: "missing_requirements", missingFields: ["email_address"] },
      })
    ).toThrow("status: missing_requirements; missing: email_address");
  });

  it("treats an empty result as a cancelled Apple sheet", () => {
    expect(
      resolveAppleAuthResult({
        createdSessionId: null,
        setActive,
        signIn: { status: null },
        signUp: { status: null },
      })
    ).toEqual({ cancelled: true });
  });
});
