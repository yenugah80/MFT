/**
 * useFoodAnalysis Hook
 * Enterprise-grade food analysis orchestrator
 *
 * Data Sources (Priority Order):
 * 1. Open Food Facts - Barcode & text search (free, fast, accurate)
 * 2. Backend BFF - Cached products & USDA integration
 * 3. USDA FoodData Central - via backend
 * 4. AI Analysis - GPT-4o-mini for complex meals & images
 *
 * Features:
 * - Multi-source cascading fallback
 * - Multi-item meal breakdown
 * - Quantity editing with macro scaling
 * - Debounced auto-analysis (1.5s)
 * - Request cancellation (abort previous)
 * - Barcode caching
 * - Image compression
 * - Progress tracking
 *
 * @module hooks/useFoodAnalysis
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { useAuth } from '@clerk/clerk-expo';
import Constants from 'expo-constants';
import { API_URL } from '../constants/api';
import { calculateNetCarbs } from '../types/foodLog';
import { normalizeNutritionData, detectAggregatedData } from '../utils/nutritionNormalizer';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Total analysis budget (all sources combined) */
const TOTAL_ANALYSIS_BUDGET_MS = 2000;

/** USDA API timeout */
const USDA_TIMEOUT_MS = 650;

/** AI API timeout - Increased for enhanced 97% accuracy prompts */
const AI_TIMEOUT_MS = 8000; // 8 seconds (was 1600ms)

/** Open Food Facts timeout */
const OPEN_FOOD_FACTS_TIMEOUT_MS = 1400;

/** Image analysis timeout - Increased for GPT-4o vision */
const IMAGE_ANALYSIS_TIMEOUT_MS = 20000; // 20 seconds (was 12s)

/** Auto-analysis debounce delay (after user stops typing) */
const AUTO_ANALYSIS_DEBOUNCE_MS = 1500;

/** Fade progress bar delay */
const PROGRESS_FADE_DELAY_MS = 400;

/** Image compression width */
const IMAGE_MAX_WIDTH_PX = 1024;

/** Image compression quality (0-1) */
const IMAGE_COMPRESSION_QUALITY = 0.7;

/** Minimum confidence for USDA single-food detection */
const USDA_CONFIDENCE_THRESHOLD = 0.78;

/** Maximum words for single-food classification */
const SINGLE_FOOD_MAX_WORDS = 3;

/** Open Food Facts API */
const OPEN_FOOD_FACTS_API_URL = 'https://world.openfoodfacts.org/api/v2/product/';
const OPEN_FOOD_FACTS_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const OPEN_FOOD_FACTS_API_KEY = Constants.expoConfig?.extra?.openFoodFactsApiKey;

/** Backend API endpoints */
const USDA_ENDPOINT = `${API_URL}/food/resolve`;
const AI_TEXT_ENDPOINT = `${API_URL}/nutrition/recipe/parse`;
const AI_IMAGE_ENDPOINT = `${API_URL}/food/analyze-image`;
const BACKEND_BARCODE_ENDPOINT = `${API_URL}/food/barcode`;

const OCR_MIN_TEXT_LENGTH = 40;
const OCR_KEYWORDS = ['calories', 'protein', 'carb', 'fat', 'serving', 'nutrition', 'sodium', 'fiber', 'sugar'];

// ============================================================================
// TYPE DEFINITIONS (JSDoc)
// ============================================================================

/**
 * @typedef {Object} AnalysisItem
 * @property {string} itemId - Unique identifier
 * @property {string} name - Food name
 * @property {Portion} portion - Serving information
 * @property {Macros} macros - Macronutrients
 * @property {Object.<string, Micro>} micros - Micronutrients
 * @property {number|null} netCarbs - Calculated net carbs
 * @property {Array<SourceEvidence>} sourceEvidence - Data provenance
 * @property {boolean} isEditing - UI state
 * @property {Object|null} editedPortion - User-edited portion
 */

/**
 * @typedef {Object} Portion
 * @property {number} amount - Quantity
 * @property {string} unit - Unit (g, oz, cup, serving, etc.)
 * @property {number} gramsEquivalent - Amount in grams
 * @property {string} servingText - Human-readable serving size
 */

/**
 * @typedef {Object} Macros
 * @property {number|null} calories_kcal - Calories
 * @property {number|null} protein_g - Protein in grams
 * @property {number|null} carbs_g - Carbs in grams
 * @property {number|null} fat_g - Fat in grams
 * @property {number|null} fiber_g - Fiber in grams
 * @property {number|null} sugar_g - Sugar in grams
 * @property {number|null} sodium_mg - Sodium in mg
 */

/**
 * @typedef {Object} Micro
 * @property {number} value - Micronutrient value
 * @property {string} unit - Unit (mg, µg, etc.)
 */

/**
 * @typedef {Object} AnalysisResult
 * @property {Array<AnalysisItem>} items - Food items in the meal
 * @property {Object} totals - Aggregated nutrition totals
 * @property {Macros} totals.macros - Total macros
 * @property {Object.<string, Micro>} totals.micros - Total micros
 */

// ============================================================================
// PURE UTILITY FUNCTIONS
// ============================================================================

/**
 * Detect meal type based on current time
 * @returns {'breakfast'|'lunch'|'dinner'|'snack'} Meal type
 */
function getMealTypeFromTime() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 17) return 'snack';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'snack';
}

function looksLikeNutritionLabel(text) {
  if (!text || text.length < OCR_MIN_TEXT_LENGTH) return false;
  const lower = text.toLowerCase();
  return OCR_KEYWORDS.some((keyword) => lower.includes(keyword));
}

/**
 * Classify text as single food vs multi-item meal
 * @param {string} text - Input text
 * @returns {{isSingleFood: boolean}} Classification result
 */
function classifyText(text) {
  const normalized = text.toLowerCase().trim();
  const wordCount = normalized.split(/\s+/).length;
  const hasSeparators = /,|and|with|\+/.test(normalized);
  const hasQuantities = /\d+\s*(g|gram|mg|ml|cup|tbsp|tsp|oz|lb|slice|piece|serving)/.test(normalized);

  // Heuristic: Short text without separators or quantities = likely single food
  return {
    isSingleFood: wordCount <= SINGLE_FOOD_MAX_WORDS && !hasSeparators && !hasQuantities,
  };
}

/**
 * Convert various units to grams
 * @param {number} amount - Quantity
 * @param {string} unit - Unit of measurement
 * @returns {number|null} Amount in grams, or null if unknown unit
 */
function convertToGrams(amount, unit) {
  const conversions = {
    'g': 1,
    'gram': 1,
    'grams': 1,
    'kg': 1000,
    'kilogram': 1000,
    'oz': 28.35,
    'ounce': 28.35,
    'lb': 453.59,
    'pound': 453.59,
    'ml': 1, // Approximate for water-like liquids
    'milliliter': 1,
    'l': 1000,
    'liter': 1000,
    'cup': 240,
    'tbsp': 15,
    'tablespoon': 15,
    'tsp': 5,
    'teaspoon': 5,
    'serving': 100, // Default assumption
  };

  const normalizedUnit = (unit || '').toLowerCase().trim();
  const factor = conversions[normalizedUnit];

  return factor ? amount * factor : null;
}

/**
 * Timeout-safe fetch wrapper
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<{res: Response, json: Object}>} Response and parsed JSON
 */
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  options.headers = {
    ...options.headers,
    'Cache-Control': 'no-cache',
  };

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    const json = await res.json().catch(() => ({}));

    return { res, json };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse micronutrient string value
 * @param {string|number} val - Micro value (e.g., "80mg", 80)
 * @returns {Micro|null} Parsed micro with value and unit
 */
function parseMicronutrient(val) {
  if (val === null || val === undefined) return null;

  if (typeof val === 'number') {
    return { value: val, unit: '' };
  }

  if (typeof val !== 'string') return null;

  const match = val.match(/([\d.]+)/);
  const unit = val.replace(/[\d.\s]/g, '').trim();

  return match ? {
    value: parseFloat(match[1]),
    unit: unit || '',
  } : null;
}

// ============================================================================
// DATA NORMALIZATION FUNCTIONS
// ============================================================================

/**
 * Build normalized FoodLog from raw API data
 * @param {Object} params - Build parameters
 * @param {string} params.inputText - Original user input
 * @param {string} params.source - Data source (usda, ai, photo, openfoodfacts)
 * @param {Object} params.raw - Raw API response
 * @returns {Object} Normalized food log
 */
function buildFoodLog({ inputText, source, raw }) {
  // Ensure raw data is an object
  if (typeof raw !== 'object' || raw === null) {
    raw = {};
  }

  // Check for aggregated data
  const aggregation = detectAggregatedData(raw);
  if (aggregation?.isAggregated) {
    console.warn('[useFoodAnalysis] Aggregated data detected - ensure proper multi-item handling');
  }

  // Normalize nutrition data
  const normalized = normalizeNutritionData(raw);

  // Extract micronutrients with units
  const micros = {};
  Object.entries(normalized.micros || {}).forEach(([key, value]) => {
    // Infer units if not provided
    let unit = '';
    const keyLower = key.toLowerCase();

    if (['calcium', 'iron', 'potassium', 'sodium', 'magnesium', 'zinc'].some(m => keyLower.includes(m))) {
      unit = 'mg';
    } else if (keyLower.includes('vitamin')) {
      unit = ['a', 'd', 'e', 'k'].some(v => keyLower.includes(v)) ? 'µg' : 'mg';
    }

    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      micros[key] = { value: parseFloat(numValue.toFixed(2)), unit };
    }
  });

  return {
    timestamp: Date.now(),
    status: 'pending',
    source,
    foodName: raw.foodName || raw.name || inputText || null,
    servingSize: raw.servingSize || null,
    calories: normalized.calories ?? null,
    protein: normalized.protein ?? null,
    carbs: normalized.carbs ?? null,
    fat: normalized.fat ?? null,
    fiber: normalized.fiber ?? null,
    sugar: normalized.sugar ?? null,
    sugarAlcohols: normalized.sugarAlcohols ?? null,
    netCarbs: calculateNetCarbs(normalized) ?? null,
    micronutrients: normalized.micronutrients ?? null,
    micros,
    ingredients: raw.ingredients ?? [],
    healthScore: raw.healthScore ?? null,
    nutriscore: raw.nutriscore ?? null,
    ecoscore: raw.ecoscore ?? null,
    novaScore: raw.novaScore ?? null,
    dietLabels: raw.dietLabels || [],
    allergens: raw.allergens || [],
  };
}

/**
 * Map Open Food Facts product to analysis item
 * @param {Object} product - OFF API product object
 * @param {string} inputText - Original search text
 * @returns {AnalysisItem|null} Normalized analysis item
 */
function mapOpenFoodFactsToItem(product, inputText) {
  if (typeof product !== 'object' || product === null) return null;

  const nutrients = product.nutriments || {};
  const servingSizeText = product.serving_size ?? '';

  let portionAmount = 1;
  let portionUnit = 'serving';
  let gramsEquivalent = 100;

  // Parse serving_size string (e.g., "100g", "1 cup")
  const servingMatch = servingSizeText.match(/(\d+(\.\d+)?)\s*([a-zA-Z]+)?/);
  if (servingMatch) {
    portionAmount = parseFloat(servingMatch[1]);
    portionUnit = servingMatch[3]?.toLowerCase() || 'unit';
  } else if (nutrients['energy-kcal_serving'] !== undefined) {
    portionAmount = 1;
    portionUnit = 'serving';
  } else if (Object.keys(nutrients).length > 0) {
    portionAmount = 100;
    portionUnit = 'g';
  }

  // Determine whether to use _serving or _100g values
  const useServingNutrients = nutrients['energy-kcal_serving'] !== undefined;

  /**
   * Get nutrient value from OFF data
   * @param {string} nutrientKey - Nutrient name
   * @returns {number|null} Nutrient value
   */
  const getNutrient = (nutrientKey) => {
    const key = useServingNutrients ? `${nutrientKey}_serving` : `${nutrientKey}_100g`;
    const value = nutrients[key];

    if (value === null || value === undefined || isNaN(value)) {
      return null;
    }

    return parseFloat(value.toFixed(2));
  };

  // Calculate grams equivalent
  if (useServingNutrients && servingMatch) {
    gramsEquivalent = convertToGrams(portionAmount, portionUnit);
  } else if (!useServingNutrients && portionUnit === 'g') {
    gramsEquivalent = 100;
  } else {
    gramsEquivalent = convertToGrams(portionAmount, portionUnit);
  }

  // Extract common micronutrients
  const commonMicros = {
    calcium: 'calcium',
    iron: 'iron',
    vitaminA: 'vitamin-a',
    vitaminC: 'vitamin-c',
    potassium: 'potassium',
    sodium: 'sodium',
    magnesium: 'magnesium',
    zinc: 'zinc',
    vitaminD: 'vitamin-d',
    vitaminE: 'vitamin-e',
    vitaminK: 'vitamin-k',
  };

  const micros = {};
  Object.entries(commonMicros).forEach(([appKey, offKey]) => {
    const value = getNutrient(offKey);
    if (value && value > 0) {
      micros[appKey] = {
        value,
        unit: appKey === 'sodium' ? 'mg' : 'µg',
      };
    }
  });

  return {
    itemId: product.code || product.id || `off-${Date.now()}`,
    name: product.product_name || product.generic_name || inputText || null,
    portion: {
      amount: portionAmount,
      unit: portionUnit,
      gramsEquivalent,
      servingText: servingSizeText || `${portionAmount} ${portionUnit}`,
    },
    macros: {
      calories_kcal: getNutrient('energy-kcal'),
      protein_g: getNutrient('proteins'),
      carbs_g: getNutrient('carbohydrates'),
      fat_g: getNutrient('fat'),
      fiber_g: getNutrient('fiber'),
      sugar_g: getNutrient('sugars'),
      sodium_mg: getNutrient('sodium'),
    },
    micros,
    netCarbs: calculateNetCarbs({
      carbs: getNutrient('carbohydrates') ?? 0,
      fiber: getNutrient('fiber') ?? 0,
      sugarAlcohols: getNutrient('polyols') ?? 0,
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

/**
 * Map backend product to analysis item
 * @param {Object} product - Backend product object
 * @param {string} inputText - Original search text
 * @returns {AnalysisItem|null} Normalized analysis item
 */
function mapBackendProductToItem(product, inputText) {
  if (typeof product !== 'object' || product === null) return null;

  const servingSizeText = product.servingSize ?? '';
  const servingMatch = servingSizeText.match(/(\d+(\.\d+)?)\s*([a-zA-Z]+)?/);
  const portionAmount = servingMatch ? parseFloat(servingMatch[1]) : 100;
  const portionUnit = servingMatch ? (servingMatch[3]?.toLowerCase() || 'g') : 'g';
  const gramsEquivalent = convertToGrams(portionAmount, portionUnit);

  const macros = {
    calories_kcal: Number.isFinite(product.calories) ? product.calories : null,
    protein_g: Number.isFinite(product.protein) ? product.protein : null,
    carbs_g: Number.isFinite(product.carbs) ? product.carbs : null,
    fat_g: Number.isFinite(product.fat) ? product.fat : null,
    fiber_g: Number.isFinite(product.fiber) ? product.fiber : null,
    sugar_g: Number.isFinite(product.sugar) ? product.sugar : null,
    sodium_mg: Number.isFinite(product.sodium) ? product.sodium : null,
  };

  const micros = {};
  Object.entries(product.micros || {}).forEach(([key, val]) => {
    const parsed = typeof val === 'number'
      ? { value: val, unit: '' }
      : parseMicronutrient(val);

    if (parsed && Number.isFinite(parsed.value)) {
      micros[key] = parsed;
    }
  });

  return {
    itemId: product.id || product.code || inputText || `backend-${Date.now()}`,
    name: product.title || product.product_name || inputText || null,
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
      source: product.source || 'backend',
      confidence: 0.9,
      data: {
        image_url: product.image,
        brand: product.description,
        category: product.category,
      },
    }],
  };
}

/**
 * Calculate totals from array of items
 * @param {Array<AnalysisItem>} items - Food items
 * @returns {{macros: Macros, micros: Object.<string, Micro>}} Aggregated totals
 */
function calculateTotals(items) {
  if (!items || items.length === 0) {
    return {
      macros: {
        calories_kcal: null,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
        fiber_g: null,
        sugar_g: null,
        sodium_mg: null,
      },
      micros: {},
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
    micros: {},
  };

  items.forEach(item => {
    // Sum macros
    Object.keys(totals.macros).forEach(key => {
      totals.macros[key] += item.macros?.[key] ?? 0;
    });

    // Sum micros
    if (item.micros) {
      Object.entries(item.micros).forEach(([key, micro]) => {
        if (micro && typeof micro.value === 'number' && !isNaN(micro.value)) {
          if (!totals.micros[key]) {
            totals.micros[key] = { value: 0, unit: micro.unit || '' };
          }
          totals.micros[key].value += micro.value;
        }
      });
    }
  });

  return totals;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetch product from Open Food Facts
 * @param {string} query - Search query (barcode or text)
 * @param {'text'|'barcode'} mode - Search mode
 * @returns {Promise<AnalysisItem|null>} Product item or null
 */
async function fetchFromOpenFoodFacts(query, mode = 'text') {
  const searchTerm = (query || '').toString().trim();
  if (!searchTerm) return null;

  const headers = {
    'User-Agent': 'MFT/1.0 (+mobile-app)',
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

      return mapOpenFoodFactsToItem(json.product, searchTerm);
    }

    // Text search
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

    const product = json.products.find(p => p?.nutriments) || json.products[0];

    if (!product?.nutriments) return null;

    return mapOpenFoodFactsToItem(product, searchTerm);
  } catch (err) {
    console.warn('[useFoodAnalysis] Open Food Facts lookup failed:', err.message);
    return null;
  }
}

/**
 * Compress image for upload
 * @param {string} uri - Image URI
 * @returns {Promise<string>} Base64-encoded compressed image
 */
async function compressImage(uri) {
  if (!uri) {
    throw new Error('Photo analysis unavailable: missing image URI.');
  }

  let manipulateAsync, SaveFormat;
  let resultUri = null;

  try {
    const mod = await import('expo-image-manipulator');
    manipulateAsync = mod.manipulateAsync;
    SaveFormat = mod.SaveFormat;
  } catch (e) {
    throw new Error('Image compression unavailable. Install expo-image-manipulator and run on a real device.');
  }

  if (!readAsStringAsync) {
    throw new Error('Photo analysis unavailable: expo-file-system missing. Install expo-file-system and rebuild on device.');
  }

  try {
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: IMAGE_MAX_WIDTH_PX } }],
      { compress: IMAGE_COMPRESSION_QUALITY, format: SaveFormat.JPEG }
    );
    resultUri = result?.uri || null;
  } catch (err) {
    console.warn('[useFoodAnalysis] Image compression failed, using original photo.', err?.message || err);
  }

  if (!resultUri) {
    resultUri = uri;
  }

  const encoding = EncodingType?.Base64 || 'base64';

  const base64 = await readAsStringAsync(resultUri, { encoding });

  return base64;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Food Analysis Hook
 *
 * @returns {{
 *   analyzeText: (text: string) => Promise<Object>,
 *   analyzePhoto: (uri: string, barcode?: string) => Promise<void>,
 *   analyzeBarcode: (barcode: string) => Promise<AnalysisResult>,
 *   analysisResult: AnalysisResult|null,
 *   setAnalysisResult: Function,
 *   inputText: string,
 *   setInputText: Function,
 *   updateItemQuantity: (itemId: string, newAmount: number, newUnit: string) => void,
 *   removeItem: (itemId: string) => void,
 *   runAnalysis: () => Promise<void>,
 *   isAnalyzing: boolean,
 *   progress: number,
 *   error: string|null,
 *   clearError: () => void
 * }}
 */
export function useFoodAnalysis() {
  // ============================================================================
  // STATE & REFS
  // ============================================================================

  const { getToken } = useAuth();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  // Multi-item analysis state
  const [analysisResult, setAnalysisResult] = useState(null);
  const [inputText, setInputText] = useState('');
  const [debouncedText, setDebouncedText] = useState('');

  // Refs
  const debounceTimerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const barcodeCacheRef = useRef({});

  // ============================================================================
  // TEXT ANALYSIS (Universal Entry Point)
  // ============================================================================

  /**
   * Analyze text query with cascading fallback
   * Priority: Open Food Facts → Backend AI → USDA → AI
   *
   * @param {string} text - Food description
   * @returns {Promise<void>}
   */
  const analyzeTextUniversal = useCallback(async (text) => {
    if (!text?.trim()) return;

    try {
      setIsAnalyzing(true);
      setError(null);
      setProgress(10);

      // 1. Try Open Food Facts first (fast, accurate for known products)
      setProgress(20);
      const offResult = await fetchFromOpenFoodFacts(text, 'text');

      if (offResult) {
        setAnalysisResult({
          items: [{
            ...offResult,
            isEditing: false,
            editedPortion: null,
          }],
          totals: calculateTotals([offResult]),
        });
        setProgress(100);
        return;
      }

      // 2. Fallback to backend AI (handles multi-item meals)
      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setProgress(30);

      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required for text analysis');
      }

      setProgress(50);

      const response = await fetch(`${API_URL}/food/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mode: 'text',
          query: text,
          mealType: getMealTypeFromTime(), // Time-based detection
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json?.error || 'Analysis failed');
      }

      const data = await response.json();

      setProgress(90);

      setAnalysisResult({
        ...data,
        items: (data.items || []).map(item => ({
          ...item,
          isEditing: false,
          editedPortion: null,
        })),
      });

      setProgress(100);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Analysis failed. Please try again.');
        console.error('[useFoodAnalysis] Text analysis error:', err);
      }
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), PROGRESS_FADE_DELAY_MS);
    }
  }, [getToken]);

  // ============================================================================
  // BARCODE ANALYSIS
  // ============================================================================

  /**
   * Analyze barcode with caching
   * Priority: Cache → Backend BFF → Open Food Facts
   *
   * @param {string} barcode - Product barcode
   * @returns {Promise<AnalysisResult>} Analysis result
   */
  const analyzeBarcode = useCallback(async (barcode) => {
    const code = (barcode || '').trim();
    if (!code) {
      throw new Error('Barcode is required for analysis');
    }

    // Check cache
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
      if (!token) {
        throw new Error('Authentication required to analyze barcode');
      }

      let productItem = null;

      // 1. Try backend BFF (cached products + USDA)
      try {
        setProgress(25);
        const res = await fetch(`${BACKEND_BARCODE_ENDPOINT}/${encodeURIComponent(code)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 404) {
          productItem = null;
        } else if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || 'Barcode lookup failed');
        } else {
          const data = await res.json();
          productItem = mapBackendProductToItem(data, code);
        }
      } catch (err) {
        console.warn('[useFoodAnalysis] Backend barcode lookup failed, falling back to OFF:', err.message);
      }

      // 2. Fallback to Open Food Facts
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

      // Cache result
      barcodeCacheRef.current[code] = resultPayload;

      setAnalysisResult(resultPayload);
      setProgress(100);

      return resultPayload;
    } catch (err) {
      const errorMsg = err.message || 'Barcode analysis failed. Please try again or enter manually.';
      setError(errorMsg);
      throw err;
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), PROGRESS_FADE_DELAY_MS);
    }
  }, [getToken]);

  // ============================================================================
  // LEGACY TEXT ANALYSIS (For backwards compatibility)
  // ============================================================================

  /**
   * Legacy text analysis with USDA → AI fallback
   * @deprecated Use analyzeTextUniversal instead
   * @param {string} text - Food description
   * @returns {Promise<Object>} Food log object
   */
  const analyzeText = useCallback(async (text) => {
    if (!text?.trim()) {
      throw new Error('Please describe your meal');
    }

    setIsAnalyzing(true);
    setError(null);
    setProgress(10);

    const started = Date.now();
    const timeLeft = () => TOTAL_ANALYSIS_BUDGET_MS - (Date.now() - started);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const intent = classifyText(text);

      // Try USDA first for single foods
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

            if (confidence >= USDA_CONFIDENCE_THRESHOLD || intent.isSingleFood) {
              setProgress(80);
              return buildFoodLog({
                inputText: text,
                source: 'usda',
                raw: json.data,
              });
            }
          }
        } catch {
          // Silent fallback to AI
        }
      }

      // AI fallback
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
          json?.error || 'Could not understand this meal. Try adding quantities.'
        );
      }

      setProgress(95);

      return buildFoodLog({
        inputText: text,
        source: 'ai',
        raw: json.data || json,
      });
    } catch (err) {
      const errorMsg = err.message || 'Analysis failed. Please try again.';
      setError(errorMsg);
      throw err;
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), PROGRESS_FADE_DELAY_MS);
    }
  }, [getToken]);

  // ============================================================================
  // PHOTO ANALYSIS
  // ============================================================================

  /**
   * Analyze photo with AI vision
   * @param {string} uri - Image URI
   * @param {string|null} barcode - Optional barcode from photo
   * @returns {Promise<void>}
   */
  const analyzePhoto = useCallback(async (uri, barcode = null) => {
    // If barcode detected, use barcode analysis
    if (barcode) {
      return analyzeBarcode(barcode);
    }

    if (!uri) {
      throw new Error('Image URI is required for analysis');
    }

    setIsAnalyzing(true);
    setError(null);
    setProgress(10);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required to analyze photo');
      }

      // OCR pass: detect nutrition label text and resolve via text pipeline
      // Note: OCR is optional - requires native module (@react-native-ml-kit/text-recognition)
      // If unavailable, gracefully falls back to GPT-4 Vision analysis below
      setProgress(25);
      try {
        let MLKitOcr = null;
        try {
          // Try to import OCR module (optional dependency)
          MLKitOcr = require('@react-native-ml-kit/text-recognition');
        } catch (importError) {
          // OCR not installed - will use GPT-4 Vision fallback
          MLKitOcr = null;
        }

        if (!MLKitOcr?.detectFromUri) {
          throw new Error('OCR module unavailable - using AI vision fallback');
        }

        const ocrBlocks = await MLKitOcr.detectFromUri(uri);
        const ocrText = ocrBlocks.map((block) => block.text).join('\n').trim();

        if (looksLikeNutritionLabel(ocrText)) {
          setProgress(50);
          const response = await fetch(`${API_URL}/food/resolve`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              mode: 'text',
              query: ocrText,
              mealType: getMealTypeFromTime(),
              userContext: { source: 'ocr' },
            }),
          });

          if (!response.ok) {
            const json = await response.json().catch(() => ({}));
            throw new Error(json?.error || 'OCR analysis failed');
          }

          const data = await response.json();
          setAnalysisResult({
            ...data,
            items: (data.items || []).map(item => ({
              ...item,
              isEditing: false,
              editedPortion: null,
            })),
          });

          setProgress(100);
          return;
        }
      } catch (ocrError) {
        const message = ocrError?.message || '';
        if (!message.includes('OCR module unavailable')) {
          console.warn('[useFoodAnalysis] OCR pass failed, falling back to image analysis.');
        }
      }

      setProgress(40);

      // Compress image
      let base64;
      try {
        base64 = await compressImage(uri);
      } catch (e) {
        const errorMsg = e.message || 'Image compression failed';
        console.error('[useFoodAnalysis] Image compression error:', e);
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      setProgress(60);

      // Send to AI vision API
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
        IMAGE_ANALYSIS_TIMEOUT_MS
      );

      if (!res.ok) {
        const errorMessage = json?.error || json?.message || 'Image analysis failed';
        const statusHint = res.status === 504 || res.status === 524
          ? ' (Server timeout - try again on a faster connection)'
          : res.status === 413
          ? ' (Image too large - try a smaller photo)'
          : res.status === 401
          ? ' (Authentication failed - please sign in again)'
          : '';

        console.error(`[useFoodAnalysis] Image API error: ${res.status} - ${errorMessage}`);
        throw new Error(`${errorMessage}${statusHint}`);
      }

      setProgress(95);

      // Build food log from AI response
      const rawAIData = json.data || json;
      const foodLog = buildFoodLog({
        inputText: 'Photo',
        source: 'photo',
        raw: rawAIData,
      });

      foodLog.imageUrl = uri;

      // Convert to multi-item format
      const aiItem = {
        itemId: `${foodLog.foodName}-${Date.now()}`,
        name: foodLog.foodName,
        portion: {
          amount: parseFloat(foodLog.servingSize?.match(/(\d+(\.\d+)?)/)?.[1] || 1),
          unit: foodLog.servingSize?.match(/[a-zA-Z]+/)?.[0] || null,
          gramsEquivalent: convertToGrams(
            parseFloat(foodLog.servingSize?.match(/(\d+(\.\d+)?)/)?.[1] || 1),
            foodLog.servingSize?.match(/[a-zA-Z]+/)?.[0] || 'g'
          ),
          servingText: foodLog.servingSize,
        },
        macros: {
          calories_kcal: foodLog.calories ?? null,
          protein_g: foodLog.protein ?? null,
          carbs_g: foodLog.carbs ?? null,
          fat_g: foodLog.fat ?? null,
          fiber_g: foodLog.fiber ?? null,
          sugar_g: foodLog.sugar ?? null,
          sodium_mg: foodLog.micros?.sodium?.value || 0,
        },
        micros: foodLog.micros || {},
        netCarbs: foodLog.netCarbs,
        sourceEvidence: [{
          source: 'Image AI',
          confidence: 0.7,
          data: { imageUrl: uri, raw: rawAIData },
        }],
        isEditing: false,
        editedPortion: null,
      };

      setAnalysisResult({
        items: [aiItem],
        totals: calculateTotals([aiItem]),
      });

      setProgress(100);
    } catch (err) {
      if (err?.name === 'AbortError') {
        const errorMsg = 'Photo analysis timed out. Try again on a faster connection.';
        setError(errorMsg);
        return;
      }
      const errorMsg = err.message || 'Photo analysis failed. Please try again.';
      setError(errorMsg);
      throw err;
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), PROGRESS_FADE_DELAY_MS);
    }
  }, [getToken, analyzeBarcode]);

  // ============================================================================
  // UI STATE MANAGEMENT
  // ============================================================================

  /**
   * Update item quantity and scale macros
   * @param {string} itemId - Item ID
   * @param {number} newAmount - New quantity
   * @param {string} newUnit - New unit
   */
  const updateItemQuantity = useCallback((itemId, newAmount, newUnit) => {
    setAnalysisResult(prev => {
      if (!prev) return null;

      const updatedItems = prev.items.map(item => {
        if (item.itemId === itemId) {
          const originalGrams = item.portion?.gramsEquivalent;

          if (!originalGrams) {
            console.warn(`[useFoodAnalysis] Cannot update quantity for ${itemId}: missing gramsEquivalent`);
            return item;
          }

          const newGrams = convertToGrams(newAmount, newUnit);
          if (!newGrams) {
            console.warn(`[useFoodAnalysis] Cannot convert ${newAmount} ${newUnit} to grams`);
            return item;
          }

          const scaleFactor = newGrams / originalGrams;

          // Scale macros
          const scaledMacros = {};
          Object.entries(item.macros || {}).forEach(([key, value]) => {
            scaledMacros[key] = value !== null ? value * scaleFactor : null;
          });

          // Scale micros
          const scaledMicros = {};
          Object.entries(item.micros || {}).forEach(([key, micro]) => {
            scaledMicros[key] = micro.value !== null
              ? { value: micro.value * scaleFactor, unit: micro.unit }
              : null;
          });

          return {
            ...item,
            portion: {
              amount: newAmount,
              unit: newUnit,
              gramsEquivalent: newGrams,
              servingText: `${newAmount} ${newUnit}`,
            },
            macros: scaledMacros,
            micros: scaledMicros,
            editedPortion: { amount: newAmount, unit: newUnit },
          };
        }
        return item;
      });

      return {
        ...prev,
        items: updatedItems,
        totals: calculateTotals(updatedItems),
      };
    });
  }, []);

  /**
   * Remove item from analysis
   * @param {string} itemId - Item ID to remove
   */
  const removeItem = useCallback((itemId) => {
    setAnalysisResult(prev => {
      if (!prev) return null;

      const updatedItems = prev.items.filter(item => item.itemId !== itemId);

      if (updatedItems.length === 0) {
        return null; // Clear analysis if no items left
      }

      return {
        ...prev,
        items: updatedItems,
        totals: calculateTotals(updatedItems),
      };
    });
  }, []);

  /**
   * Trigger manual analysis
   */
  const runAnalysis = useCallback(async () => {
    const text = inputText.trim();
    if (!text) {
      setError('Please describe your meal to analyze');
      return;
    }
    await analyzeTextUniversal(text);
  }, [inputText, analyzeTextUniversal]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // DEBOUNCED AUTO-ANALYSIS
  // ============================================================================

  // Debounce input text (1.5s delay after user stops typing)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (inputText.trim()) {
      debounceTimerRef.current = setTimeout(() => {
        setDebouncedText(inputText);
      }, AUTO_ANALYSIS_DEBOUNCE_MS);
    } else {
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
    if (debouncedText.trim() && !isAnalyzing) {
      analyzeTextUniversal(debouncedText);
    }
  }, [debouncedText, isAnalyzing, analyzeTextUniversal]);

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  return {
    // Legacy single-item analysis (backwards compatibility)
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
    clearError,
  };
}
