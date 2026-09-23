import { transformBackendToFoodLog } from '../types/foodLog';

describe('transformBackendToFoodLog — sourceMeta round trip (Stage 8a)', () => {
  it('carries sourceMeta.confidenceTier/plausibility/macroReconciled through from a raw backend row', () => {
    const backendRow = {
      id: 1,
      foodName: 'Banana',
      calories: 105,
      protein: 1,
      carbs: 27,
      fats: 0,
      loggedDate: '2026-08-31T00:00:00Z',
      sourceMeta: {
        source: 'usda_verified',
        confidenceTier: 'high',
        plausibility: { plausible: true, severity: 'none' },
        macroReconciled: false,
      },
    };
    const log = transformBackendToFoodLog(backendRow);
    expect(log.sourceMeta).toBeDefined();
    expect(log.sourceMeta.confidenceTier).toBe('high');
    expect(log.sourceMeta.plausibility.severity).toBe('none');
    expect(log.sourceMeta.macroReconciled).toBe(false);
  });

  it('defaults to an empty object rather than throwing when sourceMeta is missing', () => {
    const backendRow = { id: 2, foodName: 'X', calories: 100, protein: 1, carbs: 1, fats: 1, loggedDate: '2026-08-31T00:00:00Z' };
    const log = transformBackendToFoodLog(backendRow);
    expect(log.sourceMeta).toEqual({});
  });

  it('falls back to snake_case source_meta if that is what the row carries', () => {
    const backendRow = {
      id: 3, foodName: 'X', calories: 100, protein: 1, carbs: 1, fats: 1, loggedDate: '2026-08-31T00:00:00Z',
      source_meta: { confidenceTier: 'medium' },
    };
    const log = transformBackendToFoodLog(backendRow);
    expect(log.sourceMeta.confidenceTier).toBe('medium');
  });
});
