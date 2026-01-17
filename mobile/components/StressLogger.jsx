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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

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

  // Form state
  const [stressLevel, setStressLevel] = useState(5);
  const [selectedTriggers, setSelectedTriggers] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [selectedCoping, setSelectedCoping] = useState([]);
  const [notes, setNotes] = useState('');

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
      setStressLevel(5);
      setSelectedTriggers([]);
      setSelectedSymptoms([]);
      setSelectedCoping([]);
      setNotes('');
    }
  }, [visible]);

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

    // Build symptoms object
    const symptomsObject = {};
    PHYSICAL_SYMPTOMS.forEach(symptom => {
      symptomsObject[symptom.key] = selectedSymptoms.includes(symptom.key);
    });

    try {
      await logStress({
        level: stressLevel,
        triggers: selectedTriggers,
        physicalSymptoms: symptomsObject,
        copingUsed: selectedCoping,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (error) {
      console.error('Failed to log stress:', error);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const getStressInfo = () => {
    const info = STRESS_LEVELS.find(l => l.value === stressLevel);
    return info || STRESS_LEVELS[4]; // Default to level 5
  };

  const stressInfo = getStressInfo();
  const stressColor = STRESS_COLORS[stressLevel - 1];

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
            colors={[stressColor, `${stressColor}DD`]}
            style={styles.header}
          >
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Ionicons name="pulse" size={32} color="#FFF" />
              <Text style={styles.headerTitle}>Log Stress</Text>
              <Text style={styles.headerSubtitle}>How are you feeling right now?</Text>
            </View>
          </LinearGradient>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Stress Level Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stress Level</Text>

              <View style={styles.levelDisplay}>
                <View style={[styles.levelCircle, { backgroundColor: `${stressColor}20`, borderColor: stressColor }]}>
                  <Text style={[styles.levelValue, { color: stressColor }]}>
                    {stressLevel}
                  </Text>
                </View>
                <Text style={styles.levelLabel}>{stressInfo.label}</Text>
                <Text style={styles.levelDescription}>{stressInfo.description}</Text>
              </View>

              <View style={styles.levelSlider}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.levelDot,
                      { backgroundColor: STRESS_COLORS[level - 1] },
                      stressLevel === level && styles.levelDotActive,
                    ]}
                    onPress={() => handleLevelChange(level)}
                  >
                    {stressLevel === level && (
                      <View style={styles.levelDotInner} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.levelLabels}>
                <Text style={styles.levelEndLabel}>Calm</Text>
                <Text style={styles.levelEndLabel}>Stressed</Text>
              </View>
            </View>

            {/* Triggers Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What's Causing Stress?</Text>
              <Text style={styles.sectionSubtitle}>Select all that apply</Text>

              <View style={styles.tagsGrid}>
                {STRESS_TRIGGERS.map((trigger) => {
                  const isSelected = selectedTriggers.includes(trigger.key);
                  return (
                    <TouchableOpacity
                      key={trigger.key}
                      style={[
                        styles.tagChip,
                        isSelected && {
                          backgroundColor: `${stressColor}15`,
                          borderColor: stressColor
                        }
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
            </View>

            {/* Physical Symptoms Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Physical Symptoms</Text>
              <Text style={styles.sectionSubtitle}>Are you experiencing any of these?</Text>

              <View style={styles.symptomsGrid}>
                {PHYSICAL_SYMPTOMS.map((symptom) => {
                  const isSelected = selectedSymptoms.includes(symptom.key);
                  return (
                    <TouchableOpacity
                      key={symptom.key}
                      style={[
                        styles.symptomChip,
                        isSelected && {
                          backgroundColor: `${SEMANTIC.warning.base}15`,
                          borderColor: SEMANTIC.warning.base
                        }
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
            </View>

            {/* Coping Strategies Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What's Helping?</Text>
              <Text style={styles.sectionSubtitle}>Coping strategies you've used</Text>

              <View style={styles.tagsGrid}>
                {COPING_STRATEGIES.map((strategy) => {
                  const isSelected = selectedCoping.includes(strategy.key);
                  return (
                    <TouchableOpacity
                      key={strategy.key}
                      style={[
                        styles.tagChip,
                        isSelected && {
                          backgroundColor: `${SEMANTIC.success.base}15`,
                          borderColor: SEMANTIC.success.base
                        }
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
                placeholder="Anything else on your mind?"
                placeholderTextColor={TEXT.tertiary}
                value={notes}
                onChangeText={(text) => setNotes(text.slice(0, MAX_NOTE_LENGTH))}
                multiline
                numberOfLines={3}
                maxLength={MAX_NOTE_LENGTH}
              />
            </View>

            {/* Encouragement Card */}
            {stressLevel >= 7 && (
              <View style={styles.encouragementCard}>
                <Ionicons name="heart" size={20} color={SEMANTIC.info.base} />
                <Text style={styles.encouragementText}>
                  It's okay to feel stressed. Taking a moment to log this is already a positive step.
                </Text>
              </View>
            )}
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
                isLogging && styles.saveButtonDisabled
              ]}
              onPress={handleSave}
              disabled={isLogging}
            >
              <LinearGradient
                colors={[stressColor, `${stressColor}DD`]}
                style={styles.saveButtonGradient}
              >
                {isLogging ? (
                  <Text style={styles.saveButtonText}>Saving...</Text>
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#FFF" />
                    <Text style={styles.saveButtonText}>
                      {selectedCoping.length > 0 ? 'Save Check-in' : 'Save'}
                    </Text>
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

  // Level Section
  levelDisplay: {
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[4],
  },
  levelCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  levelValue: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  levelLabel: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  levelDescription: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    textAlign: 'center',
  },
  levelSlider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING[2],
    marginBottom: SPACING[2],
  },
  levelDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelDotActive: {
    transform: [{ scale: 1.4 }],
    borderWidth: 2,
    borderColor: '#FFF',
  },
  levelDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
  },
  levelLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[1],
  },
  levelEndLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },

  // Tags Grid
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

  // Symptoms Grid
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  symptomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.md,
    backgroundColor: SURFACES.background.secondary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  symptomLabel: {
    fontSize: TYPOGRAPHY.size.xs,
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

  // Encouragement Card
  encouragementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    backgroundColor: `${SEMANTIC.info.base}10`,
    padding: SPACING[3],
    borderRadius: RADIUS.md,
    marginTop: SPACING[2],
  },
  encouragementText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
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
