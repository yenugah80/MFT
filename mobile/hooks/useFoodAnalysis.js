/**
 * useFoodAnalysis Hook
 * Orchestrates food analysis from multiple sources: Open Food Facts (barcode/text) -> USDA (text) -> AI (text/image)
 * Safe, fast, predictable, production-ready
 * Secure API key handling
 * + Multi-item breakdown with auto-analysis
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '@clerk/clerk-expo';
import { API_URL } from '../constants/api';
import { calculateNetCarbs } from '../types/foodLog';
import Constants from 'expo-constants'; // Import Constants
import { normalizeNutritionData, detectAggregatedData } from '../utils/nutritionNormalizer';

/* ---------------- CONFIG ---------------- */

const TOTAL_BUDGET_MS = 2000;
const USDA_TIMEOUT_MS = 650;
const AI_TIMEOUT_MS = 1600;

const OPEN_FOOD_FACTS_API_URL = 'https://world.openfoodfacts.org/api/v2/product/';
const OPEN_FOOD_FACTS_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const OPEN_FOOD_FACTS_API_KEY = Constants.expoConfig.extra.openFoodFactsApiKey; // Loaded from .env via app.config.js

const USDA_ENDPOINT = `${API_URL}/food/resolve`;
const AI_TEXT_ENDPOINT = `${API_URL}/nutrition/recipe/parse`;
const AI_IMAGE_ENDPOINT = `${API_URL}/food/analyze-image`;
const OPEN_FOOD_FACTS_TIMEOUT_MS = 1400;

/* ---------------- HELPERS ---------------- */

// Detect if text looks like a single food or a meal
// This helps in deciding whether to prioritize a single-item lookup (like USDA)
// or a multi-item parsing (like AI recipe analysis).
function classifyText(text) {
  const t = text.toLowerCase().trim();
  const wordCount = t.split(/\s+/).length;
  const hasSeparators = /,|and|with|\+/.test(t);
  const hasNumbers = /\d/.test(t);
  const hasKeywords = /(g|gram|mg|ml|cup|tbsp|tsp|oz|lb|slice|piece|serving)/.test(t);

  // A simple heuristic: if few words, no separators, and no explicit quantities, it's likely a single food name.
  // This can be refined with NLP if needed.

  return {
    isSingleFood: wordCount <= 3 && !hasSeparators && !hasKeywords,
  };
}

// Timeout-safe fetch
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  options.headers = { ...options.headers, 'Cache-Control': 'no-cache' }; // Prevent stale responses

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
  // Ensure raw data is always an object
  if (typeof raw !== 'object' || raw === null) {
    raw = {};
  }
  const aggregation = detectAggregatedData(raw);
  if (aggregation?.isAggregated) {
    console.warn('[useFoodAnalysis] Aggregated data detected');
  }

  const n = normalizeNutritionData(raw);

  return {
    timestamp: Date.now(),
    status: 'pending',
    source,
    foodName: raw.foodName || raw.name || inputText || 'Unknown Food', // Provide a fallback
    servingSize: raw.servingSize || '1 serving',
    calories: n.calories,
    protein: n.protein,
    carbs: n.carbs,
    fat: n.fat,
    fiber: n.fiber,
    sugar: n.sugar,
    sugarAlcohols: n.sugarAlcohols,
    netCarbs: calculateNetCarbs(n), // Ensure n has carbs, fiber, sugarAlcohols
    micronutrients: n.micronutrients, // This might be a legacy field, keeping for now
    micros: (() => {
      const microsWithUnits = {};
      Object.entries(n.micros || {}).forEach(([key, value]) => {
        // Infer units for AI-generated micros if not explicitly provided by normalizeNutritionData
        let unit = '';
        if (key.toLowerCase().includes('calcium') || key.toLowerCase().includes('iron') || key.toLowerCase().includes('potassium') || key.toLowerCase().includes('sodium') || key.toLowerCase().includes('magnesium') || key.toLowerCase().includes('zinc')) {
          unit = 'mg';
        } else if (key.toLowerCase().includes('vitamin')) {
          if (key.toLowerCase().includes('a') || key.toLowerCase().includes('d') || key.toLowerCase().includes('e') || key.toLowerCase().includes('k')) {
            unit = 'µg'; // or IU for some vitamins
          } else {
            unit = 'mg';
          }
        }
        microsWithUnits[key] = { value: parseFloat(value.toFixed(2)), unit: unit };
      });
      return microsWithUnits;
    })(),

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
  let manipulateAsync, SaveFormat;
  try {
    const mod = await import('expo-image-manipulator');
    manipulateAsync = mod.manipulateAsync;
    SaveFormat = mod.SaveFormat;
  } catch (e) {
    throw new Error('Image compression unavailable. Install expo-image-manipulator and run on a real device.');
  }

  if (!FileSystem.readAsStringAsync) {
    throw new Error('Photo analysis unavailable: expo-file-system missing. Install expo-file-system and rebuild on device.');
  }

  const result = await manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    { compress: 0.7, format: SaveFormat.JPEG }
  );

  const encoding = (FileSystem?.EncodingType && FileSystem.EncodingType.Base64) ? FileSystem.EncodingType.Base64 : 'base64';

  const base64 = await FileSystem.readAsStringAsync(result.uri, { encoding });

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
    'serving': 100, // Default assumption if no specific serving size is known
  };

  return amount * (conversions[unit.toLowerCase()] || 100);
}

// New helper function for Open Food Facts
function mapOpenFoodFactsProductToAnalysisResult(product, inputText) {
  // Ensure product is always an object
  if (typeof product !== 'object' || product === null) {
    product = {};
  }
  if (!product) return null;

  const nutrients = product.nutriments || {};
  const servingSizeText = product.serving_size || '';

  let portionAmount = 1;
  let portionUnit = 'serving';
  let gramsEquivalent = 100; // Default if no specific serving size or 100g data

  // Try to parse serving_size string
  const servingMatch = servingSizeText.match(/(\d+(\.\d+)?)\s*([a-zA-Z]+)?/);
  if (servingMatch) {
    portionAmount = parseFloat(servingMatch[1]);
    portionUnit = servingMatch[3] ? servingMatch[3].toLowerCase() : 'unit';
  } else if (nutrients['energy-kcal_serving']) {
    // If serving_size string is not clear, but _serving nutrients exist, assume 1 serving
    portionAmount = 1;
    portionUnit = 'serving';
  } else {
    // Default to 100g if no serving info
    portionAmount = 100;
    portionUnit = 'g';
  }

  // Determine if we should use _serving or _100g values
  const useServingNutrients = nutrients['energy-kcal_serving'] !== undefined;

  const getNutrientValue = (nutrientKey, type = 'macro') => {
    const key = useServingNutrients ? `${nutrientKey}_serving` : `${nutrientKey}_100g`;
    const unitKey = `${nutrientKey}_unit`;
    const value = nutrients[key] !== undefined ? nutrients[key] : 0; // Ensure 0 for missing
    const unit = nutrients[unitKey] || (type === 'macro' ? '' : (nutrientKey === 'sodium' ? 'mg' : 'µg')); // Default micro units

    if (type === 'macro') {
      return parseFloat(value.toFixed(2));
    } else { // type === 'micro'
      return { value: parseFloat(value.toFixed(2)), unit: unit };
    }
  };

  // Common micronutrients to extract
  // Define common micronutrients and their corresponding Open Food Facts keys
  const commonMicros = { calcium: 'calcium', iron: 'iron', vitaminA: 'vitamin-a', vitaminC: 'vitamin-c', potassium: 'potassium', sodium: 'sodium', magnesium: 'magnesium', zinc: 'zinc', vitaminD: 'vitamin-d', vitaminE: 'vitamin-e', vitaminK: 'vitamin-k', vitaminB1: 'vitamin-b1', vitaminB2: 'vitamin-b2', vitaminB3: 'vitamin-b3', vitaminB6: 'vitamin-b6', vitaminB9: 'vitamin-b9', vitaminB12: 'vitamin-b12' };

  const micros = {};
  Object.entries(commonMicros).forEach(([appKey, offKey]) => {
    const microData = getNutrientValue(offKey, 'micro'); // This returns { value, unit }
    if (microData.value > 0) {
      micros[appKey] = microData; // Store as { value, unit }
    }
  });

  // Calculate gramsEquivalent based on the determined portion
  if (useServingNutrients && servingMatch) {
    gramsEquivalent = convertToGrams(portionAmount, portionUnit);
  } else if (!useServingNutrients && portionUnit === 'g' && portionAmount === 100) {
    gramsEquivalent = 100; // Already per 100g
  } else {
    gramsEquivalent = convertToGrams(portionAmount, portionUnit);
  }

  return {
    itemId: product.code || product.id,
    name: product.product_name || product.generic_name || inputText || 'Unknown Food Product',
    portion: {
      amount: portionAmount,
      unit: portionUnit,
      gramsEquivalent: gramsEquivalent,
      servingText: servingSizeText || `${portionAmount} ${portionUnit}`
    },
    macros: {
      calories_kcal: getNutrientValue('energy-kcal'),
      protein_g: getNutrientValue('proteins'),
      carbs_g: getNutrientValue('carbohydrates'),
      fat_g: getNutrientValue('fat'),
      fiber_g: getNutrientValue('fiber'),
      sugar_g: getNutrientValue('sugars'),
      sodium_mg: getNutrientValue('sodium', 'macro'), // Sodium as a macro for display (often listed as such)
    },
    micros: micros, // Now micros contains numbers
    netCarbs: calculateNetCarbs({
      carbs: getNutrientValue('carbohydrates'),
      fiber: getNutrientValue('fiber'),
      sugarAlcohols: getNutrientValue('polyols') // Open Food Facts uses 'polyols' for sugar alcohols
    }),
    sourceEvidence: [{
      source: 'Open Food Facts',
      confidence: 0.95,
      data: {
        product_url: product.url,
        image_url: product.image_url,
        brands: product.brands,
        categories: product.categories,
      },
    }],
  };
}

// Direct Open Food Facts fetcher (text + barcode)
async function fetchFromOpenFoodFacts(query, mode = 'text') {
  const searchTerm = (query || '').toString().trim();
  if (!searchTerm) return null;

  const headers = {
    'User-Agent': 'MyFoodTracker/1.0 (+mobile-app)',
    ...(OPEN_FOOD_FACTS_API_KEY ? { 'X-OpenFoodFacts-Api-Key': OPEN_FOOD_FACTS_API_KEY } : {}),
  };

  try {
    if (mode === 'barcode') {
      const url = `${OPEN_FOOD_FACTS_API_URL}${encodeURIComponent(searchTerm)}.json?fields=code,product_name,generic_name,brands,categories,nutriments,serving_size,url,image_url`;
      const { res, json } = await fetchWithTimeout(
        url,
        { method: 'GET', headers },
        OPEN_FOOD_FACTS_TIMEOUT_MS
      );

      if (!res.ok || json?.status !== 1 || !json?.product) return null;
      return mapOpenFoodFactsProductToAnalysisResult(json.product, searchTerm);
    }

    const params = new URLSearchParams({
      search_terms: searchTerm,
      search_simple: '1',
      json: '1',
      page_size: '1',
      fields: 'code,product_name,generic_name,brands,categories,nutriments,serving_size,url,image_url',
      sort_by: 'unique_scans_n',
    });

    const { res, json } = await fetchWithTimeout(
      `${OPEN_FOOD_FACTS_SEARCH_URL}?${params.toString()}`,
      { method: 'GET', headers },
      OPEN_FOOD_FACTS_TIMEOUT_MS
    );

    if (!res.ok || !json?.products?.length) return null;

    const product =
      json.products.find((p) => p?.nutriments) ||
      json.products[0];

    if (!product?.nutriments) return null;

    return mapOpenFoodFactsProductToAnalysisResult(product, searchTerm);
  } catch (err) {
    console.warn('[useFoodAnalysis] Open Food Facts lookup failed', err);
    return null;
  }
}

// Map backend barcode product response into analysis item
function mapBackendProductToAnalysisResult(product, inputText) {
  if (typeof product !== 'object' || product === null) return null;

  const servingSizeText = product.servingSize || '';
  const servingMatch = servingSizeText.match(/(\d+(\.\d+)?)\s*([a-zA-Z]+)?/);
  const portionAmount = servingMatch ? parseFloat(servingMatch[1]) : 100;
  const portionUnit = servingMatch ? (servingMatch[3]?.toLowerCase() || 'g') : 'g';
  const gramsEquivalent = convertToGrams(portionAmount, portionUnit || 'g');

  const parseMicro = (val) => {
    if (!val || typeof val !== 'string') return null;
    const m = val.match(/([\d.]+)/);
    const unit = val.replace(/[\d.\s]/g, '') || '';
    return m ? { value: parseFloat(m[1]), unit } : null;
  };

  const macros = {
    calories_kcal: Number.isFinite(product.calories) ? product.calories : 0,
    protein_g: Number.isFinite(product.protein) ? product.protein : 0,
    carbs_g: Number.isFinite(product.carbs) ? product.carbs : 0,
    fat_g: Number.isFinite(product.fat) ? product.fat : 0,
    fiber_g: Number.isFinite(product.fiber) ? product.fiber : 0,
    sugar_g: Number.isFinite(product.sugar) ? product.sugar : 0,
    sodium_mg: Number.isFinite(product.sodium) ? product.sodium : 0,
  };

  const micros = {};
  Object.entries(product.micros || {}).forEach(([key, val]) => {
    const parsed = typeof val === 'number' ? { value: val, unit: '' } : parseMicro(val);
    if (parsed && Number.isFinite(parsed.value)) {
      micros[key] = parsed;
    }
  });

  return {
    itemId: product.id || product.code || inputText,
    name: product.title || product.product_name || inputText || 'Unknown Product',
    portion: {
      amount: portionAmount,
      unit: portionUnit,
      gramsEquivalent,
      servingText: servingSizeText || `${portionAmount}${portionUnit}`,
    },
    macros,
    micros,
    netCarbs: calculateNetCarbs({
      carbs: macros.carbs_g,
      fiber: macros.fiber_g,
      sugarAlcohols: macros.sugarAlcohols_g || 0,
    }),
    sourceEvidence: [{
      source: product.source || 'openfoodfacts',
      confidence: 0.9,
      data: {
        image_url: product.image,
        brand: product.description,
        category: product.category,
      },
    }],
  };
}

// Calculate totals from items array
function calculateTotals(items) {
  if (!items || items.length === 0) {
    return {
      macros: { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 },
      micros: {} // Initialize as empty object, will be populated with formatted strings
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
      sodium_mg: 0,
    },
    micros: {}, // Will store { value: number, unit: string } for each micro
  }; // Initialize as empty object, will be populated with formatted strings

  items.forEach(item => {
    // Sum macros
    Object.keys(totals.macros).forEach(key => {
      totals.macros[key] += item.macros?.[key] || 0;
    });

    // Sum micros (now assuming they are { value, unit } objects)
    if (item.micros) {
      Object.keys(item.micros).forEach(key => {
        const microItem = item.micros[key];
        if (microItem && typeof microItem.value === 'number' && !isNaN(microItem.value)) { // Ensure value is a valid number
          // Initialize if not present, or update value
          totals.micros[key] = totals.micros[key] || { value: 0, unit: '' };
          totals.micros[key].value += microItem.value; // Sum the numerical values

          // Take the unit from the first item that has it
          if (!totals.micros[key].unit && microItem.unit) {
            totals.micros[key].unit = microItem.unit;
          }
        }
      });
    }
  });

  // Format micros back to strings with units
  Object.keys(totals.micros).forEach(key => {
    const microTotal = totals.micros[key]; // This is { value: number, unit: string }
    if (microTotal && typeof microTotal.value === 'number') {
      totals.micros[key] = `${microTotal.value.toFixed(1)}${microTotal.unit}`;
    } else {
      totals.micros[key] = '0'; // Default if no value
    }
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
  const abortControllerRef = useRef(null); // Declare abortControllerRef here
  const barcodeCacheRef = useRef({});

  const analyzeTextUniversal = useCallback(async (text) => {
    if (!text?.trim()) return;

    try { // Main try-catch for the entire analysis flow
      setIsAnalyzing(true);
      setError(null);
      setProgress(10);

      // 1. Try Open Food Facts first for text queries
      setProgress(20); // Indicate progress for OFF lookup
      const offResult = await fetchFromOpenFoodFacts(text, 'text');
      if (offResult) { // If OFF finds a product, use it and skip AI
        setAnalysisResult({
          items: [{
            ...offResult,
            isEditing: false,
            editedPortion: null
          }],
          totals: calculateTotals([offResult]) // Calculate totals for a single item
        });
        setProgress(100);
        return; // Found in Open Food Facts, so we're done
      }

      // 2. If not found in Open Food Facts, proceed with existing API_URL/food/resolve (your backend AI)
      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setProgress(30);

      const token = await getToken();
      if (!token) throw new Error('Authentication required');

      setProgress(50); // Progress for AI backend call

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

      if (!response.ok) { // Handle non-2xx responses from your backend
        const json = await response.json().catch(() => ({}));
        throw new Error(json?.error || 'Analysis failed');
      }

      const data = await response.json();

      setProgress(90);
      // Transform backend response into the expected analysisResult structure
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
    } catch (err) { // Catch any errors during the entire analysis process
      if (err.name !== 'AbortError') { // Ignore abort errors (user typed something new)
        setError(err.message || 'Analysis failed. Please try again.'); // More user-friendly message
        console.error('[useFoodAnalysis] Universal text analysis error:', err);
      }
    } finally {
      setIsAnalyzing(false); // This should be set to false only if no other analysis is pending
      setTimeout(() => setProgress(0), 400);
    }
  }, [getToken, fetchFromOpenFoodFacts]);

  /* -------- BARCODE -------- */

  const analyzeBarcode = useCallback(async (barcode) => {
    const code = (barcode || '').trim();
    if (!code) throw new Error('Barcode is required for analysis.');

    if (barcodeCacheRef.current[code]) {
      const cached = barcodeCacheRef.current[code];
      setAnalysisResult(cached);
      return cached;
    }

    setIsAnalyzing(true);
    setError(null);
    setProgress(10);

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication required to analyze barcode.');

      let productItem = null;

      // 1) Try backend BFF
      try {
        setProgress(25);
        const res = await fetch(`${API_URL}/food/barcode/${encodeURIComponent(code)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 404) {
          productItem = null;
        } else if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || 'Barcode lookup failed.');
        } else {
          const data = await res.json();
          productItem = mapBackendProductToAnalysisResult(data, code);
        }
      } catch (err) {
        console.warn('[useFoodAnalysis] Backend barcode lookup failed, falling back to OFF', err);
      }

      // 2) Fallback to Open Food Facts directly
      if (!productItem) {
        setProgress(50);
        productItem = await fetchFromOpenFoodFacts(code, 'barcode');
      }

      if (!productItem) {
        throw new Error('No product found for this barcode. Try another code or scan again.');
      }

      const resultPayload = {
        items: [{
          ...productItem,
          isEditing: false,
          editedPortion: null,
        }],
        totals: calculateTotals([productItem]),
      };

      barcodeCacheRef.current[code] = resultPayload;
      setAnalysisResult(resultPayload);
      setProgress(100);
      return resultPayload;
    } catch (err) {
      setError(err.message || 'Barcode analysis failed. Please try again.');
      throw err;
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), 400);
    }
  }, [getToken, fetchFromOpenFoodFacts]);

  /* -------- DEBOUNCE EFFECTS -------- */

  // Debounce input text (1.5s delay after user stops typing)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (inputText.trim()) {
      debounceTimerRef.current = setTimeout(() => { // Debounce text input
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
    if (debouncedText.trim() && !isAnalyzing) { // Only analyze if not already analyzing
      analyzeTextUniversal(debouncedText);
    }
  }, [debouncedText, isAnalyzing, analyzeTextUniversal]);

  /* -------- QUANTITY EDITING -------- */

  const updateItemQuantity = useCallback((itemId, newAmount, newUnit) => {
    setAnalysisResult(prev => {
      if (!prev) return null;

      const updatedItems = prev.items.map(item => {
        if (item.itemId === itemId) {
          // Calculate scaling factor based on grams equivalent for accuracy
          const originalGrams = item.portion?.gramsEquivalent || convertToGrams(item.portion?.amount || 1, item.portion?.unit || 'g');
          const newGrams = convertToGrams(newAmount, newUnit);
          const scaleFactor = originalGrams > 0 ? newGrams / originalGrams : 0; // Avoid division by zero

          // Scale all nutrition values
          const scaledMacros = {};
          Object.keys(item.macros || {}).forEach(key => {
            scaledMacros[key] = (item.macros[key] || 0) * scaleFactor;
          });

          const scaledMicros = {};
          Object.keys(item.micros || {}).forEach(key => { // Iterate over existing micros
            const micro = item.micros[key];
            scaledMicros[key] = { value: (micro.value || 0) * scaleFactor, unit: micro.unit || '' };
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
            editedPortion: { amount: newAmount, unit: newUnit } // Track edited state
          };
        }
        return item;
      });

      // Recalculate totals
      const newTotals = calculateTotals(updatedItems);

      return {
        ...prev, // Keep other properties of analysisResult
        items: updatedItems,
        totals: newTotals
      };
    });
  }, []);

  const removeItem = useCallback((itemId) => {
    setAnalysisResult(prev => {
      if (!prev) return null;

      const updatedItems = prev.items.filter(item => item.itemId !== itemId);

      if (updatedItems.length === 0) { // If no items left, clear the entire analysis
        return null; // Clear all if no items left
      }

      return {
        ...prev,
        items: updatedItems,
        totals: calculateTotals(updatedItems) // Recalculate totals for remaining items
      };
    });
  }, []);

  /* -------- TEXT -------- */

  const runAnalysis = useCallback(async () => {
    const text = inputText.trim();
    if (!text) {
      setError('Please describe your meal to analyze.'); // More specific error
      return;
    }
    await analyzeTextUniversal(text);
  }, [inputText, analyzeTextUniversal]);

  const analyzeText = useCallback(async (text) => {
    if (!text?.trim()) throw new Error('Please describe your meal');

    setIsAnalyzing(true); // Start loading state
    setError(null);
    setProgress(10);

    const started = Date.now();
    const timeLeft = () => TOTAL_BUDGET_MS - (Date.now() - started);

    try {
      const token = await getToken(); // Ensure authentication
      if (!token) throw new Error('Authentication required');

      const intent = classifyText(text);

      /* ---- USDA FIRST ---- */
      if (timeLeft() > 300) {
        setProgress(30);
        // Attempt USDA lookup
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

          if (res.ok && json?.data) { // If USDA provides data
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
          // Silent fallback to AI if USDA fails or times out
        }
      }

      /* ---- AI FALLBACK ---- */
      if (timeLeft() < 300) {
        throw new Error('Analysis timed out. Try a shorter description.');
      } // If not enough time left, throw timeout error

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

      if (!res.ok) { // Handle non-2xx responses from AI
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
      setError(err.message || 'Analysis failed. Please try again.'); // Consistent error message
      throw err;
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), 400);
    }
  }, [getToken]);

  /* -------- PHOTO -------- */

  const analyzePhoto = useCallback(async (uri, barcode = null) => {
    if (barcode) {
      return analyzeBarcode(barcode);
    }
    if (!uri) throw new Error('Image URI is required for analysis.'); // More precise check

    setIsAnalyzing(true);
    setError(null);
    setProgress(10);

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication required to analyze photo.');

      // Proceed with AI image analysis
      setProgress(40);

      let base64;
      try {
        base64 = await compressImage(uri); // Compress image before sending
      } catch (e) {
        setError(e.message);
        throw e;
      }
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
        throw new Error(json?.error || 'Image analysis failed. Please try a clearer photo.'); // More specific error
      }

      setProgress(95);

      const rawAIData = json.data || json;
      const foodLog = buildFoodLog({ // buildFoodLog returns a single item
        inputText: 'Photo',
        source: 'photo',
        raw: rawAIData,
      });

      foodLog.imageUrl = uri;

      // Convert the single foodLog into the multi-item analysisResult format
      const aiItem = {
        itemId: foodLog.foodName + '-' + Date.now(), // Generate a unique ID
        name: foodLog.foodName,
        portion: {
          amount: parseFloat(foodLog.servingSize.match(/(\d+(\.\d+)?)/)?.[1] || 1),
          unit: foodLog.servingSize.match(/[a-zA-Z]+/)?.[0] || 'serving',
          gramsEquivalent: convertToGrams(
            parseFloat(foodLog.servingSize.match(/(\d+(\.\d+)?)/)?.[1] || 1),
            foodLog.servingSize.match(/[a-zA-Z]+/)?.[0] || 'serving'
          ),
          servingText: foodLog.servingSize
        },
        macros: {
          calories_kcal: foodLog.calories,
          protein_g: foodLog.protein,
          carbs_g: foodLog.carbs,
          fat_g: foodLog.fat,
          fiber_g: foodLog.fiber,
          sugar_g: foodLog.sugar,
          sodium_mg: foodLog.micros?.sodium?.value || 0, // Assuming sodium is { value, unit }
        }, // Macros remain numbers
        micros: foodLog.micros, // These should be numbers now from buildFoodLog
        netCarbs: foodLog.netCarbs, // Add netCarbs from buildFoodLog
        sourceEvidence: [{ source: 'Image AI', confidence: 0.7, data: { imageUrl: uri, raw: rawAIData } }],
        isEditing: false,
        editedPortion: null
      };

      setAnalysisResult({
        items: [aiItem],
        totals: calculateTotals([aiItem])
      });

    } catch (err) {
      setError(err.message || 'Photo analysis failed. Please try again.'); // Consistent error message
      throw err;
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), 400);
    }
  }, [getToken, analyzeBarcode, buildFoodLog, calculateNetCarbs, compressImage]);

  return {
    // Legacy single-item analysis
    analyzeText,
    analyzePhoto,
    analyzeBarcode,

    // Multi-item analysis state
    analysisResult,
    setAnalysisResult,
    inputText,
    setInputText,

    // Multi-item methods
    updateItemQuantity,
    removeItem,
    runAnalysis,

    // Shared state
    isAnalyzing,
    progress,
    error,
    clearError: () => setError(null),
  };
}
