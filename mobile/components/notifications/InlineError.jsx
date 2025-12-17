import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const InlineError = ({ message, type = 'error', style }) => {
  if (!message) return null;

  const config = {
    error: {
      icon: 'alert-circle',
      color: '#ef4444',
      backgroundColor: '#fee2e2',
    },
    warning: {
      icon: 'warning',
      color: '#f59e0b',
      backgroundColor: '#fef3c7',
    },
    info: {
      icon: 'information-circle',
      color: '#3b82f6',
      backgroundColor: '#dbeafe',
    },
  };

  const { icon, color, backgroundColor } = config[type] || config.error;

  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      <Ionicons name={icon} size={16} color={color} style={styles.icon} />
      <Text style={[styles.message, { color }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  icon: {
    marginRight: 8,
  },
  message: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
});

export default InlineError;
