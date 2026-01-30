import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, SURFACES, BRAND, SEMANTIC_ACTIONS, TYPOGRAPHY } from '../../constants/premiumTheme';

export const QuickActionsBar = ({ onMoodPress, onWaterPress, onHistoryPress, logCount }) => {
  return (
    <View style={styles.quickActionsBar}>
      <TouchableOpacity
        style={styles.quickActionChip}
        onPress={onMoodPress}
        activeOpacity={0.7}
        accessibilityLabel="Log your mood"
      >
        <Ionicons name="happy-outline" size={20} color={BRAND.primary} />
        <Text style={styles.quickActionText}>Mood</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.quickActionChip}
        onPress={onWaterPress}
        activeOpacity={0.7}
        accessibilityLabel="Log your water intake"
      >
        <Ionicons name="water-outline" size={20} color={BRAND.primary} />
        <Text style={styles.quickActionText}>Water</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.quickActionChip}
        onPress={onHistoryPress}
        activeOpacity={0.7}
        accessibilityLabel="Open logged meals history"
      >
        <Ionicons name="flame-outline" size={20} color={SEMANTIC_ACTIONS.primary} />
        <Text style={styles.quickActionValue}>{logCount || 0}</Text>
        <Text style={styles.quickActionLabel}>logged</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  quickActionsBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
  },
  quickActionChip: {
    flex: 1,
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
  quickActionValue: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: TYPOGRAPHY.family.bold,
    color: SEMANTIC_ACTIONS.primary,
  },
  quickActionLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
});