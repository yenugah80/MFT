import { normalizeSleepLogInput } from '../src/routes/sleep.js';

describe('sleep log input normalization', () => {
  test('normalizes a complete production payload', () => {
    const result = normalizeSleepLogInput({
      bedTime: '2026-08-25T22:30:00.000Z',
      wakeTime: '2026-08-26T06:30:00.000Z',
      quality: 8,
      tags: { caffeine: true, exercise: false, unknown: true },
      notes: '  rested well  ',
      sleepDate: '2026-08-25',
      clientEventId: 'evt-sleep-123',
    }, 0);

    expect(result.error).toBeUndefined();
    expect(result.value).toMatchObject({
      durationMinutes: 480,
      quality: 8,
      effectiveSleepDate: '2026-08-25',
      notes: 'rested well',
      clientEventId: 'evt-sleep-123',
      tags: {
        caffeine: true,
        alcohol: false,
        exercise: false,
        stress: false,
        screenTime: false,
        lateFood: false,
      },
    });
  });

  test('derives the sleep night in the user timezone', () => {
    const result = normalizeSleepLogInput({
      bedTime: '2026-08-26T03:30:00.000Z',
      wakeTime: '2026-08-26T11:30:00.000Z',
      quality: 7,
    }, 240);

    expect(result.value.effectiveSleepDate).toBe('2026-08-25');
  });

  test.each([
    [{ quality: 7.5, bedTime: '2026-08-25', wakeTime: '2026-08-26' }, 'Sleep quality must be an integer between 1 and 10'],
    [{ quality: 7, bedTime: 'bad', wakeTime: '2026-08-26' }, 'Bed time and wake time must be valid timestamps'],
    [{ quality: 7, bedTime: '2026-08-26', wakeTime: '2026-08-25' }, 'Sleep duration must be greater than zero and no more than 24 hours'],
    [{ quality: 7, bedTime: '2026-08-25', wakeTime: '2026-08-26', tags: [] }, 'Sleep context tags must be an object'],
    [{ quality: 7, bedTime: '2026-08-25', wakeTime: '2026-08-26', tags: { caffeine: 'yes' } }, 'Sleep context tag caffeine must be true or false'],
    [{ quality: 7, bedTime: '2026-08-25', wakeTime: '2026-08-26', notes: 'x'.repeat(201) }, 'Notes must be 200 characters or fewer'],
    [{ quality: 7, bedTime: '2026-08-25', wakeTime: '2026-08-26', sleepDate: '2026-02-30' }, 'Sleep date must be a valid calendar date'],
  ])('rejects malformed payload %#', (payload, expectedError) => {
    expect(normalizeSleepLogInput(payload)).toEqual({ error: expectedError });
  });
});
