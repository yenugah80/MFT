import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TEXT, SURFACES, SPACING, TYPOGRAPHY, BRAND, VIBRANT_WELLNESS } from '../../constants/premiumTheme';

// Wellness has no entry in VIBRANT_WELLNESS (it's the cross-domain composite,
// not a single tracked domain like the other 4) — BRAND.primary fits it
// better than a hardcoded one-off hex, and matches the app's actual brand
// color rather than an arbitrary pink no other screen uses for "wellness".
const TABS = [
  { key: 'wellness', label: 'Wellness', icon: 'heart', color: BRAND.primary },
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
    <View style={styles.shell}>
      <View style={styles.container} accessibilityRole="tablist">
        {TABS.map((tab) => {
          const isActive = selected === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                isActive && { backgroundColor: `${tab.color}12`, borderColor: `${tab.color}36` },
              ]}
              onPress={() => handleSelect(tab.key)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityLabel={`${tab.label} progress`}
              accessibilityState={{ selected: isActive }}
            >
              <View style={[styles.iconWrap, isActive && { backgroundColor: `${tab.color}16` }]}>
                <Ionicons name={tab.icon} size={18} color={isActive ? tab.color : TEXT.tertiary} />
              </View>
              <Text style={[styles.label, isActive && { color: tab.color }]} numberOfLines={1}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: SURFACES.card.primary,
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.divider,
  },
  container: {
    flexDirection: 'row',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    gap: 4,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: 5,
    paddingHorizontal: 2,
  },
  iconWrap: {
    width: 27,
    height: 27,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    width: '100%',
    textAlign: 'center',
    fontSize: 9,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
  },
});
