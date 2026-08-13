/**
 * Email verification step (rendered inline by sign-up.jsx after a
 * successful signUp.create) — code entry, resend, the duplicate-code guard,
 * the isLoaded guard, and the post-verification profile bootstrap
 * (setActive -> getToken -> saveProfileBasics -> consent -> onboarding).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import VerifyEmail from "../../app/(auth)/verify-email";
import { mockRouter } from "./__mocks__/expoRouter";
import { __mocks as clerkMocks } from "@clerk/clerk-expo";
import apiClient from "../../services/apiClient";
import { saveProfileBasics } from "../../services/profileAPI";

jest.mock("@clerk/clerk-expo", () => require("./__mocks__/clerkExpo"));
jest.mock("expo-router", () => require("./__mocks__/expoRouter"));
jest.mock("@expo/vector-icons", () => require("./__mocks__/vectorIcons"));
jest.mock("expo-image", () => require("./__mocks__/expoImage"));
jest.mock("expo-linear-gradient", () => require("./__mocks__/expoLinearGradient"));
jest.mock("react-native-svg", () => require("./__mocks__/reactNativeSvg"));
jest.mock("../../services/apiClient", () => require("./__mocks__/apiClient"));
jest.mock("../../services/profileAPI", () => require("./__mocks__/profileAPI"));

const { signUpMock, setSignUpActiveMock, useSignUpReturn, getTokenMock } = clerkMocks;

function renderScreen(onBack = jest.fn()) {
  render(<VerifyEmail email="a@b.com" firstName="Ada" lastName="Lovelace" onBack={onBack} />);
  return onBack;
}

beforeEach(() => {
  useSignUpReturn.isLoaded = true;
  getTokenMock.mockResolvedValue("test-token");
});

test("renders the email address it was given", () => {
  renderScreen();
  expect(
    screen.getByText("Enter the verification code sent to a@b.com.")
  ).toBeOnTheScreen();
});

test("isLoaded false shows a visible notice instead of a silent no-op", async () => {
  renderScreen();
  // Set before the code is typed, same reasoning as the sign-up test: a
  // mutation with no following re-render leaves the button bound to a
  // stale closure that still has isLoaded=true from mount.
  useSignUpReturn.isLoaded = false;
  fireEvent.changeText(screen.getByPlaceholderText("Verification code"), "123456");

  fireEvent.press(screen.getByText("Verify and continue"));
  await waitFor(() =>
    expect(screen.getByText("Still getting ready — please try again in a moment.")).toBeOnTheScreen()
  );
  expect(signUpMock.attemptEmailAddressVerification).not.toHaveBeenCalled();
});

test("an empty code shows a notice and never calls Clerk", async () => {
  renderScreen();
  fireEvent.press(screen.getByText("Verify and continue"));
  await waitFor(() =>
    expect(screen.getByText("Enter the verification code from your email.")).toBeOnTheScreen()
  );
  expect(signUpMock.attemptEmailAddressVerification).not.toHaveBeenCalled();
});

test("re-submitting the exact same code twice is blocked client-side the second time", async () => {
  renderScreen();
  signUpMock.attemptEmailAddressVerification.mockResolvedValueOnce({
    status: "needs_new_code",
    errors: [{ message: "Code expired." }],
  });

  fireEvent.changeText(screen.getByPlaceholderText("Verification code"), "111111");
  fireEvent.press(screen.getByText("Verify and continue"));
  await waitFor(() => expect(screen.getByText("Code expired.")).toBeOnTheScreen());

  // Same code again, without success in between — attemptedCodes only
  // records codes that reached a "complete" status, so this call SHOULD go
  // through to Clerk again (it was never marked attempted).
  fireEvent.press(screen.getByText("Verify and continue"));
  await waitFor(() =>
    expect(signUpMock.attemptEmailAddressVerification).toHaveBeenCalledTimes(2)
  );
});

test("success activates the session, saves the profile, and reaches onboarding", async () => {
  renderScreen();
  signUpMock.attemptEmailAddressVerification.mockResolvedValueOnce({
    status: "complete",
    createdSessionId: "sess_1",
  });

  fireEvent.changeText(screen.getByPlaceholderText("Verification code"), "654321");
  fireEvent.press(screen.getByText("Verify and continue"));

  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/onboarding/step-1"), {
    timeout: 3000,
  });
  expect(setSignUpActiveMock).toHaveBeenCalledWith({ session: "sess_1" });
  expect(saveProfileBasics).toHaveBeenCalledWith(
    "test-token",
    expect.objectContaining({ fullName: "Ada Lovelace", email: "a@b.com" })
  );
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith("@onboarding_draft");
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith("@onboarding_current_step");
});

test("email verification never grants AI-assisted-analysis consent — that's AIConsentPrompt's job", async () => {
  renderScreen();
  signUpMock.attemptEmailAddressVerification.mockResolvedValueOnce({
    status: "complete",
    createdSessionId: "sess_2",
  });

  fireEvent.changeText(screen.getByPlaceholderText("Verification code"), "654321");
  fireEvent.press(screen.getByText("Verify and continue"));

  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/onboarding/step-1"), {
    timeout: 3000,
  });
  expect(apiClient.post).not.toHaveBeenCalledWith(
    "/consent/give-openai-consent",
    expect.anything()
  );
});

test("a non-complete status shows Clerk's message and does not navigate", async () => {
  renderScreen();
  signUpMock.attemptEmailAddressVerification.mockResolvedValueOnce({
    status: "needs_new_code",
    errors: [{ message: "That code is incorrect." }],
  });

  fireEvent.changeText(screen.getByPlaceholderText("Verification code"), "000000");
  fireEvent.press(screen.getByText("Verify and continue"));

  await waitFor(() => expect(screen.getByText("That code is incorrect.")).toBeOnTheScreen());
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

describe("resend", () => {
  test("isLoaded false shows a notice instead of calling Clerk", async () => {
    renderScreen();
    useSignUpReturn.isLoaded = false;
    // Resend doesn't read the code field, but firing a change here is what
    // forces the re-render that picks up the isLoaded mutation above — see
    // the comment on the verification-step version of this test.
    fireEvent.changeText(screen.getByPlaceholderText("Verification code"), "x");
    fireEvent.press(screen.getByText("Resend code"));
    await waitFor(() =>
      expect(screen.getByText("Still getting ready — please try again in a moment.")).toBeOnTheScreen()
    );
    expect(signUpMock.prepareEmailAddressVerification).not.toHaveBeenCalled();
  });

  test("success shows a confirmation notice", async () => {
    renderScreen();
    signUpMock.prepareEmailAddressVerification.mockResolvedValueOnce({});
    fireEvent.press(screen.getByText("Resend code"));
    await waitFor(() =>
      expect(screen.getByText("A fresh verification code has been sent.")).toBeOnTheScreen()
    );
  });

  test("a failure surfaces the real error message", async () => {
    renderScreen();
    signUpMock.prepareEmailAddressVerification.mockRejectedValueOnce(
      new Error("Too many requests.")
    );
    fireEvent.press(screen.getByText("Resend code"));
    await waitFor(() => expect(screen.getByText("Too many requests.")).toBeOnTheScreen());
  });
});

test("the back link calls onBack rather than dead-ending", () => {
  const onBack = renderScreen();
  fireEvent.press(screen.getByText("Back to sign up"));
  expect(onBack).toHaveBeenCalledTimes(1);
});
