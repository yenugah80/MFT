/**
 * QuietConfidenceCard - World Class Redesign
 *
 * Shows when everything is on track - a calm, reassuring state.
 * No action needed, just positive reinforcement.
 *
 * Design: Minimal, calming, celebratory without being loud
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/designTokens';
import { COLORS, GRADIENTS } from '../../constants/unifiedColors';

export function QuietConfidenceCard() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.status.successBg, '#D1FAE5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Success icon */}
          <View style={styles.iconContainer}>
            <Ionicons
              name="checkmark-circle"
              size={48}
              color={COLORS.status.success}
            />
          </View>

          {/* Message */}
          <Text style={styles.headline}>You're on track</Text>
          <Text style={styles.subtitle}>
            Your habits align with your goals. Keep it up!
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING[4],
    marginBottom: SPACING[4],
    borderRadius: RADIUS.xl,
    overflow: 'hidden',

    // Subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  gradient: {
    paddingVertical: SPACING[6],
    paddingHorizontal: SPACING[5],
    alignItems: 'center',
  },

  content: {
    alignItems: 'center',
    gap: SPACING[2],
  },

  iconContainer: {
    marginBottom: SPACING[2],
  },

  headline: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.primary,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});

export default QuietConfidenceCard;
