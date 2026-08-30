import { computeMealCharacteristics, getCrashRisk, isLikelyCrashWindow } from '../src/services/mealFeelingCharacteristics.js';

describe('getCrashRisk — Phase 2 calibration: fiber-aware high-carb classification', () => {
  it('the reported case (rice + tomato dal) now shows LOW crash risk, not moderate', () => {
    // Real canonical totals from the Phase 1/2 validation: 75g carbs, 8.6g
    // fiber (ratio 8.7), 14g protein — previously flagged "Moderate crash
    // risk" purely for clearing the 60g carb bar, with fiber never
    // consulted in this function at all.
    const characteristics = computeMealCharacteristics({ calories: 385, protein: 14, carbs: 75, sugar: 4.1, fiber: 8.6, novaScore: 1 });
    const risk = getCrashRisk(characteristics);
    expect(risk.level).toBe('low');
  });

  it('a high-carb meal with genuinely poor fiber (e.g. white bread) still shows moderate risk', () => {
    const characteristics = computeMealCharacteristics({ calories: 300, protein: 6, carbs: 65, sugar: 3, fiber: 1, novaScore: 3 });
    const risk = getCrashRisk(characteristics);
    expect(risk.level).toBe('medium');
  });

  it('high sugar with poor fiber is still high risk (unchanged behavior)', () => {
    const characteristics = computeMealCharacteristics({ calories: 400, protein: 3, carbs: 50, sugar: 40, fiber: 1, novaScore: 4 });
    const risk = getCrashRisk(characteristics);
    expect(risk.level).toBe('high');
  });

  it('high sugar WITH good fiber does not automatically get the worst rating', () => {
    const characteristics = computeMealCharacteristics({ calories: 400, protein: 10, carbs: 50, sugar: 30, fiber: 12, novaScore: 2 });
    const risk = getCrashRisk(characteristics);
    expect(risk.level).not.toBe('high');
  });

  it('high protein meals stay low risk regardless of carbs', () => {
    const characteristics = computeMealCharacteristics({ calories: 500, protein: 40, carbs: 70, sugar: 2, fiber: 2, novaScore: 1 });
    const risk = getCrashRisk(characteristics);
    expect(risk.level).toBe('low');
  });

  it('a genuinely low-carb, low-sugar meal is low risk', () => {
    const characteristics = computeMealCharacteristics({ calories: 300, protein: 20, carbs: 10, sugar: 2, fiber: 3, novaScore: 1 });
    expect(getCrashRisk(characteristics).level).toBe('low');
  });

  it('labels and colors are unchanged for each level', () => {
    const low = getCrashRisk(computeMealCharacteristics({ calories: 300, protein: 20, carbs: 10, sugar: 2, fiber: 3 }));
    const medium = getCrashRisk(computeMealCharacteristics({ calories: 300, protein: 6, carbs: 65, sugar: 3, fiber: 1 }));
    const high = getCrashRisk(computeMealCharacteristics({ calories: 400, protein: 3, carbs: 50, sugar: 40, fiber: 1 }));
    expect(low).toEqual({ level: 'low', label: 'Low crash risk', color: '#22C55E' });
    expect(medium).toEqual({ level: 'medium', label: 'Moderate crash risk', color: '#F59E0B' });
    expect(high).toEqual({ level: 'high', label: 'High crash risk', color: '#EF4444' });
  });
});

describe('isLikelyCrashWindow — kept in sync with getCrashRisk', () => {
  it('the rice+dal case is NOT a crash window (matches the low crashRisk classification)', () => {
    const characteristics = computeMealCharacteristics({ calories: 385, protein: 14, carbs: 75, sugar: 4.1, fiber: 8.6 });
    expect(isLikelyCrashWindow(characteristics)).toBe(false);
  });

  it('a poor-fiber high-carb meal IS a crash window (matches medium classification)', () => {
    const characteristics = computeMealCharacteristics({ calories: 300, protein: 6, carbs: 65, sugar: 3, fiber: 1 });
    expect(isLikelyCrashWindow(characteristics)).toBe(true);
  });

  it('high sugar alone is a crash window regardless of fiber', () => {
    const characteristics = computeMealCharacteristics({ calories: 400, protein: 10, carbs: 30, sugar: 30, fiber: 8 });
    expect(isLikelyCrashWindow(characteristics)).toBe(true);
  });
});

describe('computeMealCharacteristics — thresholds unchanged', () => {
  it('computes all characteristics correctly for a typical meal', () => {
    const c = computeMealCharacteristics({ calories: 400, protein: 30, carbs: 40, sugar: 5, fiber: 10, novaScore: 2 });
    expect(c.isHighProtein).toBe(true); // >25
    expect(c.isHighCarb).toBe(false); // not >60
    expect(c.hasGoodFiber).toBe(true); // >=5
    expect(c.carbToFiberRatio).toBe(4); // 40/10
  });

  it('defaults missing fields to safe values without throwing', () => {
    expect(() => computeMealCharacteristics({})).not.toThrow();
    expect(() => computeMealCharacteristics(undefined)).not.toThrow();
  });

  it('carbToFiberRatio falls back to raw carbs when fiber is 0', () => {
    const c = computeMealCharacteristics({ carbs: 50, fiber: 0 });
    expect(c.carbToFiberRatio).toBe(50);
  });
});
