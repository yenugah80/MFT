/**
 * The canonical spacing scale.
 *
 * Five modules used to define SPACING independently, each with a different
 * subset of keys. They agreed on every shared numeric key — all of them are the
 * same 4pt scale — but the gaps differed, so whether `SPACING[9]` existed
 * depended on which module a file happened to import from. `SPACING[28]` looked
 * perfectly reasonable and silently resolved to undefined, dropping the
 * dashboard's bottom padding entirely.
 *
 * Numeric keys are n * 4, plus `px` and the half-steps. Every module now spreads
 * this object, so a key that exists anywhere exists everywhere and carries the
 * same value.
 *
 * Only the numeric scale is shared. `premiumTheme` and `designTokens` each add
 * the same t-shirt aliases (xs/sm/md/…) on top via their own Object.assign
 * blocks, derived from these numbers, so those keep working unchanged.
 *
 * NOT unified: the t-shirt keys in `designSystem.js`. They genuinely disagree —
 * that module has md:12, lg:16, xl:20 where the others have md:16, lg:24,
 * xl:32. Merging them would silently resize layouts in every file importing it,
 * so it keeps its own scale.
 */

export const SPACING_SCALE = {
  0: 0,
  px: 1,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
};
