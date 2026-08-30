import {
  selectCreateProjection,
  selectDeletionProjection,
  selectDeletionTrackedDay,
} from '../src/services/streakReconciliationService.js';

describe('canonical streak projection', () => {
  it('repairs a stored under-count after a create or read', () => {
    expect(selectCreateProjection(48, 50)).toBe(50);
  });

  it('preserves a legitimate freeze offset', () => {
    expect(selectCreateProjection(52, 50)).toBe(52);
  });

  it('repairs an under-count while applying continuity lost by deletion', () => {
    expect(selectDeletionProjection({
      storedStreak: 48,
      beforeStreak: 50,
      afterStreak: 49,
    })).toBe(49);
  });

  it('preserves the existing freeze offset after deletion', () => {
    expect(selectDeletionProjection({
      storedStreak: 52,
      beforeStreak: 50,
      afterStreak: 49,
    })).toBe(51);
  });

  it('does not reduce the projection when a deletion leaves continuity intact', () => {
    expect(selectDeletionProjection({
      storedStreak: 48,
      beforeStreak: 50,
      afterStreak: 50,
    })).toBe(50);
  });

  it('clears a single-day streak when its only qualifying day is deleted', () => {
    expect(selectDeletionProjection({
      storedStreak: 1,
      beforeStreak: 1,
      afterStreak: 0,
    })).toBe(0);
  });

  it('moves the continuity marker to the protected day when newest activity is deleted', () => {
    expect(selectDeletionTrackedDay({
      currentLastLogDay: '2026-08-29',
      beforeLatestDay: '2026-08-29',
      afterLatestDay: '2026-08-27',
      targetStreak: 48,
      afterStreak: 47,
    })).toBe('2026-08-28');
  });

  it('keeps the current marker when another entry still covers the newest day', () => {
    expect(selectDeletionTrackedDay({
      currentLastLogDay: '2026-08-29',
      beforeLatestDay: '2026-08-29',
      afterLatestDay: '2026-08-29',
      targetStreak: 50,
      afterStreak: 50,
    })).toBe('2026-08-29');
  });
});
