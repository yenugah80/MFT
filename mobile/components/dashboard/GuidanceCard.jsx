/**
 * GuidanceCard - single next step without shaming.
 * Premium UI with warm coral gradient
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designTokens';
import { BOLD_GRADIENTS, DEPTH_SHADOWS } from '../../constants/modernColorPalette';

export default function GuidanceCard({ title, message, actionLabel, onAction }) {
  const handleAction = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAction?.();
  };

  return (
    <View style={[styles.cardWrapper, DEPTH_SHADOWS.guidance]}>
      <LinearGradient
        colors={BOLD_GRADIENTS.guidance}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Glass overlay for depth */}
        <View style={styles.glassOverlay} />

        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <Ionicons name="compass" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>

        <Text style={styles.message}>{message}</Text>

        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.9}
          onPress={handleAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <View style={styles.ctaInner}>
            <Text style={styles.ctaText}>{actionLabel}</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: RADIUS['2xl'],
    marginBottom: SPACING[4],
    overflow: 'hidden',
  },
  card: {
    borderRadius: RADIUS['2xl'],
    padding: SPACING[5],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  message: {
    fontSize: TYPOGRAPHY.size.md,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
    marginBottom: SPACING[4],
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cta: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
  },
  ctaText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#FFFFFF',
  },
});
