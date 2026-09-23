import { validateExtraction, isNegatedMention } from '../src/services/canonicalIngredients.js';

// Regression coverage for the voice-mode 0-items bug: validateExtraction(text,
// [], { buildItemsFromKeywords: true }) — the "local dictionary as parser"
// call site voiceLog.js's /process handler uses — used to always return []
// regardless of how many foods were unambiguously named in the text, because
// the function only ever logged a "MISSED INGREDIENT" warning and never
// constructed an item for it.

describe('validateExtraction — buildItemsFromKeywords (voice-mode parser path)', () => {
  it('reproduces the exact reported bug case: "two eggs and a slice of toast with butter" now returns 3 items, not 0', () => {
    const result = validateExtraction(
      'two eggs and a slice of toast with butter',
      [],
      { buildItemsFromKeywords: true }
    );
    const names = result.map((r) => r.name.toLowerCase());
    expect(result.length).toBeGreaterThan(0);
    expect(names.some((n) => n.includes('egg'))).toBe(true);
    expect(names.some((n) => n.includes('toast') || n.includes('bread'))).toBe(true);
    expect(names.some((n) => n.includes('butter'))).toBe(true);
  });

  it('a single simple spoken food is detected', () => {
    const result = validateExtraction('a banana', [], { buildItemsFromKeywords: true });
    expect(result.length).toBe(1);
    expect(result[0].name.toLowerCase()).toContain('banana');
  });

  it('multiple explicitly-spoken foods are all detected', () => {
    const result = validateExtraction('rice and chicken and broccoli', [], { buildItemsFromKeywords: true });
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  it('default (buildItemsFromKeywords not set) preserves the original log-only behavior — no auto-add', () => {
    // This is the parseTextToFoods call-site contract: real AI-extracted
    // items are passed in, and a "missed" keyword must NOT be silently
    // added as a second, possibly-duplicate item.
    const aiItems = [{ name: 'scrambled eggs', confidence: 0.9 }];
    const result = validateExtraction('eggs and toast', aiItems);
    expect(result).toHaveLength(1); // toast was "missed" but NOT auto-added
    expect(result[0].name).toBe('scrambled eggs');
  });

  it('an explicit removal ("toast without butter") excludes the negated food but keeps the rest', () => {
    const result = validateExtraction('toast without butter', [], { buildItemsFromKeywords: true });
    const names = result.map((r) => r.name.toLowerCase());
    expect(names.some((n) => n.includes('toast') || n.includes('bread'))).toBe(true);
    expect(names.some((n) => n.includes('butter'))).toBe(false);
  });

  it('an ambiguous/unrecognized spoken food does not crash and yields no false item', () => {
    const result = validateExtraction('xyzzy plugh', [], { buildItemsFromKeywords: true });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it('quantity is captured for an explicitly-spoken count ("two eggs" -> quantity 2)', () => {
    const result = validateExtraction('two eggs', [], { buildItemsFromKeywords: true });
    const egg = result.find((r) => r.name.toLowerCase().includes('egg'));
    expect(egg.quantity).toBe(2);
  });
});

describe('isNegatedMention', () => {
  it('detects "without X"', () => {
    expect(isNegatedMention('toast without butter', 'butter')).toBe(true);
  });

  it('detects "no X"', () => {
    expect(isNegatedMention('coffee with no sugar', 'sugar')).toBe(true);
  });

  it('detects "hold the X"', () => {
    expect(isNegatedMention('a burger, hold the cheese', 'cheese')).toBe(true);
  });

  it('does not negate a food that is simply listed alongside others', () => {
    expect(isNegatedMention('eggs and toast with butter', 'butter')).toBe(false);
    expect(isNegatedMention('eggs and toast with butter', 'eggs')).toBe(false);
  });

  it('does not negate when the negation word belongs to a different clause', () => {
    expect(isNegatedMention('no thanks, I had rice and dal', 'dal')).toBe(false);
  });
});
