/**
 * Parses errors from Clerk authentication responses.
 * @param {Error|Object} error - The error object returned by Clerk.
 * @returns {string} A user-friendly error message.
 */
export const parseClerkError = (error) => {
  if (!error) return "An unknown error occurred.";

  // Check for Clerk's array of errors
  if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
    // Return the first error's long message or message
    const firstError = error.errors[0];
    return firstError.longMessage || firstError.long_message || firstError.message || "Authentication failed.";
  }

  // Check for standard Error object message
  if (error.message) {
    return error.message;
  }

  // Fallback for string errors
  if (typeof error === "string") {
    return error;
  }

  return "Something went wrong. Please try again.";
};

/**
 * Maps an expo-apple-authentication error code to a user-facing message.
 * Was duplicated inline in sign-in.jsx and sign-up.jsx (identical object,
 * including the "sign-in" wording in sign-up's copy — a pre-existing
 * artifact, preserved here rather than "corrected" as part of a test-suite
 * change). Returns undefined for an unmapped code, same as the inline
 * version, so callers keep their own `|| parseClerkError(err) || "..."`
 * fallback chain.
 * @param {string} code
 * @returns {string|undefined}
 */
export const mapAppleAuthErrorCode = (code) =>
  ({
    ERR_REQUEST_UNKNOWN: "Apple sign-in failed. Make sure you're signed into an Apple ID on this device.",
    ERR_REQUEST_NOT_HANDLED: "Apple sign-in could not be completed. Please try again.",
    ERR_REQUEST_NOT_INTERACTIVE: "Apple sign-in requires user interaction. Please try again.",
    ERR_INVALID_RESPONSE: "Apple returned an invalid response. Please try again.",
  }[code]);
