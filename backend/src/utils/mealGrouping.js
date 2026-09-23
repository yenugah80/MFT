/**
 * Group food_log rows that were logged together as one meal.
 *
 * There is no meal_id/grouping column in the food_log schema — a "mealId"
 * field does get set client-side (mobile/app/(tabs)/log.js's saveMealItems)
 * but is never persisted anywhere, local SQLite or server, so it can't be
 * relied on. What DOES reach the server reliably is clientEventId, the
 * idempotency key: for a multi-item meal it's built as
 * `${mealEventId}-${item.itemId}` (3+ '-'-delimited segments), where
 * mealEventId itself is `${Date.now()}-${Math.random().toString(36).slice(2,11)}`
 * — always exactly 2 hyphen-free segments. item.itemId can itself contain
 * hyphens (barcodes, "name-idx-timestamp" composites), but that's fine: the
 * first two segments of any clientEventId always reconstruct the meal group
 * key unambiguously, regardless of what follows. A single-item log (no
 * suffix) has exactly 2 segments and is inherently its own group.
 *
 * This exact scheme is already proven-safe prior art in production:
 * mobile/components/dashboard/MealInsightsCard.jsx's groupMeals().
 */

/**
 * @param {string} clientEventId
 * @returns {string} the group key rows from the same logged meal share
 */
export function getMealGroupKey(clientEventId) {
  if (!clientEventId) return clientEventId;
  const parts = clientEventId.split('-');
  if (parts.length < 3) return clientEventId; // single-item write or legacy UUID — its own group
  return parts.slice(0, 2).join('-');
}

/**
 * @param {Array<{clientEventId?: string}>} logs
 * @returns {number} count of distinct meals represented by these food_log rows
 */
export function countDistinctMeals(logs) {
  return new Set((logs || []).map((l) => getMealGroupKey(l.clientEventId))).size;
}
