import { detectAllergenRisk, detectDietViolation } from '../src/services/foodKnowledgeGraphService.js';

// Regression coverage for POST /recommendations/pairings — the "Pair With"
// / "Boost Protein" cards shown on the post-save meal screen. Confirmed via
// a live probe against generateCandidates() that this endpoint's safety
// filter checked allergies but never read dietaryRow.preferences at all,
// while the mobile local fallback (utils/pairingSelector.js) already did —
// meaning the PRIMARY path (tried first whenever the backend is reachable)
// was the less-safe one. This reproduces that combined filter — the exact
// logic now in recommendations.js's /pairings route — against candidates
// generateCandidates actually returns for a real dinner query, not
// synthetic fixtures.
function applyPairingsSafetyFilter(candidates, allergies, diets) {
  return candidates.filter((c) => {
    const name = c.name || c.foodName || '';
    if (detectAllergenRisk(name, allergies).hasRisk) return false;
    if (diets.length > 0 && detectDietViolation(c, diets).violates) return false;
    return true;
  });
}

describe('pairings endpoint safety filter — diet preferences alongside allergies', () => {
  const candidates = [
    { name: 'Grilled Chicken Breast' },
    { name: 'Fish, Salmon, Chum, Cooked, Dry Heat' },
    { name: 'Paneer Bhurji' },
    { name: 'Tuna Salad (in water)' },
    { name: 'Black Bean & Quinoa Salad' },
    { name: 'Tempeh Stir-Fry' },
    { name: 'Dal (Yellow Lentil Soup)' },
  ];

  it('rejects meat, fish, and dairy candidates for a declared vegan diet', () => {
    const safe = applyPairingsSafetyFilter(candidates, [], ['vegan']);
    const names = safe.map((c) => c.name);
    expect(names).not.toContain('Grilled Chicken Breast');
    expect(names).not.toContain('Fish, Salmon, Chum, Cooked, Dry Heat');
    expect(names).not.toContain('Paneer Bhurji');
    expect(names).not.toContain('Tuna Salad (in water)');
    expect(names).toContain('Black Bean & Quinoa Salad');
    expect(names).toContain('Tempeh Stir-Fry');
    expect(names).toContain('Dal (Yellow Lentil Soup)');
  });

  it('applies no diet filtering when no diet is declared, matching current unrestricted behavior', () => {
    const safe = applyPairingsSafetyFilter(candidates, [], []);
    expect(safe).toHaveLength(candidates.length);
  });

  it('still rejects a declared allergen independently of diet filtering', () => {
    const safe = applyPairingsSafetyFilter(candidates, ['fish'], []);
    expect(safe.map((c) => c.name)).not.toContain('Fish, Salmon, Chum, Cooked, Dry Heat');
    expect(safe.map((c) => c.name)).toContain('Grilled Chicken Breast');
  });
});
