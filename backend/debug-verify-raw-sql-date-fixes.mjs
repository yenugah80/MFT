/**
 * Regression check for the raw-sql``-with-interpolated-Date bug found in
 * achievementService.js (3x), dailyStreakCheck.js's cron job (4x — the
 * daily streak-freeze/reset check, silently no-op'ing for every user with
 * an active streak since this pattern was introduced), and
 * gamificationRoutes.js (2x). A JS Date interpolated into a raw sql``
 * template bypasses Drizzle's column-type serialization and throws when it
 * reaches the postgres-js driver unserialized.
 *
 * Rather than re-implement each call site, this directly proves the fix
 * pattern (gte/lte instead of raw sql``, or .toISOString() for raw
 * db.execute()) against real data in LOCAL DEV POSTGRES ONLY, using the
 * exact same table/column combinations each fixed file now uses.
 */
import { db } from './src/db/index.js';
import { profilesTable, foodLogTable, waterLogTable, moodLogTable, activityLogTable } from './src/db/schema.js';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

const userId = `test_raw_sql_date_${Date.now()}`;

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
  await db.insert(foodLogTable).values({ userId, foodName: 'Test Meal', calories: 400, loggedDate: daysAgo(1) });
  await db.insert(waterLogTable).values({ userId, amountLiters: '0.5', loggedDate: daysAgo(1), clientEventId: crypto.randomUUID() });
  await db.insert(moodLogTable).values({ userId, mood: 'happy', intensity: 7, loggedDate: daysAgo(1) });
  await db.insert(activityLogTable).values({ userId, type: 'running', durationMinutes: 30, intensity: 'moderate', metValue: '8.0', caloriesBurned: 250, loggedAt: daysAgo(1), dayKey: '2000-01-01', timezoneOffset: 0 });

  const yesterdayStart = daysAgo(2);
  const yesterdayEnd = daysAgo(0);

  // Exact pattern now used in achievementService.js / dailyStreakCheck.js / gamificationRoutes.js
  const [food, water, mood, activity] = await Promise.all([
    db.select({ count: sql`count(*)::int` }).from(foodLogTable)
      .where(and(eq(foodLogTable.userId, userId), gte(foodLogTable.loggedDate, yesterdayStart), lte(foodLogTable.loggedDate, yesterdayEnd))),
    db.select({ count: sql`count(*)::int` }).from(waterLogTable)
      .where(and(eq(waterLogTable.userId, userId), gte(waterLogTable.loggedDate, yesterdayStart), lte(waterLogTable.loggedDate, yesterdayEnd))),
    db.select({ count: sql`count(*)::int` }).from(moodLogTable)
      .where(and(eq(moodLogTable.userId, userId), gte(moodLogTable.loggedDate, yesterdayStart), lte(moodLogTable.loggedDate, yesterdayEnd))),
    db.select({ count: sql`count(*)::int` }).from(activityLogTable)
      .where(and(eq(activityLogTable.userId, userId), gte(activityLogTable.loggedAt, yesterdayStart), lte(activityLogTable.loggedAt, yesterdayEnd))),
  ]);

  console.log('food:', food[0].count, '| water:', water[0].count, '| mood:', mood[0].count, '| activity:', activity[0].count);

  assert(food[0].count === 1, 'food_log query with gte/lte Date bounds resolves without throwing and finds the row');
  assert(water[0].count === 1, 'water_log query resolves correctly');
  assert(mood[0].count === 1, 'mood_log query resolves correctly');
  assert(activity[0].count === 1, 'activity_log query resolves correctly');

  // The gamificationRoutes.js raw db.execute() fix (.toISOString())
  const rawResult = await db.execute(sql`
    SELECT DATE(logged_date) as day
    FROM water_log
    WHERE user_id = ${userId} AND logged_date >= ${yesterdayStart.toISOString()}
    GROUP BY DATE(logged_date)
  `);
  assert(rawResult.length === 1, 'raw db.execute() with .toISOString() Date bound resolves without throwing');

  console.log('\n✅ All three raw-sql-Date fixes verified against real data');

  await db.delete(foodLogTable).where(eq(foodLogTable.userId, userId));
  await db.delete(waterLogTable).where(eq(waterLogTable.userId, userId));
  await db.delete(moodLogTable).where(eq(moodLogTable.userId, userId));
  await db.delete(activityLogTable).where(eq(activityLogTable.userId, userId));
  await db.delete(profilesTable).where(eq(profilesTable.userId, userId));
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌', err);
  process.exit(1);
});
