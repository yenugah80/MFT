import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, SURFACES, BRAND, TYPOGRAPHY } from '../../constants/premiumTheme';

// Auto-width chips in a horizontal ScrollView, not flex:1 in a fixed row —
// keeps room to add another chip later without ever squeezing labels.
export const QuickActionsBar = ({ onMoodPress, onWaterPress, onSleepPress, onStressPress }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.quickActionsBar}
      contentContainerStyle={styles.quickActionsContent}
    >
      <TouchableOpacity
        style={styles.quickActionChip}
        onPress={onMoodPress}
        activeOpacity={0.7}
        accessibilityLabel="Log your mood"
      >
        <Ionicons name="happy-outline" size={20} color={BRAND.primary} />
        <Text style={styles.quickActionText} numberOfLines={1}>Mood</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.quickActionChip}
        onPress={onWaterPress}
        activeOpacity={0.7}
        accessibilityLabel="Log your water intake"
      >
        <Ionicons name="water-outline" size={20} color={BRAND.primary} />
        <Text style={styles.quickActionText} numberOfLines={1}>Water</Text>
      </TouchableOpacity>

      {/* Sleep and Stress already had full logger modals (SleepLogger.jsx,
          StressLogger.jsx) reachable only by drilling into a dashboard
          summary card — no quick entry point existed here at all, unlike
          Mood/Water which were one tap away from the primary Log tab. */}
      <TouchableOpacity
        style={styles.quickActionChip}
        onPress={onSleepPress}
        activeOpacity={0.7}
        accessibilityLabel="Log your sleep"
      >
        <Ionicons name="moon-outline" size={20} color={BRAND.primary} />
        <Text style={styles.quickActionText} numberOfLines={1}>Sleep</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.quickActionChip}
        onPress={onStressPress}
        activeOpacity={0.7}
        accessibilityLabel="Log your stress"
      >
        <Ionicons name="pulse-outline" size={20} color={BRAND.primary} />
        <Text style={styles.quickActionText} numberOfLines={1}>Stress</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  quickActionsBar: {
    flexGrow: 0,
  },
  quickActionsContent: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  quickActionChip: {
    backgroundColor: SURFACES.card.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: TEXT.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
});