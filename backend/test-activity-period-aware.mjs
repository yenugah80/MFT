/**
 * Verifies Fix 1 from the Day/Week/Month period-awareness plan:
 * activityAnalyticsService.getWeekData/getDashboardAnalytics used to
 * hardcode a 7-day window with no parameter — the Activity tab's
 * Day/Week/Month toggle changed nothing. Confirms the new `days` param
 * actually changes what's returned, using real Postgres rather than a
 * mocked db.execute() chain.
 *
 * Run against local dev DB:
 *   DATABASE_URL=postgresql://$(whoami)@localhost:5432/mft_dev DB_SSL=false \
 *     node test-activity-period-aware.mjs
 */
import { db } from './src/db/index.js';
import { profilesTable, activityLogTable } from './src/db/schema.js';
import activityAnalyticsService from './src/services/activityAnalyticsService.js';
import { eq } from 'drizzle-orm';

const TEST_USER_ID = `test_activity_period_${Date.now()}`;
const now = Date.now();
const daysAgo = (n) => new Date(now - n * 24 * 60 * 60 * 1000);

let failures = 0;
function check(cond, label) {
  if (!cond) { failures++; console.error(`FAIL: ${label}`); }
  else console.log(`OK:   ${label}`);
}

async function seed() {
  await db.insert(profilesTable).values({ userId: TEST_USER_ID, fullName: 'Activity Period Test' });

  // 3 days ago: inside a 7-day window.
  await db.insert(activityLogTable).values({
    userId: TEST_USER_ID, durationMinutes: 30, loggedAt: daysAgo(3),
  });
  // 20 days ago: inside a 30-day window, outside a 7-day window.
  await db.insert(activityLogTable).values({
    userId: TEST_USER_ID, durationMinutes: 45, loggedAt: daysAgo(20),
  });
}

async function cleanup() {
  await db.delete(activityLogTable).where(eq(activityLogTable.userId, TEST_USER_ID));
  await db.delete(profilesTable).where(eq(profilesTable.userId, TEST_USER_ID));
}

async function run() {
  await seed();

  const weekData = await activityAnalyticsService.getWeekData(TEST_USER_ID, 7);
  const monthData = await activityAnalyticsService.getWeekData(TEST_USER_ID, 30);

  check(weekData.length === 7, `getWeekData(userId, 7) returns 7 days (got ${weekData.length})`);
  check(monthData.length === 30, `getWeekData(userId, 30) returns 30 days (got ${monthData.length})`);

  const weekTotal = weekData.reduce((s, d) => s + d.minutes, 0);
  const monthTotal = monthData.reduce((s, d) => s + d.minutes, 0);
  check(weekTotal === 30, `7-day total excludes the 20-day-old log (got ${weekTotal}, expected 30)`);
  check(monthTotal === 75, `30-day total includes both logs (got ${monthTotal}, expected 75)`);
  check(weekTotal !== monthTotal, 'week and month totals actually differ (period toggle is wired through)');

  const dashboardWeek = await activityAnalyticsService.getDashboardAnalytics(TEST_USER_ID, 7);
  const dashboardMonth = await activityAnalyticsService.getDashboardAnalytics(TEST_USER_ID, 30);
  check(dashboardWeek.weekData.length === 7, 'getDashboardAnalytics(userId, 7) threads days through to weekData');
  check(dashboardMonth.weekData.length === 30, 'getDashboardAnalytics(userId, 30) threads days through to weekData');

  await cleanup();

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll activity period-awareness checks passed.');
  process.exit(0);
}

run().catch(async (err) => {
  console.error('Test threw:', err);
  await cleanup().catch(() => {});
  process.exit(1);
});
