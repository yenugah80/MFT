/**
 * buildRecommendationSummary — the "What + Why fused" headline sentence on
 * Recommendation5W2HCard. Regression coverage for a real bug seen live: the
 * deterministic (non-AI) recommendation path writes `why.primaryReason` as
 * a complete sentence leading with the food's own name, but `what.action`
 * is also the food name (see transformTo5W2H in app/recommendations.jsx) —
 * naively stitching "${action} to address ${reason}" produced the food name
 * twice back to back: "Greek Yogurt Bowl to address greek yogurt bowl
 * ranked highly for your current snack context...".
 */
import { buildRecommendationSummary } from '../utils/recommendationSummary';

describe('buildRecommendationSummary', () => {
  it('does not repeat the food name when reason already opens with it', () => {
    const summary = buildRecommendationSummary(
      { action: 'Greek Yogurt Protein Bowl with Chia & Berries' },
      { primaryReason: 'Greek Yogurt Protein Bowl with Chia & Berries adds 18g protein toward the 40g you still need today.' }
    );
    expect(summary).toBe('Greek Yogurt Protein Bowl with Chia & Berries adds 18g protein toward the 40g you still need today.');
    expect(summary.match(/Greek Yogurt Protein Bowl/g).length).toBe(1);
  });

  it('still fuses action + a short causal reason naturally (the AI-generated path)', () => {
    const summary = buildRecommendationSummary(
      { action: 'Earlier, lighter dinners' },
      { primaryReason: 'your sleep comfort' }
    );
    expect(summary).toBe('Earlier, lighter dinners to address sleep comfort.');
  });

  it('falls back to the action alone when there is no reason', () => {
    expect(buildRecommendationSummary({ action: 'Log a snack' }, {})).toBe('Log a snack');
  });

  it('falls back to a safe default when action is not a string (guards against the crash this replaced)', () => {
    expect(buildRecommendationSummary({ action: 42 }, { primaryReason: 'testing' })).toContain('Take action');
  });
});
