/**
 * Premium MoodLogger Modal
 * 3D Lottie animations, intensity tracking, context tags, meal correlation
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../services/apiClient';
import { useMoodLog, MOOD_DEFAULT_INTENSITY } from '../hooks/useMoodLog';
import MoodIcon3D from './MoodTracker/MoodIcon3D';
import { announceMoodLogged } from '../services/audioFeedback';
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

// On-device keyword → mood mapping (no API call required)
const MOOD_KEYWORDS = {
  happy:    ['happy', 'great', 'amazing', 'good', 'joy', 'excited', 'love', 'wonderful', 'fantastic', 'elated', 'glad', 'cheerful', 'content', 'pleased', 'delighted'],
  calm:     ['calm', 'peace', 'peaceful', 'relaxed', 'chill', 'serene', 'quiet', 'still', 'tranquil', 'settled', 'easy', 'gentle', 'composed'],
  focused:  ['focused', 'productive', 'sharp', 'clear', 'motivated', 'determined', 'driven', 'on task', 'flow', 'in the zone', 'alert', 'concentrated'],
  energized:['energized', 'energy', 'pumped', 'hyped', 'fired up', 'electric', 'buzzing', 'wired', 'alive', 'vibrant', 'dynamic', 'enthusiastic'],
  neutral:  ['neutral', 'okay', 'ok', 'fine', 'normal', 'meh', 'alright', 'average', 'so-so', 'moderate', 'bland', 'indifferent'],
  tired:    ['tired', 'exhausted', 'sleepy', 'drained', 'fatigue', 'weary', 'worn out', 'sluggish', 'groggy', 'drowsy', 'low energy', 'heavy', 'spent'],
  stressed: ['stressed', 'anxious', 'anxiety', 'overwhelmed', 'nervous', 'tense', 'worried', 'panic', 'pressure', 'frantic', 'uneasy', 'restless', 'on edge'],
  sad:      ['sad', 'down', 'unhappy', 'depressed', 'blue', 'low', 'upset', 'miserable', 'gloomy', 'hopeless', 'heartbroken', 'grief', 'disappointed', 'lonely', 'crying'],
};

function extractMoodFromText(text) {
  if (!text || text.trim().length < 3) return null;
  const lower = text.toLowerCase();
  const scores = {};
  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    scores[mood] = keywords.reduce((n, kw) => n + (lower.includes(kw) ? 1 : 0), 0);
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : null;
}

// Mood → which tag categories to surface first (smart contextual suggestions)
// Keys must match TAG_CATEGORIES keys below
const MOOD_TAG_PRIORITY = {
  tired:    ['sleep', 'exercise'],
  stressed: ['stress', 'social'],
  sad:      ['social', 'sleep'],
  happy:    ['exercise', 'social'],
  calm:     ['sleep', 'weather'],
  focused:  ['exercise', 'stress'],
  energized:['exercise', 'weather'],
  neutral:  ['sleep', 'social'],
};

// Tag categories for mood context with vibrant colors
const TAG_CATEGORIES = {
  sleep:    { label: 'Sleep',    icon: 'moon',       options: ['Poor', 'Fair', 'Good', 'Excellent'],           color: MOOD_PALETTE.focused.base },
  exercise: { label: 'Exercise', icon: 'barbell',    options: ['None', 'Light', 'Moderate', 'Intense'],        color: SEMANTIC_ACTIONS.success },
  social:   { label: 'Social',   icon: 'people',     options: ['Alone', 'Partner', 'Friends', 'Family'],       color: MOOD_PALETTE.calm.base },
  stress:   { label: 'Stress',   icon: 'flash',      options: ['None', 'Low', 'Moderate', 'High'],             color: MOOD_PALETTE.stressed.base },
  weather:  { label: 'Weather',  icon: 'partly-sunny', options: ['Sunny', 'Cloudy', 'Rainy', 'Cold'],          color: MOOD_PALETTE.energized.base },
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
  const [savedResult, setSavedResult] = useState(null);
  const [hoursAgo, setHoursAgo] = useState(0);
  const [freeText, setFreeText] = useState('');
  const [preSavePattern, setPreSavePattern] = useState(null);
  const nlpTimerRef = useRef(null);
  const patternTimerRef = useRef(null);
  const closeTimerRef = useRef(null); // Fix #3: track auto-close timer so manual close can cancel it
  const mountedRef = useRef(true);    // Fix #2: guard setState after unmount

  useEffect(() => {
    mountedRef.current = true;
    // Capture ref values at effect time so cleanup uses the right handles
    const nlpTimer = nlpTimerRef;
    const patternTimer = patternTimerRef;
    const closeTimer = closeTimerRef;
    return () => {
      mountedRef.current = false;
      clearTimeout(nlpTimer.current);
      clearTimeout(patternTimer.current);
      clearTimeout(closeTimer.current);
    };
  }, []);

  // Fix #1: declare handleMoodSelect BEFORE handleFreeTextChange to eliminate forward reference
  // Fix #12: wrap in useCallback for stable prop reference across renders
  const handleMoodSelect = useCallback((moodKey) => {
    setSelectedMood(moodKey);
    setFreeText('');         // Fix #8: clear free text when user manually picks a mood
    // Pre-fill intensity slider with mood-appropriate default (Fix #6)
    setIntensity(MOOD_DEFAULT_INTENSITY[moodKey] ?? 5);
    setPreSavePattern(null);
    clearTimeout(patternTimerRef.current);
    patternTimerRef.current = setTimeout(async () => {
      try {
        const data = await apiClient.get(`/mood/pattern-check?mood=${moodKey}`);
        // Fix #2: guard against setState on unmounted component
        if (mountedRef.current && data?.patternAlert) setPreSavePattern(data.patternAlert);
      } catch {}
    }, 600);
  }, []);

  // NLP: debounce 400ms then auto-select mood from text
  const handleFreeTextChange = useCallback((text) => {
    setFreeText(text);
    clearTimeout(nlpTimerRef.current);
    nlpTimerRef.current = setTimeout(() => {
      const detected = extractMoodFromText(text);
      if (detected && mountedRef.current) handleMoodSelect(detected);
    }, 400);
  }, [handleMoodSelect]);

  const DRAFT_KEY = 'moodLoggerDraft';
  const DRAFT_TTL = 4 * 60 * 60 * 1000; // 4 hours

  // Load draft on open
  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem(DRAFT_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (Date.now() - (parsed.savedAt || 0) > DRAFT_TTL) {
          AsyncStorage.removeItem(DRAFT_KEY);
          return;
        }
        if (parsed.mood) setSelectedMood(parsed.mood);
        if (parsed.intensity) setIntensity(parsed.intensity);
        if (parsed.energyLevel) setEnergyLevel(parsed.energyLevel);
        if (parsed.tags) setTags(parsed.tags);
        if (parsed.note) setNote(parsed.note);
      } catch {}
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Auto-save draft on every change
  useEffect(() => {
    if (!visible) return;
    const draft = { savedAt: Date.now(), mood: selectedMood, intensity, energyLevel, tags, note };
    AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)).catch(() => {});
  }, [selectedMood, intensity, energyLevel, tags, note, visible]);

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
      setSavedResult(null);
      setHoursAgo(0);
      setFreeText('');
      setPreSavePattern(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleSave = async () => {
    // Validate mood selection
    if (!selectedMood) return;

    const validatedIntensity = Math.max(1, Math.min(10, Math.round(intensity)));
    const validatedEnergyLevel = Math.max(1, Math.min(10, Math.round(energyLevel)));

    // Fix #5: pre-fill note from free-text if user didn't type a separate note
    const effectiveNote = note.trim() || freeText.trim();
    const trimmedNote = effectiveNote.substring(0, 200);

    // Single source of truth for valid moods — derived from MOOD_TYPES in the hook
    if (!moodTypes.map(m => m.key).includes(selectedMood)) {
      console.error('Invalid mood type:', selectedMood);
      return;
    }

    try {
      const loggedDate = hoursAgo > 0
        ? new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()
        : new Date().toISOString();

      const result = await logMood({
        mood: selectedMood,
        intensity: validatedIntensity,
        energyLevel: validatedEnergyLevel,
        tags,
        note: trimmedNote,
        loggedDate,
      });
      announceMoodLogged(selectedMood, trimmedNote);
      AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
      onSuccess?.(selectedMood);

      // Show acknowledgment card (streak, pattern, or mental health alert)
      if (result?.mentalHealthAlert || result?.patternAlert || result?.logStats) {
        setSavedResult(result);
        // Auto-close after 3.5s; stored in ref so manual Close can cancel it (Fix #3)
        closeTimerRef.current = setTimeout(() => {
          if (mountedRef.current) handleClose();
        }, 3500);
      } else {
        handleClose();
      }
    } catch (err) {
      console.error('Failed to save mood:', err);
      Alert.alert(
        'Could not save',
        'Something went wrong logging your mood. Please try again.',
        [{ text: 'OK' }]
      );
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

  // Wrap onClose so it always cancels the auto-close timer (Fix #3)
  const handleClose = useCallback(() => {
    clearTimeout(closeTimerRef.current);
    onClose();
  }, [onClose]);

  const moodColors = selectedMood ? MOOD_PALETTE[selectedMood] : MOOD_PALETTE.neutral;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={handleClose}>
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
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color={TEXT.white} />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Free-text input — NLP auto-suggests mood from what user types */}
            <View style={styles.section}>
              <TextInput
                style={styles.freeTextInput}
                placeholder='Describe how you feel… ("I feel wired but anxious")'
                placeholderTextColor={TEXT.tertiary}
                value={freeText}
                onChangeText={handleFreeTextChange}
                multiline={false}
                returnKeyType="done"
                accessibilityLabel="Describe your mood in your own words"
              />
              {selectedMood && freeText.length > 0 && (
                <Text style={styles.nlpHint}>
                  Detected: {selectedMood} — tap to adjust below
                </Text>
              )}
            </View>

            {/* Mood Selection with 3D Lottie */}
            <View style={styles.moodGrid}>
              {moodTypes.map((mood) => (
                <View key={mood.key} style={styles.moodItemWrapper}>
                  <MoodIcon3D
                    mood={mood.key}
                    selected={selectedMood === mood.key}
                    onSelect={handleMoodSelect}
                    size={64}
                    showLabel={true}
                    autoPlay={selectedMood === mood.key}
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

            {/* Context Tags — priority 2 shown upfront, rest collapsible */}
            {selectedMood && (
              <View style={styles.section}>
                {/* Smart: show the 2 most relevant categories for this mood first */}
                {(MOOD_TAG_PRIORITY[selectedMood] || ['sleep', 'social']).map((category) => (
                  <TagSelector
                    key={category}
                    category={category}
                    selectedValue={tags[category]}
                    onSelect={handleTagSelect}
                  />
                ))}

                {/* "More context" expander for remaining categories */}
                <TouchableOpacity
                  style={[styles.advancedToggle, { backgroundColor: hexToRgba(moodColors.base, 0.15), borderWidth: 1, borderColor: hexToRgba(moodColors.base, 0.3) }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowAdvanced(!showAdvanced);
                  }}
                >
                  <Text style={[styles.advancedToggleText, { color: TEXT.primary }]}>
                    More context (optional)
                  </Text>
                  <Ionicons
                    name={showAdvanced ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={moodColors.base}
                  />
                </TouchableOpacity>

                {showAdvanced && (
                  <View style={styles.tagsContainer}>
                    {Object.keys(TAG_CATEGORIES)
                      .filter(c => !(MOOD_TAG_PRIORITY[selectedMood] || []).includes(c))
                      .map((category) => (
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

            {/* Retroactive time picker — logging for earlier today */}
            {selectedMood && (
              <View style={styles.section}>
                <Text style={[styles.noteLabel, { color: TEXT.secondary || TEXT.primary }]}>When did you feel this?</Text>
                <View style={styles.timeChips}>
                  {[
                    { label: 'Now', value: 0 },
                    { label: '1h ago', value: 1 },
                    { label: '2h ago', value: 2 },
                    { label: '3h ago', value: 3 },
                  ].map(({ label, value }) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.timeChip,
                        hoursAgo === value && { backgroundColor: moodColors.base, borderColor: moodColors.base },
                        hoursAgo !== value && { borderColor: moodColors.base },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setHoursAgo(value);
                      }}
                    >
                      <Text style={[
                        styles.timeChipText,
                        { color: hoursAgo === value ? TEXT.white : moodColors.base },
                      ]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
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

          {/* Post-save acknowledgment — streak, meal correlation, pattern */}
          {savedResult && !savedResult.mentalHealthAlert && (
            <View style={styles.ackCard}>
              {/* Streak / log count */}
              {savedResult.logStats?.totalLogsThisWeek > 0 && (
                <Text style={styles.ackTitle}>
                  ✓ Logged — {savedResult.logStats.totalLogsThisWeek === 1
                    ? 'First mood log this week!'
                    : `${savedResult.logStats.totalLogsThisWeek} mood logs this week`}
                </Text>
              )}
              {/* Meal correlation hint */}
              {savedResult.mealContext?.length > 0 && (
                <Text style={styles.ackHint}>
                  🍽 {savedResult.mealContext[0].foodName} logged {Math.round(savedResult.mealContext[0].timeDeltaHours)}h ago — we're connecting food + mood patterns
                </Text>
              )}
            </View>
          )}

          {/* Pattern alert — same mood repeated this week */}
          {savedResult?.patternAlert && (
            <View style={styles.patternCard}>
              <Text style={styles.patternText}>{savedResult.patternAlert.message}</Text>
            </View>
          )}

          {/* Mental health support card — shown after save if backend flags distress pattern */}
          {savedResult?.mentalHealthAlert && (
            <View style={styles.mentalHealthCard}>
              <Text style={styles.mentalHealthText}>
                {savedResult.mentalHealthAlert.message}
              </Text>
              <TouchableOpacity
                style={styles.mentalHealthLink}
                onPress={() => {
                  const url = savedResult.mentalHealthAlert.resource;
                  if (url) Linking.openURL(url).catch(() => {});
                }}
                accessibilityRole="link"
                accessibilityLabel={savedResult.mentalHealthAlert.resourceLabel}
              >
                <Text style={styles.mentalHealthLinkText}>
                  {savedResult.mentalHealthAlert.resourceLabel} →
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Pre-save pattern nudge — shown when same negative mood detected 2+ times this week */}
          {preSavePattern && !savedResult && (
            <View style={styles.preSavePatternCard}>
              <Text style={styles.preSavePatternText}>{preSavePattern.message}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={[styles.actions, { borderTopColor: moodColors?.light || MOOD_PALETTE.neutral.light }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: moodColors?.base || MOOD_PALETTE.neutral.base }]}
              onPress={handleClose}
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
    fontFamily: TYPOGRAPHY.family.bold,
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
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  sliderValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
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
    fontFamily: TYPOGRAPHY.family.bold,
    fontSize: TYPOGRAPHY.size.base,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING[1],
  },
  sliderLabelText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  sliderHelperText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
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
    fontFamily: TYPOGRAPHY.family.semibold,
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
    fontFamily: TYPOGRAPHY.family.semibold,
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
    fontFamily: TYPOGRAPHY.family.medium,
  },
  noteLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    marginBottom: SPACING[2],
  },
  noteInput: {
    backgroundColor: SURFACES.background.secondary,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.primary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    textAlign: 'right',
    marginTop: SPACING[1],
  },
  timeChips: {
    flexDirection: 'row',
    gap: SPACING[2],
    flexWrap: 'wrap',
  },
  timeChip: {
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
  },
  timeChipText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  freeTextInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.primary,
    backgroundColor: '#F9FAFB',
  },
  nlpHint: {
    marginTop: SPACING[1],
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.medium,
    color: '#6B7280',
    textAlign: 'right',
    fontStyle: 'italic',
  },
  ackCard: {
    marginHorizontal: SPACING[5],
    marginBottom: SPACING[2],
    backgroundColor: '#F0FDF4',
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  ackTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#065F46',
  },
  ackHint: {
    marginTop: SPACING[1],
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: '#047857',
  },
  preSavePatternCard: {
    marginHorizontal: SPACING[5],
    marginBottom: SPACING[2],
    backgroundColor: '#F5F3FF',
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
  },
  preSavePatternText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.medium,
    color: '#5B21B6',
    lineHeight: 18,
  },
  patternCard: {
    marginHorizontal: SPACING[5],
    marginBottom: SPACING[2],
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  patternText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.medium,
    color: '#1E40AF',
    lineHeight: 20,
  },
  mentalHealthCard: {
    marginHorizontal: SPACING[5],
    marginBottom: SPACING[3],
    backgroundColor: '#FEF3C7',
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  mentalHealthText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.medium,
    color: '#92400E',
    lineHeight: 20,
  },
  mentalHealthLink: {
    marginTop: SPACING[2],
  },
  mentalHealthLinkText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#B45309',
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
    fontFamily: TYPOGRAPHY.family.semibold,
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
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.white,
  },
});
