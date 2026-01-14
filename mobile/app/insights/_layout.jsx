/**
 * Insights Stack Layout
 *
 * Provides consistent navigation header styling for all insight screens
 * Uses premium theme for modern, cohesive appearance
 */

import { Stack } from 'expo-router';
import { TEXT, SURFACES, TYPOGRAPHY, BRAND } from '../../constants/premiumTheme';

export default function InsightsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: SURFACES.background.primary,
        },
        headerTitleStyle: {
          fontSize: TYPOGRAPHY.size.lg,
          fontWeight: TYPOGRAPHY.weight.semibold,
          color: TEXT.primary,
        },
        headerTintColor: BRAND.primary,
        headerShadowVisible: false,
        headerBackTitle: 'Back',
        contentStyle: {
          backgroundColor: SURFACES.background.primary,
        },
      }}
    />
  );
}
