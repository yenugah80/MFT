import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export { width, height };

// Scales continuously with screen width instead of a hard phone/tablet
// cutoff — a flat 500pt cap read as a small, off-balance column on a
// 1032pt-wide iPad (or any landscape/large-screen layout) since it never
// grew past that regardless of how much wider the device actually was.
// Below ~535pt this still resolves to 460 (unchanged phone behavior,
// since width:100% already fills up to that cap on any real phone);
// above it, the cap grows with the screen up to 640 so the form stays
// readable as a single column instead of stretching edge to edge.
export const CONTENT_MAX_WIDTH = Math.min(640, Math.max(460, width * 0.86));
export const IS_COMPACT = height <= 760;

// NOTE: AUTH_COLORS is imported by every onboarding screen as well as auth, so
// treat it as append-only — changing a value here silently restyles onboarding.
export const AUTH_COLORS = {
  canvas: "#FFFDF8",
  canvasWarm: "#FFF5E9",
  canvasMint: "#ECF7EC",
  ink: "#07131E",
  primary: "#6B4EFF",
  primaryLight: "#8B6EFF",
  primaryDeep: "#5A3EE0",
  heroDark: "#150B2E",
  text: "#07131E",
  muted: "#67747B",
  line: "rgba(15, 36, 31, 0.12)",
  card: "rgba(255, 255, 255, 0.82)",
  danger: "#A64252",
  dangerBg: "rgba(166, 66, 82, 0.1)",
  success: "#2C7A53",
  successBg: "rgba(44, 122, 83, 0.12)",
  white: "#FFFFFF",
};
