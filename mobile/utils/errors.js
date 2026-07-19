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
