/**
 * Pairing selection
 *
 * Filter → rank → vary, in that order, which is what the nutrition
 * recommender literature consistently prescribes: allergens and diet type are
 * *eliminative* constraints applied before scoring, never penalties folded into
 * a score. A near-miss on a macro target is a worse suggestion; a near-miss on
 * an allergen is a hospital visit.
 *
 * Pure functions with no React or network dependencies so the safety-critical
 * filtering can be unit tested directly.
 */

import { PAIRING_CANDIDATES, PAIRING_GOALS } from '../constants/pairingCandidates';

/** Normalises "low_carb", { id: 'nuts' }, "Nuts" → "nuts". */
const idOf = (entry) => {
  const raw = typeof entry === 'string' ? entry : entry?.id;
  return String(raw ?? '').trim().toLowerCase();
};

/**
 * Removes anything the user cannot or will not eat.
 *
 * Deliberately conservative: an unrecognised allergen id is still matched
 * literally rather than ignored, so adding a new allergen to onboarding can
 * never silently start recommending it.
 */
export function filterSafeCandidates(candidates, { allergies = [], dietaryPreferences = [] } = {}) {
  const blockedAllergens = new Set(allergies.map(idOf).filter(Boolean));
  const diets = new Set(dietaryPreferences.map(idOf).filter(Boolean));

  return candidates.filter((c) => {
    // Hard constraint 1 — allergens.
    if (c.allergens?.some((a) => blockedAllergens.has(idOf(a)))) return false;

    // Hard constraint 2 — diet. A candidate excluded by ANY of the user's
    // selected diets is out; diets are restrictions, so they intersect.
    if (c.excludedDiets?.some((d) => diets.has(idOf(d)))) return false;

    return true;
  });
}

/**
 * Scores a candidate against what this meal actually left short.
 *
 * The previous implementation always listed the same three items in the same
 * order, so someone 2g short of protein and someone 40g short saw identical
 * advice. Score is "how much of the remaining gap does this close", capped so a
 * single huge item can't dominate a small gap.
 */
function scoreCandidate(candidate, gaps = {}) {
  // Coerced, not trusted: a missing or NaN gap must score 0, not crash or
  // produce NaN that silently sorts to the bottom.
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const gapForGoal = {
    [PAIRING_GOALS.PROTEIN]: num(gaps.protein),
    [PAIRING_GOALS.FIBER]: num(gaps.fiber),
    [PAIRING_GOALS.HYDRATION]: num(gaps.hydration),
  }[candidate.goal] ?? 0;

  if (gapForGoal <= 0) return 0;

  // How pressing this gap is, relative to a typical daily target. Without this,
  // score was pure coverage — so being 1g short of fiber (100% closable by one
  // apple) outranked being 40g short of protein, which is exactly backwards.
  const urgency = Math.min(1, gapForGoal / (TYPICAL_DAILY_TARGET[candidate.goal] ?? 1));

  const contribution =
    candidate.goal === PAIRING_GOALS.PROTEIN ? candidate.protein
    : candidate.goal === PAIRING_GOALS.FIBER ? candidate.fiber
    : 1;

  // Fraction of the gap closed, capped at 1 — overshooting isn't better.
  const coverage = Math.min(1, contribution / gapForGoal);

  // Prefer closing the gap without spending the whole calorie budget.
  const calorieGap = num(gaps.calories);
  const calorieCost = candidate.calories > 0 && calorieGap > 0
    ? Math.min(1, candidate.calories / Math.max(calorieGap, 1))
    : 0;

  // Urgency decides WHICH gap to address; coverage decides which item best
  // addresses it.
  return urgency * coverage * 100 - calorieCost * 25;
}

/**
 * Rough daily targets, used only to compare how urgent one gap is against
 * another. Not user-specific on purpose: this weighs "protein vs fiber", and
 * the user's own remaining amounts are already the numerator.
 */
const TYPICAL_DAILY_TARGET = {
  [PAIRING_GOALS.PROTEIN]: 120,
  [PAIRING_GOALS.FIBER]: 28,
  [PAIRING_GOALS.HYDRATION]: 1,
};

/** Stable per-day rotation so repeat suggestions vary without being random. */
function rotationOffset(seed, length) {
  if (length === 0) return 0;
  const day = Math.floor(Date.now() / 86400000);
  let h = day;
  for (let i = 0; i < String(seed).length; i++) h = (h * 31 + String(seed).charCodeAt(i)) | 0;
  return Math.abs(h) % length;
}

/**
 * Picks pairings for a logged meal.
 *
 * @param {object} opts
 * @param {object} opts.gaps        { protein, fiber, calories, hydration } still needed today
 * @param {string[]} opts.allergies         user's declared allergens
 * @param {string[]} opts.dietaryPreferences user's diets
 * @param {string[]} [opts.cuisines]        preferred cuisines, used as a soft tiebreak
 * @param {string} [opts.seed]              stabilises rotation per meal
 * @param {number} [opts.limit]
 */
export function selectPairings({
  gaps = {},
  allergies = [],
  dietaryPreferences = [],
  cuisines = [],
  seed = '',
  limit = 2,
  candidates = PAIRING_CANDIDATES,
} = {}) {
  const safe = filterSafeCandidates(candidates, { allergies, dietaryPreferences });
  const preferredCuisines = new Set(cuisines.map(idOf).filter(Boolean));

  const scored = safe
    .map((c) => {
      const base = scoreCandidate(c, gaps);
      if (base <= 0) return null;
      // Cuisine is a nudge, never a filter — suggesting an apple to someone who
      // prefers Indian food is fine; suggesting dairy to a vegan is not.
      const cuisineBonus = c.cuisines?.some((x) => preferredCuisines.has(idOf(x))) ? 15 : 0;
      return { candidate: c, score: base + cuisineBonus };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  // Group by goal so we return variety of *purpose*, not three proteins.
  const byGoal = new Map();
  for (const entry of scored) {
    const list = byGoal.get(entry.candidate.goal) ?? [];
    list.push(entry);
    byGoal.set(entry.candidate.goal, list);
  }

  const groups = [];
  for (const [goal, entries] of byGoal) {
    // Rotate within the top few so the same user doesn't see an identical list
    // every single time, while still only ever showing well-scored options.
    const pool = entries.slice(0, 5);
    const offset = rotationOffset(`${seed}:${goal}`, pool.length);
    const rotated = pool.slice(offset).concat(pool.slice(0, offset));

    groups.push({
      goal,
      topScore: entries[0].score,
      suggestions: rotated.slice(0, 3).map(({ candidate }) => ({
        name: candidate.name,
        calories: candidate.calories,
        benefit:
          candidate.benefit ??
          (candidate.goal === PAIRING_GOALS.PROTEIN ? `+${candidate.protein}g protein`
            : candidate.goal === PAIRING_GOALS.FIBER ? `+${candidate.fiber}g fiber`
            : ''),
      })),
    });
  }

  return groups.sort((a, b) => b.topScore - a.topScore).slice(0, limit);
}

export default { selectPairings, filterSafeCandidates };
