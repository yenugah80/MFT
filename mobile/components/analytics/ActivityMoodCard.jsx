/**
 * Activity-Mood Correlation Card
 *
 * Simple card showing how activity affects mood
 * Clean, user-friendly design
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  BRAND,
  SURFACES,
  SEMANTIC,
  SHADOWS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  VIBRANT_WELLNESS,
} from '../../constants/premiumTheme';

export default function ActivityMoodCard({
  activityLogs = [],
  moodLogs = [],
  compact = true,
}) {
  const router = useRouter();

  const hasData = moodLogs.length >= 3;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/insights');
  };

  // Empty state
  if (!hasData) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.iconBg, { backgroundColor: `${VIBRANT_WELLNESS.activity.solid}20` }]}>
            <Ionicons name="fitness" size={24} color={VIBRANT_WELLNESS.activity.solid} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Activity & Mood</Text>
            <Text style={styles.subtitle}>Coming soon</Text>
          </View>
        </View>
        <Text style={styles.emptyText}>
          Activity tracking will show how exercise affects your mood
        </Text>
      </View>
    );
  }

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityLabel="Activity and mood insights"
        accessibilityRole="button"
      >
        <View style={styles.header}>
          <View style={[styles.iconBg, { backgroundColor: `${VIBRANT_WELLNESS.activity.solid}20` }]}>
            <Ionicons name="fitness" size={24} color={VIBRANT_WELLNESS.activity.solid} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Activity & Mood</Text>
            <Text style={styles.subtitle}>See the connection</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={TEXT.tertiary} />
        </View>

        <View style={styles.insightRow}>
          <Ionicons name="trending-up" size={18} color={SEMANTIC.success.base} />
          <Text style={styles.insightText}>
            Movement helps improve mood and energy
          </Text>
        </View>

        <View style={styles.benefitsRow}>
          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: `${SEMANTIC.success.base}15` }]}>
              <Ionicons name="flash" size={16} color={SEMANTIC.success.base} />
            </View>
            <Text style={styles.benefitLabel}>Quick Boost</Text>
          </View>
          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: `${SEMANTIC.info.base}15` }]}>
              <Ionicons name="heart" size={16} color={SEMANTIC.info.base} />
            </View>
            <Text style={styles.benefitLabel}>Better Mood</Text>
          </View>
          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: `${BRAND.primary}15` }]}>
              <Ionicons name="moon" size={16} color={BRAND.primary} />
            </View>
            <Text style={styles.benefitLabel}>Better Sleep</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Expanded view
  return (
    <View style={styles.card}>
      <View style={styles.headerExpanded}>
        <View style={[styles.iconBgLarge, { backgroundColor: `${VIBRANT_WELLNESS.activity.solid}20` }]}>
          <Ionicons name="fitness" size={32} color={VIBRANT_WELLNESS.activity.solid} />
        </View>
        <View style={styles.headerTextExpanded}>
          <Text style={styles.titleExpanded}>Activity & Mood</Text>
          <Text style={styles.subtitleExpanded}>
            How movement affects how you feel
          </Text>
        </View>
      </View>

      <View style={styles.benefitsSection}>
        <BenefitCard
          icon="flash"
          iconColor={SEMANTIC.success.base}
          title="Feel Better Fast"
          description="Even a short walk can boost your mood right away"
        />
        <BenefitCard
          icon="trending-up"
          iconColor={SEMANTIC.info.base}
          title="Build Resilience"
          description="Regular activity helps you handle stress better"
        />
        <BenefitCard
          icon="shield"
          iconColor={BRAND.primary}
          title="Stay Sharp"
          description="Movement keeps your mind clear and focused"
        />
      </View>

      <View style={styles.tipCard}>
        <Ionicons name="bulb" size={20} color={VIBRANT_WELLNESS.activity.solid} />
        <Text style={styles.tipText}>
          Track your activity to see your personal patterns
        </Text>
      </View>
    </View>
  );
}

function BenefitCard({ icon, iconColor, title, description }) {
  return (
    <View style={styles.benefitCard}>
      <View style={[styles.benefitCardIcon, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.benefitCardContent}>
        <Text style={styles.benefitCardTitle}>{title}</Text>
        <Text style={styles.benefitCardDesc}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    ...SHADOWS.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
  },

  // Insight Row
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  insightText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },

  // Benefits Row (Compact)
  benefitsRow: {
    flexDirection: 'row',
    gap: SPACING[2],
  },
  benefitItem: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING[2],
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textAlign: 'center',
  },

  // Expanded View
  headerExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
    marginBottom: SPACING[4],
  },
  iconBgLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextExpanded: {
    flex: 1,
  },
  titleExpanded: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  subtitleExpanded: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
  },

  // Benefits Section
  benefitsSection: {
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    backgroundColor: SURFACES.background.secondary,
    padding: SPACING[3],
    borderRadius: RADIUS.md,
  },
  benefitCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitCardContent: {
    flex: 1,
  },
  benefitCardTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  benefitCardDesc: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Tip Card
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    backgroundColor: `${VIBRANT_WELLNESS.activity.solid}10`,
    padding: SPACING[3],
    borderRadius: RADIUS.md,
  },
  tipText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
});
