/**
 * authenticateAppleCredential — every Clerk outcome for a native Apple
 * credential, from both screens' entry points. Apple sends name/email only
 * on the first authorization, so returning users must work from the token's
 * stable subject alone, and only a real Clerk session counts as success.
 */
import { authenticateAppleCredential, AppleAuthError } from "../utils/appleAuth";

const firstTimeCredential = {
  identityToken: "tok_first",
  email: "ada@example.com",
  fullName: { givenName: "Ada", familyName: "Lovelace" },
};
// What Apple returns on every later authorization: token only.
const returningCredential = { identityToken: "tok_returning", email: null, fullName: null };
const relayCredential = {
  identityToken: "tok_relay",
  email: "x7k2m9@privaterelay.appleid.com",
  fullName: { givenName: null, familyName: null },
};

function makeClerk() {
  return {
    signIn: { create: jest.fn() },
    signUp: { create: jest.fn() },
  };
}

const notFound = () => Object.assign(new Error("not found"), { errors: [{ code: "external_account_not_found" }] });

describe("authenticateAppleCredential — starting from sign-in", () => {
  test("returning Apple user with no name and no email signs straight in", async () => {
    const { signIn, signUp } = makeClerk();
    signIn.create.mockResolvedValueOnce({ status: "complete", createdSessionId: "sess_ret" });

    await expect(
      authenticateAppleCredential({ credential: returningCredential, signIn, signUp })
    ).resolves.toEqual({ sessionId: "sess_ret", flow: "sign_in", isNewUser: false });
    expect(signIn.create).toHaveBeenCalledWith({ strategy: "oauth_token_apple", token: "tok_returning" });
    expect(signUp.create).not.toHaveBeenCalled();
  });

  test("new Apple user with email/name is created via the transferable hand-off, names forwarded", async () => {
    const { signIn, signUp } = makeClerk();
    signIn.create.mockResolvedValueOnce({ status: "needs_identifier", firstFactorVerification: { status: "transferable" } });
    signUp.create.mockResolvedValueOnce({ status: "complete", createdSessionId: "sess_new" });

    await expect(
      authenticateAppleCredential({ credential: firstTimeCredential, signIn, signUp })
    ).resolves.toEqual({ sessionId: "sess_new", flow: "sign_up", isNewUser: true });
    expect(signUp.create).toHaveBeenCalledWith({ transfer: true, firstName: "Ada", lastName: "Lovelace" });
  });

  test("external_account_not_found falls back to a native-token sign-up", async () => {
    const { signIn, signUp } = makeClerk();
    signIn.create.mockRejectedValueOnce(notFound());
    signUp.create.mockResolvedValueOnce({ status: "complete", createdSessionId: "sess_nf" });

    const result = await authenticateAppleCredential({ credential: firstTimeCredential, signIn, signUp });
    expect(result).toEqual({ sessionId: "sess_nf", flow: "sign_up", isNewUser: true });
    expect(signUp.create).toHaveBeenCalledWith({
      strategy: "oauth_token_apple",
      token: "tok_first",
      firstName: "Ada",
      lastName: "Lovelace",
    });
  });

  test("private relay email: no name, relay address stays inside the token, account is created", async () => {
    const { signIn, signUp } = makeClerk();
    signIn.create.mockResolvedValueOnce({ status: "needs_identifier", firstFactorVerification: { status: "transferable" } });
    signUp.create.mockResolvedValueOnce({ status: "complete", createdSessionId: "sess_relay" });

    const result = await authenticateAppleCredential({ credential: relayCredential, signIn, signUp });
    expect(result.sessionId).toBe("sess_relay");
    // Nothing filters or rewrites the relay domain; the email isn't even sent separately.
    expect(signUp.create).toHaveBeenCalledWith({ transfer: true });
  });

  test("missing_requirements for a name Apple did send is completed with that name", async () => {
    const { signIn, signUp } = makeClerk();
    const update = jest.fn().mockResolvedValue({ status: "complete", createdSessionId: "sess_upd" });
    signIn.create.mockResolvedValueOnce({ status: "needs_identifier", firstFactorVerification: { status: "transferable" } });
    signUp.create.mockResolvedValueOnce({ status: "missing_requirements", missingFields: ["last_name"], update });

    const result = await authenticateAppleCredential({ credential: firstTimeCredential, signIn, signUp });
    expect(update).toHaveBeenCalledWith({ lastName: "Lovelace" });
    expect(result.sessionId).toBe("sess_upd");
  });

  test("missing_requirements that cannot be satisfied throws and never yields a session", async () => {
    const { signIn, signUp } = makeClerk();
    signIn.create.mockResolvedValueOnce({ status: "needs_identifier", firstFactorVerification: { status: "transferable" } });
    signUp.create.mockResolvedValueOnce({
      status: "missing_requirements",
      missingFields: ["first_name"],
      createdSessionId: null,
      update: jest.fn(),
    });

    const promise = authenticateAppleCredential({ credential: returningCredential, signIn, signUp });
    await expect(promise).rejects.toBeInstanceOf(AppleAuthError);
    await expect(
      authenticateAppleCredential({
        credential: returningCredential,
        signIn: { create: jest.fn().mockResolvedValue({ firstFactorVerification: { status: "transferable" } }) },
        signUp: { create: jest.fn().mockResolvedValue({ status: "missing_requirements", missingFields: ["first_name"] }) },
      })
    ).rejects.toThrow("Apple sign-up did not complete (status: missing_requirements; missing: first_name).");
  });

  test("an unhandled sign-in status throws with the status instead of doing nothing", async () => {
    const { signIn, signUp } = makeClerk();
    signIn.create.mockResolvedValueOnce({ status: "needs_first_factor" });
    await expect(authenticateAppleCredential({ credential: returningCredential, signIn, signUp })).rejects.toThrow(
      "Apple sign-in did not complete (status: needs_first_factor)."
    );
  });

  test("a Clerk error other than external_account_not_found is rethrown untouched", async () => {
    const { signIn, signUp } = makeClerk();
    const clerkError = { errors: [{ code: "form_identifier_not_found" }] };
    signIn.create.mockRejectedValueOnce(clerkError);
    await expect(authenticateAppleCredential({ credential: returningCredential, signIn, signUp })).rejects.toBe(clerkError);
    expect(signUp.create).not.toHaveBeenCalled();
  });

  test("a credential without an identity token fails before contacting Clerk", async () => {
    const { signIn, signUp } = makeClerk();
    await expect(authenticateAppleCredential({ credential: {}, signIn, signUp })).rejects.toMatchObject({
      stage: "apple_credential",
    });
    expect(signIn.create).not.toHaveBeenCalled();
  });

  test("reports safe stages without the token", async () => {
    const { signIn, signUp } = makeClerk();
    const log = jest.fn();
    signIn.create.mockResolvedValueOnce({ status: "complete", createdSessionId: "sess_log" });
    await authenticateAppleCredential({ credential: returningCredential, signIn, signUp, log });
    expect(log.mock.calls.map(([stage]) => stage)).toEqual(["APPLE_USER_LOOKUP", "APPLE_USER_FOUND"]);
    expect(JSON.stringify(log.mock.calls)).not.toContain("tok_returning");
  });
});

describe("authenticateAppleCredential — starting from sign-up", () => {
  test("new user completes sign-up directly", async () => {
    const { signIn, signUp } = makeClerk();
    signUp.create.mockResolvedValueOnce({ status: "complete", createdSessionId: "sess_su" });
    await expect(
      authenticateAppleCredential({ credential: firstTimeCredential, signIn, signUp, startWith: "sign_up" })
    ).resolves.toEqual({ sessionId: "sess_su", flow: "sign_up", isNewUser: true });
    expect(signIn.create).not.toHaveBeenCalled();
  });

  test("returning Apple user on the sign-up screen is transferred to sign-in", async () => {
    const { signIn, signUp } = makeClerk();
    signUp.create.mockResolvedValueOnce({ verifications: { externalAccount: { status: "transferable" } } });
    signIn.create.mockResolvedValueOnce({ status: "complete", createdSessionId: "sess_back" });
    await expect(
      authenticateAppleCredential({ credential: returningCredential, signIn, signUp, startWith: "sign_up" })
    ).resolves.toEqual({ sessionId: "sess_back", flow: "sign_in", isNewUser: false });
    expect(signIn.create).toHaveBeenCalledWith({ transfer: true });
  });

  test("a transfer that does not complete throws with its status", async () => {
    const { signIn, signUp } = makeClerk();
    signUp.create.mockResolvedValueOnce({ verifications: { externalAccount: { status: "transferable" } } });
    signIn.create.mockResolvedValueOnce({ status: "needs_second_factor" });
    await expect(
      authenticateAppleCredential({ credential: returningCredential, signIn, signUp, startWith: "sign_up" })
    ).rejects.toThrow("Apple account link did not complete (status: needs_second_factor).");
  });
});
