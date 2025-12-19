/**
 * LogScreen - Premium Food Logging Experience
 * Sleek, modern, 3D-style UI with Ionicons
 * Clear user flow with explicit actions
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
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

// Hooks
import { useFoodAnalysis } from '../../hooks/useFoodAnalysis';
import { useLiveVoice } from '../../hooks/useLiveVoice';
import { useFoodLog } from '../../hooks/useFoodLog';
import { useNotification } from '../../providers/NotificationProvider';

// Components
import { NutritionCard } from '../../components/log/NutritionCard';
import { FoodItemsList } from '../../components/log/FoodItemsList';
import { MealTotalsCard } from '../../components/log/MealTotalsCard';
import { VoiceModal } from '../../components/log/VoiceModal';
import { HistoryDrawer } from '../../components/log/HistoryDrawer';
import MoodLogger from '../../components/MoodLogger';
import WaterLogger from '../../components/WaterLogger';

export default function LogScreen() {
  // State
  const [selectedImage, setSelectedImage] = useState(null);
  const [analyzedFood, setAnalyzedFood] = useState(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showWaterModal, setShowWaterModal] = useState(false);
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [inputMode, setInputMode] = useState('text'); // 'text', 'photo', 'voice'

  // Hooks
  const foodAnalysis = useFoodAnalysis();
  const voiceHook = useLiveVoice();
  const foodLog = useFoodLog();
  const notify = useNotification();

  /**
   * Handle photo selection
   */
  const handlePhotoSelect = async (source = 'library') => {
    try {
      const { status } = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        notify.error(`Please enable ${source === 'camera' ? 'camera' : 'photo library'} access`);
        return;
      }

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
      notify.error(`Photo error: ${err.message}`);
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
    if (isSavingLog) return;
    setIsSavingLog(true);

    try {
      const clientEventId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const foodDataWithId = {
        ...foodData,
        clientEventId,
        sourceMeta: {
          source: selectedImage ? 'photo' : 'text',
          timestamp: new Date().toISOString(),
        },
      };

      await foodLog.addLog(foodDataWithId);
      notify.success('Food logged successfully!');

      // Clear state
      setAnalyzedFood(null);
      setSelectedImage(null);
    } catch (err) {
      console.error('[LogScreen] Save error:', err);
      notify.error(`Save failed: ${err.message}`);
    } finally {
      setIsSavingLog(false);
    }
  };

  /**
   * Save multi-item meal
   */
  const handleSaveMeal = async () => {
    if (isSavingLog || !foodAnalysis.analysisResult) return;
    setIsSavingLog(true);

    try {
      const mealEventId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      for (const item of foodAnalysis.analysisResult.items) {
        const foodLogData = {
          timestamp: Date.now(),
          status: 'pending',
          source: 'text-multi',
          clientEventId: `${mealEventId}-${item.itemId}`,
          mealId: mealEventId,
          foodName: item.name,
          servingSize: `${item.portion?.amount}${item.portion?.unit}`,
          calories: item.macros?.calories_kcal || 0,
          protein: item.macros?.protein_g || 0,
          carbs: item.macros?.carbs_g || 0,
          fat: item.macros?.fat_g || 0,
          fiber: item.macros?.fiber_g || 0,
          sugar: item.macros?.sugar_g || 0,
          micros: item.micros || {},
          sourceEvidence: item.sourceEvidence,
          confidence: item.sourceEvidence?.[0]?.confidence || 0.5,
        };

        await foodLog.addLog(foodLogData);
      }

      notify.success(`${foodAnalysis.analysisResult.items.length} items logged!`);

      // Clear UI
      foodAnalysis.setInputText('');
      foodAnalysis.setAnalysisResult(null);
    } catch (error) {
      console.error('[LogScreen] Multi-item save error:', error);
      notify.error('Failed to save meal');
    } finally {
      setIsSavingLog(false);
    }
  };

  /**
   * Convert single item to legacy format
   */
  const buildLegacyFoodLog = (item) => {
    if (!item) return null;

    return {
      timestamp: Date.now(),
      status: 'pending',
      source: 'text',
      foodName: item.name,
      servingSize: `${item.portion?.amount}${item.portion?.unit}`,
      calories: item.macros?.calories_kcal || 0,
      protein: item.macros?.protein_g || 0,
      carbs: item.macros?.carbs_g || 0,
      fat: item.macros?.fat_g || 0,
      fiber: item.macros?.fiber_g || 0,
      sugar: item.macros?.sugar_g || 0,
      sugarAlcohols: 0,
      netCarbs: (item.macros?.carbs_g || 0) - (item.macros?.fiber_g || 0),
      micronutrients: item.micros ? Object.entries(item.micros).map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        amount: parseFloat(value) || 0,
        unit: value?.match(/[a-z]+/i)?.[0] || '',
        percentage: 0,
      })) : [],
      micros: item.micros || {},
      ingredients: [],
      healthScore: 70,
      nutriscore: 'B',
      ecoscore: 'B',
      novaScore: 2,
      dietLabels: [],
      allergens: [],
    };
  };

  const handleSaveSingleItem = async (foodLogData) => {
    await handleSaveLog(foodLogData);
    foodAnalysis.setAnalysisResult(null);
  };

  const handleCancel = () => {
    setAnalyzedFood(null);
    setSelectedImage(null);
    foodAnalysis.setAnalysisResult(null);
    foodAnalysis.setInputText('');
  };

  const isAnalyzing = foodAnalysis.isAnalyzing;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Modern Header with Gradient */}
      <LinearGradient
        colors={['#6B4EFF', '#8B6EFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="restaurant" size={28} color="#FFFFFF" />
            <View style={styles.headerText}>
              <Text style={styles.title}>Track Food</Text>
              <Text style={styles.subtitle}>AI-powered nutrition analysis</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => setShowHistory(true)}
          >
            <Ionicons name="time-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Quick Actions Bar */}
        <View style={styles.quickActionsBar}>
          <TouchableOpacity
            style={styles.quickActionChip}
            onPress={() => setShowMoodModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="happy-outline" size={20} color="#6B4EFF" />
            <Text style={styles.quickActionText}>Mood</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionChip}
            onPress={() => setShowWaterModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="water-outline" size={20} color="#6B4EFF" />
            <Text style={styles.quickActionText}>Water</Text>
          </TouchableOpacity>

          <View style={styles.quickActionChip}>
            <Ionicons name="flame-outline" size={20} color="#FF6B4E" />
            <Text style={styles.quickActionValue}>{foodLog.logs?.length || 0}</Text>
            <Text style={styles.quickActionLabel}>logged</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Input Mode Selector - Modern Tab Pills */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeTab, inputMode === 'text' && styles.modeTabActive]}
            onPress={() => setInputMode('text')}
            activeOpacity={0.7}
          >
            {inputMode === 'text' ? (
              <LinearGradient
                colors={['#6B4EFF', '#8B6EFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modeTabGradient}
              >
                <Ionicons name="create" size={22} color="#FFFFFF" />
                <Text style={styles.modeTextActive}>Text</Text>
              </LinearGradient>
            ) : (
              <>
                <Ionicons name="create-outline" size={22} color="#6B7280" />
                <Text style={styles.modeText}>Text</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, inputMode === 'photo' && styles.modeTabActive]}
            onPress={() => setInputMode('photo')}
            activeOpacity={0.7}
          >
            {inputMode === 'photo' ? (
              <LinearGradient
                colors={['#6B4EFF', '#8B6EFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modeTabGradient}
              >
                <Ionicons name="camera" size={22} color="#FFFFFF" />
                <Text style={styles.modeTextActive}>Photo</Text>
              </LinearGradient>
            ) : (
              <>
                <Ionicons name="camera-outline" size={22} color="#6B7280" />
                <Text style={styles.modeText}>Photo</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, inputMode === 'voice' && styles.modeTabActive]}
            onPress={() => setInputMode('voice')}
            activeOpacity={0.7}
          >
            {inputMode === 'voice' ? (
              <LinearGradient
                colors={['#6B4EFF', '#8B6EFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modeTabGradient}
              >
                <Ionicons name="mic" size={22} color="#FFFFFF" />
                <Text style={styles.modeTextActive}>Voice</Text>
              </LinearGradient>
            ) : (
              <>
                <Ionicons name="mic-outline" size={22} color="#6B7280" />
                <Text style={styles.modeText}>Voice</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Text Input Mode */}
        {inputMode === 'text' && (
          <View style={styles.inputSection}>
            <View style={styles.inputCard}>
              <View style={styles.inputHeader}>
                <Ionicons name="text" size={24} color="#6B4EFF" />
                <Text style={styles.inputLabel}>Describe your meal</Text>
              </View>

              <TextInput
                style={styles.textInputLarge}
                placeholder="e.g., 200g grilled chicken, brown rice, steamed broccoli..."
                placeholderTextColor="#9CA3AF"
                value={foodAnalysis.inputText}
                onChangeText={foodAnalysis.setInputText}
                multiline
                numberOfLines={4}
                editable={!isAnalyzing}
                autoFocus={false}
              />

              {/* Auto-Analysis Info */}
              {!foodAnalysis.inputText && !isAnalyzing && (
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={18} color="#6B4EFF" />
                  <Text style={styles.infoText}>
                    Type your food and pause - AI analyzes automatically
                  </Text>
                </View>
              )}

              {/* Example Chips */}
              {!foodAnalysis.inputText && !isAnalyzing && (
                <View style={styles.examplesContainer}>
                  <Text style={styles.examplesTitle}>Quick examples:</Text>
                  <View style={styles.exampleChips}>
                    <TouchableOpacity
                      style={styles.exampleChip}
                      onPress={() => foodAnalysis.setInputText('2 eggs, whole wheat toast, avocado')}
                    >
                      <Ionicons name="egg-outline" size={16} color="#6B4EFF" />
                      <Text style={styles.exampleChipText}>Breakfast</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.exampleChip}
                      onPress={() => foodAnalysis.setInputText('grilled chicken salad')}
                    >
                      <Ionicons name="leaf-outline" size={16} color="#10B981" />
                      <Text style={styles.exampleChipText}>Salad</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.exampleChip}
                      onPress={() => foodAnalysis.setInputText('200g salmon, 150g quinoa, vegetables')}
                    >
                      <Ionicons name="fish-outline" size={16} color="#F59E0B" />
                      <Text style={styles.exampleChipText}>Dinner</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Live Analysis Status */}
              {isAnalyzing && (
                <View style={styles.analysisStatus}>
                  <ActivityIndicator size="small" color="#6B4EFF" />
                  <Text style={styles.analysisStatusText}>
                    Analyzing nutrition... {Math.round(foodAnalysis.progress)}%
                  </Text>
                </View>
              )}

              {/* Clear Button */}
              {foodAnalysis.inputText && !isAnalyzing && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    foodAnalysis.setInputText('');
                    foodAnalysis.setAnalysisResult(null);
                  }}
                >
                  <Ionicons name="close-circle" size={18} color="#DC2626" />
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Photo Input Mode */}
        {inputMode === 'photo' && (
          <View style={styles.inputSection}>
            {selectedImage ? (
              <View style={styles.photoPreviewCard}>
                <Image source={{ uri: selectedImage }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={styles.photoRemoveButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                {isAnalyzing && (
                  <View style={styles.photoAnalyzing}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.photoAnalyzingText}>Analyzing photo...</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.photoEmptyCard}>
                <View style={styles.photoIconContainer}>
                  <Ionicons name="camera" size={64} color="#6B4EFF" />
                </View>
                <Text style={styles.photoEmptyTitle}>Snap or Upload Food Photo</Text>
                <Text style={styles.photoEmptySubtitle}>
                  AI will identify foods and estimate portions instantly
                </Text>

                <View style={styles.photoButtonsRow}>
                  <TouchableOpacity
                    style={styles.photoPrimaryButton}
                    onPress={() => handlePhotoSelect('camera')}
                    disabled={isAnalyzing}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#6B4EFF', '#8B6EFF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.buttonGradient}
                    >
                      <Ionicons name="camera" size={22} color="#FFFFFF" />
                      <Text style={styles.photoButtonText}>Take Photo</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.photoSecondaryButton}
                    onPress={() => handlePhotoSelect('library')}
                    disabled={isAnalyzing}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="images-outline" size={22} color="#6B4EFF" />
                    <Text style={styles.photoSecondaryText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Voice Input Mode */}
        {inputMode === 'voice' && (
          <View style={styles.inputSection}>
            <View style={styles.voiceEmptyCard}>
              <View style={styles.voiceIconContainer}>
                <Ionicons name="mic" size={64} color="#6B4EFF" />
              </View>
              <Text style={styles.voiceEmptyTitle}>Voice Logging</Text>
              <Text style={styles.voiceEmptySubtitle}>
                Speak naturally - we'll transcribe and analyze your meal
              </Text>

              <TouchableOpacity
                style={styles.voicePrimaryButton}
                onPress={() => setShowVoiceModal(true)}
                disabled={isAnalyzing}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#6B4EFF', '#8B6EFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.voiceButtonGradient}
                >
                  <View style={styles.voicePulse}>
                    <Ionicons name="mic" size={28} color="#FFFFFF" />
                  </View>
                  <Text style={styles.voiceButtonText}>Start Recording</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.voiceExamples}>
                <Ionicons name="bulb-outline" size={18} color="#6B7280" />
                <Text style={styles.voiceExamplesTitle}>Try saying:</Text>
              </View>
              <View style={styles.voiceExamplesList}>
                <Text style={styles.voiceExample}>"I had two eggs and whole wheat toast"</Text>
                <Text style={styles.voiceExample}>"200 grams of grilled chicken with rice"</Text>
                <Text style={styles.voiceExample}>"Large coffee with almond milk"</Text>
              </View>
            </View>
          </View>
        )}

        {/* Analysis Results */}
        {analyzedFood ? (
          <View style={styles.resultsContainer}>
            <NutritionCard
              foodLog={analyzedFood}
              onSave={handleSaveLog}
              onCancel={handleCancel}
            />
          </View>
        ) : foodAnalysis.analysisResult?.items && foodAnalysis.analysisResult.items.length > 0 ? (
          <View style={styles.resultsContainer}>
            {foodAnalysis.analysisResult.items.length === 1 ? (
              <NutritionCard
                foodLog={buildLegacyFoodLog(foodAnalysis.analysisResult.items[0])}
                onSave={handleSaveSingleItem}
                onCancel={handleCancel}
              />
            ) : (
              <>
                <FoodItemsList
                  items={foodAnalysis.analysisResult.items}
                  onUpdateQuantity={foodAnalysis.updateItemQuantity}
                  onRemove={foodAnalysis.removeItem}
                />
                <MealTotalsCard
                  totals={foodAnalysis.analysisResult.totals}
                  itemCount={foodAnalysis.analysisResult.items.length}
                  onSave={handleSaveMeal}
                />
              </>
            )}
          </View>
        ) : null}

        {/* Error Display */}
        {foodAnalysis.error && (
          <View style={styles.errorCard}>
            <View style={styles.errorHeader}>
              <Ionicons name="warning" size={28} color="#DC2626" />
              <Text style={styles.errorTitle}>Analysis Failed</Text>
            </View>
            <Text style={styles.errorMessage}>{foodAnalysis.error}</Text>
            <TouchableOpacity
              style={styles.errorDismiss}
              onPress={foodAnalysis.clearError}
            >
              <Text style={styles.errorDismissText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sync Status Footer */}
        {foodLog.pendingSyncCount > 0 && (
          <View style={styles.syncCard}>
            <View style={styles.syncIconWrapper}>
              <Ionicons name="cloud-upload-outline" size={24} color="#6B4EFF" />
            </View>
            <View style={styles.syncContent}>
              <Text style={styles.syncTitle}>
                {foodLog.isSyncing ? 'Syncing...' : 'Pending Sync'}
              </Text>
              <Text style={styles.syncSubtitle}>
                {foodLog.pendingSyncCount} items waiting
              </Text>
            </View>
            {!foodLog.isSyncing && (
              <TouchableOpacity
                style={styles.syncRetry}
                onPress={foodLog.retryFailedSyncs}
              >
                <Ionicons name="refresh" size={18} color="#FFFFFF" />
                <Text style={styles.syncRetryText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <VoiceModal
        visible={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onComplete={handleVoiceComplete}
        voiceHook={voiceHook}
      />

      <HistoryDrawer
        visible={showHistory}
        onClose={() => setShowHistory(false)}
        logs={foodLog.logs}
        onSelectLog={(log) => {
          setAnalyzedFood(log);
          setShowHistory(false);
        }}
      />

      <MoodLogger
        visible={showMoodModal}
        onClose={() => setShowMoodModal(false)}
        onSuccess={() => notify.success('Mood logged!')}
      />

      <WaterLogger
        visible={showWaterModal}
        onClose={() => setShowWaterModal(false)}
        onSuccess={() => notify.success('Water logged!')}
      />
    </KeyboardAvoidingView>
  );
}

/* Premium Modern Styles - 3D Icons & Gradients */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  /* Header with Gradient */
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    gap: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  historyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Quick Actions Bar */
  quickActionsBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
  },
  quickActionChip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  quickActionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B4E',
  },
  quickActionLabel: {
    fontSize: 11,
    color: '#6B7280',
  },

  /* Scroll View */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  /* Mode Selector - Modern Pills */
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 6,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  modeTab: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  modeTabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  modeTabActive: {
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    paddingVertical: 14,
  },
  modeTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Input Section */
  inputSection: {
    marginBottom: 20,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  textInputLarge: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 18,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 140,
    textAlignVertical: 'top',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    fontWeight: '500',
  },

  /* Info Box */
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EEF2FF',
    padding: 14,
    borderRadius: 12,
    marginTop: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#6B4EFF',
    fontWeight: '500',
  },

  /* Examples */
  examplesContainer: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  exampleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  exampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  exampleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B4EFF',
  },

  /* Analysis Status */
  analysisStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  analysisStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B4EFF',
  },

  /* Clear Button */
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },

  /* Photo Mode */
  photoPreviewCard: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  photoPreview: {
    width: '100%',
    height: 350,
    backgroundColor: '#E5E7EB',
  },
  photoRemoveButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoAnalyzing: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(107, 78, 255, 0.95)',
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
  },
  photoAnalyzingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  photoEmptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  photoIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  photoEmptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
  },
  photoEmptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  photoPrimaryButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
  },
  photoSecondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  photoButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  photoSecondaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B4EFF',
  },

  /* Voice Mode */
  voiceEmptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  voiceIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  voiceEmptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
  },
  voiceEmptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  voicePrimaryButton: {
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 32,
  },
  voiceButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
    gap: 14,
  },
  voicePulse: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  voiceExamples: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  voiceExamplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  voiceExamplesList: {
    gap: 8,
  },
  voiceExample: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
  },

  /* Results Container */
  resultsContainer: {
    marginTop: 0,
  },

  /* Error Card */
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 18,
    padding: 22,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
  },
  errorMessage: {
    fontSize: 14,
    color: '#DC2626',
    marginBottom: 14,
    lineHeight: 21,
  },
  errorDismiss: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FCA5A5',
  },
  errorDismissText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },

  /* Sync Card */
  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 18,
    marginTop: 20,
    gap: 14,
  },
  syncIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncContent: {
    flex: 1,
  },
  syncTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4F46E5',
  },
  syncSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  syncRetry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: '#6B4EFF',
    borderRadius: 12,
  },
  syncRetryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
