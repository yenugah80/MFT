import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, Text } from 'react-native';

export const NutritionCardSkeleton = ({ onCancel }) => {
  // Use a ref for the animated value to persist across renders
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Create a pulsing animation loop
    // Using useNativeDriver: true ensures this runs on the UI thread
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulse.start();

    // Cleanup on unmount
    return () => pulse.stop();
  }, [opacity]);

  return (
    <View style={styles.card}>
      {/* Header Skeleton */}
      <View style={styles.header}>
        <Animated.View style={[styles.skeleton, styles.title, { opacity }]} />
        <Animated.View style={[styles.skeleton, styles.subtitle, { opacity }]} />
      </View>

      {/* Chart/Circle Skeleton */}
      <View style={styles.chartContainer}>
        <Animated.View style={[styles.skeleton, styles.circle, { opacity }]} />
      </View>

      {/* Macros Row Skeleton */}
      <View style={styles.macrosRow}>
        <Animated.View style={[styles.skeleton, styles.macroItem, { opacity }]} />
        <Animated.View style={[styles.skeleton, styles.macroItem, { opacity }]} />
        <Animated.View style={[styles.skeleton, styles.macroItem, { opacity }]} />
        <Animated.View style={[styles.skeleton, styles.macroItem, { opacity }]} />
      </View>

      {/* Action Buttons Skeleton */}
      <View style={styles.actions}>
        <Animated.View style={[styles.skeleton, styles.button, { opacity }]} />
        <Animated.View style={[styles.skeleton, styles.button, { opacity }]} />
      </View>

      {/* Cancel Button */}
      {onCancel && (
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel Analysis</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 20,
  },
  skeleton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    width: '60%',
    height: 28,
    marginBottom: 10,
  },
  subtitle: {
    width: '40%',
    height: 16,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  circle: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  macroItem: {
    flex: 1,
    height: 60,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 14,
  },
  cancelButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
});