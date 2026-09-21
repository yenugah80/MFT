/**
 * Normalizes Clerk's native Apple flow result before a screen activates it.
 * A session id is the only success signal. In particular,
 * `missing_requirements` is an incomplete sign-up and must never navigate into
 * the authenticated app.
 */
export function resolveAppleAuthResult(result) {
  const signInStatus = result?.signIn?.status;
  const signUpStatus = result?.signUp?.status;

  if (!result?.createdSessionId || !result?.setActive) {
    // Clerk's native hook represents a user-cancelled Apple sheet with an
    // empty result instead of throwing ERR_REQUEST_CANCELED.
    if (!signInStatus && !signUpStatus) {
      return { cancelled: true };
    }

    const status = signUpStatus || signInStatus || "unknown";
    const missingFields = result?.signUp?.missingFields?.join(", ");
    throw new Error(
      `Apple authentication did not create a session (status: ${status}${
        missingFields ? `; missing: ${missingFields}` : ""
      }).`
    );
  }

  return {
    cancelled: false,
    sessionId: result.createdSessionId,
    setActive: result.setActive,
    isNewUser: result.signUp?.createdSessionId === result.createdSessionId,
  };
}
