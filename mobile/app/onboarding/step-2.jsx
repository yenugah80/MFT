/**
 * Onboarding Step 2: Basic Metrics
 * User enters age, weight, height, gender, activity level
 */

import React, { useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  AccessibilityInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import MetricInput from '../../components/onboarding/MetricInput';
import { useOnboarding } from '../../hooks/useOnboarding';
import {
  ACTIVITY_LEVELS,
  GENDERS,
  VALIDATION_RANGES,
  ONBOARDING_COPY,
  A11Y_LABELS,
} from '../../constants/onboardingConfig';
import { BRAND, TEXT, SURFACES, SHADOWS, RADIUS, SPACING, SEMANTIC } from '../../constants/premiumTheme';

const Step2Screen = () => {
  const {
    step,
    step2Data,
    updateStepData,
    goToNextStep,
    goToPreviousStep,
    setStep,
  } = useOnboarding();

  const [errors, setErrors] = React.useState({});

  // Ensure step is synchronized to 2 when this screen loads
  React.useEffect(() => {
    if (step !== 2) {
      console.log('[Step 2] Screen loaded - syncing hook state to step 2 (was:', step, ')');
      setStep(2);
    }
  }, [step, setStep]);

  // Validation logic
  const isFormValid = useMemo(() => {
    const newErrors = {};

    // Validate age
    if (!step2Data.age || parseFloat(step2Data.age) < VALIDATION_RANGES.age.min ||
        parseFloat(step2Data.age) > VALIDATION_RANGES.age.max) {
      newErrors.age = `Age must be between ${VALIDATION_RANGES.age.min} and ${VALIDATION_RANGES.age.max}`;
    }

    // Validate weight
    if (step2Data.weight) {
      const weight = parseFloat(step2Data.weight);
      const minWeight = step2Data.weightUnit === 'kg' ? VALIDATION_RANGES.weight.min : VALIDATION_RANGES.weightLbs.min;
      const maxWeight = step2Data.weightUnit === 'kg' ? VALIDATION_RANGES.weight.max : VALIDATION_RANGES.weightLbs.max;

      if (weight < minWeight || weight > maxWeight) {
        newErrors.weight = `Weight must be between ${minWeight} and ${maxWeight} ${step2Data.weightUnit}`;
      }
    } else {
      newErrors.weight = 'Weight is required';
    }

    // Validate height
    if (step2Data.heightUnit === 'cm') {
      if (!step2Data.height || parseFloat(step2Data.height) < VALIDATION_RANGES.height.min ||
          parseFloat(step2Data.height) > VALIDATION_RANGES.height.max) {
        newErrors.height = `Height must be between ${VALIDATION_RANGES.height.min} and ${VALIDATION_RANGES.height.max} cm`;
      }
    } else {
      // Feet + inches
      const feet = parseFloat(step2Data.heightFeet) || 0;
      const inches = parseFloat(step2Data.heightInches) || 0;

      if (feet < VALIDATION_RANGES.heightFeet.min || feet > VALIDATION_RANGES.heightFeet.max ||
          inches < 0 || inches > 11) {
        newErrors.height = 'Please enter a valid height';
      }
    }

    // Validate gender (required for accurate BMR calculations)
    if (!step2Data.gender) {
      newErrors.gender = 'Gender is required for accurate health calculations';
    }

    // Validate activity level
    if (!step2Data.activityLevel) {
      newErrors.activityLevel = 'Activity level is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [step2Data]);

  const handleContinue = () => {
    if (isFormValid) {
      console.log('[Step 2] Form valid - proceeding with:', {
        age: step2Data.age,
        weight: step2Data.weight,
        height: step2Data.height,
        gender: step2Data.gender,
        activityLevel: step2Data.activityLevel,
      });
      goToNextStep();
    }
  };

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(A11Y_LABELS.step2);
  }, []);

  return (
    <OnboardingLayout
      step={2}
      totalSteps={4}
      title={ONBOARDING_COPY.step2.title}
      subtitle={ONBOARDING_COPY.step2.subtitle}
      onBack={goToPreviousStep}
      canGoBack={true}
      scrollEnabled={true}
    >
      {/* Metrics Section - Premium Card */}
      <LinearGradient
        colors={['#F0F4FF', '#E8ECFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.premiumSection, { backgroundColor: '#F0F4FF' }]}
      >
        <View style={styles.premiumSectionHeader}>
          <Ionicons name="body" size={20} color="#3B82F6" />
          <Text style={styles.premiumSectionTitle}>Your Measurements</Text>
        </View>

        {/* Age input */}
        <MetricInput
          label={ONBOARDING_COPY.step2.ageLabel}
          hint={ONBOARDING_COPY.step2.ageHint}
          value={step2Data.age}
          onChangeValue={(value) => updateStepData('step2', { age: value })}
          placeholder="25"
          keyboardType="number-pad"
          error={errors.age}
          min={VALIDATION_RANGES.age.min}
          max={VALIDATION_RANGES.age.max}
        />

        {/* Weight input with unit toggle */}
        <MetricInput
          label={ONBOARDING_COPY.step2.weightLabel}
          value={step2Data.weight}
          onChangeValue={(value) => updateStepData('step2', { weight: value })}
          placeholder="70"
          keyboardType="decimal-pad"
          units={['kg', 'lbs']}
          selectedUnit={step2Data.weightUnit}
          onUnitChange={(unit) => updateStepData('step2', { weightUnit: unit })}
          error={errors.weight}
        />

        {/* Height input with unit toggle */}
        {step2Data.heightUnit === 'cm' ? (
          <MetricInput
            label={ONBOARDING_COPY.step2.heightLabel}
            value={step2Data.height}
            onChangeValue={(value) => updateStepData('step2', { height: value })}
            placeholder="170"
            keyboardType="decimal-pad"
            units={['cm', 'ft']}
            selectedUnit={step2Data.heightUnit}
            onUnitChange={(unit) => updateStepData('step2', { heightUnit: unit })}
            error={errors.height}
          />
        ) : (
          <View style={styles.heightFtInContainer}>
            <Text style={styles.label}>{ONBOARDING_COPY.step2.heightLabel}</Text>
            <View style={styles.ftInRow}>
              <MetricInput
                value={step2Data.heightFeet}
                onChangeValue={(value) => updateStepData('step2', { heightFeet: value })}
                placeholder="5"
                keyboardType="number-pad"
              />
              <Text style={styles.ftInSeparator}>ft</Text>
              <MetricInput
                value={step2Data.heightInches}
                onChangeValue={(value) => updateStepData('step2', { heightInches: value })}
                placeholder="10"
                keyboardType="number-pad"
              />
              <Text style={styles.ftInSeparator}>in</Text>
            </View>
            <View style={styles.unitToggleContainer}>
              <Pressable
                style={[
                  styles.unitToggleButton,
                  step2Data.heightUnit === 'cm' && styles.unitToggleActive,
                ]}
                onPress={() => updateStepData('step2', { heightUnit: 'cm' })}
              >
                <Text style={[
                  styles.unitToggleText,
                  step2Data.heightUnit === 'cm' && styles.unitToggleTextActive,
                ]}>
                  cm
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.unitToggleButton,
                  step2Data.heightUnit === 'ft' && styles.unitToggleActive,
                ]}
                onPress={() => updateStepData('step2', { heightUnit: 'ft' })}
              >
                <Text style={[
                  styles.unitToggleText,
                  step2Data.heightUnit === 'ft' && styles.unitToggleTextActive,
                ]}>
                  ft
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Gender selector - Premium Card */}
      <LinearGradient
        colors={['#F0F4FF', '#E8ECFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.premiumSection, { backgroundColor: '#F0F4FF' }]}
      >
        <View style={styles.premiumSectionHeader}>
          <Ionicons name="person" size={20} color="#EC4899" />
          <Text style={styles.premiumSectionTitle}>{ONBOARDING_COPY.step2.genderLabel}</Text>
        </View>
        <Text style={styles.sectionHint}>Required for accurate health calculations and nutrition targets</Text>
        <View style={styles.genderGrid}>
          {GENDERS.map((gender) => {
            const isSelected = step2Data.gender === gender.id;
            const genderColors = {
              male: { bg: '#3B82F6', bgLight: 'rgba(59, 130, 246, 0.1)', icon: '👨' },
              female: { bg: '#EC4899', bgLight: 'rgba(236, 72, 153, 0.1)', icon: '👩' },
              other: { bg: '#8B5CF6', bgLight: 'rgba(139, 92, 246, 0.1)', icon: '🧑' },
            };
            const colors = genderColors[gender.id] || genderColors.other;

            return (
              <Pressable
                key={gender.id}
                onPress={() => {
                  console.log('[Step 2] Gender selected:', gender.id);
                  updateStepData('step2', { gender: gender.id });
                }}
                style={[
                  styles.genderButton,
                  isSelected && styles.genderButtonSelected,
                  isSelected && { borderColor: colors.bg, backgroundColor: colors.bg },
                ]}
              >
                <Text style={styles.genderIcon}>{colors.icon}</Text>
                <Text
                  style={[
                    styles.genderButtonText,
                    isSelected && { color: '#FFFFFF', fontWeight: '700' },
                  ]}
                >
                  {gender.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errors.gender && (
          <Text style={styles.errorText}>{errors.gender}</Text>
        )}
      </LinearGradient>

      {/* Activity level selector - Premium Card */}
      <LinearGradient
        colors={['#F0F4FF', '#E8ECFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.premiumSection, { backgroundColor: '#F0F4FF' }]}
      >
        <View style={styles.premiumSectionHeader}>
          <Ionicons name="flame" size={20} color="#F59E0B" />
          <Text style={styles.premiumSectionTitle}>{ONBOARDING_COPY.step2.activityLabel}</Text>
        </View>
        <Text style={styles.sectionHint}>{ONBOARDING_COPY.step2.activityHint}</Text>
        <View style={styles.activityGrid}>
          {ACTIVITY_LEVELS.map((activity, index) => {
            const isSelected = step2Data.activityLevel === activity.id;
            const activityColors = [
              { icon: '🪑', color: '#64748B', colorLight: 'rgba(100, 116, 139, 0.1)' }, // Sedentary - Gray
              { icon: '🚶', color: '#3B82F6', colorLight: 'rgba(59, 130, 246, 0.1)' }, // Lightly - Blue
              { icon: '🏃', color: '#10B981', colorLight: 'rgba(16, 185, 129, 0.1)' }, // Moderate - Green
              { icon: '🏋️', color: '#F59E0B', colorLight: 'rgba(245, 158, 11, 0.1)' }, // Very Active - Amber
              { icon: '⚡', color: '#EF4444', colorLight: 'rgba(239, 68, 68, 0.1)' }, // Extremely - Red
            ];
            const actColor = activityColors[index] || activityColors[0];

            return (
              <Pressable
                key={activity.id}
                onPress={() => {
                  console.log('[Step 2] Activity level selected:', activity.id);
                  updateStepData('step2', { activityLevel: activity.id });
                }}
                style={[
                  styles.activityButton,
                  isSelected && styles.activityButtonSelected,
                  isSelected && {
                    borderColor: actColor.color,
                    backgroundColor: actColor.color,
                  },
                ]}
              >
                <View style={styles.activityIconContainer}>
                  <Text style={styles.activityIcon}>{actColor.icon}</Text>
                  {isSelected && (
                    <View
                      style={[
                        styles.activityCheckmark,
                        { backgroundColor: actColor.color },
                      ]}
                    >
                      <Ionicons name="checkmark" size={12} color="white" />
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.activityButtonLabel,
                    isSelected && { color: '#FFFFFF', fontWeight: '700' },
                  ]}
                >
                  {activity.shortLabel}
                </Text>
                <Text
                  style={[
                    styles.activityButtonDesc,
                    isSelected && { color: '#454d8bff', fontWeight: '600' },
                  ]}
                >
                  {activity.description}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errors.activityLevel && (
          <Text style={styles.errorText}>{errors.activityLevel}</Text>
        )}
      </LinearGradient>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Premium Gradient Buttons */}
      <View style={styles.buttonContainer}>
        <Pressable
          onPress={goToPreviousStep}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed,
          ]}
        >
          <Ionicons name="arrow-back" size={18} color={TEXT.primary} style={{ marginRight: 6 }} />
          <Text style={styles.secondaryButtonText}>{ONBOARDING_COPY.step2.backBtn}</Text>
        </Pressable>

        <Pressable
          onPress={handleContinue}
          disabled={!isFormValid}
          style={({ pressed }) => [
            styles.primaryButton,
            !isFormValid && styles.primaryButtonDisabled,
            pressed && styles.primaryButtonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>{ONBOARDING_COPY.step2.continueBtn}</Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color="#FFFFFF"
            style={{ marginLeft: 6 }}
          />
        </Pressable>
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  // ===== PREMIUM SECTION CONTAINER =====
  premiumSection: {
    backgroundColor: '#96a6d2ff',
    borderRadius: RADIUS.lg,
    borderLeftWidth: 4,
    borderLeftColor: BRAND.primary,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[4],
    marginBottom: SPACING[5],
    ...SHADOWS.sm,
  },
  premiumSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  premiumSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT.primary,
    flex: 1,
  },
  sectionHint: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT.tertiary,
    marginBottom: SPACING[3],
    lineHeight: 18,
  },

  // ===== PREMIUM SECTION HEADERS =====
  sectionHeader: {
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.primary,
    letterSpacing: -0.3,
  },
  hint: {
    fontSize: 13,
    fontWeight: '400',
    color: TEXT.tertiary,
    marginTop: 4,
    lineHeight: 18,
  },

  // ===== PREMIUM INPUT CARDS =====
  inputCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    marginBottom: SPACING[4],
    ...SHADOWS.sm,
  },
  inputCardFocused: {
    borderColor: BRAND.primary,
    backgroundColor: 'rgba(107, 78, 255, 0.02)',
    ...SHADOWS.md,
  },

  // ===== HEIGHT FT/IN CONTAINER =====
  heightFtInContainer: {
    marginBottom: SPACING[4],
  },
  ftInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  ftInSeparator: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND.primary,
  },

  // ===== PREMIUM UNIT TOGGLE =====
  unitToggleContainer: {
    flexDirection: 'row',
    gap: SPACING[2],
  },
  unitToggleButton: {
    flex: 1,
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: SURFACES.card.border,
    backgroundColor: SURFACES.background.secondary,
    alignItems: 'center',
  },
  unitToggleActive: {
    borderColor: BRAND.primary,
    backgroundColor: BRAND.primary,
    ...SHADOWS.sm,
  },
  unitToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT.secondary,
  },
  unitToggleTextActive: {
    color: '#e9acacff',
    fontWeight: '700',
  },

  // ===== PREMIUM GENDER SELECTOR =====
  genderContainer: {
    marginBottom: 0,
  },
  genderGrid: {
    flexDirection: 'row',
    gap: SPACING[3],
    flexWrap: 'wrap',
    marginTop: 0,
  },
  genderButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: SURFACES.card.border,
    backgroundColor: SURFACES.background.secondary,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  genderButtonSelected: {
    borderColor: BRAND.primary,
    backgroundColor: BRAND.primary,
    ...SHADOWS.md,
  },
  genderButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT.primary,
  },
  genderButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // ===== PREMIUM GENDER SELECTOR ICONS =====
  genderIcon: {
    fontSize: 28,
    marginBottom: SPACING[1],
  },

  // ===== PREMIUM ACTIVITY LEVEL SELECTOR =====
  activityContainer: {
    marginBottom: 0,
  },
  activityGrid: {
    gap: SPACING[3],
    marginTop: 0,
  },
  activityButton: {
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: SURFACES.card.border,
    backgroundColor: SURFACES.background.secondary,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  activityButtonSelected: {
    borderWidth: 2.5,
    ...SHADOWS.md,
  },
  activityIconContainer: {
    position: 'relative',
    marginBottom: SPACING[2],
  },
  activityIcon: {
    fontSize: 32,
  },
  activityCheckmark: {
    position: 'absolute',
    right: -4,
    top: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT.primary,
    marginBottom: SPACING[1],
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  activityButtonDesc: {
    fontSize: 11,
    fontWeight: '400',
    color: TEXT.tertiary,
    lineHeight: 15,
    textAlign: 'center',
  },
  activityButtonDescSelected: {
    color: BRAND.primary,
    fontWeight: '600',
  },

  // ===== ERROR & SUCCESS STATES =====
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: SEMANTIC.danger.base,
    marginTop: SPACING[2],
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: SEMANTIC.danger.base,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.md,
  },
  successCheckmark: {
    position: 'absolute',
    right: SPACING[3],
    top: '50%',
  },

  // ===== SPACING =====
  spacer: {
    minHeight: SPACING[4],
  },

  // ===== PREMIUM BUTTONS WITH ICONS =====
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING[4],
    marginTop: SPACING[4],
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: SURFACES.card.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: SURFACES.background.secondary,
    ...SHADOWS.sm,
  },
  secondaryButtonPressed: {
    backgroundColor: SURFACES.background.tertiary,
    borderColor: BRAND.primary,
    borderWidth: 2.5,
    ...SHADOWS.md,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT.primary,
    letterSpacing: -0.3,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.lg,
    backgroundColor: BRAND.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...SHADOWS.md,
  },
  primaryButtonDisabled: {
    backgroundColor: 'rgba(156, 163, 175, 0.4)',
    ...SHADOWS.sm,
  },
  primaryButtonPressed: {
    backgroundColor: BRAND.primaryDark,
    ...SHADOWS.lg,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5f4ad8ff',
    letterSpacing: -0.3,
  },
});

export default Step2Screen;
