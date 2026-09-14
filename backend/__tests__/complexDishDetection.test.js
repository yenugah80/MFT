import { isComplexDishInput } from '../src/services/canonicalIngredients.js';

// OpenAIClient's constructor eagerly opens a live Redis connection when
// REDIS_URL is set (`this.redisClient.connect()`, unawaited) — real in this
// repo's .env, loaded as a side effect via config/env.js's `dotenv/config`.
// Importing the module's singleton directly in a test process attempts a
// real network connection and can hang the test run. Clear it first so the
// constructor takes its in-memory NodeCache fallback path instead — this
// only affects this file's own isolated module registry, not other tests
// or the real running server. Set to '' rather than deleted — dotenv only
// fills in keys that don't already exist on process.env, so an empty
// string (falsy, but present) survives the env.js import's dotenv/config
// without being refilled from the real .env.
process.env.REDIS_URL = '';
const { openaiClient } = await import('../src/services/apiClients/OpenAIClient.js');

// Regression coverage for the "chole with rice" investigation: a fixed
// whitelist of dish-type words (curry/masala/biryani/...) decided whether
// an utterance was "complex" enough to force a full AI parse. Any dish
// outside that list — "chole", "pad thai" — fell through to naive local
// dictionary keyword matching, which grabbed a stray recognized ingredient
// (e.g. "rice") and silently dropped the actual, unrecognized dish
// entirely. isComplexDishInput now also flags any input containing a word
// the ingredient dictionary can't account for at all, regardless of what
// that word is — not a second dish-name whitelist.
describe('isComplexDishInput — general unrecognized-dish detection', () => {
  it('flags a dish name absent from both the regex whitelist and the local dictionary', () => {
    expect(isComplexDishInput('chole with rice')).toBe(true);
    expect(isComplexDishInput('a bowl of chole')).toBe(true);
  });

  it('flags a multi-word regional dish name the dictionary has no entry for', () => {
    expect(isComplexDishInput('a plate of pad thai')).toBe(true);
  });

  it('does not flag an utterance made entirely of dictionary-known foods and connector words', () => {
    expect(isComplexDishInput('two eggs and a slice of toast with butter')).toBe(false);
    expect(isComplexDishInput('rice and chicken and broccoli')).toBe(false);
    expect(isComplexDishInput('a banana')).toBe(false);
  });

  it('still flags via the fast-path regex for an already-known dish-type word', () => {
    expect(isComplexDishInput('chicken tikka masala')).toBe(true);
    expect(isComplexDishInput('a veggie burger')).toBe(true);
  });

  it('does not flag negation/exclusion phrasing as unrecognized residue', () => {
    expect(isComplexDishInput('toast without butter')).toBe(false);
    expect(isComplexDishInput('toast with no butter')).toBe(false);
  });

  it('gibberish with no recognizable food is still treated as needing a real parse', () => {
    expect(isComplexDishInput('xyzzy plugh')).toBe(true);
  });
});

// Regression coverage for the same investigation's second compounding bug:
// OpenAIClient.detectDishComplexity had its OWN independent hardcoded
// "simple food" whitelist, and matched it against the whole utterance — so
// "chole with rice" was classified 'simple' (cheap model, 400-token cap)
// purely because "rice" appeared in it, even though "chole" sitting right
// next to it is an entirely different, unrecognized dish. This starved the
// response of both model quality and token budget for exactly the inputs
// that most needed it, and directly caused reproducible mid-response JSON
// truncation for real mixed simple+unrecognized-dish utterances.
describe('OpenAIClient.detectDishComplexity — mixed simple+unrecognized-dish inputs', () => {
  it('does not classify a recognized dish sitting next to an unrecognized one as simple', () => {
    expect(openaiClient.detectDishComplexity('Two cups of chole with rice')).not.toBe('simple');
  });

  it('still classifies a genuinely simple multi-item breakfast as simple (no regression)', () => {
    expect(openaiClient.detectDishComplexity('two eggs and toast')).toBe('simple');
  });

  it('still classifies a single simple food as simple', () => {
    expect(openaiClient.detectDishComplexity('a banana')).toBe('simple');
  });

  it('still takes the regional fast-path for an already-known dish-type word', () => {
    expect(openaiClient.detectDishComplexity('chicken tikka masala')).toBe('regional');
  });
});
