import React from 'react';
import { TEXT } from '../constants/premiumTheme';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * Quick action buttons for dashboard
 */
const QuickAction = ({ icon, label, onPress, color = '#4f46e5' }) => {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const QuickActions = ({ onLogFood, onScanBarcode, onLogWater, onLogMood }) => {
  return (
    <View style={styles.container}>
      <QuickAction
        icon="🍽️"
        label="Log Food"
        onPress={onLogFood}
        color="#10b981"
      />
      <QuickAction
        icon="📷"
        label="Scan"
        onPress={onScanBarcode}
        color="#8b5cf6"
      />
      <QuickAction
        icon="💧"
        label="Water"
        onPress={onLogWater}
        color="#3b82f6"
      />
      <QuickAction
        icon="😊"
        label="Mood"
        onPress={onLogMood}
        color="#f59e0b"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  action: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 28,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT.primary,
  },
});

export default QuickActions;
