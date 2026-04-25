/**
 * Onboarding Step 3 — "The Organic Editorial" Design System
 *
 * Rules enforced:
 *   - Zero 1px borders — tonal background shift only
 *   - Tabs: #d2f7d8 → #beeec8 active, background-only switching (no border-bottom)
 *   - Content section card: #d2f7d8 background, no borderLeft
 *   - Smart suggestions: #beeec8 pills, no borders
 *   - Allergy note: rgba(170,55,28,0.05) tint, #aa371c text — no borders
 *   - Strength section: #d2f7d8 background, no borders
 *   - Buttons: pill borderRadius 999, gradient #1c6d25→#9df197 primary
 *   - Ambient shadows: rgba(14, 58, 32, 0.06)
 *   - Spring animations: stiffness 300, damping 20
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Animated,
  Alert,
  AccessibilityInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import ChipSelector from '../../components/onboarding/ChipSelector';
import PreferenceStrengthSelector from '../../components/onboarding/PreferenceStrengthSelector';
import PreferenceCombinationCard from '../../components/onboarding/PreferenceCombinationCard';

import { useOnboarding } from '../../contexts/OnboardingContext';
import {
  getSmartCuisineSuggestions,
  getPreferenceCombinationExplanation,
  SAMPLE_DISHES,
} from '../../utils/onboardingSmartSuggestions';
import {
  DIETARY_PREFERENCES,
  ALLERGIES,
  CUISINE_PREFERENCES,
  ONBOARDING_COPY,
  A11Y_LABELS,
} from '../../constants/onboardingConfig';
import { TYPOGRAPHY } from '../../constants/premiumTheme';

const DS = {
  surfContainer:    '#d2f7d8',
  surfContainerHi:  '#beeec8',
  primary:          '#1c6d25',
  onSurface:        '#0e3a20',
  onSurfaceVar:     'rgba(14, 58, 32, 0.50)',
  error:            '#aa371c',
  errorTint:        'rgba(170, 55, 28, 0.05)',
  ambientShadow:    'rgba(14, 58, 32, 0.06)',
};

/* Data normalization helpers */
const normalizePreference = (pref) => {
  if (!pref) return { id: '', strength: 3 };
  return typeof pref === 'string' ? { id: pref, strength: 3 } : pref;
};

const normalizePreferences = (prefs) => {
  const normalized = (prefs || []).map(normalizePreference);
  const seen = new Set();
  return normalized.filter(({ id }) => {
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const getSampleDishId = (firstPref) => {
  if (!firstPref) return null;
  return typeof firstPref === 'string' ? firstPref : (firstPref?.id || null);
};

/* Animated pill button */
const PillButton = ({ onPress, colors, children, wrapperStyle }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (to) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, stiffness: 300, damping: 20 }).start();
  return (
    <Animated.View style={[{ transform: [{ scale }] }, wrapperStyle]}>
      <Pressable onPress={onPress} onPressIn={() => spring(0.96)} onPressOut={() => spring(1)}>
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.pillGradient}>
          {children}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const Step3Screen = () => {
  const { step3Data, updateStepData, goToNextStep, goToPreviousStep } = useOnboarding();

  const [activeSection, setActiveSection] = useState(0);
  const fadeAnimsRef = useRef([0, 1, 2].map(() => new Animated.Value(0)));
  const fadeAnims = fadeAnimsRef.current;
  const [smartSuggestedCuisines, setSmartSuggestedCuisines] = useState([]);
  const [preferenceCombination, setPreferenceCombination] = useState(null);
  const [strengthValues, setStrengthValues] = useState({});

  useEffect(() => {
    const initialStrengths = {};
    normalizePreferences(step3Data.dietaryPreferences).forEach(({ id, strength }) => {
      if (id) initialStrengths[`dietary-${id}`] = strength || 3;
    });
    normalizePreferences(step3Data.cuisinePreferences).forEach(({ id, strength }) => {
      if (id) initialStrengths[`cuisine-${id}`] = strength || 3;
    });
    setStrengthValues(initialStrengths);
  }, [step3Data]);

  useEffect(() => {
    const dietaryPrefs = step3Data.dietaryPreferences || [];
    setSmartSuggestedCuisines(getSmartCuisineSuggestions(dietaryPrefs));
    if (dietaryPrefs.length > 0 || (step3Data.cuisinePreferences || []).length > 0) {
      setPreferenceCombination(getPreferenceCombinationExplanation(dietaryPrefs, step3Data.cuisinePreferences || []));
    } else {
      setPreferenceCombination(null);
    }
  }, [step3Data.dietaryPreferences, step3Data.cuisinePreferences]);

  useEffect(() => {
    fadeAnims[activeSection].setValue(0);
    Animated.timing(fadeAnims[activeSection], { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, [activeSection, fadeAnims]);

  const sections = useMemo(() => [
    {
      id: 'dietary',
      label: 'Dietary Style',
      shortDesc: 'How you eat',
      icon: 'leaf-outline',
      items: DIETARY_PREFERENCES,
      selectedItems: normalizePreferences(step3Data.dietaryPreferences),
      onSelect: (selected) => {
        updateStepData('step3', {
          dietaryPreferences: selected.map((item) => ({
            id: typeof item === 'string' ? item : item.id,
            strength: 3,
          })),
        });
      },
      showStrengthSliders: true,
    },
    {
      id: 'allergies',
      label: 'Allergies',
      shortDesc: 'Foods to avoid',
      icon: 'alert-circle-outline',
      items: ALLERGIES,
      selectedItems: step3Data.allergies || [],
      onSelect: (selected) => updateStepData('step3', { allergies: selected }),
      showNote: true,
      showStrengthSliders: false,
    },
    {
      id: 'cuisine',
      label: 'Cuisines',
      shortDesc: 'Favorite styles',
      icon: 'restaurant-outline',
      items: CUISINE_PREFERENCES,
      selectedItems: normalizePreferences(step3Data.cuisinePreferences),
      onSelect: (selected) => {
        updateStepData('step3', {
          cuisinePreferences: selected.map((item) => ({
            id: typeof item === 'string' ? item : item.id,
            strength: 3,
          })),
        });
      },
      showStrengthSliders: true,
      smartSuggested: smartSuggestedCuisines,
    },
  ], [step3Data, smartSuggestedCuisines, updateStepData]);

  const currentSection = sections[activeSection];

  const handleStrengthChange = useCallback((itemId, strength) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const clamped = Math.max(1, Math.min(5, strength));
    const key = `${currentSection.id}-${itemId}`;
    setStrengthValues((prev) => ({ ...prev, [key]: clamped }));
    if (currentSection.id === 'dietary' || currentSection.id === 'cuisine') {
      const dataKey = currentSection.id === 'dietary' ? 'dietaryPreferences' : 'cuisinePreferences';
      const currentItems = step3Data[dataKey] || [];
      updateStepData('step3', {
        [dataKey]: currentItems.map((item) => {
          const id = typeof item === 'string' ? item : item.id;
          return { id, strength: id === itemId ? clamped : (typeof item === 'object' ? item.strength : 3) };
        }),
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
    if (!(step3Data.dietaryPreferences?.length > 0)) {
      Alert.alert('Dietary Preferences Required', 'Please select at least one dietary preference to continue.', [{ text: 'OK' }]);
      return;
    }
    const dietaryPrefs = (step3Data.dietaryPreferences || []).map((item) => {
      const id = typeof item === 'string' ? item : item.id;
      return { id, strength: strengthValues[`dietary-${id}`] || 3 };
    });
    const cuisinePrefs = (step3Data.cuisinePreferences || []).map((item) => {
      const id = typeof item === 'string' ? item : item.id;
      return { id, strength: strengthValues[`cuisine-${id}`] || 3 };
    });
    updateStepData('step3', { dietaryPreferences: dietaryPrefs, cuisinePreferences: cuisinePrefs });
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
      {/* ── Section tabs — background-only switching ── */}
      <View style={styles.tabsRow}>
        {sections.map((section, index) => {
          const isActive = activeSection === index;
          const count = section.selectedItems.length;
          return (
            <Pressable
              key={section.id}
              onPress={() => handleSectionChange(index)}
              style={[styles.tab, isActive ? styles.tabActive : styles.tabInactive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${section.label}, ${section.shortDesc}, ${count} selected`}
            >
              <Ionicons
                name={section.icon}
                size={20}
                color={isActive ? DS.primary : DS.onSurfaceVar}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {section.label}
              </Text>
              <Text style={[styles.tabSub, isActive && styles.tabSubActive]}>
                {section.shortDesc}
              </Text>
              {count > 0 && (
                <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
                  <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* ── Animated content card ── */}
      <Animated.View style={[styles.contentCard, { opacity: fadeAnims[activeSection] }]}>
        {/* Header */}
        <View style={styles.contentHeader}>
          <Ionicons name={currentSection.icon} size={22} color={DS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.contentTitle}>{currentSection.label}</Text>
          </View>
        </View>

        {/* Chips */}
        <ChipSelector
          title=""
          items={currentSection.items}
          selectedItems={currentSection.selectedItems}
          onSelectionChange={currentSection.onSelect}
          multiSelect={true}
        />

        {/* Smart suggestions — cuisine tab */}
        {currentSection.id === 'cuisine' && smartSuggestedCuisines.length > 0 && (
          <View style={styles.suggestionsCard}>
            <View style={styles.suggestionsHeader}>
              <Ionicons name="bulb-outline" size={15} color={DS.primary} />
              <Text style={styles.suggestionsTitle}>Smart Suggestions</Text>
            </View>
            <Text style={styles.suggestionsHint}>Based on your dietary preferences</Text>
            <View style={styles.suggestionChips}>
              {smartSuggestedCuisines.map((cuisine) => (
                <View key={cuisine} style={styles.suggestionChip}>
                  <Text style={styles.suggestionChipText}>{cuisine}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Allergy warning */}
        {currentSection.showNote && (
          <View style={styles.allergyNote}>
            <Ionicons name="warning-outline" size={15} color={DS.error} />
            <Text style={styles.allergyNoteText}>
              Selected items will be excluded from all recommendations
            </Text>
          </View>
        )}
      </Animated.View>

      {/* ── Strength sliders ── */}
      {currentSection.showStrengthSliders && currentSection.selectedItems.length > 0 && (
        <View style={styles.strengthCard}>
          <Text style={styles.strengthTitle}>Preference Strength</Text>
          <Text style={styles.strengthHint}>How important is each preference?</Text>
          <View style={styles.slidersContainer}>
            {currentSection.selectedItems
              .filter((item, idx, self) => {
                const id = typeof item === 'string' ? item : item.id;
                return self.findIndex((i) => (typeof i === 'string' ? i : i.id) === id) === idx;
              })
              .map((item) => {
                const itemId = typeof item === 'string' ? item : item.id;
                const key = `${currentSection.id}-${itemId}`;
                return (
                  <PreferenceStrengthSelector
                    key={key}
                    preferenceId={itemId}
                    preferenceLabel={typeof item === 'string' ? item : item.label}
                    currentStrength={strengthValues[key] || 3}
                    onStrengthChange={(s) => handleStrengthChange(itemId, s)}
                    showDescription={true}
                  />
                );
              })}
          </View>
        </View>
      )}

      {/* ── Preference combination card ── */}
      {preferenceCombination && (
        <PreferenceCombinationCard
          title={preferenceCombination.title}
          description={preferenceCombination.description}
          dietaryPrefs={step3Data.dietaryPreferences || []}
          cuisinePrefs={step3Data.cuisinePreferences || []}
          sampleDishes={(() => {
            const firstPref = step3Data.dietaryPreferences?.[0];
            const dishId = getSampleDishId(firstPref);
            return dishId && SAMPLE_DISHES[dishId] ? SAMPLE_DISHES[dishId] : [];
          })()}
        />
      )}

      {/* ── Skip link ── */}
      <Pressable
        onPress={handleSkip}
        style={({ pressed }) => pressed && { opacity: 0.6 }}
        accessibilityRole="button"
        accessibilityLabel="Skip this step"
      >
        <Text style={styles.skipText}>{ONBOARDING_COPY.step3.skipBtn || 'Skip for now'}</Text>
      </Pressable>

      {/* ── Navigation buttons ── */}
      <View style={styles.buttonRow}>
        <Pressable
          onPress={goToPreviousStep}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.75 }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={18} color={DS.onSurface} />
          <Text style={styles.backBtnText}>{ONBOARDING_COPY.step3.backBtn || 'Back'}</Text>
        </Pressable>

        <PillButton
          onPress={handleContinue}
          colors={['#1c6d25', '#9df197']}
          wrapperStyle={styles.continueWrapper}
        >
          <Text style={styles.continueBtnText}>{ONBOARDING_COPY.step3.continueBtn || 'Continue'}</Text>
          <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.9)" />
        </PillButton>
      </View>
    </OnboardingLayout>
  );
};

export default Step3Screen;

const styles = StyleSheet.create({
  /* ── Tabs ── */
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 18,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  tabInactive: {
    backgroundColor: DS.surfContainer,
    opacity: 0.65,
  },
  tabActive: {
    backgroundColor: DS.surfContainerHi,
    shadowColor: DS.ambientShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.bold,
    color: DS.onSurfaceVar,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: DS.primary,
  },
  tabSub: {
    fontSize: 9,
    fontFamily: TYPOGRAPHY.family.regular,
    color: DS.onSurfaceVar,
    textAlign: 'center',
  },
  tabSubActive: {
    color: DS.onSurface,
    opacity: 0.7,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeInactive: {
    backgroundColor: DS.surfContainer,
  },
  badgeActive: {
    backgroundColor: DS.primary,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: TYPOGRAPHY.family.bold,
    color: DS.onSurfaceVar,
  },
  badgeTextActive: {
    color: '#ffffff',
  },

  /* ── Content card ── */
  contentCard: {
    backgroundColor: DS.surfContainer,
    borderRadius: 20,
    padding: 16,
    gap: 14,
    marginBottom: 14,
    shadowColor: DS.ambientShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contentTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: DS.onSurface,
  },

  /* Smart suggestions */
  suggestionsCard: {
    backgroundColor: DS.surfContainerHi,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suggestionsTitle: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.bold,
    color: DS.primary,
  },
  suggestionsHint: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.regular,
    color: DS.onSurfaceVar,
    marginBottom: 4,
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: DS.surfContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  suggestionChipText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: DS.primary,
    textTransform: 'capitalize',
  },

  /* Allergy note */
  allergyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: DS.errorTint,
    borderRadius: 12,
    padding: 12,
  },
  allergyNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.medium,
    color: DS.error,
    lineHeight: 16,
  },

  /* Strength sliders */
  strengthCard: {
    backgroundColor: DS.surfContainer,
    borderRadius: 20,
    padding: 16,
    gap: 8,
    marginBottom: 14,
    shadowColor: DS.ambientShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
  strengthTitle: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.bold,
    color: DS.onSurface,
  },
  strengthHint: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: DS.onSurfaceVar,
  },
  slidersContainer: {
    gap: 12,
    marginTop: 4,
  },

  /* Skip */
  skipText: {
    textAlign: 'center',
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.medium,
    color: DS.onSurfaceVar,
    marginVertical: 8,
  },

  /* Navigation */
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
});
