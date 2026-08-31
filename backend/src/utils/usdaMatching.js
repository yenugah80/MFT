/**
 * USDA search-result matching — the single scoring implementation every
 * caller uses to pick a result out of a USDA free-text search, instead of
 * each resolver trusting whatever order the USDA API happened to return.
 *
 * Extracted from resolve.js (where this scoring logic already existed and
 * was already used by two call sites) because smartNutritionResolver.js's
 * own USDA path (_getUSDAVerification) was found to skip scoring entirely
 * and just take results[0] — the raw API's own ranking, unchecked. Same
 * scoring, one implementation, every caller gated by the same minimum
 * match-quality threshold below.
 */

// A "match" scoring well below this has no real signal (no exact phrase,
// low word coverage, no useful bonuses) — accepting it anyway means
// silently attaching a food's real nutrition data to a different food's
// name. Below this, callers must treat it as "no confident USDA match"
// and fall through to the next resolution step (ingredient breakdown, then
// LLM estimate) rather than trust it. Tuned against the scoring scale
// below (exactMatch 0-100, coverage 0-50, order 0-40, simplicity 0-30,
// method -10..+20, dataType 0-10): 25 requires roughly half the query's
// words to appear, or partial phrase/order evidence — not just "some food
// shares a common word with the query."
export const MIN_ACCEPTABLE_MATCH_SCORE = 25;

/**
 * Scores and ranks USDA search results against the original query,
 * returning the best match plus its score — or null if nothing clears
 * MIN_ACCEPTABLE_MATCH_SCORE.
 * @param {Array} results - USDA search results (each needs .description, .dataType)
 * @param {string} query - the original food query text
 * @returns {object|null} the best-scoring result (with .matchScore attached), or null
 */
export function selectBestUSDAMatch(results, query) {
  if (!results || results.length === 0) return null;

  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2); // Remove stop words ("a", "an", "or")

  // ========== INGREDIENT CONFLICT DETECTION (CRITICAL!) ==========
  const mainIngredients = {
    proteins: ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'fish', 'salmon', 'tuna', 'shrimp', 'tofu', 'tempeh', 'seitan'],
    vegetables: ['spinach', 'broccoli', 'kale', 'lettuce', 'cabbage', 'cauliflower', 'carrot', 'potato', 'tomato', 'onion', 'pepper', 'mushroom', 'eggplant'],
    grains: ['rice', 'wheat', 'quinoa', 'oats', 'barley', 'couscous']
  };

  // Find main ingredients in query
  const queryIngredients = [];
  for (const [category, ingredients] of Object.entries(mainIngredients)) {
    for (const ingredient of ingredients) {
      if (queryLower.includes(ingredient)) {
        queryIngredients.push({ ingredient, category });
      }
    }
  }

  const scored = results.map((result) => {
    const descLower = result.description.toLowerCase();
    // USDA descriptions are almost always comma-separated ("Chicken,
    // broilers, breast, meat only, raw") — splitting on whitespace alone
    // leaves trailing punctuation attached to each token ("chicken,"),
    // silently failing every word-level coverage/order comparison below
    // against a plain query word ("chicken") even for an exact food match.
    // Strip punctuation before tokenizing; descLower itself (used for the
    // exact-phrase substring check and ingredient-conflict detection) is
    // untouched, since those checks are about the real description text.
    const descWords = descLower.replace(/[,.]/g, '').split(/\s+/).filter(Boolean);

    // ========== CRITICAL: Check for ingredient conflicts ==========
    let ingredientMismatch = false;
    for (const queryIng of queryIngredients) {
      // Check if description has a DIFFERENT ingredient from the same category
      const conflictingIngredients = mainIngredients[queryIng.category].filter(ing => ing !== queryIng.ingredient);
      for (const conflictIng of conflictingIngredients) {
        if (descLower.includes(conflictIng)) {
          console.log(`[USDAMatch] ❌ INGREDIENT MISMATCH: Query has "${queryIng.ingredient}" but result has "${conflictIng}" - "${result.description}"`);
          ingredientMismatch = true;
          break;
        }
      }
      if (ingredientMismatch) break;
    }

    // If there's an ingredient mismatch, return very low score. _debug
    // keeps the same shape as every other branch (all factors 0) — every
    // candidate can hit this branch (e.g. searching "chicken breast" when
    // the only results are beef), and the final logging below reads
    // best._debug.exactMatch/coverageScore/etc unconditionally.
    if (ingredientMismatch) {
      return {
        ...result,
        matchScore: -1000,
        _debug: {
          exactMatch: 0, orderScore: 0, coverageScore: 0, simplicityScore: 0,
          methodScore: 0, dataTypeScore: 0, total: -1000,
          ingredientMismatch: true,
          reason: 'Conflicting main ingredient (e.g., spinach vs beef)'
        }
      };
    }

    // ========== FACTOR 1: Exact Phrase Match (100 points) ==========
    // "chicken breast" in "Chicken, broilers, breast, meat only" gets full score
    const exactMatch = descLower.includes(queryLower) ? 100 : 0;

    // ========== FACTOR 2: Word Order Similarity (max 40 points) ==========
    // Prefer "chicken breast" over "breast of chicken"
    let orderScore = 0;
    for (let i = 0; i < queryWords.length - 1; i++) {
      const word1 = queryWords[i];
      const word2 = queryWords[i + 1];
      const word1Idx = descWords.indexOf(word1);
      const word2Idx = descWords.indexOf(word2);

      if (word1Idx >= 0 && word2Idx >= 0) {
        if (word2Idx === word1Idx + 1) {
          // Consecutive words in exact order
          orderScore += 20;
        } else if (word2Idx > word1Idx) {
          // Correct order but not consecutive
          orderScore += 10;
        }
      }
    }

    // ========== FACTOR 3: Word Coverage (max 50 points) ==========
    // How many query words appear in description?
    const matchedWords = queryWords.filter(word => descWords.includes(word)).length;
    const coverageScore = queryWords.length > 0 ? (matchedWords / queryWords.length) * 50 : 0;

    // ========== FACTOR 4: Simplicity Bonus (max 30 points) ==========
    // Prefer shorter, simpler descriptions
    // "Chicken, breast, raw" (4 words) better than "Chicken breast sandwich with lettuce and mayo" (8 words)
    const wordCount = descWords.length;
    const simplicityScore = Math.max(0, 30 - wordCount * 2); // Penalize 2 points per word

    // ========== FACTOR 5: Cooking Method Alignment (max 20 points or -10 penalty) ==========
    const cookingMethods = ['grilled', 'fried', 'baked', 'roasted', 'steamed', 'boiled', 'raw', 'cooked'];
    const cookingSynonyms = {
      'grilled': ['grilled', 'broiled', 'barbecued'],
      'baked': ['baked', 'roasted', 'oven'],
      'fried': ['fried', 'deep-fried', 'pan-fried'],
      'steamed': ['steamed'],
      'boiled': ['boiled', 'simmered'],
      'raw': ['raw', 'uncooked', 'fresh'],
      'cooked': ['cooked', 'prepared', 'dry heat', 'moist heat'],
    };

    let queryMethod = null;
    for (const method of cookingMethods) {
      if (queryLower.includes(method)) {
        queryMethod = method;
        break;
      }
    }

    let descMethod = null;
    for (const [method, synonyms] of Object.entries(cookingSynonyms)) {
      if (synonyms.some(syn => descLower.includes(syn))) {
        descMethod = method;
        break;
      }
    }

    let methodScore = 0;
    if (queryMethod && descMethod) {
      // Both have cooking method
      if (queryMethod === descMethod || cookingSynonyms[queryMethod]?.some(syn => descLower.includes(syn))) {
        methodScore = 20; // Perfect match or synonym
      } else {
        methodScore = -10; // Mismatched methods (grilled vs fried)
      }
    } else if (!queryMethod && !descMethod) {
      // Neither has method - prefer raw/generic foods
      methodScore = 15;
    } else if (!queryMethod && descMethod === 'raw') {
      // User didn't specify method, description is raw - good default
      methodScore = 10;
    } else if (!queryMethod && descMethod) {
      // User didn't specify method but desc has one (not raw)
      methodScore = -5; // Slight penalty (user might want raw)
    } else if (queryMethod && !descMethod) {
      // User specified method but desc doesn't have it
      methodScore = -10; // Penalty for missing method
    }

    // ========== FACTOR 6: Data Type Preference (max 10 points) ==========
    // Prefer SR Legacy (Standard Reference) over Branded for generic foods
    let dataTypeScore = 0;
    if (result.dataType === 'SR Legacy' || result.dataType === 'Foundation') {
      dataTypeScore = 10; // High-quality reference data
    } else if (result.dataType === 'Survey (FNDDS)') {
      dataTypeScore = 5; // Survey data
    } else {
      dataTypeScore = 0; // Branded or other
    }

    // ========== TOTAL SCORE ==========
    const totalScore = exactMatch + orderScore + coverageScore + simplicityScore + methodScore + dataTypeScore;

    return {
      ...result,
      matchScore: totalScore,
      _debug: {
        exactMatch,
        orderScore,
        coverageScore,
        simplicityScore,
        methodScore,
        dataTypeScore,
        total: totalScore
      }
    };
  });

  // Sort by score descending
  scored.sort((a, b) => b.matchScore - a.matchScore);

  const best = scored[0];

  console.log(
    `[USDAMatch] Best match for "${query}": "${best.description}" ` +
    `(score: ${best.matchScore.toFixed(1)}, breakdown: exact=${best._debug.exactMatch}, ` +
    `order=${best._debug.orderScore}, coverage=${best._debug.coverageScore.toFixed(1)}, ` +
    `simplicity=${best._debug.simplicityScore}, method=${best._debug.methodScore}, ` +
    `dataType=${best._debug.dataTypeScore})`
  );

  if (scored.length > 1) {
    console.log(`[USDAMatch] Runner-up: "${scored[1].description}" (score: ${scored[1].matchScore.toFixed(1)})`);
  }

  // A relevance floor, separate from the score cutoff below: the
  // simplicity/method-neutral bonuses can add up to ~37 points on their
  // own with ZERO actual query-word overlap (confirmed live: "chicken
  // tikka masala" against "Snack food, generic mix" scored 37 — above a
  // naive threshold — purely from those bonuses, despite not one query
  // word appearing in the description). No overlap at all can never be a
  // real match regardless of total score.
  if (best._debug.exactMatch === 0 && best._debug.coverageScore === 0) {
    console.warn(`[USDAMatch] ⚠️ Best match for "${query}" ("${best.description}") shares no words with the query at all — rejecting regardless of score (${best.matchScore.toFixed(1)}).`);
    return null;
  }

  if (best.matchScore < MIN_ACCEPTABLE_MATCH_SCORE) {
    console.warn(`[USDAMatch] ⚠️ Best match for "${query}" scored ${best.matchScore.toFixed(1)}, below the ${MIN_ACCEPTABLE_MATCH_SCORE} threshold — rejecting, caller should fall through to the next resolution step.`);
    return null;
  }

  return best;
}
