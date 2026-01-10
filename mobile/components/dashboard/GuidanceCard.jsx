/**
 * GuidanceCard - single next step without shaming.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { TEXT, SURFACES, CARD_SYSTEM } from '../../constants/premiumTheme';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designTokens';

export default function GuidanceCard({ title, message, actionLabel, onAction }) {
  const handleAction = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAction?.();
  };

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={SURFACES.gradient.secondary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentBar}
      />
      <View style={styles.header}>
        <LinearGradient
          colors={SURFACES.gradient.secondary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBadge}
        >
          <Ionicons name="compass" size={16} color="#FFFFFF" />
        </LinearGradient>
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
        <LinearGradient
          colors={SURFACES.gradient.secondary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaGradient}
        >
          <Text style={styles.ctaText}>{actionLabel}</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...CARD_SYSTEM.standard,
    paddingTop: SPACING[5],
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  message: {
    fontSize: TYPOGRAPHY.size.md,
    color: TEXT.secondary,
    lineHeight: 20,
    marginBottom: SPACING[3],
  },
  cta: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  ctaGradient: {
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
