/**
 * LoadingSkeleton - Shimmer skeleton loading component
 * Shows placeholder content while data is loading
 */

import React, { useEffect } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { SPACING, RADIUS, SEMANTIC_ACTIONS, SURFACES } from '../../constants/premiumTheme';
import { createPulseAnimation } from '../../utils/profileAnimations';

export default function LoadingSkeleton({ width = '100%', height = 20, style }) {
  const pulseAnim = createPulseAnimation();

  useEffect(() => {
    pulseAnim.start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          opacity: pulseAnim.value,
        },
        style,
      ]}
    />
  );
}

export function SkeletonGroup({ count = 3, spacing = SPACING[3] }) {
  return (
    <View style={{ gap: spacing }}>
      {Array.from({ length: count }).map((_, i) => (
        <LoadingSkeleton key={i} />
      ))}
    </View>
  );
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <View style={styles.card}>
      <LoadingSkeleton width={150} height={20} style={{ marginBottom: SPACING[3] }} />
      <SkeletonGroup count={lines} spacing={SPACING[2]} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: SURFACES.divider,
    borderRadius: RADIUS.md,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: `${SEMANTIC_ACTIONS.success}1A`,
  },
});
