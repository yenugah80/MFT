/**
 * DashboardPillarsGrid - 4-pillar grid for Food, Mood, Hydration, Activity.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { TEXT, SURFACES, CARD_SYSTEM } from '../../constants/premiumTheme';
import { TYPOGRAPHY, SPACING } from '../../constants/designTokens';

function PillarCard({ item }) {
  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    item.onPress?.();
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <View style={styles.cardHeader}>
        <LinearGradient
          colors={item.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBadge}
        >
          <Ionicons name={item.icon} size={18} color="#FFFFFF" />
        </LinearGradient>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
      </View>

      <Text style={styles.value}>{item.value}</Text>
      {item.caption ? <Text style={styles.caption}>{item.caption}</Text> : null}
    </TouchableOpacity>
  );
}

export default function DashboardPillarsGrid({ items = [] }) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <PillarCard key={item.key} item={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  card: {
    flexBasis: '48%',
    flexGrow: 1,
    ...CARD_SYSTEM.compact,
    padding: SPACING[3],
  },
  cardHeader: {
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
  cardTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    letterSpacing: 0.2,
  },
  value: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  caption: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 6,
  },
});
