/**
 * EmptyState Component
 * Reusable component for showing empty/onboarding states
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { TEXT, TYPOGRAPHY, SPACING, RADIUS, SURFACES, BRAND } from '../constants/premiumTheme';

export default function EmptyState({
  icon = 'fitness',
  title = 'Get Started',
  description = 'Start tracking to see your data here',
  actionLabel,
  onAction,
  variant = 'default', // 'default' | 'compact'
}) {
  return (
    <View style={[styles.container, variant === 'compact' && styles.compact]}>
      <View style={styles.iconContainer}>
        <LinearGradient
          colors={SURFACES.gradient.primary}
          style={styles.iconGradient}
        >
          <Ionicons name={icon} size={variant === 'compact' ? 32 : 48} color="#FFF" />
        </LinearGradient>
      </View>

      <Text style={[styles.title, variant === 'compact' && styles.titleCompact]}>
        {title}
      </Text>

      <Text style={[styles.description, variant === 'compact' && styles.descriptionCompact]}>
        {description}
      </Text>

      {actionLabel && onAction && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onAction();
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityHint="Navigate to logging screen to start tracking"
        >
          <LinearGradient
            colors={SURFACES.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionGradient}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[10],
    paddingHorizontal: SPACING[6],
  },
  compact: {
    paddingVertical: SPACING[6],
    paddingHorizontal: SPACING[4],
  },
  iconContainer: {
    marginBottom: SPACING[4],
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  title: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: SPACING[2],
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: TYPOGRAPHY.size.lg,
  },
  description: {
    fontSize: TYPOGRAPHY.size.base,
    color: TEXT.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING[6],
    maxWidth: 300,
  },
  descriptionCompact: {
    fontSize: TYPOGRAPHY.size.sm,
    marginBottom: SPACING[4],
  },
  actionButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    minWidth: 200,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[6],
    minHeight: 44,
  },
  actionText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFF',
  },
});
