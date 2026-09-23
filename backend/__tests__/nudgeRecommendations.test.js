import { jest } from '@jest/globals';
import {
  applyNudgeStatuses,
  nudgeRecommendationId,
  ENGAGEMENT_NUDGE_TYPE,
} from '../src/services/analyticsRecommendationService.js';

describe('nudgeRecommendationId', () => {
  it('namespaces a base id under the user id', () => {
    expect(nudgeRecommendationId('user_abc', 'nutrition_first_meal'))
      .toBe('user_abc:nutrition_first_meal');
  });

  it('keeps two users\' ids for the same nudge distinct', () => {
    const a = nudgeRecommendationId('user_abc', 'nutrition_first_meal');
    const b = nudgeRecommendationId('user_xyz', 'nutrition_first_meal');
    expect(a).not.toBe(b);
  });
});

describe('applyNudgeStatuses', () => {
  const userId = 'user_abc';

  it('passes non-action recommendations through untouched', () => {
    const recs = [{ id: 'nutrition_calorie_progress', type: 'insight' }];
    const result = applyNudgeStatuses(recs, userId, new Map());
    expect(result).toEqual(recs);
  });

  it('namespaces the id of a surviving action recommendation', () => {
    const recs = [{ id: 'nutrition_first_meal', type: 'action', title: 'Log Your First Meal' }];
    const result = applyNudgeStatuses(recs, userId, new Map());
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('user_abc:nutrition_first_meal');
    expect(result[0].title).toBe('Log Your First Meal');
  });

  it('drops an action recommendation the user already accepted', () => {
    const recs = [{ id: 'nutrition_first_meal', type: 'action' }];
    const statuses = new Map([['nutrition_first_meal', 'accepted']]);
    expect(applyNudgeStatuses(recs, userId, statuses)).toEqual([]);
  });

  it('drops an action recommendation the user already rejected', () => {
    const recs = [{ id: 'mood_first_log', type: 'action' }];
    const statuses = new Map([['mood_first_log', 'rejected']]);
    expect(applyNudgeStatuses(recs, userId, statuses)).toEqual([]);
  });

  it('keeps an action recommendation whose only history is "shown"', () => {
    // 'shown' means it was displayed before but never acted on — it should
    // keep reappearing until the user actually accepts or rejects it.
    const recs = [{ id: 'hydration_first_log', type: 'action' }];
    const statuses = new Map([['hydration_first_log', 'shown']]);
    const result = applyNudgeStatuses(recs, userId, statuses);
    expect(result).toHaveLength(1);
  });

  it('is a no-op on an empty list', () => {
    expect(applyNudgeStatuses([], userId, new Map())).toEqual([]);
  });
});

describe('ENGAGEMENT_NUDGE_TYPE', () => {
  it('is a stable constant used as recommendationType for nudge rows', () => {
    expect(ENGAGEMENT_NUDGE_TYPE).toBe('ENGAGEMENT_NUDGE');
  });
});
