/**
 * LogScreen - Premium Food Logging Experience
 * Sleek, modern, 3D-style UI with Ionicons
 * Clear user flow with explicit actions
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  Modal,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';

// Hooks
import { useFoodAnalysis } from '../../hooks/useFoodAnalysis';
import { useLiveVoice } from '../../hooks/useLiveVoice';
import { useFoodLog } from '../../hooks/useFoodLog';
import { useDashboard } from '../../hooks/useDashboard';
import { useNotification } from '../../providers/NotificationProvider';
import { useWaterLog } from '../../hooks/useWaterLog';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';

// Components
import { NutritionCard } from '../../components/log/NutritionCard';
import { FoodItemsList } from '../../components/log/FoodItemsList';
import BarcodeScannerModal from '../../components/BarcodeScannerModal';
import CameraModal from '../../components/log/CameraModal';
import { MealTotalsCard } from '../../components/log/MealTotalsCard';
import { VoiceModal } from '../../components/log/VoiceModal';
import MoodLogger from '../../components/MoodLogger';
import MealLoggedCard from '../../components/log/MealLoggedCard';
import HydrationTracker from '../../components/HydrationTracker';

// Platform-safe professional fonts for nutrition UI
const fonts = {
  display: Platform.select({ ios: 'HelveticaNeue-Bold', android: 'Roboto-Bold', default: 'System' }),
  strong: Platform.select({ ios: 'HelveticaNeue-Medium', android: 'Roboto-Medium', default: 'System' }),
  regular: Platform.select({ ios: 'Helvetica Neue', android: 'Roboto', default: 'System' }),
};

// Daily nutrition values for percentage calculations
const DAILY_VALUES = {
  calories: 2000,
  protein: 50,
  carbs: 275,
  fat: 78,
  fiber: 28,
  sugar: 50,
  sodium: 2300,
  calcium: 1000,
  iron: 18,
  vitaminA: 900,
  vitaminC: 90,
  vitaminD: 20,
  potassium: 3500,
};

export default function LogScreen() {
  // State
  const [selectedImage, setSelectedImage] = useState(null);
  const [analyzedFood, setAnalyzedFood] = useState(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [showBarcodeScannerModal, setShowBarcodeScannerModal] = useState(false);
  const [inputMode, setInputMode] = useState('text'); // 'text', 'photo', 'voice'
  const [analysisSource, setAnalysisSource] = useState('text');
  const [isTextFocused, setIsTextFocused] = useState(false);
  const [showMealLogged, setShowMealLogged] = useState(false);
  const [loggedMeal, setLoggedMeal] = useState(null);
  const [showHydrationModal, setShowHydrationModal] = useState(false);

  // Hooks
  const foodAnalysis = useFoodAnalysis();
  const voiceHook = useLiveVoice();
  const foodLog = useFoodLog();
  const { data: dashboardData } = useDashboard();
  const notify = useNotification();
  const router = useRouter();
  const { focus, mealType } = useLocalSearchParams();
  const { logWater, removeWater } = useWaterLog();

  // Fetch water data
  const { data: waterTodayData } = useQuery({
    queryKey: ['waterToday'],
    queryFn: async () => {
      const response = await apiClient.get('/water/today');
      return response || { logs: [], totalLiters: 0, count: 0 };
    },
    staleTime: 30000,
  });

  const closeAllModals = useCallback(() => {
    setShowMoodModal(false);
    setShowHydrationModal(false);
    setShowVoiceModal(false);
    setShowCameraModal(false);
    setShowBarcodeScannerModal(false);
    setShowMealLogged(false);
  }, []);

  useEffect(() => {
    if (!focus) return;

    switch (focus) {
      case 'mood':
        closeAllModals();
        setShowMoodModal(true);
        break;
      case 'water':
        closeAllModals();
        setShowHydrationModal(true);
        break;
      case 'hydration':
        closeAllModals();
        setShowHydrationModal(true);
        break;
      case 'meal':
        closeAllModals();
        setInputMode('text');
        setAnalysisSource('text');
        if (mealType) {
          notify.info(`Ready to log ${mealType}.`);
        }
        break;
      default:
        break;
    }

    router.setParams({ focus: undefined, mealType: undefined });
  }, [focus, mealType, notify, router, closeAllModals]);

  /**
   * Handle photo from CameraModal
   */
  const handlePhotoFromCamera = async (imageUri) => {
    setSelectedImage(imageUri);
    setAnalysisSource('photo');

    try {
      const analyzed = await foodAnalysis.analyzePhoto(imageUri);
      setAnalyzedFood(analyzed);
    } catch (error) {
      console.error('[LogScreen] Photo analysis failed:', error);
      notify.error('Photo analysis failed. Please try again.');
    }
  };

  /**
   * Handle photo selection from library
   */
  const handlePhotoFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        notify.error('Please enable photo library access');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        setAnalysisSource('photo');

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
    setAnalysisSource('voice');
    setAnalyzedFood(result);
    setShowVoiceModal(false);
  };

  /**
   * Handle sharing of analysis results
   */
  const handleShare = async () => {
    if (!foodAnalysis.analysisResult) {
      notify.info('No analysis results to share.');
      return;
    }

    const { items, totals } = foodAnalysis.analysisResult;
    let shareText = `My Meal Analysis from MyFoodTracker:\n\n`;

    if (items.length === 1) {
      const item = items[0];
      shareText += `Food: ${item.name}\n`;
      shareText += `Portion: ${item.portion?.servingText || `${item.portion?.amount || 1} ${item.portion?.unit || 'serving'}`}\n`;
    } else {
      shareText += `Meal with ${items.length} items:\n`;
      items.forEach((item, index) => {
        shareText += `  ${index + 1}. ${item.name} (${item.portion?.servingText || `${item.portion?.amount || 1} ${item.portion?.unit || 'serving'}`})\n`;
      });
    }

    shareText += `\n--- Totals ---\n`;
    shareText += `Calories: ${totals.macros?.calories_kcal?.toFixed(0) || 0}kcal\n`;
    shareText += `Protein: ${totals.macros?.protein_g?.toFixed(1) || 0}g\n`;
    shareText += `Carbs: ${totals.macros?.carbs_g?.toFixed(1) || 0}g\n`;
    shareText += `Fat: ${totals.macros?.fat_g?.toFixed(1) || 0}g\n`;
    shareText += `Fiber: ${totals.macros?.fiber_g?.toFixed(1) || 0}g\n`;
    shareText += `Sugar: ${totals.macros?.sugar_g?.toFixed(1) || 0}g\n`;
    shareText += `Net Carbs: ${totals.netCarbs?.toFixed(1) || 0}g\n`;

    // Add micronutrients to share text
    if (Object.keys(totals.micros).length > 0) {
      shareText += `\n--- Micronutrients ---\n`;
      Object.entries(totals.micros).forEach(([key, micro]) => {
        const val = micro.value ? micro.value.toFixed(1) : '0';
        const unit = micro.unit || '';
        shareText += `${key.charAt(0).toUpperCase() + key.slice(1)}: ${val}${unit}\n`;
      });
    }

    try {
      await Share.share({
        message: shareText,
        title: 'Share Meal Analysis'
      });
    } catch (error) {
      console.error('Share failed:', error);
      notify.error('Failed to share meal analysis');
    }
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
        source: foodData.source || analysisSource,
        clientEventId,
        sourceMeta: {
          source: analysisSource,
          timestamp: new Date().toISOString(),
        },
      };

      await foodLog.addLog(foodDataWithId);

      // Show MealLoggedCard instead of just notification
      setLoggedMeal(foodDataWithId);
      setShowMealLogged(true);

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
      const baseTimestamp = Date.now();
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;

      for (const [index, item] of foodAnalysis.analysisResult.items.entries()) {
        const servingText = item.portion?.amount && item.portion?.unit
          ? `${item.portion.amount}${item.portion.unit}`
          : '1 serving';

        const foodLogData = {
          id: `${mealEventId}-${index}`,
          timestamp: baseTimestamp + index, // deterministic per item to avoid collisions
          status: 'pending',
          source: 'text',
          sourceMeta: {
            source: 'text',
            type: 'multi',
            timestamp: new Date().toISOString(),
          },
          clientEventId: `${mealEventId}-${item.itemId}`,
          mealId: mealEventId,
          foodName: item.name,
          servingSize: servingText,
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

        totalCalories += foodLogData.calories || 0;
        totalProtein += foodLogData.protein || 0;
        totalCarbs += foodLogData.carbs || 0;
        totalFat += foodLogData.fat || 0;

        await foodLog.addLog(foodLogData);
      }

      notify.success(`${foodAnalysis.analysisResult.items.length} items logged!`);
      setLoggedMeal({
        foodName: `Meal (${foodAnalysis.analysisResult.items.length} items)`,
        calories: totalCalories,
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFat,
      });
      setShowMealLogged(true);

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
      source: analysisSource || 'text',
      foodName: item.name,
      servingSize: item.portion?.amount && item.portion?.unit
        ? `${item.portion.amount}${item.portion.unit}`
        : null,
      calories: item.macros?.calories_kcal ?? null,
      protein: item.macros?.protein_g ?? null,
      carbs: item.macros?.carbs_g ?? null,
      fat: item.macros?.fat_g ?? null,
      fiber: item.macros?.fiber_g ?? null,
      sugar: item.macros?.sugar_g ?? null,
      sugarAlcohols: item.macros?.sugarAlcohols_g ?? null,
      netCarbs: item.netCarbs ?? null,
      micronutrients: item.micros ? Object.entries(item.micros).map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1), // e.g., "calcium" -> "Calcium"
        amount: value.value || 0,
        unit: value.unit || '',
        percentage: 0, // This will be calculated in NutritionCard/FoodItemsList
      })) : [],
      micros: item.micros || {},
      ingredients: item.ingredients || [],
      healthScore: item.healthScore ?? null,
      nutriscore: item.nutriscore ?? null,
      ecoscore: item.ecoscore ?? null,
      novaScore: item.novaScore ?? null,
      dietLabels: item.dietLabels || [],
      allergens: item.allergens || [],
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
    setAnalysisSource('text');
  };

  /**
   * Handle water logging from HydrationTracker
   */
  const handleLogWater = async (entry) => {
    try {
      const amountLiters = entry.effectiveAmount / 1000; // Convert ml to liters
      await logWater(amountLiters, entry.type);
      notify.success(`Logged ${entry.amount}ml of ${entry.type}`);
    } catch (error) {
      console.error('[LogScreen] Failed to log water:', error);
      notify.error('Failed to log water');
    }
  };

  /**
   * Handle water entry removal from HydrationTracker
   */
  const handleRemoveWater = async (entryId, amountLiters, hydrationLiters) => {
    try {
      await removeWater(entryId, amountLiters, hydrationLiters);
      notify.success('Water entry removed');
    } catch (error) {
      console.error('[LogScreen] Failed to remove water:', error);
      notify.error('Failed to remove water entry');
    }
  };

  /**
   * Transform water logs to beverage history format for HydrationTracker
   */
  const beverageHistory = useMemo(() => {
    if (!waterTodayData?.logs) return [];

    const entries = waterTodayData.logs.map(log => {
      const rawLiters = parseFloat(log.amountLiters || 0);
      const hydrationLiters = parseFloat(log.hydrationLiters || log.amountLiters || 0);
      return {
        id: Number(log.id),
        amount: Math.round(rawLiters * 1000), // Convert to ml
        type: log.beverageType || 'water',
        timestamp: new Date(log.loggedDate).getTime(),
        amountLiters: rawLiters,
        hydrationLiters,
      };
    });

    return entries
      .filter(entry => Number.isFinite(entry.id))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [waterTodayData]);

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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace('/')}
              accessibilityLabel="Go to Recipes tab"
            >
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Ionicons name="restaurant" size={28} color="#FFFFFF" />
            <View style={styles.headerText}>
              <Text style={styles.title}>LOG Meal</Text>
              <Text style={styles.subtitle}>At your convenient way</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => router.push({ pathname: '/history', params: { from: 'log' } })}
            accessibilityLabel="Open food history"
          >
            <Ionicons name="time-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Quick Actions Bar */}
        <View style={styles.quickActionsBar}>
          <TouchableOpacity
            style={styles.quickActionChip}
            onPress={() => {
              closeAllModals();
              setShowMoodModal(true);
            }}
            activeOpacity={0.7}
            accessibilityLabel="Log your mood"
          >
            <Ionicons name="happy-outline" size={20} color="#6B4EFF" />
            <Text style={styles.quickActionText}>Mood</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionChip}
            onPress={() => {
              closeAllModals();
              setShowHydrationModal(true);
            }}
            activeOpacity={0.7}
            accessibilityLabel="Log your water intake"
          >
            <Ionicons name="water-outline" size={20} color="#6B4EFF" />
            <Text style={styles.quickActionText}>Water</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionChip}
            onPress={() => router.push({ pathname: '/history', params: { from: 'log' } })}
            activeOpacity={0.7}
            accessibilityLabel="Open logged meals history"
          >
            <Ionicons name="flame-outline" size={20} color="#FF6B4E" />
            <Text style={styles.quickActionValue}>{foodLog.logs?.length || 0}</Text>
            <Text style={styles.quickActionLabel}>logged</Text>
          </TouchableOpacity>
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
            style={[
              styles.modeTab,
              inputMode === 'text' ? styles.modeTabActive : styles.modeTabInactive,
            ]}
            onPress={() => {
              setInputMode('text');
              setAnalysisSource('text');
            }}
            activeOpacity={0.7}
            accessibilityLabel="Text input mode"
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
              <View style={styles.modeTabGradient}>
                <Ionicons name="create-outline" size={22} color="#6B7280" />
                <Text style={styles.modeText}>Text</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeTab,
              inputMode === 'photo' ? styles.modeTabActive : styles.modeTabInactive,
            ]}
            onPress={() => {
              setInputMode('photo');
              setAnalysisSource('photo');
            }}
            activeOpacity={0.7}
            accessibilityLabel="Photo input mode"
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
              <View style={styles.modeTabGradient}>
                <Ionicons name="camera-outline" size={22} color="#6B7280" />
                <Text style={styles.modeText}>Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeTab,
              inputMode === 'voice' ? styles.modeTabActive : styles.modeTabInactive,
            ]}
            onPress={() => {
              setInputMode('voice');
              setAnalysisSource('voice');
            }}
            activeOpacity={0.7}
            accessibilityLabel="Voice input mode"
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
              <View style={styles.modeTabGradient}>
                <Ionicons name="mic-outline" size={22} color="#6B7280" />
                <Text style={styles.modeText}>Voice</Text>
              </View>
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
                style={[styles.textInputLarge, isTextFocused && styles.textInputFocused]}
                placeholder="Describe your meal — anything you savored"
                placeholderTextColor="#6B7280"
                value={foodAnalysis.inputText}
                onChangeText={foodAnalysis.setInputText}
                multiline
                numberOfLines={4}
                editable={!isAnalyzing}
                autoFocus={false}
                onFocus={() => setIsTextFocused(true)}
                onBlur={() => setIsTextFocused(false)}
                accessibilityLabel="Describe your meal"
              />

              {/* Auto-Analysis Info */}
              {!foodAnalysis.inputText && !isAnalyzing && (
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={20} color="#6B4EFF" />
                  <Text style={styles.infoText}>
                    Type your food and pause - AI analyzes automatically
                  </Text>
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
                  accessibilityLabel="Clear meal description"
                >
                  <Ionicons name="close-circle" size={18} color="#DC2626" />
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              )}

              {/* Manual Analyze / Retry */}
              <TouchableOpacity
                style={[
                  styles.analyzeButton,
                  isAnalyzing && styles.analyzeButtonDisabled,
                ]}
                onPress={foodAnalysis.runAnalysis}
                disabled={isAnalyzing}
                accessibilityLabel={isAnalyzing ? 'Analyzing meal' : 'Analyze meal'}
              >
                <LinearGradient
                  colors={['#6B4EFF', '#8B6EFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.analyzeGradient}
                >
                  {isAnalyzing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
                  )}
                  <Text style={styles.analyzeText}>
                    {isAnalyzing ? 'Analyzing...' : 'Analyze / Retry'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
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
                  onPress={() => {
                    setSelectedImage(null);
                    setAnalyzedFood(null);
                    setAnalysisSource('text');
                  }}
                  accessibilityLabel="Remove selected photo"
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
                <Text style={styles.photoEmptyTitle}>Camera-first logging</Text>
                <Text style={styles.photoEmptySubtitle}>
                  Snap fresh meals, scan packaged foods, or pull from your gallery.
                </Text>

                <View style={styles.photoActions}>
                  <TouchableOpacity
                    style={styles.photoPrimaryCard}
                    onPress={() => setShowCameraModal(true)}
                    disabled={isAnalyzing}
                    activeOpacity={0.9}
                    accessibilityLabel="Take a new meal photo"
                  >
                    <LinearGradient
                      colors={['#6B4EFF', '#8B6EFF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.photoPrimaryGradient}
                    >
                      <Ionicons name="camera" size={24} color="#FFFFFF" />
                      <View style={styles.photoPrimaryCopy}>
                        <Text style={styles.photoButtonText}>Take Photo</Text>
                        <Text style={styles.photoButtonSub}>Best for cooked meals</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={styles.photoSecondaryStack}>
                    <TouchableOpacity
                      style={styles.photoSecondaryCard}
                      onPress={() => setShowBarcodeScannerModal(true)}
                      disabled={isAnalyzing}
                      activeOpacity={0.85}
                      accessibilityLabel="Scan a product barcode"
                    >
                      <Ionicons name="barcode-outline" size={22} color="#6B4EFF" />
                      <View>
                        <Text style={styles.photoSecondaryText}>Scan Barcode</Text>
                        <Text style={styles.photoSecondarySub}>Packaged foods</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.photoSecondaryCard}
                      onPress={handlePhotoFromLibrary}
                      disabled={isAnalyzing}
                      activeOpacity={0.85}
                      accessibilityLabel="Choose a meal photo from gallery"
                    >
                      <Ionicons name="images-outline" size={22} color="#6B4EFF" />
                      <View>
                        <Text style={styles.photoSecondaryText}>Choose from Gallery</Text>
                        <Text style={styles.photoSecondarySub}>Use an existing shot</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
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
                Speak naturally - we&apos;ll transcribe and analyze your meal
              </Text>

              <TouchableOpacity
                style={styles.voicePrimaryButton}
                onPress={() => setShowVoiceModal(true)}
                disabled={isAnalyzing}
                activeOpacity={0.8}
                accessibilityLabel="Start voice meal logging"
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
                <Text style={styles.voiceExample}>&quot;I had two eggs and whole wheat toast&quot;</Text>
                <Text style={styles.voiceExample}>&quot;200 grams of grilled chicken with rice&quot;</Text>
                <Text style={styles.voiceExample}>&quot;Large coffee with almond milk&quot;</Text>
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
              dailyValues={DAILY_VALUES} // Pass daily values
              onCancel={handleCancel}
            />
          </View>
        ) : foodAnalysis.analysisResult?.items && foodAnalysis.analysisResult.items.length > 0 ? (
          <View style={styles.resultsContainer}>
            {foodAnalysis.analysisResult.items.length === 1 ? (
              <NutritionCard
                foodLog={buildLegacyFoodLog(foodAnalysis.analysisResult.items[0])}
                dailyValues={DAILY_VALUES} // Pass daily values
                onSave={handleSaveSingleItem}
                onCancel={handleCancel}
              />
            ) : (
              <>
                <FoodItemsList
                  items={foodAnalysis.analysisResult.items}
                  onUpdateQuantity={foodAnalysis.updateItemQuantity}
                  onRemove={foodAnalysis.removeItem}
                  dailyValues={DAILY_VALUES} // Pass daily values to FoodItemsList
                />
                <MealTotalsCard
                  totals={foodAnalysis.analysisResult.totals}
                  itemCount={foodAnalysis.analysisResult.items.length}
                  onSave={handleSaveMeal}
                />
              </>
            )}

            {/* Share Button for Analysis Results */}
            {foodAnalysis.analysisResult && (
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShare}
                activeOpacity={0.8}
                accessibilityLabel="Share meal analysis results"
              >
                <Ionicons name="share-social-outline" size={24} color="#FFFFFF" />
                <Text style={styles.shareButtonText}>Share Results</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}


        {/* Error Display */}
        {(foodAnalysis.error || foodLog.error) && (
          <View style={styles.errorCard}>
            <View style={styles.errorHeader}>
              <Ionicons name="warning" size={28} color="#DC2626" />
              <Text style={styles.errorTitle}>
                {foodAnalysis.error ? 'Analysis Failed' : 'History Error'}
              </Text>
            </View>
            <Text style={styles.errorMessage}>{foodAnalysis.error || foodLog.error}</Text>
            <TouchableOpacity
              style={styles.errorDismiss}
              onPress={() => {
                foodAnalysis.clearError();
                foodLog.clearError(); // Clear foodLog error as well
              }}
            >
              <Text style={styles.errorDismissText}>Dismiss</Text>
            </TouchableOpacity>
            {/* Dismiss button will now clear both analysis and log errors */}
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
                <Text style={styles.syncRetryText}>Retry All</Text>
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

      <CameraModal
        visible={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onPhotoTaken={handlePhotoFromCamera}
      />

      <BarcodeScannerModal
        visible={showBarcodeScannerModal}
        onClose={() => setShowBarcodeScannerModal(false)}
      />

      <MoodLogger
        visible={showMoodModal}
        onClose={() => setShowMoodModal(false)}
        onSuccess={() => notify.success('Mood logged!')}
      />

      <Modal
        visible={showHydrationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHydrationModal(false)}
      >
        <View style={styles.hydrationModalContainer}>
          <View style={styles.hydrationModalHeader}>
            <TouchableOpacity
              onPress={() => setShowHydrationModal(false)}
              style={styles.hydrationModalClose}
              accessibilityLabel="Close water tracker"
            >
              <Ionicons name="close" size={28} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.hydrationModalTitle}>Hydration Tracker</Text>
            <View style={styles.hydrationModalPlaceholder} />
          </View>
          <HydrationTracker
            currentIntake={waterTodayData?.totalLiters || 0}
            dailyGoal={dashboardData?.goals?.waterLiters || 2.0}
            onLogWater={handleLogWater}
            onRemoveWater={handleRemoveWater}
            beverageHistory={beverageHistory}
          />
        </View>
      </Modal>

      <Modal
        visible={showMealLogged}
        animationType="slide"
        onRequestClose={() => setShowMealLogged(false)}
      >
        {loggedMeal && (
          <MealLoggedCard
            meal={loggedMeal}
            dailyGoals={{
              dailyCalories: dashboardData?.goals?.dailyCalories || 2000,
              proteinG: dashboardData?.goals?.proteinG || 150,
              carbsG: dashboardData?.goals?.carbsG || 250,
              fatG: dashboardData?.goals?.fatG || 65,
              fiberG: dashboardData?.goals?.fiberG || 30,
            }}
            onEdit={() => {
              setShowMealLogged(false);
              // Could reopen analysis UI here
            }}
            onShare={async () => {
              try {
                const shareText = `I logged ${loggedMeal.foodName} - ${loggedMeal.calories} kcal\n` +
                  `Protein: ${loggedMeal.protein}g | Carbs: ${loggedMeal.carbs}g | Fat: ${loggedMeal.fat}g`;

                await Share.share({
                  message: shareText,
                  title: 'Share Meal'
                });
              } catch (error) {
                console.error('Share failed:', error);
              }
            }}
            onClose={() => {
              setShowMealLogged(false);
              setLoggedMeal(null);
              notify.success('Meal logged successfully!');
            }}
          />
        )}
      </Modal>
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
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
  },
  headerText: {
    gap: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    fontFamily: fonts.display,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: fonts.strong,
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
    fontFamily: fonts.strong,
  },
  quickActionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B4E',
    fontFamily: fonts.display,
  },
  quickActionLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: fonts.regular,
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 80,
    marginHorizontal: 2,
  },
  modeTabGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
    width: '100%',
    height: '100%',
  },
  modeTabActive: {
    borderColor: '#6B4EFF',
    borderWidth: 1,
    backgroundColor: 'transparent', // gradient will be applied
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  modeTabInactive: {
    backgroundColor: '#F8FAFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: fonts.strong,
    textAlign: 'center',
  },
  modeTextActive: {
    fontSize: 14,
    fontWeight: '600', // match inactive for consistency
    color: '#FFFFFF',
    fontFamily: fonts.strong, // use same font family for both
    textAlign: 'center',
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
    fontFamily: fonts.strong,
  },
  textInputLarge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 18,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 140,
    textAlignVertical: 'top',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    fontWeight: '500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    fontFamily: fonts.strong,
  },
  textInputFocused: {
    borderColor: '#6B4EFF',
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },

  /* Info Box */
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EEF2FF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#6B4EFF',
    fontWeight: '500',
    lineHeight: 18,
    fontFamily: fonts.strong,
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
    fontFamily: fonts.strong,
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
    fontFamily: fonts.strong,
  },
  analyzeButton: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  analyzeButtonDisabled: {
    opacity: 0.7,
  },
  analyzeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  analyzeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.display,
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
    fontFamily: fonts.display,
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
    fontFamily: fonts.display,
  },
  photoEmptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
    fontFamily: fonts.regular,
  },
  photoActions: {
    width: '100%',
    gap: 12,
  },
  photoPrimaryCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  photoPrimaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 12,
  },
  photoPrimaryCopy: {
    flex: 1,
  },
  photoButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: fonts.display,
  },
  photoButtonSub: {
    fontSize: 13,
    color: '#E0E7FF',
    marginTop: 2,
  },
  photoSecondaryStack: {
    gap: 10,
  },
  photoSecondaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  photoSecondaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    fontFamily: fonts.display,
  },
  photoSecondarySub: {
    fontSize: 13,
    color: '#6B7280',
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
    fontFamily: fonts.display,
  },
  voiceEmptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    fontFamily: fonts.regular,
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
    fontFamily: fonts.display,
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
    fontFamily: fonts.strong,
  },
  voiceExamplesList: {
    gap: 8,
  },
  voiceExample: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    fontFamily: fonts.regular,
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
    fontFamily: fonts.display,
  },
  errorMessage: {
    fontSize: 14,
    color: '#DC2626',
    marginBottom: 14,
    lineHeight: 21,
    fontFamily: fonts.regular,
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
    fontFamily: fonts.display,
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
    fontFamily: fonts.display,
  },
  syncSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: fonts.regular,
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
    fontFamily: fonts.display,
  },

  /* Share Button */
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6', // A nice blue for sharing
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
    gap: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: fonts.display,
  },

  /* Hydration Modal */
  hydrationModalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  hydrationModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  hydrationModalClose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hydrationModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: fonts.display,
  },
  hydrationModalPlaceholder: {
    width: 44,
  },
});
