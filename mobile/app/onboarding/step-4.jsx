/**
 * Onboarding Step 4: Review Calculated Goals
 * Shows auto-calculated nutrition targets in a reassuring, presentation style
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  ActivityIndicator,
  Alert,
  AccessibilityInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import GoalPresentationCard from '../../components/onboarding/GoalPresentationCard';
import GoalEditSheet from '../../components/onboarding/GoalEditSheet';
import { useOnboarding } from '../../hooks/useOnboarding';
import { getGoalContext } from '../../utils/onboardingCalculations';
import {
  ONBOARDING_COPY,
  A11Y_LABELS,
} from '../../constants/onboardingConfig';
import { BRAND, TEXT, SHADOWS, RADIUS, SPACING } from '../../constants/premiumTheme';

const Step4Screen = () => {
  const {
    step,
    step1Data,
    step4Data,
    calculatedGoals,
    calculateGoals,
    updateGoals,
    goToPreviousStep,
    completeOnboarding,
    isSaving,
    error,
    setStep,
  } = useOnboarding();

  const [editingGoal, setEditingGoal] = useState(null);

  // Ensure step is synchronized to 4 when this screen loads
  useEffect(() => {
    if (step !== 4) {
      console.log('[Step 4] Screen loaded - syncing hook state to step 4 (was:', step, ')');
      setStep(4);
    }
  }, [step, setStep]);

  // Calculate goals when component mounts
  useEffect(() => {
    if (!calculatedGoals) {
      calculateGoals();
    }
  }, [calculatedGoals, calculateGoals]);

  // Show error if calculation fails
  useEffect(() => {
    if (error && editingGoal !== 'saving') {
      Alert.alert('Error', error, [{ text: 'OK', onPress: () => {} }]);
    }
  }, [error]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(A11Y_LABELS.step4);
  }, []);

  const goalContext = calculatedGoals
    ? getGoalContext(calculatedGoals, step1Data)
    : {};

  const handleEditGoal = (goalType) => {
    setEditingGoal(goalType);
  };

  const handleSaveGoalEdit = (newValue) => {
    const updatedGoals = { ...step4Data, [editingGoal]: newValue };
    updateGoals(updatedGoals);
    setEditingGoal(null);
  };

  const handleGetStarted = async () => {
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
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.loadingText}>Calculating your targets...</Text>
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
      {/* Calculation info - Premium Card */}
      <LinearGradient
        colors={['#F5F3FF', '#EFEAFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.premiumSection, styles.infoSection, { backgroundColor: '#F5F3FF' }]}
      >
        <View style={styles.infoBadge}>
          <Ionicons name="calculator" size={18} color="#6B4EFF" />
          <Text style={styles.infoBadgeText}>Calculated for You</Text>
        </View>
        <Text style={styles.infoText}>
          {ONBOARDING_COPY.step4.calculationNote}
          : BMR ≈{' '}
          <Text style={styles.infoBold}>{calculatedGoals.bmr} kcal</Text>
          , TDEE ≈{' '}
          <Text style={styles.infoBold}>{calculatedGoals.tdee} kcal</Text>
        </Text>
      </LinearGradient>

      {/* Goals Section Container */}
      <View style={styles.goalsContainer}>
        {/* Daily Calories - Energy/Fire gradient */}
        <GoalPresentationCard
          label={ONBOARDING_COPY.step4.calorieLabel}
          context={goalContext.calorieContext}
          value={step4Data.dailyCalories}
          unit="kcal"
          iconName="flame"
          gradientStart="#FF6B6B"
          gradientEnd="#FF8E72"
          iconColor="#FFFFFF"
          onEdit={() => handleEditGoal('dailyCalories')}
          showEditLink={true}
        />

        {/* Protein - Muscle/Strength gradient */}
        <GoalPresentationCard
          label={ONBOARDING_COPY.step4.proteinLabel}
          context={goalContext.proteinContext}
          value={step4Data.proteinG}
          unit="g"
          iconName="barbell"
          gradientStart="#FF6B9D"
          gradientEnd="#FF8FB8"
          iconColor="#FFFFFF"
          onEdit={() => handleEditGoal('proteinG')}
          showEditLink={true}
        />

        {/* Carbs - Energy/Lightning gradient */}
        <GoalPresentationCard
          label={ONBOARDING_COPY.step4.carbsLabel}
          context="For sustained energy throughout the day"
          value={step4Data.carbsG}
          unit="g"
          iconName="lightning"
          gradientStart="#FFB347"
          gradientEnd="#FFD799"
          iconColor="#FFFFFF"
          onEdit={() => handleEditGoal('carbsG')}
          showEditLink={true}
        />

        {/* Fats - Health/Heart gradient */}
        <GoalPresentationCard
          label={ONBOARDING_COPY.step4.fatsLabel}
          context="For hormone and brain health"
          value={step4Data.fatsG}
          unit="g"
          iconName="heart"
          gradientStart="#76C893"
          gradientEnd="#A8DADC"
          iconColor="#FFFFFF"
          onEdit={() => handleEditGoal('fatsG')}
          showEditLink={true}
        />

        {/* Water - Hydration gradient */}
        <GoalPresentationCard
          label={ONBOARDING_COPY.step4.waterLabel}
          context="Stay hydrated throughout the day"
          value={step4Data.waterLiters}
          unit="L"
          iconName="water"
          gradientStart="#00B4DB"
          gradientEnd="#0083B0"
          iconColor="#FFFFFF"
          onEdit={() => handleEditGoal('waterLiters')}
          showEditLink={true}
        />
      </View>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Get Started Button */}
      <Pressable
        onPress={handleGetStarted}
        disabled={isSaving}
        style={({ pressed }) => [
          styles.getStartedButton,
          isSaving && styles.getStartedButtonDisabled,
          pressed && styles.getStartedButtonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Get started with MyFoodTracker"
        accessibilityState={{ disabled: isSaving }}
      >
        <Text style={styles.getStartedButtonText}>
          {ONBOARDING_COPY.step4.getStartedBtn}
        </Text>
        {isSaving ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Ionicons name="arrow-forward" size={18} color="white" />
        )}
      </Pressable>

      {/* Edit sheets for each goal */}
      <GoalEditSheet
        visible={editingGoal === 'dailyCalories'}
        onClose={() => setEditingGoal(null)}
        onSave={(value) => handleSaveGoalEdit(value)}
        label={ONBOARDING_COPY.step4.calorieLabel}
        currentValue={step4Data.dailyCalories}
        min={500}
        max={10000}
        step={100}
        unit="kcal"
        context="Adjust your daily calorie target"
      />

      <GoalEditSheet
        visible={editingGoal === 'proteinG'}
        onClose={() => setEditingGoal(null)}
        onSave={(value) => handleSaveGoalEdit(value)}
        label={ONBOARDING_COPY.step4.proteinLabel}
        currentValue={step4Data.proteinG}
        min={0}
        max={500}
        step={5}
        unit="g"
        context="Adjust your daily protein target"
      />

      <GoalEditSheet
        visible={editingGoal === 'carbsG'}
        onClose={() => setEditingGoal(null)}
        onSave={(value) => handleSaveGoalEdit(value)}
        label={ONBOARDING_COPY.step4.carbsLabel}
        currentValue={step4Data.carbsG}
        min={0}
        max={1000}
        step={5}
        unit="g"
        context="Adjust your daily carbs target"
      />

      <GoalEditSheet
        visible={editingGoal === 'fatsG'}
        onClose={() => setEditingGoal(null)}
        onSave={(value) => handleSaveGoalEdit(value)}
        label={ONBOARDING_COPY.step4.fatsLabel}
        currentValue={step4Data.fatsG}
        min={0}
        max={300}
        step={5}
        unit="g"
        context="Adjust your daily fats target"
      />

      <GoalEditSheet
        visible={editingGoal === 'waterLiters'}
        onClose={() => setEditingGoal(null)}
        onSave={(value) => handleSaveGoalEdit(value)}
        label={ONBOARDING_COPY.step4.waterLabel}
        currentValue={step4Data.waterLiters}
        min={0}
        max={20}
        step={0.5}
        unit="L"
        context="Adjust your daily water intake goal"
      />
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING[4],
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    color: TEXT.primary,
  },
  premiumSection: {
    backgroundColor: '#F5F3FF',
    borderRadius: RADIUS.lg,
    borderLeftWidth: 4,
    borderLeftColor: BRAND.primary,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[4],
    ...SHADOWS.sm,
  },
  infoSection: {
    marginBottom: SPACING[5],
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[3],
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    backgroundColor: 'rgba(107, 78, 255, 0.12)',
    borderRadius: RADIUS.md,
    alignSelf: 'flex-start',
  },
  infoBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: BRAND.primary,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
    color: TEXT.secondary,
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: '700',
    color: BRAND.primary,
  },
  goalsContainer: {
    gap: SPACING[4],
    marginBottom: SPACING[5],
  },
  spacer: {
    minHeight: SPACING[3],
  },
  getStartedButton: {
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.lg,
    backgroundColor: BRAND.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING[2],
    marginBottom: SPACING[2],
    minHeight: 48,
    ...SHADOWS.md,
  },
  getStartedButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.6,
  },
  getStartedButtonPressed: {
    backgroundColor: BRAND.primaryDark,
    opacity: 0.9,
  },
  getStartedButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    numberOfLines: 1,
  },
});

export default Step4Screen;
