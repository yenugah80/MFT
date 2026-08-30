/**
 * Canonical Nutrition Contract
 *
 * The single source of truth for two things every meal-analysis consumer
 * (Log screen, Detailed Analysis, MealScoreDial, the energy-feeling
 * predictor, saved-meal history) needs to agree on:
 *
 *   1. Which unit each micronutrient is expressed in (mg vs µg), so a value
 *      is never aggregated or displayed under a unit it wasn't actually
 *      measured in — and never guessed for a nutrient this table doesn't
 *      recognize.
 *   2. How item-level macros/micros combine into meal-level totals — one
 *      implementation, used by every entry point (text via resolve.js;
 *      photo/multimodal/barcode via food.js; voice via voiceLog.js) instead
 *      of each route inventing its own.
 *
 * Before this module, three input modes reached the mobile client with two
 * incompatible totals shapes (resolve.js's suffixed totals.macros.calories_kcal
 * vs food.js/voiceLog.js's flat totals.calories from unifiedResponseBuilder.js),
 * and fiber/sugar/sodium were dropped entirely by resolve.js's totals for any
 * multi-item meal. See CLAUDE.md / the meal-analysis data-integrity audit for
 * the full trace.
 */

// Every macro field the canonical contract carries. Order matters only for
// readability — aggregation sums all seven regardless of order.
export const MACRO_FIELDS = [
  'calories_kcal',
  'protein_g',
  'carbs_g',
  'fat_g',
  'fiber_g',
  'sugar_g',
  'sodium_mg',
];

// Canonical unit per micronutrient — must match mobile/constants/dailyValues.js
// exactly, since %DV there is computed as `value / DAILY_VALUES[key].value`
// with NO unit conversion in between (dailyValues.js's own convertUnit() is
// defined but never called by any consumer). That means the number this
// module emits IS the number %DV math runs on directly — there is no
// downstream conversion layer to lean on. Correctness here depends on the AI
// actually returning values already scaled to this unit (see
// nutritionEstimation.js's schema instructions), not on any conversion after
// the fact — this module can normalize the unit LABEL consistently, but it
// cannot detect or fix a value the model scaled wrong at the source.
export const MICRO_UNITS = {
  calcium: 'mg',
  iron: 'mg',
  magnesium: 'mg',
  phosphorus: 'mg',
  potassium: 'mg',
  sodium: 'mg',
  zinc: 'mg',
  copper: 'mg',
  manganese: 'mg',
  chloride: 'mg',
  vitaminC: 'mg',
  vitaminE: 'mg',
  vitaminB1: 'mg',
  vitaminB2: 'mg',
  vitaminB3: 'mg',
  vitaminB6: 'mg',
  pantothenicAcid: 'mg',
  vitaminA: 'µg',
  vitaminD: 'µg',
  vitaminK: 'µg',
  vitaminB9: 'µg',
  folate: 'µg',
  vitaminB12: 'µg',
  biotin: 'µg',
  selenium: 'µg',
  iodine: 'µg',
  chromium: 'µg',
  molybdenum: 'µg',
};

// Generous per-meal upper bounds for the nutrients most exposed to a unit-
// scale error (mg/µg confusion is 1000x; IU-vs-mcg-RAE for vitaminA/D is
// roughly 3-40x). These are deliberately loose — wide enough that a
// legitimately nutrient-dense meal (liver, fortified cereal) should never
// trip them — this catches gross scale errors, not "is this value a bit
// high for a typical meal." A flagged value is NOT altered; the AI prompt
// asking for the right unit (nutritionEstimation.js) is the primary
// protection, this is the second layer for when that's not honored.
const MICRO_PLAUSIBILITY_CEILING = {
  calcium: 3000, iron: 100, magnesium: 1000, phosphorus: 3000, potassium: 6000,
  sodium: 10000, zinc: 100, copper: 20, manganese: 50, chloride: 10000,
  vitaminC: 2000, vitaminE: 1000, vitaminB1: 100, vitaminB2: 100, vitaminB3: 500,
  vitaminB6: 200, pantothenicAcid: 500,
  vitaminA: 10000, vitaminD: 250, vitaminK: 2000, vitaminB9: 2000, folate: 2000,
  vitaminB12: 100, biotin: 2000, selenium: 1000, iodine: 3000, chromium: 500, molybdenum: 500,
};

function canonicalKeyFor(key) {
  const normalized = key.replace(/[_\s-]/g, '').toLowerCase();
  const match = Object.keys(MICRO_UNITS).find((k) => k.toLowerCase() === normalized);
  return match || null;
}

// Returns null for a nutrient this table doesn't recognize — the caller must
// NOT default that to 'mg'. Guessing a unit for an unknown nutrient is worse
// than admitting the unit is unresolved: a labeled-wrong number looks
// trustworthy, an unresolved one visibly asks for attention.
function canonicalUnitFor(key) {
  const canonicalKey = canonicalKeyFor(key);
  return canonicalKey ? MICRO_UNITS[canonicalKey] : null;
}

/**
 * Flag (never alter) a micronutrient value that's implausible for a single
 * meal given its canonical unit — the signature of a value reported in the
 * wrong unit rather than a real reading. Returns null when plausible or when
 * the nutrient isn't in the plausibility table.
 */
export function checkMicroPlausibility(key, value) {
  const canonicalKey = canonicalKeyFor(key);
  const ceiling = canonicalKey ? MICRO_PLAUSIBILITY_CEILING[canonicalKey] : undefined;
  if (ceiling === undefined) return null;
  if (typeof value !== 'number' || isNaN(value) || value < 0) {
    return { key, value, reason: 'non-numeric or negative value' };
  }
  if (value > ceiling) {
    return { key, value, ceiling, reason: `exceeds plausible per-meal ceiling (${ceiling}) for its canonical unit — likely a unit-scale error (e.g. IU reported as mcg, or mg/mcg confusion), not a real reading` };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Strict numeric parsing
// ---------------------------------------------------------------------------

// Matches a complete, well-formed number: optional sign, digits with an
// optional decimal point (or a leading-dot decimal), optional exponent.
// Anchored on both ends — a string with ANY trailing garbage fails, it does
// not get truncated to whatever numeric prefix happens to parse.
const STRICT_NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

/**
 * Parses a strictly well-formed number. Unlike `parseFloat` or
 * `.replace(/[^0-9.]/g, '')`, this rejects malformed input instead of
 * silently coercing it — "12-3" or "1..2" or "abc" all return null, not a
 * truncated/mangled positive number. A leading "-" is a real negative sign,
 * not stripped away into a different positive value.
 *
 * @returns {number|null} the parsed number, or null if malformed/non-finite
 */
export function parseStrictNumber(raw) {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!STRICT_NUMBER_RE.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

// A value string followed by an optional unit suffix: "12mg", "-5.2 g",
// "1.2e3 mcg", "300µg". The numeric part must still satisfy the strict
// grammar above — only the trailing unit letters are peeled off separately.
const NUMBER_WITH_UNIT_RE = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*([a-zA-Zµ]*)$/;

/**
 * Parses a "<number><optional unit>" string strictly. Returns null if the
 * numeric portion isn't well-formed — never silently drops characters to
 * force a match.
 * @returns {{value: number, unit: string|null}|null}
 */
export function parseNumberWithUnit(raw) {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? { value: raw, unit: null } : null;
  }
  if (typeof raw !== 'string') return null;
  const match = raw.trim().match(NUMBER_WITH_UNIT_RE);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  return { value, unit: match[2] || null };
}

// ---------------------------------------------------------------------------
// Deterministic unit conversion — mathematically safe conversions only.
// ---------------------------------------------------------------------------

/**
 * Converts a value between units when — and only when — an exact,
 * dimensionally-safe conversion exists. mg<->µg is a fixed x1000 factor with
 * no ambiguity. IU is deliberately NOT handled here: IU-to-mass conversion
 * is nutrient-specific (different for vitamin A vs D vs E) and depends on
 * the chemical form (retinol vs beta-carotene), so a generic IU converter
 * would be a guess dressed up as a calculation. Add a nutrient-specific rule
 * explicitly if that's ever needed — never a blanket one.
 * @returns {number|null} converted value, or null if no safe rule exists
 */
export function convertUnit(value, fromUnit, toUnit) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (fromUnit === toUnit) return value;
  const pair = `${fromUnit}->${toUnit}`;
  switch (pair) {
    case 'mg->µg': return value * 1000;
    case 'µg->mg': return value / 1000;
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Micronutrient normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a raw micros object — whatever shape it arrived in (bare numbers
 * from AI estimation, numeric strings, or already-tagged {value, unit} from
 * OFF/USDA) — into a consistent {key: {value, unit}} shape.
 *
 * Unit resolution order:
 *   1. A unit the source explicitly provided is preserved as-is.
 *   2. Otherwise, if this nutrient is in the canonical table, use ITS unit.
 *   3. Otherwise (unrecognized nutrient, no source unit) — unit stays `null`.
 *      This is never defaulted to 'mg'. A null unit is a real, meaningful
 *      state: "we have a number, we don't know what it's measured in."
 *
 * Malformed values (present but not a well-formed number) are dropped from
 * the result and reported via `onInvalid`, distinct from a value that's
 * simply absent.
 */
export function normalizeMicros(rawMicros, { onImplausible, onInvalid } = {}) {
  const result = {};
  if (!rawMicros || typeof rawMicros !== 'object') return result;

  for (const [key, raw] of Object.entries(rawMicros)) {
    let value;
    let sourceUnit = null;

    if (typeof raw === 'number' || typeof raw === 'string') {
      const parsed = typeof raw === 'number' ? { value: raw, unit: null } : parseNumberWithUnit(raw);
      if (!parsed || !Number.isFinite(parsed.value)) {
        if (raw !== null && raw !== undefined && typeof onInvalid === 'function') {
          onInvalid({ key, raw, reason: 'not a well-formed number' });
        }
        continue;
      }
      value = parsed.value;
      sourceUnit = parsed.unit;
    } else if (raw && typeof raw === 'object' && raw.value !== undefined) {
      const parsed = parseStrictNumber(raw.value);
      if (parsed === null) {
        if (typeof onInvalid === 'function') onInvalid({ key, raw, reason: 'not a well-formed number' });
        continue;
      }
      value = parsed;
      sourceUnit = raw.unit || null;
    } else {
      continue; // null/undefined/unrecognized shape — genuinely absent, not invalid
    }

    const unit = sourceUnit || canonicalUnitFor(key); // null when both are unresolved
    result[key] = { value, unit };

    // Only flag plausibility against the canonical ceiling when the value is
    // actually tagged with the canonical unit — a value in a different
    // (explicitly reported) unit, or an unresolved unit, isn't comparable to
    // that ceiling.
    if (unit && unit === canonicalUnitFor(key)) {
      const flag = checkMicroPlausibility(key, value);
      if (flag && typeof onImplausible === 'function') onImplausible(flag);
    }
  }

  return result;
}

/**
 * Sum a list of already-normalized {key: {value, unit}} micros objects.
 *
 * - Same unit -> summed normally.
 * - Different but deterministically convertible units (mg<->µg) -> the
 *   incoming value is converted to the running total's unit and summed.
 * - Different, non-convertible units (including one side unresolved/null)
 *   -> this nutrient is marked CONFLICTED and removed from `totals`
 *   entirely, listed in `conflicted` instead with full detail. The caller
 *   never receives a partial sum for a conflicted nutrient that looks like
 *   a complete total — better to show "unavailable" than a silently-wrong
 *   number that's missing one item's contribution.
 */
function sumMicros(itemMicrosList) {
  const totals = {};
  const conflictedKeys = new Set();
  const conflictDetails = {};

  for (const micros of itemMicrosList) {
    for (const [key, { value, unit }] of Object.entries(micros)) {
      if (conflictedKeys.has(key)) {
        conflictDetails[key].unitsSeen.push(unit);
        continue;
      }
      if (!totals[key]) {
        totals[key] = { value, unit };
        continue;
      }
      if (totals[key].unit === unit) {
        totals[key].value += value;
        continue;
      }
      const converted = unit && totals[key].unit ? convertUnit(value, unit, totals[key].unit) : null;
      if (converted !== null) {
        totals[key].value += converted;
        continue;
      }
      // No safe way to combine — mark conflicted and drop any partial sum
      // already accumulated for this key so nothing downstream mistakes it
      // for a complete total.
      conflictedKeys.add(key);
      conflictDetails[key] = { unitsSeen: [totals[key].unit, unit] };
      delete totals[key];
    }
  }

  const conflicted = Array.from(conflictedKeys).map((key) => ({ key, unitsSeen: conflictDetails[key].unitsSeen }));
  return { totals, conflicted };
}

/**
 * The one meal-level aggregation function. Every entry point (resolve.js for
 * text, food.js for photo/multimodal/barcode, voiceLog.js for voice) calls
 * this on its resolved items array to produce the totals sent to the mobile
 * client, so all four input modes reach the client with the exact same
 * shape regardless of which upstream recognition path (AI estimation, OFF,
 * USDA, vision) produced the items.
 *
 * `items` — each item should expose a stable `itemId` (or `name` as a
 * fallback label) for provenance, `.macros` with (a subset of) MACRO_FIELDS,
 * and `.micros` in any shape normalizeMicros() accepts.
 */
export function aggregateCanonicalTotals(items) {
  const macros = Object.fromEntries(MACRO_FIELDS.map((f) => [f, 0]));
  const missingMacroFields = new Set();
  const invalidMacroFields = new Set();
  const itemFieldIssues = [];
  const itemMicrosList = [];
  const implausibleMicros = [];
  const invalidMicros = [];
  // Per-nutrient coverage: how many items actually reported it, so "sodium
  // missing from 1 of 4 items" is distinguishable from "no item reported
  // sodium" — meal-level missingMacroFields alone can't say that.
  const microCoverage = {};

  (items || []).forEach((item, idx) => {
    const itemLabel = item?.itemId || item?.name || `item-${idx}`;
    const itemMacros = item?.macros || {};
    const itemMissing = [];
    const itemInvalid = [];

    for (const field of MACRO_FIELDS) {
      const raw = itemMacros[field];
      if (raw === undefined || raw === null) {
        // The source never reported this field for this item — distinct
        // from the item explicitly reporting 0.
        missingMacroFields.add(field);
        itemMissing.push(field);
        continue;
      }
      const parsed = parseStrictNumber(raw);
      if (parsed === null) {
        // Present but not a well-formed number — distinct from BOTH missing
        // and a legitimate zero. Not silently summed as 0 (Number(raw)||0
        // would have done exactly that for e.g. "abc", NaN, or an object).
        invalidMacroFields.add(field);
        itemInvalid.push({ field, raw });
        continue;
      }
      macros[field] += parsed;
    }

    if (itemMissing.length || itemInvalid.length) {
      itemFieldIssues.push({ itemId: itemLabel, missingFields: itemMissing, invalidFields: itemInvalid });
    }

    const itemMicros = normalizeMicros(item?.micros, {
      onImplausible: (flag) => implausibleMicros.push({ ...flag, itemId: itemLabel }),
      onInvalid: (flag) => invalidMicros.push({ ...flag, itemId: itemLabel }),
    });
    itemMicrosList.push(itemMicros);
    for (const key of Object.keys(itemMicros)) {
      if (!microCoverage[key]) microCoverage[key] = { itemsReporting: 0, itemsTotal: 0, missingFromItemIds: [] };
    }
  });

  // Second pass for coverage now that we know every micro key that appeared
  // anywhere in the meal.
  const allMicroKeys = new Set(Object.keys(microCoverage));
  itemMicrosList.forEach((itemMicros, idx) => {
    const itemLabel = items[idx]?.itemId || items[idx]?.name || `item-${idx}`;
    for (const key of allMicroKeys) {
      microCoverage[key].itemsTotal += 1;
      if (Object.prototype.hasOwnProperty.call(itemMicros, key)) {
        microCoverage[key].itemsReporting += 1;
      } else {
        microCoverage[key].missingFromItemIds.push(itemLabel);
      }
    }
  });

  const { totals: micros, conflicted } = sumMicros(itemMicrosList);

  return {
    macros,
    micros,
    meta: {
      missingMacroFields: Array.from(missingMacroFields),
      invalidMacroFields: Array.from(invalidMacroFields),
      itemFieldIssues,
      // Conflicted nutrients are removed from `micros` above (see sumMicros)
      // rather than exposed as a partial sum — this list is how a caller
      // finds out one was dropped and why.
      conflictedMicros: conflicted,
      implausibleMicros,
      invalidMicros,
      microCoverage,
      itemCount: (items || []).length,
    },
  };
}
