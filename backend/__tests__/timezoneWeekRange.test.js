import { getLocalWeekRange } from '../src/utils/timezone.js';

describe('getLocalWeekRange', () => {
  it('returns the Sunday-Saturday week for a timezone west of UTC', () => {
    const thursdayNoonUtc = new Date('2026-08-27T16:00:00.000Z');
    const range = getLocalWeekRange(240, thursdayNoonUtc);

    expect(range.start.toISOString()).toBe('2026-08-23T04:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-08-30T03:59:59.999Z');
  });

  it('does not move a late-Saturday local time into UTC Sunday', () => {
    const saturdayLateUtc = new Date('2026-08-30T03:30:00.000Z');
    const range = getLocalWeekRange(240, saturdayLateUtc);

    expect(range.start.toISOString()).toBe('2026-08-23T04:00:00.000Z');
  });

  it('supports timezones east of UTC', () => {
    const mondayLocal = new Date('2026-08-23T19:30:00.000Z'); // Aug 24 01:00 at UTC+05:30
    const range = getLocalWeekRange(-330, mondayLocal);

    expect(range.start.toISOString()).toBe('2026-08-22T18:30:00.000Z');
    expect(range.end.toISOString()).toBe('2026-08-29T18:29:59.999Z');
  });
});
