/**
 * Group food_log rows that were logged together as one meal.
 *
 * There is no meal_id/grouping column in the backend schema — a `mealId`
 * field is set client-side in app/(tabs)/log.js's saveMealItems but never
 * reaches the server or local SQLite. What's reliable is clientEventId
 * (the idempotency key): for a multi-item meal it's
 * `${mealEventId}-${item.itemId}` (3+ '-'-delimited segments), where
 * mealEventId itself is always exactly 2 hyphen-free segments
 * (`${Date.now()}-${Math.random().toString(36).slice(2,11)}`). item.itemId
 * can itself contain hyphens (barcodes, "name-idx-timestamp" composites),
 * but that's fine — the first two segments of any clientEventId always
 * reconstruct the meal group key unambiguously. A single-item log (no
 * suffix) has exactly 2 segments and is inherently its own group.
 *
 * Mirrors backend/src/utils/mealGrouping.js — kept as two small, separate
 * copies rather than a shared workspace import; nothing in this repo
 * currently imports across the mobile/backend boundary (only the `shared`
 * npm workspace, which holds unrelated UI helpers), so introducing that
 * pattern for one ~5-line function isn't worth the scope creep.
 */

/**
 * @param {string} clientEventId
 * @returns {string} the group key rows from the same logged meal share
 */
export function getMealGroupKey(clientEventId) {
  if (!clientEventId) return clientEventId;
  const parts = clientEventId.split('-');
  if (parts.length < 3) return clientEventId; // single-item write or legacy id — its own group
  return parts.slice(0, 2).join('-');
}

/**
 * @param {Array<{clientEventId?: string}>} logs
 * @returns {number} count of distinct meals represented by these food_log rows
 */
export function countDistinctMeals(logs) {
  return new Set((logs || []).map((l) => getMealGroupKey(l.clientEventId))).size;
}
