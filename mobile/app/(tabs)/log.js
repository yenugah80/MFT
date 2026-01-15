/**
 * LogScreen - Premium Food Logging Experience
 * Sleek, modern, 3D-style UI with Ionicons
 * Clear user flow with explicit actions
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Modal,
  Share,
  Alert,
  Platform,
  InteractionManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';

// Hooks
import { useFoodAnalysis, getMealTypeFromTime } from '../../hooks/useFoodAnalysis';
// SWITCHED: Using Instant Voice (On-Device) for immediate feedback
import { useServerVoice } from '../../hooks/useServerVoice';
import { useFoodLog } from '../../hooks/useFoodLog';
import { useDashboard } from '../../hooks/useDashboard';
import { useNotification } from '../../providers/NotificationProvider';
import { useWaterLog } from '../../hooks/useWaterLog';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';
import { useTheme } from '../../providers/ThemeProvider';
import useProfileForm from '../../hooks/useProfileForm';
import { useUser } from '@clerk/clerk-expo';
import { calculateDailyTargets } from '../../utils/nutritionTargets';

// Components
import { NutritionCard } from '../../components/log/NutritionCard';
import { NutritionCardSkeleton } from '../../components/log/NutritionCardSkeleton';
import { FoodItemsList } from '../../components/log/FoodItemsList';
import BarcodeScannerModal from '../../components/BarcodeScannerModal';
import { MealSummaryScreen } from '../../components/log/MealSummary';
import CameraModal from '../../components/log/CameraModal';
import { MealTotalsCard } from '../../components/log/MealTotalsCard';
import { VoiceModal } from '../../components/log/VoiceModal';
import LogInputSection from '../../components/log/LogInputSection';
import MoodLogger from '../../components/MoodLogger';
import MealPreviewCard from '../../components/log/MealPreviewCard';
import MealLoggedCard from '../../components/log/MealLoggedCard';
import HydrationTracker from '../../components/HydrationTracker';
import ErrorBoundary from '../../components/ErrorBoundary';
import AnimatedMeshGradient from '../../components/AnimatedMeshGradient';
import ThemeTransition from '../../components/ThemeTransition';
import { QuickActionsBar } from '../../components/log/QuickActionsBar';
import { HealthAnalysisModal } from '../../components/log/HealthAnalysisModal';
import { NutrientTrendsModal } from '../../components/log/NutrientTrendsModal';

// Platform-safe professional fonts for nutrition UI
const fonts = {
  display: Platform.select({ ios: 'HelveticaNeue-Bold', android: 'Roboto-Bold', default: 'System' }),
  strong: Platform.select({ ios: 'HelveticaNeue-Medium', android: 'Roboto-Medium', default: 'System' }),
  regular: Platform.select({ ios: 'Helvetica Neue', android: 'Roboto', default: 'System' }),
};

export default function LogScreen() {
  // Hooks - Get user profile for personalized nutrition targets
  const { user } = useUser();
  const { state: profileState } = useProfileForm(user);

  // Calculate personalized daily targets based on user's nutrition goals
  const DAILY_VALUES = useMemo(() => {
    return calculateDailyTargets(profileState?.savedProfile?.goals);
  }, [profileState?.savedProfile?.goals]);

  // State
  const [selectedImage, setSelectedImage] = useState(null);
  const [analyzedFood, setAnalyzedFood] = useState(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [showBarcodeScannerModal, setShowBarcodeScannerModal] = useState(false);
  const [inputMode, setInputMode] = useState('text'); // 'text', 'photo', 'voice', 'recent'
  const [analysisSource, setAnalysisSource] = useState('text');
  const [isTextFocused, setIsTextFocused] = useState(false);
  const [showMealLogged, setShowMealLogged] = useState(false);
  const [loggedMeal, setLoggedMeal] = useState(null);
  const [showHydrationModal, setShowHydrationModal] = useState(false);
  const [showAnalysisDetails, setShowAnalysisDetails] = useState(false);
  const [hasManuallyClosedDetails, setHasManuallyClosedDetails] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [healthModalData, setHealthModalData] = useState(null);
  const [showTrendsModal, setShowTrendsModal] = useState(false);
  const [selectedTrendNutrient, setSelectedTrendNutrient] = useState(null);

  // Hooks
  const router = useRouter();
  const { focus, mealType } = useLocalSearchParams();
  const foodAnalysis = useFoodAnalysis();
  const voiceHook = useServerVoice({ mealType });
  const foodLog = useFoodLog();
  const { data: dashboardData } = useDashboard();
  const notify = useNotification();
  const { logWater, removeWater } = useWaterLog();
  const { colors } = useTheme();

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
    setShowHealthModal(false);
    setShowTrendsModal(false);
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
   * Auto-show analysis details screen when analysis completes
   * SMART FLOW: Photo/barcode show inline preview, voice auto-opens details
   */
  useEffect(() => {
    if (
      foodAnalysis.analysisResult &&
      foodAnalysis.analysisResult.items?.length > 0 &&
      !foodAnalysis.isAnalyzing &&
      !foodAnalysis.error &&
      !hasManuallyClosedDetails
    ) {
      // SMART FLOW: Only auto-open for voice input (conversational UX)
      // Photo/barcode show inline MealPreviewCard - user taps to see details
      if (analysisSource === 'voice') {
        console.log('[log] Auto-showing MealSummaryScreen for voice with', foodAnalysis.analysisResult.items.length, 'items');
        setShowAnalysisDetails(true);
      } else {
        console.log('[log] Showing inline MealPreviewCard for', analysisSource, 'with', foodAnalysis.analysisResult.items.length, 'items');
        // Don't auto-open - MealPreviewCard handles the display
      }
    }
  }, [foodAnalysis.analysisResult, foodAnalysis.isAnalyzing, foodAnalysis.error, analysisSource, hasManuallyClosedDetails]);

  /**
   * Helper to reset analysis state before starting a new operation
   */
  const resetForNewAnalysis = () => {
    setAnalyzedFood(null);
    foodAnalysis.setAnalysisResult(null);
    setHasManuallyClosedDetails(false);
  };

  /**
   * Handle photo from CameraModal
   */
  const handlePhotoFromCamera = async (imageUri) => {
    // CRITICAL: Clear ALL other results first to prevent duplicates
    resetForNewAnalysis();
    foodAnalysis.setInputText('');

    // Then set photo and analyze
    setSelectedImage(imageUri);
    setAnalysisSource('photo');

    try {
      await foodAnalysis.analyzePhoto(imageUri);
      // Success - analysisResult will be set by the hook
    } catch (error) {
      console.error('[LogScreen] Photo analysis failed:', error);
      // Don't show toast - error is already displayed in foodAnalysis.error state
      // The detailed error message from useFoodAnalysis will show in the error card
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

        // CRITICAL: Clear ALL other results first to prevent duplicates
        resetForNewAnalysis();
        foodAnalysis.setInputText('');

        // Then set photo and analyze
        setSelectedImage(imageUri);
        setAnalysisSource('photo');

        // Analyze image
        await foodAnalysis.analyzePhoto(imageUri);
        // Success - analysisResult will be set by the hook
      }
    } catch (err) {
      console.error('[LogScreen] Photo error:', err);
      // Detailed error already shown in foodAnalysis.error state
    }
  };

  /**
   * Handle voice logging complete
   * VoiceModal already analyzes the transcript - we just use the result directly
   * NO double-analysis needed!
   */
  const handleVoiceComplete = (voiceResult) => {
    if (!voiceResult) return;

    try {
      // VoiceModal's analyzeTranscript already returns the full nutrition result
      // Structure: { transcription, nutrition, items, totals }
      const { transcription, nutrition, items, totals } = voiceResult;

      // Debug logging for meal breakdown
      console.log('[log] Raw voiceResult:', JSON.stringify(voiceResult, null, 2).slice(0, 500));
      console.log('[log] items array:', items);
      console.log('[log] items count:', items?.length || 0);

      if (!transcription?.trim()) {
        console.warn('[log] Empty transcription received from voice');
        return;
      }

      console.log('[log] Voice result received:', { transcription, itemCount: items?.length });

      // Reset state for new result
      resetForNewAnalysis();
      setSelectedImage(null);
      setAnalysisSource('voice');
      setShowVoiceModal(false);

      // Show what was heard as input text
      foodAnalysis.setInputText(transcription);

      // Use the nutrition result directly from VoiceModal
      // No need to re-analyze - VoiceModal already did it!
      if (items && items.length > 0) {
        // Map items to expected format (backend items already have correct structure)
        const mappedItems = items.map((item, idx) => ({
          itemId: item.itemId || `voice-${idx}`,
          name: item.name || item.foodName,
          portion: item.portion || { amount: 1, unit: 'serving' },
          macros: item.macros || {
            calories_kcal: item.calories || 0,
            protein_g: item.protein || 0,
            carbs_g: item.carbs || 0,
            fat_g: item.fat || item.fats || 0,
            fiber_g: item.fiber || 0,
            sugar_g: item.sugar || 0,
            sodium_mg: item.sodium || 0,
          },
          micros: item.micros || {},
          confidence: item.confidence || 0.9,
          source: item.source || 'voice',
        }));

        // Calculate totals from items (backend returns empty totals)
        const calculatedTotals = {
          macros: {
            calories_kcal: 0,
            protein_g: 0,
            carbs_g: 0,
            fat_g: 0,
            fiber_g: 0,
            sugar_g: 0,
            sodium_mg: 0,
          },
          micros: {},
        };

        mappedItems.forEach((item) => {
          const m = item.macros || {};
          calculatedTotals.macros.calories_kcal += m.calories_kcal || 0;
          calculatedTotals.macros.protein_g += m.protein_g || 0;
          calculatedTotals.macros.carbs_g += m.carbs_g || 0;
          calculatedTotals.macros.fat_g += m.fat_g || 0;
          calculatedTotals.macros.fiber_g += m.fiber_g || 0;
          calculatedTotals.macros.sugar_g += m.sugar_g || 0;
          calculatedTotals.macros.sodium_mg += m.sodium_mg || 0;

          // Aggregate micros
          if (item.micros) {
            Object.entries(item.micros).forEach(([key, value]) => {
              if (!calculatedTotals.micros[key]) {
                calculatedTotals.micros[key] = { value: 0, unit: value?.unit || '' };
              }
              calculatedTotals.micros[key].value += value?.value || 0;
            });
          }
        });

        // Use provided totals if they have data, otherwise use calculated
        const finalTotals = (totals?.macros && Object.keys(totals.macros).length > 0)
          ? totals
          : calculatedTotals;

        foodAnalysis.setAnalysisResult({
          items: mappedItems,
          totals: finalTotals,
          source: 'voice',
        });

        console.log('[log] Voice analysis result set:', {
          itemCount: mappedItems.length,
          totalCalories: finalTotals.macros.calories_kcal,
        });
      } else if (nutrition?.data) {
        // Handle legacy format where nutrition data is nested
        foodAnalysis.setAnalysisResult(nutrition.data);
      } else if (nutrition?.items) {
        // Handle case where nutrition contains items directly
        foodAnalysis.setAnalysisResult(nutrition);
      }

      setAnalyzedFood(null); // Clear single-item state to prefer list view
    } catch (err) {
      console.error('[log] Voice result processing failed:', err.message);
      notify.error('Failed to process voice result');
    }
  };

  /**
   * Apply a "Did you mean?" suggestion
   */
  const handleApplySuggestion = (itemId, suggestion) => {
    if (!foodAnalysis.analysisResult) return;

    const updatedItems = foodAnalysis.analysisResult.items.map(item => {
      if (item.itemId === itemId) {
        return {
          ...item,
          name: suggestion.canonical,
          // Update portion unit if the suggestion has a specific default
          portion: {
            ...item.portion,
            unit: suggestion.portion?.unit || item.portion.unit
          },
          suggestions: [], // Clear suggestions after applying
          confidence: 1.0, // User manually selected this, so high confidence
          manualOverride: true // Flag for learning loop
        };
      }
      return item;
    });

    foodAnalysis.setAnalysisResult({ ...foodAnalysis.analysisResult, items: updatedItems });
  };

  /**
   * Report incorrect nutrition data
   */
  const handleReportIssue = async () => {
    if (!foodAnalysis.analysisResult?.items?.length) return;
    
    // Report the first item (or we could add UI to select which one)
    const itemToReport = foodAnalysis.analysisResult.items[0];
    
    try {
      await apiClient.post('/voice/report', { name: itemToReport.name });
      notify.success('Thanks! We will review this item.');
    } catch (_error) {
      notify.error('Failed to send report');
    }
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
    let shareText = `My Meal Analysis from My-Food-Tracker:\n\n`;

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
      // CRITICAL FIX: Set mealType based on URL param or auto-detect from time
      const effectiveMealType = mealType || foodData.mealType || getMealTypeFromTime();
      const foodDataWithId = {
        ...foodData,
        source: foodData.source || analysisSource,
        mealType: effectiveMealType,
        clientEventId,
        sourceMeta: {
          source: analysisSource,
          timestamp: new Date().toISOString(),
        },
      };

      await foodLog.addLog(foodDataWithId);

      // Clear state first to reduce state complexity
      setAnalyzedFood(null);
      setSelectedImage(null);

      // Show MealLoggedCard instead of just notification
      setLoggedMeal({
        ...foodDataWithId,
        originalAnalysis: analyzedFood || (foodAnalysis.analysisResult?.items?.length === 1 ? foodAnalysis.analysisResult : null)
      });

      // Use InteractionManager to wait for all animations/transitions to complete
      // This prevents bridge overflow from simultaneous UI operations
      InteractionManager.runAfterInteractions(() => {
        // Additional delay to ensure React has processed state updates
        setTimeout(() => {
          setShowMealLogged(true);
        }, 100);
      });
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
      // CRITICAL FIX: Set mealType based on URL param or auto-detect from time
      const effectiveMealType = mealType || getMealTypeFromTime();
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;

      // P2 FIX: Batch save operations for performance and atomicity
      const savePromises = foodAnalysis.analysisResult.items.map((item, index) => {
        const servingText = item.portion?.amount && item.portion?.unit
          ? `${item.portion.amount}${item.portion.unit}`
          : '1 serving';

        const foodLogData = {
          id: `${mealEventId}-${index}`,
          timestamp: baseTimestamp + index, // deterministic per item to avoid collisions
          status: 'pending',
          source: 'text',
          mealType: effectiveMealType, // CRITICAL FIX: Include mealType
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
          fats: item.macros?.fat_g || 0,
          fiber: item.macros?.fiber_g || 0,
          sugar: item.macros?.sugar_g || 0,
          micros: item.micros || {},
          sourceEvidence: item.sourceEvidence,
          confidence: item.sourceEvidence?.[0]?.confidence || 0.5,
        };

        totalCalories += foodLogData.calories || 0;
        totalProtein += foodLogData.protein || 0;
        totalCarbs += foodLogData.carbs || 0;
        totalFat += foodLogData.fats || 0;

        return foodLog.addLog(foodLogData);
      });

      await Promise.all(savePromises);

      // Clear UI first to reduce state complexity
      foodAnalysis.setInputText('');
      foodAnalysis.setAnalysisResult(null);

      // Set meal data
      setLoggedMeal({
        foodName: `Meal (${foodAnalysis.analysisResult.items.length} items)`,
        calories: totalCalories,
        protein: totalProtein,
        carbs: totalCarbs,
        fats: totalFat,
        mealId: mealEventId,
        originalAnalysis: foodAnalysis.analysisResult
      });

      // Use InteractionManager to wait for all animations/transitions to complete
      // This prevents bridge overflow from simultaneous UI operations
      InteractionManager.runAfterInteractions(() => {
        // Additional delay to ensure React has processed state updates
        setTimeout(() => {
          setShowMealLogged(true);
        }, 100);
      });
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
      fats: item.macros?.fat_g ?? null,
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

  const performCancel = () => {
    setAnalyzedFood(null);
    foodAnalysis.setAnalysisResult(null);

    // Preserve inputs based on current mode so user doesn't have to re-enter
    if (inputMode === 'text') {
      setSelectedImage(null);
    } else if (inputMode === 'photo') {
      foodAnalysis.setInputText('');
    } else if (inputMode === 'recent') {
      // Keep recent tab active
    } else {
      // For voice or others, clear everything
      setSelectedImage(null);
      foodAnalysis.setInputText('');
    }

    setAnalysisSource(inputMode);
  };

  const handleCancel = () => {
    if (isAnalyzing) {
      Alert.alert(
        'Cancel Analysis',
        'Are you sure you want to stop the current analysis?',
        [
          { text: 'Keep Waiting', style: 'cancel' },
          { text: 'Stop', style: 'destructive', onPress: performCancel }
        ]
      );
    } else {
      performCancel();
    }
  };

  const handleRetry = async () => {
    foodAnalysis.clearError();
    
    if (analysisSource === 'photo' && selectedImage) {
      try {
        await foodAnalysis.analyzePhoto(selectedImage);
      } catch (_e) {
        // Error handled in hook
      }
    } else if (analysisSource === 'text' && foodAnalysis.inputText) {
      try {
        await foodAnalysis.analyzeText(foodAnalysis.inputText);
      } catch (_e) {
        // Error handled in hook
      }
    } else {
      notify.info('Cannot retry: input missing');
    }
  };

  const handleHealthPress = (data) => {
    setHealthModalData(data);
    setShowHealthModal(true);
  };

  const handleViewTrends = (nutrient) => {
    setSelectedTrendNutrient(nutrient);
    setShowTrendsModal(true);
  };

  const handleSelectRecentFood = (foodItem) => {
    // Convert historical item to analysis result format
    // This allows the user to edit/confirm before logging again
    const analysisItem = {
      name: foodItem.foodName,
      calories: foodItem.calories,
      protein: foodItem.protein,
      carbs: foodItem.carbs,
      fats: foodItem.fats || foodItem.fat,
      fiber: foodItem.fiber,
      sugar: foodItem.sugar,
      micros: foodItem.micros || {},
      servingSize: foodItem.servingSize,
      source: 'recent',
    };

    setAnalyzedFood(buildLegacyFoodLog(analysisItem));
  };

  const handleQuickAddRecent = async (foodItem) => {
    try {
      const foodLogData = {
        timestamp: Date.now(),
        status: 'completed',
        source: 'recent',
        foodName: foodItem.foodName,
        servingSize: foodItem.servingSize || '1 serving',
        calories: foodItem.calories,
        protein: foodItem.protein,
        carbs: foodItem.carbs,
        fats: foodItem.fats || foodItem.fat,
        fiber: foodItem.fiber,
        sugar: foodItem.sugar,
        sodium: foodItem.sodium,
        micros: foodItem.micros || {},
        sourceMeta: { source: 'recent', originalId: foodItem.id },
      };

      await foodLog.addLog(foodLogData);
      notify.success(`Quick added: ${foodItem.foodName}`);
    } catch (error) {
      console.error('Quick add failed:', error);
      notify.error('Failed to quick add item');
    }
  };

  const handleSelectFavorite = (savedMeal) => {
    // Map saved meal items to analysis result items
    const items = (savedMeal.items || []).map(item => ({
      itemId: Math.random().toString(36).substr(2, 9),
      name: item.name,
      portion: {
        amount: item.quantity,
        unit: item.unit,
        servingText: `${item.quantity} ${item.unit}`
      },
      macros: {
        calories_kcal: item.calories,
        protein_g: item.protein,
        carbs_g: item.carbs,
        fat_g: item.fat,
        fiber_g: item.fiber,
        sugar_g: item.sugar,
        sodium_mg: item.sodium,
      },
      micros: item.micros || {},
      isEditing: false
    }));

    const totals = {
      macros: {
        calories_kcal: savedMeal.totals?.calories || 0,
        protein_g: savedMeal.totals?.protein || 0,
        carbs_g: savedMeal.totals?.carbs || 0,
        fat_g: savedMeal.totals?.fat || 0,
        fiber_g: savedMeal.totals?.fiber || 0,
        sugar_g: savedMeal.totals?.sugar || 0,
        sodium_mg: savedMeal.totals?.sodium || 0,
      },
      micros: {}
    };

    foodAnalysis.setAnalysisResult({ items, totals });
    setAnalyzedFood(null);
    setSelectedImage(null);
    notify.success(`Loaded "${savedMeal.name}"`);
  };

  const handleEditLoggedMeal = async () => {
    if (!loggedMeal) return;
    
    // 1. Close the success modal
    setShowMealLogged(false);
    
    // 2. Delete the log(s) we just saved to avoid duplicates
    try {
      if (foodLog.deleteLog) {
        if (loggedMeal.mealId && loggedMeal.originalAnalysis?.items) {
          // Multi-item meal: delete all items associated with this meal save
          const promises = loggedMeal.originalAnalysis.items.map((_, index) => 
            foodLog.deleteLog(`${loggedMeal.mealId}-${index}`)
          );
          await Promise.all(promises);
        } else if (loggedMeal.clientEventId || loggedMeal.id) {
          // Single item
          await foodLog.deleteLog(loggedMeal.clientEventId || loggedMeal.id);
        }
      }
    } catch (e) {
      console.error("[LogScreen] Failed to delete log for editing", e);
      // Continue anyway to allow editing, user might have to manually delete duplicate if fetch failed
    }

    // 3. Restore the analysis state
    if (loggedMeal.originalAnalysis) {
      if (loggedMeal.originalAnalysis.items) {
        // It was a full analysis result (Photo/Voice/Multi-item)
        foodAnalysis.setAnalysisResult(loggedMeal.originalAnalysis);
      } else {
        // It was a single text analysis
        setAnalyzedFood(loggedMeal.originalAnalysis);
      }
    }
  };

  /**
   * Handle water logging from HydrationTracker
   * IMPORTANT: Send RAW amount, NOT effectiveAmount!
   * Backend applies hydration factor - sending effectiveAmount would double-apply it
   */
  const handleLogWater = async (entry) => {
    try {
      // FIX: Use entry.amount (raw ml), not entry.effectiveAmount (already factor-adjusted)
      // Backend water.js applies hydration factor: hydrationLiters = amountLiters * factor
      const amountLiters = entry.amount / 1000; // Convert raw ml to liters
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

  // P0-4 FIX: Wrap entire screen with ErrorBoundary to prevent data loss
  return (
    <AnimatedMeshGradient
      colors={colors.background.gradient}
      animationDuration={colors.background.animationDuration}
      style={{ flex: 1 }}
    >
      <ThemeTransition>
        <ErrorBoundary
          onReset={() => {
            // Reset all modals and state on error recovery
            closeAllModals();
            foodAnalysis.setAnalysisResult(null);
            foodAnalysis.setInputText('');
            setSelectedImage(null);
            setAnalyzedFood(null);
          }}
        >
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
        <QuickActionsBar
          onMoodPress={() => {
            closeAllModals();
            setShowMoodModal(true);
          }}
          onWaterPress={() => {
            closeAllModals();
            setShowHydrationModal(true);
          }}
          onHistoryPress={() => router.push({ pathname: '/history', params: { from: 'log' } })}
          logCount={foodLog.logs?.length || 0}
        />
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LogInputSection
          styles={styles}
          inputMode={inputMode}
          setInputMode={setInputMode}
          setAnalysisSource={setAnalysisSource}
          foodAnalysis={foodAnalysis}
          isAnalyzing={isAnalyzing}
          isTextFocused={isTextFocused}
          setIsTextFocused={setIsTextFocused}
          selectedImage={selectedImage}
          setSelectedImage={setSelectedImage}
          setAnalyzedFood={setAnalyzedFood}
          setShowCameraModal={setShowCameraModal}
          setShowBarcodeScannerModal={setShowBarcodeScannerModal}
          setShowVoiceModal={setShowVoiceModal}
          handlePhotoFromLibrary={handlePhotoFromLibrary}
          onSelectRecentFood={handleSelectRecentFood}
          onQuickAdd={handleQuickAddRecent}
          onSelectFavorite={handleSelectFavorite}
        />

        {/* Analysis Results */}
        {isAnalyzing ? (
          <View style={styles.resultsContainer}>
            <NutritionCardSkeleton onCancel={handleCancel} />
          </View>
        ) : analyzedFood ? (
          <View style={styles.resultsContainer}>
            <NutritionCard
              foodLog={analyzedFood}
              onSave={handleSaveLog}
              dailyValues={DAILY_VALUES} // Pass daily values
              onCancel={handleCancel}
              onHealthPress={() => handleHealthPress(analyzedFood)}
            />
          </View>
        ) : foodAnalysis.analysisResult?.items && foodAnalysis.analysisResult.items.length > 0 ? (
          <View style={styles.resultsContainer}>
            {/* SMART FLOW: Photo/Barcode show MealPreviewCard, Text shows detailed view */}
            {(analysisSource === 'photo' || analysisSource === 'barcode') ? (
              <MealPreviewCard
                analysisResult={foodAnalysis.analysisResult}
                imageUri={selectedImage}
                onTapDetails={() => {
                  setHasManuallyClosedDetails(false);
                  setShowAnalysisDetails(true);
                }}
                onQuickSave={handleSaveMeal}
                onEdit={handleCancel}
                isSaving={isSavingLog}
              />
            ) : foodAnalysis.analysisResult.items.length === 1 ? (
              <NutritionCard
                foodLog={buildLegacyFoodLog(foodAnalysis.analysisResult.items[0])}
                dailyValues={DAILY_VALUES} // Pass daily values
                onSave={handleSaveSingleItem}
                onCancel={handleCancel}
                onHealthPress={() => handleHealthPress(buildLegacyFoodLog(foodAnalysis.analysisResult.items[0]))}
              />
            ) : (
              <>
                <FoodItemsList
                  items={foodAnalysis.analysisResult.items}
                  onUpdateQuantity={foodAnalysis.updateItemQuantity}
                  onRemove={foodAnalysis.removeItem}
                  onRemoveIngredient={foodAnalysis.removeIngredient}
                  dailyValues={DAILY_VALUES} // Pass daily values to FoodItemsList
                />
                <MealTotalsCard
                  totals={foodAnalysis.analysisResult.totals}
                  itemCount={foodAnalysis.analysisResult.items.length}
                  onSave={handleSaveMeal}
                />
              </>
            )}

            {/* "Did you mean?" Suggestions - Only for text input */}
            {analysisSource === 'text' && foodAnalysis.analysisResult.items.some(item => item.suggestions?.length > 0) && (
              <View style={styles.suggestionsContainer}>
                <View style={styles.suggestionsHeader}>
                  <Ionicons name="help-buoy-outline" size={18} color="#F59E0B" />
                  <Text style={styles.suggestionsTitle}>Did you mean?</Text>
                </View>
                {foodAnalysis.analysisResult.items.map(item => (
                  item.suggestions?.length > 0 && (
                    <View key={item.itemId} style={styles.suggestionGroup}>
                      <Text style={styles.suggestionLabel}>For &quot;{item.name}&quot;:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionChips}>
                        {item.suggestions.map((suggestion, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.suggestionChip}
                            onPress={() => handleApplySuggestion(item.itemId, suggestion)}
                          >
                            <Text style={styles.suggestionChipText}>{suggestion.canonical}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )
                ))}
              </View>
            )}

            {/* View Details Button - Manual trigger for text input only (photo/barcode use MealPreviewCard) */}
            {foodAnalysis.analysisResult && analysisSource === 'text' && (
              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={() => {
                  setHasManuallyClosedDetails(false); // Reset flag
                  setShowAnalysisDetails(true); // Show details screen
                }}
                activeOpacity={0.8}
                accessibilityLabel="View detailed nutrition analysis"
              >
                <LinearGradient
                  colors={['#6B4EFF', '#8B6EFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.viewDetailsGradient}
                >
                  <Ionicons name="analytics" size={20} color="#FFFFFF" />
                  <Text style={styles.viewDetailsText}>View Detailed Analysis</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Actions Footer - Only for text input (photo/barcode have actions in MealPreviewCard) */}
            {foodAnalysis.analysisResult && analysisSource === 'text' && (
              <View style={styles.resultsActions}>
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={handleShare}
                  activeOpacity={0.8}
                  accessibilityLabel="Share meal analysis results"
                >
                  <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.reportButton}
                  onPress={handleReportIssue}
                  activeOpacity={0.7}
                  accessibilityLabel="Report incorrect nutrition"
                >
                  <Ionicons name="flag-outline" size={16} color="#EF4444" />
                  <Text style={styles.reportButtonText}>Report Issue</Text>
                </TouchableOpacity>
              </View>
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
            
            <View style={styles.errorActions}>
              <TouchableOpacity
                style={styles.errorDismiss}
                onPress={() => {
                  foodAnalysis.clearError();
                  foodLog.clearError(); // Clear foodLog error as well
                }}
              >
                <Text style={styles.errorDismissText}>Dismiss</Text>
              </TouchableOpacity>

              {/* Retry Button */}
              {foodAnalysis.error && (analysisSource === 'photo' || analysisSource === 'text') && (
                <TouchableOpacity
                  style={styles.errorRetry}
                  onPress={handleRetry}
                >
                  <Ionicons name="refresh" size={16} color="#FFFFFF" />
                  <Text style={styles.errorRetryText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
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

      <HealthAnalysisModal
        visible={showHealthModal}
        onClose={() => setShowHealthModal(false)}
        data={healthModalData}
      />

      <NutrientTrendsModal
        visible={showTrendsModal}
        onClose={() => setShowTrendsModal(false)}
        nutrient={selectedTrendNutrient}
        trends={dashboardData?.trends?.weekSummaries}
        goals={dashboardData?.goals}
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
        animationType="none"
        onRequestClose={() => setShowMealLogged(false)}
      >
        {loggedMeal && (
          <MealLoggedCard
            meal={loggedMeal}
            dailyTotals={dashboardData?.today?.nutrition}
            dailyGoals={{
              dailyCalories: dashboardData?.goals?.dailyCalories || 2000,
              proteinG: dashboardData?.goals?.proteinG || 150,
              carbsG: dashboardData?.goals?.carbsG || 250,
              fatG: dashboardData?.goals?.fatG || 65,
              fiberG: dashboardData?.goals?.fiberG || 30,
            }}
            onViewTrends={handleViewTrends}
            onEdit={handleEditLoggedMeal}
            onShare={async () => {
              try {
                const shareText = `I logged ${loggedMeal.foodName} - ${loggedMeal.calories} kcal\n` +
                  `Protein: ${loggedMeal.protein}g | Carbs: ${loggedMeal.carbs}g | Fat: ${loggedMeal.fats || loggedMeal.fat}g`;

                await Share.share({
                  message: shareText,
                  title: 'Share Meal'
                });
              } catch (error) {
                console.error('Share failed:', error);
              }
            }}
            onViewHistory={() => {
              setShowMealLogged(false);
              router.push({ pathname: '/history', params: { from: 'log' } });
            }}
            onClose={() => {
              setShowMealLogged(false);
              setLoggedMeal(null);
              notify.success('Meal logged successfully!');
            }}
          />
        )}
      </Modal>

      {/* Meal Summary Screen - Premium Analysis Display */}
      <MealSummaryScreen
        visible={showAnalysisDetails}
        onClose={() => {
          setShowAnalysisDetails(false);
          setHasManuallyClosedDetails(true); // Prevent auto-reopen
        }}
        analysisResult={foodAnalysis.analysisResult}
        dailyValues={DAILY_VALUES}
        imageUri={selectedImage}
        onSave={async () => {
          // Save the meal
          await handleSaveMeal();
          setShowAnalysisDetails(false);
          setHasManuallyClosedDetails(false); // Reset for next analysis
        }}
        onEdit={() => {
          // Close details screen to allow editing
          setShowAnalysisDetails(false);
        }}
        onShare={handleShare}
        isSaving={isSavingLog}
      />
    </KeyboardAvoidingView>
        </ErrorBoundary>
      </ThemeTransition>
    </AnimatedMeshGradient>
  );
}

/* Premium Modern Styles - 3D Icons & Gradients */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F7F4', // Warm off-white for reduced eye strain (was #F8F9FA)
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

  recentContainer: {
    minHeight: 300,
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

  /* Suggestions */
  suggestionsContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFFBEB', // Light yellow background
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B45309',
    fontFamily: fonts.strong,
  },
  suggestionGroup: {
    marginBottom: 8,
  },
  suggestionLabel: {
    fontSize: 13,
    color: '#92400E',
    marginBottom: 8,
    fontFamily: fonts.regular,
  },
  suggestionChips: {
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  suggestionChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D97706',
    fontFamily: fonts.strong,
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
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  errorDismiss: {
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
  errorRetry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: '#DC2626',
    borderRadius: 10,
  },
  errorRetryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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

  /* View Details Button */
  viewDetailsButton: {
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  viewDetailsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
  },
  viewDetailsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: fonts.display,
  },

  /* Results Actions */
  resultsActions: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  /* Share Button */
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6', // A nice blue for sharing
    borderRadius: 12,
    paddingVertical: 14,
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
  
  /* Report Button */
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    fontFamily: fonts.strong,
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
