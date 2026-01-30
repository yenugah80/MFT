import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TEXT, SURFACES, SPACING, RADIUS, TYPOGRAPHY, VIBRANT_WELLNESS } from '../../constants/premiumTheme';

const TABS = [
  { key: 'wellness', label: 'Wellness', icon: 'heart', color: '#EC4899' },
  { key: 'nutrition', label: 'Nutrition', icon: 'nutrition', color: VIBRANT_WELLNESS.nutrition.solid },
  { key: 'mood', label: 'Mood', icon: 'happy', color: VIBRANT_WELLNESS.mood.solid },
  { key: 'activity', label: 'Activity', icon: 'fitness', color: VIBRANT_WELLNESS.activity.solid },
  { key: 'hydration', label: 'Hydration', icon: 'water', color: VIBRANT_WELLNESS.hydration.solid },
];

export default function AnalyticsTabBar({ selected = 'nutrition', onSelect }) {
  const handleSelect = (tab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect?.(tab);
  };

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = selected === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => handleSelect(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon}
              size={22}
              color={isActive ? tab.color : TEXT.tertiary}
            />
            <Text style={[styles.label, isActive && { color: tab.color }]}>
              {tab.label}
            </Text>
            {isActive && (
              <View style={[styles.indicator, { backgroundColor: tab.color }]} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: SURFACES.card.primary,
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.divider,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING[3],
    gap: SPACING[1],
    position: 'relative',
  },
  tabActive: {
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: SPACING[4],
    right: SPACING[4],
    height: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
});
