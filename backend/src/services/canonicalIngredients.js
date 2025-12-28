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

/**
 * Canonical form structure:
 * {
 *   canonical: "white rice",  // USDA-friendly term
 *   preparation: "cooked",    // Default cooking method
 *   portion: { amount: 1, unit: "cup" },  // Common serving
 *   synonyms: ["rice", "steamed rice", "boiled rice"]
 * }
 */

export const CANONICAL_FORMS = {
  // ============================================================================
  // GRAINS & STARCHES
  // ============================================================================

  rice: {
    canonical: "white rice",
    preparation: "cooked",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["rice", "plain rice", "steamed rice", "boiled rice"],
  },

  "white rice": {
    canonical: "white rice",
    preparation: "cooked",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["white rice"],
  },

  "brown rice": {
    canonical: "brown rice",
    preparation: "cooked",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["brown rice", "whole grain rice"],
  },

  "basmati rice": {
    canonical: "basmati rice",
    preparation: "cooked",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["basmati", "basmati rice"],
  },

  "jasmine rice": {
    canonical: "jasmine rice",
    preparation: "cooked",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["jasmine", "jasmine rice", "thai rice"],
  },

  // ============================================================================
  // PROTEINS - EGGS
  // ============================================================================

  egg: {
    canonical: "egg",
    preparation: "boiled",
    portion: { amount: 2, unit: "large" },
    synonyms: ["egg", "eggs"],
  },

  eggs: {
    canonical: "egg",
    preparation: "boiled",
    portion: { amount: 2, unit: "large" },
    synonyms: ["egg", "eggs", "boiled egg"],
  },

  "boiled eggs": {
    canonical: "egg",
    preparation: "boiled",
    portion: { amount: 2, unit: "large" },
    synonyms: ["boiled egg", "hard boiled egg"],
  },

  "scrambled eggs": {
    canonical: "egg",
    preparation: "scrambled",
    portion: { amount: 2, unit: "large" },
    synonyms: ["scrambled egg"],
  },

  "fried eggs": {
    canonical: "egg",
    preparation: "fried",
    portion: { amount: 2, unit: "large" },
    synonyms: ["fried egg", "sunny side up"],
  },

  omelet: {
    canonical: "egg",
    preparation: "omelet",
    portion: { amount: 2, unit: "large" },
    synonyms: ["omelette", "egg omelet"],
  },

  // ============================================================================
  // PROTEINS - CHICKEN
  // ============================================================================

  chicken: {
    canonical: "chicken breast",
    preparation: "grilled",
    portion: { amount: 4, unit: "oz" },
    synonyms: ["chicken", "plain chicken"],
  },

  "chicken breast": {
    canonical: "chicken breast",
    preparation: "grilled",
    portion: { amount: 4, unit: "oz" },
    synonyms: ["chicken breast", "breast"],
  },

  "grilled chicken": {
    canonical: "chicken breast",
    preparation: "grilled",
    portion: { amount: 4, unit: "oz" },
    synonyms: ["grilled chicken breast"],
  },

  "fried chicken": {
    canonical: "chicken",
    preparation: "fried",
    portion: { amount: 4, unit: "oz" },
    synonyms: ["fried chicken breast"],
  },

  "chicken thigh": {
    canonical: "chicken thigh",
    preparation: "grilled",
    portion: { amount: 4, unit: "oz" },
    synonyms: ["thigh", "chicken thighs"],
  },

  // ============================================================================
  // PROTEINS - FISH
  // ============================================================================

  salmon: {
    canonical: "salmon",
    preparation: "grilled",
    portion: { amount: 4, unit: "oz" },
    synonyms: ["salmon", "salmon fillet"],
  },

  "grilled salmon": {
    canonical: "salmon",
    preparation: "grilled",
    portion: { amount: 4, unit: "oz" },
    synonyms: ["grilled salmon fillet"],
  },

  tuna: {
    canonical: "tuna",
    preparation: "canned",
    portion: { amount: 3, unit: "oz" },
    synonyms: ["tuna", "canned tuna"],
  },

  // ============================================================================
  // PROTEINS - VEGETARIAN
  // ============================================================================

  tofu: {
    canonical: "tofu",
    preparation: "firm",
    portion: { amount: 100, unit: "g" },
    synonyms: ["tofu", "bean curd"],
  },

  "tofu stir fry": {
    canonical: "tofu",
    preparation: "stir fried",
    portion: { amount: 100, unit: "g" },
    synonyms: ["stir fried tofu"],
  },

  // ============================================================================
  // VEGETABLES
  // ============================================================================

  broccoli: {
    canonical: "broccoli",
    preparation: "steamed",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["broccoli", "broccoli florets"],
  },

  "steamed broccoli": {
    canonical: "broccoli",
    preparation: "steamed",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["steamed broccoli florets"],
  },

  spinach: {
    canonical: "spinach",
    preparation: "raw",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["spinach", "baby spinach"],
  },

  "cooked spinach": {
    canonical: "spinach",
    preparation: "cooked",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["sauteed spinach", "steamed spinach"],
  },

  "spinach curry": {
    canonical: "spinach curry",
    preparation: "cooked",
    portion: { amount: 1, unit: "serving" },
    synonyms: ["palak curry", "saag"],
  },

  carrots: {
    canonical: "carrot",
    preparation: "raw",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["carrot", "baby carrot"],
  },

  // ============================================================================
  // BREAD & TOAST
  // ============================================================================

  bread: {
    canonical: "bread",
    preparation: "white",
    portion: { amount: 1, unit: "slice" },
    synonyms: ["bread", "bread slice"],
  },

  toast: {
    canonical: "bread",
    preparation: "toasted",
    portion: { amount: 1, unit: "slice" },
    synonyms: ["toast", "toasted bread"],
  },

  "whole wheat toast": {
    canonical: "whole wheat bread",
    preparation: "toasted",
    portion: { amount: 1, unit: "slice" },
    synonyms: ["whole grain toast"],
  },

  "whole wheat bread": {
    canonical: "whole wheat bread",
    preparation: "regular",
    portion: { amount: 1, unit: "slice" },
    synonyms: ["whole grain bread", "brown bread"],
  },

  // ============================================================================
  // FRUITS
  // ============================================================================

  apple: {
    canonical: "apple",
    preparation: "raw",
    portion: { amount: 1, unit: "medium" },
    synonyms: ["apple", "apples"],
  },

  banana: {
    canonical: "banana",
    preparation: "raw",
    portion: { amount: 1, unit: "medium" },
    synonyms: ["banana", "bananas"],
  },

  avocado: {
    canonical: "avocado",
    preparation: "raw",
    portion: { amount: 0.5, unit: "medium" },
    synonyms: ["avocado", "avocados"],
  },
};

/**
 * Canonicalize user input to standard form
 * @param {string} userInput - What user typed (e.g., "eggs", "rice")
 * @returns {Object} Canonical form with preparation and portion
 */
export function canonicalize(userInput) {
  const normalized = userInput.toLowerCase().trim();

  // Exact match
  if (CANONICAL_FORMS[normalized]) {
    return {
      ...CANONICAL_FORMS[normalized],
      originalInput: userInput,
      matchType: "exact",
      confidence: 0.95,
    };
  }

  // Partial match (contains synonym)
  for (const [key, value] of Object.entries(CANONICAL_FORMS)) {
    if (value.synonyms.some((syn) => normalized.includes(syn) || syn.includes(normalized))) {
      return {
        ...value,
        originalInput: userInput,
        matchType: "synonym",
        confidence: 0.85,
      };
    }
  }

  // Fallback: Use as-is with low confidence
  return {
    canonical: userInput,
    preparation: "unknown",
    portion: { amount: 1, unit: "serving" },
    synonyms: [],
    originalInput: userInput,
    matchType: "unknown",
    confidence: 0.3,
    warning: "No canonical form found - using raw input",
  };
}

/**
 * Validate that all ingredients from user input were extracted
 * @param {string} userInput - Original user text
 * @param {Array} extractedItems - Items extracted by AI
 * @returns {Array} Validated items (with auto-added missing ingredients)
 */
export function validateExtraction(userInput, extractedItems) {
  const keywords = extractIngredientKeywords(userInput);
  const validated = [...extractedItems];

  for (const keyword of keywords) {
    const found = validated.some(
      (item) =>
        item.name.toLowerCase().includes(keyword.toLowerCase()) ||
        (item.canonical && item.canonical.canonical.toLowerCase().includes(keyword.toLowerCase()))
    );

    if (!found) {
      console.warn(`⚠️ [Validation] MISSED INGREDIENT: "${keyword}" from input "${userInput}"`);

      // Auto-add with canonical form
      const canonical = canonicalize(keyword);
      validated.push({
        name: keyword,
        quantity: canonical.portion.amount,
        unit: canonical.portion.unit,
        confidence: 0.5,
        notes: "Auto-detected (please verify quantity)",
        canonical: canonical,
        autoAdded: true,
      });

      console.log(`✅ [Validation] Auto-added: ${keyword} → ${canonical.canonical} (${canonical.portion.amount} ${canonical.portion.unit})`);
    }
  }

  return validated;
}

/**
 * Extract ingredient keywords from user input
 * Uses simple heuristics to find food terms
 * @param {string} userInput
 * @returns {Array<string>} Detected ingredient keywords
 */
function extractIngredientKeywords(userInput) {
  const text = userInput.toLowerCase();

  // Known food keywords to look for
  const keywords = [];

  // Check against all canonical forms
  for (const [key, value] of Object.entries(CANONICAL_FORMS)) {
    // Check if keyword or synonyms appear in input
    if (text.includes(key) || value.synonyms.some((syn) => text.includes(syn))) {
      keywords.push(key);
    }
  }

  return [...new Set(keywords)]; // Deduplicate
}
