import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const fonts = {
  display: Platform.select({ ios: 'HelveticaNeue-Bold', android: 'Roboto-Bold', default: 'System' }),
  strong: Platform.select({ ios: 'HelveticaNeue-Medium', android: 'Roboto-Medium', default: 'System' }),
  regular: Platform.select({ ios: 'Helvetica Neue', android: 'Roboto', default: 'System' }),
};

export const QuickActionsBar = ({ onMoodPress, onWaterPress, onHistoryPress, logCount }) => {
  return (
    <View style={styles.quickActionsBar}>
      <TouchableOpacity
        style={styles.quickActionChip}
        onPress={onMoodPress}
        activeOpacity={0.7}
        accessibilityLabel="Log your mood"
      >
        <Ionicons name="happy-outline" size={20} color="#6B4EFF" />
        <Text style={styles.quickActionText}>Mood</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.quickActionChip}
        onPress={onWaterPress}
        activeOpacity={0.7}
        accessibilityLabel="Log your water intake"
      >
        <Ionicons name="water-outline" size={20} color="#6B4EFF" />
        <Text style={styles.quickActionText}>Water</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.quickActionChip}
        onPress={onHistoryPress}
        activeOpacity={0.7}
        accessibilityLabel="Open logged meals history"
      >
        <Ionicons name="flame-outline" size={20} color="#FF6B4E" />
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
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    fontFamily: fonts.strong,
  },
  quickActionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B4E',
    fontFamily: fonts.display,
  },
  quickActionLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: fonts.regular,
  },
});