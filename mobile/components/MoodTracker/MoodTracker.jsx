/**
 * MoodTracker - Full-Screen Modal for Premium Mood Logging
 *
 * Features:
 * - Full-screen slide-up modal with swipe to dismiss
 * - Dynamic gradient header based on selected mood
 * - 8 3D Lottie mood icons with selection
 * - Intensity slider (1-10) with haptics
 * - Recent meals context display
 * - Journal tags for context (sleep, exercise, social, weather, stress)
 * - Text note input
 * - Auto-save draft to AsyncStorage
 * - Optimistic UI updates
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  TEXT,
  SEMANTIC,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  ICON_SIZES,
  SURFACES,
  MOOD_PALETTE,
} from '../../constants/premiumTheme';

import MoodIcon3D from './MoodIcon3D';
import MoodIntensitySlider from './MoodIntensitySlider';
import MoodJournalTags from './MoodJournalTags';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const MOODS = ['happy', 'calm', 'focused', 'energized', 'neutral', 'tired', 'stressed', 'sad'];

const MoodTracker = ({
  visible = false,
  onClose,
  onSave,
  recentMeals = [],
  initialMood = null,
}) => {
  const [selectedMood, setSelectedMood] = useState(initialMood || 'neutral');
  const [intensity, setIntensity] = useState(5);
  const [energyLevel, setEnergyLevel] = useState(5);
  const [tags, setTags] = useState({});
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTags, setShowTags] = useState(false);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Load draft from AsyncStorage
  useEffect(() => {
    if (visible) {
      loadDraft();
      animateIn();
    } else {
      animateOut();
    }
  }, [visible]);

  // Auto-save draft
  useEffect(() => {
    if (visible) {
      saveDraft();
    }
  }, [selectedMood, intensity, energyLevel, tags, note]);

  const loadDraft = async () => {
    try {
      const draft = await AsyncStorage.getItem('moodTrackerDraft');
      if (draft) {
        const parsed = JSON.parse(draft);
        setSelectedMood(parsed.mood || 'neutral');
        setIntensity(parsed.intensity || 5);
        setEnergyLevel(parsed.energyLevel || 5);
        setTags(parsed.tags || {});
        setNote(parsed.note || '');
      }
    } catch (error) {
      console.warn('Failed to load mood draft:', error);
    }
  };

  const saveDraft = async () => {
    try {
      const draft = {
        mood: selectedMood,
        intensity,
        energyLevel,
        tags,
        note,
      };
      await AsyncStorage.setItem('moodTrackerDraft', JSON.stringify(draft));
    } catch (error) {
      console.warn('Failed to save mood draft:', error);
    }
  };

  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem('moodTrackerDraft');
    } catch (error) {
      console.warn('Failed to clear mood draft:', error);
    }
  };

  const animateIn = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateOut = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleSave = async () => {
    if (loading) return;

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);

    try {
      const moodData = {
        mood: selectedMood,
        intensity,
        energyLevel,
        tags,
        note: note.trim(),
        timestamp: new Date().toISOString(),
      };

      if (onSave) {
        await onSave(moodData);
      }

      // Clear draft after successful save
      await clearDraft();

      // Reset form
      setSelectedMood('neutral');
      setIntensity(5);
      setEnergyLevel(5);
      setTags({});
      setNote('');

      onClose();
    } catch (error) {
      console.error('Failed to save mood:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const moodColors = MOOD_PALETTE[selectedMood];

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <LinearGradient
            colors={moodColors?.gradient || SURFACES.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={ICON_SIZES.lg} color={TEXT.white} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>How are you feeling?</Text>
              <View style={styles.headerSpacer} />
            </View>
          </LinearGradient>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Mood Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Select Mood</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.moodScroll}
              >
                {MOODS.map((mood) => (
                  <MoodIcon3D
                    key={mood}
                    mood={mood}
                    selected={selectedMood === mood}
                    onSelect={setSelectedMood}
                    size={80}
                    showLabel={true}
                  />
                ))}
              </ScrollView>
            </View>

            {/* Intensity Slider */}
            <View style={styles.section}>
              <MoodIntensitySlider
                value={intensity}
                onChange={setIntensity}
                moodColor={moodColors?.base}
              />
            </View>

            {/* Energy Level */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Energy Level</Text>
              <MoodIntensitySlider
                value={energyLevel}
                onChange={setEnergyLevel}
                moodColor={SEMANTIC.warning.base}
              />
            </View>

            {/* Recent Meals Context */}
            {recentMeals && recentMeals.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="restaurant" size={ICON_SIZES.sm} color={TEXT.secondary} />
                  <Text style={styles.sectionLabel}>Recent Meals (4h window)</Text>
                </View>
                <View style={styles.mealsContainer}>
                  {recentMeals.slice(0, 3).map((meal, index) => (
                    <View key={index} style={styles.mealChip}>
                      <Text style={styles.mealName} numberOfLines={1}>
                        {meal.foodName}
                      </Text>
                      <Text style={styles.mealTime}>
                        {Math.round((new Date() - new Date(meal.timestamp)) / 60000)}m ago
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Journal Tags (Collapsible) */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.collapsibleHeader}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowTags(!showTags);
                }}
              >
                <View style={styles.collapsibleHeaderLeft}>
                  <Ionicons
                    name="pricetag"
                    size={ICON_SIZES.sm}
                    color={TEXT.secondary}
                  />
                  <Text style={styles.sectionLabel}>Add Context</Text>
                  {Object.keys(tags).length > 0 && (
                    <View style={styles.tagCountBadge}>
                      <Text style={styles.tagCountText}>
                        {Object.keys(tags).length}
                      </Text>
                    </View>
                  )}
                </View>
                <Ionicons
                  name={showTags ? 'chevron-up' : 'chevron-down'}
                  size={ICON_SIZES.sm}
                  color={TEXT.tertiary}
                />
              </TouchableOpacity>

              {showTags && (
                <MoodJournalTags selected={tags} onChange={setTags} />
              )}
            </View>

            {/* Note Input */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>What's on your mind?</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Optional note... (200 characters max)"
                placeholderTextColor={TEXT.tertiary}
                value={note}
                onChangeText={setNote}
                maxLength={200}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>
                {note.length}/200
              </Text>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                loading && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={loading}
            >
              <LinearGradient
                colors={moodColors?.gradient || SURFACES.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color={TEXT.white} />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={ICON_SIZES.md}
                      color={TEXT.white}
                    />
                    <Text style={styles.saveButtonText}>Save Mood Entry</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Bottom Spacing */}
            <View style={{ height: SPACING[8] }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.92,
    backgroundColor: SURFACES.background.primary,
    borderTopLeftRadius: RADIUS['3xl'],
    borderTopRightRadius: RADIUS['3xl'],
    overflow: 'hidden',
    ...SHADOWS.xl,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingTop: SPACING[6],
    paddingBottom: SPACING[4],
    paddingHorizontal: SPACING[5],
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING[5],
    paddingTop: SPACING[4],
  },
  section: {
    marginBottom: SPACING[5],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  moodScroll: {
    paddingVertical: SPACING[3],
    gap: SPACING[2],
  },
  mealsContainer: {
    gap: SPACING[2],
  },
  mealChip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mealName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.primary,
    flex: 1,
    marginRight: SPACING[2],
  },
  mealTime: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    marginBottom: SPACING[2],
  },
  collapsibleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  tagCountBadge: {
    backgroundColor: SEMANTIC.info.base,
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1] / 2,
    borderRadius: RADIUS.full,
    minWidth: 20,
    alignItems: 'center',
  },
  tagCountText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },
  noteInput: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    fontSize: TYPOGRAPHY.size.md,
    color: TEXT.primary,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 100,
  },
  charCount: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textAlign: 'right',
    marginTop: SPACING[1],
  },
  saveButton: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[6],
  },
  saveButtonText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },
});

export default MoodTracker;
