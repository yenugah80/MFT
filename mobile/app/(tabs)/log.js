/**
 * LogScreen - Multimodal Food Logging
 * Production-ready upgrade with text, photo, and voice logging
 * Integrated with backend, local persistence, and Dashboard compatibility
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// Hooks
import { useFoodAnalysis } from '../../hooks/useFoodAnalysis';
import { useLiveVoice } from '../../hooks/useLiveVoice';
import { useFoodLog } from '../../hooks/useFoodLog';

// Components
import { NutritionCard } from '../../components/log/NutritionCard';
import { VoiceModal } from '../../components/log/VoiceModal';
import { HistoryDrawer } from '../../components/log/HistoryDrawer';
import MoodLogger from '../../components/MoodLogger';
import WaterLogger from '../../components/WaterLogger';

export default function LogScreen() {
  // State
  const [textInput, setTextInput] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [analyzedFood, setAnalyzedFood] = useState(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showWaterModal, setShowWaterModal] = useState(false);

  // Hooks
  const foodAnalysis = useFoodAnalysis();
  const voiceHook = useLiveVoice();
  const foodLog = useFoodLog();

  /**
   * Handle text logging
   */
  const handleTextLog = async () => {
    if (!textInput.trim()) {
      Alert.alert('Input Required', 'Please describe your meal');
      return;
    }

    try {
      const result = await foodAnalysis.analyzeText(textInput);
      setAnalyzedFood(result);
      setTextInput(''); // Clear input
    } catch (err) {
      Alert.alert('Analysis Failed', err.message);
    }
  };

  /**
   * Handle photo selection
   */
  const handlePhotoSelect = async (source = 'library') => {
    try {
      // Request permissions
      const { status } = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          `Please enable ${source === 'camera' ? 'camera' : 'photo library'} access`
        );
        return;
      }

      // Launch picker
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            quality: 0.8,
            allowsEditing: true,
            aspect: [4, 3],
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
            aspect: [4, 3],
          });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);

        // Analyze image
        const analyzed = await foodAnalysis.analyzePhoto(imageUri);
        setAnalyzedFood(analyzed);
      }
    } catch (err) {
      console.error('[LogScreen] Photo error:', err);
      Alert.alert('Photo Error', err.message);
    }
  };

  /**
   * Handle voice logging complete
   */
  const handleVoiceComplete = (result) => {
    setAnalyzedFood(result);
    setShowVoiceModal(false);
  };

  /**
   * Save analyzed food to log
   */
  const handleSaveLog = async (foodData) => {
    try {
      await foodLog.addLog(foodData);

      Alert.alert('Success', 'Food log saved successfully!');

      // Clear state
      setAnalyzedFood(null);
      setSelectedImage(null);
    } catch (err) {
      Alert.alert('Save Failed', err.message);
    }
  };

  /**
   * Cancel current analysis
   */
  const handleCancel = () => {
    setAnalyzedFood(null);
    setSelectedImage(null);
  };

  const isAnalyzing = foodAnalysis.isAnalyzing;

  return (
    <View style={styles.container}>
      {/* Header with history button */}
      <View style={styles.header}>
        <Text style={styles.title}>Log Your Meal</Text>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => setShowHistory(true)}
        >
          <Text style={styles.historyButtonIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions for Mood & Water */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => setShowMoodModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.quickActionIcon}>😊</Text>
          <Text style={styles.quickActionLabel}>Log Mood</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => setShowWaterModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.quickActionIcon}>💧</Text>
          <Text style={styles.quickActionLabel}>Log Water</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Show analyzed food card */}
        {analyzedFood ? (
          <NutritionCard
            foodLog={analyzedFood}
            onSave={handleSaveLog}
            onCancel={handleCancel}
          />
        ) : (
          <>
            {/* Text Logging */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Text Logging</Text>
              <View style={styles.textInputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Describe your meal (e.g., grilled chicken salad)"
                  value={textInput}
                  onChangeText={setTextInput}
                  multiline
                  numberOfLines={3}
                  editable={!isAnalyzing}
                />
                <TouchableOpacity
                  style={[styles.analyzeButton, isAnalyzing && styles.analyzeButtonDisabled]}
                  onPress={handleTextLog}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.analyzeButtonText}>Analyze</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Photo Logging */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Photo Logging</Text>

              {selectedImage && !analyzedFood && (
                <View style={styles.imagePreview}>
                  <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setSelectedImage(null)}
                  >
                    <Text style={styles.removeImageButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.photoButtons}>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => handlePhotoSelect('camera')}
                  disabled={isAnalyzing}
                >
                  <Text style={styles.photoButtonIcon}>📷</Text>
                  <Text style={styles.photoButtonText}>Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => handlePhotoSelect('library')}
                  disabled={isAnalyzing}
                >
                  <Text style={styles.photoButtonIcon}>🖼️</Text>
                  <Text style={styles.photoButtonText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Voice Logging */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Voice Logging</Text>
              <TouchableOpacity
                style={styles.voiceButton}
                onPress={() => setShowVoiceModal(true)}
                disabled={isAnalyzing}
              >
                <Text style={styles.voiceButtonIcon}>🎤</Text>
                <Text style={styles.voiceButtonText}>Start Voice Logging</Text>
              </TouchableOpacity>
            </View>

            {/* Loading indicator */}
            {isAnalyzing && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6B4EFF" />
                <Text style={styles.loadingText}>
                  Analyzing... {Math.round(foodAnalysis.progress)}%
                </Text>
              </View>
            )}

            {/* Error display */}
            {foodAnalysis.error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{foodAnalysis.error}</Text>
                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={foodAnalysis.clearError}
                >
                  <Text style={styles.dismissButtonText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Sync status */}
            {foodLog.pendingSyncCount > 0 && (
              <View style={styles.syncStatus}>
                <Text style={styles.syncStatusText}>
                  {foodLog.isSyncing
                    ? 'Syncing...'
                    : `${foodLog.pendingSyncCount} items pending sync`}
                </Text>
                {!foodLog.isSyncing && (
                  <TouchableOpacity onPress={foodLog.retryFailedSyncs}>
                    <Text style={styles.retryText}>Retry</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Voice Modal */}
      <VoiceModal
        visible={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onComplete={handleVoiceComplete}
        voiceHook={voiceHook}
      />

      {/* History Drawer */}
      <HistoryDrawer
        visible={showHistory}
        onClose={() => setShowHistory(false)}
        logs={foodLog.logs}
        onSelectLog={(log) => {
          setAnalyzedFood(log);
          setShowHistory(false);
        }}
      />

      {/* Mood Logger */}
      <MoodLogger
        visible={showMoodModal}
        onClose={() => setShowMoodModal(false)}
        onSuccess={() => {
          Alert.alert('Success', 'Mood logged successfully! 😊');
        }}
      />

      {/* Water Logger */}
      <WaterLogger
        visible={showWaterModal}
        onClose={() => setShowWaterModal(false)}
        onSuccess={() => {
          Alert.alert('Success', 'Water intake logged! 💧');
        }}
      />
    </View>
  );
}

/* Styles */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyButtonIcon: {
    fontSize: 20,
    color: '#374151',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickActionIcon: {
    fontSize: 24,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  textInputContainer: {
    gap: 12,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  analyzeButton: {
    backgroundColor: '#6B4EFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  analyzeButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreview: {
    position: 'relative',
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  photoButtonIcon: {
    fontSize: 32,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  voiceButton: {
    backgroundColor: '#6B4EFF',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  voiceButtonIcon: {
    fontSize: 24,
  },
  voiceButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
  },
  dismissButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  dismissButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  syncStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
  },
  syncStatusText: {
    fontSize: 14,
    color: '#1E40AF',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
});
