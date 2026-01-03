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
import {
  BRAND,
  SURFACES,
  TEXT,
  SEMANTIC,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  ANIMATION,
} from '../../constants/premiumTheme';

// Animated chip component with spring animation
const AnimatedChip = ({ label, isSelected, onPress, index, isEditing }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  // Staggered entrance animation
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 50,
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

// Allergy pill with danger styling
const AllergyPill = ({ label, onRemove, isEditing, index }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 30,
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

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: scaleAnim,
      }}
    >
      <View style={styles.allergyPill}>
        <Ionicons
          name="warning"
          size={14}
          color={SEMANTIC.danger.dark}
          style={styles.allergyIcon}
        />
        <Text style={styles.allergyText}>{label}</Text>
        {isEditing && (
          <TouchableOpacity
            onPress={handleRemove}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={SEMANTIC.danger.base}
            />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

// Dislike pill with neutral styling
const DislikePill = ({ label, onRemove, isEditing, index }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 30,
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
    }
  }, [dietary.allergies, updateField]);

  const removeAllergy = useCallback((tag) => {
    const current = dietary.allergies || [];
    updateField('dietary', 'allergies', current.filter(t => t !== tag));
  }, [dietary.allergies, updateField]);

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
              <Ionicons name="leaf" size={16} color={BRAND.primary} />
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
              <Ionicons name="warning" size={16} color={TEXT.white} />
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
                    onRemove={() => removeAllergy(tag)}
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
              <Ionicons name="thumbs-down" size={16} color={TEXT.white} />
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
    borderColor: 'rgba(107, 78, 255, 0.15)',
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
    color: SEMANTIC.danger.dark,
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
    color: TEXT.secondary,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.muted,
    fontStyle: 'italic',
  },
});
