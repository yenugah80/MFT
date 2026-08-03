/**
 * Regression tests for the exercise database.
 *
 * Two shipped bugs are pinned here:
 *
 * 1. Exercises were mapped to a backend activity type by NAME, against a table
 *    whose keys ("Weight Training", "Stair Climber", "Dance") did not match any
 *    entry in the database — so almost everything logged as 'general' and was
 *    billed at the wrong MET. Every exercise now carries its own `apiType`.
 *
 * 2. The intensity picker sent 'low' / 'high' / 'very_high', which the backend
 *    MET table does not recognise; it silently fell back to moderate, so Low
 *    and High logged identical calories. Levels now mirror the backend, and
 *    rows already stored with the old values must still resolve.
 */

import {
  EXERCISES,
  EXERCISE_CATEGORIES,
  FOCUS_FILTERS,
  INTENSITY_LEVELS,
  calculateCalories,
  filterExercises,
  searchExercises,
  getExerciseById,
  resolveIntensity,
} from '../services/exerciseDatabase';

// Mirrors backend/src/services/metCalorieService.js MET_VALUES
const BACKEND_MET = {
  running: { light: 6.0, moderate: 10.0, vigorous: 14.0 },
  cycling: { light: 4.0, moderate: 8.0, vigorous: 12.0 },
  walking: { light: 2.5, moderate: 3.5, vigorous: 5.0 },
  gym: { light: 3.5, moderate: 5.0, vigorous: 6.0 },
  swimming: { light: 4.5, moderate: 7.0, vigorous: 10.0 },
  yoga: { light: 2.5, moderate: 4.0, vigorous: 5.0 },
  sports: { light: 4.0, moderate: 6.0, vigorous: 8.0 },
  hiking: { light: 4.5, moderate: 6.0, vigorous: 8.0 },
  dancing: { light: 3.0, moderate: 5.0, vigorous: 7.0 },
  hiit: { light: 5.0, moderate: 8.0, vigorous: 12.0 },
  strength: { light: 3.0, moderate: 5.0, vigorous: 6.0 },
  cardio: { light: 4.0, moderate: 7.0, vigorous: 10.0 },
  flexibility: { light: 2.0, moderate: 2.5, vigorous: 3.0 },
  general: { light: 3.0, moderate: 5.0, vigorous: 7.0 },
};

describe('exercise catalogue integrity', () => {
  it('has unique ids', () => {
    const ids = EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every exercise an apiType the backend MET table recognises', () => {
    const unknown = EXERCISES.filter((e) => !BACKEND_MET[e.apiType]);
    expect(unknown.map((e) => `${e.id}:${e.apiType}`)).toEqual([]);
  });

  it('gives every exercise the fields the UI renders', () => {
    const incomplete = EXERCISES.filter(
      (e) => !e.name || !e.category || !e.muscleGroup || !e.equipment || !e.icon || !e.met
    );
    expect(incomplete.map((e) => e.id)).toEqual([]);
  });

  it('uses only declared categories', () => {
    const valid = new Set(Object.values(EXERCISE_CATEGORIES));
    expect(EXERCISES.every((e) => valid.has(e.category))).toBe(true);
  });
});

describe('calorie estimates match what the API will log', () => {
  it.each(['LIGHT', 'MODERATE', 'VIGOROUS'])('agrees with the backend at %s intensity', (level) => {
    const apiLevel = level.toLowerCase();
    const mismatches = EXERCISES.filter((exercise) => {
      const preview = calculateCalories(exercise, 30, 70, level);
      const logged = Math.round(BACKEND_MET[exercise.apiType][apiLevel] * 70 * 0.5);
      return preview !== logged;
    });

    expect(mismatches.map((e) => e.id)).toEqual([]);
  });

  it('scales with duration and body weight', () => {
    const legPress = getExerciseById('leg-press');
    expect(calculateCalories(legPress, 60, 70, 'MODERATE')).toBe(350);
    expect(calculateCalories(legPress, 30, 100, 'MODERATE')).toBe(250);
  });

  it('falls back to moderate for an unknown intensity key', () => {
    const legPress = getExerciseById('leg-press');
    expect(calculateCalories(legPress, 30, 70, 'VERY_HIGH')).toBe(
      calculateCalories(legPress, 30, 70, 'MODERATE')
    );
  });

  it('returns 0 for a zero-length session rather than NaN', () => {
    expect(calculateCalories(getExerciseById('plank'), 0, 70, 'MODERATE')).toBe(0);
  });
});

describe('intensity levels', () => {
  it('exposes exactly the backend buckets', () => {
    expect(Object.keys(INTENSITY_LEVELS)).toEqual(['LIGHT', 'MODERATE', 'VIGOROUS']);
  });

  it('lowercases to values the API accepts', () => {
    Object.keys(INTENSITY_LEVELS).forEach((key) => {
      expect(BACKEND_MET.strength[key.toLowerCase()]).toBeDefined();
    });
  });

  it.each([
    ['low', 'Light'],
    ['high', 'Vigorous'],
    ['very_high', 'Vigorous'],
  ])('resolves legacy value %s to %s', (stored, label) => {
    // Rows logged before the picker changed must not all read "Moderate"
    expect(resolveIntensity(stored).label).toBe(label);
  });

  it.each(['light', 'moderate', 'vigorous'])('resolves current value %s', (stored) => {
    expect(resolveIntensity(stored).label.toLowerCase()).toBe(stored);
  });

  it('falls back to Moderate for null, undefined or junk', () => {
    expect(resolveIntensity(null).label).toBe('Moderate');
    expect(resolveIntensity(undefined).label).toBe('Moderate');
    expect(resolveIntensity('').label).toBe('Moderate');
    expect(resolveIntensity('sideways').label).toBe('Moderate');
  });
});

describe('search and filtering', () => {
  it('finds gym machines by their common name', () => {
    expect(searchExercises('leg press').map((e) => e.id)).toContain('leg-press');
    expect(searchExercises('lat pulldown').map((e) => e.id)).toContain('lat-pulldown');
  });

  it('tolerates a misspelling', () => {
    // The reported case: "threadmill" returned nothing
    expect(searchExercises('threadmill').length).toBeGreaterThan(0);
    expect(searchExercises('threadmill').every((e) => e.aliases.includes('treadmill') || /treadmill/i.test(e.name))).toBe(true);
  });

  it('matches muscle groups and equipment', () => {
    expect(searchExercises('glutes').length).toBeGreaterThan(0);
    expect(searchExercises('machine').length).toBeGreaterThan(0);
  });

  it('returns everything for an empty query', () => {
    expect(searchExercises('').length).toBe(EXERCISES.length);
    expect(filterExercises({ query: '' }).length).toBe(EXERCISES.length);
  });

  it('returns nothing rather than everything for a no-match query', () => {
    expect(searchExercises('zzzzqqq')).toEqual([]);
  });

  it('stacks category and focus filters', () => {
    const upperStrength = filterExercises({ category: 'Strength', focusKey: 'upper' });
    expect(upperStrength.length).toBeGreaterThan(0);
    expect(upperStrength.every((e) => e.category === 'Strength' && e.muscleGroup === 'Upper Body')).toBe(true);
  });

  it('has at least one exercise behind every focus chip', () => {
    FOCUS_FILTERS.forEach((focus) => {
      expect(EXERCISES.filter(focus.match).length).toBeGreaterThan(0);
    });
  });

  it('ignores an unknown focus key instead of returning nothing', () => {
    expect(filterExercises({ focusKey: 'nope' }).length).toBe(EXERCISES.length);
  });
});
