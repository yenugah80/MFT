import { calculateHydrationStats } from '../src/services/decisionBrainService.js';

describe('Decision Brain hydration statistics', () => {
  it('uses the user local day for current progress near a UTC boundary', () => {
    const reference = new Date('2026-08-30T03:30:00.000Z');
    const logs = [
      { loggedDate: new Date('2026-08-29T14:00:00.000Z'), amountLiters: 2.5 },
      { loggedDate: new Date('2026-08-28T14:00:00.000Z'), amountLiters: 1.0 },
    ];

    const stats = calculateHydrationStats(logs, 2.5, 240, reference);

    expect(stats.todayDayKey).toBe('2026-08-29');
    expect(stats.todayProgress).toBe(100);
  });

  it('does not count a previous local day as today', () => {
    const reference = new Date('2026-08-30T03:30:00.000Z');
    const logs = [
      { loggedDate: new Date('2026-08-29T02:00:00.000Z'), amountLiters: 2.5 },
    ];

    const stats = calculateHydrationStats(logs, 2.5, 240, reference);

    expect(stats.todayDayKey).toBe('2026-08-29');
    expect(stats.todayProgress).toBe(0);
  });

  it('returns zero progress safely when the goal is missing', () => {
    const stats = calculateHydrationStats(
      [{ loggedDate: new Date('2026-08-29T14:00:00.000Z'), amountLiters: 1 }],
      0,
      240,
      new Date('2026-08-29T16:00:00.000Z')
    );

    expect(stats.todayProgress).toBe(0);
  });
});
