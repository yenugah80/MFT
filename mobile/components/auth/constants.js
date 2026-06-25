import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export { width, height };

export const CONTENT_MAX_WIDTH = width >= 768 ? 500 : 460;
export const IS_COMPACT = height <= 760;

export const AUTH_COLORS = {
  canvas: "#FFFDF8",
  canvasWarm: "#FFF5E9",
  canvasMint: "#ECF7EC",
  ink: "#07131E",
  green: "#06452D",
  greenDeep: "#031523",
  greenSoft: "#2C7A53",
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
