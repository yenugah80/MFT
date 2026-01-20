/**
 * GoalsSection - Premium Nutrition Goals Editor
 *
 * Features:
 * - Visual goal cards with icons
 * - Animated macro distribution display
 * - Premium input styling with validation
 * - Water goal slider visualization
 * - Haptic feedback on interactions
 * - Staggered entrance animations
 */

import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import EditableSection from '../EditableSection';
import { PRIMARY_GOAL_OPTIONS } from '../../constants/profileConfig';
import { BRAND, SURFACES, TEXT, SEMANTIC, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ANIMATION, MACRO_COLORS, ICON_SIZES } from '../../constants/premiumTheme';

// Format number with locale-appropriate separators
const formatNumber = (value) => {
  if (value == null) return '—';
  return typeof value === 'number' ? value.toLocaleString() : value;
};

// Goal option icons
const GOAL_ICONS = {
  lose_weight: 'trending-down',
  maintain: 'swap-horizontal',
  gain_muscle: 'trending-up',
  improve_health: 'heart',
};

// Goal option colors
const GOAL_COLORS = {
  lose_weight: SURFACES.gradient.danger,
  maintain: SURFACES.gradient.success,
  gain_muscle: SURFACES.gradient.primary,
  improve_health: SURFACES.gradient.pink,
};

// Animated goal card component
const GoalCard = ({ option, isSelected, onPress, index, isEditing }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 80,
      tension: ANIMATION.spring.tension,
      friction: ANIMATION.spring.friction,
      useNativeDriver: true,
    }).start();
  }, [index, scaleAnim]);

  const handlePressIn = useCallback(() => {
    if (!isEditing) return;
    Animated.spring(pressAnim, {
      toValue: 0.95,
      tension: 400,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [pressAnim, isEditing]);

  const handlePressOut = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 1,
      tension: 400,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [pressAnim]);

  const handlePress = useCallback(() => {
    if (!isEditing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }, [isEditing, onPress]);

  const gradientColors = GOAL_COLORS[option.key] || SURFACES.gradient.primary;
  const iconName = GOAL_ICONS[option.key] || 'flag';

  return (
    <Animated.View
      style={[
        styles.goalCardWrapper,
        {
          transform: [{ scale: Animated.multiply(scaleAnim, pressAnim) }],
          opacity: scaleAnim,
        },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        disabled={!isEditing}
        style={[
          styles.goalCard,
          isSelected && styles.goalCardSelected,
          !isEditing && styles.goalCardDisabled,
        ]}
      >
        <LinearGradient
          colors={isSelected ? gradientColors : ['#F9FAFB', '#F3F4F6']}
          style={styles.goalCardGradient}
        >
          <View style={[
            styles.goalIconContainer,
            isSelected && { backgroundColor: 'rgba(255,255,255,0.3)' },
          ]}>
            <Ionicons
              name={iconName}
              size={24}
              color={isSelected ? TEXT.white : TEXT.secondary}
            />
          </View>
          <Text style={[
            styles.goalLabel,
            isSelected && styles.goalLabelSelected,
          ]}>
            {option.label}
          </Text>
          {isSelected && (
            <View style={styles.goalCheckmark}>
              <Ionicons name="checkmark-circle" size={20} color={TEXT.white} />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Macro input component with color coding
const MacroInput = ({ label, value, unit, color, onChangeText, isEditing, icon }) => {
  return (
    <View style={styles.macroInputContainer}>
      <View style={styles.macroInputHeader}>
        <View style={[styles.macroIndicator, { backgroundColor: color }]} />
        <Text style={styles.macroLabel}>{label}</Text>
      </View>
      {isEditing ? (
        <View style={styles.macroInputWrapper}>
          <TextInput
            style={styles.macroInput}
            value={value != null ? String(value) : ''}
            onChangeText={onChangeText}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={TEXT.muted}
          />
          <Text style={styles.macroUnit}>{unit}</Text>
        </View>
      ) : (
        <View style={styles.macroDisplayWrapper}>
          <Text style={[styles.macroValue, { color }]}>
            {formatNumber(value)}
          </Text>
          <Text style={styles.macroUnit}>{unit}</Text>
        </View>
      )}
    </View>
  );
};

// Water goal display with visual indicator
const WaterGoalDisplay = ({ value, isEditing, onChangeText }) => {
  const fillPercent = Math.min(((value ?? 0) / 4) * 100, 100);

  return (
    <View style={styles.waterContainer}>
      <View style={styles.waterHeader}>
        <LinearGradient
          colors={SURFACES.gradient.softBlue}
          style={styles.waterIcon}
        >
          <Ionicons name="water" size={ICON_SIZES.xs} color={SEMANTIC.info.base} />
        </LinearGradient>
        <Text style={styles.waterLabel}>Daily Water Goal</Text>
      </View>

      {isEditing ? (
        <View style={styles.waterInputWrapper}>
          <TextInput
            style={styles.waterInput}
            value={value != null ? String(value) : ''}
            onChangeText={onChangeText}
            keyboardType="decimal-pad"
            placeholder="2.5"
            placeholderTextColor={TEXT.muted}
          />
          <Text style={styles.waterUnit}>L</Text>
        </View>
      ) : (
        <View style={styles.waterDisplay}>
          <View style={styles.waterBarContainer}>
            <View style={[styles.waterBarFill, { width: `${fillPercent}%` }]} />
          </View>
          <Text style={styles.waterValue}>{value != null ? value : '—'} L</Text>
        </View>
      )}
    </View>
  );
};

export default function GoalsSection({
  goals,
  isEditing,
  toggleEdit,
  saveSection,
  cancelEdit,
  updateField,
  status,
}) {
  const handleGoalSelect = useCallback((key) => {
    updateField('goals', 'primaryGoal', key);
  }, [updateField]);

  const handleCaloriesChange = useCallback((text) => {
    const parsed = parseInt(text, 10);
    updateField('goals', 'dailyCalories', Number.isNaN(parsed) ? null : parsed);
  }, [updateField]);

  const handleProteinChange = useCallback((text) => {
    const parsed = parseInt(text, 10);
    updateField('goals', 'proteinG', Number.isNaN(parsed) ? null : parsed);
  }, [updateField]);

  const handleCarbsChange = useCallback((text) => {
    const parsed = parseInt(text, 10);
    updateField('goals', 'carbsG', Number.isNaN(parsed) ? null : parsed);
  }, [updateField]);

  const handleFatsChange = useCallback((text) => {
    const parsed = parseInt(text, 10);
    updateField('goals', 'fatsG', Number.isNaN(parsed) ? null : parsed);
  }, [updateField]);

  const handleWaterChange = useCallback((text) => {
    const parsed = parseFloat(text);
    updateField('goals', 'waterLiters', Number.isNaN(parsed) ? null : parsed);
  }, [updateField]);

  return (
    <EditableSection
      title="Nutrition Goals"
      isEditing={isEditing}
      onToggleEdit={toggleEdit}
      onSave={saveSection}
      onCancel={cancelEdit}
      isSaving={status === 'saving'}
    >
      <View style={styles.content}>
        {/* Primary Goal Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={SURFACES.gradient.softPurple}
              style={styles.sectionIcon}
            >
              <Ionicons name="flag" size={ICON_SIZES.xs} color={BRAND.primary} />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Primary Goal</Text>
          </View>

          <View style={styles.goalGrid}>
            {PRIMARY_GOAL_OPTIONS.map((option, index) => (
              <GoalCard
                key={option.key}
                option={option}
                isSelected={goals.primaryGoal === option.key}
                onPress={() => handleGoalSelect(option.key)}
                index={index}
                isEditing={isEditing}
              />
            ))}
          </View>
        </View>

        {/* Calories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={SURFACES.gradient.warning}
              style={styles.sectionIcon}
            >
              <Ionicons name="flame" size={ICON_SIZES.xs} color={TEXT.white} />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Daily Calories</Text>
          </View>

          {isEditing ? (
            <View style={styles.calorieInputWrapper}>
              <TextInput
                style={styles.calorieInput}
                value={goals.dailyCalories != null ? String(goals.dailyCalories) : ''}
                onChangeText={handleCaloriesChange}
                keyboardType="numeric"
                placeholder="2000"
                placeholderTextColor={TEXT.muted}
              />
              <Text style={styles.calorieUnit}>kcal</Text>
            </View>
          ) : (
            <View style={styles.calorieDisplay}>
              <Text style={styles.calorieValue}>
                {formatNumber(goals.dailyCalories)}
              </Text>
              <Text style={styles.calorieUnit}>kcal</Text>
            </View>
          )}
        </View>

        {/* Macros Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={SURFACES.gradient.success}
              style={styles.sectionIcon}
            >
              <Ionicons name="nutrition" size={ICON_SIZES.xs} color={TEXT.white} />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Macro Targets</Text>
          </View>

          <View style={styles.macroGrid}>
            <MacroInput
              label="Protein"
              value={goals.proteinG}
              unit="g"
              color={MACRO_COLORS.protein.base}
              onChangeText={handleProteinChange}
              isEditing={isEditing}
            />
            <MacroInput
              label="Carbs"
              value={goals.carbsG}
              unit="g"
              color={MACRO_COLORS.carbs.base}
              onChangeText={handleCarbsChange}
              isEditing={isEditing}
            />
            <MacroInput
              label="Fats"
              value={goals.fatsG}
              unit="g"
              color={MACRO_COLORS.fat.base}
              onChangeText={handleFatsChange}
              isEditing={isEditing}
            />
          </View>
        </View>

        {/* Water Goal Section */}
        <WaterGoalDisplay
          value={goals.waterLiters}
          isEditing={isEditing}
          onChangeText={handleWaterChange}
        />
      </View>
    </EditableSection>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: SPACING[5],
  },
  section: {
    gap: SPACING[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
  },
  // Goal Cards
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[3],
  },
  goalCardWrapper: {
    width: '47%',
  },
  goalCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOWS.sm,
  },
  goalCardSelected: {
    borderColor: BRAND.primary,
  },
  goalCardDisabled: {
    opacity: 0.8,
  },
  goalCardGradient: {
    padding: SPACING[3],
    alignItems: 'center',
    gap: SPACING[2],
    minHeight: 100,
    justifyContent: 'center',
  },
  goalIconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
    textAlign: 'center',
  },
  goalLabelSelected: {
    color: TEXT.white,
  },
  goalCheckmark: {
    position: 'absolute',
    top: SPACING[2],
    right: SPACING[2],
  },
  // Calories
  calorieInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    borderWidth: 1,
    borderColor: SURFACES.card.border,
  },
  calorieInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  calorieDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING[2],
  },
  calorieValue: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: SEMANTIC.warning.base,
  },
  calorieUnit: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.muted,
  },
  // Macros
  macroGrid: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  macroInputContainer: {
    flex: 1,
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    ...SHADOWS.sm,
  },
  macroInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  macroIndicator: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
  },
  macroLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
  },
  macroInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    padding: 0,
  },
  macroDisplayWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  macroValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  macroUnit: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.muted,
  },
  // Water
  waterContainer: {
    gap: SPACING[3],
  },
  waterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  waterIcon: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
  },
  waterInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
  },
  waterInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  waterUnit: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.muted,
  },
  waterDisplay: {
    gap: SPACING[2],
  },
  waterBarContainer: {
    height: 8,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  waterBarFill: {
    height: '100%',
    backgroundColor: SEMANTIC.info.base,
    borderRadius: RADIUS.full,
  },
  waterValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: SEMANTIC.info.base,
  },
});
