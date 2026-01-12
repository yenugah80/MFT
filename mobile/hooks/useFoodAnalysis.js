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

// Module-level cache to persist analysis result across component remounts
// This prevents loss of analysis data when the tabs layout re-renders
let cachedAnalysisResult = null;
let cachedInputText = '';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Total analysis budget (all sources combined) */
const TOTAL_ANALYSIS_BUDGET_MS = 2000;

/** USDA API timeout */
const USDA_TIMEOUT_MS = 650;

/** AI API timeout - Increased for enhanced estimation prompts */
const AI_TIMEOUT_MS = 8000; // 8 seconds (was 1600ms)

/** Open Food Facts timeout - Reduced for faster response */
const OPEN_FOOD_FACTS_TIMEOUT_MS = 800; // 800ms (was 1400ms)

/** Image analysis timeout - Increased for GPT-4o vision */
const IMAGE_ANALYSIS_TIMEOUT_MS = 20000; // 20 seconds (was 12s)

/** Auto-analysis debounce delay (after user stops typing) */
const AUTO_ANALYSIS_DEBOUNCE_MS = 1500;

/** Fade progress bar delay */
const PROGRESS_FADE_DELAY_MS = 400;

/** Rate limit cooldown period */
const RATE_LIMIT_COOLDOWN_MS = 60000; // 1 minute

/** Image compression width */
const IMAGE_MAX_WIDTH_PX = 1024;

/** Image compression quality (0-1) */
const IMAGE_COMPRESSION_QUALITY = 0.7;

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
export function getMealTypeFromTime() {
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
 * Parse micronutrient value
 * Handles multiple formats:
 * - New structured format: {value: number, unit: string}
 * - Number format: 80
 * - String format: "80mg", "15µg"
 *
 * @param {Object|string|number} val - Micro value
 * @returns {Micro|null} Parsed micro with value and unit
 */
function parseMicronutrient(val) {
  if (val === null || val === undefined) return null;

  // Handle new structured format {value, unit} from backend
  if (typeof val === 'object' && val.value !== undefined) {
    const numValue = parseFloat(val.value);
    if (!isNaN(numValue)) {
      return { value: numValue, unit: val.unit || '' };
    }
    return null;
  }

  // Handle number format
  if (typeof val === 'number') {
    return { value: val, unit: '' };
  }

  // Handle string format ("80mg", "15µg", etc.)
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

  const fallbackName = typeof inputText === 'string' && ['photo', 'voice', 'barcode'].includes(inputText.toLowerCase())
    ? 'Unknown Food'
    : inputText;

  // Extract micronutrients with units
  // Handles both new format {value, unit} and legacy formats (number or string)
  const micros = {};
  Object.entries(normalized.micros || {}).forEach(([key, val]) => {
    const keyLower = key.toLowerCase();

    // Default units for micronutrients
    const defaultUnit = (() => {
      if (['calcium', 'iron', 'potassium', 'sodium', 'magnesium', 'zinc'].some(m => keyLower.includes(m))) {
        return 'mg';
      } else if (keyLower.includes('vitamin')) {
        return ['a', 'd', 'e', 'k'].some(v => keyLower.includes(v)) ? 'µg' : 'mg';
      }
      return '';
    })();

    // Handle new structured format {value, unit} from backend
    if (val && typeof val === 'object' && val.value !== undefined) {
      const numValue = parseFloat(val.value);
      if (!isNaN(numValue) && numValue > 0) {
        micros[key] = { value: parseFloat(numValue.toFixed(2)), unit: val.unit || defaultUnit };
      }
    }
    // Handle legacy number format
    else if (typeof val === 'number') {
      if (!isNaN(val) && val > 0) {
        micros[key] = { value: parseFloat(val.toFixed(2)), unit: defaultUnit };
      }
    }
    // Handle legacy string format (e.g., "120mg", "15µg")
    else if (typeof val === 'string') {
      const match = val.match(/([\d.]+)\s*([a-zA-Zµ%]*)/);
      if (match) {
        const numValue = parseFloat(match[1]);
        if (!isNaN(numValue) && numValue > 0) {
          micros[key] = { value: parseFloat(numValue.toFixed(2)), unit: match[2] || defaultUnit };
        }
      }
    }
  });

  return {
    timestamp: Date.now(),
    status: 'pending',
    source,
    foodName: raw.foodName || raw.title || raw.name || fallbackName || null,
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
    'User-Agent': 'My-Food-Tracker/1.0 (+mobile-app)',
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
  const isAnalyzingRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  // Multi-item analysis state (initialize from cache to survive remounts)
  const [analysisResult, setAnalysisResultState] = useState(cachedAnalysisResult);
  const [inputText, setInputTextState] = useState(cachedInputText);

  // Wrapper to update both state and cache
  const setAnalysisResult = useCallback((result) => {
    cachedAnalysisResult = result;
    setAnalysisResultState(result);
  }, []);

  const setInputText = useCallback((text) => {
    cachedInputText = text;
    setInputTextState(text);
  }, []);
  const [debouncedText, setDebouncedText] = useState('');

  // Refs
  const debounceTimerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const barcodeCacheRef = useRef({});
  const rateLimitedUntilRef = useRef(0); // Timestamp when rate limit cooldown expires

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
  const analyzeTextUniversal = useCallback(async (text, options = {}) => {
    console.log('[useFoodAnalysis] analyzeTextUniversal called with:', text, 'options:', options);
    if (!text?.trim()) {
      console.log('[useFoodAnalysis] analyzeTextUniversal: empty text, returning');
      return;
    }

    // Prevent concurrent analyses (use ref to avoid stale closure)
    if (isAnalyzingRef.current) {
      console.log('[useFoodAnalysis] Already analyzing, skipping');
      return;
    }

    // 🆕 EXTRACT REGIONAL CONTEXT AND USER GOALS FROM OPTIONS
    const {
      cuisinePreference = null,
      region = null,
      cookingMethod = null,
      voiceTranscript = null,
      userGoals = null,
      source = 'text'
    } = options;

    // Check if we're still in rate limit cooldown
    const now = Date.now();
    if (rateLimitedUntilRef.current > now) {
      const remainingSeconds = Math.ceil((rateLimitedUntilRef.current - now) / 1000);
      setError(`Rate limited. Please wait ${remainingSeconds}s before trying again.`);
      console.log(`[useFoodAnalysis] Rate limited for ${remainingSeconds}s`);
      return;
    }

    try {
      console.log('[useFoodAnalysis] Setting isAnalyzing=true');
      isAnalyzingRef.current = true;
      setIsAnalyzing(true);
      setError(null);
      setProgress(10);

      // Smart routing: Skip OFF for generic meal descriptions
      const isGenericMeal = /\b(bowl|plate|cup|serving|meal|breakfast|lunch|dinner|snack)\b/i.test(text)
        || /\b(of|with|and|,)\b/i.test(text) // Multi-item indicators
        || text.split(' ').length > 4; // Long descriptions are usually meals

      if (!isGenericMeal) {
        // 1. Try Open Food Facts first (fast, accurate for known products only)
        setProgress(20);
        try {
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
        } catch (error) {
          // Silently fail and proceed to AI
          console.log('[useFoodAnalysis] OFF lookup skipped:', error.message);
        }
      }

      // 2. Go to backend AI (handles multi-item meals and generic descriptions)
      // Cancel any in-flight requests
      console.log('[useFoodAnalysis] Proceeding to backend AI...');
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setProgress(30);
      console.log('[useFoodAnalysis] Getting auth token...');

      const token = await getToken();
      console.log('[useFoodAnalysis] Token obtained:', !!token);
      if (!token) {
        throw new Error('Authentication required for text analysis');
      }

      setProgress(50);
      console.log('[useFoodAnalysis] Calling /api/food/resolve for:', text);

      // 🆕 PASS REGIONAL CONTEXT AND USER GOALS TO BACKEND FOR PERSONALIZED ANALYSIS
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
          // 🆕 REGIONAL CONTEXT (enables cost optimization and better portion sizing)
          cuisinePreference,
          region,
          cookingMethod,
          // 🆕 USER GOALS (enables personalized macronutrient recommendations)
          userGoals,
          // 🆕 VOICE CONTEXT (for voice and multimodal inputs)
          voiceTranscript,
          source, // 'text', 'voice', 'multimodal'
        }),
        signal: abortControllerRef.current.signal,
      });

      console.log('[useFoodAnalysis] API response status:', response.status);

      if (!response.ok) {
        // Handle rate limiting (429 Too Many Requests)
        if (response.status === 429) {
          rateLimitedUntilRef.current = Date.now() + RATE_LIMIT_COOLDOWN_MS;
          const cooldownSeconds = RATE_LIMIT_COOLDOWN_MS / 1000;
          const errorMsg = `Rate limited. Please wait ${cooldownSeconds}s before trying again.`;
          console.log(`[useFoodAnalysis] Rate limited - cooldown for ${cooldownSeconds}s`);
          throw new Error(errorMsg);
        }

        const json = await response.json().catch(() => ({}));
        throw new Error(json?.error || 'Analysis failed');
      }

      const data = await response.json();
      console.log('[useFoodAnalysis] API response data:', JSON.stringify(data).slice(0, 500));

      setProgress(90);

      console.log('[useFoodAnalysis] Setting analysisResult with', data.items?.length, 'items');

      // 🆕 Normalize items to ensure consistent field names and structure
      const normalizedItems = (data.items || []).map((item, idx) => {
        // Ensure macros have consistent field names
        const macros = item.macros || {};
        const normalizedMacros = {
          calories_kcal: macros.calories_kcal ?? macros.calories ?? null,
          protein_g: macros.protein_g ?? macros.protein ?? null,
          carbs_g: macros.carbs_g ?? macros.carbs ?? null,
          fat_g: macros.fat_g ?? macros.fat ?? macros.fats ?? null,
          fiber_g: macros.fiber_g ?? macros.fiber ?? null,
          sugar_g: macros.sugar_g ?? macros.sugar ?? null,
          sodium_mg: macros.sodium_mg ?? macros.sodium ?? null,
        };

        // Determine if item is complex (has multiple ingredients)
        const hasIngredients = item.ingredients && item.ingredients.length > 0;
        const hasComponents = item.components && item.components.length > 0;
        const isComplex = item.isComplex ?? hasIngredients ?? hasComponents;

        return {
          ...item,
          itemId: item.itemId || `${item.name}-${idx}-${Date.now()}`, // Ensure unique ID
          macros: normalizedMacros,
          isComplex,
          ingredients: item.ingredients || item.components || [],
          sourceEvidence: item.sourceEvidence || [{
            source: data.source || 'AI',
            confidence: item.confidence ?? 0.7,
          }],
          isEditing: false,
          editedPortion: null,
        };
      });

      console.log('[useFoodAnalysis] Normalized items:', normalizedItems.map(i => ({ id: i.itemId, name: i.name, hasIngredients: i.ingredients?.length > 0 })));

      setAnalysisResult({
        ...data,
        items: normalizedItems,
      });

      setProgress(100);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Analysis failed. Please try again.');
        console.error('[useFoodAnalysis] Text analysis error:', err);
      }
    } finally {
      isAnalyzingRef.current = false;
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

      // Get user profile for regional context
      let cuisinePreference = null;
      let region = null;
      let cookingMethod = null;
      try {
        const profileRes = await fetch(`${API_URL}/profiles/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          cuisinePreference = profile?.cuisinePreference?.[0] || null;
          region = profile?.region || null;
          cookingMethod = profile?.cookingStyle || null;
        }
      } catch (err) {
        console.warn('[useFoodAnalysis] Could not fetch user profile for regional context:', err.message);
      }

      let productItem = null;

      // 1. Try backend BFF (cached products + USDA)
      try {
        setProgress(25);
        // 🆕 INCLUDE REGIONAL CONTEXT IN BARCODE LOOKUP
        const queryParams = new URLSearchParams();
        if (cuisinePreference) queryParams.append('cuisinePreference', cuisinePreference);
        if (region) queryParams.append('region', region);
        if (cookingMethod) queryParams.append('cookingMethod', cookingMethod);
        const barcodeLookupUrl = queryParams.toString()
          ? `${BACKEND_BARCODE_ENDPOINT}/${encodeURIComponent(code)}?${queryParams.toString()}`
          : `${BACKEND_BARCODE_ENDPOINT}/${encodeURIComponent(code)}`;

        const res = await fetch(barcodeLookupUrl, {
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
      isAnalyzingRef.current = false;
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), PROGRESS_FADE_DELAY_MS);
    }
  }, [getToken]);

  // ============================================================================
  // VOICE ANALYSIS (with Regional Context)
  // ============================================================================

  /**
   * Analyze voice transcript with regional context
   * @param {string} transcript - Voice transcription text
   * @param {Object} options - Optional voice-specific options
   * @returns {Promise<void>}
   */
  const analyzeVoice = useCallback(async (transcript, options = {}) => {
    if (!transcript?.trim()) {
      throw new Error('Voice transcript is required for analysis');
    }

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required for voice analysis');
      }

      // Get user profile for regional context
      const profileRes = await fetch(`${API_URL}/profiles/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!profileRes.ok) {
        console.warn('[useFoodAnalysis] Could not fetch user profile for regional context');
      }

      const profile = await profileRes.json().catch(() => ({}));

      // Extract regional context from user profile
      const cuisinePreference = profile?.cuisinePreference?.[0] || null;
      const region = profile?.region || null;
      const cookingMethod = profile?.cookingStyle || null;

      // Call analyzeTextUniversal with voice context and regional options
      await analyzeTextUniversal(transcript, {
        ...options,
        cuisinePreference,
        region,
        cookingMethod,
        voiceTranscript: transcript,
        source: 'voice'
      });
    } catch (err) {
      const errorMsg = err.message || 'Voice analysis failed. Please try again.';
      setError(errorMsg);
      throw err;
    }
  }, [getToken, analyzeTextUniversal]);

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

      // Try backend resolve first (USDA → OFF → AI cascade)
      // Backend handles both single and multi-food queries
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
              body: JSON.stringify({
                mode: 'text',
                query: text,
                mealType: getMealTypeFromTime(),
              }),
            },
            USDA_TIMEOUT_MS
          );

          // Backend returns {items: [...], totals, dataQuality}
          if (res.ok && json?.items && Array.isArray(json.items) && json.items.length > 0) {
            // Validate first item has required structure
            const firstItem = json.items[0];
            if (firstItem && firstItem.name && firstItem.macros) {
              setProgress(80);

              // Use backend's multi-item format directly
              setAnalysisResult({
                items: json.items.map(item => ({
                  ...item,
                  isEditing: false,
                  editedPortion: null,
                })),
                totals: json.totals || calculateTotals(json.items),
              });

              setProgress(100);
              return; // Success - exit analyzeText
            } else {
              console.warn('[useFoodAnalysis] Invalid item structure from backend:', firstItem);
            }
          }
        } catch (err) {
          // Log for debugging but fall through to AI
          console.warn('[useFoodAnalysis] Backend resolve error, using AI fallback:', err.message);
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
      isAnalyzingRef.current = false;
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
   * @param {string|null} voiceTranscript - Optional voice description of photo
   * @returns {Promise<void>}
   */
  const analyzePhoto = useCallback(async (uri, barcode = null, voiceTranscript = null) => {
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

      // Get user profile for regional context and goals
      let cuisinePreference = null;
      let region = null;
      let cookingMethod = null;
      let userGoals = null;
      try {
        const profileRes = await fetch(`${API_URL}/profiles/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          cuisinePreference = profile?.cuisinePreference?.[0] || null;
          region = profile?.region || null;
          cookingMethod = profile?.cookingStyle || null;
          // Extract daily goals for personalized recommendations
          userGoals = {
            dailyCalories: profile?.goals?.dailyCalories || 2000,
            proteinG: profile?.goals?.proteinG || 150,
            carbsG: profile?.goals?.carbsG || 225,
            fatsG: profile?.goals?.fatsG || 65
          };
        }
      } catch (err) {
        console.warn('[useFoodAnalysis] Could not fetch user profile for regional context:', err.message);
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

      // 🆕 Use multimodal endpoint if voice transcript provided, otherwise regular image endpoint
      const analysisEndpoint = voiceTranscript
        ? `${API_URL}/food/analyze-multimodal`
        : AI_IMAGE_ENDPOINT;

      // Send to AI vision API with regional context and user goals
      const { res, json } = await fetchWithTimeout(
        analysisEndpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            image: base64,
            highAccuracy: true,
            includeIngredients: true,
            // 🆕 REGIONAL CONTEXT (enables better portion sizing and model selection)
            cuisinePreference,
            region,
            cookingMethod,
            // 🆕 USER GOALS (enables personalized macronutrient recommendations)
            userGoals,
            // 🆕 VOICE CONTEXT (for multimodal input)
            voiceTranscript,
          }),
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

      // Build food log from AI response (unified response format)
      const rawAIData = json.data || json;
      const foodLog = buildFoodLog({
        inputText: 'Photo',
        source: 'photo',
        raw: rawAIData,
      });

      foodLog.imageUrl = uri;

      // Extract health metrics from unified response
      const unifiedHealthScore = rawAIData.healthScore ?? foodLog.healthScore ?? null;
      const unifiedNutriScore = rawAIData.nutriScore ?? foodLog.nutriscore ?? null;
      const healthAnalysis = rawAIData.healthAnalysis ?? null;

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
        // Health metrics from unified response
        healthScore: unifiedHealthScore,
        nutriScore: unifiedNutriScore,
        healthAnalysis: healthAnalysis,
        sourceEvidence: [{
          source: 'Image AI',
          confidence: rawAIData.dataQuality?.overallConfidence ?? 0.7,
          data: { imageUrl: uri, raw: rawAIData },
        }],
        isEditing: false,
        editedPortion: null,
      };

      setAnalysisResult({
        items: [aiItem],
        totals: calculateTotals([aiItem]),
        // Include overall health metrics in result
        healthScore: unifiedHealthScore,
        nutriScore: unifiedNutriScore,
        healthAnalysis: healthAnalysis,
      });

      setProgress(100);
    } catch (err) {
      if (err?.name === 'AbortError') {
        const errorMsg = 'Photo analysis timed out. Try again on a faster connection.';
        setError(errorMsg);
        return;
      }
      const errorMsg = typeof err?.message === 'string'
        ? err.message
        : 'Photo analysis failed. Please try again.';
      setError(errorMsg);
      throw err;
    } finally {
      isAnalyzingRef.current = false;
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
   * Remove ingredient from a food item and recalculate macros
   * @param {string} itemId - Parent item ID
   * @param {number} ingredientIndex - Index of ingredient to remove
   */
  const removeIngredient = useCallback((itemId, ingredientIndex) => {
    setAnalysisResult(prev => {
      if (!prev) return null;

      const updatedItems = prev.items.map(item => {
        if (item.itemId !== itemId) return item;

        // Get current ingredients array
        const ingredients = item.ingredients || item.components || [];
        if (ingredientIndex < 0 || ingredientIndex >= ingredients.length) {
          console.warn(`[useFoodAnalysis] Invalid ingredient index: ${ingredientIndex}`);
          return item;
        }

        // Get the ingredient being removed
        const removedIngredient = ingredients[ingredientIndex];

        // Calculate the macros to subtract
        const removedMacros = {
          calories_kcal: removedIngredient.calories || removedIngredient.calories_kcal || removedIngredient.macros?.calories_kcal || 0,
          protein_g: removedIngredient.protein || removedIngredient.protein_g || removedIngredient.macros?.protein_g || 0,
          carbs_g: removedIngredient.carbs || removedIngredient.carbs_g || removedIngredient.macros?.carbs_g || 0,
          fat_g: removedIngredient.fat || removedIngredient.fat_g || removedIngredient.macros?.fat_g || 0,
          fiber_g: removedIngredient.fiber || removedIngredient.fiber_g || removedIngredient.macros?.fiber_g || 0,
          sugar_g: removedIngredient.sugar || removedIngredient.sugar_g || removedIngredient.macros?.sugar_g || 0,
          sodium_mg: removedIngredient.sodium || removedIngredient.sodium_mg || removedIngredient.macros?.sodium_mg || 0,
        };

        // Create new ingredients array without the removed item
        const newIngredients = [...ingredients];
        newIngredients.splice(ingredientIndex, 1);

        // Update the item's macros by subtracting the removed ingredient
        const updatedMacros = {
          calories_kcal: Math.max(0, (item.macros?.calories_kcal || 0) - removedMacros.calories_kcal),
          protein_g: Math.max(0, (item.macros?.protein_g || 0) - removedMacros.protein_g),
          carbs_g: Math.max(0, (item.macros?.carbs_g || 0) - removedMacros.carbs_g),
          fat_g: Math.max(0, (item.macros?.fat_g || 0) - removedMacros.fat_g),
          fiber_g: Math.max(0, (item.macros?.fiber_g || 0) - removedMacros.fiber_g),
          sugar_g: Math.max(0, (item.macros?.sugar_g || 0) - removedMacros.sugar_g),
          sodium_mg: Math.max(0, (item.macros?.sodium_mg || 0) - removedMacros.sodium_mg),
        };

        console.log(`[useFoodAnalysis] Removed ingredient "${removedIngredient.name || 'Unknown'}" from "${item.name}"`);

        return {
          ...item,
          ingredients: item.ingredients ? newIngredients : undefined,
          components: item.components ? newIngredients : undefined,
          macros: updatedMacros,
        };
      });

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
    console.log('[useFoodAnalysis] runAnalysis called, inputText:', inputText);
    const text = inputText.trim();
    if (!text) {
      console.log('[useFoodAnalysis] No text - showing error');
      setError('Please describe your meal to analyze');
      return;
    }
    console.log('[useFoodAnalysis] Starting analysis for:', text);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      // 🆕 GET USER PROFILE FOR REGIONAL CONTEXT AND GOALS
      let cuisinePreference = null;
      let region = null;
      let cookingMethod = null;
      let userGoals = null;
      try {
        const profileRes = await fetch(`${API_URL}/profiles/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          cuisinePreference = profile?.cuisinePreference?.[0] || null;
          region = profile?.region || null;
          cookingMethod = profile?.cookingStyle || null;
          // Extract daily goals for personalized recommendations
          userGoals = {
            dailyCalories: profile?.goals?.dailyCalories || 2000,
            proteinG: profile?.goals?.proteinG || 150,
            carbsG: profile?.goals?.carbsG || 225,
            fatsG: profile?.goals?.fatsG || 65
          };
        }
      } catch (err) {
        console.warn('[useFoodAnalysis] Could not fetch user profile for regional context:', err.message);
      }

      // 🆕 PASS REGIONAL CONTEXT AND GOALS TO ANALYSIS
      await analyzeTextUniversal(text, {
        cuisinePreference,
        region,
        cookingMethod,
        userGoals,
        source: 'text'
      });
    } catch (err) {
      const errorMsg = err.message || 'Analysis failed. Please try again.';
      setError(errorMsg);
      console.error('[useFoodAnalysis] runAnalysis error:', err);
    }
  }, [inputText, analyzeTextUniversal, getToken]);

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
      // 🆕 GET USER PROFILE FOR REGIONAL CONTEXT IN AUTO-ANALYSIS
      const performAutoAnalysis = async () => {
        try {
          const token = await getToken();
          if (!token) {
            console.warn('[useFoodAnalysis] No token for auto-analysis');
            return;
          }

          let cuisinePreference = null;
          let region = null;
          let cookingMethod = null;
          try {
            const profileRes = await fetch(`${API_URL}/profiles/me`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (profileRes.ok) {
              const profile = await profileRes.json();
              cuisinePreference = profile?.cuisinePreference?.[0] || null;
              region = profile?.region || null;
              cookingMethod = profile?.cookingStyle || null;
            }
          } catch (err) {
            console.warn('[useFoodAnalysis] Could not fetch profile for auto-analysis:', err.message);
          }

          // 🆕 PASS REGIONAL CONTEXT TO AUTO-ANALYSIS
          await analyzeTextUniversal(debouncedText, {
            cuisinePreference,
            region,
            cookingMethod,
            source: 'text_auto'
          });
        } catch (err) {
          console.warn('[useFoodAnalysis] Auto-analysis error:', err.message);
        }
      };

      performAutoAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedText]); // CRITICAL FIX: Don't include isAnalyzing - causes infinite loop when it toggles false→true→false

  // P0-2 FIX: Cleanup abort controller and debounce timer on unmount
  // NOTE: Only abort if NOT currently analyzing to prevent race conditions
  useEffect(() => {
    return () => {
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      // Only abort if not analyzing - prevents cleanup from killing active requests
      // The request will complete and update state even if component remounts
      console.log('[useFoodAnalysis] Cleanup: Cleared debounce timer');
    };
  }, []); // Run only on unmount

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  return {
    // 🆕 VOICE ANALYSIS WITH REGIONAL CONTEXT
    analyzeVoice,

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
    removeIngredient,
    runAnalysis,

    // Shared state
    isAnalyzing,
    progress,
    error,
    clearError,
  };
}
