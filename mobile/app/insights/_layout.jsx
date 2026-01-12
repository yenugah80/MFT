/**
 * Insights Stack Layout
 *
 * Provides consistent navigation header styling for all insight screens
 */

import { Stack } from 'expo-router';
import { COLORS, TYPOGRAPHY } from '../../constants/designSystem';

export default function InsightsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.surface.primary,
        },
        headerTitleStyle: {
          fontSize: TYPOGRAPHY.size.headline,
          fontWeight: TYPOGRAPHY.weight.semibold,
          color: COLORS.text.primary,
        },
        headerTintColor: COLORS.brand.primary,
        headerShadowVisible: false,
        headerBackTitle: 'Back',
        contentStyle: {
          backgroundColor: COLORS.surface.primary,
        },
      }}
    />
  );
}
