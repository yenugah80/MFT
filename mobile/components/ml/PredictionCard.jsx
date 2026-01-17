/**
 * PredictionCard Component
 *
 * Displays a single health outcome prediction with confidence visualization.
 * Part of the ML insights design system.
 *
 * DESIGN SYSTEM:
 * - Clean, minimal card with soft shadows
 * - Confidence represented by gradient ring
 * - Color-coded interpretation labels
 * - Subtle animation on load
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TEXT, SURFACES, BRAND } from '../../constants/premiumTheme';

// Task configuration for display
const TASK_CONFIG = {
  mood: {
    label: 'Mood',
    icon: 'happy-outline',
    gradient: ['#8B5CF6', '#A78BFA'],
    unit: '/5',
  },
  energy: {
    label: 'Energy',
    icon: 'flash-outline',
    gradient: ['#F59E0B', '#FBBF24'],
    unit: '/5',
  },
  sleep: {
    label: 'Sleep Quality',
    icon: 'moon-outline',
    gradient: ['#3B82F6', '#60A5FA'],
    unit: '/5',
  },
  hydration: {
    label: 'Hydration',
    icon: 'water-outline',
    gradient: ['#06B6D4', '#22D3EE'],
    unit: '',
  },
  compliance: {
    label: 'Goal Progress',
    icon: 'checkmark-circle-outline',
    gradient: ['#10B981', '#34D399'],
    unit: '',
  },
};

// Color mapping for interpretation
const INTERPRETATION_COLORS = {
  excellent: '#10B981',
  positive: '#22C55E',
  neutral: '#6B7280',
  warning: '#F59E0B',
  negative: '#EF4444',
};

export default function PredictionCard({ task, prediction, animationDelay = 0 }) {
  const config = TASK_CONFIG[task] || TASK_CONFIG.mood;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: animationDelay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay: animationDelay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (!prediction) return null;

  const { value, confidence, interpretation, taskType, probability, range } = prediction;

  // Calculate ring progress (confidence * 100)
  const ringProgress = Math.round((confidence || 0.5) * 100);

  // Format display value
  const displayValue = taskType === 'binary'
    ? `${Math.round((probability || 0) * 100)}%`
    : value?.toFixed(1);

  const interpretColor = INTERPRETATION_COLORS[interpretation?.color] || INTERPRETATION_COLORS.neutral;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.card}>
        {/* Header with icon and label */}
        <View style={styles.header}>
          <LinearGradient
            colors={config.gradient}
            style={styles.iconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={config.icon} size={20} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.label}>{config.label}</Text>
        </View>

        {/* Main value display */}
        <View style={styles.valueContainer}>
          <Text style={styles.value}>{displayValue}</Text>
          <Text style={styles.unit}>{config.unit}</Text>
        </View>

        {/* Interpretation label */}
        <View style={[styles.interpretBadge, { backgroundColor: interpretColor + '15' }]}>
          <View style={[styles.interpretDot, { backgroundColor: interpretColor }]} />
          <Text style={[styles.interpretText, { color: interpretColor }]}>
            {interpretation?.label || 'Calculating'}
          </Text>
        </View>

        {/* Confidence indicator */}
        <View style={styles.confidenceContainer}>
          <View style={styles.confidenceBar}>
            <View
              style={[
                styles.confidenceFill,
                {
                  width: `${ringProgress}%`,
                  backgroundColor: config.gradient[0],
                },
              ]}
            />
          </View>
          <Text style={styles.confidenceText}>{ringProgress}% confidence</Text>
        </View>

        {/* Range indicator for regression tasks */}
        {range && (
          <View style={styles.rangeContainer}>
            <Text style={styles.rangeText}>
              Expected range: {range.low} - {range.high}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: SURFACES.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT.primary,
    marginLeft: 12,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    color: TEXT.primary,
  },
  unit: {
    fontSize: 16,
    fontWeight: '500',
    color: TEXT.tertiary,
    marginLeft: 4,
  },
  interpretBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  interpretDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  interpretText: {
    fontSize: 13,
    fontWeight: '600',
  },
  confidenceContainer: {
    marginTop: 4,
  },
  confidenceBar: {
    height: 4,
    backgroundColor: SURFACES.background.secondary,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 2,
  },
  confidenceText: {
    fontSize: 12,
    color: TEXT.tertiary,
  },
  rangeContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: SURFACES.background.secondary,
  },
  rangeText: {
    fontSize: 12,
    color: TEXT.tertiary,
  },
});
