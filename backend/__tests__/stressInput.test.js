import { normalizeStressLogInput } from '../src/routes/stress.js';

describe('stress log input normalization', () => {
  test('normalizes a complete production payload', () => {
    const result = normalizeStressLogInput({
      level: 8,
      triggers: ['work', 'work', 'unknown'],
      physicalSymptoms: { headache: true, fatigue: false, unknown: true },
      copingUsed: ['meditation', 'meditation', 'unknown'],
      notes: '  difficult morning  ',
      loggedAt: '2026-08-26T12:00:00.000Z',
      clientEventId: 'evt-123',
    });

    expect(result.error).toBeUndefined();
    expect(result.value).toMatchObject({
      level: 8,
      triggers: ['work'],
      copingUsed: ['meditation'],
      notes: 'difficult morning',
      clientEventId: 'evt-123',
      physicalSymptoms: {
        headache: true,
        tension: false,
        fatigue: false,
        heartRacing: false,
        digestive: false,
        insomnia: false,
      },
    });
  });

  test.each([
    [{ level: 4.5 }, 'Stress level must be an integer between 1 and 10'],
    [{ level: 4, triggers: 'work' }, 'Triggers and coping strategies must be arrays'],
    [{ level: 4, physicalSymptoms: [] }, 'Physical symptoms must be an object'],
    [{ level: 4, physicalSymptoms: { headache: 'yes' } }, 'Physical symptom headache must be true or false'],
    [{ level: 4, notes: 'x'.repeat(201) }, 'Notes must be 200 characters or fewer'],
    [{ level: 4, loggedAt: 'not-a-date' }, 'Invalid loggedAt timestamp'],
  ])('rejects malformed payload %#', (payload, expectedError) => {
    expect(normalizeStressLogInput(payload)).toEqual({ error: expectedError });
  });
});
