import Constants from "expo-constants";

/**
 * The App Store review demo account (app.json → expo.extra.appReviewEmail).
 *
 * This only decides whether the app *asks* the backend for a review sign-in
 * ticket. It grants nothing: the backend independently checks the email
 * against its own APP_REVIEW_EMAIL and re-verifies the password with Clerk.
 * The password is never stored in the app or the repository.
 */
export function isAppReviewAccount(identifier) {
  const reviewEmail = Constants.expoConfig?.extra?.appReviewEmail;
  if (!reviewEmail || typeof identifier !== "string") return false;
  return identifier.trim().toLowerCase() === reviewEmail.trim().toLowerCase();
}
