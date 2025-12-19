/**
 * useFoodAnalysis Hook
 * USDA → AI fallback
 * Safe, fast, predictable, production-ready
 * + Multi-item breakdown with auto-analysis
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { API_URL } from '../constants/api';
import { calculateNetCarbs } from '../types/foodLog';
import { normalizeNutritionData, detectAggregatedData } from '../utils/nutritionNormalizer';

/* ---------------- CONFIG ---------------- */

const TOTAL_BUDGET_MS = 2000;
const USDA_TIMEOUT_MS = 650;
const AI_TIMEOUT_MS = 1600;

const USDA_ENDPOINT = `${API_URL}/food/resolve`;
const AI_TEXT_ENDPOINT = `${API_URL}/nutrition/recipe/parse`;
const AI_IMAGE_ENDPOINT = `${API_URL}/food/analyze-image`;

/* ---------------- HELPERS ---------------- */

// Detect if text looks like a single food or a meal
function classifyText(text) {
  const t = text.toLowerCase().trim();
  const wordCount = t.split(/\s+/).length;
  const hasSeparators = /,|and|with|\+/.test(t);
  const hasNumbers = /\d/.test(t);

  return {
    isSingleFood: wordCount <= 3 && !hasSeparators && !hasNumbers,
  };
}

// Timeout-safe fetch
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const json = await res.json().catch(() => ({}));
    return { res, json };
  } finally {
    clearTimeout(timer);
  }
}

// Normalize + build FoodLog
function buildFoodLog({ inputText, source, raw }) {
  const aggregation = detectAggregatedData(raw);
  if (aggregation?.isAggregated) {
    console.warn('[useFoodAnalysis] Aggregated data detected');
  }

  const n = normalizeNutritionData(raw);

  return {
    timestamp: Date.now(),
    status: 'pending',
    source,
    foodName: raw.foodName || raw.name || inputText,
    servingSize: raw.servingSize || '1 serving',
    calories: n.calories,
    protein: n.protein,
    carbs: n.carbs,
    fat: n.fat,
    fiber: n.fiber,
    sugar: n.sugar,
    sugarAlcohols: n.sugarAlcohols,
    netCarbs: calculateNetCarbs(n),
    micronutrients: n.micronutrients,
    micros: n.micros,
    ingredients: raw.ingredients || [],
    healthScore: raw.healthScore || 0,
    nutriscore: raw.nutriscore,
    ecoscore: raw.ecoscore,
    novaScore: raw.novaScore,
    dietLabels: raw.dietLabels || [],
    allergens: raw.allergens || [],
  };
}

// Image compression
async function compressImage(uri) {
  const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
  const { FileSystem } = await import('expo-file-system');

  const result = await manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    { compress: 0.7, format: SaveFormat.JPEG }
  );

  const base64 = await FileSystem.readAsStringAsync(result.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return base64;
}

// Unit conversion to grams (for quantity editing)
function convertToGrams(amount, unit) {
  const conversions = {
    'g': 1,
    'kg': 1000,
    'oz': 28.35,
    'lb': 453.59,
    'ml': 1, // Approximate for water-like liquids
    'l': 1000,
    'cup': 240, // Approximate
    'tbsp': 15,
    'tsp': 5,
    'serving': 100, // Default assumption
  };

  return amount * (conversions[unit.toLowerCase()] || 100);
}

// Calculate totals from items array
function calculateTotals(items) {
  if (!items || items.length === 0) {
    return {
      macros: { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 },
      micros: { calcium: '0mg', iron: '0mg', vitaminA: '0IU', vitaminC: '0mg', potassium: '0mg' }
    };
  }

  const totals = {
    macros: {
      calories_kcal: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0
    },
    micros: {}
  };

  items.forEach(item => {
    // Sum macros
    Object.keys(totals.macros).forEach(key => {
      totals.macros[key] += item.macros?.[key] || 0;
    });

    // Sum micros (parse numbers from strings like "80mg")
    if (item.micros) {
      Object.keys(item.micros).forEach(key => {
        const value = parseFloat(item.micros[key]) || 0;
        const unit = item.micros[key]?.match(/[a-z]+/i)?.[0] || '';
        totals.micros[key] = totals.micros[key] || 0;
        totals.micros[key] += value;
      });
    }
  });

  // Format micros back to strings with units
  Object.keys(totals.micros).forEach(key => {
    const firstItem = items.find(item => item.micros?.[key]);
    const unit = firstItem?.micros?.[key]?.match(/[a-z]+/i)?.[0] || '';
    totals.micros[key] = `${totals.micros[key].toFixed(1)}${unit}`;
  });

  return totals;
}

/* ---------------- HOOK ---------------- */

export function useFoodAnalysis() {
  const { getToken } = useAuth();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  // Multi-item state
  const [analysisResult, setAnalysisResult] = useState(null);
  const [inputText, setInputText] = useState('');
  const [debouncedText, setDebouncedText] = useState('');
  const debounceTimerRef = useRef(null);
  const abortControllerRef = useRef(null);

  /* -------- DEBOUNCE EFFECTS -------- */

  // Debounce input text (1.5s delay after user stops typing)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (inputText.trim()) {
      debounceTimerRef.current = setTimeout(() => {
        setDebouncedText(inputText);
      }, 1500);
    } else {
      // Clear results if input is empty
      setAnalysisResult(null);
      setDebouncedText('');
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [inputText]);

  // Trigger analysis when debounced text changes
  useEffect(() => {
    if (debouncedText.trim()) {
      analyzeTextUniversal(debouncedText);
    }
  }, [debouncedText]);

  /* -------- MULTI-ITEM ANALYSIS -------- */

  const analyzeTextUniversal = useCallback(async (text) => {
    if (!text?.trim()) return;

    try {
      setIsAnalyzing(true);
      setError(null);
      setProgress(10);

      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setProgress(30);

      const token = await getToken();
      if (!token) throw new Error('Authentication required');

      setProgress(50);

      // Call resolve endpoint (supports multi-item)
      const response = await fetch(`${API_URL}/food/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mode: 'text',
          query: text,
          mealType: 'snack' // Default, could be time-based
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json?.error || 'Analysis failed');
      }

      const data = await response.json();

      setProgress(90);

      // Store result with UI-specific fields
      setAnalysisResult({
        ...data,
        items: (data.items || []).map(item => ({
          ...item,
          isEditing: false,
          editedPortion: null
        }))
      });

      setProgress(100);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Analysis failed');
        console.error('[useFoodAnalysis] Universal analysis error:', err);
      }
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), 400);
    }
  }, [getToken]);

  /* -------- QUANTITY EDITING -------- */

  const updateItemQuantity = useCallback((itemId, newAmount, newUnit) => {
    setAnalysisResult(prev => {
      if (!prev) return null;

      const updatedItems = prev.items.map(item => {
        if (item.itemId === itemId) {
          // Calculate scaling factor
          const originalGrams = item.portion?.gramsEquivalent || convertToGrams(item.portion?.amount || 1, item.portion?.unit || 'g');
          const newGrams = convertToGrams(newAmount, newUnit);
          const scaleFactor = newGrams / originalGrams;

          // Scale all nutrition values
          const scaledMacros = {};
          Object.keys(item.macros || {}).forEach(key => {
            scaledMacros[key] = (item.macros[key] || 0) * scaleFactor;
          });

          const scaledMicros = {};
          Object.keys(item.micros || {}).forEach(key => {
            const value = parseFloat(item.micros[key]) || 0;
            const unit = item.micros[key]?.match(/[a-z]+/i)?.[0] || '';
            scaledMicros[key] = `${(value * scaleFactor).toFixed(1)}${unit}`;
          });

          return {
            ...item,
            portion: {
              amount: newAmount,
              unit: newUnit,
              gramsEquivalent: newGrams,
              servingText: `${newAmount}${newUnit}`
            },
            macros: scaledMacros,
            micros: scaledMicros,
            editedPortion: { amount: newAmount, unit: newUnit }
          };
        }
        return item;
      });

      // Recalculate totals
      const newTotals = calculateTotals(updatedItems);

      return {
        ...prev,
        items: updatedItems,
        totals: newTotals
      };
    });
  }, []);

  const removeItem = useCallback((itemId) => {
    setAnalysisResult(prev => {
      if (!prev) return null;

      const updatedItems = prev.items.filter(item => item.itemId !== itemId);

      if (updatedItems.length === 0) {
        return null; // Clear all if no items left
      }

      return {
        ...prev,
        items: updatedItems,
        totals: calculateTotals(updatedItems)
      };
    });
  }, []);

  /* -------- TEXT -------- */

  const analyzeText = useCallback(async (text) => {
    if (!text?.trim()) throw new Error('Please describe your meal');

    setIsAnalyzing(true);
    setError(null);
    setProgress(10);

    const started = Date.now();
    const timeLeft = () => TOTAL_BUDGET_MS - (Date.now() - started);

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication required');

      const intent = classifyText(text);

      /* ---- USDA FIRST ---- */
      if (timeLeft() > 300) {
        setProgress(30);

        try {
          const { res, json } = await fetchWithTimeout(
            USDA_ENDPOINT,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ query: text }),
            },
            USDA_TIMEOUT_MS
          );

          if (res.ok && json?.data) {
            const confidence = json.confidence ?? 0.8;

            if (confidence >= 0.78 || intent.isSingleFood) {
              setProgress(80);
              return buildFoodLog({
                inputText: text,
                source: 'usda',
                raw: json.data,
              });
            }
          }
        } catch {
          // Silent fallback
        }
      }

      /* ---- AI FALLBACK ---- */
      if (timeLeft() < 300) {
        throw new Error('Analysis timed out. Try a shorter description.');
      }

      setProgress(60);

      const { res, json } = await fetchWithTimeout(
        AI_TEXT_ENDPOINT,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text }),
        },
        AI_TIMEOUT_MS
      );

      if (!res.ok) {
        throw new Error(
          json?.error ||
          'Could not understand this meal. Try adding quantities.'
        );
      }

      setProgress(95);

      return buildFoodLog({
        inputText: text,
        source: 'ai',
        raw: json.data || json,
      });
    } catch (err) {
      setError(err.message || 'Analysis failed');
      throw err;
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), 400);
    }
  }, [getToken]);

  /* -------- PHOTO -------- */

  const analyzePhoto = useCallback(async (uri) => {
    if (!uri) throw new Error('Image required');

    setIsAnalyzing(true);
    setError(null);
    setProgress(10);

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication required');

      const base64 = await compressImage(uri);
      setProgress(60);

      const { res, json } = await fetchWithTimeout(
        AI_IMAGE_ENDPOINT,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ image: base64 }),
        },
        2500
      );

      if (!res.ok) {
        throw new Error(json?.error || 'Image analysis failed');
      }

      setProgress(95);

      const foodLog = buildFoodLog({
        inputText: 'Photo',
        source: 'photo',
        raw: json.data || json,
      });

      foodLog.imageUrl = uri;
      return foodLog;
    } catch (err) {
      setError(err.message || 'Photo analysis failed');
      throw err;
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), 400);
    }
  }, [getToken]);

  return {
    // Legacy single-item analysis
    analyzeText,
    analyzePhoto,

    // Multi-item analysis state
    analysisResult,
    setAnalysisResult,
    inputText,
    setInputText,

    // Multi-item methods
    updateItemQuantity,
    removeItem,

    // Shared state
    isAnalyzing,
    progress,
    error,
    clearError: () => setError(null),
  };
}
