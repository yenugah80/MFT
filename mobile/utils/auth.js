import { useAuth } from "@clerk/clerk-expo";

// This is a helper for non-component code to get the current token
export async function getToken() {
  // In Clerk Expo, you typically use useAuth in a component, but for services, you may need to pass the token down
  // For now, throw if not available
  throw new Error("getToken() must be implemented to return the current user's session token");
}
