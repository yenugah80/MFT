/**
 * Live re-verification of the Dashboard's "Today's Nutrition" card wiring
 * (task #24) — invokes the real registered /nutrition/dashboard route
 * handler directly (router.stack, bypassing HTTP/auth middleware, same
 * pattern as debug-invoke-route-handler.mjs), then cross-checks the
 * `today` object it returns against actual food_log rows queried straight
 * from the DB for the same user/day. Confirms the card's numbers are
 * genuinely wired to real data, not just that the route doesn't crash.
 */
import nutritionRouter from './src/routes/nutrition.js';
import { db } from './src/db/index.js';
import { foodLogTable } from './src/db/schema.js';
import { eq, and, gte, lte } from 'drizzle-orm';
import { getLocalDayRange } from './src/utils/timezone.js';

const userId = 'user_3HgUj90Az5gLi0FTw95ADqHijw2';
const offsetMinutes = 0; // UTC, matches the demo account's usual test offset

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

async function main() {
  const layer = nutritionRouter.stack.find(
    (l) => l.route && l.route.path === '/dashboard' && l.route.methods.get
  );
  if (!layer) throw new Error('Could not find GET /dashboard route in nutritionRouter.stack');

  const handler = layer.route.stack[layer.route.stack.length - 1].handle;

  let responseBody = null;
  const req = {
    auth: () => ({ userId }),
    query: {},
    headers: { 'x-timezone-offset': String(offsetMinutes) },
  };
  const res = {
    json(body) { responseBody = body; },
    status(code) { console.log(`res.status(${code}) called`); return this; },
  };

  await handler(req, res);
  if (!responseBody) throw new Error('Route handler never called res.json — check res.status() output above for the real error');

  const { today } = responseBody;
  assert(!!today, 'response includes a `today` object');
  console.log('\n[Route response] today.nutrition:', JSON.stringify(today.nutrition));
  console.log('[Route response] today.foodLogs count:', today.foodLogs?.length ?? 'undefined');

  // Cross-check against the DB directly, independent of any app logic.
  const { start, end } = getLocalDayRange(offsetMinutes, new Date());
  const realRows = await db
    .selectDistinctOn([foodLogTable.clientEventId])
    .from(foodLogTable)
    .where(and(
      eq(foodLogTable.userId, userId),
      gte(foodLogTable.loggedDate, start),
      lte(foodLogTable.loggedDate, end)
    ))
    .orderBy(foodLogTable.clientEventId);

  const realTotalCalories = realRows.reduce((sum, r) => sum + (parseFloat(r.calories) || 0), 0);
  console.log(`\n[Direct DB query] ${realRows.length} food_log rows for today, total calories: ${realTotalCalories}`);

  assert(
    (today.foodLogs?.length ?? -1) === realRows.length,
    `route's today.foodLogs count (${today.foodLogs?.length}) matches direct DB count (${realRows.length})`
  );

  const routeTotalCalories = parseFloat(today.nutrition?.totalCalories) || 0;
  const caloriesMatch = Math.abs(routeTotalCalories - realTotalCalories) < 1;
  assert(caloriesMatch, `route's today.nutrition.totalCalories (${routeTotalCalories}) matches direct DB total (${realTotalCalories})`);

  console.log('\n✅ Dashboard "Today\'s Nutrition" card is genuinely wired to real, current data — verified live, not just by reading the code');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌', err.message);
  process.exit(1);
});
