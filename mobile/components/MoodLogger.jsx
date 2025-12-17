/**
 * MoodLogger Modal
 * Beautiful, animated modal for logging mood with optional notes
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
} from 'react-native';
import { useMoodLog, MOOD_TYPES } from '../hooks/useMoodLog';

/**
 * Animated mood button component
 */
const MoodButton = ({ mood, isSelected, onSelect }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    // Satisfying pop animation with spring overshoot
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.15,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1.0,
        tension: 300,
        friction: 15,
        useNativeDriver: true,
      }),
    ]).start();

    onSelect(mood.key);
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.moodButton,
          isSelected && { ...styles.moodButtonSelected, borderColor: mood.color },
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={styles.moodEmoji}>{mood.emoji}</Text>
        <Text
          style={[
            styles.moodLabel,
            isSelected && { color: mood.color, fontWeight: '700' },
          ]}
        >
          {mood.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * Main MoodLogger Modal Component
 */
export default function MoodLogger({ visible, onClose, onSuccess }) {
  const { logMood, isLogging, moodTypes } = useMoodLog();
  const [selectedMood, setSelectedMood] = useState(null);
  const [note, setNote] = useState('');

  // Animations
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Staged entrance: backdrop/modal first, then content
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
      ]).start(() => {
        // Fade in content after modal appears
        Animated.timing(contentFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    } else {
      // Reset animations
      slideAnim.setValue(300);
      fadeAnim.setValue(0);
      contentFadeAnim.setValue(0);
      setSelectedMood(null);
      setNote('');
    }
  }, [visible]);

  // Pulse save button when mood selected
  useEffect(() => {
    if (selectedMood) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [selectedMood]);

  const handleSave = async () => {
    if (!selectedMood) return;

    try {
      await logMood(selectedMood, note);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to save mood:', err);
    }
  };

  const selectedMoodMeta = moodTypes.find(m => m.key === selectedMood);

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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>How are you feeling?</Text>
            <Text style={styles.headerSubtitle}>Select your current mood</Text>
          </View>

          {/* Staged content fade-in */}
          <Animated.View style={{ opacity: contentFadeAnim }}>
            {/* Mood Grid */}
            <View style={styles.moodGrid}>
              {moodTypes.map((mood) => (
                <MoodButton
                  key={mood.key}
                  mood={mood}
                  isSelected={selectedMood === mood.key}
                  onSelect={setSelectedMood}
                />
              ))}
            </View>

            {/* Note Input - Always Visible */}
            <View style={styles.noteContainer}>
            <View style={styles.noteLabelContainer}>
              <Text
                style={[
                  styles.noteLabel,
                  selectedMood && selectedMoodMeta && { color: selectedMoodMeta.color },
                ]}
              >
                {selectedMood ? `${selectedMoodMeta?.emoji} Add a note (optional)` : '📝 Select a mood above to continue'}
              </Text>
            </View>
            <TextInput
              style={[
                styles.noteInput,
                !selectedMood && styles.noteInputDisabled,
                selectedMood && selectedMoodMeta && { borderColor: selectedMoodMeta.color, borderWidth: 2 },
              ]}
              placeholder={selectedMood ? "What's on your mind?" : "Select a mood first..."}
              placeholderTextColor={selectedMood ? "#9ca3af" : "#d1d5db"}
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={200}
              editable={!!selectedMood}
            />
            <Text style={styles.charCount}>{note.length}/200</Text>
          </View>
          </Animated.View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isLogging}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            {/* Pulsing save button when ready */}
            <Animated.View style={{ flex: 1, transform: [{ scale: selectedMood ? pulseAnim : 1 }] }}>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  selectedMood && selectedMoodMeta && { backgroundColor: selectedMoodMeta.color },
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
                    {selectedMood ? `Save ${selectedMoodMeta.emoji}` : 'Select a mood'}
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>
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
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  moodButton: {
    width: '23%',
    aspectRatio: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    padding: 8,
  },
  moodButtonSelected: {
    backgroundColor: '#fef3c7',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  noteContainer: {
    marginBottom: 20,
  },
  noteLabelContainer: {
    marginBottom: 8,
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  noteInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#1f2937',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  noteInputDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
    opacity: 0.6,
  },
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saveButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
