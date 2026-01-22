import { Stack } from 'expo-router';
import { SURFACES } from '../../constants/premiumTheme';

export default function AnalyticsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: SURFACES.background.primary },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
