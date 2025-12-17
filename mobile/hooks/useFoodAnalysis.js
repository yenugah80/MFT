/**
 * useFoodAnalysis Hook
 * Production-ready hook for analyzing food via text or photo
 * Handles backend communication, loading states, and error recovery
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { API_URL } from '../constants/api';
import { transformBackendToFoodLog, calculateNetCarbs } from '../types/foodLog';
import { normalizeNutritionData, detectAggregatedData } from '../utils/nutritionNormalizer';

/**
 * Compress image to reduce upload size
 * @param {string} uri - Image URI
 * @param {number} quality - 0-1, default 0.7
 * @returns {Promise<{uri: string, base64: string}>}
 */
async function compressImage(uri, quality = 0.7) {
  const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');

  // Resize to max 1024px width while maintaining aspect ratio
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    { compress: quality, format: SaveFormat.JPEG }
  );

  // Convert to base64
  const { FileSystem } = await import('expo-file-system');
  const base64 = await FileSystem.readAsStringAsync(result.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return {
    uri: result.uri,
    base64,
  };
}

/**
 * Hook for food analysis (text or photo)
 */
export function useFoodAnalysis() {
  const { getToken } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0); // 0-100

  /**
   * Analyze food from text description
   * @param {string} text - Food description
   * @returns {Promise<FoodLog>}
   */
  const analyzeText = useCallback(async (text) => {
    if (!text || text.trim().length === 0) {
      throw new Error('Text description is required');
    }

    setIsAnalyzing(true);
    setError(null);
    setProgress(20);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      setProgress(40);

      // Call backend AI analysis endpoint
      const response = await fetch(`${API_URL}/nutrition/recipe/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      setProgress(70);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Analysis failed: ${response.status}`);
      }

      const data = await response.json();
      setProgress(90);

      // Detect if data looks pre-aggregated
      const aggregationCheck = detectAggregatedData(data);
      if (aggregationCheck.isAggregated) {
        console.warn('[useFoodAnalysis] AI returned aggregated data:', aggregationCheck.suggestion);
      }

      // Normalize nutrition data (converts strings to numbers, applies sanity bounds)
      const normalized = normalizeNutritionData(data);

      // Transform to canonical FoodLog format
      const foodLog = {
        timestamp: Date.now(),
        source: 'text',
        status: 'pending',
        foodName: data.foodName || data.name || text,
        cookingMethod: data.cookingMethod,
        servingSize: data.servingSize || '1 serving',

        // Use normalized macros
        calories: normalized.calories,
        protein: normalized.protein,
        carbs: normalized.carbs,
        fat: normalized.fat,
        fiber: normalized.fiber,
        sugar: normalized.sugar,
        sugarAlcohols: normalized.sugarAlcohols,
        netCarbs: calculateNetCarbs(normalized),

        // Use normalized micros (numeric only)
        micronutrients: normalized.micronutrients,
        micros: normalized.micros,

        ingredients: data.ingredients || [],
        healthScore: data.healthScore || 0,
        nutriscore: data.nutriscore,
        ecoscore: data.ecoscore,
        novaScore: data.novaScore,
        dietLabels: data.dietLabels || [],
        allergens: data.allergens || [],
      };

      setProgress(100);
      return foodLog;
    } catch (err) {
      console.error('[useFoodAnalysis] Text analysis failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), 500);
    }
  }, [getToken]);

  /**
   * Analyze food from photo
   * @param {string} imageUri - Local image URI
   * @returns {Promise<FoodLog>}
   */
  const analyzePhoto = useCallback(async (imageUri) => {
    if (!imageUri) {
      throw new Error('Image URI is required');
    }

    setIsAnalyzing(true);
    setError(null);
    setProgress(10);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      setProgress(20);

      // Compress image before upload
      console.log('[useFoodAnalysis] Compressing image...');
      const { base64 } = await compressImage(imageUri, 0.7);

      setProgress(50);

      // Send to backend for AI analysis
      console.log('[useFoodAnalysis] Analyzing image...');
      const response = await fetch(`${API_URL}/food/analyze-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ image: base64 }),
      });

      setProgress(80);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Image analysis failed: ${response.status}`);
      }

      const data = await response.json();
      setProgress(95);

      // Detect if data looks pre-aggregated
      const aggregationCheck = detectAggregatedData(data);
      if (aggregationCheck.isAggregated) {
        console.warn('[useFoodAnalysis] AI returned aggregated data:', aggregationCheck.suggestion);
      }

      // Normalize nutrition data (converts strings to numbers, applies sanity bounds)
      const normalized = normalizeNutritionData(data);

      // Transform to canonical FoodLog format
      const foodLog = {
        timestamp: Date.now(),
        source: 'photo',
        status: 'pending',
        foodName: data.foodName || data.name || 'Unknown food',
        cookingMethod: data.cookingMethod,
        servingSize: data.servingSize || '1 serving',

        // Use normalized macros
        calories: normalized.calories,
        protein: normalized.protein,
        carbs: normalized.carbs,
        fat: normalized.fat,
        fiber: normalized.fiber,
        sugar: normalized.sugar,
        sugarAlcohols: normalized.sugarAlcohols,
        netCarbs: calculateNetCarbs(normalized),

        // Use normalized micros (numeric only)
        micronutrients: normalized.micronutrients,
        micros: normalized.micros,

        ingredients: data.ingredients || [],
        healthScore: data.healthScore || 0,
        nutriscore: data.nutriscore,
        ecoscore: data.ecoscore,
        novaScore: data.novaScore,
        dietLabels: data.dietLabels || [],
        allergens: data.allergens || [],
        imageUrl: imageUri, // Store original image URI
      };

      setProgress(100);
      return foodLog;
    } catch (err) {
      console.error('[useFoodAnalysis] Photo analysis failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), 500);
    }
  }, [getToken]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    analyzeText,
    analyzePhoto,
    isAnalyzing,
    progress,
    error,
    clearError,
  };
}
