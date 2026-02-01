import { StyleSheet } from "react-native";
import { TYPOGRAPHY } from '../../constants/premiumTheme';

// Clean minimal white theme
const MINIMAL_COLORS = {
  background: '#FFFFFF',
  card: '#FFFFFF',
  primary: '#1F2937', // Charcoal for button
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  inputBg: '#F9FAFB',
};

// Static layout styles used across auth screens
export const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MINIMAL_COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  imageContainer: {
    width: "100%",
    alignItems: "center",
    overflow: "hidden",
    paddingTop: 80,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: MINIMAL_COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  formContainer: {
    marginTop: 32,
  },
  inputContainer: {
    marginBottom: 16,
    position: "relative",
  },
  textInput: {
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: MINIMAL_COLORS.inputBg,
    borderWidth: 1,
    borderColor: MINIMAL_COLORS.border,
    fontSize: 16,
    color: MINIMAL_COLORS.text,
  },
  eyeButton: {
    position: "absolute",
    right: 16,
    top: 16,
    padding: 4,
  },
  linkContainer: {
    marginTop: 24,
    alignItems: "center",
  },
  linkText: {
    color: MINIMAL_COLORS.textSecondary,
    fontSize: 15,
  },
  link: {
    color: MINIMAL_COLORS.primary,
    fontWeight: "600",
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  authButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: MINIMAL_COLORS.primary,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontFamily: TYPOGRAPHY.family.semibold,
    fontSize: 16,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "800",
    fontFamily: TYPOGRAPHY.family.bold,
    color: MINIMAL_COLORS.text,
    textAlign: "center",
    marginTop: 8,
  },
});

// Factory that returns theme-aware styles (used by `useTheme`)
export function createAuthStyles(colors = {}) {
  return {
    title: {
      fontSize: 32,
      lineHeight: 40,
      fontWeight: "700",
      fontFamily: TYPOGRAPHY.family.bold,
      color: colors.text || "#6a7b9fff",
      textAlign: "center",
      marginTop: 20,
    },
    subtitle: {
      fontSize: 14,
      color: colors.muted || "#6B7280",
      textAlign: "center",
      marginTop: 8,
    },
    textInput: {
      height: 52,
      borderRadius: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.card || "rgba(255,255,255,0.98)",
      borderWidth: 1,
      borderColor: colors.inputBorder || "rgba(0,0,0,0.06)",
      color: colors.text || "#111827",
    },
    authButton: {
      height: 56,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    buttonText: {
      color: "#fff",
      fontWeight: "700",
      fontFamily: TYPOGRAPHY.family.bold,
      fontSize: 16,
    },
    link: {
      color: colors.accent || "#7B5DB8",
      fontWeight: "600",
      fontFamily: TYPOGRAPHY.family.semibold,
    },
    linkText: {
      color: colors.muted || "#6B7280",
    },
    gradient: colors.gradient || ["rgba(208, 151, 212, 1)", "#FF884B", "#9be0e4ff"],
  };
}

export default authStyles;
