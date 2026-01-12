/**
 * InlineEditMetricCard - Premium Inline Editable Metric Card
 *
 * Features:
 * - Glassmorphism card with blur backdrop
 * - Scale animation on tap (1.02x spring)
 * - Purple gradient border glow when editing
 * - Haptic feedback on all interactions
 * - Smooth fade transition between view/edit modes
 * - Checkmark pulse animation on save success
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { BRAND, SURFACES, TEXT, TYPOGRAPHY, SPACING, RADIUS, SEMANTIC_ACTIONS } from '../../constants/premiumTheme';

// Premium shadow with purple tint
const PREMIUM_SHADOW = {
  shadowColor: '#8B5CF6',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 4,
};

export default function InlineEditMetricCard({
  label,
  value,
  unit = '',
  icon = 'analytics-outline',
  iconColor = BRAND.primary,
  keyboardType = 'default',
  onSave,
  onEditStart,
  onEditCancel,
  isSaving = false,
  isFullWidth = false,
  selectOptions = null, // For dropdown-style selection (e.g., gender, activity)
  formatDisplay = null, // Optional function to format display value
  validateInput = null, // Optional validation function
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value || ''));
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(null);

  const inputRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Display value formatting
  const displayValue = formatDisplay ? formatDisplay(value) : (value || '—');

  // Handle tap to edit
  const handlePress = useCallback(async () => {
    if (isSaving || isEditing) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditValue(String(value || ''));
    setError(null);
    setIsEditing(true);
    onEditStart?.();

    // Animate scale up
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      friction: 3,
      useNativeDriver: true,
    }).start();

    // Animate glow in
    Animated.timing(glowAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();

    // Focus input after animation
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [isSaving, isEditing, value, onEditStart, scaleAnim, glowAnim]);

  // Handle save
  const handleSave = useCallback(async () => {
    // Validate if validator provided
    if (validateInput) {
      const validationError = validateInput(editValue);
      if (validationError) {
        setError(validationError);
        // Shake animation
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const success = await onSave?.(editValue);

    if (success !== false) {
      // Success animation
      setShowSuccess(true);
      Animated.sequence([
        Animated.timing(successAnim, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(successAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => {
        setShowSuccess(false);
        setIsEditing(false);

        // Reset animations
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
        Animated.timing(glowAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
      }, 600);
    }
  }, [editValue, validateInput, onSave, shakeAnim, successAnim, scaleAnim, glowAnim]);

  // Handle cancel
  const handleCancel = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(false);
    setEditValue(String(value || ''));
    setError(null);
    onEditCancel?.();

    // Reset animations
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    Animated.timing(glowAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  }, [value, onEditCancel, scaleAnim, glowAnim]);

  // Interpolate glow border color
  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [`${SEMANTIC_ACTIONS.success}1A`, 'rgba(139, 92, 246, 0.4)'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        isFullWidth && styles.fullWidth,
        {
          transform: [
            { scale: scaleAnim },
            { translateX: shakeAnim },
          ],
        },
      ]}
    >
      <Animated.View style={[styles.card, { borderColor }]}>
        <TouchableOpacity
          style={styles.touchable}
          onPress={handlePress}
          activeOpacity={0.8}
          disabled={isEditing || isSaving}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${label}`}
          accessibilityHint={`Current value: ${displayValue} ${unit}`}
        >
          {/* Icon Container with Gradient */}
          <LinearGradient
            colors={isEditing
              ? SURFACES.gradient.primary
              : [`${iconColor}15`, `${iconColor}08`]
            }
            style={styles.iconContainer}
          >
            <Ionicons
              name={icon}
              size={20}
              color={isEditing ? '#FFFFFF' : iconColor}
            />
          </LinearGradient>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.label}>{label}</Text>

            {isEditing ? (
              <View style={styles.editRow}>
                {selectOptions ? (
                  // Selection mode for dropdowns
                  <View style={styles.selectContainer}>
                    {selectOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.selectOption,
                          editValue === option.value && styles.selectOptionActive,
                        ]}
                        onPress={async () => {
                          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setEditValue(option.value);
                        }}
                      >
                        <Text
                          style={[
                            styles.selectOptionText,
                            editValue === option.value && styles.selectOptionTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  // Text input mode
                  <>
                    <TextInput
                      ref={inputRef}
                      style={[styles.input, error && styles.inputError]}
                      value={editValue}
                      onChangeText={(text) => {
                        setEditValue(text);
                        setError(null);
                      }}
                      keyboardType={keyboardType}
                      selectTextOnFocus
                      returnKeyType="done"
                      onSubmitEditing={handleSave}
                    />
                    {unit ? <Text style={styles.unitEdit}>{unit}</Text> : null}
                  </>
                )}

                {/* Action Buttons */}
                <View style={styles.actions}>
                  {isSaving ? (
                    <ActivityIndicator size="small" color={BRAND.primary} />
                  ) : showSuccess ? (
                    <Animated.View style={{ transform: [{ scale: successAnim }] }}>
                      <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    </Animated.View>
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={handleSave}
                        style={styles.actionBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="checkmark-circle" size={24} color={BRAND.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleCancel}
                        style={styles.actionBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="close-circle" size={24} color={TEXT.tertiary} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.valueRow}>
                <Text style={styles.value}>{displayValue}</Text>
                {unit ? <Text style={styles.unit}>{unit}</Text> : null}
                <View style={styles.pencilContainer}>
                  <Ionicons name="pencil" size={12} color={TEXT.muted} />
                </View>
              </View>
            )}

            {/* Error Message */}
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '48%',
    marginBottom: SPACING[3],
  },
  fullWidth: {
    width: '100%',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: `${SEMANTIC_ACTIONS.success}1A`,
    ...PREMIUM_SHADOW,
  },
  touchable: {
    padding: SPACING[4],
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  unit: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
    marginLeft: 4,
  },
  pencilContainer: {
    marginLeft: 'auto',
    padding: 4,
    opacity: 0.5,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    minWidth: 60,
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    borderBottomWidth: 2,
    borderBottomColor: BRAND.primary,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  inputError: {
    borderBottomColor: '#EF4444',
  },
  unitEdit: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
    marginLeft: 6,
    marginRight: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 4,
  },
  actionBtn: {
    padding: 4,
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  selectOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    backgroundColor: `${SEMANTIC_ACTIONS.success}14`,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectOptionActive: {
    backgroundColor: BRAND.primary,
    borderColor: BRAND.primary,
  },
  selectOptionText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
  },
  selectOptionTextActive: {
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: '#EF4444',
    marginTop: 4,
  },
});
