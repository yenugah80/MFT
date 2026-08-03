/**
 * Display text coercion
 *
 * React throws "Objects are not valid as a React child" and the whole screen
 * goes to the ErrorBoundary if a non-primitive reaches a <Text>. Food names in
 * particular arrive from several producers (AI resolve, vision, ingredient
 * breakdown, offline SQLite, optimistic pending logs) and at least one of them
 * has emitted an object shaped { name, description } instead of a string,
 * crashing the history screen.
 *
 * `food_name` is `text NOT NULL` in the schema, so the database is not the
 * source — this guards the client-side paths where the value is still whatever
 * the producer made it.
 */

/** Keys that commonly hold the human-readable label on food-ish objects */
const NAME_KEYS = ['name', 'foodName', 'title', 'label', 'canonicalName', 'originalInput'];

/**
 * Coerce any value into something safe to render inside <Text>.
 *
 * @param {*} value - string, number, object or nullish
 * @param {string} [fallback=''] - returned when nothing usable is found
 * @returns {string}
 */
export function toDisplayText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : fallback;
  }

  if (typeof value === 'boolean') return fallback;

  if (Array.isArray(value)) {
    const parts = value.map((entry) => toDisplayText(entry)).filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : fallback;
  }

  if (typeof value === 'object') {
    // { name, description } and friends — take the label, drop the rest
    for (const key of NAME_KEYS) {
      const candidate = value[key];
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
      if (typeof candidate === 'number' && Number.isFinite(candidate)) return String(candidate);
    }
    return fallback;
  }

  return fallback;
}

/**
 * Normalise a food name at the point it enters app state, so an object never
 * reaches storage, comparison logic or a render in the first place.
 *
 * @param {*} value
 * @param {string} [fallback='Unknown item']
 * @returns {string}
 */
export function normalizeFoodName(value, fallback = 'Unknown item') {
  return toDisplayText(value, fallback);
}

export default toDisplayText;
