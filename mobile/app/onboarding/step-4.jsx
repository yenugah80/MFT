/**
 * Onboarding Step 4: Review Calculated Goals
 * Premium refined design with compact macro cards and elegant animations
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
import {
  ONBOARDING_COPY,
  A11Y_LABELS,
} from '../../constants/onboardingConfig';
import {
  BRAND,
  TEXT,
  SHADOWS,
  RADIUS,
  SPACING,
  SURFACES,
  MACRO_COLORS,
} from '../../constants/premiumTheme';

// Compact Macro Card Component
const MacroCard = ({ label, value, unit, iconName, color, lightColor, onEdit, delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.macroCard,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onEdit?.();
        }}
        style={({ pressed }) => [
          styles.macroCardInner,
          { borderColor: color },
          pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        ]}
      >
        <View style={[styles.macroIconContainer, { backgroundColor: lightColor }]}>
          <Ionicons name={iconName} size={20} color={color} />
        </View>
        <Text style={styles.macroLabel}>{label}</Text>
        <View style={styles.macroValueRow}>
          <Text style={[styles.macroValue, { color }]}>{value ?? '--'}</Text>
          <Text style={styles.macroUnit}>{unit}</Text>
        </View>
        <View style={styles.macroEditHint}>
          <Ionicons name="pencil-outline" size={10} color={TEXT.muted} />
          <Text style={styles.macroEditText}>tap to edit</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

// Water Card Component
const WaterCard = ({ value, onEdit, delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.waterCard, { opacity: fadeAnim }]}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onEdit?.();
        }}
        style={({ pressed }) => [
          styles.waterCardInner,
          pressed && { opacity: 0.9 },
        ]}
      >
        <LinearGradient
          colors={['#E0F7FA', '#B2EBF2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.waterGradient}
        >
          <View style={styles.waterContent}>
            <View style={styles.waterIconContainer}>
              <Ionicons name="water" size={24} color="#00ACC1" />
            </View>
            <View style={styles.waterInfo}>
              <Text style={styles.waterLabel}>Daily Hydration</Text>
              <View style={styles.waterValueRow}>
                <Text style={styles.waterValue}>{value ?? '--'}</Text>
                <Text style={styles.waterUnit}>liters</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#00ACC1" />
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

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

  // Animations
  const heroFadeAnim = useRef(new Animated.Value(0)).current;
  const heroScaleAnim = useRef(new Animated.Value(0.95)).current;
  const buttonSlideAnim = useRef(new Animated.Value(50)).current;

  // Calculate goals when component mounts
  useEffect(() => {
    if (!calculatedGoals) {
      calculateGoals();
    }
  }, [calculatedGoals, calculateGoals]);

  // Animate in when goals are ready
  useEffect(() => {
    if (calculatedGoals) {
      Animated.parallel([
        Animated.timing(heroFadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(heroScaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(buttonSlideAnim, {
          toValue: 0,
          duration: 600,
          delay: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [calculatedGoals]);

  // Show error if calculation fails
  useEffect(() => {
    if (error && editingGoal !== 'saving') {
      Alert.alert('Error', error, [{ text: 'OK', onPress: () => {} }]);
    }
  }, [error]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(A11Y_LABELS.step4);
  }, []);

  const handleEditGoal = (goalType) => {
    setEditingGoal(goalType);
  };

  const handleSaveGoalEdit = (newValue) => {
    const updatedGoals = { ...step4Data, [editingGoal]: newValue };
    updateGoals(updatedGoals);
    setEditingGoal(null);
  };

  const handleGetStarted = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await completeOnboarding();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to complete onboarding. Please try again.');
    }
  };

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
          <View style={styles.loadingIconContainer}>
            <ActivityIndicator size="large" color={BRAND.primary} />
          </View>
          <Text style={styles.loadingTitle}>Calculating Your Plan</Text>
          <Text style={styles.loadingSubtitle}>
            Personalizing your nutrition targets...
          </Text>
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
      {/* Hero Calorie Card */}
      <Animated.View
        style={[
          styles.heroCard,
          {
            opacity: heroFadeAnim,
            transform: [{ scale: heroScaleAnim }],
          },
        ]}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleEditGoal('dailyCalories');
          }}
          style={({ pressed }) => pressed && { opacity: 0.95 }}
        >
          <LinearGradient
            colors={[BRAND.primary, BRAND.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            {/* Decorative circles */}
            <View style={styles.heroDecor1} />
            <View style={styles.heroDecor2} />

            <View style={styles.heroContent}>
              <View style={styles.heroHeader}>
                <View style={styles.heroBadge}>
                  <Ionicons name="sparkles" size={14} color={BRAND.primary} />
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
                <View style={styles.heroMetric}>
                  <Text style={styles.heroMetricLabel}>BMR</Text>
                  <Text style={styles.heroMetricValue}>{calculatedGoals?.bmr ?? '--'}</Text>
                </View>
                <View style={styles.heroMetricDivider} />
                <View style={styles.heroMetric}>
                  <Text style={styles.heroMetricLabel}>TDEE</Text>
                  <Text style={styles.heroMetricValue}>{calculatedGoals?.tdee ?? '--'}</Text>
                </View>
                <View style={styles.heroMetricDivider} />
                <View style={styles.heroMetric}>
                  <Text style={styles.heroMetricLabel}>Goal</Text>
                  <Text style={styles.heroMetricValue}>
                    {step1Data.primaryGoal === 'lose' ? 'Deficit' :
                     step1Data.primaryGoal === 'gain' ? 'Surplus' : 'Maintain'}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* Section Label */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Daily Macros</Text>
        <Text style={styles.sectionSubtitle}>Tap any card to adjust</Text>
      </View>

      {/* Macro Cards Grid */}
      <View style={styles.macroGrid}>
        <MacroCard
          label="Protein"
          value={step4Data.proteinG}
          unit="g"
          iconName="barbell"
          color={MACRO_COLORS.protein.base}
          lightColor="#F3E8FF"
          onEdit={() => handleEditGoal('proteinG')}
          delay={100}
        />
        <MacroCard
          label="Carbs"
          value={step4Data.carbsG}
          unit="g"
          iconName="flash"
          color={MACRO_COLORS.carbs.base}
          lightColor="#DBEAFE"
          onEdit={() => handleEditGoal('carbsG')}
          delay={200}
        />
        <MacroCard
          label="Fats"
          value={step4Data.fatsG}
          unit="g"
          iconName="water-outline"
          color={MACRO_COLORS.fat.base}
          lightColor="#FEF3C7"
          onEdit={() => handleEditGoal('fatsG')}
          delay={300}
        />
      </View>

      {/* Water Goal */}
      <WaterCard
        value={step4Data.waterLiters}
        onEdit={() => handleEditGoal('waterLiters')}
        delay={400}
      />

      {/* Info Note */}
      <View style={styles.infoNote}>
        <Ionicons name="information-circle-outline" size={16} color={TEXT.tertiary} />
        <Text style={styles.infoNoteText}>
          These targets are calculated based on your profile. You can adjust them anytime in Settings.
        </Text>
      </View>

      {/* Get Started Button */}
      <Animated.View
        style={[
          styles.buttonContainer,
          { transform: [{ translateY: buttonSlideAnim }] },
        ]}
      >
        <Pressable
          onPress={handleGetStarted}
          disabled={isSaving}
          style={({ pressed }) => [
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
        >
          <LinearGradient
            colors={isSaving ? ['#9CA3AF', '#9CA3AF'] : ['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.getStartedButton}
          >
            <Text style={styles.getStartedButtonText}>
              {isSaving ? 'Setting up...' : "Let's Go!"}
            </Text>
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.buttonIconContainer}>
                <Ionicons name="rocket" size={18} color="white" />
              </View>
            )}
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* Edit sheets for each goal */}
      <GoalEditSheet
        visible={editingGoal === 'dailyCalories'}
        onClose={() => setEditingGoal(null)}
        onSave={(value) => handleSaveGoalEdit(value)}
        label="Daily Calories"
        currentValue={step4Data.dailyCalories}
        min={500}
        max={10000}
        step={50}
        unit="kcal"
        context="Your total daily energy intake target"
        color={BRAND.primary}
      />

      <GoalEditSheet
        visible={editingGoal === 'proteinG'}
        onClose={() => setEditingGoal(null)}
        onSave={(value) => handleSaveGoalEdit(value)}
        label="Protein"
        currentValue={step4Data.proteinG}
        min={0}
        max={500}
        step={5}
        unit="g"
        context="Essential for muscle repair and growth"
        color={MACRO_COLORS.protein.base}
      />

      <GoalEditSheet
        visible={editingGoal === 'carbsG'}
        onClose={() => setEditingGoal(null)}
        onSave={(value) => handleSaveGoalEdit(value)}
        label="Carbohydrates"
        currentValue={step4Data.carbsG}
        min={0}
        max={1000}
        step={5}
        unit="g"
        context="Your body's primary energy source"
        color={MACRO_COLORS.carbs.base}
      />

      <GoalEditSheet
        visible={editingGoal === 'fatsG'}
        onClose={() => setEditingGoal(null)}
        onSave={(value) => handleSaveGoalEdit(value)}
        label="Fats"
        currentValue={step4Data.fatsG}
        min={0}
        max={300}
        step={5}
        unit="g"
        context="Important for hormones and brain health"
        color={MACRO_COLORS.fat.base}
      />

      <GoalEditSheet
        visible={editingGoal === 'waterLiters'}
        onClose={() => setEditingGoal(null)}
        onSave={(value) => handleSaveGoalEdit(value)}
        label="Water Intake"
        currentValue={step4Data.waterLiters}
        min={0.5}
        max={10}
        step={0.5}
        unit="L"
        context="Stay hydrated throughout the day"
        color="#00ACC1"
      />
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING[6],
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: SURFACES.gradient.softPurple[0],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT.primary,
    marginBottom: SPACING[2],
  },
  loadingSubtitle: {
    fontSize: 14,
    color: TEXT.secondary,
    textAlign: 'center',
  },

  // Hero Card
  heroCard: {
    marginBottom: SPACING[5],
    borderRadius: RADIUS['2xl'],
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  heroGradient: {
    padding: SPACING[5],
    borderRadius: RADIUS['2xl'],
    overflow: 'hidden',
    position: 'relative',
  },
  heroDecor1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroDecor2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1] + 2,
    borderRadius: RADIUS.full,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: BRAND.primary,
  },
  heroEditBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroValueSection: {
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  heroValue: {
    fontSize: 64,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -2,
    lineHeight: 72,
  },
  heroUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: SPACING[1],
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
  },
  heroMetric: {
    alignItems: 'center',
    flex: 1,
  },
  heroMetricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  heroMetricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: SPACING[3],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.primary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: TEXT.tertiary,
  },

  // Macro Grid
  macroGrid: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  macroCard: {
    flex: 1,
  },
  macroCardInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...SHADOWS.sm,
  },
  macroIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  macroLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[1],
  },
  macroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  macroValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  macroUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT.muted,
  },
  macroEditHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: SPACING[2],
    opacity: 0.6,
  },
  macroEditText: {
    fontSize: 9,
    color: TEXT.muted,
  },

  // Water Card
  waterCard: {
    marginBottom: SPACING[4],
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  waterCardInner: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  waterGradient: {
    padding: SPACING[4],
  },
  waterContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waterIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  waterInfo: {
    flex: 1,
  },
  waterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00838F',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  waterValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  waterValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#006064',
  },
  waterUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: '#00838F',
  },

  // Info Note
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
    backgroundColor: SURFACES.background.tertiary,
    padding: SPACING[3],
    borderRadius: RADIUS.md,
    marginBottom: SPACING[4],
  },
  infoNoteText: {
    flex: 1,
    fontSize: 12,
    color: TEXT.tertiary,
    lineHeight: 18,
  },

  // Button
  buttonContainer: {
    marginBottom: SPACING[2],
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[6],
    borderRadius: RADIUS.xl,
    gap: SPACING[3],
    ...SHADOWS.lg,
  },
  getStartedButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  buttonIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Step4Screen;
