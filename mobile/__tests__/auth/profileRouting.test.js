/**
 * A brand-new account (first Apple/Google/email sign-in) has no profile row,
 * and GET /profile/me answers 404. That must route to onboarding. It used to
 * be retried as a failure and end on "Couldn't load your profile — check
 * your connection", a dead end for every new account entering through "/".
 */
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { __mocks as apiMocks } from "../../services/apiClient";
import { useProfile, fetchProfile } from "../../hooks/useProfile";
import { ProfileProvider, useProfileContext } from "../../providers/ProfileProvider";

jest.mock("../../services/apiClient", () => require("./__mocks__/apiClient"));
jest.mock("@clerk/clerk-expo", () => require("./__mocks__/clerkExpo"));
jest.mock("../../hooks/useProfile", () => ({
  ...jest.requireActual("../../hooks/useProfile"),
  useProfile: jest.fn(),
}));

function Probe() {
  const { onboardingComplete, isError } = useProfileContext();
  return <Text>{`onboarding=${String(onboardingComplete)} error=${String(isError)}`}</Text>;
}

const renderWith = (queryState) => {
  useProfile.mockReturnValue({ isFetching: false, error: null, refetch: jest.fn(), ...queryState });
  render(
    <ProfileProvider>
      <Probe />
    </ProfileProvider>
  );
};

describe("fetchProfile", () => {
  test("a 404 (no profile row yet) resolves to null instead of throwing", async () => {
    apiMocks.get.mockRejectedValueOnce(Object.assign(new Error("HTTP 404"), { response: { status: 404 } }));
    await expect(fetchProfile()).resolves.toBeNull();
  });

  test("other failures still throw so the retry/error UI can handle them", async () => {
    const serverError = Object.assign(new Error("HTTP 500"), { response: { status: 500 } });
    apiMocks.get.mockRejectedValueOnce(serverError);
    await expect(fetchProfile()).rejects.toBe(serverError);
  });
});

describe("ProfileProvider onboarding status", () => {
  test("no profile row (null) means onboarding is needed, not loading or error", () => {
    renderWith({ data: null, isLoading: false });
    expect(screen.getByText("onboarding=false error=false")).toBeOnTheScreen();
  });

  test("not fetched yet (undefined) is still loading, so nothing redirects early", () => {
    renderWith({ data: undefined, isLoading: false });
    expect(screen.getByText("onboarding=null error=false")).toBeOnTheScreen();
  });

  test("an existing, completed profile (e.g. the review account) goes to the dashboard", () => {
    renderWith({ data: { onboardingCompletedAt: "2026-08-01T00:00:00Z" }, isLoading: false });
    expect(screen.getByText("onboarding=true error=false")).toBeOnTheScreen();
  });
});
