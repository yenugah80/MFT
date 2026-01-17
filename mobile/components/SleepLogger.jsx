/**
 * Sleep Logger Component
 *
 * Full-screen modal for logging sleep with:
 * - Bed and wake time pickers
 * - Auto-calculated duration
 * - Quality slider (1-10)
 * - Context tags (caffeine, alcohol, etc.)
 * - Notes input
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';

import {
  TEXT,
  BRAND,
  SURFACES,
  SEMANTIC,
  SHADOWS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  VIBRANT_WELLNESS,
} from '../constants/premiumTheme';
import { useSleepLog, SLEEP_QUALITY_LABELS, SLEEP_CONTEXT_TAGS } from '../hooks/useSleepLog';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_NOTE_LENGTH = 200;

export default function SleepLogger({ visible, onClose, initialData = null }) {
  const { logSleep, isLogging } = useSleepLog();

  // Animation
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Form state
  const [bedTime, setBedTime] = useState(() => {
    const date = new Date();
    date.setHours(22, 0, 0, 0); // Default 10 PM
    return date;
  });
  const [wakeTime, setWakeTime] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(6, 30, 0, 0); // Default 6:30 AM next day
    return date;
  });
  const [quality, setQuality] = useState(7);
  const [selectedTags, setSelectedTags] = useState([]);
  const [notes, setNotes] = useState('');

  // Time picker visibility (iOS inline, Android modal)
  const [showBedPicker, setShowBedPicker] = useState(Platform.OS === 'ios');
  const [showWakePicker, setShowWakePicker] = useState(Platform.OS === 'ios');

  // Calculate duration
  const durationMinutes = Math.round((wakeTime - bedTime) / (1000 * 60));
  const durationHours = Math.floor(durationMinutes / 60);
  const durationMins = durationMinutes % 60;

  // Animation effects
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Reset form when opening
  useEffect(() => {
    if (visible) {
      if (initialData) {
        setBedTime(new Date(initialData.bedTime));
        setWakeTime(new Date(initialData.wakeTime));
        setQuality(initialData.quality || 7);
        setSelectedTags(initialData.tags ? Object.keys(initialData.tags).filter(k => initialData.tags[k]) : []);
        setNotes(initialData.notes || '');
      } else {
        // Set to last night defaults
        const now = new Date();
        const defaultBed = new Date(now);
        defaultBed.setDate(defaultBed.getDate() - 1);
        defaultBed.setHours(22, 0, 0, 0);

        const defaultWake = new Date(now);
        defaultWake.setHours(6, 30, 0, 0);

        setBedTime(defaultBed);
        setWakeTime(defaultWake);
        setQuality(7);
        setSelectedTags([]);
        setNotes('');
      }
    }
  }, [visible, initialData]);

  const handleTagToggle = useCallback((tagKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTags(prev =>
      prev.includes(tagKey)
        ? prev.filter(k => k !== tagKey)
        : [...prev, tagKey]
    );
  }, []);

  const handleQualityChange = useCallback((newQuality) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuality(newQuality);
  }, []);

  const handleBedTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowBedPicker(false);
    }
    if (selectedDate) {
      setBedTime(selectedDate);
      // Ensure wake time is after bed time
      if (selectedDate >= wakeTime) {
        const newWake = new Date(selectedDate);
        newWake.setHours(newWake.getHours() + 8);
        setWakeTime(newWake);
      }
    }
  };

  const handleWakeTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowWakePicker(false);
    }
    if (selectedDate) {
      setWakeTime(selectedDate);
    }
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Build tags object
    const tagsObject = {};
    SLEEP_CONTEXT_TAGS.forEach(tag => {
      tagsObject[tag.key] = selectedTags.includes(tag.key);
    });

    try {
      await logSleep({
        bedTime: bedTime.toISOString(),
        wakeTime: wakeTime.toISOString(),
        quality,
        tags: tagsObject,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (error) {
      console.error('Failed to log sleep:', error);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getQualityLabel = () => {
    const label = SLEEP_QUALITY_LABELS.find(l => l.value === quality);
    return label || SLEEP_QUALITY_LABELS[6]; // Default to 7
  };

  const qualityLabel = getQualityLabel();
  const isValidDuration = durationMinutes > 0 && durationMinutes <= 24 * 60;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.overlayTouch}
          activeOpacity={1}
          onPress={handleClose}
        />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Animated.View
          style={[
            styles.container,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* Header */}
          <LinearGradient
            colors={[VIBRANT_WELLNESS.sleep.solid, `${VIBRANT_WELLNESS.sleep.solid}DD`]}
            style={styles.header}
          >
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Ionicons name="moon" size={32} color="#FFF" />
              <Text style={styles.headerTitle}>Log Sleep</Text>
              <Text style={styles.headerSubtitle}>How did you sleep last night?</Text>
            </View>
          </LinearGradient>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Time Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sleep Times</Text>

              <View style={styles.timeRow}>
                {/* Bed Time */}
                <View style={styles.timeBlock}>
                  <View style={styles.timeHeader}>
                    <Ionicons name="bed-outline" size={18} color={TEXT.secondary} />
                    <Text style={styles.timeLabel}>Bed Time</Text>
                  </View>
                  {Platform.OS === 'android' && (
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => setShowBedPicker(true)}
                    >
                      <Text style={styles.timeButtonText}>{formatTime(bedTime)}</Text>
                    </TouchableOpacity>
                  )}
                  {(Platform.OS === 'ios' || showBedPicker) && (
                    <DateTimePicker
                      value={bedTime}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleBedTimeChange}
                      style={styles.timePicker}
                    />
                  )}
                </View>

                {/* Wake Time */}
                <View style={styles.timeBlock}>
                  <View style={styles.timeHeader}>
                    <Ionicons name="sunny-outline" size={18} color={TEXT.secondary} />
                    <Text style={styles.timeLabel}>Wake Time</Text>
                  </View>
                  {Platform.OS === 'android' && (
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => setShowWakePicker(true)}
                    >
                      <Text style={styles.timeButtonText}>{formatTime(wakeTime)}</Text>
                    </TouchableOpacity>
                  )}
                  {(Platform.OS === 'ios' || showWakePicker) && (
                    <DateTimePicker
                      value={wakeTime}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleWakeTimeChange}
                      style={styles.timePicker}
                    />
                  )}
                </View>
              </View>

              {/* Duration Display */}
              <View style={[
                styles.durationCard,
                !isValidDuration && styles.durationCardError
              ]}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={isValidDuration ? VIBRANT_WELLNESS.sleep.solid : SEMANTIC.danger.base}
                />
                <Text style={[
                  styles.durationText,
                  !isValidDuration && styles.durationTextError
                ]}>
                  {isValidDuration
                    ? `${durationHours}h ${durationMins}m of sleep`
                    : 'Please check your times'
                  }
                </Text>
              </View>
            </View>

            {/* Quality Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sleep Quality</Text>

              <View style={styles.qualityDisplay}>
                <Ionicons
                  name={qualityLabel.icon}
                  size={40}
                  color={qualityLabel.color}
                />
                <Text style={[styles.qualityValue, { color: qualityLabel.color }]}>
                  {quality}
                </Text>
                <Text style={styles.qualityLabel}>{qualityLabel.label}</Text>
              </View>

              <View style={styles.qualitySlider}>
                {SLEEP_QUALITY_LABELS.map((label) => (
                  <TouchableOpacity
                    key={label.value}
                    style={[
                      styles.qualityDot,
                      quality === label.value && {
                        backgroundColor: label.color,
                        transform: [{ scale: 1.3 }]
                      }
                    ]}
                    onPress={() => handleQualityChange(label.value)}
                  >
                    {quality === label.value && (
                      <View style={styles.qualityDotInner} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.qualityLabels}>
                <Text style={styles.qualityEndLabel}>Poor</Text>
                <Text style={styles.qualityEndLabel}>Great</Text>
              </View>
            </View>

            {/* Context Tags Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What Affected Your Sleep?</Text>
              <Text style={styles.sectionSubtitle}>Select any that apply</Text>

              <View style={styles.tagsGrid}>
                {SLEEP_CONTEXT_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag.key);
                  return (
                    <TouchableOpacity
                      key={tag.key}
                      style={[
                        styles.tagChip,
                        isSelected && {
                          backgroundColor: `${VIBRANT_WELLNESS.sleep.solid}15`,
                          borderColor: VIBRANT_WELLNESS.sleep.solid
                        }
                      ]}
                      onPress={() => handleTagToggle(tag.key)}
                    >
                      <Ionicons
                        name={tag.icon}
                        size={18}
                        color={isSelected ? VIBRANT_WELLNESS.sleep.solid : TEXT.tertiary}
                      />
                      <Text style={[
                        styles.tagLabel,
                        isSelected && { color: VIBRANT_WELLNESS.sleep.solid }
                      ]}>
                        {tag.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Notes Section */}
            <View style={styles.section}>
              <View style={styles.notesHeader}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <Text style={styles.charCount}>
                  {notes.length}/{MAX_NOTE_LENGTH}
                </Text>
              </View>
              <TextInput
                style={styles.notesInput}
                placeholder="How did you feel when you woke up?"
                placeholderTextColor={TEXT.tertiary}
                value={notes}
                onChangeText={(text) => setNotes(text.slice(0, MAX_NOTE_LENGTH))}
                multiline
                numberOfLines={3}
                maxLength={MAX_NOTE_LENGTH}
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                (!isValidDuration || isLogging) && styles.saveButtonDisabled
              ]}
              onPress={handleSave}
              disabled={!isValidDuration || isLogging}
            >
              <LinearGradient
                colors={[VIBRANT_WELLNESS.sleep.solid, `${VIBRANT_WELLNESS.sleep.solid}DD`]}
                style={styles.saveButtonGradient}
              >
                {isLogging ? (
                  <Text style={styles.saveButtonText}>Saving...</Text>
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#FFF" />
                    <Text style={styles.saveButtonText}>Save Sleep</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouch: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: SURFACES.background.primary,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: SCREEN_HEIGHT * 0.9,
    ...SHADOWS.lg,
  },

  // Header
  header: {
    paddingTop: SPACING[4],
    paddingBottom: SPACING[5],
    paddingHorizontal: SPACING[4],
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING[3],
    right: SPACING[3],
    padding: SPACING[2],
    zIndex: 10,
  },
  headerContent: {
    alignItems: 'center',
    gap: SPACING[2],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING[4],
    paddingBottom: SPACING[6],
  },

  // Sections
  section: {
    marginBottom: SPACING[5],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[2],
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginBottom: SPACING[3],
  },

  // Time Section
  timeRow: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  timeBlock: {
    flex: 1,
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.md,
    padding: SPACING[3],
    ...SHADOWS.sm,
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  timeLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
  timeButton: {
    backgroundColor: SURFACES.background.secondary,
    padding: SPACING[3],
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  timePicker: {
    height: 100,
  },
  durationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    backgroundColor: `${VIBRANT_WELLNESS.sleep.solid}10`,
    padding: SPACING[3],
    borderRadius: RADIUS.md,
    marginTop: SPACING[3],
  },
  durationCardError: {
    backgroundColor: `${SEMANTIC.danger.base}10`,
  },
  durationText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: VIBRANT_WELLNESS.sleep.solid,
  },
  durationTextError: {
    color: SEMANTIC.danger.base,
  },

  // Quality Section
  qualityDisplay: {
    alignItems: 'center',
    gap: SPACING[1],
    marginBottom: SPACING[4],
  },
  qualityValue: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  qualityLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
  qualitySlider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING[2],
    marginBottom: SPACING[2],
  },
  qualityDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: SURFACES.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  qualityDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
  },
  qualityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[1],
  },
  qualityEndLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },

  // Tags Section
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.full,
    backgroundColor: SURFACES.background.secondary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tagLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },

  // Notes Section
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  charCount: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  notesInput: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.md,
    padding: SPACING[3],
    fontSize: TYPOGRAPHY.size.base,
    color: TEXT.primary,
    minHeight: 80,
    textAlignVertical: 'top',
    ...SHADOWS.sm,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: SPACING[3],
    padding: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: SURFACES.background.secondary,
  },
  cancelButton: {
    flex: 1,
    padding: SPACING[4],
    borderRadius: RADIUS.md,
    backgroundColor: SURFACES.background.secondary,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
  },
  saveButton: {
    flex: 2,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    padding: SPACING[4],
  },
  saveButtonText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFF',
  },
});
