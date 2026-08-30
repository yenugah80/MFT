import {
  buildHydrationInsights,
  getHydrationPeriod,
  groupHydrationSeriesByWeek,
  summarizeHydrationRange,
} from '../utils/hydrationHistory';

const series = Array.from({ length: 7 }, (_, index) => ({
  date: `2026-08-${String(22 + index).padStart(2, '0')}`,
  dayOfWeek: index,
  ml: [2500, 1800, 0, 2500, 1200, 2600, 150][index],
  isToday: index === 6,
}));

describe('hydration history summaries', () => {
  it('keeps calendar coverage separate from averages on logged days', () => {
    const summary = summarizeHydrationRange({
      fullSeries: series,
      logs: [],
      rangeDays: 7,
      goalMl: 2500,
    });

    expect(summary.daysTracked).toBe(6);
    expect(summary.daysOnTarget).toBe(3);
    expect(summary.averageLoggedDayMl).toBe(1792);
    expect(summary.trackingRate).toBe(86);
    expect(summary.goalRate).toBe(43);
  });

  it('filters entries and derives beverage and recorded-time patterns from the selected range', () => {
    const logs = [
      { loggedDate: '2026-08-28T13:00:00', beverageType: 'water', hydrationLiters: 0.5 },
      { loggedDate: '2026-08-28T19:00:00', beverageType: 'water', hydrationLiters: 0.25 },
      { loggedDate: '2026-08-27T08:00:00', beverageType: 'coffee', hydrationLiters: 0.2 },
      { loggedDate: '2026-08-10T08:00:00', beverageType: 'juice', hydrationLiters: 0.3 },
    ];
    const summary = summarizeHydrationRange({
      fullSeries: series,
      logs,
      rangeDays: 1,
      goalMl: 2500,
    });

    expect(summary.rangeLogs).toHaveLength(2);
    expect(summary.topBeverageType).toBe('water');
    expect(summary.topBeverageShare).toBe(100);
    expect(summary.peakPeriod).toBe('afternoon');
  });

  it('does not let an unfinished today break an existing streak', () => {
    const streakSeries = series.map((day, index) => ({
      ...day,
      ml: index >= 3 && index < 6 ? 2200 : (index === 6 ? 150 : 0),
    }));
    const summary = summarizeHydrationRange({
      fullSeries: streakSeries,
      rangeDays: 7,
      goalMl: 2500,
    });
    expect(summary.streak).toBe(3);
  });

  it('labels recorded periods deterministically', () => {
    expect(getHydrationPeriod(6)).toBe('morning');
    expect(getHydrationPeriod(13)).toBe('afternoon');
    expect(getHydrationPeriod(19)).toBe('evening');
    expect(getHydrationPeriod(23)).toBe('night');
  });

  it('explains sample coverage and avoids causal language', () => {
    const summary = summarizeHydrationRange({
      fullSeries: series,
      logs: [],
      rangeDays: 7,
      goalMl: 2500,
    });
    const copy = buildHydrationInsights(summary, 2500).map((item) => item.body).join(' ');
    expect(copy).toContain('Days without an entry stay visible');
    expect(copy).not.toMatch(/causes|improves|boosts/i);
  });

  it('groups dense history into calendar weeks using logged-day averages', () => {
    const denseSeries = [
      { date: '2026-08-01', ml: 1000 },
      { date: '2026-08-02', ml: 2000 },
      { date: '2026-08-03', ml: 0 },
      { date: '2026-08-08', ml: 3000 },
      { date: '2026-08-09', ml: 0 },
      { date: '2026-08-10', ml: 0, isToday: true },
    ];

    const weeks = groupHydrationSeriesByWeek(denseSeries, 2500);

    expect(weeks).toHaveLength(3);
    expect(weeks[0]).toMatchObject({ date: '2026-07-26', ml: 1000, trackedDays: 1 });
    expect(weeks[1]).toMatchObject({ date: '2026-08-02', ml: 2500, trackedDays: 2, daysOnTarget: 1 });
    expect(weeks[2]).toMatchObject({ date: '2026-08-09', ml: 0, trackedDays: 0, isToday: true });
  });
});
