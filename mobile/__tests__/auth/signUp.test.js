/**
 * Sign Up screen ("Create Account") — welcome step, the clickwrap ToS/Privacy
 * disclaimer (DoorDash/Yelp pattern: tapping Continue/Apple/Google IS the
 * agreement, no checkbox), plus Google/Apple OAuth and the isLoaded guard.
 *
 * AI-assisted analysis consent is deliberately NOT part of this screen or
 * this file — GDPR Art. 9 requires explicit, un-pre-ticked consent for that
 * health-adjacent data specifically, which a bundled "by continuing" click
 * doesn't provide. That consent is asked for separately by AIConsentPrompt
 * on first app open (components/consent/AIConsentPrompt.jsx), covered in its
 * own test file, not here.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import SignUpScreen from "../../app/(auth)/sign-up";
import { mockRouter } from "./__mocks__/expoRouter";
import { __mocks as clerkMocks } from "@clerk/clerk-expo";
import { __mocks as appleMocks } from "expo-apple-authentication";
import apiClient from "../../services/apiClient";

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
jest.mock("../../services/profileAPI", () => require("./__mocks__/profileAPI"));

const { signUpMock, setSignUpActiveMock, useSignUpReturn, signInMock, setActiveMock } = clerkMocks;
const { startOAuthFlowMock } = clerkMocks;
const { isAvailableAsync, signInAsync } = appleMocks;

async function renderDetailsStep() {
  render(<SignUpScreen />);
  fireEvent.press(screen.getByText("Create Account"));
  await waitFor(() => expect(screen.getByPlaceholderText("First name")).toBeOnTheScreen());
}

function fillEmailPassword(email = "a@b.com", password = "hunter22") {
  fireEvent.changeText(screen.getByPlaceholderText("Enter your email address"), email);
  fireEvent.changeText(screen.getByPlaceholderText("Create a password"), password);
}

beforeEach(() => {
  useSignUpReturn.isLoaded = true;
  isAvailableAsync.mockResolvedValue(true);
});

describe("welcome step", () => {
  test("renders the entry CTA and the sign-in footer link", async () => {
    render(<SignUpScreen />);
    expect(screen.getByText("Create Account")).toBeOnTheScreen();
    expect(screen.getByText("Sign In")).toBeOnTheScreen();
  });

  test("tapping Create Account advances to the details form", async () => {
    render(<SignUpScreen />);
    fireEvent.press(screen.getByText("Create Account"));
    await waitFor(() => expect(screen.getByPlaceholderText("First name")).toBeOnTheScreen());
  });

  test("the sign-in link on welcome routes away, not a dead end", async () => {
    render(<SignUpScreen />);
    fireEvent.press(screen.getByText("Sign In"));
    expect(mockRouter.replace).toHaveBeenCalledWith("/(auth)/sign-in");
  });
});

describe("clickwrap consent disclaimer — no checkbox, no gate", () => {
  test("names all three sign-up methods, not just email", async () => {
    await renderDetailsStep();
    expect(
      screen.getByText(/By continuing with email, Apple, or Google, you agree to our/)
    ).toBeOnTheScreen();
  });

  test("Terms of Service link routes to /terms", async () => {
    await renderDetailsStep();
    fireEvent.press(screen.getByText("Terms of Service"));
    expect(mockRouter.push).toHaveBeenCalledWith("/terms");
  });

  test("Privacy Policy link routes to /privacy", async () => {
    await renderDetailsStep();
    fireEvent.press(screen.getByText("Privacy Policy"));
    expect(mockRouter.push).toHaveBeenCalledWith("/privacy");
  });

  test("there is no checkbox and no pre-submit gate — Continue reaches Clerk on the first tap", async () => {
    await renderDetailsStep();
    fillEmailPassword("first-tap@user.com", "hunter22");
    signUpMock.create.mockResolvedValueOnce({});
    signUpMock.prepareEmailAddressVerification.mockResolvedValueOnce({});

    expect(screen.queryByRole("checkbox")).not.toBeOnTheScreen();
    fireEvent.press(screen.getByText("Continue"));

    await waitFor(() => expect(signUpMock.create).toHaveBeenCalled());
  });

  test("sign-up never grants AI-assisted-analysis consent — that's AIConsentPrompt's job, not sign-up's", async () => {
    await renderDetailsStep();
    fillEmailPassword("no-ai-consent@user.com", "hunter22");
    signUpMock.create.mockResolvedValueOnce({});
    signUpMock.prepareEmailAddressVerification.mockResolvedValueOnce({});

    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() => expect(screen.getByText("Check your email")).toBeOnTheScreen());

    expect(apiClient.post).not.toHaveBeenCalledWith(
      "/consent/give-openai-consent",
      expect.anything()
    );
  });
});

describe("email sign-up", () => {
  test("missing fields notice without calling Clerk", async () => {
    await renderDetailsStep();
    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() =>
      expect(screen.getByText("Email and password are required.")).toBeOnTheScreen()
    );
    expect(signUpMock.create).not.toHaveBeenCalled();
  });

  test("isLoaded false shows a visible notice, not a silent no-op", async () => {
    await renderDetailsStep();
    // Set before the remaining state-changing event (fillEmailPassword) so
    // its re-render picks up the new value — mutating this after the last
    // state change would leave the button's onPress bound to a stale
    // closure that still captured isLoaded=true from mount, since
    // fireEvent.press alone doesn't force a re-render.
    useSignUpReturn.isLoaded = false;
    fillEmailPassword();

    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() =>
      expect(screen.getByText("Still getting ready — please try again in a moment.")).toBeOnTheScreen()
    );
    expect(signUpMock.create).not.toHaveBeenCalled();
  });

  test("success prepares email verification and hands off to VerifyEmail", async () => {
    await renderDetailsStep();
    fillEmailPassword("new@user.com", "hunter22");
    signUpMock.create.mockResolvedValueOnce({});
    signUpMock.prepareEmailAddressVerification.mockResolvedValueOnce({});

    fireEvent.press(screen.getByText("Continue"));

    await waitFor(() => expect(screen.getByText("Check your email")).toBeOnTheScreen());
    expect(signUpMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ emailAddress: "new@user.com", password: "hunter22" })
    );
    expect(signUpMock.prepareEmailAddressVerification).toHaveBeenCalledWith({ strategy: "email_code" });
  });

  test("an already-registered email shows the specific notice, not a generic one", async () => {
    await renderDetailsStep();
    fillEmailPassword();
    signUpMock.create.mockRejectedValueOnce({ errors: [{ code: "form_identifier_exists" }] });

    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() =>
      expect(
        screen.getByText("This email is already registered. Please sign in instead.")
      ).toBeOnTheScreen()
    );
  });

  test("a captcha failure shows the specific notice", async () => {
    await renderDetailsStep();
    fillEmailPassword();
    signUpMock.create.mockRejectedValueOnce({ errors: [{ code: "captcha_invalid" }] });

    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() =>
      expect(screen.getByText("Security check failed. Please try again in a moment.")).toBeOnTheScreen()
    );
  });
});

describe("Apple sign-up", () => {
  test("complete status activates and goes to onboarding, on the first tap", async () => {
    await renderDetailsStep();
    signInAsync.mockResolvedValueOnce({ identityToken: "tok_1" });
    signUpMock.create.mockResolvedValueOnce({ status: "complete", createdSessionId: "sess_1" });

    fireEvent.press(screen.getByText("Continue with Apple"));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/onboarding/step-1"));
    expect(setSignUpActiveMock).toHaveBeenCalledWith({ session: "sess_1" });
  });

  test("missing_requirements with no session id still proceeds without activating", async () => {
    await renderDetailsStep();
    signInAsync.mockResolvedValueOnce({ identityToken: "tok_2" });
    signUpMock.create.mockResolvedValueOnce({ status: "missing_requirements", createdSessionId: null });

    fireEvent.press(screen.getByText("Continue with Apple"));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/onboarding/step-1"));
    expect(setSignUpActiveMock).not.toHaveBeenCalled();
  });

  test("transferable identity hands off to sign-in and completes there", async () => {
    await renderDetailsStep();
    signInAsync.mockResolvedValueOnce({ identityToken: "tok_3" });
    signUpMock.create.mockResolvedValueOnce({
      status: "transferable",
      verifications: { externalAccount: { status: "transferable" } },
    });
    signInMock.create.mockResolvedValueOnce({ status: "complete", createdSessionId: "sess_3" });

    fireEvent.press(screen.getByText("Continue with Apple"));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/"));
    expect(signInMock.create).toHaveBeenCalledWith({ transfer: true });
    expect(setActiveMock).toHaveBeenCalledWith({ session: "sess_3" });
  });

  test("cancelling the system dialog produces no error notice", async () => {
    await renderDetailsStep();
    signInAsync.mockRejectedValueOnce({ code: "ERR_REQUEST_CANCELED" });

    fireEvent.press(screen.getByText("Continue with Apple"));

    await waitFor(() => expect(signInAsync).toHaveBeenCalled());
    expect(screen.queryByText(/Apple sign-up failed/)).not.toBeOnTheScreen();
  });
});

describe("Google sign-up", () => {
  test("success activates and goes to onboarding, on the first tap", async () => {
    await renderDetailsStep();
    const oauthSetActive = jest.fn();
    startOAuthFlowMock.mockResolvedValueOnce({ createdSessionId: "sess_g1", setActive: oauthSetActive });

    fireEvent.press(screen.getByText("Continue with Google"));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/onboarding/step-1"));
    expect(oauthSetActive).toHaveBeenCalledWith({ session: "sess_g1" });
  });

  test("dismissing the browser stays silent", async () => {
    await renderDetailsStep();
    startOAuthFlowMock.mockResolvedValueOnce({ authSessionResult: { type: "cancel" } });

    fireEvent.press(screen.getByText("Continue with Google"));

    await waitFor(() => expect(startOAuthFlowMock).toHaveBeenCalled());
    expect(screen.queryByText(/didn.t complete/)).not.toBeOnTheScreen();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  test("a stalled flow shows a visible notice", async () => {
    await renderDetailsStep();
    startOAuthFlowMock.mockResolvedValueOnce({});

    fireEvent.press(screen.getByText("Continue with Google"));

    await waitFor(() =>
      expect(screen.getByText("Google sign-up didn't complete. Please try again.")).toBeOnTheScreen()
    );
  });
});
