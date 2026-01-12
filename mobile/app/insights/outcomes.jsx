/**
 * Outcome Tracking Screen Route
 *
 * Displays comprehensive visualization of recommendation effectiveness
 * Premium-only feature that proves the value of 5W2H recommendations
 */

import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import OutcomeTrackingScreen from '../../components/insights/OutcomeTrackingScreen';
import { PREMIUM_COLORS } from '../../constants/premiumDesignSystem';

export default function OutcomesRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Recommendation Outcomes',
          headerStyle: {
            backgroundColor: PREMIUM_COLORS.surface.primary,
          },
          headerTintColor: PREMIUM_COLORS.text.primary,
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={styles.container}>
        <OutcomeTrackingScreen />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PREMIUM_COLORS.surface.primary,
  },
});
