const coffeeTheme = {
  primary: "#8B593E",
  background: "#FFF8F3",
  text: "#4A3428",
  border: "#E5D3B7",
  white: "#FFFFFF",
  textLight: "#9A8478",
  card: "#FFFFFF",
  shadow: "#000000",
};

const forestTheme = {
  primary: "#2E7D32",
  background: "#E8F5E9",
  text: "#1B5E20",
  border: "#C8E6C9",
  white: "#FFFFFF",
  textLight: "#66BB6A",
  card: "#FFFFFF",
  shadow: "#000000",
};

const purpleTheme = {
  primary: "#6A1B9A",
  background: "#F3E5F5",
  text: "#4A148C",
  border: "#D1C4E9",
  white: "#FFFFFF",
  textLight: "#BA68C8",
  card: "#FFFFFF",
  shadow: "#000000",
};

const vibrantPurpleTheme = {
  primary: "#7F00FF", // Electric Violet - Main CTAs, high energy actions
  background: "#F5F0FF", // Very light pale lavender - Main page background
  text: "#330066", // Deep Indigo - Primary readable text
  border: "#B97CFB", // Medium light purple for dividers
  white: "#FFFFFF", // Standard white
  textLight: "#AC9BFF", // Lighter purple for secondary info or links
  card: "#FFFFFF", // Clean white for content cards
  shadow: "#4B0082", // A deep indigo shadow for depth
  accent: "#FFDC00", // A sharp, complementary yellow accent for alerts/notifications
};

const vibrantSunsetTheme = {
  primary: "#FF4500", // Bright orange-red
  background: "#FFF8F0", // Off-white/cream
  text: "#4B0082", // Indigo
  border: "#F0BC68",
  white: "#FFFFFF",
  textLight: "#FFB6A3",
  card: "#FFFFFF",
  shadow: "#000000",
  accent: "#C04CC5", // A magenta accent
};

const oceanTheme = {
  primary: "#0277BD",
  background: "#E1F5FE",
  text: "#01579B",
  border: "#B3E5FC",
  white: "#FFFFFF",
  textLight: "#4FC3F7",
  card: "#FFFFFF",
  shadow: "#000000",
};

const sunsetTheme = {
  primary: "#FF7E67",
  background: "#FFF3F0",
  text: "#2C1810",
  border: "#FFD5CC",
  white: "#FFFFFF",
  textLight: "#FFA494",
  card: "#FFFFFF",
  shadow: "#000000",
};

const mintTheme = {
  primary: "#00B5B5",
  background: "#E8F6F6",
  text: "#006666",
  border: "#B2E8E8",
  white: "#FFFFFF",
  textLight: "#66D9D9",
  card: "#FFFFFF",
  shadow: "#000000",
};

const midnightTheme = {
  primary: "#2C3E50",
  background: "#F4F6F7",
  text: "#1A2530",
  border: "#D5D8DC",
  white: "#FFFFFF",
  textLight: "#7F8C8D",
  card: "#FFFFFF",
  shadow: "#000000",
};

const roseGoldTheme = {
  primary: "#E0BFB8",
  background: "#FDF6F5",
  text: "#4A3B38",
  border: "#F2D9D5",
  white: "#FFFFFF",
  textLight: "#C9A9A6",
  card: "#FFFFFF",
  shadow: "#000000",
};
const farmersMarketTheme = {
  primary: "#4B7F52", // A deep, organic green (like fresh basil)
  background: "#FFF8E1", // A warm, off-white/cream (like parchment)
  text: "#39445B", // A dark slate gray (for strong readability)
  border: "#B0BEC5", // A light, cool gray
  white: "#FFFFFF", // Standard White
  // Accent colors inspired by fresh produce
  tomatoRed: "#E53935",
  sunnyYellow: "#FFD600",
  pumpkinOrange: "#FB8C00",
  auberginePurple: "#8E24AA",
  shadow: "#000000",
};


const aqueductAqua = {
  primary: "#00BCD4", // Bright Cyan/Aqua - Highlighting actions
  background: "#E0F7FA", // Very Light Cyan - Main background
  text: "#00796B", // Dark Teal - Primary text for contrast
  border: "#B2EBF2", // Light border
  white: "#FFFFFF", // Standard White
  textLight: "#4DD0E1", // Medium Aqua - Secondary text/links
  card: "#FFFFFF", // White cards for depth
  shadow: "#000000", // Standard shadow
  accent: "#FF9800", // A contrasting Orange accent for alerts or urgent CTAs
};

const electricIndigoTheme = {
  primary: "#3D5AFE",    // Vibrant Electric Blue/Indigo
  background: "#E8EAF6", // Very Pale Indigo
  text: "#1A237E",       // Deep Navy
  border: "#9FA8DA",     // Soft Periwinkle
  white: "#FFFFFF",
  textLight: "#536DFE",  // Bright Indigo Accent
  card: "#FFFFFF",
  shadow: "#000000",
};

const berryCrushTheme = {
  primary: "#C2185B",    // Deep Raspberry
  background: "#FCE4EC", // Pale Berry Mist
  text: "#880E4F",       // Dark Magenta
  border: "#F48FB1",     // Bubblegum Pink
  white: "#FFFFFF",
  textLight: "#E91E63",  // Vibrant Pink
  card: "#FFFFFF",
  shadow: "#000000",
};

const solarFlareTheme = {
  primary: "#FFB300",    // Vibrant Amber/Gold
  background: "#fdfdfdff", // Warm Cream
  text: "#540384ff",       // Dark Orange-Gold
  border: "#faf0f0ff",     // Soft Yellow
  white: "#FFFFFF",
  textLight: "#a53f04ff",  // Bright Sunflower
  card: "#FFFFFF",
  shadow: "#000000",
};

export const THEMES = {
  coffee: coffeeTheme,
  forest: forestTheme,
  purple: purpleTheme,
  ocean: oceanTheme,
  vibrantSunset: vibrantSunsetTheme,
  sunset: sunsetTheme,
  mint: mintTheme,
  midnight: midnightTheme,
  roseGold: roseGoldTheme,
  aqueductAqua: aqueductAqua,
  farmersMarket: farmersMarketTheme,
  vibrantPurple: vibrantPurpleTheme,
  electricIndigo: electricIndigoTheme,
  berryCrush: berryCrushTheme,
  solarFlare: solarFlareTheme,
};

// 👇 change this to switch theme
export const COLORS = THEMES.solarFlare;