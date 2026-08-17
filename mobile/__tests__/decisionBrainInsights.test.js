/**
 * mapDecisionBrainInsights normalizes /decision-brain/*-insights responses
 * (three separate arrays: patterns, correlations, recommendations) into the
 * flat, typed shape RecommendationCard/RecommendationSection already render.
 * This is the adapter that lets Your Progress consume the same Insight
 * Engine data the Dashboard already shows — see
 * docs/architecture/recommendation-engine.md.
 */
import { mapDecisionBrainInsights } from '../utils/decisionBrainInsights';

describe('mapDecisionBrainInsights', () => {
  it('returns an empty array when the response is missing or unsuccessful', () => {
    expect(mapDecisionBrainInsights(undefined, 'mood')).toEqual([]);
    expect(mapDecisionBrainInsights(null, 'mood')).toEqual([]);
    expect(mapDecisionBrainInsights({ success: false }, 'mood')).toEqual([]);
  });

  it('returns an empty array when success but all three arrays are empty', () => {
    expect(mapDecisionBrainInsights({ success: true, patterns: [], correlations: [], recommendations: [] }, 'mood'))
      .toEqual([]);
  });

  it('maps patterns[] to type "pattern" with title/description -> title/message', () => {
    const data = {
      success: true,
      patterns: [{ title: 'Morning Person', description: 'You log more before noon.', icon: 'sunny', color: '#F59E0B', confidence: 0.8 }],
    };
    const [result] = mapDecisionBrainInsights(data, 'activity');
    expect(result).toMatchObject({
      domain: 'activity',
      type: 'pattern',
      title: 'Morning Person',
      message: 'You log more before noon.',
      icon: 'sunny',
      color: '#F59E0B',
      metric: { confidence: 0.8 },
    });
    expect(result.id).toBe('activity-pattern-0');
  });

  it('maps correlations[] to type "insight" with pattern/statement -> title/message, preserving the real id', () => {
    const data = {
      success: true,
      correlations: [{ id: 'corr_123', pattern: 'Hydration boosts mood', statement: 'Days you drink 2L+, mood is 1.2pts higher.', confidence: 0.65, impactType: 'positive', suggestion: 'Keep it up' }],
    };
    const [result] = mapDecisionBrainInsights(data, 'hydration');
    expect(result).toMatchObject({
      id: 'corr_123',
      domain: 'hydration',
      type: 'insight',
      title: 'Hydration boosts mood',
      message: 'Days you drink 2L+, mood is 1.2pts higher.',
      metric: { confidence: 0.65 },
      evidence: { type: 'correlation', impactType: 'positive' },
    });
  });

  it('falls back to a synthesized id for correlations missing one', () => {
    const data = { success: true, correlations: [{ pattern: 'X', statement: 'Y' }] };
    expect(mapDecisionBrainInsights(data, 'nutrition')[0].id).toBe('nutrition-correlation-0');
  });

  it('maps recommendations[] to type "suggestion" with title/description -> title/message', () => {
    const data = {
      success: true,
      recommendations: [{ type: 'tip', title: 'Try a protein snack', description: 'You are 20g under your protein goal.', priority: 1, icon: 'nutrition' }],
    };
    const [result] = mapDecisionBrainInsights(data, 'nutrition');
    expect(result).toMatchObject({
      domain: 'nutrition',
      type: 'suggestion',
      title: 'Try a protein snack',
      message: 'You are 20g under your protein goal.',
      icon: 'nutrition',
    });
  });

  it('concatenates all three arrays in patterns -> correlations -> recommendations order', () => {
    const data = {
      success: true,
      patterns: [{ title: 'P1', description: 'p' }],
      correlations: [{ pattern: 'C1', statement: 'c' }],
      recommendations: [{ title: 'R1', description: 'r' }],
    };
    const result = mapDecisionBrainInsights(data, 'mood');
    expect(result.map((r) => r.type)).toEqual(['pattern', 'insight', 'suggestion']);
    expect(result.map((r) => r.title)).toEqual(['P1', 'C1', 'R1']);
  });

  it('every returned item has a unique, non-empty id (RecommendationSection keys off it)', () => {
    const data = {
      success: true,
      patterns: [{ title: 'A' }, { title: 'B' }],
      correlations: [{ pattern: 'C' }],
      recommendations: [{ title: 'D' }, { title: 'E' }],
    };
    const ids = mapDecisionBrainInsights(data, 'activity').map((r) => r.id);
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
    expect(ids.every((id) => !!id)).toBe(true);
  });
});
