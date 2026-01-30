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

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  AccessibilityInfo,
  Animated,
  Alert,
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
import { useOnboarding } from '../../contexts/OnboardingContext';

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
import { TEXT, SEMANTIC, SHADOWS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants/premiumTheme';

/**
 * Utility Functions - Data Normalization
 * Standardizes preference data structure (Fix #2)
 */
const normalizePreference = (pref) => {
  try {
    if (typeof pref === 'string') {
      return { id: pref, strength: 3 };
    }
    return pref || { id: '', strength: 3 };
  } catch (err) {
    console.error('[normalizePreference] Error normalizing preference:', err);
    return { id: '', strength: 3 };
  }
};

const normalizePreferences = (prefs) => {
  try {
    const normalized = (prefs || []).map(normalizePreference);
    // Deduplicate by id to prevent duplicate key errors
    const seen = new Set();
    return normalized.filter(item => {
      if (!item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  } catch (err) {
    console.error('[normalizePreferences] Error normalizing preferences:', err);
    return [];
  }
};

/**
 * Get sample dish ID - handles both string and object formats (Fix #6)
 */
const getSampleDishId = (firstPref) => {
  try {
    if (!firstPref) return null;
    return typeof firstPref === 'string' ? firstPref : (firstPref?.id || null);
  } catch (err) {
    console.error('[getSampleDishId] Error getting sample dish ID:', err);
    return null;
  }
};

const Step3Screen = () => {
  const {
    step3Data,
    updateStepData,
    goToNextStep,
    goToPreviousStep,
  } = useOnboarding();

  // State
  const [activeSection, setActiveSection] = useState(0);
  const fadeAnimsRef = useRef([0, 1, 2].map(() => new Animated.Value(0)));
  const fadeAnims = fadeAnimsRef.current;
  const [smartSuggestedCuisines, setSmartSuggestedCuisines] = useState([]);
  const [preferenceCombination, setPreferenceCombination] = useState(null);
  const [strengthValues, setStrengthValues] = useState({});

  // Initialize strength values from step3Data (Fix #2: normalize data structure)
  useEffect(() => {
    const initialStrengths = {};

    // Dietary preferences - normalize to object format
    if (step3Data.dietaryPreferences) {
      const normalized = normalizePreferences(step3Data.dietaryPreferences);
      normalized.forEach(pref => {
        if (pref.id) { // Fix #12: null safety
          const key = `dietary-${pref.id}`;
          initialStrengths[key] = pref.strength || 3;
        }
      });
    }

    // Cuisine preferences - normalize to object format
    if (step3Data.cuisinePreferences) {
      const normalized = normalizePreferences(step3Data.cuisinePreferences);
      normalized.forEach(cuisine => {
        if (cuisine.id) { // Fix #12: null safety
          const key = `cuisine-${cuisine.id}`;
          initialStrengths[key] = cuisine.strength || 3;
        }
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
  }, [activeSection, fadeAnims]);

  // Section configuration (Fix #4: memoized to prevent recreation on every render)
  const sections = useMemo(() => [
    {
      id: 'dietary',
      label: 'Dietary Style',
      shortDesc: 'Choose how you eat',
      description: 'How do you prefer to eat?',
      icon: 'leaf-outline',
      bgGradientStart: '#F0FDF4',
      bgGradientEnd: '#DCFCE7',
      borderColor: '#10B981',
      accentColor: '#10B981',
      items: DIETARY_PREFERENCES,
      selectedItems: normalizePreferences(step3Data.dietaryPreferences), // Fix #2: normalize data
      onSelect: (selected) => {
        // Convert selected items to normalized objects with strength
        const normalized = selected.map(item => ({
          id: typeof item === 'string' ? item : item.id,
          strength: 3 // New selections default to 3
        }));
        updateStepData('step3', { dietaryPreferences: normalized });
      },
      showStrengthSliders: true
    },
    {
      id: 'allergies',
      label: 'Allergies',
      shortDesc: 'Foods to avoid',
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
      shortDesc: 'Favorite cuisines',
      description: 'Favorite cooking styles',
      icon: 'restaurant-outline',
      bgGradientStart: '#FFFBF0',
      bgGradientEnd: '#FEF3C7',
      borderColor: '#F97316',
      accentColor: '#F97316',
      items: CUISINE_PREFERENCES,
      selectedItems: normalizePreferences(step3Data.cuisinePreferences), // Fix #2: normalize data
      onSelect: (selected) => {
        // Convert selected items to normalized objects with strength
        const normalized = selected.map(item => ({
          id: typeof item === 'string' ? item : item.id,
          strength: 3 // New selections default to 3
        }));
        updateStepData('step3', { cuisinePreferences: normalized });
      },
      showStrengthSliders: true,
      smartSuggested: smartSuggestedCuisines
    }
  ], [step3Data, smartSuggestedCuisines, updateStepData]); // Fix #4: memoized dependencies

  const currentSection = sections[activeSection];

  const handleStrengthChange = useCallback((itemId, strength) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const key = `${currentSection.id}-${itemId}`;

    // 🆕 Clamp strength to 1-5 range (fail-fast validation)
    const clampedStrength = Math.max(1, Math.min(5, strength));

    // Update local state for UI
    setStrengthValues(prev => ({
      ...prev,
      [key]: clampedStrength
    }));

    // Fix #1: Persist strength to step3Data
    if (currentSection.id === 'dietary' || currentSection.id === 'cuisine') {
      const dataKey = currentSection.id === 'dietary' ? 'dietaryPreferences' : 'cuisinePreferences';
      const currentItems = step3Data[dataKey] || [];

      // Convert items to objects with strength values (Fix #2, #10)
      const updatedItems = currentItems.map(item => {
        const itemIdStr = typeof item === 'string' ? item : item.id;
        return {
          id: itemIdStr,
          strength: itemIdStr === itemId ? clampedStrength : (typeof item === 'object' ? item.strength : 3)
        };
      });

      // Save to parent context
      updateStepData('step3', {
        [dataKey]: updatedItems
      });
    }
  }, [currentSection.id, step3Data, updateStepData]);

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
    // Fix #5: Validate that user has selected dietary preferences
    const hasDietaryPrefs = step3Data.dietaryPreferences && step3Data.dietaryPreferences.length > 0;
    if (!hasDietaryPrefs) {
      Alert.alert(
        'Dietary Preferences Required',
        'Please select at least one dietary preference to continue.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    // Fix #1: Preserve strength data before continuing
    const dietaryPrefs = (step3Data.dietaryPreferences || []).map(item => ({
      id: typeof item === 'string' ? item : item.id,
      strength: strengthValues[`dietary-${typeof item === 'string' ? item : item.id}`] || 3
    }));

    const cuisinePrefs = (step3Data.cuisinePreferences || []).map(item => ({
      id: typeof item === 'string' ? item : item.id,
      strength: strengthValues[`cuisine-${typeof item === 'string' ? item : item.id}`] || 3
    }));

    // Ensure final data has all strength values persisted
    updateStepData('step3', {
      dietaryPreferences: dietaryPrefs,
      cuisinePreferences: cuisinePrefs
    });

    goToNextStep();
  };

  // Accessibility announcement on mount
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
          const selectedCount = section.selectedItems.length;
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
              // Fix #11: Improved accessibility labels
              accessibilityLabel={`${section.label} tab. ${section.shortDesc}. ${selectedCount} ${selectedCount === 1 ? 'item' : 'items'} selected.`}
              accessibilityHint={`${section.label} section: ${section.description}`}
              accessibilityState={{ selected: isActive }}
            >
              <Ionicons
                name={section.icon}
                size={22}
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
              <Text
                style={[
                  styles.tabSubtitle,
                  !isActive && styles.tabSubtitleInactive,
                ]}
              >
                {section.shortDesc}
              </Text>
              {selectedCount > 0 && (
                <View
                  style={[
                    styles.selectionBadge,
                    { backgroundColor: section.accentColor }
                  ]}
                >
                  <Text style={styles.badgeText}>{selectedCount}</Text>
                </View>
              )}
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
            {/* Deduplicate items by ID to prevent duplicate key errors */}
            {currentSection.selectedItems
              .filter((item, index, self) => {
                const itemId = typeof item === 'string' ? item : item.id;
                return self.findIndex(i => (typeof i === 'string' ? i : i.id) === itemId) === index;
              })
              .map((item) => {
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
            (() => {
              // Fix #6: Handle both string and object formats for first dietary preference
              const firstPref = step3Data.dietaryPreferences?.[0];
              const dishId = getSampleDishId(firstPref);
              return dishId && SAMPLE_DISHES[dishId] ? SAMPLE_DISHES[dishId] : [];
            })()
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
            styles.buttonWrapper,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <LinearGradient
            colors={['#E5E7EB', '#D1D5DB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.secondaryButton}
          >
            <Ionicons name="arrow-back" size={18} color="#374151" />
            <Text style={styles.secondaryButtonText}>
              {ONBOARDING_COPY.step3.backBtn || 'Back'}
            </Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={handleContinue}
          style={({ pressed }) => [
            styles.buttonWrapper,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Continue to next step"
        >
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              {ONBOARDING_COPY.step3.continueBtn || 'Continue'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </LinearGradient>
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
    minHeight: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderBottomColor: 'transparent',
    flexDirection: 'column',
    gap: SPACING[1],
    position: 'relative',
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
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    textAlign: 'center',
  },

  tabLabelActive: {
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
  },

  tabLabelInactive: {
    color: TEXT.secondary,
  },

  tabSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.family.medium,
    textAlign: 'center',
    color: TEXT.primary,
    opacity: 0.7,
    marginTop: 2,
  },

  tabSubtitleInactive: {
    color: TEXT.secondary,
    opacity: 0.6,
  },

  selectionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },

  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: 'white',
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
    fontFamily: TYPOGRAPHY.family.bold,
  },

  sectionDescription: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.family.medium,
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
    fontFamily: TYPOGRAPHY.family.bold,
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
    fontFamily: TYPOGRAPHY.family.semibold,
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
    fontFamily: TYPOGRAPHY.family.medium,
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
    fontFamily: TYPOGRAPHY.family.bold,
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
    fontFamily: TYPOGRAPHY.family.medium,
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

  buttonWrapper: {
    flex: 1,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },

  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.lg,
    gap: SPACING[2],
  },

  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#374151',
  },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.lg,
    gap: SPACING[2],
  },

  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: 'white',
  },
});
