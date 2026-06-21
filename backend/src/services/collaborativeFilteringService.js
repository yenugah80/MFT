/**
 * Collaborative Filtering Service
 *
 * Finds "users like you" based on shared food acceptance patterns and surfaces
 * foods those similar users accepted that the current user hasn't tried yet.
 *
 * Algorithm: User-based k-NN via Jaccard similarity on accepted food name sets.
 * - Min overlap of 3 shared accepted foods to qualify as "similar"
 * - Results are returned as Candidate objects compatible with candidateGenerationService
 * - In-memory TTL cache (1 hour) to avoid repeated cross-user DB scans
 *
 * Limitations (Phase 1):
 * - No matrix factorization — pure set overlap
 * - Similarity is computed over all-time accepted foods (not windowed)
 * - Cannot make privacy-sensitive recommendations (no PII crosses users)
 */

import { db } from '../config/db.js';
import { recommendationsHistoryTable } from '../db/schema.js';
import { and, eq, inArray, ne } from 'drizzle-orm';
import NodeCache from 'node-cache';
import { inferFoodAttributes } from './foodKnowledgeGraphService.js';

// 1-hour TTL — collaborative signals change slowly
const cfCache = new NodeCache({ stdTTL: 3600, checkperiod: 900, maxKeys: 2000 });

const MIN_OVERLAP = 3;       // Minimum shared accepted foods to be "similar"
const MAX_SIMILAR_USERS = 8; // Neighbour cap — balances recall vs query cost
const MAX_CF_CANDIDATES = 8; // Max candidates returned per user

/**
 * Build a cache key for a user's collaborative-filter candidates.
 */
function cfCacheKey(userId) {
  return `cf:${userId}`;
}

/**
 * Compute Jaccard similarity between two sets.
 * @param {Set<string>} a
 * @param {Set<string>} b
 * @returns {number} [0, 1]
 */
function jaccardSimilarity(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Fetch foods accepted by similar users that the current user hasn't tried.
 *
 * @param {string}   userId              - Current user
 * @param {string[]} currentUserAccepted - Food names already accepted by this user
 * @param {object}   [options]
 * @param {number}   [options.limit=8]   - Max candidates to return
 * @returns {Promise<Array<{id, name, nutrition, tags, score, source, portion, mealTypes, cuisineTags}>>}
 */
export async function getCollaborativeCandidates(userId, currentUserAccepted = [], options = {}) {
  const { limit = MAX_CF_CANDIDATES } = options;

  if (currentUserAccepted.length === 0) return [];

  // Check cache first
  const cacheKey = cfCacheKey(userId);
  const cached = cfCache.get(cacheKey);
  if (cached) return cached.slice(0, limit);

  try {
    const currentSet = new Set(currentUserAccepted.map((n) => n.toLowerCase().trim()));

    // Step 1: Find all users (excluding current) who accepted at least one food
    // in common with the current user.  We do a two-level query to avoid a full
    // cross-user table scan:
    //   a) Fetch accepted rows for currentUserAccepted foods across all users
    //   b) Group by userId → count overlap → filter by MIN_OVERLAP

    // Normalise food names to avoid case sensitivity issues in SQL
    const foodNameList = [...currentSet];
    if (foodNameList.length === 0) return [];

    // Build a subquery to find similar users
    // We use raw SQL for the GROUP BY / HAVING since Drizzle doesn't support
    // HAVING directly without a raw expression here.
    // Note: The parameterised ARRAY[] approach above doesn't work well in all
    // Drizzle/Neon combos — fall back to a simpler IN clause approach.
    // We use a separate, correct query below.

    // Pragmatic approach: Run two clean queries
    // Query 1: Find accepted food names from other users that overlap ≥ MIN_OVERLAP
    const overlapRows = await db
      .selectDistinct({ userId: recommendationsHistoryTable.userId })
      .from(recommendationsHistoryTable)
      .where(
        and(
          ne(recommendationsHistoryTable.userId, userId),
          eq(recommendationsHistoryTable.interactionStatus, 'accepted')
        )
      )
      .limit(500); // pull a sample of other users

    // Group by userId and compute overlap in JS (avoids complex SQL)
    const userFoodMap = new Map();
    for (const row of overlapRows) {
      if (!userFoodMap.has(row.userId)) {
        userFoodMap.set(row.userId, new Set());
      }
    }

    // If no other users, skip
    if (userFoodMap.size === 0) {
      cfCache.set(cacheKey, []);
      return [];
    }

    // Query 2: For each candidate userId, get their accepted foods
    const otherUserIds = [...userFoodMap.keys()].slice(0, 100);
    const otherUserFoods = await db
      .select({
        userId: recommendationsHistoryTable.userId,
        foodName: recommendationsHistoryTable.foodName,
        calories: recommendationsHistoryTable.calories,
        protein: recommendationsHistoryTable.protein,
        carbs: recommendationsHistoryTable.carbs,
        fats: recommendationsHistoryTable.fats,
        fiber: recommendationsHistoryTable.fiber,
        mealType: recommendationsHistoryTable.mealType,
        portion: recommendationsHistoryTable.portion,
      })
      .from(recommendationsHistoryTable)
      .where(
        and(
          inArray(recommendationsHistoryTable.userId, otherUserIds),
          eq(recommendationsHistoryTable.interactionStatus, 'accepted')
        )
      );

    // Build per-user food sets and nutrition map in a single pass over Query 2 results.
    // Accumulate per-food nutrition averages so the third SQL query is unnecessary.
    const nutritionByFoodLower = new Map();
    for (const row of otherUserFoods) {
      const s = userFoodMap.get(row.userId);
      const key = row.foodName.toLowerCase().trim();
      if (s) s.add(key);
      const existing = nutritionByFoodLower.get(key);
      if (!existing) {
        nutritionByFoodLower.set(key, {
          calories: Number(row.calories) || 0,
          protein:  Number(row.protein)  || 0,
          carbs:    Number(row.carbs)    || 0,
          fats:     Number(row.fats)     || 0,
          fiber:    Number(row.fiber)    || 0,
          portion:  row.portion,
          mealType: row.mealType,
          _count:   1,
        });
      } else {
        existing.calories += Number(row.calories) || 0;
        existing.protein  += Number(row.protein)  || 0;
        existing.carbs    += Number(row.carbs)    || 0;
        existing.fats     += Number(row.fats)     || 0;
        existing.fiber    += Number(row.fiber)    || 0;
        existing._count   += 1;
      }
    }
    for (const val of nutritionByFoodLower.values()) {
      const n = val._count;
      val.calories = Math.round(val.calories / n);
      val.protein  = Math.round(val.protein  / n);
      val.carbs    = Math.round(val.carbs    / n);
      val.fats     = Math.round(val.fats     / n);
      val.fiber    = Math.round(val.fiber    / n);
    }

    // Compute Jaccard similarity and filter
    const similarities = [];
    for (const [uid, foods] of userFoodMap) {
      const sim = jaccardSimilarity(currentSet, foods);
      const overlap = [...currentSet].filter((f) => foods.has(f)).length;
      if (overlap >= MIN_OVERLAP) {
        similarities.push({ userId: uid, similarity: sim, foods });
      }
    }

    if (similarities.length === 0) {
      cfCache.set(cacheKey, []);
      return [];
    }

    // Sort by similarity desc, take top k
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topNeighbours = similarities.slice(0, MAX_SIMILAR_USERS);

    // Collect foods these neighbours accepted that the current user hasn't tried
    const candidateFoodCounts = new Map();
    for (const neighbour of topNeighbours) {
      for (const foodName of neighbour.foods) {
        if (!currentSet.has(foodName)) {
          const count = candidateFoodCounts.get(foodName) ?? 0;
          candidateFoodCounts.set(foodName, count + neighbour.similarity);
        }
      }
    }

    if (candidateFoodCounts.size === 0) {
      cfCache.set(cacheKey, []);
      return [];
    }

    // Sort by weighted frequency (similarity-weighted vote count)
    const sortedCandidates = [...candidateFoodCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit * 2);

    // Build Candidate objects — nutrition comes from the already-fetched Query 2 data.
    // This avoids the previous 3rd SQL query that had a case-sensitivity mismatch.
    const candidates = [];
    for (const [foodName, weightedScore] of sortedCandidates) {
      if (candidates.length >= limit) break;

      const titleCase = foodName.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const nutrition = nutritionByFoodLower.get(foodName);
      const attrs = inferFoodAttributes({ name: titleCase });

      candidates.push({
        id: `cf_${foodName.replace(/\s+/g, '_').slice(0, 30)}`,
        name: titleCase,
        nutrition: {
          calories: nutrition?.calories || 300,
          protein:  nutrition?.protein  || 10,
          carbs:    nutrition?.carbs    || 30,
          fat:      nutrition?.fats     || 8,
          fiber:    nutrition?.fiber    || 3,
        },
        tags:        attrs.tags,
        moodBoost:   attrs.moodBoost,
        hydrating:   attrs.hydrating,
        cuisineTags: attrs.cuisineTags,
        prepTime: 15,
        satiety: attrs.tags.includes('high-protein') || attrs.tags.includes('fiber-rich') ? 7 : 6,
        score: Math.min(100, Math.round(weightedScore * 20)),
        source: 'collaborative_filter',
        portion:   nutrition?.portion  ?? '1 serving',
        mealTypes: nutrition?.mealType ? [nutrition.mealType] : ['breakfast', 'lunch', 'dinner', 'snack'],
      });
    }

    // Cache and return
    cfCache.set(cacheKey, candidates);
    return candidates;
  } catch (err) {
    console.error('[collaborativeFilteringService] Error:', err.message);
    return [];
  }
}

/**
 * Invalidate the CF cache for a user when their acceptance patterns change.
 * Call this after a user accepts or rejects a recommendation.
 *
 * @param {string} userId
 */
export function invalidateCFCache(userId) {
  cfCache.del(cfCacheKey(userId));
}
