/**
 * Recommendations screens layout
 * Routes for the 4 recommendation output screens
 */

import { Stack } from 'expo-router';
import { COLORS } from '../../../constants/designSystem';

export default function RecommendationsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen
        name="food"
        options={{
          title: 'Food Recommendations',
        }}
      />
      <Stack.Screen
        name="mood-food"
        options={{
          title: 'Mood-Food Patterns',
        }}
      />
      <Stack.Screen
        name="hydration"
        options={{
          title: 'Hydration-Energy',
        }}
      />
      <Stack.Screen
        name="recovery"
        options={{
          title: 'Activity Recovery',
        }}
      />
    </Stack>
  );
}
