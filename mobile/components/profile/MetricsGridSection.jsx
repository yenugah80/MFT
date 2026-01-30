/**
 * MetricsGridSection - Premium Grid Layout for Personal Metrics
 *
 * Features:
 * - 2 cards per row grid layout (48% width each)
 * - Staggered entrance animation (50ms delay per card)
 * - "Edit All" button with gradient background
 * - Section header with subtle divider
 * - Premium glassmorphism styling
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import InlineEditMetricCard from './InlineEditMetricCard';
import { BRAND, SURFACES, TEXT, TYPOGRAPHY, SPACING, RADIUS } from '../../constants/premiumTheme';

// Activity level options for selection
const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'lightly_active', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'very_active', label: 'Active' },
  { value: 'extremely_active', label: 'Intense' },
];

// Gender options
const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

// Format activity level for display
const formatActivityLevel = (value) => {
  const option = ACTIVITY_OPTIONS.find(o => o.value === value);
  return option?.label || value || '—';
};

// Format gender for display
const formatGender = (value) => {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

// Validation functions
const validateAge = (value) => {
  const num = parseInt(value, 10);
  if (isNaN(num)) return 'Please enter a valid number';
  if (num < 13 || num > 120) return 'Age must be between 13-120';
  return null;
};

const validateWeight = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return 'Please enter a valid number';
  if (num < 20 || num > 500) return 'Weight must be between 20-500';
  return null;
};

const validateHeight = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return 'Please enter a valid number';
  if (num < 50 || num > 300) return 'Height must be between 50-300';
  return null;
};

export default function MetricsGridSection({
  basics = {},
  onFieldSave,
  isSaving = false,
}) {
  // Staggered animation refs
  const cardAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // Run staggered entrance animation on mount
  useEffect(() => {
    const animations = cardAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      })
    );
    Animated.stagger(50, animations).start();
  }, [cardAnims]);

  // Handle individual field save
  const handleFieldSave = useCallback(async (field, value) => {
    if (!onFieldSave) return true;
    return await onFieldSave(field, value);
  }, [onFieldSave]);

  // Metric card configurations
  const metrics = [
    {
      key: 'age',
      label: 'Age',
      value: basics.age,
      unit: 'years',
      icon: 'calendar-outline',
      iconColor: '#F59E0B',
      keyboardType: 'number-pad',
      validate: validateAge,
    },
    {
      key: 'weightKg',
      label: 'Weight',
      value: basics.weightKg,
      unit: 'kg',
      icon: 'scale-outline',
      iconColor: '#10B981',
      keyboardType: 'decimal-pad',
      validate: validateWeight,
    },
    {
      key: 'heightCm',
      label: 'Height',
      value: basics.heightCm,
      unit: 'cm',
      icon: 'resize-outline',
      iconColor: '#3B82F6',
      keyboardType: 'number-pad',
      validate: validateHeight,
    },
    {
      key: 'gender',
      label: 'Gender',
      value: basics.gender,
      icon: 'person-outline',
      iconColor: '#EC4899',
      selectOptions: GENDER_OPTIONS,
      formatDisplay: formatGender,
    },
    {
      key: 'activityLevel',
      label: 'Activity Level',
      value: basics.activityLevel,
      icon: 'fitness-outline',
      iconColor: '#8B5CF6',
      selectOptions: ACTIVITY_OPTIONS,
      formatDisplay: formatActivityLevel,
      isFullWidth: true,
    },
  ];

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={SURFACES.gradient.softPurple}
            style={styles.headerIcon}
          >
            <Ionicons name="body-outline" size={18} color={BRAND.primary} />
          </LinearGradient>
          <Text style={styles.headerTitle}>Personal Metrics</Text>
        </View>
        <Text style={styles.headerHint}>Tap to edit</Text>
      </View>

      {/* Metrics Grid */}
      <View style={styles.grid}>
        {metrics.map((metric, index) => (
          <Animated.View
            key={metric.key}
            style={[
              metric.isFullWidth ? styles.fullWidthCard : styles.gridCard,
              {
                opacity: cardAnims[index],
                transform: [
                  {
                    translateY: cardAnims[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <InlineEditMetricCard
              label={metric.label}
              value={metric.value}
              unit={metric.unit}
              icon={metric.icon}
              iconColor={metric.iconColor}
              keyboardType={metric.keyboardType}
              selectOptions={metric.selectOptions}
              formatDisplay={metric.formatDisplay}
              validateInput={metric.validate}
              isFullWidth={metric.isFullWidth}
              isSaving={isSaving}
              onSave={async (value) => {
                return await handleFieldSave(metric.key, value);
              }}
            />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING[5],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[4],
    paddingHorizontal: SPACING[1],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  headerHint: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    fontStyle: 'italic',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48%',
  },
  fullWidthCard: {
    width: '100%',
  },
});
