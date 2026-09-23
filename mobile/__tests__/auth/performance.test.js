/**
 * Performance regression guards for the auth screens, not device-level
 * benchmarks (no Profiler wall-clock assertions, no Detox/Maestro frame
 * timing — those need a real device and aren't wired up here). What this
 * file actually checks:
 *   1. Rapid double-tap on a submit button fires the underlying async call
 *      exactly once, relying on the loading-state guard already built into
 *      PrimaryButton/AppleButton/GoogleButton (disabled={disabled || loading}).
 *      A regression here means duplicate sign-ins, duplicate accounts, or
 *      duplicate OAuth attempts from an impatient double-tap.
 *   2. Typing in a text field doesn't cause a render-count blowup (a proxy
 *      for "no accidental O(n^2) re-render chain wired into onChange").
 *   3. Each screen mounts within a generous smoke budget, to catch a future
 *      change that makes first render pathologically expensive (e.g. sync
 *      work moved into the component body). The budget is intentionally
 *      loose — this is not a target to optimize toward, just a tripwire.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Profiler } from "react";
import SignInScreen from "../../app/(auth)/sign-in";
import SignUpScreen from "../../app/(auth)/sign-up";
import { __mocks as clerkMocks } from "@clerk/clerk-expo";
import { __mocks as appleMocks } from "expo-apple-authentication";

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

const { signInMock, signUpMock, useSignInReturn, useSignUpReturn, startOAuthFlowMock } = clerkMocks;
const { isAvailableAsync, signInAsync } = appleMocks;

// A promise that never resolves during the test, so we can press a button
// twice while the first call is still "in flight" and observe whether the
// second press was blocked by the loading-state guard.
function pending() {
  return new Promise(() => {});
}

beforeEach(() => {
  useSignInReturn.isLoaded = true;
  useSignUpReturn.isLoaded = true;
  isAvailableAsync.mockResolvedValue(true);
});

describe("double-tap guards (one underlying call per submit, not per press)", () => {
  test("email sign-in: two rapid taps on Continue only call signIn.create once", async () => {
    signInMock.create.mockReturnValue(pending());
    render(<SignInScreen />);
    await waitFor(() => expect(screen.getByPlaceholderText("Enter your email address")).toBeOnTheScreen());

    fireEvent.changeText(screen.getByPlaceholderText("Enter your email address"), "a@b.com");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), "hunter22");

    const continueButton = screen.getByText("Continue");
    fireEvent.press(continueButton);
    fireEvent.press(continueButton);
    fireEvent.press(continueButton);

    expect(signInMock.create).toHaveBeenCalledTimes(1);
  });

  test("Apple sign-in: two rapid taps only call signInAsync once", async () => {
    signInAsync.mockReturnValue(pending());
    render(<SignInScreen />);
    await waitFor(() => expect(screen.getByText("Continue with Apple")).toBeOnTheScreen());

    const appleButton = screen.getByText("Continue with Apple");
    // The first press only synchronously invokes isAvailableAsync(); signInAsync
    // isn't called until that promise resolves on a later microtask, so the
    // "rapid second tap" has to land after that microtask flushes, same as a
    // real double-tap would — otherwise this would just be racing setup, not
    // testing the loading-state guard.
    fireEvent.press(appleButton);
    await waitFor(() => expect(signInAsync).toHaveBeenCalledTimes(1));
    fireEvent.press(appleButton);

    expect(signInAsync).toHaveBeenCalledTimes(1);
  });

  test("Google sign-in: two rapid taps only call startOAuthFlow once", async () => {
    startOAuthFlowMock.mockReturnValue(pending());
    render(<SignInScreen />);
    await waitFor(() => expect(screen.getByText("Continue with Google")).toBeOnTheScreen());

    const googleButton = screen.getByText("Continue with Google");
    fireEvent.press(googleButton);
    fireEvent.press(googleButton);

    expect(startOAuthFlowMock).toHaveBeenCalledTimes(1);
  });

  test("email sign-up: two rapid taps on Continue only call signUp.create once", async () => {
    signUpMock.create.mockReturnValue(pending());
    render(<SignUpScreen />);
    fireEvent.press(screen.getByText("Create Account"));
    await waitFor(() => expect(screen.getByPlaceholderText("First name")).toBeOnTheScreen());

    fireEvent.changeText(screen.getByPlaceholderText("First name"), "Ada");
    fireEvent.changeText(screen.getByPlaceholderText("Last name"), "Lovelace");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your email address"), "a@b.com");
    fireEvent.changeText(screen.getByPlaceholderText("Create a password"), "hunter22");

    const continueButton = screen.getByText("Continue");
    fireEvent.press(continueButton);
    fireEvent.press(continueButton);

    expect(signUpMock.create).toHaveBeenCalledTimes(1);
  });
});

describe("re-render discipline", () => {
  test("typing in the sign-in email field doesn't trigger a render blowup", async () => {
    render(<SignInScreen />);
    await waitFor(() => expect(screen.getByPlaceholderText("Enter your email address")).toBeOnTheScreen());

    let renderCount = 0;
    const onRender = () => {
      renderCount += 1;
    };

    // Wrapping the already-mounted tree in a fresh Profiler wouldn't see its
    // renders, so instead we count renders of a second instance: a mount
    // plus five keystrokes is the interaction being budgeted, not the
    // absolute count from any particular React internals version.
    render(
      <Profiler id="sign-in-email" onRender={onRender}>
        <SignInScreen />
      </Profiler>
    );
    await waitFor(() => expect(screen.getAllByPlaceholderText("Enter your email address").length).toBeGreaterThan(0));
    renderCount = 0;

    const emailInputs = screen.getAllByPlaceholderText("Enter your email address");
    const emailInput = emailInputs[emailInputs.length - 1];
    const word = "ab@cd.com";
    for (const char of word) {
      fireEvent.changeText(emailInput, char);
    }

    // Renders did happen at all (a vacuous 0 would pass the upper-bound
    // check below without actually proving anything).
    expect(renderCount).toBeGreaterThan(0);
    // One render per keystroke is ideal; allow slack for provider/context
    // re-renders without allowing a silent O(keystrokes^2) regression.
    expect(renderCount).toBeLessThanOrEqual(word.length * 2);
  });
});

describe("mount-time smoke budget", () => {
  test("sign-in screen mounts within a generous budget", async () => {
    const start = Date.now();
    render(<SignInScreen />);
    await waitFor(() => expect(screen.getByText("Continue with Apple")).toBeOnTheScreen());
    expect(Date.now() - start).toBeLessThan(3000);
  });

  test("sign-up screen mounts within a generous budget", async () => {
    const start = Date.now();
    render(<SignUpScreen />);
    await waitFor(() => expect(screen.getByText("Create Account")).toBeOnTheScreen());
    expect(Date.now() - start).toBeLessThan(3000);
  });
});
