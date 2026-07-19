/**
 * Onboarding Step 3 — matches the warm-cream / deep-green editorial
 * brand established in the auth flow (see components/auth).
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

import { useOnboarding } from '../../contexts/OnboardingContext';
import { getSmartCuisineSuggestions } from '../../utils/onboardingSmartSuggestions';
import {
  DIETARY_PREFERENCES,
  ALLERGIES,
  CUISINE_PREFERENCES,
  ONBOARDING_COPY,
  A11Y_LABELS,
} from '../../constants/onboardingConfig';
import { AUTH_COLORS } from '../../components/auth/constants';

const DS = {
  surfContainer:    'rgba(255, 255, 255, 0.82)',
  surfContainerHi:  'rgba(107, 78, 255, 0.05)',
  primary:          AUTH_COLORS.primary,
  primaryLight:     AUTH_COLORS.primaryLight,
  onSurface:        AUTH_COLORS.ink,
  onSurfaceVar:     AUTH_COLORS.muted,
  error:            AUTH_COLORS.danger,
  errorTint:        AUTH_COLORS.dangerBg,
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

/* Animated pill button */
const PillButton = ({ onPress, colors, children, wrapperStyle }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (to) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, stiffness: 300, damping: 20 }).start();
  return (
    <Animated.View style={[{ transform: [{ scale }] }, wrapperStyle]}>
      <Pressable onPress={onPress} onPressIn={() => spring(0.96)} onPressOut={() => spring(1)}>
        <LinearGradient colors={colors} start={{ x: 0, y: 0.2 }} end={{ x: 1, y: 0.8 }} style={styles.pillGradient}>
          {children}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const SEVERITY_OPTIONS = [
  { id: 'mild',        label: 'Mild',        color: '#d97706' },
  { id: 'moderate',   label: 'Moderate',    color: '#ea580c' },
  { id: 'severe',     label: 'Severe',      color: '#dc2626' },
  { id: 'anaphylaxis', label: 'Anaphylaxis', color: '#7f1d1d' },
];
const TYPE_OPTIONS = [
  { id: 'allergy',     label: 'Allergy' },
  { id: 'intolerance', label: 'Intolerance' },
  { id: 'preference',  label: 'Preference' },
];

const AllergenDetailRow = ({ allergen, severity, type, onSeverityChange, onTypeChange }) => (
  <View style={styles.allergenDetailRow}>
    <Text style={styles.allergenDetailName}>{allergen}</Text>
    <View style={styles.allergenDetailPickers}>
      <View style={styles.allergenPickerGroup}>
        {SEVERITY_OPTIONS.map((opt) => (
          <Pressable
            key={opt.id}
            onPress={() => onSeverityChange(allergen, opt.id)}
            style={[
              styles.allergenChip,
              severity === opt.id && { backgroundColor: opt.color, borderColor: opt.color },
            ]}
          >
            <Text style={[styles.allergenChipText, severity === opt.id && { color: '#fff' }]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.allergenPickerGroup}>
        {TYPE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.id}
            onPress={() => onTypeChange(allergen, opt.id)}
            style={[
              styles.allergenChip,
              type === opt.id && { backgroundColor: DS.primary, borderColor: DS.primary },
            ]}
          >
            <Text style={[styles.allergenChipText, type === opt.id && { color: '#fff' }]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  </View>
);

const Step3Screen = () => {
  const { step3Data, updateStepData, goToNextStep, goToPreviousStep } = useOnboarding();

  const [activeSection, setActiveSection] = useState(0);
  const fadeAnimsRef = useRef([0, 1, 2].map(() => new Animated.Value(0)));
  const fadeAnims = fadeAnimsRef.current;
  const [smartSuggestedCuisines, setSmartSuggestedCuisines] = useState([]);
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
  }, [step3Data.dietaryPreferences]);

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

  const handleAllergenSeverityChange = useCallback((allergen, severity) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateStepData('step3', {
      allergenSeverity: { ...(step3Data.allergenSeverity || {}), [allergen]: severity },
    });
  }, [step3Data.allergenSeverity, updateStepData]);

  const handleAllergenTypeChange = useCallback((allergen, type) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateStepData('step3', {
      intoleranceType: { ...(step3Data.intoleranceType || {}), [allergen]: type },
    });
  }, [step3Data.intoleranceType, updateStepData]);

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
      onSkip={handleSkip}
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

        {/* Strength — compact inline rows, only for selected items */}
        {currentSection.showStrengthSliders && currentSection.selectedItems.length > 0 && (
          <View style={styles.strengthInline}>
            <Text style={styles.strengthInlineCaption}>How important is each one?</Text>
            {currentSection.selectedItems
              .filter((item, idx, self) => {
                const id = typeof item === 'string' ? item : item.id;
                return self.findIndex((i) => (typeof i === 'string' ? i : i.id) === id) === idx;
              })
              .map((item) => {
                const itemId = typeof item === 'string' ? item : item.id;
                const key = `${currentSection.id}-${itemId}`;
                const itemLabel = currentSection.items.find((i) => i.id === itemId)?.label || itemId;
                return (
                  <PreferenceStrengthSelector
                    key={key}
                    preferenceLabel={itemLabel}
                    currentStrength={strengthValues[key] || 3}
                    onStrengthChange={(s) => handleStrengthChange(itemId, s)}
                  />
                );
              })}
          </View>
        )}

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

        {/* Severity & type detail panel — shown when allergies are selected */}
        {currentSection.id === 'allergies' && (step3Data.allergies || []).length > 0 && (
          <View style={styles.severityPanel}>
            <View style={styles.severityPanelHeader}>
              <Ionicons name="medical-outline" size={15} color={DS.primary} />
              <Text style={styles.severityPanelTitle}>Severity & Type</Text>
            </View>
            <Text style={styles.severityPanelHint}>
              Help us personalise your experience — tap to set each allergen's severity and whether it's an allergy or intolerance.
            </Text>
            {(step3Data.allergies || []).map((allergen) => (
              <AllergenDetailRow
                key={allergen}
                allergen={allergen}
                severity={(step3Data.allergenSeverity || {})[allergen] || 'moderate'}
                type={(step3Data.intoleranceType || {})[allergen] || 'allergy'}
                onSeverityChange={handleAllergenSeverityChange}
                onTypeChange={handleAllergenTypeChange}
              />
            ))}
          </View>
        )}
      </Animated.View>

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
          colors={[AUTH_COLORS.primaryLight, AUTH_COLORS.primary, AUTH_COLORS.primaryDeep]}
          wrapperStyle={styles.continueWrapper}
        >
          <Text style={styles.continueBtnText}>{ONBOARDING_COPY.step3.continueBtn || 'Continue'}</Text>
          <Ionicons name="arrow-forward" size={18} color={AUTH_COLORS.white} />
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
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  tabInactive: {
    backgroundColor: DS.surfContainerHi,
    opacity: 0.70,
  },
  tabActive: {
    backgroundColor: DS.surfContainer,
    borderWidth: 1.5,
    borderColor: 'rgba(15, 36, 31, 0.08)',
    shadowColor: 'rgba(7, 19, 30, 0.16)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_700Bold',
    color: DS.onSurfaceVar,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: DS.primary,
  },
  tabSub: {
    fontSize: 9,
    fontFamily: 'DMSans_400Regular',
    color: DS.onSurfaceVar,
    textAlign: 'center',
  },
  tabSubActive: {
    color: DS.onSurface,
    opacity: 0.65,
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
    backgroundColor: 'rgba(15,36,31,0.10)',
  },
  badgeActive: {
    backgroundColor: DS.primary,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: 'DMSans_700Bold',
    color: DS.onSurfaceVar,
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },

  /* ── Content card ── */
  contentCard: {
    backgroundColor: DS.surfContainer,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(15, 36, 31, 0.08)',
    padding: 18,
    gap: 14,
    marginBottom: 14,
    shadowColor: 'rgba(7, 19, 30, 0.16)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contentTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: DS.onSurface,
    letterSpacing: -0.2,
  },

  /* Smart suggestions */
  suggestionsCard: {
    backgroundColor: 'rgba(107, 78, 255, 0.06)',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suggestionsTitle: {
    fontSize: 13,
    fontFamily: 'DMSans_700Bold',
    color: DS.primary,
  },
  suggestionsHint: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: DS.onSurfaceVar,
    marginBottom: 4,
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    shadowColor: 'rgba(0,0,0,1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  suggestionChipText: {
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
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
    padding: 14,
  },
  allergyNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: DS.error,
    lineHeight: 17,
  },

  /* Strength — compact inline rows within the content card */
  strengthInline: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 36, 31, 0.07)',
    paddingTop: 10,
    gap: 2,
  },
  strengthInlineCaption: {
    fontSize: 11,
    fontFamily: 'DMSans_700Bold',
    color: DS.onSurfaceVar,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },

  /* Skip */

  /* Navigation */
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 17,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.92)',
  },
  backBtnText: {
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
    color: DS.onSurface,
  },
  continueWrapper: {
    borderRadius: 999,
    shadowColor: 'rgba(3, 21, 35, 0.34)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 6,
  },
  pillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 17,
    paddingHorizontal: 32,
    borderRadius: 999,
    overflow: 'hidden',
  },
  continueBtnText: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  /* Severity panel */
  severityPanel: {
    backgroundColor: 'rgba(107, 78, 255, 0.06)',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    marginTop: 4,
  },
  severityPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  severityPanelTitle: {
    fontSize: 13,
    fontFamily: 'DMSans_700Bold',
    color: DS.primary,
  },
  severityPanelHint: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: DS.onSurfaceVar,
    lineHeight: 17,
  },
  allergenDetailRow: {
    gap: 6,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15,36,31,0.07)',
  },
  allergenDetailName: {
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
    color: DS.onSurface,
    textTransform: 'capitalize',
  },
  allergenDetailPickers: {
    gap: 6,
  },
  allergenPickerGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  allergenChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(15,36,31,0.12)',
    backgroundColor: '#FFFFFF',
  },
  allergenChipText: {
    fontSize: 11,
    fontFamily: 'DMSans_700Bold',
    color: DS.onSurface,
  },
});
