/**
 * Pins the spacing scale invariants.
 *
 * Five modules exported SPACING independently with different key sets. They
 * agreed on shared values but not on which keys existed, so `SPACING[9]` was
 * real or undefined depending on which module a file imported. React Native
 * drops an undefined style silently, so the failure is invisible — `SPACING[28]`
 * removed the dashboard's entire bottom padding and nothing errored.
 */

const { SPACING_SCALE } = require('../constants/spacingScale');
const premiumTheme = require('../constants/premiumTheme');
const designTokens = require('../constants/designTokens');
const premiumDesignSystem = require('../constants/premiumDesignSystem');
const darkPremiumTheme = require('../constants/darkPremiumTheme');
const designSystem = require('../constants/designSystem');

/** The modules that share the canonical numeric scale. */
const SHARED = {
  premiumTheme: premiumTheme.SPACING,
  designTokens: designTokens.SPACING,
  premiumDesignSystem: premiumDesignSystem.SPACING,
  darkPremiumTheme: darkPremiumTheme.SPACING,
};

const isNumericKey = (k) => /^\d+(\.\d+)?$/.test(k);

describe('canonical spacing scale', () => {
  it('is a 4pt grid, with px as the only exception', () => {
    for (const [key, value] of Object.entries(SPACING_SCALE)) {
      if (key === 'px') {
        expect(value).toBe(1);
        continue;
      }
      expect(isNumericKey(key)).toBe(true);
      expect(value).toBe(Number(key) * 4);
    }
  });

  it('has no gaps in the whole-number run, so a plausible key is never undefined', () => {
    // 28 was the gap that caused the bug: 24 and 32 both existed, 28 did not.
    const whole = Object.keys(SPACING_SCALE)
      .filter((k) => isNumericKey(k) && Number.isInteger(Number(k)))
      .map(Number)
      .sort((a, b) => a - b);

    for (const step of [24, 28, 32]) {
      expect(whole).toContain(step);
    }
  });
});

describe('every module shares the canonical scale', () => {
  for (const [name, scale] of Object.entries(SHARED)) {
    it(`${name} carries every canonical key at the same value`, () => {
      const mismatched = Object.entries(SPACING_SCALE)
        .filter(([key, value]) => scale[key] !== value)
        .map(([key, value]) => `${key}: expected ${value}, got ${scale[key]}`);

      expect(mismatched).toEqual([]);
    });
  }
});

describe('designSystem keeps its own t-shirt scale on purpose', () => {
  // Not merged: these disagree with the aliases the other modules use
  // (md 12 vs 16, lg 16 vs 24, xl 20 vs 32). Unifying them would resize
  // layouts in every file importing this module, so the difference is pinned
  // here to make any future change deliberate rather than accidental.
  it('still differs from the shared aliases', () => {
    expect(designSystem.SPACING.md).toBe(12);
    expect(designSystem.SPACING.lg).toBe(16);
    expect(designSystem.SPACING.xl).toBe(20);

    expect(premiumTheme.SPACING.md).toBe(16);
    expect(premiumTheme.SPACING.lg).toBe(24);
    expect(premiumTheme.SPACING.xl).toBe(32);
  });
});
