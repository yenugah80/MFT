import { Redirect } from 'expo-router';

/**
 * Index route - Redirects to dashboard (Home tab)
 * This file is required by Expo Router for initial navigation
 * but is hidden from the tab bar in _layout.jsx
 */
export default function Index() {
  return <Redirect href="/(tabs)/dashboard" />;
}
