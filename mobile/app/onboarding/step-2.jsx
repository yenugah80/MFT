/**
 * Onboarding Step 2 — "The Organic Editorial" Design System
 *
 * Rules enforced:
 *   - Zero 1px borders — tonal background shifts only
 *   - Section cards: surface-container (#d2f7d8) background, borderRadius 20
 *   - Gender/Activity: #beeec8 unselected, #1c6d25 selected, NO border
 *   - FtIn inputs: #ffffff inner-glow surfaces (matches MetricInput spec)
 *   - Error: #aa371c text + rgba(170,55,28,0.05) tint — no borders
 *   - Buttons: pill borderRadius 999, gradient #1c6d25→#9df197 primary
 *   - Ambient shadows: rgba(14, 58, 32, 0.06)
 *   - Spring animations: stiffness 300, damping 20
 */

import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  TextInput,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import MetricInput from '../../components/onboarding/MetricInput';
import { useOnboarding } from '../../contexts/OnboardingContext';
import {
  ACTIVITY_LEVELS,
  GENDERS,
  VALIDATION_RANGES,
  ONBOARDING_COPY,
  A11Y_LABELS,
} from '../../constants/onboardingConfig';
import { TYPOGRAPHY } from '../../constants/premiumTheme';

const DS = {
  surface:          '#eaffeb',
  surfContainer:    '#d2f7d8',
  surfContainerHi:  '#beeec8',
  surfLow:          '#ffffff',
  primary:          '#1c6d25',
  onSurface:        '#0e3a20',
  onSurfaceVar:     'rgba(14, 58, 32, 0.50)',
  onPrimary:        '#ffffff',
  error:            '#aa371c',
  errorTint:        'rgba(170, 55, 28, 0.05)',
  ambientShadow:    'rgba(14, 58, 32, 0.06)',
};

/* ─── Animated pill button helper ─── */
const PillButton = ({ onPress, disabled, colors, children, style }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (to) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, stiffness: 300, damping: 20 }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => spring(0.96)}
        onPressOut={() => spring(1)}
        disabled={disabled}
      >
        <LinearGradient
          colors={disabled ? [DS.surfContainerHi, DS.surfContainer] : colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.pillGradient}
        >
          {children}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const Step2Screen = () => {
  const { step2Data, updateStepData, goToNextStep, goToPreviousStep } = useOnboarding();

  const { errors, isFormValid } = useMemo(() => {
    const errs = {};
    if (!step2Data.age || parseFloat(step2Data.age) < VALIDATION_RANGES.age.min ||
        parseFloat(step2Data.age) > VALIDATION_RANGES.age.max) {
      errs.age = `Age must be between ${VALIDATION_RANGES.age.min} and ${VALIDATION_RANGES.age.max}`;
    }
    if (step2Data.weight) {
      const w = parseFloat(step2Data.weight);
      const minW = step2Data.weightUnit === 'kg' ? VALIDATION_RANGES.weight.min : VALIDATION_RANGES.weightLbs.min;
      const maxW = step2Data.weightUnit === 'kg' ? VALIDATION_RANGES.weight.max : VALIDATION_RANGES.weightLbs.max;
      if (w < minW || w > maxW) {
        errs.weight = `Weight must be between ${minW} and ${maxW} ${step2Data.weightUnit}`;
      }
    } else {
      errs.weight = 'Weight is required';
    }
    if (step2Data.heightUnit === 'cm') {
      if (!step2Data.height || parseFloat(step2Data.height) < VALIDATION_RANGES.height.min ||
          parseFloat(step2Data.height) > VALIDATION_RANGES.height.max) {
        errs.height = `Height must be between ${VALIDATION_RANGES.height.min} and ${VALIDATION_RANGES.height.max} cm`;
      }
    } else {
      const feet = parseFloat(step2Data.heightFeet) || 0;
      const inches = parseFloat(step2Data.heightInches) || 0;
      if (feet < VALIDATION_RANGES.heightFeet.min || feet > VALIDATION_RANGES.heightFeet.max || inches < 0 || inches > 11) {
        errs.height = 'Please enter a valid height';
      }
    }
    if (!step2Data.gender) errs.gender = 'Gender is required for accurate health calculations';
    if (!step2Data.activityLevel) errs.activityLevel = 'Activity level is required';
    return { errors: errs, isFormValid: Object.keys(errs).length === 0 };
  }, [step2Data]);

  const handleContinue = () => { if (isFormValid) goToNextStep(); };

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
      {/* ── Measurements section card ── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconBadge}>
            <Ionicons name="body" size={18} color={DS.primary} />
          </View>
          <Text style={styles.sectionTitle}>Your Measurements</Text>
        </View>

        <MetricInput
          label={ONBOARDING_COPY.step2.ageLabel}
          hint={ONBOARDING_COPY.step2.ageHint}
          value={step2Data.age}
          onChangeValue={(v) => updateStepData('step2', { age: v })}
          placeholder="25"
          keyboardType="number-pad"
          error={errors.age}
          min={VALIDATION_RANGES.age.min}
          max={VALIDATION_RANGES.age.max}
        />

        <MetricInput
          label={ONBOARDING_COPY.step2.weightLabel}
          value={step2Data.weight}
          onChangeValue={(v) => updateStepData('step2', { weight: v })}
          placeholder="70"
          keyboardType="decimal-pad"
          units={['kg', 'lbs']}
          selectedUnit={step2Data.weightUnit}
          onUnitChange={(u) => updateStepData('step2', { weightUnit: u })}
          error={errors.weight}
        />

        {/* Height — cm or ft/in */}
        {step2Data.heightUnit === 'cm' ? (
          <MetricInput
            label={ONBOARDING_COPY.step2.heightLabel}
            value={step2Data.height}
            onChangeValue={(v) => updateStepData('step2', { height: v })}
            placeholder="170"
            keyboardType="decimal-pad"
            units={['cm', 'ft']}
            selectedUnit={step2Data.heightUnit}
            onUnitChange={(u) => updateStepData('step2', { heightUnit: u })}
            error={errors.height}
          />
        ) : (
          <View style={styles.ftInContainer}>
            <Text style={styles.fieldLabel}>{ONBOARDING_COPY.step2.heightLabel}</Text>
            <View style={styles.ftInRow}>
              {/* Feet */}
              <View style={styles.ftInSurface}>
                <TextInput
                  style={styles.ftInInput}
                  value={step2Data.heightFeet}
                  onChangeText={(t) => updateStepData('step2', { heightFeet: t.replace(/[^0-9]/g, '') })}
                  placeholder="5"
                  placeholderTextColor={DS.onSurfaceVar}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
                <Text style={styles.ftInUnit}>ft</Text>
              </View>
              {/* Inches */}
              <View style={styles.ftInSurface}>
                <TextInput
                  style={styles.ftInInput}
                  value={step2Data.heightInches}
                  onChangeText={(t) => {
                    const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
                    if (t === '' || (n >= 0 && n <= 11)) {
                      updateStepData('step2', { heightInches: t.replace(/[^0-9]/g, '') });
                    }
                  }}
                  placeholder="10"
                  placeholderTextColor={DS.onSurfaceVar}
                  keyboardType="number-pad"
                  maxLength={2}
                  selectTextOnFocus
                />
                <Text style={styles.ftInUnit}>in</Text>
              </View>
              {/* Unit toggle — pill group */}
              <View style={styles.unitGroup}>
                {['cm', 'ft'].map((u, i) => {
                  const isActive = step2Data.heightUnit === u;
                  return (
                    <Pressable
                      key={u}
                      onPress={() => updateStepData('step2', { heightUnit: u })}
                      style={[
                        styles.unitBtn,
                        isActive && styles.unitBtnActive,
                        i === 0 && styles.unitBtnLeft,
                        i === 1 && styles.unitBtnRight,
                      ]}
                    >
                      <Text style={[styles.unitBtnText, isActive && styles.unitBtnTextActive]}>{u}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            {errors.height ? <Text style={styles.errorMsg}>{errors.height}</Text> : null}
          </View>
        )}
      </View>

      {/* ── Gender section card ── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconBadge}>
            <Ionicons name="person" size={18} color={DS.primary} />
          </View>
          <Text style={styles.sectionTitle}>{ONBOARDING_COPY.step2.genderLabel}</Text>
        </View>
        <Text style={styles.sectionHint}>Required for accurate health calculations and nutrition targets</Text>

        <View style={styles.genderGrid}>
          {GENDERS.map((gender) => {
            const isSelected = step2Data.gender === gender.id;
            const icons = { male: '👨', female: '👩', other: '🧑' };
            return (
              <Pressable
                key={gender.id}
                onPress={() => updateStepData('step2', { gender: gender.id })}
                style={[
                  styles.genderBtn,
                  isSelected ? styles.genderBtnSelected : styles.genderBtnUnselected,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
              >
                <Text style={styles.genderEmoji}>{icons[gender.id] || '🧑'}</Text>
                <Text style={[styles.genderLabel, isSelected && styles.genderLabelSelected]}>
                  {gender.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errors.gender ? <Text style={styles.errorMsg}>{errors.gender}</Text> : null}
      </View>

      {/* ── Activity level section card ── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconBadge}>
            <Ionicons name="flame" size={18} color={DS.primary} />
          </View>
          <Text style={styles.sectionTitle}>{ONBOARDING_COPY.step2.activityLabel}</Text>
        </View>
        <Text style={styles.sectionHint}>{ONBOARDING_COPY.step2.activityHint}</Text>

        <View style={styles.activityGrid}>
          {ACTIVITY_LEVELS.map((activity, index) => {
            const isSelected = step2Data.activityLevel === activity.id;
            const actIcons = ['🪑', '🚶', '🏃', '🏋️', '⚡'];
            return (
              <Pressable
                key={activity.id}
                onPress={() => updateStepData('step2', { activityLevel: activity.id })}
                style={[
                  styles.activityBtn,
                  isSelected ? styles.activityBtnSelected : styles.activityBtnUnselected,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
              >
                <Text style={styles.activityIcon}>{actIcons[index] || '🏃'}</Text>
                <Text style={[styles.activityLabel, isSelected && styles.activityLabelSelected]}>
                  {activity.shortLabel}
                </Text>
                <Text style={[styles.activityDesc, isSelected && styles.activityDescSelected]}>
                  {activity.description}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errors.activityLevel ? <Text style={styles.errorMsg}>{errors.activityLevel}</Text> : null}
      </View>

      <View style={styles.spacer} />

      {/* ── Navigation buttons ── */}
      <View style={styles.buttonRow}>
        {/* Back — tonal ghost pill */}
        <Pressable
          onPress={goToPreviousStep}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.75 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={18} color={DS.onSurface} />
          <Text style={styles.backBtnText}>{ONBOARDING_COPY.step2.backBtn}</Text>
        </Pressable>

        {/* Continue — gradient pill */}
        <PillButton
          onPress={handleContinue}
          disabled={!isFormValid}
          colors={['#1c6d25', '#9df197']}
          style={[
            styles.continueWrapper,
            !isFormValid && styles.continueWrapperDisabled,
          ]}
        >
          <Text style={[styles.continueBtnText, !isFormValid && styles.continueBtnTextDisabled]}>
            {ONBOARDING_COPY.step2.continueBtn}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={isFormValid ? 'rgba(255,255,255,0.9)' : DS.onSurfaceVar}
          />
        </PillButton>
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  /* Section cards — tonal lift, zero borders */
  sectionCard: {
    backgroundColor: DS.surfContainer,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: DS.ambientShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: DS.surfContainerHi,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.bold,
    color: DS.onSurface,
    flex: 1,
  },
  sectionHint: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: DS.onSurfaceVar,
    lineHeight: 17,
    marginTop: -4,
  },

  /* Gender */
  genderGrid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  genderBtn: {
    flex: 1,
    minWidth: '28%',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    gap: 4,
  },
  genderBtnUnselected: {
    backgroundColor: DS.surfContainerHi,
  },
  genderBtnSelected: {
    backgroundColor: DS.primary,
    shadowColor: DS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  genderEmoji: {
    fontSize: 26,
  },
  genderLabel: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: DS.onSurface,
  },
  genderLabelSelected: {
    color: DS.onPrimary,
    fontFamily: TYPOGRAPHY.family.bold,
  },

  /* Activity */
  activityGrid: {
    gap: 8,
  },
  activityBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  activityBtnUnselected: {
    backgroundColor: DS.surfContainerHi,
  },
  activityBtnSelected: {
    backgroundColor: DS.primary,
    shadowColor: DS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  },
  activityIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  activityLabel: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.bold,
    color: DS.onSurface,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  activityLabelSelected: {
    color: DS.onPrimary,
  },
  activityDesc: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.regular,
    color: DS.onSurfaceVar,
    lineHeight: 15,
    textAlign: 'center',
  },
  activityDescSelected: {
    color: 'rgba(255,255,255,0.75)',
  },

  /* Ft/in height inputs */
  ftInContainer: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: DS.onSurface,
    letterSpacing: -0.1,
  },
  ftInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ftInSurface: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.surfLow,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: DS.ambientShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
  ftInInput: {
    flex: 1,
    fontSize: 22,
    fontFamily: TYPOGRAPHY.family.bold,
    color: DS.onSurface,
    textAlign: 'center',
    minHeight: 44,
    paddingVertical: 4,
  },
  ftInUnit: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: DS.primary,
    marginLeft: 6,
  },

  /* Unit toggle pill group */
  unitGroup: {
    flexDirection: 'row',
    backgroundColor: DS.surfContainerHi,
    borderRadius: 14,
    overflow: 'hidden',
  },
  unitBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitBtnActive: {
    backgroundColor: DS.primary,
  },
  unitBtnLeft: {
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  unitBtnRight: {
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
  },
  unitBtnText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: DS.onSurface,
  },
  unitBtnTextActive: {
    color: '#ffffff',
  },

  /* Error */
  errorMsg: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.medium,
    color: DS.error,
    backgroundColor: DS.errorTint,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  spacer: { minHeight: 12 },

  /* Navigation row */
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: DS.surfContainerHi,
    flex: 1,
  },
  backBtnText: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: DS.onSurface,
  },
  continueWrapper: {
    flex: 2,
    borderRadius: 999,
    shadowColor: '#1c6d25',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  continueWrapperDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  pillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 999,
    overflow: 'hidden',
  },
  continueBtnText: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  continueBtnTextDisabled: {
    color: DS.onSurfaceVar,
  },
});

export default Step2Screen;
