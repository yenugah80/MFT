/**
 * Regression check for the engagement-nudge Done/Later fix.
 *
 * Guards against two things at once:
 * 1. A brand-new user (zero logs in every domain) gets the 4 static
 *    'action'-type onboarding nudges back (nutrition_first_meal etc.),
 *    restoring what Phase 1's decision-brain migration silently dropped
 *    from the domain-specific recommendation arrays.
 * 2. Once a nudge is accepted/rejected via the same DB write the real
 *    /api/recommendations/:id/track route performs, it stops reappearing
 *    on the next fetch — this is the actual bug: without persisted
 *    dismissal, "Later" would do nothing since these nudges are
 *    recomputed fresh from live stats on every request.
 *
 * Run against the local dev database (see mft-no-dev-environment):
 *   DATABASE_URL=postgresql://$(whoami)@localhost:5432/mft_dev DB_SSL=false \
 *     node test-nudge-recommendations.mjs
 *
 * Seeds a disposable user, asserts, then deletes everything it created.
 */

import { db } from './src/db/index.js';
import { profilesTable, recommendationsHistoryTable } from './src/db/schema.js';
import { eq, and } from 'drizzle-orm';
import {
  getAnalyticsRecommendations,
  nudgeRecommendationId,
} from './src/services/analyticsRecommendationService.js';

const TEST_USER_ID = `test_nudge_${Date.now()}`;

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

async function main() {
  console.log(`[test-nudge-recommendations] Seeding disposable user ${TEST_USER_ID}`);
  await db.insert(profilesTable).values({ userId: TEST_USER_ID });

  try {
    // --- Step 1: brand-new user should see all 4 action nudges ---
    console.log('\n[Step 1] First fetch — zero logs in every domain');
    const first = await getAnalyticsRecommendations(TEST_USER_ID, 'week', 0);

    const nutritionNudge = first.recommendations.nutrition.find((r) => r.type === 'action');
    const moodNudge = first.recommendations.mood.find((r) => r.type === 'action');
    const hydrationNudge = first.recommendations.hydration.find((r) => r.type === 'action');
    const activityNudge = first.recommendations.activity.find((r) => r.type === 'action');

    assert(!!nutritionNudge, 'nutrition domain includes an action nudge');
    assert(!!moodNudge, 'mood domain includes an action nudge');
    assert(!!hydrationNudge, 'hydration domain includes an action nudge');
    assert(!!activityNudge, 'activity domain includes an action nudge');
    assert(
      nutritionNudge.id === nudgeRecommendationId(TEST_USER_ID, 'nutrition_first_meal'),
      'nutrition nudge id is namespaced with the user id'
    );

    // --- Step 2: the backfill actually wrote a 'shown' row ---
    console.log('\n[Step 2] Verify backfill persisted a history row');
    // backfillNudgeHistory fires-and-forgets (doesn't block the response) —
    // give it a moment to land before checking.
    await new Promise((r) => setTimeout(r, 300));

    const historyRows = await db
      .select()
      .from(recommendationsHistoryTable)
      .where(eq(recommendationsHistoryTable.userId, TEST_USER_ID));

    assert(historyRows.length === 4, `exactly 4 history rows were created (found ${historyRows.length})`);
    assert(
      historyRows.every((r) => r.interactionStatus === 'shown'),
      'all 4 rows start as interactionStatus=shown'
    );

    // --- Step 3: accept the nutrition nudge (same write /track performs) ---
    console.log('\n[Step 3] Accept the nutrition nudge');
    await db
      .update(recommendationsHistoryTable)
      .set({ interactionStatus: 'accepted', interactedAt: new Date(), updatedAt: new Date() })
      .where(and(
        eq(recommendationsHistoryTable.recommendationId, nutritionNudge.id),
        eq(recommendationsHistoryTable.userId, TEST_USER_ID)
      ));

    // --- Step 4: refetch — accepted nudge must be gone, others unaffected ---
    console.log('\n[Step 4] Second fetch — accepted nudge should no longer appear');
    const second = await getAnalyticsRecommendations(TEST_USER_ID, 'week', 0);

    const nutritionNudgeAfter = second.recommendations.nutrition.find((r) => r.type === 'action');
    const moodNudgeAfter = second.recommendations.mood.find((r) => r.type === 'action');

    assert(!nutritionNudgeAfter, 'accepted nutrition nudge is excluded from the next fetch');
    assert(!!moodNudgeAfter, 'mood nudge (untouched) still appears');

    // --- Step 5: repeat calls stay idempotent (no duplicate rows) ---
    console.log('\n[Step 5] Idempotency — a second fetch does not duplicate rows');
    await new Promise((r) => setTimeout(r, 300));
    const historyRowsAfter = await db
      .select()
      .from(recommendationsHistoryTable)
      .where(eq(recommendationsHistoryTable.userId, TEST_USER_ID));
    assert(historyRowsAfter.length === 4, `still exactly 4 history rows (found ${historyRowsAfter.length})`);

    console.log('\n✅ All checks passed');
  } finally {
    console.log(`\n[test-nudge-recommendations] Cleaning up ${TEST_USER_ID}`);
    // recommendations_history.userId cascades on profile delete
    await db.delete(profilesTable).where(eq(profilesTable.userId, TEST_USER_ID));
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
