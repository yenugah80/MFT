import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

// Static layout styles used across auth screens
export const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageContainer: {
    width: "100%",
    alignItems: "center",
    overflow: "hidden",
    paddingTop: 60,
  },
  image: {
    width: "200%",
    height: 200,
    maxHeight: 240,
  },
  formContainer: {
    marginTop: 20,
    marginHorizontal: 18,
    backgroundColor: "rgba(254, 248, 253, 0.98)",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  inputContainer: {
    marginBottom: 14,
    position: "relative",
  },
  textInput: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: 12,
    padding: 8,
  },
  linkContainer: {
    marginTop: 16,
    alignItems: "center",
  },
  linkText: {
    color: "#6B7280",
    fontSize: 15,
  },
  link: {
    color: "#7B5DB8",
    fontWeight: "600",
  },
  authButton: {
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  title: {
    fontSize: 42,
    lineHeight: 40,
    fontWeight: "700",
    color: "#140b17ff",
    textAlign: "center",
    marginTop: 20,
  },
});

// Factory that returns theme-aware styles (used by `useTheme`)
export function createAuthStyles(colors = {}) {
  return {
    title: {
      fontSize: 32,
      lineHeight: 40,
      fontWeight: "700",
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
      fontSize: 16,
    },
    link: {
      color: colors.accent || "#7B5DB8",
      fontWeight: "600",
    },
    linkText: {
      color: colors.muted || "#6B7280",
    },
    gradient: colors.gradient || ["rgba(208, 151, 212, 1)", "#FF884B", "#9be0e4ff"],
  };
}

export default authStyles;
