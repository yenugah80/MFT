/**
 * Regression tests for the food-name render crash.
 *
 * A food log reached the history screen with `foodName` set to an object
 * ({ name, description }) instead of a string. React throws
 * "Objects are not valid as a React child" when that hits a <Text>, and the
 * whole History screen fell into the ErrorBoundary.
 *
 * The column is `text NOT NULL`, so this comes from a client-side producer
 * (AI resolve / vision / ingredient breakdown / optimistic pending log). These
 * tests pin both halves of the fix: coercion at render, normalisation at the
 * boundary where the value enters app state.
 */

import { toDisplayText, normalizeFoodName } from '../utils/displayText';

describe('toDisplayText', () => {
  it('passes strings through', () => {
    expect(toDisplayText('Chicken curry')).toBe('Chicken curry');
  });

  it('extracts the label from the object shape that caused the crash', () => {
    // The exact payload from the render error: keys {name, description}
    expect(toDisplayText({ name: 'Rice', description: 'steamed basmati' })).toBe('Rice');
  });

  it('handles the other label keys producers use', () => {
    expect(toDisplayText({ foodName: 'Oats' })).toBe('Oats');
    expect(toDisplayText({ title: 'Salad' })).toBe('Salad');
    expect(toDisplayText({ label: 'Toast' })).toBe('Toast');
    expect(toDisplayText({ canonicalName: 'Banana' })).toBe('Banana');
    expect(toDisplayText({ originalInput: 'bannana' })).toBe('bannana');
  });

  it('never returns a non-string, whatever it is given', () => {
    const cases = [
      null,
      undefined,
      {},
      { description: 'no name here' },
      { nested: { name: 'too deep' } },
      true,
      false,
      NaN,
      Infinity,
      () => 'fn',
      Symbol('s'),
    ];

    cases.forEach((value) => {
      expect(typeof toDisplayText(value, 'fallback')).toBe('string');
    });
  });

  it('falls back when an object carries no usable label', () => {
    expect(toDisplayText({ description: 'only a description' }, 'Unknown item')).toBe('Unknown item');
    expect(toDisplayText({}, 'Unknown item')).toBe('Unknown item');
  });

  it('renders numbers but not booleans', () => {
    expect(toDisplayText(42)).toBe('42');
    expect(toDisplayText(0)).toBe('0');
    expect(toDisplayText(true, 'x')).toBe('x');
  });

  it('joins arrays of items', () => {
    expect(toDisplayText(['Rice', 'Curry'])).toBe('Rice, Curry');
    expect(toDisplayText([{ name: 'Rice' }, { name: 'Dal' }])).toBe('Rice, Dal');
    expect(toDisplayText([], 'empty')).toBe('empty');
  });

  it('treats whitespace-only strings as missing', () => {
    expect(toDisplayText('   ', 'Unknown item')).toBe('Unknown item');
  });

  it('defaults to an empty string, never the literal "undefined"', () => {
    expect(toDisplayText(undefined)).toBe('');
    expect(toDisplayText(null)).toBe('');
  });
});

describe('normalizeFoodName', () => {
  it('keeps a good name', () => {
    expect(normalizeFoodName('Grilled salmon')).toBe('Grilled salmon');
  });

  it('flattens the crashing object before it can reach storage', () => {
    expect(normalizeFoodName({ name: 'Rice', description: 'steamed' })).toBe('Rice');
  });

  it('uses a readable fallback rather than null', () => {
    expect(normalizeFoodName(undefined)).toBe('Unknown item');
    expect(normalizeFoodName({}, 'Food log')).toBe('Food log');
  });

  it('allows an explicit null fallback for optimistic entries', () => {
    // useFoodAnalysis keeps null so downstream "pending" checks still work
    expect(normalizeFoodName(undefined, null)).toBeNull();
  });
});
