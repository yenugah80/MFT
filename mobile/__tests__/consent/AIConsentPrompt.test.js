/**
 * AIConsentPrompt — the one place AI-assisted analysis consent (voice/photo
 * food logging via OpenAI) is ever granted. Sign-up's clickwrap deliberately
 * does NOT cover this (see app/(auth)/sign-up.jsx and its test file) because
 * GDPR Art. 9 requires explicit, un-pre-ticked consent for health-adjacent
 * data specifically. This file is what actually proves that promise holds:
 * the prompt only shows for accounts the server has genuinely never asked,
 * "Agree" and "Not now" are both real un-pre-ticked choices, and a network
 * failure never gets silently treated as an answer.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import AIConsentPrompt from "../../components/consent/AIConsentPrompt";
import apiClient from "../../services/apiClient";
import { getItem, setItem } from "../../utils/storage";
import { mockRouter } from "./__mocks__/aiConsentRouter";

// Mock filenames here are prefixed `aiConsent*` deliberately — Jest's Haste
// module map treats every file under any `__mocks__` directory as globally
// named by its basename alone, project-wide, not scoped to its own folder.
// A same-named mock under __tests__/auth/__mocks__/ silently wins or loses
// module resolution project-wide (symptom: everything hangs and times out,
// no error), so these can't reuse the auth suite's mock filenames even
// though several are functionally identical.
jest.mock("../../services/apiClient", () => require("./__mocks__/aiConsentApiClient"));
jest.mock("../../utils/storage", () => require("./__mocks__/storage"));
jest.mock("expo-router", () => require("./__mocks__/aiConsentRouter"));
jest.mock("@expo/vector-icons", () => require("./__mocks__/aiConsentVectorIcons"));
jest.mock("expo-linear-gradient", () => require("./__mocks__/aiConsentLinearGradient"));
jest.mock("expo-haptics", () => require("./__mocks__/aiConsentHaptics"));

const SEEN_KEY = "@mft:ai_consent_prompt_seen";

function neverAsked() {
  apiClient.get.mockResolvedValueOnce({ consent: { hasBeenAsked: false, hasConsent: false } });
}

describe("visibility — only for accounts genuinely never asked", () => {
  test("shows when not seen locally and the server reports hasBeenAsked: false", async () => {
    neverAsked();
    render(<AIConsentPrompt />);

    await waitFor(() => expect(screen.getByText("Turn On Smart Analysis")).toBeOnTheScreen());
    expect(apiClient.get).toHaveBeenCalledWith("/consent/status");
  });

  test("stays hidden when already seen on this device — never even calls the server", async () => {
    getItem.mockResolvedValueOnce(true);
    render(<AIConsentPrompt />);

    // Give the effect's microtask a turn, then assert the negative — there's
    // no positive UI change to waitFor when the component correctly does
    // nothing, so this is the honest way to prove the short-circuit.
    await waitFor(() => expect(getItem).toHaveBeenCalledWith(SEEN_KEY));
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(screen.queryByText("Turn On Smart Analysis")).not.toBeOnTheScreen();
  });

  test("stays hidden when the server reports hasBeenAsked: true (already consented or declined)", async () => {
    apiClient.get.mockResolvedValueOnce({ consent: { hasBeenAsked: true, hasConsent: true } });
    render(<AIConsentPrompt />);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/consent/status"));
    expect(screen.queryByText("Turn On Smart Analysis")).not.toBeOnTheScreen();
  });

  test("a network failure stays silent rather than showing on bad data", async () => {
    apiClient.get.mockRejectedValueOnce(new Error("Network request failed"));
    render(<AIConsentPrompt />);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/consent/status"));
    expect(screen.queryByText("Turn On Smart Analysis")).not.toBeOnTheScreen();
  });
});

describe("Agree & Turn On", () => {
  test("gives haptic feedback, posts explicit consent, and dismisses on success", async () => {
    neverAsked();
    render(<AIConsentPrompt />);
    await waitFor(() => expect(screen.getByText("Turn On Smart Analysis")).toBeOnTheScreen());

    fireEvent.press(screen.getByText("Agree & Turn On"));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        "/consent/give-openai-consent",
        { understand: true, purpose: "ai-consent-prompt" }
      )
    );
    await waitFor(() => expect(setItem).toHaveBeenCalledWith(SEEN_KEY, "true"));
    await waitFor(() => expect(screen.queryByText("Turn On Smart Analysis")).not.toBeOnTheScreen());
  });

  test("a failed save dismisses without marking the local flag seen, so it re-asks next launch", async () => {
    neverAsked();
    apiClient.post.mockRejectedValueOnce(new Error("Network request failed"));
    render(<AIConsentPrompt />);
    await waitFor(() => expect(screen.getByText("Turn On Smart Analysis")).toBeOnTheScreen());

    fireEvent.press(screen.getByText("Agree & Turn On"));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText("Turn On Smart Analysis")).not.toBeOnTheScreen());
    // The whole point of not reusing dismiss() on the failure path: a
    // transient network error must not look like an answered prompt.
    expect(setItem).not.toHaveBeenCalledWith(SEEN_KEY, "true");
  });
});

describe("Not now", () => {
  test("marks the prompt seen and routes to where the setting actually lives", async () => {
    neverAsked();
    render(<AIConsentPrompt />);
    await waitFor(() => expect(screen.getByText("Turn On Smart Analysis")).toBeOnTheScreen());

    fireEvent.press(screen.getByText("Not now"));

    await waitFor(() => expect(setItem).toHaveBeenCalledWith(SEEN_KEY, "true"));
    expect(mockRouter.push).toHaveBeenCalledWith("/profile/privacy");
    // Never grants consent just because the user looked and passed —
    // "Not now" must not silently become "yes".
    expect(apiClient.post).not.toHaveBeenCalledWith(
      "/consent/give-openai-consent",
      expect.anything()
    );
  });
});

describe("fine-print links", () => {
  test("Terms of Service routes to /terms", async () => {
    neverAsked();
    render(<AIConsentPrompt />);
    await waitFor(() => expect(screen.getByText("Turn On Smart Analysis")).toBeOnTheScreen());

    fireEvent.press(screen.getByText("Terms of Service"));
    expect(mockRouter.push).toHaveBeenCalledWith("/terms");
  });

  test("Privacy Policy routes to /privacy", async () => {
    neverAsked();
    render(<AIConsentPrompt />);
    await waitFor(() => expect(screen.getByText("Turn On Smart Analysis")).toBeOnTheScreen());

    fireEvent.press(screen.getByText("Privacy Policy"));
    expect(mockRouter.push).toHaveBeenCalledWith("/privacy");
  });
});
