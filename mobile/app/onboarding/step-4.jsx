/**
 * Onboarding Step 4 — Premium Wellness Design
 *
 * - White macro cards with gentle shadows on cream (#F8FBF9)
 * - Refined mint-green primary (#0F9B5E) hero gradient
 * - Hero: deep green → mint gradient with decorative circles
 * - Macro cards: white surface, colored icon bg, macro-specific accent colors
 * - Water card: soft cyan-tinted gradient (#E0F7FA → #B2EBF2)
 * - Info note: #ECFDF5 background, no borders
 * - Get Started: pill 999, gradient #0F9B5E → #34D399
 * - Spring animations: stiffness 300, damping 20
 * - Gentle shadows: rgba(0,0,0,0.06)
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  ActivityIndicator,
  Alert,
  AccessibilityInfo,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import GoalEditSheet from '../../components/onboarding/GoalEditSheet';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { ONBOARDING_COPY, A11Y_LABELS } from '../../constants/onboardingConfig';
import { MACRO_COLORS, TYPOGRAPHY } from '../../constants/premiumTheme';

const DS = {
  surface:          '#F8FBF9',
  surfContainer:    '#FFFFFF',
  surfContainerHi:  '#F0F5F2',
  surfLow:          '#FFFFFF',
  primary:          '#0F9B5E',
  primaryLight:     '#34D399',
  primaryDark:      '#0A7A49',
  onSurface:        '#111827',
  onSurfaceVar:     'rgba(17, 24, 39, 0.45)',
  onPrimary:        '#FFFFFF',
  ambientShadow:    'rgba(0, 0, 0, 0.06)',
};

/* ─── Macro Card ─── */
const MacroCard = ({ label, value, unit, iconName, color, lightColor, onEdit, delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay,
        useNativeDriver: true,
        stiffness: 300,
        damping: 20,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay]);

  return (
    <Animated.View style={[styles.macroCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onEdit?.();
        }}
        style={({ pressed }) => [
          styles.macroCardInner,
          pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
        ]}
      >
        <View style={[styles.macroIconBg, { backgroundColor: lightColor }]}>
          <Ionicons name={iconName} size={20} color={color} />
        </View>
        <Text style={styles.macroLabel}>{label}</Text>
        <View style={styles.macroValueRow}>
          <Text style={[styles.macroValue, { color }]}>{value ?? '--'}</Text>
          <Text style={styles.macroUnit}>{unit}</Text>
        </View>
        <View style={styles.macroEditHint}>
          <Ionicons name="pencil-outline" size={10} color={DS.onSurfaceVar} />
          <Text style={styles.macroEditText}>tap to edit</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

/* ─── Water Card ─── */
const WaterCard = ({ value, onEdit, delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay, useNativeDriver: true }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay]);

  return (
    <Animated.View style={[styles.waterCard, { opacity: fadeAnim }]}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onEdit?.();
        }}
        style={({ pressed }) => pressed && { opacity: 0.9 }}
      >
        <LinearGradient
          colors={['#E0F7FA', '#B2EBF2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.waterGradient}
        >
          <View style={styles.waterIconBg}>
            <Ionicons name="water" size={24} color="#0e6b8c" />
          </View>
          <View style={styles.waterInfo}>
            <Text style={styles.waterLabel}>Daily Hydration</Text>
            <View style={styles.waterValueRow}>
              <Text style={styles.waterValue}>{value ?? '--'}</Text>
              <Text style={styles.waterUnit}>liters</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={DS.primary} />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

/* ─── Main screen ─── */
const Step4Screen = () => {
  const {
    step1Data,
    step4Data,
    calculatedGoals,
    calculateGoals,
    updateGoals,
    goToPreviousStep,
    completeOnboarding,
    isSaving,
    error,
  } = useOnboarding();

  const [editingGoal, setEditingGoal] = useState(null);

  const heroFadeAnim  = useRef(new Animated.Value(0)).current;
  const heroScaleAnim = useRef(new Animated.Value(0.95)).current;
  const btnSlideAnim  = useRef(new Animated.Value(50)).current;
  const btnScale      = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!calculatedGoals) calculateGoals();
  }, [calculatedGoals, calculateGoals]);

  useEffect(() => {
    if (calculatedGoals) {
      Animated.parallel([
        Animated.timing(heroFadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(heroScaleAnim, { toValue: 1, useNativeDriver: true, stiffness: 300, damping: 20 }),
        Animated.timing(btnSlideAnim, { toValue: 0, duration: 600, delay: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [calculatedGoals, heroFadeAnim, heroScaleAnim, btnSlideAnim]);

  useEffect(() => {
    if (error && editingGoal !== 'saving') {
      Alert.alert('Error', error, [{ text: 'OK' }]);
    }
  }, [error, editingGoal]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(A11Y_LABELS.step4);
  }, []);

  const handleSaveGoalEdit = (newValue) => {
    updateGoals({ ...step4Data, [editingGoal]: newValue });
    setEditingGoal(null);
  };

  const handleGetStarted = async () => {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (_) {}
    try {
      await completeOnboarding();
    } catch (err) {
      const msg = err.message || 'Failed to complete onboarding. Please try again.';
      console.error('[Step4] completeOnboarding failed:', msg);
      if (typeof Alert !== 'undefined' && Alert.alert) Alert.alert('Error', msg);
    }
  };

  const springBtn = (to) =>
    Animated.spring(btnScale, { toValue: to, useNativeDriver: true, stiffness: 300, damping: 20 }).start();

  /* Loading state */
  if (!calculatedGoals) {
    return (
      <OnboardingLayout
        step={4}
        totalSteps={4}
        title={ONBOARDING_COPY.step4.title}
        subtitle={ONBOARDING_COPY.step4.subtitle}
        onBack={goToPreviousStep}
        canGoBack={true}
      >
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconBg}>
            <ActivityIndicator size="large" color={DS.primary} />
          </View>
          <Text style={styles.loadingTitle}>Calculating Your Plan</Text>
          <Text style={styles.loadingSubtitle}>Personalizing your nutrition targets…</Text>
        </View>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      step={4}
      totalSteps={4}
      title={ONBOARDING_COPY.step4.title}
      subtitle={ONBOARDING_COPY.step4.subtitle}
      onBack={goToPreviousStep}
      canGoBack={true}
      scrollEnabled={true}
    >
      {/* ── Hero calorie card ── */}
      <Animated.View
        style={[
          styles.heroCard,
          { opacity: heroFadeAnim, transform: [{ scale: heroScaleAnim }] },
        ]}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setEditingGoal('dailyCalories');
          }}
          style={({ pressed }) => pressed && { opacity: 0.95 }}
        >
          <LinearGradient
            colors={[DS.primaryDark, DS.primary, DS.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            {/* Decorative circles bleed off edges */}
            <View style={styles.heroDecor1} />
            <View style={styles.heroDecor2} />
            <View style={styles.heroDecor3} />

            <View style={styles.heroContent}>
              <View style={styles.heroHeader}>
                <View style={styles.heroBadge}>
                  <Ionicons name="sparkles" size={13} color={DS.primary} />
                  <Text style={styles.heroBadgeText}>Your Daily Target</Text>
                </View>
                <View style={styles.heroEditBadge}>
                  <Ionicons name="pencil" size={12} color="rgba(255,255,255,0.9)" />
                </View>
              </View>

              <View style={styles.heroValueSection}>
                <Text style={styles.heroValue}>{step4Data.dailyCalories ?? '--'}</Text>
                <Text style={styles.heroUnit}>calories</Text>
              </View>

              <View style={styles.heroFooter}>
                {[
                  { label: 'BMR', value: calculatedGoals?.bmr ?? '--' },
                  { label: 'TDEE', value: calculatedGoals?.tdee ?? '--' },
                  {
                    label: 'Goal',
                    value: step1Data.primaryGoal === 'lose' ? 'Deficit'
                           : step1Data.primaryGoal === 'gain' ? 'Surplus' : 'Maintain',
                  },
                ].map(({ label, value }, i, arr) => (
                  <React.Fragment key={label}>
                    <View style={styles.heroMetric}>
                      <Text style={styles.heroMetricLabel}>{label}</Text>
                      <Text style={styles.heroMetricValue}>{value}</Text>
                    </View>
                    {i < arr.length - 1 && <View style={styles.heroMetricDivider} />}
                  </React.Fragment>
                ))}
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Daily Macros</Text>
        <Text style={styles.sectionSubtitle}>Tap any card to adjust</Text>
      </View>

      {/* ── Macro cards grid ── */}
      <View style={styles.macroGrid}>
        <MacroCard
          label="Protein"
          value={step4Data.proteinG}
          unit="g"
          iconName="barbell"
          color={MACRO_COLORS.protein.base}
          lightColor="#F3E8FF"
          onEdit={() => setEditingGoal('proteinG')}
          delay={100}
        />
        <MacroCard
          label="Carbs"
          value={step4Data.carbsG}
          unit="g"
          iconName="flash"
          color={MACRO_COLORS.carbs.base}
          lightColor="#DBEAFE"
          onEdit={() => setEditingGoal('carbsG')}
          delay={200}
        />
        <MacroCard
          label="Fats"
          value={step4Data.fatsG}
          unit="g"
          iconName="water-outline"
          color={MACRO_COLORS.fat.base}
          lightColor="#FEF3C7"
          onEdit={() => setEditingGoal('fatsG')}
          delay={300}
        />
      </View>

      {/* ── Water card ── */}
      <WaterCard
        value={step4Data.waterLiters}
        onEdit={() => setEditingGoal('waterLiters')}
        delay={400}
      />

      {/* ── Info note ── */}
      <View style={styles.infoNote}>
        <Ionicons name="information-circle-outline" size={16} color={DS.onSurfaceVar} />
        <Text style={styles.infoNoteText}>
          These targets are calculated based on your profile. You can adjust them anytime in Settings.
        </Text>
      </View>

      {/* ── Get Started pill ── */}
      <Animated.View style={[styles.btnContainer, { transform: [{ translateY: btnSlideAnim }, { scale: btnScale }] }]}>
        <Pressable
          onPress={handleGetStarted}
          onPressIn={() => springBtn(0.96)}
          onPressOut={() => springBtn(1)}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel="Complete onboarding and get started"
        >
          <LinearGradient
            colors={isSaving ? [DS.surfContainerHi, DS.surfContainerHi] : [DS.primary, DS.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.getStartedBtn}
          >
            {isSaving ? (
              <>
                <Text style={styles.getStartedText}>Setting up…</Text>
                <ActivityIndicator color="#FFFFFF" size="small" />
              </>
            ) : (
              <>
                <Text style={styles.getStartedText}>Let's Go!</Text>
                <View style={styles.rocketBg}>
                  <Ionicons name="rocket" size={18} color="white" />
                </View>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* Goal edit sheets */}
      <GoalEditSheet
        visible={editingGoal === 'dailyCalories'}
        onClose={() => setEditingGoal(null)}
        onSave={handleSaveGoalEdit}
        label="Daily Calories"
        currentValue={step4Data.dailyCalories}
        min={500} max={10000} step={50} unit="kcal"
        context="Your total daily energy intake target"
        color={DS.primary}
      />
      <GoalEditSheet
        visible={editingGoal === 'proteinG'}
        onClose={() => setEditingGoal(null)}
        onSave={handleSaveGoalEdit}
        label="Protein"
        currentValue={step4Data.proteinG}
        min={0} max={500} step={5} unit="g"
        context="Essential for muscle repair and growth"
        color={MACRO_COLORS.protein.base}
      />
      <GoalEditSheet
        visible={editingGoal === 'carbsG'}
        onClose={() => setEditingGoal(null)}
        onSave={handleSaveGoalEdit}
        label="Carbohydrates"
        currentValue={step4Data.carbsG}
        min={0} max={1000} step={5} unit="g"
        context="Your body's primary energy source"
        color={MACRO_COLORS.carbs.base}
      />
      <GoalEditSheet
        visible={editingGoal === 'fatsG'}
        onClose={() => setEditingGoal(null)}
        onSave={handleSaveGoalEdit}
        label="Fats"
        currentValue={step4Data.fatsG}
        min={0} max={300} step={5} unit="g"
        context="Important for hormones and brain health"
        color={MACRO_COLORS.fat.base}
      />
      <GoalEditSheet
        visible={editingGoal === 'waterLiters'}
        onClose={() => setEditingGoal(null)}
        onSave={handleSaveGoalEdit}
        label="Water Intake"
        currentValue={step4Data.waterLiters}
        min={0.5} max={10} step={0.5} unit="L"
        context="Stay hydrated throughout the day"
        color="#0e6b8c"
      />
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  /* Loading */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  loadingIconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: 'rgba(0,0,0,1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  loadingTitle: {
    fontSize: 22,
    fontFamily: TYPOGRAPHY.family.bold,
    color: DS.onSurface,
    letterSpacing: -0.5,
  },
  loadingSubtitle: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.regular,
    color: DS.onSurfaceVar,
    textAlign: 'center',
    lineHeight: 20,
  },

  /* Hero card */
  heroCard: {
    marginBottom: 22,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: DS.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 10,
  },
  heroGradient: {
    padding: 26,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  /* Decorative circles bleed off edges */
  heroDecor1: {
    position: 'absolute',
    top: -45,
    right: -45,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroDecor2: {
    position: 'absolute',
    bottom: -35,
    left: -35,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroDecor3: {
    position: 'absolute',
    top: 35,
    right: 65,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  heroBadgeText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: DS.primaryDark,
  },
  heroEditBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.20)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroValueSection: {
    alignItems: 'center',
    marginBottom: 18,
  },
  heroValue: {
    fontSize: 68,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
    letterSpacing: -3,
    lineHeight: 74,
  },
  heroUnit: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.medium,
    color: 'rgba(255,255,255,0.80)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  heroMetric: {
    alignItems: 'center',
    flex: 1,
  },
  heroMetricLabel: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  heroMetricValue: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
  },
  heroMetricDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  /* Section header */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: TYPOGRAPHY.family.bold,
    color: DS.onSurface,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: DS.onSurfaceVar,
  },

  /* Macro grid */
  macroGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  macroCard: {
    flex: 1,
  },
  macroCardInner: {
    backgroundColor: DS.surfLow,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 5,
    shadowColor: 'rgba(0,0,0,1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  macroIconBg: {
    width: 44,
    height: 44,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  macroLabel: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: DS.onSurfaceVar,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  macroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  macroValue: {
    fontSize: 24,
    fontFamily: TYPOGRAPHY.family.bold,
    letterSpacing: -0.5,
  },
  macroUnit: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.medium,
    color: DS.onSurfaceVar,
  },
  macroEditHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
    opacity: 0.50,
  },
  macroEditText: {
    fontSize: 9,
    fontFamily: TYPOGRAPHY.family.regular,
    color: DS.onSurfaceVar,
  },

  /* Water card */
  waterCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: 'rgba(0,0,0,1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  waterGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
    borderRadius: 20,
  },
  waterIconBg: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterInfo: {
    flex: 1,
  },
  waterLabel: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#0277BD',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  waterValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  waterValue: {
    fontSize: 30,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#01579B',
    letterSpacing: -1,
  },
  waterUnit: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.medium,
    color: '#0277BD',
    opacity: 0.80,
  },

  /* Info note */
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 16,
    marginBottom: 22,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: DS.onSurfaceVar,
    lineHeight: 19,
  },

  /* Get Started pill */
  btnContainer: {
    marginBottom: 8,
    borderRadius: 999,
    shadowColor: DS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 20,
    elevation: 10,
  },
  getStartedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 19,
    paddingHorizontal: 32,
    borderRadius: 999,
    gap: 12,
    overflow: 'hidden',
  },
  getStartedText: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  rocketBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Step4Screen;
