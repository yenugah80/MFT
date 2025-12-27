/**
 * ThemeProvider - Production-Grade Theme System
 *
 * Features:
 * - System theme detection (iOS/Android dark mode)
 * - Smooth animated transitions
 * - Performance optimized with memoization
 * - Analytics tracking
 * - Persistent preferences
 * - Auto-sync with system option
 *
 * @version 2.0
 */

import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { Appearance, Platform } from 'react-native';
import storage, { STORAGE_KEYS } from '../utils/storage';
import { trackThemeEvent } from '../services/themeAnalytics';

// Import theme constants (no hardcoded values)
import {
  TEXT as LIGHT_TEXT,
  BRAND,
  SURFACES,
  SHADOWS as LIGHT_SHADOWS,
  SEMANTIC,
} from '../constants/premiumTheme';

import {
  DARK_TEXT,
  DARK_BACKGROUNDS,
  VIBRANT,
  GLASS,
  DARK_SHADOWS,
  DARK_GRADIENTS,
} from '../constants/darkPremiumTheme';

// Light theme background gradients
const LIGHT_BACKGROUNDS = {
  warmWellness: {
    colors: ['#FFF9F5', '#F5F3FF', '#FFEEE8'], // Modern pastel mix: warm peach + soft lavender
    animationDuration: 45000, // Slower, more subtle animation (45s)
  },
};

const ThemeContext = createContext();

// Theme mode constants
export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto', // Follow system
};

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(THEME_MODES.LIGHT); // User preference: 'light', 'dark', or 'auto'
  const [isLoading, setIsLoading] = useState(true);
  const [systemTheme, setSystemTheme] = useState(Appearance.getColorScheme() || 'light');

  // Actual theme in use (resolved from mode + system)
  const activeTheme = useMemo(() => {
    if (themeMode === THEME_MODES.AUTO) {
      return systemTheme;
    }
    return themeMode;
  }, [themeMode, systemTheme]);

  // Load saved theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemTheme(colorScheme || 'light');

      // Track system theme changes for analytics
      if (themeMode === THEME_MODES.AUTO) {
        trackThemeEvent('system_theme_changed', {
          newTheme: colorScheme,
          platform: Platform.OS,
        });
      }
    });

    return () => subscription.remove();
  }, [themeMode]);

  async function loadThemePreference() {
    try {
      const savedMode = await storage.getItem(STORAGE_KEYS.THEME_PREFERENCE);

      if (savedMode && Object.values(THEME_MODES).includes(savedMode)) {
        setThemeMode(savedMode);

        // Track theme load for analytics
        trackThemeEvent('theme_loaded', {
          mode: savedMode,
          resolvedTheme: savedMode === THEME_MODES.AUTO ? systemTheme : savedMode,
        });
      }
    } catch (error) {
      console.error('[ThemeProvider] Failed to load theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const setThemeModeAndSave = useCallback(async (mode) => {
    if (!Object.values(THEME_MODES).includes(mode)) {
      console.warn('[ThemeProvider] Invalid theme mode:', mode);
      return;
    }

    const previousMode = themeMode;
    const previousTheme = activeTheme;
    setThemeMode(mode);

    try {
      await storage.setItem(STORAGE_KEYS.THEME_PREFERENCE, mode);

      const newTheme = mode === THEME_MODES.AUTO ? systemTheme : mode;

      // Track theme change for analytics
      trackThemeEvent('theme_changed', {
        previousMode,
        newMode: mode,
        previousTheme,
        newTheme,
        manual: true,
      });
    } catch (error) {
      console.error('[ThemeProvider] Failed to save theme preference:', error);
      // Revert on error
      setThemeMode(previousMode);
    }
  }, [themeMode, activeTheme, systemTheme]);

  const toggleTheme = useCallback(async () => {
    const newMode = activeTheme === 'light' ? THEME_MODES.DARK : THEME_MODES.LIGHT;
    await setThemeModeAndSave(newMode);
  }, [activeTheme, setThemeModeAndSave]);

  // Memoized theme-aware colors (prevents re-creation on every render)
  const colors = useMemo(() => ({
    // Text colors
    text: activeTheme === 'light' ? LIGHT_TEXT : DARK_TEXT,

    // Background gradients for AnimatedMeshGradient
    background: {
      gradient: activeTheme === 'light'
        ? LIGHT_BACKGROUNDS.warmWellness.colors
        : DARK_BACKGROUNDS.cosmicPurple.colors,
      animationDuration: activeTheme === 'light'
        ? LIGHT_BACKGROUNDS.warmWellness.animationDuration
        : 40000, // Slower, more subtle animation (40s)
    },

    // Surface/container backgrounds
    surface: activeTheme === 'light' ? SURFACES : {
      background: {
        primary: DARK_BACKGROUNDS.deepNavy.colors[0],
        secondary: DARK_BACKGROUNDS.deepNavy.colors[1],
        tertiary: DARK_BACKGROUNDS.deepNavy.colors[2],
      },
      card: GLASS.card,
    },

    // Card styles
    card: activeTheme === 'light'
      ? {
          background: 'rgba(107, 78, 255, 0.08)', // Soft purple tint
          border: 'rgba(107, 78, 255, 0.15)',
        }
      : {
          background: GLASS.card.primary, // White glass for dark
          border: GLASS.border.light,
        },

    // Button styles
    button: activeTheme === 'light'
      ? {
          background: 'rgba(107, 78, 255, 0.08)',
          border: 'rgba(107, 78, 255, 0.15)',
          activeBackground: 'rgba(107, 78, 255, 0.15)',
          activeBorder: 'rgba(107, 78, 255, 0.3)',
        }
      : {
          background: 'rgba(255, 255, 255, 0.12)',
          border: 'rgba(255, 255, 255, 0.2)',
          activeBackground: 'rgba(255, 255, 255, 0.18)',
          activeBorder: 'rgba(255, 255, 255, 0.3)',
        },

    // Shadows
    shadows: activeTheme === 'light' ? LIGHT_SHADOWS : DARK_SHADOWS,

    // Semantic colors (adapted for theme)
    semantic: activeTheme === 'light' ? SEMANTIC : {
      success: VIBRANT.semantic.success,
      warning: VIBRANT.semantic.warning,
      danger: VIBRANT.semantic.danger,
      info: VIBRANT.semantic.info,
    },

    // Brand colors (same in both themes)
    brand: BRAND,

    // Vibrant accents (for dark theme primarily, but available in light too)
    vibrant: VIBRANT,

    // Gradients
    gradients: activeTheme === 'light'
      ? SURFACES.gradient
      : DARK_GRADIENTS,
  }), [activeTheme]);

  // Memoized context value
  const value = useMemo(() => ({
    // Current state
    theme: activeTheme,
    themeMode,
    systemTheme,
    colors,
    isLight: activeTheme === 'light',
    isDark: activeTheme === 'dark',
    isAuto: themeMode === THEME_MODES.AUTO,
    isLoading,

    // Actions
    toggleTheme,
    setThemeMode: setThemeModeAndSave,

    // Constants
    THEME_MODES,
  }), [
    activeTheme,
    themeMode,
    systemTheme,
    colors,
    isLoading,
    toggleTheme,
    setThemeModeAndSave
  ]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// Note: trackThemeEvent is now imported from themeAnalytics service

export default ThemeProvider;
