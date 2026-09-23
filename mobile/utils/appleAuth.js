/**
 * Turns a native Apple credential into a Clerk session.
 *
 * Shared by the sign-in and sign-up screens so both handle every Clerk
 * outcome the same way. The only success is a real `createdSessionId`:
 * `missing_requirements` used to be treated as success, which navigated a
 * user with no session into the app, where the route guards bounced them
 * straight back to sign-in — Apple authenticated, then nothing proceeded.
 *
 * Apple only returns name/email on the very first authorization for this
 * app. A returning Apple user is matched by Clerk on the token's stable
 * subject alone, so nothing here requires a name or an email; they are only
 * forwarded when Apple provides them. Private-relay addresses
 * (@privaterelay.appleid.com) are inside the token and never filtered here.
 */

export class AppleAuthError extends Error {
  constructor(message, { stage, status, missingFields } = {}) {
    super(message);
    this.name = "AppleAuthError";
    this.stage = stage;
    this.status = status;
    this.missingFields = missingFields;
  }
}

const appleNameFields = (credential) => ({
  ...(credential?.fullName?.givenName && { firstName: credential.fullName.givenName }),
  ...(credential?.fullName?.familyName && { lastName: credential.fullName.familyName }),
});

const FIELD_FOR_MISSING = { first_name: "firstName", last_name: "lastName" };

async function finishSignUp(attempt, names, log) {
  let current = attempt;

  if (current?.status === "missing_requirements") {
    // Apple only sends the name once. If Clerk requires it and Apple sent it
    // this time, supply it; anything else we cannot invent.
    const patch = {};
    for (const field of current.missingFields ?? []) {
      const key = FIELD_FOR_MISSING[field];
      if (key && names[key]) patch[key] = names[key];
    }
    if (Object.keys(patch).length > 0 && typeof current.update === "function") {
      current = await current.update(patch);
    }
  }

  if (current?.status === "complete" && current.createdSessionId) {
    log("APPLE_USER_CREATED");
    return current.createdSessionId;
  }

  const missing = current?.missingFields?.length ? current.missingFields : undefined;
  throw new AppleAuthError(
    `Apple sign-up did not complete (status: ${current?.status ?? "unknown"}${
      missing ? `; missing: ${missing.join(", ")}` : ""
    }).`,
    { stage: "clerk_sign_up", status: current?.status, missingFields: missing }
  );
}

async function completeTransferToSignIn(signIn, log) {
  const transferred = await signIn.create({ transfer: true });
  if (transferred?.status === "complete" && transferred.createdSessionId) {
    log("APPLE_USER_FOUND");
    return { sessionId: transferred.createdSessionId, flow: "sign_in", isNewUser: false };
  }
  throw new AppleAuthError(
    `Apple account link did not complete (status: ${transferred?.status ?? "unknown"}).`,
    { stage: "clerk_transfer_sign_in", status: transferred?.status }
  );
}

async function startWithSignUp({ token, names, signIn, signUp, log }) {
  log("APPLE_USER_LOOKUP", { via: "sign_up" });
  const attempt = await signUp.create({ strategy: "oauth_token_apple", token, ...names });

  // The Apple identity already belongs to an existing user.
  if (attempt?.verifications?.externalAccount?.status === "transferable") {
    return completeTransferToSignIn(signIn, log);
  }

  const sessionId = await finishSignUp(attempt, names, log);
  return { sessionId, flow: "sign_up", isNewUser: true };
}

async function startWithSignIn({ token, names, signIn, signUp, log }) {
  log("APPLE_USER_LOOKUP", { via: "sign_in" });
  let attempt;
  try {
    attempt = await signIn.create({ strategy: "oauth_token_apple", token });
  } catch (err) {
    if (err?.errors?.[0]?.code !== "external_account_not_found") throw err;
    return startWithSignUp({ token, names, signIn, signUp, log });
  }

  if (attempt?.status === "complete" && attempt.createdSessionId) {
    log("APPLE_USER_FOUND");
    return { sessionId: attempt.createdSessionId, flow: "sign_in", isNewUser: false };
  }

  // No user holds this Apple identity yet: Clerk hands the verified
  // identity over to a sign-up.
  if (attempt?.firstFactorVerification?.status === "transferable") {
    const transferred = await signUp.create({ transfer: true, ...names });
    const sessionId = await finishSignUp(transferred, names, log);
    return { sessionId, flow: "sign_up", isNewUser: true };
  }

  throw new AppleAuthError(`Apple sign-in did not complete (status: ${attempt?.status ?? "unknown"}).`, {
    stage: "clerk_sign_in",
    status: attempt?.status,
  });
}

/**
 * @param {object} params
 * @param {object} params.credential  result of AppleAuthentication.signInAsync
 * @param {object} params.signIn      Clerk SignIn resource
 * @param {object} params.signUp      Clerk SignUp resource
 * @param {"sign_in"|"sign_up"} [params.startWith]
 * @param {(stage: string, details?: object) => void} [params.log]
 * @returns {Promise<{ sessionId: string, flow: "sign_in"|"sign_up", isNewUser: boolean }>}
 */
export async function authenticateAppleCredential({
  credential,
  signIn,
  signUp,
  startWith = "sign_in",
  log = () => {},
}) {
  const token = credential?.identityToken;
  if (!token) {
    throw new AppleAuthError("Apple did not return an identity token. Please try again.", {
      stage: "apple_credential",
    });
  }

  const names = appleNameFields(credential);
  const params = { token, names, signIn, signUp, log };
  return startWith === "sign_up" ? startWithSignUp(params) : startWithSignIn(params);
}
