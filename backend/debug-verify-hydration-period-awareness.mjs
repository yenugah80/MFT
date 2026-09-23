/**
 * Verifies two things against a disposable synthetic user in LOCAL DEV
 * POSTGRES ONLY:
 * 1. The new period-scoped hydration fields (totalMlInPeriod,
 *    daysLoggedInPeriod, daysGoalMetInPeriod) genuinely differ between
 *    week/month and are computed correctly.
 * 2. The nutritionGoalsTable fix: a user's real custom water goal (set to
 *    1.5L here, deliberately NOT the 2L hardcoded default) is actually
 *    read and used — before the fix, goals.waterGoalMl was always 2000
 *    regardless of what a user set, since profilesTable (which was being
 *    queried) has no goal columns at all.
 */
import { db } from './src/db/index.js';
import { profilesTable, waterLogTable, nutritionGoalsTable } from './src/db/schema.js';
import { eq } from 'drizzle-orm';
import { getAnalyticsRecommendations } from './src/services/analyticsRecommendationService.js';

const userId = `test_hydration_period_${Date.now()}`;

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

async function main() {
  await db.insert(profilesTable).values({ userId });
  // Deliberately not the 2L hardcoded default — proves the real goal is read.
  await db.insert(nutritionGoalsTable).values({ userId, waterLiters: '1.5' }).onConflictDoNothing();

  // 2L/day (meets the real 1.5L goal) for the last 3 days, 1L/day (misses
  // it) for days 10-12. Week (7d) should only see the 3 recent days;
  // Month (30d) should see all 6.
  const rows = [];
  for (let i = 0; i < 3; i++) {
    rows.push({ userId, amountLiters: '2.0', loggedDate: daysAgo(i) });
  }
  for (let i = 10; i < 13; i++) {
    rows.push({ userId, amountLiters: '1.0', loggedDate: daysAgo(i) });
  }
  await db.insert(waterLogTable).values(rows);

  const week = await getAnalyticsRecommendations(userId, 'week', 0);
  const month = await getAnalyticsRecommendations(userId, 'month', 0);

  console.log('week.water:', JSON.stringify(week.stats.water));
  console.log('month.water:', JSON.stringify(month.stats.water));
  console.log('week.goals.waterGoalMl:', week.stats.goals.waterGoalMl);

  assert(week.stats.goals.waterGoalMl === 1500, 'the real 1.5L goal from nutritionGoalsTable is used, not the 2000ml hardcoded default');

  assert(week.stats.water.daysLoggedInPeriod === 3, 'week sees only the 3 recent days');
  assert(Math.abs(week.stats.water.totalMlInPeriod - 6000) < 1, 'week total is 6000ml (3 x 2L)');
  assert(week.stats.water.daysGoalMetInPeriod === 3, 'week: all 3 days met the real 1.5L goal');

  assert(month.stats.water.daysLoggedInPeriod === 6, 'month sees all 6 days');
  assert(Math.abs(month.stats.water.totalMlInPeriod - 9000) < 1, 'month total is 9000ml (3x2L + 3x1L)');
  assert(month.stats.water.daysGoalMetInPeriod === 3, 'month: only the 3 recent 2L days met the 1.5L goal, not the 1L days');

  assert(week.stats.water.totalMlInPeriod !== month.stats.water.totalMlInPeriod, 'week and month totals genuinely differ');

  console.log('\n✅ Hydration period-scoped fields are correctly computed and genuinely vary by period');

  await db.delete(waterLogTable).where(eq(waterLogTable.userId, userId));
  await db.delete(nutritionGoalsTable).where(eq(nutritionGoalsTable.userId, userId));
  await db.delete(profilesTable).where(eq(profilesTable.userId, userId));
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌', err.message);
  process.exit(1);
});
