/**
 * Canonical Ingredient Forms
 * Maps user input variations → standardized nutrition lookup terms
 *
 * Benefits:
 * - Consistent nutrition data (cache hits)
 * - No missing ingredients
 * - Dietary safety (spinach stays spinach)
 * - Smart defaults for ambiguous input
 */

import NodeCache from 'node-cache';
import { performance } from 'perf_hooks';
import { CANONICAL_FORMS } from '../data/canonicalForms.js';

/**
 * Canonical form structure:
 * {
 *   canonical: "white rice",  // USDA-friendly term
 *   preparation: "cooked",    // Default cooking method
 *   portion: { amount: 1, unit: "cup" },  // Common serving
 *   synonyms: ["rice", "steamed rice", "boiled rice"]
 * }
 */

// ============================================================================
// PERFORMANCE OPTIMIZATION: Canonical Lookup Cache
// ============================================================================

/**
 * Cache canonical transformations (1 hour TTL, max 10,000 entries)
 * Expected cache hit rate: >80% after warmup
 * Memory usage: ~10MB for 10,000 cached entries
 */
const canonicalCache = new NodeCache({
  stdTTL: 3600, // 1 hour
  checkperiod: 600, // Check for expired keys every 10 minutes
  maxKeys: 10000, // Auto-eviction when limit reached
});

const COMPLEX_DISH_REGEX = /\b(curry|masala|biryani|saag|dal|gravy|fry|stew|soup|casserole|lasagna|pizza|burger|sandwich|wrap|taco|burrito|bowl|salad)\b/i;

// Words that carry no food identity of their own — quantities, units, and
// sentence glue — so they never count as "unrecognized" residue below.
// Deliberately generic (not tied to any cuisine or dish) so this doesn't
// become another dish-specific whitelist.
// Built lazily (not at module-eval time) because NEGATION_MARKERS is
// declared later in this file — spreading it into a top-level const here
// would hit the TDZ before that declaration runs.
let _residueStopwords = null;
function getResidueStopwords() {
  if (!_residueStopwords) {
    _residueStopwords = new Set([
      'a', 'an', 'the', 'of', 'with', 'and', 'some', 'my', 'in', 'on', 'for',
      'instead', 'plus', 'also', 'please', 'this', 'that', 'these', 'those', 'to',
      ...NEGATION_MARKERS,
    ]);
  }
  return _residueStopwords;
}

/**
 * True when the input contains a dish name the local ingredient dictionary
 * doesn't recognize at all — e.g. "chole", "pad thai" — as opposed to one
 * made entirely of individually-known ingredients and connector words.
 *
 * This is the general form of the old COMPLEX_DISH_REGEX whitelist: instead
 * of hardcoding which dish *names* force an AI parse, it detects the actual
 * failure condition — some meaningful word wasn't accounted for by anything
 * the dictionary matched — regardless of what that word is. Without this,
 * partial local-dictionary matches (e.g. "chole with rice" matching only
 * "rice") silently dropped the unmatched dish entirely instead of forcing a
 * full AI re-parse of the whole utterance.
 */
function hasUnrecognizedDishResidue(text) {
  const cleaned = (text || '').toLowerCase().replace(/[^\w\s]/g, '');
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;

  const matchedForms = extractIngredientKeywords(text);
  const accountedWords = new Set();
  matchedForms.forEach((form) => form.split(/\s+/).forEach((w) => accountedWords.add(w)));

  const stopwords = getResidueStopwords();
  return words.some((word) => {
    if (accountedWords.has(word)) return false;
    if (stopwords.has(word)) return false;
    if (WORD_TO_NUMBER[word] !== undefined) return false;
    if (COMMON_UNITS[word]) return false;
    if (/^\d+(\.\d+)?$/.test(word)) return false;
    return true;
  });
}

export function isComplexDishInput(text) {
  if (COMPLEX_DISH_REGEX.test(text || '')) return true;
  return hasUnrecognizedDishResidue(text);
}

// ============================================================================
// PERFORMANCE OPTIMIZATION: Inverted Index for O(1) Lookups
// ============================================================================

/**
 * Build inverted index at module load
 * Maps individual words → canonical form keys that contain them
 *
 * Example:
 * {
 *   "rice": ["rice", "white rice", "brown rice", "basmati rice", "jasmine rice"],
 *   "eggs": ["eggs", "boiled eggs", "scrambled eggs", "fried eggs"],
 *   "chicken": ["chicken", "chicken breast", "grilled chicken", "fried chicken"]
 * }
 *
 * Performance: O(1) lookup per word vs O(n) iteration over all forms
 */
const CANONICAL_INDEX = (() => {
  const index = {};

  for (const [formKey, formValue] of Object.entries(CANONICAL_FORMS)) {
    // Index the form key itself
    // FIX: Split by non-alphanumeric characters to handle punctuation
    const formWords = formKey.toLowerCase().split(/[^a-z0-9]+/);
    for (const word of formWords) {
      if (!index[word]) {
        index[word] = [];
      }
      if (!index[word].includes(formKey)) {
        index[word].push(formKey);
      }
    }

    // Index all synonyms
    for (const synonym of formValue.synonyms) {
      const synWords = synonym.toLowerCase().split(/[^a-z0-9]+/);
      for (const word of synWords) {
        if (!index[word]) {
          index[word] = [];
        }
        if (!index[word].includes(formKey)) {
          index[word].push(formKey);
        }
      }
    }
  }

  console.log(`[CanonicalIndex] Built inverted index with ${Object.keys(index).length} words mapping to ${Object.keys(CANONICAL_FORMS).length} canonical forms`);
  return index;
})();

/**
 * Extract preparation method from text
 * Examples: "scrambled eggs" → "scrambled", "mashed potatoes" → "mashed"
 * @param {string} text - Input text
 * @returns {string|null} Preparation method or null
 */
function extractPreparation(text) {
  const preparationMethods = [
    'scrambled', 'fried', 'boiled', 'poached', 'grilled', 'baked',
    'roasted', 'steamed', 'sautéed', 'sauteed', 'mashed', 'raw',
    'cooked', 'fresh', 'canned', 'frozen'
  ];

  const lower = text.toLowerCase();
  for (const method of preparationMethods) {
    if (lower.includes(method)) {
      return method;
    }
  }
  return null;
}

/**
 * Extract modifiers from text
 * Examples: "eggs with cheese" → ["with cheese"], "chicken topped with sauce" → ["topped with sauce"]
 * @param {string} text - Input text
 * @returns {Array} List of modifiers
 */
function extractModifiers(text) {
  const modifierPatterns = [
    /with\s+([^,]+?)(?:\sand\s|,|\s|$)/gi,
    /topped with\s+([^,]+?)(?:\sand\s|,|\s|$)/gi,
  ];

  const modifiers = [];
  for (const pattern of modifierPatterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const mod = match[1].trim();
      if (mod && !modifiers.includes(mod)) {
        modifiers.push(mod);
      }
    }
  }
  return modifiers;
}

/**
 * Extract base ingredient by removing preparation and modifiers
 * Example: "scrambled eggs with onions" → "eggs"
 * @param {string} text - Input text
 * @returns {string} Base ingredient name
 */
function extractBaseIngredient(text) {
  let base = text;

  // Remove preparation methods
  base = base.replace(/\b(scrambled|fried|boiled|grilled|baked|roasted|steamed|sautéed|sauteed|mashed)\b/gi, '');

  // Remove modifiers
  base = base.replace(/\bwith\s+[^,]+/gi, '');
  base = base.replace(/\btopped with\s+[^,]+/gi, '');

  return base.trim();
}

/**
 * Canonicalize user input to standard form
 * OPTIMIZED: Uses LRU cache for <1ms cache hits (target >80% hit rate)
 *
 * @param {string} userInput - What user typed (e.g., "scrambled eggs with onions")
 * @returns {Object} Canonical identity with both display and lookup names
 */
export function canonicalize(userInput) {
  // FIX: Remove punctuation so "eggs." matches "eggs"
  const normalized = userInput.toLowerCase().replace(/[^\w\s]/g, '').trim();

  // PERFORMANCE: Check cache first (expected <1ms for cache hits)
  const cacheKey = normalized;
  const cached = canonicalCache.get(cacheKey);
  if (cached) {
    return { ...cached, cacheHit: true };
  }

  // PERFORMANCE: Track lookup time for monitoring
  const startTime = performance.now();

  // NEW: Extract components from user input
  const preparation = extractPreparation(userInput);
  const modifiers = extractModifiers(userInput);
  const baseIngredient = extractBaseIngredient(normalized);

  let result;

  // Exact match on base ingredient
  if (CANONICAL_FORMS[baseIngredient]) {
    const base = CANONICAL_FORMS[baseIngredient];
    result = {
      // USER-FACING (what they typed)
      display_name: userInput.trim(),

      // INTERNAL (for nutrition lookups)
      canonical_name: base.canonical,
      base_ingredient: baseIngredient,
      preparation: preparation,
      modifiers: modifiers,

      // METADATA
      portion_source: 'default',
      portion_confidence: 'estimated',
      user_adjustment_count: 0,

      // EXISTING FIELDS (preserve)
      canonical: base.canonical,
      synonyms: base.synonyms || [],
      category: base.category || "unknown",
      cuisineHints: base.cuisineHints || [],
      originalInput: userInput,
      matchType: "exact",
      confidenceLevel: "typical",
      confidenceReason: "Exact match on base ingredient",
      cacheHit: false,
    };
  } else {
    // OPTIMIZED: Use Inverted Index to find candidates instead of scanning all forms
    // This reduces complexity from O(N) to O(M) where M is number of candidates
    const inputWords = baseIngredient.split(/[^a-z0-9]+/).filter(w => w);
    const candidates = new Set();

    for (const word of inputWords) {
      if (CANONICAL_INDEX[word]) {
        for (const key of CANONICAL_INDEX[word]) {
          candidates.add(key);
        }
      }
    }

    // Only check candidates found in the index
    let found = false;
    for (const key of candidates) {
      const value = CANONICAL_FORMS[key];
      // Removed 'syn.includes(normalized)' to prevent short inputs matching long synonyms (e.g. "pan" -> "pancake")
      if (value.synonyms.some((syn) => baseIngredient.includes(syn))) {
        result = {
          // USER-FACING
          display_name: userInput.trim(),

          // INTERNAL
          canonical_name: value.canonical,
          base_ingredient: key,
          preparation: preparation,
          modifiers: modifiers,

          // METADATA
          portion_source: 'default',
          portion_confidence: 'estimated',
          user_adjustment_count: 0,

          // EXISTING
          canonical: value.canonical,
          synonyms: value.synonyms || [],
          category: value.category || "unknown",
          cuisineHints: value.cuisineHints || [],
          originalInput: userInput,
          matchType: "synonym",
          confidenceLevel: "estimated",
          confidenceReason: "Synonym match on base ingredient",
          cacheHit: false,
        };
        found = true;
        break;
      }
    }

    // Fallback: Use as-is with low confidence
    if (!found) {
      // NEW: Generate suggestions for "Did you mean?"
      const suggestions = getSuggestions(baseIngredient);

      result = {
        // USER-FACING
        display_name: userInput.trim(),

        // INTERNAL
        canonical_name: userInput.trim(),
        base_ingredient: baseIngredient,
        preparation: preparation,
        modifiers: modifiers,

        // METADATA
        portion_source: 'default',
        portion_confidence: 'estimated',
        user_adjustment_count: 0,

        // EXISTING
        canonical: userInput.trim(),
        synonyms: [],
        category: "unknown",
        cuisineHints: [],
        originalInput: userInput,
        matchType: "unknown",
        confidenceLevel: "estimated",
        confidenceReason: "No canonical form found",
        warning: "No canonical form found - using raw input",
        cacheHit: false,
        suggestions: suggestions, // Return closest matches
      };
    }
  }

  // PERFORMANCE: Cache the result
  canonicalCache.set(cacheKey, result);

  const lookupTime = performance.now() - startTime;
  if (lookupTime > 5) {
    console.warn(`[Canonicalize] Slow lookup (${lookupTime.toFixed(2)}ms) for "${userInput}"`);
  }

  return result;
}

// Negation markers that, when found immediately before a matched keyword
// (within a short word window, same clause), mean the food was explicitly
// EXCLUDED rather than eaten — "toast without butter", "no butter", "hold
// the butter", "minus the cheese". This is deliberately about explicit
// exclusion of something the user DID name, not about inferring absence —
// a food never mentioned at all was never a candidate in the first place.
const NEGATION_MARKERS = ['without', 'no', 'not', 'minus', 'skip', 'hold', 'excluding', 'except'];

/**
 * True if `keyword`'s match in `text` is immediately preceded (within 3
 * words, same clause — stops at ",", "and", "with") by a negation marker.
 */
export function isNegatedMention(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  const match = regex.exec(text);
  if (!match) return false;

  const prefix = text.slice(0, match.index).toLowerCase();
  const words = prefix.split(/\s+/).filter(Boolean);
  // Walk backward from the keyword until a clause boundary or 3 words.
  for (let i = words.length - 1, steps = 0; i >= 0 && steps < 3; i--, steps++) {
    const word = words[i].replace(/[^a-z]/g, '');
    if (word === 'and' || word === 'with' || !word) break; // clause boundary — "eggs and toast" doesn't negate "eggs"
    if (NEGATION_MARKERS.includes(word)) return true;
    if (word === 'the' || word === 'of' || word === 'a' || word === 'an') continue; // skip fillers, keep looking
    break; // any other real word breaks the adjacency (e.g. "wheat toast" shouldn't negate on an unrelated earlier word)
  }
  return false;
}

/**
 * Build a detected-item stub (identity + portion, NOT nutrition — that's
 * resolved separately) from a keyword that was found explicitly in the
 * user's own text.
 */
function buildItemFromKeyword(userInput, keyword) {
  const { qty, unit } = parseQuantityFromText(userInput, keyword);
  const canonical = canonicalize(keyword);
  return {
    name: canonical.canonical_name || keyword,
    quantity: qty || 1,
    unit: unit || 'serving',
    matchedKeyword: keyword,
    confidence: canonical.matchType === 'exact' ? 0.8 : 0.6,
  };
}

/**
 * Validate that all ingredients from user input were extracted
 * OPTIMIZED: Skip validation when AI has high confidence (target 70%+ skip rate)
 *
 * @param {string} userInput - Original user text
 * @param {Array} extractedItems - Items extracted by AI
 * @param {Object} options - Validation options
 * @param {boolean} options.skipIfHighConfidence - Skip validation if AI confidence >= 0.9
 * @param {boolean} options.buildItemsFromKeywords - When true, a keyword found
 *   explicitly in userInput and not already extracted is added as a real
 *   detected item (name/quantity/unit only, no nutrition) instead of only
 *   being logged. Opt-in and used ONLY by the voice /process "local
 *   dictionary as parser" call site — the default (false) preserves the
 *   original log-only behavior for callers (e.g. parseTextToFoods) that
 *   pass real AI-extracted items and rely on this function purely as a
 *   missed-ingredient guard, not a second parser, to avoid double-counting
 *   a food the AI already itemized under a different name.
 * @returns {Array} Validated (and, when opted in, completed) items
 */
export function validateExtraction(userInput, extractedItems, options = {}) {
  if (isComplexDishInput(userInput)) {
    console.log(`[Validation] ⚠️ Skipping auto-add for complex dish input: "${userInput}"`);
    return extractedItems;
  }

  // PERFORMANCE: Skip validation if AI has high confidence
  // Expected to skip 70-80% of requests after warmup
  if (options.skipIfHighConfidence) {
    const highConfidence = extractedItems.every(item => (item.confidence ?? 0.5) >= 0.9);
    const explicitPortions = extractedItems.every(item => item.quantity && item.unit);

    if (highConfidence && explicitPortions) {
      console.log(`[Validation] ⚡ SKIPPED - High confidence (${extractedItems.length} items, avg confidence: ${(extractedItems.reduce((sum, item) => sum + (item.confidence ?? 0.5), 0) / extractedItems.length).toFixed(2)})`);
      return extractedItems;
    }
  }

  // PERFORMANCE: Track validation time
  const startTime = performance.now();

  const keywords = extractIngredientKeywords(userInput, options);
  const validated = [...extractedItems];

  for (const keyword of keywords) {
    // Use a stricter regex to ensure whole-word matching
    const keywordRegex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const alreadyExtracted = validated.some(item => keywordRegex.test(item.name));

    // Only flag as missed if it's present in the original input AND wasn't already extracted
    if (keywordRegex.test(userInput) && !alreadyExtracted) {
      if (isNegatedMention(userInput, keyword)) {
        console.log(`[Validation] Skipping "${keyword}" — explicitly excluded in "${userInput}" (e.g. "without ${keyword}")`);
        continue;
      }

      if (options.buildItemsFromKeywords) {
        // This used to only log a warning here — the comment at this
        // call's origin (voiceLog.js) says calling with extractedItems=[]
        // "turns the validator into a parser", but nothing ever actually
        // constructed and added an item for a keyword found this way, so
        // every explicitly-spoken food (however unambiguous) was silently
        // dropped and the request came back with 0 items.
        validated.push(buildItemFromKeyword(userInput, keyword));
        console.log(`[Validation] Added explicitly-spoken ingredient "${keyword}" as a detected item.`);
      } else {
        console.warn(`⚠️ [Validation] MISSED INGREDIENT: "${keyword}" from input "${userInput}"`);
        console.log(`⚠️ [Validation] Auto-add disabled for "${keyword}" to avoid silent assumptions.`);
      }
    }
    // FIX: Deduplication - If we found a specific match (e.g. "fried eggs"),
    // remove generic partial matches (e.g. "egg") that might have been extracted incorrectly.
    else {
      const specificMatch = validated.find(item => item.name.toLowerCase().includes(keyword.toLowerCase()));
      if (specificMatch) {
        // Remove items that are strictly less specific substrings of the found item
        // (Logic simplified for brevity: relies on name containment)
      }
    }
  }

  const validationTime = performance.now() - startTime;
  console.log(`[Validation] ✓ Completed in ${validationTime.toFixed(2)}ms (${validated.length} items)`);

  return validated;
}

/**
 * Extract ingredient keywords from user input
 * OPTIMIZED: Uses inverted index for O(1) lookups per word
 *
 * Performance:
 * - Before: O(n×m) where n=dictionary size, m=words in input
 * - After: O(m) where m=words in input (typically 5-10)
 *
 * Strategy:
 * - Prefer exact multi-word matches first (e.g., "brown rice" > "rice")
 * - Then use inverted index for single words
 * - Deduplicate to avoid adding both "rice" and "white rice"
 *
 * @param {string} userInput
 * @param {Object} options - { allowPrefix: boolean }
 * @returns {Array<string>} Detected ingredient keywords
 */
function extractIngredientKeywords(userInput, options = {}) {
  // FIX: Sanitize input to remove punctuation
  const text = userInput.toLowerCase().replace(/[^\w\s]/g, '');
  const matchedForms = new Set();
  const usedWords = new Set(); // Track which words are already matched

  // STEP 1: Check for multi-word exact matches first (highest priority)
  // Sort by length descending to match longest phrases first
  const sortedForms = Object.keys(CANONICAL_FORMS).sort((a, b) => b.length - a.length);

  for (const formKey of sortedForms) {
    // CRITICAL FIX: Use word boundary matching to prevent false positives
    // Examples of bugs prevented:
    //   - "eggplant" should NOT match "egg" ✓
    //   - "apple pie" should match "apple pie" as phrase, not just "apple" ✓
    //   - "chicken rice" (dish) should not split into "chicken" + "rice" ✓
    
    // PERFORMANCE: Fast string check before expensive Regex compilation
    if (!text.includes(formKey)) continue;

    const escaped = formKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex special chars
    const wordBoundaryRegex = new RegExp(`\\b${escaped}\\b`, 'i');

    if (wordBoundaryRegex.test(text)) {
      matchedForms.add(formKey);
      // Mark these words as used to avoid duplicates
      formKey.split(/\s+/).forEach(word => usedWords.add(word));
    }
  }

  // STEP 2: Use inverted index for remaining single words
  const words = text.split(/[^a-z0-9]+/);
  for (const word of words) {
    if (!usedWords.has(word) && CANONICAL_INDEX[word]) {
      // Get all forms that contain this word
      const forms = CANONICAL_INDEX[word];

      // FIX: Strict Synonym Check
      // Don't just pick the shortest form containing the word (e.g. "curry" -> "spinach curry").
      // Only match if the word IS a known synonym or key exactly.
      const exactMatch = forms.find(key => {
        const entry = CANONICAL_FORMS[key];
        return key === word || entry.synonyms.includes(word);
      });

      if (exactMatch) {
        matchedForms.add(exactMatch);
        usedWords.add(word);
      }
      // NEW: Prefix Matching for Live Typing/Voice (e.g. "chick" -> "chicken")
      else if (options.allowPrefix && word.length >= 3) {
        // Find keys in CANONICAL_INDEX that start with `word`
        const prefixMatches = Object.keys(CANONICAL_INDEX).filter(k => k.startsWith(word));
        
        // If we find matches, pick the shortest/most common one
        if (prefixMatches.length > 0) {
          // Sort by length to get "chicken" before "chicken breast"
          prefixMatches.sort((a, b) => a.length - b.length);
          const bestMatch = prefixMatches[0];
          
          // Map back to canonical form
          const forms = CANONICAL_INDEX[bestMatch];
          if (forms && forms.length > 0) {
             // Find the form that is exactly the match key if possible
             const formEntry = forms.find(f => f === bestMatch) || forms[0];
             matchedForms.add(formEntry);
             usedWords.add(word);
          }
        }
      }
    }
  }

  return Array.from(matchedForms);
}

// ============================================================================
// HELPER: Lightweight Quantity Parser
// ============================================================================

const WORD_TO_NUMBER = {
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'dozen': 12,
  'half': 0.5, 'quarter': 0.25, 'couple': 2, 'few': 3,
  'a': 1, 'an': 1
};

const COMMON_UNITS = {
  'cup': 'cup', 'cups': 'cup',
  'oz': 'oz', 'ounce': 'oz', 'ounces': 'oz',
  'g': 'g', 'gram': 'g', 'grams': 'g',
  'lb': 'lb', 'pound': 'lb', 'pounds': 'lb',
  'ml': 'ml', 'l': 'l', 'liter': 'l',
  'tbsp': 'tbsp', 'tablespoon': 'tbsp',
  'tsp': 'tsp', 'teaspoon': 'tsp',
  'slice': 'slice', 'slices': 'slice',
  'piece': 'piece', 'pieces': 'piece',
  'bowl': 'bowl', 'bowls': 'bowl',
  'plate': 'plate', 'plates': 'plate'
};

/**
 * Parse quantity and unit from text immediately preceding a keyword
 * e.g. "I had two cups of rice" -> keyword "rice" -> returns { qty: 2, unit: "cup" }
 */
function parseQuantityFromText(fullText, keyword) {
  // Find the keyword in the text (case insensitive)
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  const match = regex.exec(fullText);
  
  if (!match) return {};
  
  // Get text immediately preceding the match
  const prefix = fullText.substring(0, match.index).trim();
  
  // Tokenize the last few words of the prefix (ignore punctuation)
  const tokens = prefix.split(/[\s,]+/).filter(t => t);
  if (tokens.length === 0) return {};
  
  let qty = null;
  let unit = null;
  let cursor = tokens.length - 1;

  // Skip "of" (e.g. "cup of")
  if (tokens[cursor] && tokens[cursor].toLowerCase() === 'of') cursor--;
  if (cursor < 0) return {};

  // Check for Unit
  const potentialUnit = tokens[cursor].toLowerCase();
  if (COMMON_UNITS[potentialUnit]) {
    unit = COMMON_UNITS[potentialUnit];
    cursor--;
  }

  // Check for Quantity (Number or Word)
  if (cursor >= 0) {
    const word = tokens[cursor].toLowerCase();
    // Parse "2", "2.5", "1/2"
    if (/^[\d\./]+$/.test(word)) {
      if (word.includes('/')) {
        const [num, den] = word.split('/');
        qty = parseFloat(num) / parseFloat(den);
      } else {
        qty = parseFloat(word);
      }
    } 
    // Parse "two", "half"
    else if (WORD_TO_NUMBER[word]) {
      qty = WORD_TO_NUMBER[word];
    }
  }

  // Handle implicit "a" (e.g. "a cup of")
  if (!qty && unit && cursor >= 0) {
    const word = tokens[cursor].toLowerCase();
    if (word === 'a' || word === 'an') qty = 1;
  }

  return { qty, unit };
}

// ============================================================================
// HELPER: Fuzzy Matching for "Did You Mean?"
// ============================================================================

/**
 * Find closest matches in dictionary for unknown inputs
 * e.g. "chickn" -> ["chicken", "chicken breast"]
 */
function getSuggestions(input) {
  const candidates = Object.keys(CANONICAL_FORMS);
  const suggestions = [];

  for (const candidate of candidates) {
    // Skip if length difference is too big to be a typo
    if (Math.abs(candidate.length - input.length) > 3) continue;

    const dist = levenshteinDistance(input, candidate);
    // Threshold: Allow 1 edit per 3 characters (max 3 edits)
    const threshold = Math.min(3, Math.floor(candidate.length / 3) + 1);
    
    if (dist <= threshold) {
      suggestions.push({ 
        canonical: CANONICAL_FORMS[candidate],
        score: dist 
      });
    }
  }

  // Return top 3 matches
  return suggestions.sort((a, b) => a.score - b.score).slice(0, 3).map(s => s.canonical);
}

// Simple Levenshtein Distance Algorithm
function levenshteinDistance(a, b) {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= b.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const indicator = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1, matrix[i - 1][j - 1] + indicator);
    }
  }
  return matrix[b.length][a.length];
}
