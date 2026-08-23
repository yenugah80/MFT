import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, SURFACES, BRAND, TYPOGRAPHY } from '../../constants/premiumTheme';

export const QuickActionsBar = ({ onMoodPress, onWaterPress, onSleepPress, onStressPress }) => {
  return (
    <View style={styles.quickActionsBar}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  quickActionsBar: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
  },
  quickActionChip: {
    flex: 1,
    backgroundColor: SURFACES.card.primary,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
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