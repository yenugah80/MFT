/**
 * Onboarding Step 3: Dietary Preferences - Premium Redesign
 * Features:
 * - Smart cuisine suggestions based on dietary preferences
 * - Preference strength sliders (1-5 scale)
 * - Preference combination explanations
 * - Visual food examples
 * - Premium glass morphism design
 * - Smooth animations and haptic feedback
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  AccessibilityInfo,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Components
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import ChipSelector from '../../components/onboarding/ChipSelector';
import PreferenceStrengthSelector from '../../components/onboarding/PreferenceStrengthSelector';
import PreferenceCombinationCard from '../../components/onboarding/PreferenceCombinationCard';

// Hooks
import { useOnboarding } from '../../hooks/useOnboarding';

// Utils & Config
import {
  getSmartCuisineSuggestions,
  getPreferenceCombinationExplanation,
  SAMPLE_DISHES
} from '../../utils/onboardingSmartSuggestions';
import {
  DIETARY_PREFERENCES,
  ALLERGIES,
  CUISINE_PREFERENCES,
  ONBOARDING_COPY,
  A11Y_LABELS,
} from '../../constants/onboardingConfig';
import { TEXT, SEMANTIC, SHADOWS, RADIUS, SPACING } from '../../constants/premiumTheme';

const Step3Screen = () => {
  const {
    step,
    step3Data,
    updateStepData,
    goToNextStep,
    goToPreviousStep,
    setStep,
  } = useOnboarding();

  // State
  const [activeSection, setActiveSection] = useState(0);
  const [fadeAnims] = useState([0, 1, 2].map(() => new Animated.Value(0)));
  const [smartSuggestedCuisines, setSmartSuggestedCuisines] = useState([]);
  const [preferenceCombination, setPreferenceCombination] = useState(null);
  const [strengthValues, setStrengthValues] = useState({});

  // Sync step on mount
  useEffect(() => {
    if (step !== 3) {
      setStep(3);
    }
  }, [step, setStep]);

  // Initialize strength values from step3Data
  useEffect(() => {
    const initialStrengths = {};

    // Dietary preferences
    if (step3Data.dietaryPreferences) {
      step3Data.dietaryPreferences.forEach(pref => {
        const key = `dietary-${typeof pref === 'string' ? pref : pref.id}`;
        initialStrengths[key] = typeof pref === 'object' ? pref.strength : 3;
      });
    }

    // Cuisine preferences
    if (step3Data.cuisinePreferences) {
      step3Data.cuisinePreferences.forEach(cuisine => {
        const key = `cuisine-${typeof cuisine === 'string' ? cuisine : cuisine.id}`;
        initialStrengths[key] = typeof cuisine === 'object' ? cuisine.strength : 3;
      });
    }

    setStrengthValues(initialStrengths);
  }, [step3Data]);

  // Smart suggestions effect
  useEffect(() => {
    const dietaryPrefs = step3Data.dietaryPreferences || [];
    const suggested = getSmartCuisineSuggestions(dietaryPrefs);
    setSmartSuggestedCuisines(suggested);

    // Generate preference combination explanation
    if (dietaryPrefs.length > 0 || (step3Data.cuisinePreferences || []).length > 0) {
      const explanation = getPreferenceCombinationExplanation(
        dietaryPrefs,
        step3Data.cuisinePreferences || []
      );
      setPreferenceCombination(explanation);
    } else {
      setPreferenceCombination(null);
    }
  }, [step3Data.dietaryPreferences, step3Data.cuisinePreferences]);

  // Animate sections on change
  useEffect(() => {
    fadeAnims[activeSection].setValue(0);
    Animated.timing(fadeAnims[activeSection], {
      toValue: 1,
      duration: 300,
      useNativeDriver: true
    }).start();
  }, [activeSection]);

  // Section configuration
  const sections = [
    {
      id: 'dietary',
      label: 'Dietary Style',
      description: 'How do you prefer to eat?',
      icon: 'leaf-outline',
      bgGradientStart: '#F0FDF4',
      bgGradientEnd: '#DCFCE7',
      borderColor: '#10B981',
      accentColor: '#10B981',
      items: DIETARY_PREFERENCES,
      selectedItems: step3Data.dietaryPreferences || [],
      onSelect: (selected) => {
        updateStepData('step3', { dietaryPreferences: selected });
      },
      showStrengthSliders: true
    },
    {
      id: 'allergies',
      label: 'Allergies',
      description: 'Foods to safely avoid',
      icon: 'alert-circle-outline',
      bgGradientStart: '#FEF2F2',
      bgGradientEnd: '#FEE2E2',
      borderColor: SEMANTIC.danger.base,
      accentColor: SEMANTIC.danger.base,
      items: ALLERGIES,
      selectedItems: step3Data.allergies || [],
      onSelect: (selected) => {
        updateStepData('step3', { allergies: selected });
      },
      showNote: true,
      showStrengthSliders: false
    },
    {
      id: 'cuisine',
      label: 'Cuisine Preferences',
      description: 'Favorite cooking styles',
      icon: 'restaurant-outline',
      bgGradientStart: '#FFFBF0',
      bgGradientEnd: '#FEF3C7',
      borderColor: '#F97316',
      accentColor: '#F97316',
      items: CUISINE_PREFERENCES,
      selectedItems: step3Data.cuisinePreferences || [],
      onSelect: (selected) => {
        updateStepData('step3', { cuisinePreferences: selected });
      },
      showStrengthSliders: true,
      smartSuggested: smartSuggestedCuisines
    }
  ];

  const currentSection = sections[activeSection];

  const handleStrengthChange = useCallback((itemId, strength) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const key = `${currentSection.id}-${itemId}`;
    setStrengthValues(prev => ({
      ...prev,
      [key]: strength
    }));
  }, [currentSection.id]);

  const handleSectionChange = useCallback((index) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveSection(index);
  }, []);

  const handleSkip = () => {
    updateStepData('step3', {
      dietaryPreferences: ['balanced'],
      allergies: [],
      cuisinePreferences: ['mediterranean', 'american'],
    });
    goToNextStep();
  };

  const handleContinue = () => {
    goToNextStep();
  };

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(A11Y_LABELS.step3);
  }, []);

  return (
    <OnboardingLayout
      step={3}
      totalSteps={4}
      title={ONBOARDING_COPY.step3.title}
      subtitle={ONBOARDING_COPY.step3.subtitle}
      onBack={goToPreviousStep}
      canGoBack={true}
      scrollEnabled={true}
    >
      {/* ============================================ */}
      {/* SECTION TABS */}
      {/* ============================================ */}
      <View style={styles.tabsContainer}>
        {sections.map((section, index) => {
          const isActive = activeSection === index;
          return (
            <Pressable
              key={section.id}
              onPress={() => handleSectionChange(index)}
              style={[
                styles.tab,
                isActive && [styles.tabActive, { borderColor: section.accentColor }],
                !isActive && styles.tabInactive,
              ]}
              accessibilityRole="button"
              accessibilityLabel={section.label}
              accessibilityState={{ selected: isActive }}
            >
              <Ionicons
                name={section.icon}
                size={18}
                color={isActive ? section.accentColor : TEXT.secondary}
                style={styles.tabIcon}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isActive && [styles.tabLabelActive, { color: section.accentColor }],
                  !isActive && styles.tabLabelInactive,
                ]}
              >
                {section.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ============================================ */}
      {/* ANIMATED CONTENT SECTION */}
      {/* ============================================ */}
      <Animated.View
        style={[
          styles.contentWrapper,
          { opacity: fadeAnims[activeSection] }
        ]}
      >
        <LinearGradient
          colors={[currentSection.bgGradientStart, currentSection.bgGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.contentSection,
            { borderLeftColor: currentSection.borderColor }
          ]}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.headerTop}>
              <Ionicons
                name={currentSection.icon}
                size={24}
                color={currentSection.accentColor}
              />
              <Text
                style={[
                  styles.sectionTitle,
                  { color: currentSection.accentColor }
                ]}
              >
                {currentSection.label}
              </Text>
            </View>
            <Text style={[styles.sectionDescription, { color: TEXT.secondary }]}>
              {currentSection.description}
            </Text>
          </View>

          {/* Chip Selector */}
          <View style={styles.chipSelectorContainer}>
            <ChipSelector
              title=""
              items={currentSection.items}
              selectedItems={currentSection.selectedItems}
              onSelectionChange={currentSection.onSelect}
              multiSelect={true}
            />
          </View>

          {/* Smart Suggestions - Cuisine Section */}
          {currentSection.id === 'cuisine' && smartSuggestedCuisines.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <View style={styles.suggestionsHeader}>
                <Ionicons
                  name="bulb-outline"
                  size={16}
                  color="#8B5CF6"
                />
                <Text style={[styles.suggestionsTitle, { color: TEXT.primary }]}>
                  Smart Suggestions
                </Text>
              </View>
              <Text style={[styles.suggestionsDesc, { color: TEXT.secondary }]}>
                Based on your dietary preferences
              </Text>
              <View style={styles.suggestionChips}>
                {smartSuggestedCuisines.map(cuisine => (
                  <View key={cuisine} style={styles.suggestionChip}>
                    <Text style={[styles.suggestionChipText, { color: '#8B5CF6' }]}>
                      {cuisine}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Allergy Warning Note */}
          {currentSection.showNote && (
            <View style={styles.allergyNote}>
              <Ionicons
                name="warning-outline"
                size={16}
                color="#DC2626"
              />
              <Text style={[styles.allergyNoteText, { color: '#991B1B' }]}>
                Selected items will be excluded from all recommendations
              </Text>
            </View>
          )}
        </LinearGradient>
      </Animated.View>

      {/* ============================================ */}
      {/* STRENGTH SLIDERS - For selected items */}
      {/* ============================================ */}
      {currentSection.showStrengthSliders && currentSection.selectedItems.length > 0 && (
        <View style={styles.strengthSection}>
          <Text style={[styles.strengthTitle, { color: TEXT.primary }]}>
            Preference Strength
          </Text>
          <Text style={[styles.strengthDesc, { color: TEXT.secondary }]}>
            How important is each preference?
          </Text>

          <View style={styles.slidersContainer}>
            {currentSection.selectedItems.map((item) => {
              const itemId = typeof item === 'string' ? item : item.id;
              const key = `${currentSection.id}-${itemId}`;
              const currentStrength = strengthValues[key] || 3;

              return (
                <PreferenceStrengthSelector
                  key={key}
                  preferenceId={itemId}
                  preferenceLabel={typeof item === 'string' ? item : item.label}
                  currentStrength={currentStrength}
                  onStrengthChange={(strength) => handleStrengthChange(itemId, strength)}
                  showDescription={true}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* ============================================ */}
      {/* PREFERENCE COMBINATION CARD */}
      {/* ============================================ */}
      {preferenceCombination && (
        <PreferenceCombinationCard
          title={preferenceCombination.title}
          description={preferenceCombination.description}
          dietaryPrefs={step3Data.dietaryPreferences || []}
          cuisinePrefs={step3Data.cuisinePreferences || []}
          sampleDishes={
            step3Data.dietaryPreferences?.[0] && SAMPLE_DISHES[step3Data.dietaryPreferences[0]]
              ? SAMPLE_DISHES[step3Data.dietaryPreferences[0]]
              : []
          }
        />
      )}

      {/* ============================================ */}
      {/* SKIP LINK */}
      {/* ============================================ */}
      <Pressable
        onPress={handleSkip}
        style={({ pressed }) => pressed && styles.skipPressed}
        accessibilityRole="button"
        accessibilityLabel="Skip this step"
      >
        <Text style={[styles.skipText, { color: TEXT.secondary }]}>
          {ONBOARDING_COPY.step3.skipBtn || 'Skip for now'}
        </Text>
      </Pressable>

      {/* ============================================ */}
      {/* BOTTOM BUTTONS */}
      {/* ============================================ */}
      <View style={styles.buttonContainer}>
        <Pressable
          onPress={goToPreviousStep}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={18} color={TEXT.primary} />
          <Text style={[styles.secondaryButtonText, { color: TEXT.primary }]}>
            {ONBOARDING_COPY.step3.backBtn || 'Back'}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleContinue}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Continue to next step"
        >
          <Text style={styles.primaryButtonText}>
            {ONBOARDING_COPY.step3.continueBtn || 'Continue'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="white" />
        </Pressable>
      </View>
    </OnboardingLayout>
  );
};

export default Step3Screen;

const styles = StyleSheet.create({
  /* ===== TABS ===== */
  tabsContainer: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginBottom: SPACING[5],
  },

  tab: {
    flex: 1,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[2],
    borderRadius: RADIUS.lg,
    borderBottomWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderBottomColor: 'transparent',
    flexDirection: 'column',
    gap: SPACING[1],
  },

  tabActive: {
    borderBottomWidth: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    ...SHADOWS.sm,
  },

  tabInactive: {
    opacity: 0.6,
  },

  tabIcon: {
    marginBottom: SPACING[1],
  },

  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  tabLabelActive: {
    fontWeight: '700',
  },

  tabLabelInactive: {
    color: TEXT.secondary,
  },

  /* ===== CONTENT ===== */
  contentWrapper: {
    marginBottom: SPACING[4],
  },

  contentSection: {
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    borderLeftWidth: 4,
    ...SHADOWS.md,
  },

  headerContainer: {
    marginBottom: SPACING[4],
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  sectionDescription: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: SPACING[1],
  },

  chipSelectorContainer: {
    marginVertical: SPACING[3],
  },

  /* ===== SMART SUGGESTIONS ===== */
  suggestionsContainer: {
    backgroundColor: 'rgba(147, 51, 234, 0.08)',
    borderRadius: RADIUS.md,
    padding: SPACING[3],
    marginTop: SPACING[3],
    borderLeftWidth: 3,
    borderLeftColor: '#A78BFA',
  },

  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[1],
  },

  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '700',
  },

  suggestionsDesc: {
    fontSize: 12,
    marginBottom: SPACING[2],
  },

  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },

  suggestionChip: {
    backgroundColor: '#E9D5FF',
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },

  suggestionChipText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  /* ===== ALLERGY NOTE ===== */
  allergyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderRadius: RADIUS.md,
    padding: SPACING[3],
    marginTop: SPACING[3],
    gap: SPACING[2],
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },

  allergyNoteText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },

  /* ===== STRENGTH SLIDERS ===== */
  strengthSection: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },

  strengthTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING[1],
  },

  strengthDesc: {
    fontSize: 12,
    marginBottom: SPACING[3],
  },

  slidersContainer: {
    gap: SPACING[4],
  },

  /* ===== SKIP LINK ===== */
  skipText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
    marginVertical: SPACING[3],
  },

  skipPressed: {
    opacity: 0.6,
  },

  /* ===== BUTTONS ===== */
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginTop: SPACING[4],
    marginBottom: SPACING[2],
  },

  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: '#3B82F6',
    backgroundColor: 'transparent',
    gap: SPACING[2],
  },

  secondaryButtonPressed: {
    opacity: 0.7,
  },

  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },

  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: '#3B82F6',
    gap: SPACING[2],
    ...SHADOWS.md,
  },

  primaryButtonPressed: {
    opacity: 0.85,
  },

  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
});
