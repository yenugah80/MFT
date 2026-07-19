/**
 * Onboarding Step 4 — matches the warm-cream / deep-green editorial
 * brand established in the auth flow (see components/auth).
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
import { useRouter } from 'expo-router';
import { ONBOARDING_COPY, A11Y_LABELS, ACTIVITY_LEVELS, GENDERS } from '../../constants/onboardingConfig';
import { getGoalContext } from '../../utils/onboardingCalculations';
import { AUTH_COLORS } from '../../components/auth/constants';

const DS = {
  surfContainer:    'rgba(255, 255, 255, 0.82)',
  surfContainerHi:  'rgba(107, 78, 255, 0.05)',
  surfLow:          '#FFFFFF',
  primary:          AUTH_COLORS.primary,
  onSurface:        AUTH_COLORS.ink,
  onSurfaceVar:     AUTH_COLORS.muted,
};

// Bold, saturated palette for the Targets card only — scoped here so it doesn't
// affect other screens that share the app-wide (muted) MACRO_COLORS palette.
const TARGET_COLORS = {
  protein: { base: '#4C63D2', light: '#DCE3FA' },
  carbs:   { base: '#2FA35C', light: '#D7F3E1' },
  fats:    { base: '#E0643C', light: '#FCE2D6' },
  water:   { base: '#0284C7', light: '#D6F1FB' },
};

/* ─── Macro Row — one row in the unified targets card (also used for water) ─── */
const MacroRow = ({ label, value, pct, color, lightColor, iconName, caption, unit = 'g', onEdit, isLast }) => (
  <Pressable
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onEdit?.();
    }}
    style={({ pressed }) => [
      styles.macroRow,
      !isLast && styles.macroRowDivider,
      pressed && { opacity: 0.6 },
    ]}
    accessibilityRole="button"
    accessibilityLabel={`${label}, ${value ?? '--'} ${unit}, ${typeof pct === 'number' ? `${pct} percent of calories` : ''}. Double tap to edit.`}
  >
    <View style={[styles.macroRowIconBg, { backgroundColor: lightColor }]}>
      <Ionicons name={iconName} size={18} color={color} />
    </View>
    <View style={styles.macroRowText}>
      <View style={styles.macroRowTopLine}>
        <Text style={styles.macroRowLabel}>{label}</Text>
        {typeof pct === 'number' && <Text style={[styles.macroRowPct, { color }]}>{pct}%</Text>}
      </View>
      {!!caption && <Text style={styles.macroRowCaption} numberOfLines={2}>{caption}</Text>}
    </View>
    <View style={styles.macroRowValueBlock}>
      <Text style={[styles.macroRowValue, { color }]}>{value ?? '--'}</Text>
      <Text style={styles.macroRowUnit}>{unit}</Text>
    </View>
    <Ionicons name="chevron-forward" size={15} color={DS.onSurfaceVar} style={{ opacity: 0.5, marginLeft: 2 }} />
  </Pressable>
);

/* ─── Compact profile chip strip — lives inside the hero card ─── */
const ProfileChipStrip = ({ step2Data }) => {
  const genderLabel = GENDERS.find((g) => g.id === step2Data.gender)?.label || step2Data.gender;
  const activity = ACTIVITY_LEVELS.find((a) => a.id === step2Data.activityLevel);
  const heightDisplay = step2Data.heightUnit === 'ft'
    ? `${step2Data.heightFeet}'${step2Data.heightInches}"`
    : `${step2Data.height} cm`;

  const chips = [
    `${step2Data.age} yrs`,
    `${step2Data.weight} ${step2Data.weightUnit}`,
    heightDisplay,
    genderLabel,
    activity?.shortLabel || activity?.label,
  ].filter((label) => label && label !== 'undefined');

  return (
    <View style={styles.profileChipsRow}>
      {chips.map((label, i) => (
        <React.Fragment key={label}>
          <Text style={styles.profileChipText}>{label}</Text>
          {i < chips.length - 1 && <Text style={styles.profileChipDot}>·</Text>}
        </React.Fragment>
      ))}
    </View>
  );
};

/* ─── Main screen ─── */
const Step4Screen = () => {
  const {
    step1Data,
    step2Data,
    step4Data,
    calculatedGoals,
    calculateGoals,
    updateGoals,
    goToPreviousStep,
    completeOnboarding,
    resetOnboarding,
    isSaving,
    error,
  } = useOnboarding();

  const router = useRouter();
  const [editingGoal, setEditingGoal] = useState(null);
  const redirectingRef = useRef(false);

  const heroFadeAnim  = useRef(new Animated.Value(0)).current;
  const heroScaleAnim = useRef(new Animated.Value(0.95)).current;
  const btnSlideAnim  = useRef(new Animated.Value(50)).current;
  const btnScale      = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (calculatedGoals || redirectingRef.current) return;
    const weight = parseFloat(step2Data?.weight);
    const age = parseInt(step2Data?.age, 10);
    const hasStep2 = !isNaN(weight) && weight > 0 && !isNaN(age) && age > 0;
    if (!hasStep2) {
      // Stale draft — step 2 never completed. Reset once (guard prevents re-entry
      // after resetOnboarding clears step2Data and triggers a re-render).
      redirectingRef.current = true;
      resetOnboarding().then(() => router.replace('/onboarding/step-2'));
    } else {
      calculateGoals();
    }
  }, [calculatedGoals, calculateGoals, step2Data, router, resetOnboarding]);

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
    if (error && !isSaving) {
      Alert.alert('Error', error, [{ text: 'OK' }]);
    }
  }, [error, isSaving]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(A11Y_LABELS.step4);
  }, []);

  const handleSaveGoalEdit = (newValue) => {
    updateGoals({ ...step4Data, [editingGoal]: newValue });
    setEditingGoal(null);
  };

  const handleGetStarted = async () => {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (_) {}
    // completeOnboarding handles errors internally via SAVE_ERROR dispatch.
    // The useEffect above shows the Alert when state.error is set.
    await completeOnboarding();
  };

  const springBtn = (to) =>
    Animated.spring(btnScale, { toValue: to, useNativeDriver: true, stiffness: 300, damping: 20 }).start();

  const { calorieContext, proteinContext } = calculatedGoals
    ? getGoalContext(calculatedGoals, { primaryGoal: step1Data.primaryGoal })
    : { calorieContext: '', proteinContext: '' };

  // Macro split is derived from this user's own gram targets, not a fixed ratio.
  const totalCalories = step4Data.dailyCalories || 1;
  const proteinPct = Math.round(((step4Data.proteinG || 0) * 4 / totalCalories) * 100);
  const carbsPct = Math.round(((step4Data.carbsG || 0) * 4 / totalCalories) * 100);
  const fatsPct = Math.round(((step4Data.fatsG || 0) * 9 / totalCalories) * 100);

  const isHighActivity = step2Data?.activityLevel === 'very_active' || step2Data?.activityLevel === 'extremely_active';
  const carbsContext = isHighActivity
    ? 'Extra fuel for your training volume'
    : step1Data.primaryGoal === 'lose'
      ? 'Steady energy through your deficit'
      : "Your body's primary energy source";

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
            colors={[AUTH_COLORS.heroDark, '#170D33', '#0A0616']}
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
                  <Text style={styles.heroBadgeText}>Personalized For You</Text>
                </View>
                <View style={styles.heroEditBadge}>
                  <Ionicons name="pencil" size={12} color="rgba(255,255,255,0.9)" />
                </View>
              </View>

              <ProfileChipStrip step2Data={step2Data} />

              <View style={styles.heroValueSection}>
                <Text style={styles.heroValue}>{step4Data.dailyCalories ?? '--'}</Text>
                <Text style={styles.heroUnit}>calories</Text>
              </View>

              {!!calorieContext && (
                <Text style={styles.heroContext}>{calorieContext}</Text>
              )}

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

        {/* ── Targets — seamless continuation of the same card ── */}
        <View style={styles.macroSection}>
          <View style={styles.macroSectionHeader}>
            <Text style={styles.macroSectionTitle}>Your Targets</Text>
            <Text style={styles.macroSectionSubtitle}>Tap to adjust</Text>
          </View>

          <View style={styles.macroBarTrack}>
            <View style={[styles.macroBarFill, { flex: Math.max(proteinPct, 1), backgroundColor: TARGET_COLORS.protein.base }]} />
            <View style={[styles.macroBarFill, { flex: Math.max(carbsPct, 1), backgroundColor: TARGET_COLORS.carbs.base }]} />
            <View style={[styles.macroBarFill, { flex: Math.max(fatsPct, 1), backgroundColor: TARGET_COLORS.fats.base }]} />
          </View>

          <View style={styles.macroRowsGroup}>
            <MacroRow
              label="Protein"
              value={step4Data.proteinG}
              pct={proteinPct}
              iconName="barbell"
              color={TARGET_COLORS.protein.base}
              lightColor={TARGET_COLORS.protein.light}
              caption={proteinContext}
              onEdit={() => setEditingGoal('proteinG')}
            />
            <MacroRow
              label="Carbs"
              value={step4Data.carbsG}
              pct={carbsPct}
              iconName="flash"
              color={TARGET_COLORS.carbs.base}
              lightColor={TARGET_COLORS.carbs.light}
              caption={carbsContext}
              onEdit={() => setEditingGoal('carbsG')}
            />
            <MacroRow
              label="Fats"
              value={step4Data.fatsG}
              pct={fatsPct}
              iconName="nutrition-outline"
              color={TARGET_COLORS.fats.base}
              lightColor={TARGET_COLORS.fats.light}
              caption="Supports hormones & nutrient absorption"
              onEdit={() => setEditingGoal('fatsG')}
            />
            <MacroRow
              label="Water"
              value={step4Data.waterLiters}
              iconName="water"
              color={TARGET_COLORS.water.base}
              lightColor={TARGET_COLORS.water.light}
              caption="Stay hydrated throughout the day"
              unit="L"
              onEdit={() => setEditingGoal('waterLiters')}
              isLast
            />
          </View>
        </View>
      </Animated.View>

      {/* ── Fine-tune hint ── */}
      <Text style={styles.finetuneHint}>
        Tap any target to fine-tune it — you can always adjust later in Settings.
      </Text>

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
            colors={isSaving ? ['#E5E1D8', '#DAD5CA'] : [AUTH_COLORS.primaryLight, AUTH_COLORS.primary, AUTH_COLORS.primaryDeep]}
            start={{ x: 0, y: 0.2 }}
            end={{ x: 1, y: 0.8 }}
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
        color={TARGET_COLORS.protein.base}
      />
      <GoalEditSheet
        visible={editingGoal === 'carbsG'}
        onClose={() => setEditingGoal(null)}
        onSave={handleSaveGoalEdit}
        label="Carbohydrates"
        currentValue={step4Data.carbsG}
        min={0} max={1000} step={5} unit="g"
        context="Your body's primary energy source"
        color={TARGET_COLORS.carbs.base}
      />
      <GoalEditSheet
        visible={editingGoal === 'fatsG'}
        onClose={() => setEditingGoal(null)}
        onSave={handleSaveGoalEdit}
        label="Fats"
        currentValue={step4Data.fatsG}
        min={0} max={300} step={5} unit="g"
        context="Important for hormones and brain health"
        color={TARGET_COLORS.fats.base}
      />
      <GoalEditSheet
        visible={editingGoal === 'waterLiters'}
        onClose={() => setEditingGoal(null)}
        onSave={handleSaveGoalEdit}
        label="Water Intake"
        currentValue={step4Data.waterLiters}
        min={0.5} max={10} step={0.5} unit="L"
        context="Stay hydrated throughout the day"
        color={TARGET_COLORS.water.base}
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
    backgroundColor: 'rgba(107, 78, 255, 0.08)',
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
    fontFamily: 'DMSans_700Bold',
    color: DS.onSurface,
    letterSpacing: -0.5,
  },
  loadingSubtitle: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: DS.onSurfaceVar,
    textAlign: 'center',
    lineHeight: 20,
  },

  /* Profile chip strip — lives inside the dark hero header */
  profileChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileChipText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: 'rgba(255,255,255,0.65)',
  },
  profileChipDot: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    marginHorizontal: 6,
  },

  /* Hero card */
  heroCard: {
    marginBottom: 22,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: 'rgba(3, 21, 35, 0.34)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 10,
  },
  heroGradient: {
    padding: 26,
    paddingBottom: 22,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroDecor2: {
    position: 'absolute',
    bottom: -35,
    left: -35,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroDecor3: {
    position: 'absolute',
    top: 35,
    right: 65,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.04)',
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
    fontFamily: 'DMSans_700Bold',
    color: AUTH_COLORS.primary,
  },
  heroEditBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroValueSection: {
    alignItems: 'center',
    marginBottom: 18,
  },
  heroValue: {
    fontSize: 68,
    fontFamily: 'DMSans_700Bold',
    color: '#FFFFFF',
    letterSpacing: -3,
    lineHeight: 74,
  },
  heroUnit: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: 'rgba(255,255,255,0.80)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  heroContext: {
    fontSize: 12.5,
    fontFamily: 'DMSans_400Regular',
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    fontFamily: 'DMSans_700Bold',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  heroMetricValue: {
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
    color: '#FFFFFF',
  },
  heroMetricDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  /* Macro breakdown — light section of the unified nutrition card */
  macroSection: {
    backgroundColor: DS.surfLow,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 6,
  },
  macroSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  macroSectionTitle: {
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
    color: DS.onSurface,
    letterSpacing: -0.2,
  },
  macroSectionSubtitle: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: DS.onSurfaceVar,
  },

  /* Proportional macro bar — segment widths reflect this user's actual gram split */
  macroBarTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 36, 31, 0.07)',
    marginBottom: 18,
  },
  macroBarFill: {
    marginHorizontal: 1,
    borderRadius: 999,
  },

  /* Macro rows */
  macroRowsGroup: {
    gap: 0,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  macroRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 36, 31, 0.07)',
  },
  macroRowIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  macroRowText: {
    flex: 1,
    marginRight: 8,
  },
  macroRowTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  macroRowLabel: {
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
    color: DS.onSurface,
  },
  macroRowPct: {
    fontSize: 11,
    fontFamily: 'DMSans_700Bold',
  },
  macroRowCaption: {
    fontSize: 11.5,
    fontFamily: 'DMSans_400Regular',
    color: DS.onSurfaceVar,
    lineHeight: 15,
    marginTop: 2,
  },
  macroRowValueBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    flexShrink: 0,
  },
  macroRowValue: {
    fontSize: 19,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: -0.3,
  },
  macroRowUnit: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: DS.onSurfaceVar,
  },

  /* Fine-tune hint — plain caption, no card */
  finetuneHint: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: DS.onSurfaceVar,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 18,
    paddingHorizontal: 12,
  },

  /* Get Started pill */
  btnContainer: {
    alignSelf: 'center',
    marginBottom: 8,
    borderRadius: 999,
    shadowColor: 'rgba(3, 21, 35, 0.34)',
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
    fontFamily: 'DMSans_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  rocketBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Step4Screen;
