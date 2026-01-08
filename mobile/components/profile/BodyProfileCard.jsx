/**
 * BodyProfileCard - Premium Body Metrics Visualization
 *
 * A beautiful, unified card that displays all body metrics in an elegant way.
 * Features:
 * - Visual body stats with circular progress indicators
 * - Beautiful activity level visualization with animated bars
 * - Smooth modal-based editing for distraction-free experience
 * - Cohesive purple gradient theme
 * - Meaningful animations and haptic feedback
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, G } from 'react-native-svg';

import {
  BRAND,
  SURFACES,
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../../constants/premiumTheme';

// Activity level configuration with visual representation
const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', bars: 1, description: 'Little to no exercise', emoji: '🪑' },
  { value: 'lightly_active', label: 'Lightly Active', bars: 2, description: '1-3 days/week', emoji: '🚶' },
  { value: 'moderate', label: 'Moderate', bars: 3, description: '3-5 days/week', emoji: '🏃' },
  { value: 'very_active', label: 'Very Active', bars: 4, description: '6-7 days/week', emoji: '💪' },
  { value: 'extremely_active', label: 'Athlete', bars: 5, description: 'Intense training', emoji: '🏆' },
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male', icon: 'male' },
  { value: 'female', label: 'Female', icon: 'female' },
  { value: 'other', label: 'Other', icon: 'person' },
];

// Circular Progress Ring
function ProgressRing({ progress, size = 60, strokeWidth = 6, color = BRAND.primary }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <Svg width={size} height={size}>
      <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(107, 78, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </G>
    </Svg>
  );
}

// Metric Display Component
function MetricDisplay({ label, value, unit, progress, icon, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.metricItem}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        <View style={styles.metricRing}>
          <ProgressRing progress={progress} size={64} strokeWidth={5} />
          <View style={styles.metricIconOverlay}>
            <Ionicons name={icon} size={20} color={BRAND.primary} />
          </View>
        </View>
        <Text style={styles.metricValue}>
          {value || '—'}
          {unit && <Text style={styles.metricUnit}> {unit}</Text>}
        </Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Activity Level Visualization
function ActivityLevelBar({ level, onPress }) {
  const currentLevel = ACTIVITY_LEVELS.find(l => l.value === level) || ACTIVITY_LEVELS[0];
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.activityContainer}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <View style={styles.activityHeader}>
          <View style={styles.activityLeft}>
            <Text style={styles.activityEmoji}>{currentLevel.emoji}</Text>
            <View>
              <Text style={styles.activityLabel}>{currentLevel.label}</Text>
              <Text style={styles.activityDescription}>{currentLevel.description}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={TEXT.tertiary} />
        </View>

        {/* Activity Bars */}
        <View style={styles.activityBars}>
          {[1, 2, 3, 4, 5].map((bar) => (
            <View
              key={bar}
              style={[
                styles.activityBar,
                bar <= currentLevel.bars && styles.activityBarActive,
              ]}
            />
          ))}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Edit Modal Component
function EditModal({ visible, onClose, title, children }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={TEXT.secondary} />
            </TouchableOpacity>
          </View>

          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function BodyProfileCard({
  basics = {},
  onFieldSave,
  isSaving = false,
}) {
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState(null);

  // Calculate progress percentages for visual display
  const ageProgress = useMemo(() => {
    const age = basics.age || 0;
    return Math.min(100, (age / 100) * 100);
  }, [basics.age]);

  const weightProgress = useMemo(() => {
    const weight = basics.weightKg || 0;
    // Assuming 40-150kg range
    return Math.min(100, ((weight - 40) / 110) * 100);
  }, [basics.weightKg]);

  const heightProgress = useMemo(() => {
    const height = basics.heightCm || 0;
    // Assuming 120-220cm range
    return Math.min(100, ((height - 120) / 100) * 100);
  }, [basics.heightCm]);

  // Open edit modal
  const openEdit = useCallback(async (field) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingField(field);
    setEditValue(String(basics[field] || ''));
    setError(null);
  }, [basics]);

  // Close edit modal
  const closeEdit = useCallback(() => {
    setEditingField(null);
    setEditValue('');
    setError(null);
  }, []);

  // Save field
  const handleSave = useCallback(async (value) => {
    // Validate
    if (editingField === 'age') {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 13 || num > 120) {
        setError('Age must be between 13-120');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    }
    if (editingField === 'weightKg') {
      const num = parseFloat(value);
      if (isNaN(num) || num < 20 || num > 500) {
        setError('Weight must be between 20-500 kg');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    }
    if (editingField === 'heightCm') {
      const num = parseFloat(value);
      if (isNaN(num) || num < 50 || num > 300) {
        setError('Height must be between 50-300 cm');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const success = await onFieldSave?.(editingField, value);

    if (success !== false) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeEdit();
    }
  }, [editingField, onFieldSave, closeEdit]);

  // Format gender for display
  const formatGender = (g) => {
    if (!g) return '—';
    return g.charAt(0).toUpperCase() + g.slice(1);
  };

  // Get current gender option
  const currentGender = GENDER_OPTIONS.find(g => g.value === basics.gender) || GENDER_OPTIONS[0];

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={SURFACES.gradient.softPurple}
          style={styles.headerIcon}
        >
          <Ionicons name="body-outline" size={18} color={BRAND.primary} />
        </LinearGradient>
        <Text style={styles.headerTitle}>Body Profile</Text>
      </View>

      {/* Main Card */}
      <View style={styles.card}>
        {/* Top Section - Core Metrics */}
        <View style={styles.metricsRow}>
          <MetricDisplay
            label="Age"
            value={basics.age}
            unit="yrs"
            progress={ageProgress}
            icon="calendar-outline"
            onPress={() => openEdit('age')}
          />
          <MetricDisplay
            label="Weight"
            value={basics.weightKg}
            unit="kg"
            progress={weightProgress}
            icon="scale-outline"
            onPress={() => openEdit('weightKg')}
          />
          <MetricDisplay
            label="Height"
            value={basics.heightCm}
            unit="cm"
            progress={heightProgress}
            icon="resize-outline"
            onPress={() => openEdit('heightCm')}
          />
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Gender Row */}
        <TouchableOpacity
          style={styles.genderRow}
          onPress={() => openEdit('gender')}
          activeOpacity={0.8}
        >
          <View style={styles.genderLeft}>
            <View style={styles.genderIcon}>
              <Ionicons name={currentGender.icon} size={20} color={BRAND.primary} />
            </View>
            <View>
              <Text style={styles.genderLabel}>Gender</Text>
              <Text style={styles.genderValue}>{formatGender(basics.gender)}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={TEXT.tertiary} />
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Activity Level */}
        <View style={styles.activitySection}>
          <Text style={styles.activitySectionLabel}>Activity Level</Text>
          <ActivityLevelBar
            level={basics.activityLevel}
            onPress={() => openEdit('activityLevel')}
          />
        </View>
      </View>

      {/* Edit Modals */}

      {/* Numeric Input Modal (Age, Weight, Height) */}
      <EditModal
        visible={['age', 'weightKg', 'heightCm'].includes(editingField)}
        onClose={closeEdit}
        title={editingField === 'age' ? 'Your Age' : editingField === 'weightKg' ? 'Your Weight' : 'Your Height'}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.largeInput}
            value={editValue}
            onChangeText={(t) => { setEditValue(t); setError(null); }}
            keyboardType="decimal-pad"
            placeholder={editingField === 'age' ? '25' : editingField === 'weightKg' ? '70' : '170'}
            placeholderTextColor={TEXT.muted}
            autoFocus
          />
          <Text style={styles.inputUnit}>
            {editingField === 'age' ? 'years' : editingField === 'weightKg' ? 'kg' : 'cm'}
          </Text>
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={() => handleSave(editValue)}
          disabled={isSaving}
        >
          <LinearGradient
            colors={SURFACES.gradient.primary}
            style={styles.saveButtonGradient}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </EditModal>

      {/* Gender Selection Modal */}
      <EditModal
        visible={editingField === 'gender'}
        onClose={closeEdit}
        title="Your Gender"
      >
        <View style={styles.optionsGrid}>
          {GENDER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.genderOption,
                basics.gender === option.value && styles.genderOptionActive,
              ]}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                await handleSave(option.value);
              }}
            >
              <Ionicons
                name={option.icon}
                size={32}
                color={basics.gender === option.value ? '#FFFFFF' : BRAND.primary}
              />
              <Text style={[
                styles.genderOptionText,
                basics.gender === option.value && styles.genderOptionTextActive,
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </EditModal>

      {/* Activity Level Selection Modal */}
      <EditModal
        visible={editingField === 'activityLevel'}
        onClose={closeEdit}
        title="Activity Level"
      >
        <ScrollView style={styles.activityOptions} showsVerticalScrollIndicator={false}>
          {ACTIVITY_LEVELS.map((level) => (
            <TouchableOpacity
              key={level.value}
              style={[
                styles.activityOption,
                basics.activityLevel === level.value && styles.activityOptionActive,
              ]}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                await handleSave(level.value);
              }}
            >
              <Text style={styles.activityOptionEmoji}>{level.emoji}</Text>
              <View style={styles.activityOptionContent}>
                <Text style={[
                  styles.activityOptionLabel,
                  basics.activityLevel === level.value && styles.activityOptionLabelActive,
                ]}>
                  {level.label}
                </Text>
                <Text style={styles.activityOptionDesc}>{level.description}</Text>
              </View>
              <View style={styles.activityOptionBars}>
                {[1, 2, 3, 4, 5].map((bar) => (
                  <View
                    key={bar}
                    style={[
                      styles.activityOptionBar,
                      bar <= level.bars && (
                        basics.activityLevel === level.value
                          ? styles.activityOptionBarActiveSelected
                          : styles.activityOptionBarActive
                      ),
                    ]}
                  />
                ))}
              </View>
              {basics.activityLevel === level.value && (
                <Ionicons name="checkmark-circle" size={24} color={BRAND.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </EditModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING[5],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[4],
    paddingHorizontal: SPACING[1],
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  card: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS['2xl'],
    padding: SPACING[5],
    ...SHADOWS.md,
  },

  // Metrics Row
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: SPACING[4],
  },
  metricItem: {
    alignItems: 'center',
  },
  metricRing: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginTop: SPACING[2],
  },
  metricUnit: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
  },
  metricLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: 'rgba(107, 78, 255, 0.08)',
    marginVertical: SPACING[3],
  },

  // Gender Row
  genderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING[2],
  },
  genderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  genderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${BRAND.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  genderValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginTop: 2,
  },

  // Activity Section
  activitySection: {
    paddingTop: SPACING[2],
  },
  activitySectionLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[3],
  },
  activityContainer: {
    backgroundColor: 'rgba(107, 78, 255, 0.05)',
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  activityEmoji: {
    fontSize: 32,
  },
  activityLabel: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  activityDescription: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: 2,
  },
  activityBars: {
    flexDirection: 'row',
    gap: 6,
    marginTop: SPACING[4],
  },
  activityBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(107, 78, 255, 0.15)',
  },
  activityBarActive: {
    backgroundColor: BRAND.primary,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: SURFACES.background.primary,
    borderTopLeftRadius: RADIUS['3xl'],
    borderTopRightRadius: RADIUS['3xl'],
    paddingHorizontal: SPACING[6],
    paddingBottom: SPACING[10],
    paddingTop: SPACING[3],
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING[4],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[6],
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Input Styles
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: SPACING[6],
  },
  largeInput: {
    fontSize: 48,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    textAlign: 'center',
    minWidth: 100,
    borderBottomWidth: 2,
    borderBottomColor: BRAND.primary,
    paddingVertical: SPACING[2],
  },
  inputUnit: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
    marginLeft: SPACING[2],
  },
  errorText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: SPACING[4],
  },
  saveButton: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonGradient: {
    paddingVertical: SPACING[4],
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
  },

  // Gender Options Grid
  optionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  genderOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING[5],
    paddingHorizontal: SPACING[3],
    backgroundColor: 'rgba(107, 78, 255, 0.08)',
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genderOptionActive: {
    backgroundColor: BRAND.primary,
    borderColor: BRAND.primary,
  },
  genderOptionText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginTop: SPACING[2],
  },
  genderOptionTextActive: {
    color: '#FFFFFF',
  },

  // Activity Options
  activityOptions: {
    maxHeight: 400,
  },
  activityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING[4],
    backgroundColor: 'rgba(107, 78, 255, 0.05)',
    borderRadius: RADIUS.xl,
    marginBottom: SPACING[3],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activityOptionActive: {
    borderColor: BRAND.primary,
    backgroundColor: 'rgba(107, 78, 255, 0.1)',
  },
  activityOptionEmoji: {
    fontSize: 28,
    marginRight: SPACING[3],
  },
  activityOptionContent: {
    flex: 1,
  },
  activityOptionLabel: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  activityOptionLabelActive: {
    color: BRAND.primary,
  },
  activityOptionDesc: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: 2,
  },
  activityOptionBars: {
    flexDirection: 'row',
    gap: 4,
    marginRight: SPACING[3],
  },
  activityOptionBar: {
    width: 6,
    height: 20,
    borderRadius: 3,
    backgroundColor: 'rgba(107, 78, 255, 0.15)',
  },
  activityOptionBarActive: {
    backgroundColor: 'rgba(107, 78, 255, 0.4)',
  },
  activityOptionBarActiveSelected: {
    backgroundColor: BRAND.primary,
  },
});
