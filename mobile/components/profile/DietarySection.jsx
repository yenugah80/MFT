/**
 * DietarySection - Premium Dietary Preferences Editor
 *
 * Features:
 * - Premium glassmorphism card styling
 * - Animated chip selection with spring animations
 * - Haptic feedback on interactions
 * - Danger-styled allergy pills
 * - Staggered entrance animations
 */

import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import EditableSection from '../EditableSection';
import TagInput from '../TagInput';
import { DIETARY_PRESETS } from '../../constants/profileConfig';
import { BRAND, SURFACES, TEXT, SEMANTIC, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ANIMATION, ICON_SIZES } from '../../constants/premiumTheme';

// Animated chip component with spring animation
const AnimatedChip = ({ label, isSelected, onPress, index, isEditing }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  // Staggered entrance animation
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 80,
      tension: ANIMATION.spring.tension,
      friction: ANIMATION.spring.friction,
      useNativeDriver: true,
    }).start();
  }, [index, scaleAnim]);

  const handlePressIn = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 0.95,
      tension: 400,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [pressAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 1,
      tension: 400,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [pressAnim]);

  const handlePress = useCallback(() => {
    if (!isEditing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [isEditing, onPress]);

  return (
    <Animated.View
      style={{
        transform: [
          { scale: Animated.multiply(scaleAnim, pressAnim) },
        ],
        opacity: scaleAnim,
      }}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        disabled={!isEditing}
        style={[
          styles.chip,
          isSelected && styles.chipSelected,
          !isEditing && styles.chipDisabled,
        ]}
      >
        {isSelected && (
          <Ionicons
            name="checkmark-circle"
            size={16}
            color={TEXT.white}
            style={styles.chipIcon}
          />
        )}
        <Text style={[
          styles.chipText,
          isSelected && styles.chipTextSelected,
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const SEVERITY_COLORS = {
  mild:        { bg: '#fef3c7', text: '#92400e', dot: '#d97706' },
  moderate:    { bg: '#ffedd5', text: '#9a3412', dot: '#ea580c' },
  severe:      { bg: '#fee2e2', text: '#991b1b', dot: '#dc2626' },
  anaphylaxis: { bg: '#fde8e8', text: '#7f1d1d', dot: '#7f1d1d' },
};

const SEVERITY_OPTIONS = ['mild', 'moderate', 'severe', 'anaphylaxis'];
const TYPE_OPTIONS     = ['allergy', 'intolerance', 'preference'];

// Allergy pill with danger styling
const AllergyPill = ({ label, severity, type, onRemove, onSeverityChange, onTypeChange, isEditing, index }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 80,
      tension: ANIMATION.spring.tension,
      friction: ANIMATION.spring.friction,
      useNativeDriver: true,
    }).start();
  }, [index, scaleAnim]);

  const handleRemove = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Animate out
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => onRemove());
  }, [scaleAnim, onRemove]);

  const sevColors = SEVERITY_COLORS[severity] || SEVERITY_COLORS.moderate;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: scaleAnim }}>
      {/* Main pill row */}
      <View style={styles.allergyPill}>
        <View style={[styles.severityDot, { backgroundColor: sevColors.dot }]} />
        <Text style={styles.allergyText}>{label}</Text>
        {/* Severity badge */}
        <View style={[styles.severityBadge, { backgroundColor: sevColors.bg }]}>
          <Text style={[styles.severityBadgeText, { color: sevColors.text }]}>
            {severity || 'moderate'}
          </Text>
        </View>
        {/* Type badge */}
        {type && type !== 'allergy' && (
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{type}</Text>
          </View>
        )}
        {isEditing && (
          <TouchableOpacity
            onPress={handleRemove}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={18} color={SEMANTIC.danger.base} />
          </TouchableOpacity>
        )}
      </View>

      {/* Inline edit controls — only shown in edit mode */}
      {isEditing && (
        <View style={styles.allergyEditControls}>
          <View style={styles.allergyPickerRow}>
            {SEVERITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => onSeverityChange && onSeverityChange(label, opt)}
                style={[
                  styles.allergyPickerChip,
                  severity === opt && {
                    backgroundColor: (SEVERITY_COLORS[opt] || {}).dot || SEMANTIC.danger.base,
                    borderColor: (SEVERITY_COLORS[opt] || {}).dot || SEMANTIC.danger.base,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.allergyPickerChipText,
                    severity === opt && { color: '#fff' },
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.allergyPickerRow}>
            {TYPE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => onTypeChange && onTypeChange(label, opt)}
                style={[
                  styles.allergyPickerChip,
                  type === opt && { backgroundColor: SEMANTIC.info?.base || '#3b82f6', borderColor: SEMANTIC.info?.base || '#3b82f6' },
                ]}
              >
                <Text
                  style={[
                    styles.allergyPickerChipText,
                    type === opt && { color: '#fff' },
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </Animated.View>
  );
};

// Dislike pill with neutral styling
const DislikePill = ({ label, onRemove, isEditing, index }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 80,
      tension: ANIMATION.spring.tension,
      friction: ANIMATION.spring.friction,
      useNativeDriver: true,
    }).start();
  }, [index, scaleAnim]);

  const handleRemove = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => onRemove());
  }, [scaleAnim, onRemove]);

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: scaleAnim,
      }}
    >
      <View style={styles.dislikePill}>
        <Text style={styles.dislikeText}>{label}</Text>
        {isEditing && (
          <TouchableOpacity
            onPress={handleRemove}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={TEXT.muted}
            />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

export default function DietarySection({
  dietary,
  isEditing,
  toggleEdit,
  saveSection,
  cancelEdit,
  updateField,
  status,
}) {
  const togglePreference = useCallback((pref) => {
    const current = dietary.preferences || [];
    const updated = current.includes(pref)
      ? current.filter(p => p !== pref)
      : [...current, pref];
    updateField('dietary', 'preferences', updated);
  }, [dietary.preferences, updateField]);

  const addAllergy = useCallback((tag) => {
    const current = dietary.allergies || [];
    if (!current.includes(tag)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      updateField('dietary', 'allergies', [...current, tag]);
      // Default severity/type when a new allergy is added
      const sev = { ...(dietary.allergenSeverity || {}), [tag]: 'moderate' };
      const typ = { ...(dietary.intoleranceType  || {}), [tag]: 'allergy'  };
      updateField('dietary', 'allergenSeverity', sev);
      updateField('dietary', 'intoleranceType',  typ);
    }
  }, [dietary.allergies, dietary.allergenSeverity, dietary.intoleranceType, updateField]);

  const removeAllergy = useCallback((tag) => {
    const current = dietary.allergies || [];
    updateField('dietary', 'allergies', current.filter(t => t !== tag));
    // Remove orphan severity/type entries
    const sev = { ...(dietary.allergenSeverity || {}) };
    const typ = { ...(dietary.intoleranceType  || {}) };
    delete sev[tag];
    delete typ[tag];
    updateField('dietary', 'allergenSeverity', sev);
    updateField('dietary', 'intoleranceType',  typ);
  }, [dietary.allergies, dietary.allergenSeverity, dietary.intoleranceType, updateField]);

  const updateAllergenSeverity = useCallback((tag, severity) => {
    updateField('dietary', 'allergenSeverity', {
      ...(dietary.allergenSeverity || {}), [tag]: severity,
    });
  }, [dietary.allergenSeverity, updateField]);

  const updateAllergenType = useCallback((tag, type) => {
    updateField('dietary', 'intoleranceType', {
      ...(dietary.intoleranceType || {}), [tag]: type,
    });
  }, [dietary.intoleranceType, updateField]);

  const addDislike = useCallback((tag) => {
    const current = dietary.dislikes || [];
    if (!current.includes(tag)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updateField('dietary', 'dislikes', [...current, tag]);
    }
  }, [dietary.dislikes, updateField]);

  const removeDislike = useCallback((tag) => {
    const current = dietary.dislikes || [];
    updateField('dietary', 'dislikes', current.filter(t => t !== tag));
  }, [dietary.dislikes, updateField]);

  return (
    <EditableSection
      title="Dietary Preferences"
      isEditing={isEditing}
      onToggleEdit={toggleEdit}
      onSave={saveSection}
      onCancel={cancelEdit}
      isSaving={status === 'saving'}
    >
      <View style={styles.content}>
        {/* Diet Type Section */}
        <View style={styles.subsection}>
          <View style={styles.subsectionHeader}>
            <LinearGradient
              colors={SURFACES.gradient.softPurple}
              style={styles.subsectionIcon}
            >
              <Ionicons name="leaf" size={ICON_SIZES.xs} color={BRAND.primary} />
            </LinearGradient>
            <Text style={styles.subsectionTitle}>Diet Type</Text>
          </View>

          <View style={styles.chipRow}>
            {DIETARY_PRESETS.map((pref, index) => (
              <AnimatedChip
                key={pref}
                label={pref}
                isSelected={dietary.preferences?.includes(pref)}
                onPress={() => togglePreference(pref)}
                index={index}
                isEditing={isEditing}
              />
            ))}
          </View>

          {!isEditing && (!dietary.preferences || dietary.preferences.length === 0) && (
            <Text style={styles.emptyText}>No preferences set</Text>
          )}
        </View>

        {/* Allergies Section */}
        <View style={styles.subsection}>
          <View style={styles.subsectionHeader}>
            <LinearGradient
              colors={SURFACES.gradient.danger}
              style={styles.subsectionIcon}
            >
              <Ionicons name="warning" size={ICON_SIZES.xs} color={TEXT.white} />
            </LinearGradient>
            <Text style={styles.subsectionTitle}>Allergies & Restrictions</Text>
            <View style={styles.dangerBadge}>
              <Text style={styles.dangerBadgeText}>Important</Text>
            </View>
          </View>

          {isEditing ? (
            <TagInput
              tags={dietary.allergies || []}
              onAdd={addAllergy}
              onRemove={removeAllergy}
              placeholder="Add allergy (e.g. Peanuts)"
              variant="danger"
            />
          ) : (
            <View style={styles.pillRow}>
              {dietary.allergies?.length > 0 ? (
                dietary.allergies.map((tag, index) => (
                  <AllergyPill
                    key={tag}
                    label={tag}
                    severity={(dietary.allergenSeverity || {})[tag] || 'moderate'}
                    type={(dietary.intoleranceType || {})[tag] || 'allergy'}
                    onRemove={() => removeAllergy(tag)}
                    onSeverityChange={updateAllergenSeverity}
                    onTypeChange={updateAllergenType}
                    isEditing={isEditing}
                    index={index}
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>No allergies listed</Text>
              )}
            </View>
          )}
        </View>

        {/* Dislikes Section */}
        <View style={styles.subsection}>
          <View style={styles.subsectionHeader}>
            <LinearGradient
              colors={SURFACES.gradient.purple}
              style={styles.subsectionIcon}
            >
              <Ionicons name="thumbs-down" size={ICON_SIZES.xs} color={TEXT.white} />
            </LinearGradient>
            <Text style={styles.subsectionTitle}>Dislikes</Text>
          </View>

          {isEditing ? (
            <TagInput
              tags={dietary.dislikes || []}
              onAdd={addDislike}
              onRemove={removeDislike}
              placeholder="Add dislike (e.g. Mushrooms)"
              variant="default"
            />
          ) : (
            <View style={styles.pillRow}>
              {dietary.dislikes?.length > 0 ? (
                dietary.dislikes.map((tag, index) => (
                  <DislikePill
                    key={tag}
                    label={tag}
                    onRemove={() => removeDislike(tag)}
                    isEditing={isEditing}
                    index={index}
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>No dislikes listed</Text>
              )}
            </View>
          )}
        </View>
      </View>
    </EditableSection>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: SPACING[5],
  },
  subsection: {
    gap: SPACING[3],
  },
  subsectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  subsectionIcon: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subsectionTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    flex: 1,
  },
  dangerBadge: {
    backgroundColor: SEMANTIC.danger.bg,
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  dangerBadgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: SEMANTIC.danger.dark,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.full,
    backgroundColor: SURFACES.card.primary,
    borderWidth: 1.5,
    borderColor: SURFACES.card.border,
    ...SHADOWS.sm,
  },
  chipSelected: {
    backgroundColor: BRAND.primary,
    borderColor: BRAND.primary,
  },
  chipDisabled: {
    opacity: 0.7,
  },
  chipIcon: {
    marginRight: 4,
  },
  chipText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  chipTextSelected: {
    color: TEXT.white,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  allergyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.full,
    backgroundColor: SEMANTIC.danger.bg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    gap: SPACING[1],
  },
  allergyIcon: {
    marginRight: 2,
  },
  allergyText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: SEMANTIC.danger.dark,
    flex: 1,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 2,
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  severityBadgeText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    textTransform: 'capitalize',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(59,130,246,0.10)',
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.medium,
    color: '#1d4ed8',
    textTransform: 'capitalize',
  },
  allergyEditControls: {
    gap: 6,
    paddingTop: 6,
    paddingLeft: 14,
  },
  allergyPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  allergyPickerChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(107,114,128,0.25)',
    backgroundColor: SURFACES.background.tertiary,
  },
  allergyPickerChipText: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
    textTransform: 'capitalize',
  },
  dislikePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.full,
    backgroundColor: SURFACES.background.tertiary,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.15)',
    gap: SPACING[1],
  },
  dislikeText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.muted,
    fontStyle: 'italic',
  },
});
