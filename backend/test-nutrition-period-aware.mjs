/**
 * Verifies Fix 2 from the Day/Week/Month period-awareness plan:
 * /nutrition/dashboard's weekSummaries/weeklyAverages used to be hardcoded
 * to a fixed trailing 7 days regardless of caller input — Nutrition tab's
 * "Weekly Macro Averages" card showed the same numbers under every
 * Day/Week/Month tab. Confirms the new ?days= param actually changes the
 * response, via a real HTTP request against a throwaway Express app (stub
 * auth, real router, real local Postgres) rather than a mocked db chain.
 *
 * Run against local dev DB:
 *   DATABASE_URL=postgresql://$(whoami)@localhost:5432/mft_dev DB_SSL=false \
 *     node test-nutrition-period-aware.mjs
 */
import express from 'express';
import { db } from './src/db/index.js';
import { profilesTable, dailyNutritionSummaryTable } from './src/db/schema.js';
import nutritionRouter from './src/routes/nutrition.js';
import { eq } from 'drizzle-orm';

const TEST_USER_ID = `test_nutrition_period_${Date.now()}`;
const PORT = 5099;
let failures = 0;
function check(cond, label) {
  if (!cond) { failures++; console.error(`FAIL: ${label}`); }
  else console.log(`OK:   ${label}`);
}

function dateStr(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

async function seed() {
  await db.insert(profilesTable).values({ userId: TEST_USER_ID, fullName: 'Nutrition Period Test' });
  // 3 days ago: inside a 7-day window.
  await db.insert(dailyNutritionSummaryTable).values({
    userId: TEST_USER_ID, date: dateStr(3), totalCalories: 2000, totalProtein: 150, totalCarbs: 200, totalFats: 60,
  });
  // 20 days ago: inside a 30-day window, outside a 7-day window.
  await db.insert(dailyNutritionSummaryTable).values({
    userId: TEST_USER_ID, date: dateStr(20), totalCalories: 1000, totalProtein: 50, totalCarbs: 100, totalFats: 30,
  });
}

async function cleanup() {
  await db.delete(dailyNutritionSummaryTable).where(eq(dailyNutritionSummaryTable.userId, TEST_USER_ID));
  await db.delete(profilesTable).where(eq(profilesTable.userId, TEST_USER_ID));
}

async function run() {
  await seed();

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.auth = () => ({ userId: TEST_USER_ID, tokenType: 'session_token' });
    next();
  });
  app.use('/api/nutrition', nutritionRouter);

  const server = await new Promise((resolve) => {
    const s = app.listen(PORT, () => resolve(s));
  });

  try {
    const weekRes = await fetch(`http://localhost:${PORT}/api/nutrition/dashboard?days=7`);
    const weekBody = await weekRes.json();
    const monthRes = await fetch(`http://localhost:${PORT}/api/nutrition/dashboard?days=30`);
    const monthBody = await monthRes.json();

    check(weekRes.status === 200, `?days=7 responded 200 (got ${weekRes.status})`);
    check(monthRes.status === 200, `?days=30 responded 200 (got ${monthRes.status})`);

    check(weekBody.trends.weekSummaries.length === 1, `week window includes only the 3-day-old row (got ${weekBody.trends.weekSummaries.length})`);
    check(monthBody.trends.weekSummaries.length === 2, `month window includes both rows (got ${monthBody.trends.weekSummaries.length})`);

    check(weekBody.trends.weeklyAverages.avgCalories === 2000, `week avgCalories = 2000 (got ${weekBody.trends.weeklyAverages.avgCalories})`);
    check(monthBody.trends.weeklyAverages.avgCalories === 1500, `month avgCalories = (2000+1000)/2 = 1500 (got ${monthBody.trends.weeklyAverages.avgCalories})`);
    check(
      weekBody.trends.weeklyAverages.avgCalories !== monthBody.trends.weeklyAverages.avgCalories,
      'week and month averages actually differ (period toggle is wired through)'
    );

    // Backward compatibility: no ?days= param at all should behave exactly
    // like the old hardcoded-7-days behavior.
    const defaultRes = await fetch(`http://localhost:${PORT}/api/nutrition/dashboard`);
    const defaultBody = await defaultRes.json();
    check(
      defaultBody.trends.weeklyAverages.avgCalories === weekBody.trends.weeklyAverages.avgCalories,
      'omitting ?days= defaults to the same result as ?days=7 (backward compatible)'
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  await cleanup();

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll nutrition period-awareness checks passed.');
  process.exit(0);
}

run().catch(async (err) => {
  console.error('Test threw:', err);
  await cleanup().catch(() => {});
  process.exit(1);
});
