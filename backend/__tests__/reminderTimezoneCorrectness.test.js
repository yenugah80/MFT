import { getLocalHour } from '../src/utils/timezone.js';
import { generateHydrationReminders } from '../src/services/smartReminderService.js';

// Regression coverage for a live production incident: a user in EDT (UTC-4)
// received "It's past noon and still no water?" and "Your afternoon energy
// forecast" at 9:00-9:15am local time. Traced to smartReminderService.js's
// getSmartReminders computing currentHour from the server's raw
// new Date().getHours() (UTC in production — see CLAUDE.md) with zero
// per-user offset, AND wittyMessageEngine.js independently recomputing its
// OWN new Date().getHours() inside getHydrationMessage/getFoodMessage/
// getActivityMessage regardless of what the caller decided — two separate,
// compounding, timezone-blind computations. Real production timestamps
// (UTC 11:15, 12:00, 13:00, 13:15) all fell inside the "midday" bucket
// (11am-1pm) defined in raw UTC terms, while the user's real local time was
// 7:15-9:15am — the actual "morning" window.
describe('getLocalHour', () => {
  it('converts a raw UTC hour to the correct local hour for EDT (UTC-4)', () => {
    // Date.getTimezoneOffset() convention: EDT is +240 (positive = west of UTC).
    const utc13 = new Date(Date.UTC(2026, 8, 14, 13, 15, 3));
    expect(getLocalHour(240, utc13)).toBe(9); // 13:15 UTC -> 9:15am EDT
  });

  it('matches the exact incident timestamps', () => {
    const offsetMinutes = 240; // EDT
    expect(getLocalHour(offsetMinutes, new Date(Date.UTC(2026, 8, 14, 11, 15)))).toBe(7);
    expect(getLocalHour(offsetMinutes, new Date(Date.UTC(2026, 8, 14, 12, 0)))).toBe(8);
    expect(getLocalHour(offsetMinutes, new Date(Date.UTC(2026, 8, 14, 13, 0)))).toBe(9);
    expect(getLocalHour(offsetMinutes, new Date(Date.UTC(2026, 8, 14, 13, 15)))).toBe(9);
  });

  it('falls back to server local hour when no offset is available, rather than throwing', () => {
    const now = new Date();
    expect(getLocalHour(null, now)).toBe(now.getHours());
    expect(getLocalHour(undefined, now)).toBe(now.getHours());
  });
});

describe('generateHydrationReminders end-to-end at the incident\'s real local hour', () => {
  it('produces a morning-appropriate reminder, never noon/afternoon-phrased copy, at local hour 9', () => {
    // Mirrors the production context as closely as a synthetic fixture can:
    // no water logged yet, well under goal, currentHour is the CORRECTLY
    // computed local hour (9) rather than the raw UTC hour (13) that
    // produced the incident.
    const context = {
      currentHour: 9,
      todayStats: { water: { totalLiters: 0, totalLogs: 0 } },
      goals: { waterLiters: 2 },
      gamification: { streak: 0 },
    };
    for (let i = 0; i < 20; i++) {
      const [reminder] = generateHydrationReminders(context);
      expect(reminder).toBeTruthy();
      expect(reminder.type).toBe('hydration_morning');
      expect(reminder.title.toLowerCase()).not.toContain('noon');
      expect(reminder.title.toLowerCase()).not.toContain('afternoon');
    }
  });

  it('reproduces the incident directly: raw UTC hour 13 (uncorrected) does select noon-phrased copy', () => {
    // This is what generateHydrationReminders received before the fix to
    // getSmartReminders' currentHour computation — confirms the bucket
    // boundaries themselves were never wrong, only what hour they were fed.
    const context = {
      currentHour: 13,
      todayStats: { water: { totalLiters: 0, totalLogs: 0 } },
      goals: { waterLiters: 2 },
      gamification: { streak: 0 },
    };
    const titlesSeen = new Set();
    for (let i = 0; i < 30; i++) {
      const [reminder] = generateHydrationReminders(context);
      expect(reminder.type).toBe('hydration_midday');
      titlesSeen.add(reminder.title);
    }
    const middayOnlyTitles = ["It's past noon and still no water?", "Your afternoon energy forecast", "Remember water?"];
    expect([...titlesSeen].some((t) => middayOnlyTitles.includes(t))).toBe(true);
  });
});
