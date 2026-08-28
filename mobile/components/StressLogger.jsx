/**
 * Stress Logger Component
 *
 * Full-screen modal for logging stress with:
 * - Stress level slider (1-10)
 * - Trigger selection (multi-select)
 * - Physical symptoms checklist
 * - Coping strategies used
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
import {
  useStressLog,
  STRESS_LEVELS,
  STRESS_TRIGGERS,
  PHYSICAL_SYMPTOMS,
  COPING_STRATEGIES,
} from '../hooks/useStressLog';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_NOTE_LENGTH = 200;

// Stress color gradient from calm to stressed
const STRESS_COLORS = [
  '#10B981', // 1-2: Green (calm)
  '#10B981',
  '#22C55E', // 3-4: Light green
  '#22C55E',
  '#F59E0B', // 5-6: Yellow/orange (moderate)
  '#F59E0B',
  '#F97316', // 7-8: Orange (stressed)
  '#F97316',
  '#EF4444', // 9-10: Red (very stressed)
  '#EF4444',
];

export default function StressLogger({ visible, onClose }) {
  const { logStress, isLogging } = useStressLog();

  // Animation
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);
  const pendingEventIdRef = useRef(null);

  // Form state
  // Null until the user picks. The level IS the datum here — an untouched
  // Save used to record a stress reading of 5 that nobody entered.
  const [stressLevel, setStressLevel] = useState(null);
  const [selectedTriggers, setSelectedTriggers] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [selectedCoping, setSelectedCoping] = useState([]);
  const [notes, setNotes] = useState('');
  const [activeDetail, setActiveDetail] = useState('triggers');
  const [saveError, setSaveError] = useState(null);

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
      setStressLevel(null);
      setSelectedTriggers([]);
      setSelectedSymptoms([]);
      setSelectedCoping([]);
      setNotes('');
      setActiveDetail('triggers');
      setSaveError(null);
      pendingEventIdRef.current = null;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [visible]);

  const selectDetail = useCallback((key) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveDetail(key);
  }, []);

  const handleLevelChange = useCallback((level) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStressLevel(level);
  }, []);

  const handleTriggerToggle = useCallback((key) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTriggers(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }, []);

  const handleSymptomToggle = useCallback((key) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSymptoms(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }, []);

  const handleCopingToggle = useCallback((key) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCoping(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }, []);

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaveError(null);

    // Build symptoms object
    const symptomsObject = {};
    PHYSICAL_SYMPTOMS.forEach(symptom => {
      symptomsObject[symptom.key] = selectedSymptoms.includes(symptom.key);
    });

    try {
      // Keep the same key after an uncertain network failure. If the server
      // committed but the response was lost, Retry resolves idempotently.
      pendingEventIdRef.current ||= Crypto.randomUUID();
      await logStress({
        level: stressLevel,
        triggers: selectedTriggers,
        physicalSymptoms: symptomsObject,
        copingUsed: selectedCoping,
        notes: notes.trim() || null,
        clientEventId: pendingEventIdRef.current,
      });
      pendingEventIdRef.current = null;
      onClose();
    } catch (error) {
      console.error('Failed to log stress:', error);
      setSaveError('Couldn’t save your check-in. Check your connection and try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  // Null when unrated — deliberately does NOT fall back to level 5.
  const getStressInfo = () =>
    STRESS_LEVELS.find(l => l.value === stressLevel) || null;

  const stressInfo = getStressInfo();
  const hasLevel = stressLevel !== null;
  // STRESS_COLORS encodes severity, so there is no honest colour for "not yet
  // rated". Fall back to the neutral Stress accent used on the dashboard card.
  const stressColor = hasLevel ? STRESS_COLORS[stressLevel - 1] : SEMANTIC.warning.base;
  const detailCount = selectedTriggers.length + selectedSymptoms.length + selectedCoping.length + (notes.length ? 1 : 0);
  const detailTabs = [
    { key: 'triggers', label: 'Causes', icon: 'compass-outline', count: selectedTriggers.length, accent: stressColor },
    { key: 'symptoms', label: 'Body', icon: 'body-outline', count: selectedSymptoms.length, accent: SEMANTIC.warning.base },
    { key: 'coping', label: 'Relief', icon: 'leaf-outline', count: selectedCoping.length, accent: SEMANTIC.success.base },
    { key: 'notes', label: 'Note', icon: 'create-outline', count: notes.length ? 1 : 0, accent: VIBRANT_WELLNESS.stress.solid },
  ];

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
          {/* Compact hero keeps the check-in feeling quick, not clinical. */}
          <LinearGradient
            colors={VIBRANT_WELLNESS.stress.gradient}
            style={styles.header}
          >
            <View style={styles.headerTopRow}>
              <View style={styles.headerIdentity}>
                <View style={styles.pulseOrb}>
                  <Ionicons name="pulse" size={22} color="#FFF" />
                </View>
                <View>
                  <Text style={styles.headerEyebrow}>QUICK CHECK-IN</Text>
                  <Text style={styles.headerTitle}>Log stress</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton} accessibilityLabel="Close stress logger">
                <Ionicons name="close" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerPrompt}>What’s your load right now?</Text>
          </LinearGradient>

          <ScrollView
            ref={scrollRef}
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Required intensity */}
            <View style={[styles.section, styles.levelCard]}>
              <View style={styles.sectionHeading}>
                <View style={styles.levelQuestion}>
                  <Text style={styles.sectionEyebrow}>INTENSITY</Text>
                  <Text style={styles.sectionTitle}>How strong is it?</Text>
                </View>
                <View style={styles.levelDisplay}>
                {hasLevel ? (
                  <>
                    <View style={[styles.levelCircle, { backgroundColor: `${stressColor}16`, borderColor: `${stressColor}45` }]}>
                      <Text style={[styles.levelValue, { color: stressColor }]}>
                        {stressLevel}
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.levelLabel, { color: stressColor }]}>{stressInfo.label}</Text>
                      <Text style={styles.levelDescription}>{stressInfo.description}</Text>
                    </View>
                  </>
                ) : (
                      <Text style={styles.levelPrompt}>Choose 1–10</Text>
                )}
                </View>
              </View>

              <View style={styles.levelSlider}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.levelDot,
                      { borderColor: STRESS_COLORS[level - 1] },
                      stressLevel === level && styles.levelDotActive,
                      stressLevel === level && { backgroundColor: STRESS_COLORS[level - 1] },
                    ]}
                    onPress={() => handleLevelChange(level)}
                    accessibilityRole="button"
                    accessibilityLabel={`Stress level ${level} out of 10`}
                    accessibilityState={{ selected: stressLevel === level }}
                  >
                    {stressLevel === level && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.levelLabels}>
                <Text style={styles.levelEndLabel}>1 · Calm</Text>
                <Text style={[styles.levelSelectedLabel, hasLevel && { color: stressColor }]}>{stressInfo?.label || 'Choose one'}</Text>
                <Text style={styles.levelEndLabel}>10 · Overwhelmed</Text>
              </View>

              {stressLevel >= 7 && <Text style={styles.encouragementText}>Take it one step at a time — noticing it already helps.</Text>}
            </View>

            <View style={styles.detailsCard}>
              <View style={styles.detailsHeading}>
                <View>
                  <Text style={styles.sectionEyebrow}>OPTIONAL DETAILS</Text>
                  <Text style={styles.detailsTitle}>Add what feels useful</Text>
                </View>
                <View style={styles.detailsCount}>
                  <Text style={styles.detailsCountText}>{detailCount ? `${detailCount} added` : 'Skip anytime'}</Text>
                </View>
              </View>

              <View style={styles.detailTabs} accessibilityRole="tablist">
                {detailTabs.map((tab) => {
                  const isActive = activeDetail === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[styles.detailTab, isActive && { backgroundColor: `${tab.accent}12` }]}
                      onPress={() => selectDetail(tab.key)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: isActive }}
                    >
                      <View style={styles.detailTabIconWrap}>
                        <Ionicons name={tab.icon} size={18} color={isActive ? tab.accent : TEXT.tertiary} />
                        {!!tab.count && (
                          <View style={[styles.tabBadge, { backgroundColor: tab.accent }]}>
                            <Text style={styles.tabBadgeText}>{tab.count}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.detailTabLabel, isActive && { color: tab.accent }]}>{tab.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.detailBody}>
                {activeDetail === 'triggers' && (
                  <>
                    <Text style={styles.detailPrompt}>What’s driving it?</Text>
                    <View style={styles.tagsGrid}>
                {STRESS_TRIGGERS.map((trigger) => {
                  const isSelected = selectedTriggers.includes(trigger.key);
                  return (
                    <TouchableOpacity
                      key={trigger.key}
                      style={[
                        styles.tagChip,
                        isSelected && { backgroundColor: `${stressColor}12`, borderColor: `${stressColor}60` }
                      ]}
                      onPress={() => handleTriggerToggle(trigger.key)}
                    >
                      <Ionicons
                        name={trigger.icon}
                        size={18}
                        color={isSelected ? stressColor : TEXT.tertiary}
                      />
                      <Text style={[
                        styles.tagLabel,
                        isSelected && { color: stressColor }
                      ]}>
                        {trigger.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                    </View>
                  </>
                )}

                {activeDetail === 'symptoms' && (
                  <>
                    <Text style={styles.detailPrompt}>What is your body saying?</Text>
                    <View style={styles.symptomsGrid}>
                {PHYSICAL_SYMPTOMS.map((symptom) => {
                  const isSelected = selectedSymptoms.includes(symptom.key);
                  return (
                    <TouchableOpacity
                      key={symptom.key}
                      style={[
                        styles.symptomChip,
                        isSelected && { backgroundColor: `${SEMANTIC.warning.base}12`, borderColor: `${SEMANTIC.warning.base}60` }
                      ]}
                      onPress={() => handleSymptomToggle(symptom.key)}
                    >
                      <Ionicons
                        name={symptom.icon}
                        size={16}
                        color={isSelected ? SEMANTIC.warning.base : TEXT.tertiary}
                      />
                      <Text style={[
                        styles.symptomLabel,
                        isSelected && { color: SEMANTIC.warning.base }
                      ]}>
                        {symptom.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                    </View>
                  </>
                )}

                {activeDetail === 'coping' && (
                  <>
                    <Text style={styles.detailPrompt}>What’s helping?</Text>
                    <View style={styles.tagsGrid}>
                {COPING_STRATEGIES.map((strategy) => {
                  const isSelected = selectedCoping.includes(strategy.key);
                  return (
                    <TouchableOpacity
                      key={strategy.key}
                      style={[
                        styles.tagChip,
                        isSelected && { backgroundColor: `${SEMANTIC.success.base}12`, borderColor: `${SEMANTIC.success.base}60` }
                      ]}
                      onPress={() => handleCopingToggle(strategy.key)}
                    >
                      <Ionicons
                        name={strategy.icon}
                        size={18}
                        color={isSelected ? SEMANTIC.success.base : TEXT.tertiary}
                      />
                      <Text style={[
                        styles.tagLabel,
                        isSelected && { color: SEMANTIC.success.base }
                      ]}>
                        {strategy.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                    </View>
                  </>
                )}

                {activeDetail === 'notes' && (
                  <>
                    <View style={styles.notesMeta}>
                      <Text style={styles.detailPrompt}>Anything else?</Text>
                      <Text style={styles.charCount}>{notes.length}/{MAX_NOTE_LENGTH}</Text>
                    </View>
                    <TextInput
                      style={styles.notesInput}
                      placeholder="Write what feels useful…"
                      placeholderTextColor={TEXT.tertiary}
                      value={notes}
                      onChangeText={(text) => setNotes(text.slice(0, MAX_NOTE_LENGTH))}
                      multiline
                      numberOfLines={3}
                      maxLength={MAX_NOTE_LENGTH}
                    />
                  </>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Anchored primary action */}
          <View style={styles.actions}>
            {!!saveError && (
              <View style={styles.saveError} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={17} color={SEMANTIC.error.base} />
                <Text style={styles.saveErrorText}>{saveError}</Text>
              </View>
            )}
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!hasLevel || isLogging) && styles.saveButtonDisabled
              ]}
              onPress={handleSave}
              disabled={!hasLevel || isLogging}
              accessibilityHint={hasLevel ? undefined : 'Choose a stress level to save'}
            >
              <LinearGradient
                colors={hasLevel ? [stressColor, `${stressColor}DD`] : ['#D3C9B9', '#C3B8A7']}
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
                    <Text style={styles.saveButtonText}>
                      {selectedCoping.length > 0 ? 'Save Check-in' : 'Save'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.actionHint}>{hasLevel ? 'Your stress check-in is ready' : 'Choose a stress level to continue'}</Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(40, 32, 18, 0.55)',
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
  header: { paddingTop: SPACING[4], paddingBottom: SPACING[4], paddingHorizontal: SPACING[5], borderTopLeftRadius: RADIUS['3xl'], borderTopRightRadius: RADIUS['3xl'] },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIdentity: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3] },
  headerEyebrow: { fontSize: 10, letterSpacing: 1.3, color: 'rgba(255,255,255,0.72)', fontFamily: TYPOGRAPHY.family.bold },
  closeButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  pulseOrb: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  headerTitle: { marginTop: 1, fontSize: TYPOGRAPHY.size.xl, fontFamily: TYPOGRAPHY.family.bold, color: '#FFF' },
  headerPrompt: { marginTop: SPACING[3], fontSize: TYPOGRAPHY.size.base, fontFamily: TYPOGRAPHY.family.semibold, color: 'rgba(255,255,255,0.9)' },
  content: { flex: 1 },
  contentContainer: { padding: SPACING[3], paddingTop: SPACING[3], paddingBottom: SPACING[3] },
  section: { marginBottom: SPACING[3] },
  levelCard: { backgroundColor: SURFACES.card.primary, borderRadius: RADIUS.xl, padding: SPACING[3], borderWidth: 1, borderColor: SURFACES.card.border, ...SHADOWS.sm },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING[2], marginBottom: SPACING[3] },
  sectionEyebrow: { fontSize: 10, letterSpacing: 1.2, color: TEXT.tertiary, fontFamily: TYPOGRAPHY.family.bold },
  levelQuestion: { flexShrink: 1 },
  sectionTitle: { marginTop: 2, fontSize: TYPOGRAPHY.size.base, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },
  levelDisplay: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: SPACING[2] },
  levelCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  levelValue: { fontSize: TYPOGRAPHY.size.lg, fontFamily: TYPOGRAPHY.family.bold },
  levelPrompt: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary },
  levelLabel: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold },
  levelDescription: { marginTop: 2, maxWidth: 100, fontSize: 9, color: TEXT.tertiary },
  levelSlider: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 4, marginBottom: SPACING[2] },
  levelDot: { flex: 1, maxWidth: 31, aspectRatio: 1, borderRadius: 16, backgroundColor: SURFACES.background.tertiary, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  levelDotActive: { transform: [{ scale: 1.08 }] },
  levelLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  levelEndLabel: { fontSize: 10, color: TEXT.tertiary },
  levelSelectedLabel: { fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.tertiary },
  encouragementText: { marginTop: SPACING[2], fontSize: 10, color: SEMANTIC.info.base, fontFamily: TYPOGRAPHY.family.medium },
  detailsCard: { backgroundColor: SURFACES.card.primary, borderRadius: RADIUS.xl, padding: SPACING[3], borderWidth: 1, borderColor: SURFACES.card.border, ...SHADOWS.sm },
  detailsHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING[3] },
  detailsTitle: { marginTop: 2, fontSize: TYPOGRAPHY.size.base, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },
  detailsCount: { backgroundColor: SURFACES.background.tertiary, borderRadius: RADIUS.full, paddingHorizontal: SPACING[2], paddingVertical: 5 },
  detailsCountText: { fontSize: 9, color: TEXT.tertiary, fontFamily: TYPOGRAPHY.family.medium },
  detailTabs: { flexDirection: 'row', gap: SPACING[1], padding: 4, borderRadius: RADIUS.lg, backgroundColor: SURFACES.background.tertiary },
  detailTab: { flex: 1, minHeight: 52, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', gap: 3 },
  detailTabIconWrap: { position: 'relative' },
  detailTabLabel: { fontSize: 10, color: TEXT.tertiary, fontFamily: TYPOGRAPHY.family.semibold },
  tabBadge: { position: 'absolute', right: -10, top: -7, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  tabBadgeText: { color: '#FFF', fontSize: 8, fontFamily: TYPOGRAPHY.family.bold },
  detailBody: { marginTop: SPACING[3], minHeight: 150 },
  detailPrompt: { marginBottom: SPACING[2], fontSize: TYPOGRAPHY.size.sm, color: TEXT.secondary, fontFamily: TYPOGRAPHY.family.semibold },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2] },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2], paddingHorizontal: SPACING[3], paddingVertical: 7, borderRadius: RADIUS.full, backgroundColor: SURFACES.background.tertiary, borderWidth: 1, borderColor: SURFACES.card.border },
  tagLabel: { fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.family.medium, color: TEXT.secondary },
  symptomsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2] },
  symptomChip: { flexDirection: 'row', alignItems: 'center', gap: SPACING[1], paddingHorizontal: SPACING[2], paddingVertical: 7, borderRadius: RADIUS.full, backgroundColor: SURFACES.background.tertiary, borderWidth: 1, borderColor: SURFACES.card.border },
  symptomLabel: { fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.family.medium, color: TEXT.secondary },
  notesMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  charCount: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary },
  notesInput: { backgroundColor: SURFACES.background.tertiary, borderRadius: RADIUS.md, padding: SPACING[3], fontFamily: TYPOGRAPHY.family.regular, fontSize: TYPOGRAPHY.size.sm, color: TEXT.primary, minHeight: 104, textAlignVertical: 'top' },
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
