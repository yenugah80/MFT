import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Production-safe auth stage logging.
 *
 * Only ever pass non-sensitive details (a status, a Clerk/Apple error code,
 * an HTTP status). Never pass identity tokens, authorization codes,
 * passwords, sign-in tickets, or whole Clerk/Apple payloads.
 */
function deviceContext() {
  return {
    platform: Platform.OS,
    os: String(Platform.Version ?? ""),
    device: Platform.isPad ? "ipad" : Platform.OS === "ios" ? "iphone" : Platform.OS,
    app: Constants.expoConfig?.version,
  };
}

export function logAuthStage(stage, details = {}) {
  console.info(`[Auth] ${stage}`, { ...deviceContext(), ...details });
}

export function logAuthFailure(stage, err, details = {}) {
  console.warn(`[Auth] ${stage}_FAILED`, {
    ...deviceContext(),
    ...details,
    code: err?.code ?? err?.errors?.[0]?.code,
    status: err?.status ?? err?.response?.status,
    clerkStage: err?.stage,
  });
}
