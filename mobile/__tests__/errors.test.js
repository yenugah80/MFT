/**
 * Pure-function unit tests — no rendering, no mocks, exactly the exported
 * functions called directly. mapAppleAuthErrorCode was extracted from
 * duplicated inline object literals in sign-in.jsx/sign-up.jsx specifically
 * so it could be tested this way; see the comment in utils/errors.js.
 */
const { parseClerkError, mapAppleAuthErrorCode } = require("../utils/errors");

describe("parseClerkError", () => {
  test("null/undefined input", () => {
    expect(parseClerkError(null)).toBe("An unknown error occurred.");
    expect(parseClerkError(undefined)).toBe("An unknown error occurred.");
  });

  test("prefers errors[0].longMessage when present", () => {
    expect(
      parseClerkError({ errors: [{ longMessage: "Long form.", message: "Short." }] })
    ).toBe("Long form.");
  });

  test("falls back to errors[0].long_message (snake_case)", () => {
    expect(parseClerkError({ errors: [{ long_message: "Snake case." }] })).toBe(
      "Snake case."
    );
  });

  test("falls back to errors[0].message when no long-form field exists", () => {
    expect(parseClerkError({ errors: [{ message: "Plain message." }] })).toBe(
      "Plain message."
    );
  });

  test("falls back to a generic string when errors[0] has no usable field", () => {
    expect(parseClerkError({ errors: [{}] })).toBe("Authentication failed.");
  });

  test("an empty errors array is treated as absent, not a match", () => {
    expect(parseClerkError({ errors: [], message: "Fallback." })).toBe("Fallback.");
  });

  test("a non-array errors field is treated as absent", () => {
    expect(parseClerkError({ errors: "not an array", message: "Fallback." })).toBe(
      "Fallback."
    );
  });

  test("standard Error object message, when no errors array", () => {
    expect(parseClerkError(new Error("Boom."))).toBe("Boom.");
  });

  test("a plain string error is returned as-is", () => {
    expect(parseClerkError("Just a string.")).toBe("Just a string.");
  });

  test("an object with nothing usable falls all the way through", () => {
    expect(parseClerkError({})).toBe("Something went wrong. Please try again.");
  });
});

describe("mapAppleAuthErrorCode", () => {
  test.each([
    ["ERR_REQUEST_UNKNOWN", "Apple sign-in failed. Make sure you're signed into an Apple ID on this device."],
    ["ERR_REQUEST_NOT_HANDLED", "Apple sign-in could not be completed. Please try again."],
    ["ERR_REQUEST_NOT_INTERACTIVE", "Apple sign-in requires user interaction. Please try again."],
    ["ERR_INVALID_RESPONSE", "Apple returned an invalid response. Please try again."],
  ])("maps %s to its message", (code, expected) => {
    expect(mapAppleAuthErrorCode(code)).toBe(expected);
  });

  test("an unmapped code returns undefined so callers can fall through", () => {
    expect(mapAppleAuthErrorCode("ERR_REQUEST_CANCELED")).toBeUndefined();
    expect(mapAppleAuthErrorCode(undefined)).toBeUndefined();
  });
});
