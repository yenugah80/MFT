/**
 * Premium MoodLogger Modal
 * 3D Lottie animations, intensity tracking, context tags, meal correlation
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Animated,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useMoodLog } from '../hooks/useMoodLog';
import MoodIcon3D from './MoodTracker/MoodIcon3D';
import {
  MOOD_PALETTE,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  TEXT,
  SURFACES,
  SEMANTIC_ACTIONS,
} from '../constants/premiumTheme';

// Helper to convert hex to rgba
const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Tag categories for mood context with vibrant colors
const TAG_CATEGORIES = {
  sleep: { label: 'Sleep', icon: 'moon', options: ['Poor', 'Fair', 'Good', 'Excellent'], color: MOOD_PALETTE.focused.base },
  exercise: { label: 'Exercise', icon: 'barbell', options: ['None', 'Light', 'Moderate', 'Intense'], color: SEMANTIC_ACTIONS.success },
  social: { label: 'Social', icon: 'people', options: ['Alone', 'Friends', 'Family', 'Crowded'], color: MOOD_PALETTE.calm.base },
};

/**
 * Intensity Slider Component
 */
const IntensitySlider = ({ value, onChange, moodColor, label = 'Intensity', helperText }) => {
  const [sliderWidth, setSliderWidth] = useState(0);
  const position = useRef(new Animated.Value((value - 1) / 9)).current;

  useEffect(() => {
    Animated.spring(position, {
      toValue: (value - 1) / 9,
      tension: 200,
      friction: 20,
      useNativeDriver: false,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleSlide = (evt) => {
    if (!sliderWidth) return;
    const newPos = Math.max(0, Math.min(evt.nativeEvent.locationX, sliderWidth));
    const newValue = Math.round((newPos / sliderWidth) * 9) + 1;

    if (newValue !== value) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(newValue);
    }
  };

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={[styles.sliderValue, { color: moodColor }]}>{value}/10</Text>
      </View>
      <View
        style={[styles.sliderTrack, { backgroundColor: hexToRgba(moodColor, 0.25) }]}
        onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleSlide}
        onResponderMove={handleSlide}
      >
        <LinearGradient
          colors={[`${moodColor}40`, moodColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.sliderFill, { width: `${((value - 1) / 9) * 100}%` }]}
        />
        <Animated.View
          style={[
            styles.sliderThumb,
            {
              backgroundColor: moodColor,
              left: position.interpolate({
                inputRange: [0, 1],
                outputRange: [0, sliderWidth - 24],
              }),
            },
          ]}
        >
          <Text style={[styles.sliderThumbText, { color: TEXT.primary }]}>{value}</Text>
        </Animated.View>
      </View>
      <View style={styles.sliderLabels}>
        <Text style={[styles.sliderLabelText, { color: moodColor }]}>Low</Text>
        <Text style={[styles.sliderLabelText, { color: moodColor }]}>High</Text>
      </View>
      {helperText ? (
        <Text style={[styles.sliderHelperText, { color: TEXT.tertiary }]}>{helperText}</Text>
      ) : null}
    </View>
  );
};

/**
 * Tag Selection Component with vibrant category colors
 */
const TagSelector = ({ category, selectedValue, onSelect }) => {
  const { label, icon, options, color } = TAG_CATEGORIES[category];

  return (
    <View style={styles.tagCategory}>
      <View style={styles.tagHeader}>
        <View style={[styles.tagIconContainer, { backgroundColor: color }]}>
          <Ionicons name={icon} size={14} color={TEXT.white} />
        </View>
        <Text style={[styles.tagLabel, { color: color }]}>{label}</Text>
      </View>
      <View style={styles.tagOptions}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.tagOption,
              {
                backgroundColor: selectedValue === option ? color : hexToRgba(color, 0.2),
                borderColor: color,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(category, option);
            }}
          >
            <Text
              style={[
                styles.tagOptionText,
                { color: selectedValue === option ? TEXT.white : color },
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

/**
 * Main Premium MoodLogger Component
 * Note: Mood history is displayed on the Dashboard (EnhancedMoodCard), not here
 */
export default function MoodLogger({ visible, onClose, onSuccess }) {
  const { logMood, isLogging, moodTypes } = useMoodLog();
  const [selectedMood, setSelectedMood] = useState(null);
  const [intensity, setIntensity] = useState(5);
  const [energyLevel, setEnergyLevel] = useState(5);
  const [tags, setTags] = useState({});
  const [note, setNote] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Animations
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(300);
      fadeAnim.setValue(0);
      setSelectedMood(null);
      setIntensity(5);
      setEnergyLevel(5);
      setTags({});
      setNote('');
      setShowAdvanced(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleSave = async () => {
    // Validate mood selection
    if (!selectedMood) return;

    // Validate intensity (1-10)
    const validatedIntensity = Math.max(1, Math.min(10, Math.round(intensity)));

    // Validate energy level (1-10)
    const validatedEnergyLevel = Math.max(1, Math.min(10, Math.round(energyLevel)));

    // Validate note length (max 200 characters, matches UI maxLength)
    const trimmedNote = note.trim().substring(0, 200);

    // Validate mood is in allowed list
    const validMoods = ['happy', 'calm', 'focused', 'energized', 'neutral', 'tired', 'stressed', 'sad'];
    if (!validMoods.includes(selectedMood)) {
      console.error('Invalid mood type:', selectedMood);
      return;
    }

    try {
      await logMood({
        mood: selectedMood,
        intensity: validatedIntensity,
        energyLevel: validatedEnergyLevel,
        tags,
        note: trimmedNote,
      });
      onSuccess?.(selectedMood);
      onClose();
    } catch (err) {
      console.error('Failed to save mood:', err);
    }
  };

  const handleTagSelect = (category, value) => {
    setTags(prev => {
      const newTags = { ...prev };
      if (newTags[category] === value) {
        delete newTags[category];
      } else {
        newTags[category] = value;
      }
      return newTags;
    });
  };

  const moodColors = selectedMood ? MOOD_PALETTE[selectedMood] : MOOD_PALETTE.neutral;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Animated.View style={{ opacity: fadeAnim, ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' }} />
        </Pressable>

        {/* Modal Content */}
        <Animated.View
          style={[
            styles.modalContent,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Header with gradient */}
          <LinearGradient
            colors={selectedMood ? moodColors.gradient : SURFACES.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <Text style={styles.headerTitle}>How are you feeling?</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={TEXT.white} />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Mood Selection with 3D Lottie */}
            <View style={styles.moodGrid}>
              {moodTypes.map((mood) => (
                <View key={mood.key} style={styles.moodItemWrapper}>
                  <MoodIcon3D
                    mood={mood.key}
                    selected={selectedMood === mood.key}
                    onSelect={setSelectedMood}
                    size={64}
                    showLabel={true}
                  />
                </View>
              ))}
            </View>

            {/* Intensity Slider */}
            {selectedMood && (
              <View style={styles.section}>
                <IntensitySlider
                  value={intensity}
                  onChange={setIntensity}
                  moodColor={moodColors.base}
                  label="Mood Intensity"
                  helperText="How strong is this feeling?"
                />
              </View>
            )}

            {/* Energy Level Slider */}
            {selectedMood && (
              <View style={styles.section}>
                <IntensitySlider
                  value={energyLevel}
                  onChange={setEnergyLevel}
                  moodColor={moodColors.base}
                  label="Energy Level"
                  helperText="How much energy do you have?"
                />
              </View>
            )}

            {/* Advanced Context (Collapsible) */}
            {selectedMood && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={[styles.advancedToggle, { backgroundColor: hexToRgba(moodColors.base, 0.15), borderWidth: 1, borderColor: hexToRgba(moodColors.base, 0.3) }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowAdvanced(!showAdvanced);
                  }}
                >
                  <Text style={[styles.advancedToggleText, { color: TEXT.primary }]}>
                    Add Context (Optional)
                  </Text>
                  <Ionicons
                    name={showAdvanced ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={moodColors.base}
                  />
                </TouchableOpacity>

                {showAdvanced && (
                  <View style={styles.tagsContainer}>
                    {Object.keys(TAG_CATEGORIES).map((category) => (
                      <TagSelector
                        key={category}
                        category={category}
                        selectedValue={tags[category]}
                        onSelect={handleTagSelect}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Note Input */}
            {selectedMood && (
              <View style={styles.section}>
                <Text style={[styles.noteLabel, { color: TEXT.primary }]}>Note (Optional)</Text>
                <TextInput
                  style={[styles.noteInput, { borderColor: moodColors.base }]}
                  placeholder="Add a private note (optional)"
                  placeholderTextColor={TEXT.tertiary}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  maxLength={200}
                />
                <Text style={[styles.charCount, { color: moodColors.base }]}>{note.length}/200</Text>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={[styles.actions, { borderTopColor: moodColors?.light || MOOD_PALETTE.neutral.light }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: moodColors?.base || MOOD_PALETTE.neutral.base }]}
              onPress={onClose}
              disabled={isLogging}
            >
              <Text style={[styles.cancelButtonText, { color: moodColors?.base || MOOD_PALETTE.neutral.base }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                selectedMood && { backgroundColor: moodColors.base },
                !selectedMood && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!selectedMood || isLogging}
              activeOpacity={0.8}
            >
              {isLogging ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {selectedMood ? 'Save Mood' : 'Select a mood'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: SURFACES.card.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    paddingTop: SPACING[6],
    paddingHorizontal: SPACING[5],
    paddingBottom: SPACING[4],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: SPACING[6],
    right: SPACING[5],
  },
  scrollContent: {
    paddingHorizontal: SPACING[5],
    paddingTop: SPACING[4],
  },
  section: {
    marginBottom: SPACING[5],
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: SPACING[4],
  },
  moodItemWrapper: {
    marginBottom: SPACING[3],
  },
  sliderContainer: {
    marginBottom: SPACING[2],
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING[2],
  },
  sliderLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  sliderValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  sliderTrack: {
    height: 40,
    borderRadius: RADIUS.full,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderFill: {
    position: 'absolute',
    height: '100%',
    borderRadius: RADIUS.full,
  },
  sliderThumb: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SURFACES.card.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderThumbText: {
    fontWeight: TYPOGRAPHY.weight.bold,
    fontSize: TYPOGRAPHY.size.base,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING[1],
  },
  sliderLabelText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  sliderHelperText: {
    fontSize: TYPOGRAPHY.size.xs,
    textAlign: 'center',
    marginTop: SPACING[1],
  },
  advancedToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.lg,
  },
  advancedToggleText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  tagsContainer: {
    marginTop: SPACING[3],
  },
  tagCategory: {
    marginBottom: SPACING[3],
  },
  tagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    marginBottom: SPACING[2],
  },
  tagIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  tagOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  tagOption: {
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  tagOptionText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  noteLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    marginBottom: SPACING[2],
  },
  noteInput: {
    backgroundColor: SURFACES.background.secondary,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    fontSize: TYPOGRAPHY.size.base,
    color: TEXT.primary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: TYPOGRAPHY.size.xs,
    textAlign: 'right',
    marginTop: SPACING[1],
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING[3],
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[4],
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  saveButton: {
    flex: 1,
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: SEMANTIC_ACTIONS.success,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: MOOD_PALETTE.neutral.base,
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },
});
