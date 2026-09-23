/**
 * Sign In screen ("Sign in" / "Welcome back") — covers email/password,
 * Google OAuth, Apple OAuth (including the transferable-identity handoff),
 * forgot-password, and the isLoaded guard. See
 * docs/architecture/auth-oauth-reference.md for the failure history these
 * tests are guarding against.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import SignInScreen, { HAS_SIGNED_IN_KEY } from "../../app/(auth)/sign-in";
import { mockRouter } from "./__mocks__/expoRouter";
import { __mocks as clerkMocks } from "@clerk/clerk-expo";
import { __mocks as appleMocks } from "expo-apple-authentication";
import { __mocks as apiMocks } from "../../services/apiClient";

jest.mock("@clerk/clerk-expo", () => require("./__mocks__/clerkExpo"));
jest.mock("expo-apple-authentication", () => require("./__mocks__/expoAppleAuthentication"));
jest.mock("expo-web-browser", () => require("./__mocks__/expoMisc").webBrowser);
jest.mock("expo-auth-session", () => require("./__mocks__/expoMisc").authSession);
jest.mock("expo-router", () => require("./__mocks__/expoRouter"));
jest.mock("@expo/vector-icons", () => require("./__mocks__/vectorIcons"));
jest.mock("expo-image", () => require("./__mocks__/expoImage"));
jest.mock("expo-linear-gradient", () => require("./__mocks__/expoLinearGradient"));
jest.mock("react-native-svg", () => require("./__mocks__/reactNativeSvg"));
jest.mock("expo-haptics", () => require("./__mocks__/expoHaptics"));
jest.mock("../../services/apiClient", () => require("./__mocks__/apiClient"));
jest.mock("expo-constants", () => ({
  expoConfig: { version: "1.0.0", extra: { appReviewEmail: "review@example.com" } },
}));

const { signInMock, setActiveMock, useSignInReturn, signUpMock, setSignUpActiveMock } = clerkMocks;
const { startOAuthFlowMock } = clerkMocks;
const { isAvailableAsync, signInAsync } = appleMocks;

// AuthHeroHeading splits its title across nested <Text> elements ("Welcome"
// / "back", "Sign" / "in") so getByText can't match the full title as one
// string in this RNTL version. The lead line is a single plain Text node
// and is unique per mode, so it's a reliable thing to wait on instead.
async function renderReturningUser(isReturning) {
  AsyncStorage.getItem.mockResolvedValueOnce(isReturning ? "true" : null);
  render(<SignInScreen />);
  await waitFor(() =>
    expect(
      screen.getByText(isReturning ? "Good to see you again." : "Enter your details to continue.")
    ).toBeOnTheScreen()
  );
}

beforeEach(() => {
  useSignInReturn.isLoaded = true;
  isAvailableAsync.mockResolvedValue(true);
});

describe("rendering", () => {
  // Default 5000ms times out under full-suite parallel load (passes
  // instantly in isolation) — this screen's mount reads AsyncStorage before
  // its first paint, which is legitimately slower than a synchronous
  // render, not broken.
  test("shows the returning-user hero when AsyncStorage has the flag", async () => {
    await renderReturningUser(true);
    expect(screen.getByText("Good to see you again.")).toBeOnTheScreen();
    expect(screen.getByText("Your wellness dashboard is ready.")).toBeOnTheScreen();
  }, 15000);

  test("shows the first-time hero when AsyncStorage has no flag", async () => {
    await renderReturningUser(false);
    expect(screen.getByText("Sign in to continue your journey.")).toBeOnTheScreen();
  });

  test("renders both social buttons and the forgot-password link", async () => {
    await renderReturningUser(false);
    expect(screen.getByText("Continue with Apple")).toBeOnTheScreen();
    expect(screen.getByText("Continue with Google")).toBeOnTheScreen();
    expect(screen.getByText("Forgot password?")).toBeOnTheScreen();
  });
});

describe("email/password sign-in", () => {
  test("blocks submission with no notice-killing disabled prop when fields are empty", async () => {
    await renderReturningUser(false);
    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() =>
      expect(screen.getByText("Please enter your email and password.")).toBeOnTheScreen()
    );
    expect(signInMock.create).not.toHaveBeenCalled();
  });

  test("shows a visible notice instead of silently no-op'ing when isLoaded is false", async () => {
    await renderReturningUser(false);
    useSignInReturn.isLoaded = false;
    fireEvent.changeText(screen.getByPlaceholderText("Enter your email address"), "a@b.com");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), "hunter2");
    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() =>
      expect(screen.getByText("Still getting ready — please try again in a moment.")).toBeOnTheScreen()
    );
    expect(signInMock.create).not.toHaveBeenCalled();
  });

  test("complete status stores the flag, activates the session, and navigates home", async () => {
    await renderReturningUser(false);
    signInMock.create.mockResolvedValueOnce({ status: "complete", createdSessionId: "sess_1" });

    fireEvent.changeText(screen.getByPlaceholderText("Enter your email address"), " a@b.com ");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), "hunter2");
    fireEvent.press(screen.getByText("Continue"));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/"));
    expect(signInMock.create).toHaveBeenCalledWith({ identifier: "a@b.com", password: "hunter2" });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(HAS_SIGNED_IN_KEY, "true");
    expect(setActiveMock).toHaveBeenCalledWith({ session: "sess_1" });
  });

  test("needs_second_factor with no usable factor falls back to a credentials notice", async () => {
    await renderReturningUser(false);
    // No `supportedSecondFactors` at all — the genuinely-observed Clerk
    // response always includes email_code (see the describe block below for
    // that real path); this covers the defensive fallback for whatever
    // second-factor strategy this app doesn't (yet) implement.
    signInMock.create.mockResolvedValueOnce({ status: "needs_second_factor" });

    fireEvent.changeText(screen.getByPlaceholderText("Enter your email address"), "a@b.com");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), "hunter2");
    fireEvent.press(screen.getByText("Continue"));

    await waitFor(() =>
      expect(screen.getByText("Please check your credentials and try again.")).toBeOnTheScreen()
    );
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  test("a thrown Clerk error surfaces its real message, not a generic fallback", async () => {
    await renderReturningUser(false);
    signInMock.create.mockRejectedValueOnce({
      errors: [{ message: "Invalid password." }],
    });

    fireEvent.changeText(screen.getByPlaceholderText("Enter your email address"), "a@b.com");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), "wrong");
    fireEvent.press(screen.getByText("Continue"));

    await waitFor(() => expect(screen.getByText("Invalid password.")).toBeOnTheScreen());
  });
});

// This is the fix for the production blocker verified directly against
// Clerk's API: a correct password returns `needs_second_factor` with
// `email_code` in `supportedSecondFactors` for every account on this
// instance, including brand-new ones with no MFA enrollment — despite the
// instance's own config reporting no second factor is required. Confirmed
// via curl against the real Frontend API that `prepareSecondFactor`/
// `attemptSecondFactor` with `strategy: "email_code"` is the correct
// contract; these tests pin the app's handling of it.
describe("second-factor verification (email code)", () => {
  test("a correct password with an email_code factor available prepares it and shows the verify screen", async () => {
    await renderReturningUser(false);
    const prepareSecondFactor = jest.fn().mockResolvedValue({});
    signInMock.create.mockResolvedValueOnce({
      status: "needs_second_factor",
      supportedSecondFactors: [{ strategy: "email_code", emailAddressId: "idn_1" }],
      prepareSecondFactor,
    });

    fireEvent.changeText(screen.getByPlaceholderText("Enter your email address"), "a@b.com");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), "hunter2");
    fireEvent.press(screen.getByText("Continue"));

    await waitFor(() => expect(screen.getByText("Verify it's you")).toBeOnTheScreen());
    expect(prepareSecondFactor).toHaveBeenCalledWith({ strategy: "email_code" });
    expect(screen.getByText("Code sent — check your inbox.")).toBeOnTheScreen();
  });

  test("submitting the correct code activates the session and navigates home", async () => {
    await renderReturningUser(false);
    const attemptSecondFactor = jest.fn().mockResolvedValue({
      status: "complete",
      createdSessionId: "sess_2fa",
    });
    signInMock.create.mockResolvedValueOnce({
      status: "needs_second_factor",
      supportedSecondFactors: [{ strategy: "email_code", emailAddressId: "idn_1" }],
      prepareSecondFactor: jest.fn().mockResolvedValue({}),
      attemptSecondFactor,
    });

    fireEvent.changeText(screen.getByPlaceholderText("Enter your email address"), "a@b.com");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), "hunter2");
    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() => expect(screen.getByText("Verify it's you")).toBeOnTheScreen());

    fireEvent.changeText(screen.getByPlaceholderText("Enter the code from your email"), "123456");
    fireEvent.press(screen.getByText("Verify & continue"));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/"));
    expect(attemptSecondFactor).toHaveBeenCalledWith({ strategy: "email_code", code: "123456" });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(HAS_SIGNED_IN_KEY, "true");
    expect(setActiveMock).toHaveBeenCalledWith({ session: "sess_2fa" });
  });

  test("an empty code shows a notice without calling attemptSecondFactor", async () => {
    await renderReturningUser(false);
    const attemptSecondFactor = jest.fn();
    signInMock.create.mockResolvedValueOnce({
      status: "needs_second_factor",
      supportedSecondFactors: [{ strategy: "email_code", emailAddressId: "idn_1" }],
      prepareSecondFactor: jest.fn().mockResolvedValue({}),
      attemptSecondFactor,
    });

    fireEvent.changeText(screen.getByPlaceholderText("Enter your email address"), "a@b.com");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), "hunter2");
    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() => expect(screen.getByText("Verify it's you")).toBeOnTheScreen());

    fireEvent.press(screen.getByText("Verify & continue"));

    await waitFor(() =>
      expect(screen.getByText("Enter the security code from your email.")).toBeOnTheScreen()
    );
    expect(attemptSecondFactor).not.toHaveBeenCalled();
  });

  test("a wrong code shows a notice and does not navigate", async () => {
    await renderReturningUser(false);
    const attemptSecondFactor = jest.fn().mockResolvedValue({ status: "needs_second_factor" });
    signInMock.create.mockResolvedValueOnce({
      status: "needs_second_factor",
      supportedSecondFactors: [{ strategy: "email_code", emailAddressId: "idn_1" }],
      prepareSecondFactor: jest.fn().mockResolvedValue({}),
      attemptSecondFactor,
    });

    fireEvent.changeText(screen.getByPlaceholderText("Enter your email address"), "a@b.com");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), "hunter2");
    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() => expect(screen.getByText("Verify it's you")).toBeOnTheScreen());

    fireEvent.changeText(screen.getByPlaceholderText("Enter the code from your email"), "000000");
    fireEvent.press(screen.getByText("Verify & continue"));

    await waitFor(() =>
      expect(screen.getByText("That code didn't work. Please check it and try again.")).toBeOnTheScreen()
    );
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  test("resend requests a fresh code via the same in-progress attempt", async () => {
    await renderReturningUser(false);
    const prepareSecondFactor = jest.fn().mockResolvedValue({});
    signInMock.create.mockResolvedValueOnce({
      status: "needs_second_factor",
      supportedSecondFactors: [{ strategy: "email_code", emailAddressId: "idn_1" }],
      prepareSecondFactor,
    });

    fireEvent.changeText(screen.getByPlaceholderText("Enter your email address"), "a@b.com");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), "hunter2");
    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() => expect(screen.getByText("Verify it's you")).toBeOnTheScreen());
    prepareSecondFactor.mockClear();

    fireEvent.press(screen.getByText("Resend code"));

    await waitFor(() => expect(screen.getByText("A fresh code is on the way.")).toBeOnTheScreen());
    expect(prepareSecondFactor).toHaveBeenCalledWith({ strategy: "email_code" });
  });

  test("the back button returns to sign-in, not a dead end", async () => {
    await renderReturningUser(false);
    signInMock.create.mockResolvedValueOnce({
      status: "needs_second_factor",
      supportedSecondFactors: [{ strategy: "email_code", emailAddressId: "idn_1" }],
      prepareSecondFactor: jest.fn().mockResolvedValue({}),
    });

    fireEvent.changeText(screen.getByPlaceholderText("Enter your email address"), "a@b.com");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), "hunter2");
    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() => expect(screen.getByText("Verify it's you")).toBeOnTheScreen());

    fireEvent.press(screen.getByLabelText("Back"));

    await waitFor(() =>
      expect(screen.getByText("Enter your details to continue.")).toBeOnTheScreen()
    );
  });
});

describe("Google sign-in", () => {
  test("success path stores the flag, activates, and navigates home", async () => {
    await renderReturningUser(false);
    const oauthSetActive = jest.fn();
    startOAuthFlowMock.mockResolvedValueOnce({
      createdSessionId: "sess_g1",
      setActive: oauthSetActive,
    });

    fireEvent.press(screen.getByText("Continue with Google"));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/"));
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(HAS_SIGNED_IN_KEY, "true");
    expect(oauthSetActive).toHaveBeenCalledWith({ session: "sess_g1" });
  });

  test("dismissing the browser stays silent — no error notice for a normal cancel", async () => {
    await renderReturningUser(false);
    startOAuthFlowMock.mockResolvedValueOnce({ authSessionResult: { type: "dismiss" } });

    fireEvent.press(screen.getByText("Continue with Google"));

    await waitFor(() => expect(startOAuthFlowMock).toHaveBeenCalled());
    expect(screen.queryByText(/didn.t complete/)).not.toBeOnTheScreen();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  test("a stalled flow (no session, no cancel) shows a visible notice", async () => {
    await renderReturningUser(false);
    startOAuthFlowMock.mockResolvedValueOnce({});

    fireEvent.press(screen.getByText("Continue with Google"));

    await waitFor(() =>
      expect(screen.getByText("Google sign-in didn't complete. Please try again.")).toBeOnTheScreen()
    );
  });

  test("a thrown error surfaces Clerk's own message", async () => {
    await renderReturningUser(false);
    startOAuthFlowMock.mockRejectedValueOnce({ errors: [{ message: "redirect url not authorized" }] });

    fireEvent.press(screen.getByText("Continue with Google"));

    await waitFor(() => expect(screen.getByText("redirect url not authorized")).toBeOnTheScreen());
  });
});

describe("Apple sign-in", () => {
  test("unavailable device shows a notice and never calls signInAsync", async () => {
    await renderReturningUser(false);
    isAvailableAsync.mockResolvedValueOnce(false);

    fireEvent.press(screen.getByText("Continue with Apple"));

    await waitFor(() =>
      expect(screen.getByText("Sign in with Apple is not available on this device.")).toBeOnTheScreen()
    );
    expect(signInAsync).not.toHaveBeenCalled();
  });

  test("direct complete status activates the session and navigates home", async () => {
    await renderReturningUser(false);
    signInAsync.mockResolvedValueOnce({ identityToken: "tok_1" });
    signInMock.create.mockResolvedValueOnce({ status: "complete", createdSessionId: "sess_a1" });

    fireEvent.press(screen.getByText("Continue with Apple"));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/"));
    expect(signInMock.create).toHaveBeenCalledWith({
      strategy: "oauth_token_apple",
      token: "tok_1",
    });
    expect(setActiveMock).toHaveBeenCalledWith({ session: "sess_a1" });
  });

  test("transferable status links the identity via signUp and completes sign-in", async () => {
    await renderReturningUser(false);
    signInAsync.mockResolvedValueOnce({ identityToken: "tok_2" });
    signInMock.create.mockResolvedValueOnce({
      status: "transferable",
      firstFactorVerification: { status: "transferable" },
    });
    signUpMock.create.mockResolvedValueOnce({ status: "complete", createdSessionId: "sess_a2" });

    fireEvent.press(screen.getByText("Continue with Apple"));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/"));
    expect(signUpMock.create).toHaveBeenCalledWith({ transfer: true });
    expect(setSignUpActiveMock).toHaveBeenCalledWith({ session: "sess_a2" });
  });

  test("external_account_not_found falls back to sign-up and completes", async () => {
    await renderReturningUser(false);
    signInAsync.mockResolvedValueOnce({
      identityToken: "tok_3",
      fullName: { givenName: "Ada", familyName: "Lovelace" },
    });
    signInMock.create.mockRejectedValueOnce({ errors: [{ code: "external_account_not_found" }] });
    signUpMock.create.mockResolvedValueOnce({ status: "complete", createdSessionId: "sess_a3" });

    fireEvent.press(screen.getByText("Continue with Apple"));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/"));
    expect(signUpMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy: "oauth_token_apple",
        token: "tok_3",
        firstName: "Ada",
        lastName: "Lovelace",
      })
    );
    expect(setSignUpActiveMock).toHaveBeenCalledWith({ session: "sess_a3" });
  });

  test("missing_requirements never navigates without a session", async () => {
    await renderReturningUser(false);
    signInAsync.mockResolvedValueOnce({ identityToken: "tok_mr" });
    signInMock.create.mockResolvedValueOnce({
      status: "needs_identifier",
      firstFactorVerification: { status: "transferable" },
    });
    signUpMock.create.mockResolvedValueOnce({ status: "missing_requirements", missingFields: ["first_name"] });

    fireEvent.press(screen.getByText("Continue with Apple"));

    await waitFor(() =>
      expect(
        screen.getByText("Apple sign-up did not complete (status: missing_requirements; missing: first_name).")
      ).toBeOnTheScreen()
    );
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(setActiveMock).not.toHaveBeenCalled();
    expect(setSignUpActiveMock).not.toHaveBeenCalled();
  });

  test("a cancelled system dialog produces no error notice", async () => {
    await renderReturningUser(false);
    signInAsync.mockRejectedValueOnce({ code: "ERR_REQUEST_CANCELED" });

    fireEvent.press(screen.getByText("Continue with Apple"));

    await waitFor(() => expect(signInAsync).toHaveBeenCalled());
    expect(screen.queryByText(/Apple sign-in failed/)).not.toBeOnTheScreen();
  });

  test("an unrecognized Apple error code shows the mapped message", async () => {
    await renderReturningUser(false);
    signInAsync.mockRejectedValueOnce({ code: "ERR_REQUEST_UNKNOWN" });

    fireEvent.press(screen.getByText("Continue with Apple"));

    await waitFor(() =>
      expect(
        screen.getByText(
          "Apple sign-in failed. Make sure you're signed into an Apple ID on this device. (ERR_REQUEST_UNKNOWN)"
        )
      ).toBeOnTheScreen()
    );
  });
});

// Clerk Device Trust demands an emailed code on every new device. App
// Review signs in on a clean iPad and can't read the demo inbox, so for the
// one configured review account the app asks the backend for a single-use
// sign-in ticket instead. Everyone else keeps the emailed-code step.
describe("App Review demo account on a new device", () => {
  const deviceTrustAttempt = (overrides = {}) => ({
    status: "needs_second_factor",
    supportedSecondFactors: [{ strategy: "email_code", emailAddressId: "idn_1" }],
    prepareSecondFactor: jest.fn().mockResolvedValue({}),
    ...overrides,
  });

  async function submit(emailAddress, password) {
    fireEvent.changeText(screen.getByPlaceholderText("Enter your email address"), emailAddress);
    fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), password);
    fireEvent.press(screen.getByText("Continue"));
  }

  test("redeems a backend ticket, activates the session and goes home with no code prompt", async () => {
    await renderReturningUser(false);
    const attempt = deviceTrustAttempt();
    signInMock.create
      .mockResolvedValueOnce(attempt)
      .mockResolvedValueOnce({ status: "complete", createdSessionId: "sess_review" });
    apiMocks.post.mockResolvedValueOnce({ ticket: "tkt_1" });

    await submit(" Review@Example.com ", "correct-horse");

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/"));
    expect(apiMocks.post).toHaveBeenCalledWith("/auth/app-review/sign-in", {
      email: "Review@Example.com",
      password: "correct-horse",
    });
    expect(signInMock.create).toHaveBeenLastCalledWith({ strategy: "ticket", ticket: "tkt_1" });
    expect(setActiveMock).toHaveBeenCalledWith({ session: "sess_review" });
    expect(attempt.prepareSecondFactor).not.toHaveBeenCalled();
  });

  test("if the backend refuses, falls back to the normal emailed-code step", async () => {
    await renderReturningUser(false);
    const attempt = deviceTrustAttempt();
    signInMock.create.mockResolvedValueOnce(attempt);
    apiMocks.post.mockRejectedValueOnce(Object.assign(new Error("HTTP 401"), { response: { status: 401 } }));

    await submit("review@example.com", "wrong");

    await waitFor(() => expect(screen.getByText("Verify it's you")).toBeOnTheScreen());
    expect(attempt.prepareSecondFactor).toHaveBeenCalledWith({ strategy: "email_code" });
    expect(setActiveMock).not.toHaveBeenCalled();
  });

  test("any other account never calls the review endpoint", async () => {
    await renderReturningUser(false);
    signInMock.create.mockResolvedValueOnce(deviceTrustAttempt());

    await submit("someone@else.com", "hunter2");

    await waitFor(() => expect(screen.getByText("Verify it's you")).toBeOnTheScreen());
    expect(apiMocks.post).not.toHaveBeenCalled();
  });

  test("a device Clerk already trusts signs the review account in directly, as before", async () => {
    await renderReturningUser(false);
    signInMock.create.mockResolvedValueOnce({ status: "complete", createdSessionId: "sess_known" });

    await submit("review@example.com", "correct-horse");

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/"));
    expect(apiMocks.post).not.toHaveBeenCalled();
    expect(setActiveMock).toHaveBeenCalledWith({ session: "sess_known" });
  });
});

describe("forgot password", () => {
  test("tapping the link switches to the reset-request screen", async () => {
    await renderReturningUser(false);
    fireEvent.press(screen.getByText("Forgot password?"));
    await waitFor(() => expect(screen.getByText("Reset password")).toBeOnTheScreen());
  });

  test("submitting with no email shows a notice instead of calling Clerk", async () => {
    await renderReturningUser(false);
    fireEvent.press(screen.getByText("Forgot password?"));
    await waitFor(() => expect(screen.getByText("Send reset code")).toBeOnTheScreen());

    fireEvent.press(screen.getByText("Send reset code"));
    await waitFor(() =>
      expect(screen.getByText("Enter the email linked to your account.")).toBeOnTheScreen()
    );
    expect(signInMock.create).not.toHaveBeenCalled();
  });

  test("a valid email prepares the email-code factor and moves to reset-verify", async () => {
    await renderReturningUser(false);
    signInMock.create.mockResolvedValueOnce({
      supportedFirstFactors: [
        { strategy: "reset_password_email_code", emailAddressId: "idn_1" },
      ],
      prepareFirstFactor: jest.fn().mockResolvedValue({}),
    });

    fireEvent.press(screen.getByText("Forgot password?"));
    await waitFor(() => expect(screen.getByText("Send reset code")).toBeOnTheScreen());
    fireEvent.changeText(screen.getByPlaceholderText("Enter your email address"), "a@b.com");
    fireEvent.press(screen.getByText("Send reset code"));

    await waitFor(() => expect(screen.getByText("Create new password")).toBeOnTheScreen());
    expect(screen.getByText("Reset code sent. Check your inbox and continue.")).toBeOnTheScreen();
  });
});

describe("navigation", () => {
  test("the footer link routes to sign-up, not a dead end", async () => {
    await renderReturningUser(false);
    fireEvent.press(screen.getByText("Create account"));
    expect(mockRouter.replace).toHaveBeenCalledWith("/(auth)/sign-up");
  });
});
