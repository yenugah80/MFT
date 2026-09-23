/**
 * Regression check for the "Your Progress" period-awareness fix.
 *
 * Guards against the bug class found in analyticsRecommendationService.js's
 * getUserDataStats(): trend numbers (avgCaloriesPerDay, avgDailyMl) and the
 * "does this tab have anything to show" flag (hasDataInPeriod) must actually
 * respond to the Week/Month period argument instead of silently reading a
 * fixed today/all-time window regardless of what was asked for.
 *
 * Run against the local dev database (see mft-no-dev-environment):
 *   DATABASE_URL=postgresql://$(whoami)@localhost:5432/mft_dev DB_SSL=false \
 *     node test-period-aware-stats.mjs
 *
 * Seeds a disposable user, asserts, then deletes everything it created.
 * Not wired into `npm test` — jest.setup.js hardcodes a fake DATABASE_URL for
 * the mocked unit-test suite, so this runs standalone like the sibling
 * test-*.mjs scripts in this directory.
 */

import { db } from './src/db/index.js';
import {
  profilesTable,
  foodLogTable,
  waterLogTable,
  activityLogTable,
} from './src/db/schema.js';
import { eq } from 'drizzle-orm';
import analyticsRecommendationService from './src/services/analyticsRecommendationService.js';

const TEST_USER_ID = `test_period_aware_${Date.now()}`;
const now = Date.now();
const daysAgo = (n) => new Date(now - n * 24 * 60 * 60 * 1000);

let failures = 0;
function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    failures++;
    console.error(`FAIL: ${label} — expected ${expected}, got ${actual}`);
  } else {
    console.log(`OK:   ${label} (${actual})`);
  }
}

async function seed() {
  await db.insert(profilesTable).values({ userId: TEST_USER_ID, fullName: 'Period Test' });

  // 3 days ago: inside both the 7-day and 30-day windows.
  await db.insert(foodLogTable).values({
    userId: TEST_USER_ID, foodName: 'Test meal (recent)', calories: 500, loggedDate: daysAgo(3),
  });
  await db.insert(waterLogTable).values({
    userId: TEST_USER_ID, amountLiters: '1.000', loggedDate: daysAgo(3),
  });
  await db.insert(activityLogTable).values({
    userId: TEST_USER_ID, durationMinutes: 40, loggedAt: daysAgo(3),
  });

  // 20 days ago: inside the 30-day window, outside the 7-day window.
  await db.insert(foodLogTable).values({
    userId: TEST_USER_ID, foodName: 'Test meal (mid-range)', calories: 1000, loggedDate: daysAgo(20),
  });
  await db.insert(waterLogTable).values({
    userId: TEST_USER_ID, amountLiters: '3.000', loggedDate: daysAgo(20),
  });
  await db.insert(activityLogTable).values({
    userId: TEST_USER_ID, durationMinutes: 60, loggedAt: daysAgo(20),
  });

  // 45 days ago: outside both windows — must never leak into either average.
  await db.insert(foodLogTable).values({
    userId: TEST_USER_ID, foodName: 'Test meal (stale)', calories: 9999, loggedDate: daysAgo(45),
  });
  await db.insert(waterLogTable).values({
    userId: TEST_USER_ID, amountLiters: '9.000', loggedDate: daysAgo(45),
  });
  await db.insert(activityLogTable).values({
    userId: TEST_USER_ID, durationMinutes: 999, loggedAt: daysAgo(45),
  });
}

async function cleanup() {
  await db.delete(activityLogTable).where(eq(activityLogTable.userId, TEST_USER_ID));
  await db.delete(waterLogTable).where(eq(waterLogTable.userId, TEST_USER_ID));
  await db.delete(foodLogTable).where(eq(foodLogTable.userId, TEST_USER_ID));
  await db.delete(profilesTable).where(eq(profilesTable.userId, TEST_USER_ID));
}

async function run() {
  await seed();

  const weekStats = await analyticsRecommendationService.getUserDataStats(TEST_USER_ID, 7);
  const monthStats = await analyticsRecommendationService.getUserDataStats(TEST_USER_ID, 30);

  // Week: only the 3-days-ago rows are in scope (500 cal / 1L / 40 min).
  assertEqual(weekStats.food.avgCaloriesPerDay, 500, 'week avgCaloriesPerDay excludes the 20-day-old and 45-day-old meals');
  assertEqual(weekStats.water.avgDailyMl, 1000, 'week avgDailyMl excludes older logs');
  assertEqual(weekStats.activity.periodMinutes, 40, 'week periodMinutes excludes older workouts');
  assertEqual(weekStats.food.hasDataInPeriod, true, 'week hasDataInPeriod (food) is true when in-window rows exist');

  // Month: the 3-days-ago and 20-days-ago rows are both in scope, the
  // 45-day-old row must not be — this is the exact bug class being guarded:
  // an unfiltered "all-time" read would pull in the 45-day row and inflate
  // these averages, or a copy-pasted 7-day window would silently match the
  // week numbers instead of actually reflecting Month.
  assertEqual(monthStats.food.avgCaloriesPerDay, 750, 'month avgCaloriesPerDay = (500+1000)/2, 45-day-old row excluded');
  assertEqual(monthStats.water.avgDailyMl, 2000, 'month avgDailyMl = (1000+3000)/2, 45-day-old row excluded');
  assertEqual(monthStats.activity.periodMinutes, 100, 'month periodMinutes = 40+60, 45-day-old workout excluded');
  assertEqual(monthStats.activity.hasDataInPeriod, true, 'month hasDataInPeriod (activity) is true');

  // The two periods must actually differ — this is what "Week vs Month is
  // cosmetic" looked like before the fix (both would equal the all-time avg).
  if (weekStats.food.avgCaloriesPerDay === monthStats.food.avgCaloriesPerDay) {
    failures++;
    console.error('FAIL: week and month avgCaloriesPerDay are identical — period toggle is not wired through');
  } else {
    console.log('OK:   week and month avgCaloriesPerDay differ as expected');
  }

  await cleanup();

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll period-awareness checks passed.');
  process.exit(0);
}

run().catch(async (err) => {
  console.error('Test run threw:', err);
  await cleanup().catch(() => {});
  process.exit(1);
});
