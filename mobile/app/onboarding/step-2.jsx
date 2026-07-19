/**
 * Onboarding Step 2 — matches the warm-cream / deep-green editorial
 * brand established in the auth flow (see components/auth).
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
  ACTIVITY_CHECKLIST,
  GENDERS,
  VALIDATION_RANGES,
  ONBOARDING_COPY,
  A11Y_LABELS,
} from '../../constants/onboardingConfig';
import { AUTH_COLORS } from '../../components/auth/constants';
import { computeActivityLevel } from '../../utils/onboardingCalculations';

const DS = {
  surfContainer:    'rgba(255, 255, 255, 0.82)',
  surfContainerHi:  'rgba(107, 78, 255, 0.05)',
  primary:          AUTH_COLORS.primary,
  primaryLight:     AUTH_COLORS.primaryLight,
  onSurface:        AUTH_COLORS.ink,
  onSurfaceVar:     AUTH_COLORS.muted,
  onPrimary:        AUTH_COLORS.white,
  error:            AUTH_COLORS.danger,
  errorTint:        AUTH_COLORS.dangerBg,
};

const GENDER_META = {
  female: { icon: 'woman-outline', color: '#C7638A', bg: 'rgba(199, 99, 138, 0.10)' },
  male:   { icon: 'man-outline',   color: '#4A7BA6', bg: 'rgba(74, 123, 166, 0.10)' },
  other:  { icon: 'male-female-outline', color: '#8767B8', bg: 'rgba(135, 103, 184, 0.10)' },
};

const ACTIVITY_META = {
  sedentary:        { icon: 'body-outline',    color: '#6B94B3' },
  lightly_active:   { icon: 'walk-outline',    color: '#5FA88C' },
  moderate:         { icon: 'bicycle-outline', color: AUTH_COLORS.primary },
  very_active:      { icon: 'barbell-outline', color: '#C1832B' },
  extremely_active: { icon: 'flash-outline',   color: '#C1642B' },
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
          colors={disabled ? ['#E5E1D8', '#DAD5CA'] : colors}
          start={{ x: 0, y: 0.2 }}
          end={{ x: 1, y: 0.8 }}
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

  const toggleActivityItem = (itemId) => {
    const current = step2Data.activityChecklist || [];
    const next = current.includes(itemId)
      ? current.filter((id) => id !== itemId)
      : [...current, itemId];
    updateStepData('step2', {
      activityChecklist: next,
      activityLevel: computeActivityLevel(next, ACTIVITY_CHECKLIST),
    });
  };

  const resolvedActivity = ACTIVITY_LEVELS.find((a) => a.id === step2Data.activityLevel);

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
            <Ionicons name="body" size={14} color={DS.primary} />
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
          icon="calendar-outline"
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
          icon="scale-outline"
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
            icon="resize-outline"
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
            <Ionicons name="person" size={14} color={DS.primary} />
          </View>
          <Text style={styles.sectionTitle}>{ONBOARDING_COPY.step2.genderLabel}</Text>
        </View>
        <Text style={styles.sectionHint}>Required for accurate health calculations and nutrition targets</Text>

        <View style={styles.genderGrid}>
          {GENDERS.map((gender) => {
            const isSelected = step2Data.gender === gender.id;
            const meta = GENDER_META[gender.id] || GENDER_META.other;
            return (
              <Pressable
                key={gender.id}
                onPress={() => updateStepData('step2', { gender: gender.id })}
                style={[
                  styles.genderCard,
                  { borderColor: isSelected ? meta.color : 'rgba(15, 36, 31, 0.08)' },
                  isSelected && { backgroundColor: `${meta.color}14` },
                ]}
                accessibilityRole="radio"
                accessibilityLabel={gender.label}
                accessibilityState={{ checked: isSelected }}
              >
                {isSelected && (
                  <View style={[styles.checkBadge, { backgroundColor: meta.color }]}>
                    <Ionicons name="checkmark" size={8} color="#FFFFFF" />
                  </View>
                )}
                <View style={[styles.genderIconBg, { backgroundColor: isSelected ? `${meta.color}26` : meta.bg }]}>
                  <Ionicons name={meta.icon} size={18} color={meta.color} />
                </View>
                <Text style={[styles.genderLabel, isSelected && { color: meta.color }]}>
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
            <Ionicons name="flame" size={14} color={DS.primary} />
          </View>
          <Text style={styles.sectionTitle}>{ONBOARDING_COPY.step2.activityLabel}</Text>
        </View>
        <Text style={styles.sectionHint}>{ONBOARDING_COPY.step2.activityHint}</Text>

        <View style={styles.activityGrid}>
          {ACTIVITY_CHECKLIST.map((item) => {
            const isChecked = (step2Data.activityChecklist || []).includes(item.id);
            return (
              <Pressable
                key={item.id}
                onPress={() => toggleActivityItem(item.id)}
                style={[
                  styles.activityTile,
                  { borderColor: isChecked ? item.color : 'rgba(15, 36, 31, 0.08)' },
                  isChecked && { backgroundColor: `${item.color}14` },
                ]}
                accessibilityRole="checkbox"
                accessibilityLabel={`${item.label}, ${item.description}`}
                accessibilityState={{ checked: isChecked }}
              >
                {isChecked && (
                  <View style={[styles.activityCheckBadge, { backgroundColor: item.color }]}>
                    <Ionicons name="checkmark" size={8} color="#FFFFFF" />
                  </View>
                )}
                <View style={[
                  styles.activityTileIconBg,
                  { backgroundColor: isChecked ? `${item.color}26` : `${item.color}12` },
                ]}>
                  <Ionicons name={item.icon} size={17} color={item.color} />
                </View>
                <Text style={[styles.activityTileLabel, isChecked && { color: item.color }]} numberOfLines={2}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errors.activityLevel ? <Text style={styles.errorMsg}>{errors.activityLevel}</Text> : null}

        {resolvedActivity && (
          <View style={styles.activityResultBanner}>
            <View style={[
              styles.activityResultIconBg,
              { backgroundColor: `${(ACTIVITY_META[resolvedActivity.id] || ACTIVITY_META.moderate).color}20` },
            ]}>
              <Ionicons
                name={(ACTIVITY_META[resolvedActivity.id] || ACTIVITY_META.moderate).icon}
                size={14}
                color={(ACTIVITY_META[resolvedActivity.id] || ACTIVITY_META.moderate).color}
              />
            </View>
            <View style={styles.activityResultText}>
              <Text style={styles.activityResultLabel}>Your activity level: {resolvedActivity.label}</Text>
              <Text style={styles.activityResultDesc}>{resolvedActivity.description}</Text>
            </View>
          </View>
        )}
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
          <Ionicons name="arrow-back" size={16} color={DS.onSurface} />
          <Text style={styles.backBtnText}>{ONBOARDING_COPY.step2.backBtn}</Text>
        </Pressable>

        {/* Continue — vivid gradient pill */}
        <PillButton
          onPress={handleContinue}
          disabled={!isFormValid}
          colors={[AUTH_COLORS.primaryLight, AUTH_COLORS.primary, AUTH_COLORS.primaryDeep]}
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
            size={16}
            color={isFormValid ? AUTH_COLORS.white : DS.onSurfaceVar}
          />
        </PillButton>
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  /* Section cards — glass surface, gentle shadow */
  sectionCard: {
    backgroundColor: DS.surfContainer,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(15, 36, 31, 0.08)',
    padding: 13,
    gap: 9,
    shadowColor: 'rgba(7, 19, 30, 0.16)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(107, 78, 255, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 13.5,
    fontFamily: 'DMSans_700Bold',
    color: DS.onSurface,
    flex: 1,
    letterSpacing: -0.2,
  },
  sectionHint: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: DS.onSurfaceVar,
    lineHeight: 15,
    marginTop: -3,
  },

  /* Gender — tinted cards with icon bubble */
  genderGrid: {
    flexDirection: 'row',
    gap: 7,
  },
  genderCard: {
    flex: 1,
    position: 'relative',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderRadius: 13,
    borderWidth: 1.5,
    backgroundColor: DS.surfContainerHi,
    alignItems: 'center',
    gap: 6,
  },
  genderIconBg: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderLabel: {
    fontSize: 10.5,
    fontFamily: 'DMSans_700Bold',
    color: DS.onSurface,
    textAlign: 'center',
    lineHeight: 13,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 15,
    height: 15,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },

  /* Activity — checklist tile grid */
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  activityTile: {
    position: 'relative',
    width: '48.3%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 13,
    borderWidth: 1.5,
    backgroundColor: DS.surfContainerHi,
    alignItems: 'center',
    gap: 6,
  },
  activityTileIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityTileLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_700Bold',
    color: DS.onSurface,
    textAlign: 'center',
    lineHeight: 14,
    letterSpacing: -0.1,
  },
  activityCheckBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 15,
    height: 15,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },

  /* Activity — computed result banner */
  activityResultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: 'rgba(107, 78, 255, 0.06)',
    borderRadius: 12,
    padding: 9,
  },
  activityResultIconBg: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  activityResultText: {
    flex: 1,
  },
  activityResultLabel: {
    fontSize: 11.5,
    fontFamily: 'DMSans_700Bold',
    color: DS.onSurface,
    letterSpacing: -0.1,
  },
  activityResultDesc: {
    fontSize: 10,
    fontFamily: 'DMSans_400Regular',
    color: DS.onSurfaceVar,
    marginTop: 1,
  },

  /* Ft/in height inputs */
  ftInContainer: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
    color: DS.onSurface,
    letterSpacing: -0.1,
  },
  ftInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ftInSurface: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.surfContainerHi,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ftInInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: DS.onSurface,
    textAlign: 'center',
    minHeight: 34,
    paddingVertical: 2,
  },
  ftInUnit: {
    fontSize: 11,
    fontFamily: 'DMSans_700Bold',
    color: DS.primary,
    marginLeft: 4,
  },

  /* Unit toggle pill group */
  unitGroup: {
    flexDirection: 'row',
    backgroundColor: DS.surfContainerHi,
    borderRadius: 11,
    overflow: 'hidden',
  },
  unitBtn: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitBtnActive: {
    backgroundColor: DS.primary,
  },
  unitBtnLeft: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  unitBtnRight: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  unitBtnText: {
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
    color: DS.onSurface,
  },
  unitBtnTextActive: {
    color: '#FFFFFF',
  },

  /* Error */
  errorMsg: {
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
    color: DS.error,
    backgroundColor: DS.errorTint,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  spacer: { minHeight: 4 },

  /* Navigation row */
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    flex: 1,
  },
  backBtnText: {
    fontSize: 13,
    fontFamily: 'DMSans_700Bold',
    color: DS.onSurface,
  },
  continueWrapper: {
    flex: 2,
    borderRadius: 999,
    shadowColor: 'rgba(3, 21, 35, 0.34)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.20,
    shadowRadius: 14,
    elevation: 5,
  },
  continueWrapperDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  pillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    overflow: 'hidden',
  },
  continueBtnText: {
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  continueBtnTextDisabled: {
    color: DS.onSurfaceVar,
  },
});

export default Step2Screen;
