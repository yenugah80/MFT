const {
  alignBedTime,
  applyWakeTime,
  sleepDurationMinutes,
  isValidSleepDuration,
} = require('../utils/sleepWindow');

/** Local-time Date helper, so the tests read as clock times. */
const at = (day, hours, minutes) => new Date(2026, 7, day, hours, minutes, 0, 0);

const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

describe('alignBedTime', () => {
  const wake = at(12, 6, 30); // woke 06:30 on the 12th

  it('anchors an evening bed time to the night before', () => {
    const bed = alignBedTime(at(1, 22, 0), wake);
    expect(bed.getDate()).toBe(11);
    expect(hhmm(bed)).toBe('22:00');
    expect(sleepDurationMinutes(bed, wake)).toBe(8 * 60 + 30);
  });

  it('keeps an after-midnight bed time on the same day as waking', () => {
    // The regression: 01:30 used to land on the 11th, giving a 29h window that
    // failed validation and disabled Save.
    const bed = alignBedTime(at(1, 1, 30), wake);
    expect(bed.getDate()).toBe(12);
    expect(sleepDurationMinutes(bed, wake)).toBe(5 * 60);
    expect(isValidSleepDuration(sleepDurationMinutes(bed, wake))).toBe(true);
  });

  it('treats a bed time equal to the wake time as a full 24 hours', () => {
    const bed = alignBedTime(at(1, 6, 30), wake);
    expect(sleepDurationMinutes(bed, wake)).toBe(MAX());
    expect(isValidSleepDuration(sleepDurationMinutes(bed, wake))).toBe(true);
  });

  it('never produces a non-positive or over-24h window across every clock time', () => {
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 15, 30, 45]) {
        const bed = alignBedTime(at(1, h, m), wake);
        const mins = sleepDurationMinutes(bed, wake);
        expect(isValidSleepDuration(mins)).toBe(true);
      }
    }
  });
});

describe('applyWakeTime', () => {
  it('moves the wake clock time and re-anchors bed, keeping the window valid', () => {
    const bed = at(11, 23, 0);
    const wake = at(12, 6, 30);

    const next = applyWakeTime(bed, wake, at(1, 8, 0));

    expect(hhmm(next.wakeTime)).toBe('08:00');
    expect(next.wakeTime.getDate()).toBe(12);
    expect(hhmm(next.bedTime)).toBe('23:00');
    expect(next.bedTime.getDate()).toBe(11);
    expect(sleepDurationMinutes(next.bedTime, next.wakeTime)).toBe(9 * 60);
  });

  it('handles pulling the wake time back before the bed clock time', () => {
    // Bed 23:00, wake moved to 22:00 — bed must fall to the previous day
    // rather than producing a negative window.
    const next = applyWakeTime(at(11, 23, 0), at(12, 6, 30), at(1, 22, 0));
    expect(sleepDurationMinutes(next.bedTime, next.wakeTime)).toBe(23 * 60);
    expect(isValidSleepDuration(sleepDurationMinutes(next.bedTime, next.wakeTime))).toBe(true);
  });
});

describe('isValidSleepDuration', () => {
  it('rejects zero and negative windows', () => {
    expect(isValidSleepDuration(0)).toBe(false);
    expect(isValidSleepDuration(-30)).toBe(false);
  });

  it('accepts up to 24h and rejects beyond', () => {
    expect(isValidSleepDuration(24 * 60)).toBe(true);
    expect(isValidSleepDuration(24 * 60 + 1)).toBe(false);
  });
});

function MAX() {
  return 24 * 60;
}
