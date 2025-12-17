import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Toast = ({ type = 'info', message, onDismiss, style }) => {
  const opacity = new Animated.Value(0);

  useEffect(() => {
    // Fade in animation
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleDismiss = () => {
    // Fade out animation
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  const config = {
    success: {
      icon: 'checkmark-circle',
      color: '#10b981',
      backgroundColor: '#d1fae5',
      borderColor: '#10b981',
    },
    error: {
      icon: 'close-circle',
      color: '#ef4444',
      backgroundColor: '#fee2e2',
      borderColor: '#ef4444',
    },
    warning: {
      icon: 'warning',
      color: '#f59e0b',
      backgroundColor: '#fef3c7',
      borderColor: '#f59e0b',
    },
    info: {
      icon: 'information-circle',
      color: '#3b82f6',
      backgroundColor: '#dbeafe',
      borderColor: '#3b82f6',
    },
  };

  const { icon, color, backgroundColor, borderColor } = config[type] || config.info;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor, borderColor, opacity },
        style,
      ]}
    >
      <Ionicons name={icon} size={24} color={color} style={styles.icon} />
      <Text style={[styles.message, { color }]} numberOfLines={2}>
        {message}
      </Text>
      <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
        <Ionicons name="close" size={20} color={color} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    maxWidth: 400,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
});

export default Toast;
