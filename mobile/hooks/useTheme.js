import { useColorScheme } from "react-native";
import { useMemo } from "react";
import { THEME } from "../assets/styles/theme";
import { createAuthStyles } from "../assets/styles/auth.styles";
import { useFonts as usePoppins, Poppins_600SemiBold } from "@expo-google-fonts/poppins";
import { useFonts as useInter, Inter_400Regular } from "@expo-google-fonts/inter";

export default function useTheme() {
  const scheme = useColorScheme();
  const dark = scheme === "dark";

  const colors = useMemo(() => {
    return dark
      ? {
          bg: THEME.colors.bgDark,
          card: THEME.colors.cardDark,
          text: THEME.colors.textDark,
          muted: THEME.colors.inputBorderDark,
          inputBorder: THEME.colors.inputBorderDark,
          accent: THEME.colors.accent,
          gradient: THEME.colors.primaryGradient,
        }
      : {
          bg: THEME.colors.bgLight,
          card: THEME.colors.cardLight,
          text: THEME.colors.text,
          muted: THEME.colors.textMuted,
          inputBorder: THEME.colors.inputBorder,
          accent: THEME.colors.accent,
          gradient: THEME.colors.primaryGradient,
        };
  }, [dark]);

  const [poppinsLoaded] = usePoppins({ Poppins_600SemiBold });
  const [interLoaded] = useInter({ Inter_400Regular });
  const fontsLoaded = poppinsLoaded && interLoaded;

  const styles = useMemo(() => createAuthStyles(colors), [colors]);

  return { colors, styles, fontsLoaded };
}
