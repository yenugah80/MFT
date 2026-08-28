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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import DateTimePicker from '@react-native-community/datetimepicker';

import {
  TEXT,
  SURFACES,
  SEMANTIC,
  SHADOWS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  VIBRANT_WELLNESS,
} from '../constants/premiumTheme';
import { useSleepLog, SLEEP_QUALITY_LABELS, SLEEP_CONTEXT_TAGS } from '../hooks/useSleepLog';
import {
  alignBedTime,
  applyWakeTime,
  sleepDurationMinutes,
  isValidSleepDuration,
} from '../utils/sleepWindow';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_NOTE_LENGTH = 200;

export default function SleepLogger({ visible, onClose, initialData = null }) {
  const { logSleep, isLogging } = useSleepLog();
  const pendingEventIdRef = useRef(null);

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
  // Null until the user picks. A pre-filled 7/10 is indistinguishable in the
  // database from a deliberate answer, so an untouched Save used to record a
  // sleep rating nobody chose.
  const [quality, setQuality] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [notes, setNotes] = useState('');
  const [saveError, setSaveError] = useState(null);

  // Time picker visibility (iOS inline, Android modal)
  const [showBedPicker, setShowBedPicker] = useState(Platform.OS === 'ios');
  const [showWakePicker, setShowWakePicker] = useState(Platform.OS === 'ios');

  // Calculate duration
  const durationMinutes = sleepDurationMinutes(bedTime, wakeTime);
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
  }, [visible, fadeAnim, slideAnim]);

  // Reset form when opening
  useEffect(() => {
    if (visible) {
      setSaveError(null);
      pendingEventIdRef.current = null;
      if (initialData) {
        setBedTime(new Date(initialData.bedTime));
        setWakeTime(new Date(initialData.wakeTime));
        // ?? not || — an entry saved without a quality stays unrated rather
        // than acquiring a 7 on edit.
        setQuality(initialData.quality ?? null);
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
        setQuality(null);
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
      setBedTime(alignBedTime(selectedDate, wakeTime));
    }
  };

  const handleWakeTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowWakePicker(false);
    }
    if (selectedDate) {
      // Keeps the wake date anchored (the picker only edits a clock time) and
      // re-anchors bed so the window stays positive and under 24h.
      const next = applyWakeTime(bedTime, wakeTime, selectedDate);
      setWakeTime(next.wakeTime);
      setBedTime(next.bedTime);
    }
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaveError(null);

    // Build tags object
    const tagsObject = {};
    SLEEP_CONTEXT_TAGS.forEach(tag => {
      tagsObject[tag.key] = selectedTags.includes(tag.key);
    });

    try {
      pendingEventIdRef.current ||= Crypto.randomUUID();
      await logSleep({
        bedTime: bedTime.toISOString(),
        wakeTime: wakeTime.toISOString(),
        quality,
        tags: tagsObject,
        notes: notes.trim() || null,
        clientEventId: pendingEventIdRef.current,
      });
      pendingEventIdRef.current = null;
      onClose();
    } catch (error) {
      console.error('Failed to log sleep:', error);
      setSaveError('Couldn’t save your sleep. Check your connection and try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Returns null when unrated — deliberately does NOT fall back to 7, which is
  // how an unchosen rating used to acquire an icon, a colour and a number.
  const getQualityLabel = () =>
    SLEEP_QUALITY_LABELS.find(l => l.value === quality) || null;

  const qualityLabel = getQualityLabel();
  const isValidDuration = isValidSleepDuration(durationMinutes);
  const canSave = isValidDuration && quality !== null;

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
          {/* Compact hero */}
          <LinearGradient
            colors={VIBRANT_WELLNESS.sleep.gradient}
            style={styles.header}
          >
            <View style={styles.headerTopRow}>
              <View>
                <Text style={styles.headerEyebrow}>WELLNESS CHECK-IN</Text>
                <Text style={styles.headerTitle}>Log sleep</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton} accessibilityLabel="Close sleep logger">
                <Ionicons name="close" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.headerContent}>
              <View style={styles.moonOrb}>
                <Ionicons name="moon" size={25} color="#FFF" />
              </View>
              <View style={styles.headerCopy}>
                <Text style={styles.headerPrompt}>How was your night?</Text>
                <Text style={styles.headerSubtitle}>A quick check-in helps reveal your recovery patterns.</Text>
              </View>
            </View>
          </LinearGradient>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Sleep window */}
            <View style={[styles.section, styles.windowCard]}>
              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.sectionEyebrow}>SLEEP WINDOW</Text>
                  <Text style={styles.sectionTitle}>When did you rest?</Text>
                </View>
                <View style={[
                  styles.durationCard,
                  !isValidDuration && styles.durationCardError,
                ]}>
                  <Ionicons
                    name="time-outline"
                    size={15}
                    color={isValidDuration ? VIBRANT_WELLNESS.sleep.solid : SEMANTIC.danger.base}
                  />
                  <Text style={[styles.durationText, !isValidDuration && styles.durationTextError]}>
                    {isValidDuration ? `${durationHours}h ${durationMins}m` : 'Check times'}
                  </Text>
                </View>
              </View>

              <View style={styles.timeRow}>
                <View style={styles.timeBlock}>
                  <View style={[styles.timeIcon, { backgroundColor: `${VIBRANT_WELLNESS.sleep.solid}12` }]}>
                    <Ionicons name="moon-outline" size={18} color={VIBRANT_WELLNESS.sleep.solid} />
                  </View>
                  <Text style={styles.timeLabel}>Bedtime</Text>
                  {Platform.OS === 'android' ? (
                    <TouchableOpacity style={styles.timeButton} onPress={() => setShowBedPicker(true)}>
                      <Text style={styles.timeButtonText}>{formatTime(bedTime)}</Text>
                    </TouchableOpacity>
                  ) : (
                    <DateTimePicker
                      value={bedTime}
                      mode="time"
                      display="compact"
                      onChange={handleBedTimeChange}
                      style={styles.timePicker}
                      accessibilityLabel="Bed time"
                    />
                  )}
                  {Platform.OS === 'android' && showBedPicker && (
                    <DateTimePicker value={bedTime} mode="time" display="default" onChange={handleBedTimeChange} />
                  )}
                </View>

                <View style={styles.timeConnector}>
                  <View style={styles.connectorLine} />
                  <Ionicons name="arrow-forward" size={15} color={TEXT.tertiary} />
                  <View style={styles.connectorLine} />
                </View>

                <View style={styles.timeBlock}>
                  <View style={[styles.timeIcon, { backgroundColor: `${SEMANTIC.warning.base}12` }]}>
                    <Ionicons name="sunny-outline" size={18} color={SEMANTIC.warning.base} />
                  </View>
                  <Text style={styles.timeLabel}>Wake time</Text>
                  {Platform.OS === 'android' ? (
                    <TouchableOpacity style={styles.timeButton} onPress={() => setShowWakePicker(true)}>
                      <Text style={styles.timeButtonText}>{formatTime(wakeTime)}</Text>
                    </TouchableOpacity>
                  ) : (
                    <DateTimePicker
                      value={wakeTime}
                      mode="time"
                      display="compact"
                      onChange={handleWakeTimeChange}
                      style={styles.timePicker}
                      accessibilityLabel="Wake time"
                    />
                  )}
                  {Platform.OS === 'android' && showWakePicker && (
                    <DateTimePicker value={wakeTime} mode="time" display="default" onChange={handleWakeTimeChange} />
                  )}
                </View>
              </View>
            </View>

            {/* Quality Section */}
            <View style={[styles.section, styles.formCard]}>
              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.sectionEyebrow}>QUALITY</Text>
                  <Text style={styles.sectionTitle}>How did it feel?</Text>
                </View>
                <View style={styles.qualityDisplay}>
                {qualityLabel ? (
                  <>
                    <Ionicons
                      name={qualityLabel.icon}
                      size={21}
                      color={qualityLabel.color}
                    />
                    <Text style={[styles.qualityValue, { color: qualityLabel.color }]}>
                      {quality}
                    </Text>
                    <Text style={styles.qualityScale}>/10</Text>
                  </>
                ) : (
                  <Text style={styles.qualityPrompt}>Tap to rate your sleep</Text>
                )}
                </View>
              </View>

              <View style={styles.qualitySlider}>
                {SLEEP_QUALITY_LABELS.map((label) => (
                  <TouchableOpacity
                    key={label.value}
                    style={[
                      styles.qualityDot,
                      quality === label.value && { backgroundColor: label.color, borderColor: label.color },
                    ]}
                    onPress={() => handleQualityChange(label.value)}
                    accessibilityRole="button"
                    accessibilityLabel={`Sleep quality ${label.value} out of 10, ${label.label}`}
                    accessibilityState={{ selected: quality === label.value }}
                  >
                    {quality === label.value && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.qualityLabels}>
                <Text style={styles.qualityEndLabel}>1 · Rough</Text>
                <Text style={[styles.qualitySelectedLabel, qualityLabel && { color: qualityLabel.color }]}>{qualityLabel?.label || 'Choose one'}</Text>
                <Text style={styles.qualityEndLabel}>10 · Restorative</Text>
              </View>
            </View>

            {/* Context Tags Section */}
            <View style={[styles.section, styles.formCard]}>
              <Text style={styles.sectionEyebrow}>CONTEXT</Text>
              <Text style={styles.sectionTitle}>What shaped your night?</Text>
              <Text style={styles.sectionSubtitle}>Optional · choose all that apply</Text>

              <View style={styles.tagsGrid}>
                {SLEEP_CONTEXT_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag.key);
                  return (
                    <TouchableOpacity
                      key={tag.key}
                      style={[
                        styles.tagChip,
                        isSelected && styles.tagChipSelected,
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
            <View style={[styles.section, styles.formCard]}>
              <View style={styles.notesHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>NOTES</Text>
                  <Text style={styles.sectionTitle}>Anything to remember?</Text>
                </View>
                <Text style={styles.charCount}>
                  {notes.length}/{MAX_NOTE_LENGTH}
                </Text>
              </View>
              <TextInput
                style={styles.notesInput}
                placeholder="How did you feel when you woke up? (optional)"
                placeholderTextColor={TEXT.tertiary}
                value={notes}
                onChangeText={(text) => setNotes(text.slice(0, MAX_NOTE_LENGTH))}
                multiline
                numberOfLines={3}
                maxLength={MAX_NOTE_LENGTH}
              />
            </View>
          </ScrollView>

          {/* Anchored primary action */}
          <View style={styles.actions}>
            {!!saveError && (
              <View style={styles.saveError} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle-outline" size={16} color={SEMANTIC.error.base} />
                <Text style={styles.saveErrorText}>{saveError}</Text>
              </View>
            )}
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!canSave || isLogging) && styles.saveButtonDisabled
              ]}
              onPress={handleSave}
              disabled={!canSave || isLogging}
              accessibilityHint={
                quality === null
                  ? 'Choose a sleep quality to save'
                  : (!isValidDuration ? 'Check your bed and wake times to save' : undefined)
              }
            >
              <LinearGradient
                colors={canSave ? VIBRANT_WELLNESS.sleep.gradient : ['#C7C5DA', '#B5B3CD']}
                style={styles.saveButtonGradient}
              >
                {isLogging ? (
                  <>
                    <ActivityIndicator size="small" color="#FFF" />
                    <Text style={styles.saveButtonText}>Saving…</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={21} color="#FFF" />
                    <Text style={styles.saveButtonText}>Save Sleep</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.actionHint}>
              {quality === null ? 'Choose a quality rating to continue' : (!isValidDuration ? 'Check your sleep window to continue' : 'Your sleep entry is ready')}
            </Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(31, 27, 51, 0.56)',
  },
  overlayTouch: { flex: 1 },
  keyboardView: { flex: 1, justifyContent: 'flex-end' },
  container: {
    backgroundColor: SURFACES.background.primary,
    borderTopLeftRadius: RADIUS['3xl'],
    borderTopRightRadius: RADIUS['3xl'],
    height: SCREEN_HEIGHT * 0.94,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  header: {
    paddingTop: SPACING[5],
    paddingBottom: SPACING[6],
    paddingHorizontal: SPACING[5],
    borderTopLeftRadius: RADIUS['3xl'],
    borderTopRightRadius: RADIUS['3xl'],
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerEyebrow: { fontSize: 10, letterSpacing: 1.3, color: 'rgba(255,255,255,0.7)', fontFamily: TYPOGRAPHY.family.bold },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginTop: SPACING[5],
  },
  moonOrb: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.17)' },
  headerCopy: { flex: 1 },
  headerTitle: {
    marginTop: 3,
    fontSize: TYPOGRAPHY.size['2xl'],
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFF',
  },
  headerPrompt: { fontSize: TYPOGRAPHY.size.lg, fontFamily: TYPOGRAPHY.family.bold, color: '#FFF' },
  headerSubtitle: {
    marginTop: 3,
    maxWidth: 280,
    fontSize: TYPOGRAPHY.size.xs,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.78)',
  },
  content: { flex: 1 },
  contentContainer: {
    padding: SPACING[4],
    paddingTop: SPACING[4],
    paddingBottom: SPACING[5],
  },
  section: { marginBottom: SPACING[4] },
  windowCard: { backgroundColor: SURFACES.card.primary, borderRadius: RADIUS.xl, padding: SPACING[4], borderWidth: 1, borderColor: SURFACES.card.border, ...SHADOWS.sm },
  formCard: { backgroundColor: SURFACES.card.primary, borderRadius: RADIUS.xl, padding: SPACING[4], borderWidth: 1, borderColor: SURFACES.card.border, ...SHADOWS.sm },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING[3], marginBottom: SPACING[4] },
  sectionEyebrow: { fontSize: 10, letterSpacing: 1.2, color: TEXT.tertiary, fontFamily: TYPOGRAPHY.family.bold },
  sectionTitle: {
    marginTop: 3,
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginBottom: SPACING[3],
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeBlock: {
    flex: 1,
    minHeight: 124,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
  },
  timeIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING[2] },
  timeLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
    marginBottom: SPACING[1],
  },
  timeConnector: { width: 34, alignItems: 'center', justifyContent: 'center', gap: 3 },
  connectorLine: { width: 1, height: 12, backgroundColor: SURFACES.divider },
  timeButton: {
    backgroundColor: SURFACES.card.primary,
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  timePicker: {
    alignSelf: 'center',
  },
  durationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: `${VIBRANT_WELLNESS.sleep.solid}10`,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.full,
  },
  durationCardError: { backgroundColor: `${SEMANTIC.danger.base}10` },
  durationText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: VIBRANT_WELLNESS.sleep.solid,
  },
  durationTextError: { color: SEMANTIC.danger.base },
  qualityDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    flexShrink: 1,
  },
  qualityValue: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  qualityScale: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary, marginLeft: -3 },
  qualityPrompt: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  qualitySlider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING[3],
  },
  qualityDot: {
    flex: 1,
    maxWidth: 34,
    aspectRatio: 1,
    borderRadius: 17,
    backgroundColor: SURFACES.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: SURFACES.card.border,
  },
  qualityLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qualityEndLabel: { fontSize: 10, color: TEXT.tertiary },
  qualitySelectedLabel: { fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.tertiary },
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
    backgroundColor: SURFACES.background.tertiary,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
  },
  tagChipSelected: { backgroundColor: `${VIBRANT_WELLNESS.sleep.solid}10`, borderColor: `${VIBRANT_WELLNESS.sleep.solid}55` },
  tagLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  charCount: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary },
  notesInput: {
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.md,
    padding: SPACING[3],
    fontFamily: TYPOGRAPHY.family.regular,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.primary,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  actions: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[3],
    paddingBottom: Platform.OS === 'ios' ? SPACING[6] : SPACING[4],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
    backgroundColor: SURFACES.card.primary,
  },
  saveError: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2], marginBottom: SPACING[2], paddingHorizontal: SPACING[2] },
  saveErrorText: { flex: 1, fontSize: 10, lineHeight: 14, color: SEMANTIC.error.base, fontFamily: TYPOGRAPHY.family.medium },
  saveButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  saveButtonDisabled: { opacity: 0.72 },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    minHeight: 52,
    paddingHorizontal: SPACING[4],
  },
  saveButtonText: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFF',
  },
  actionHint: { marginTop: SPACING[2], textAlign: 'center', fontSize: 10, color: TEXT.tertiary },
});
