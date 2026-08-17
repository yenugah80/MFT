/**
 * Verifies the /log/meal quick-log fix: the 404'd /log/food endpoint is gone
 * client-side, and successful smart-recommendation quick-logs now backfill a
 * recommendations_history row so collaborative filtering isn't blind to them.
 * Direct controller invocation (mock req/res) — no HTTP/auth layer needed.
 *
 * Run against local dev DB:
 *   DATABASE_URL=postgresql://$(whoami)@localhost:5432/mft_dev DB_SSL=false \
 *     node test-quicklog-fix.mjs
 */
import { db } from './src/db/index.js';
import { profilesTable, foodLogTable, recommendationsHistoryTable } from './src/db/schema.js';
import { logMeal } from './src/controllers/loggingController.js';
import { eq } from 'drizzle-orm';

const TEST_USER_ID = `test_quicklog_${Date.now()}`;
let failures = 0;
function check(cond, label) {
  if (!cond) { failures++; console.error(`FAIL: ${label}`); }
  else console.log(`OK:   ${label}`);
}

async function cleanup() {
  await db.delete(recommendationsHistoryTable).where(eq(recommendationsHistoryTable.userId, TEST_USER_ID));
  await db.delete(foodLogTable).where(eq(foodLogTable.userId, TEST_USER_ID));
  await db.delete(profilesTable).where(eq(profilesTable.userId, TEST_USER_ID));
}

async function run() {
  await db.insert(profilesTable).values({ userId: TEST_USER_ID, fullName: 'Quicklog Test' });

  // Mirrors exactly what the fixed mobile client now sends.
  const req = {
    auth: () => ({ userId: TEST_USER_ID }),
    db,
    body: {
      foodName: 'Greek Yogurt Bowl',
      calories: 220,
      protein: 18,
      carbs: 20,
      fats: 6,
      fiber: 3,
      mealType: 'snack',
      servingSize: '1 serving',
      sourceMeta: { source: 'smart_recommendation', recommendationId: 'greek-yogurt-bowl' },
    },
  };

  let statusCode, jsonBody;
  const res = {
    status(code) { statusCode = code; return this; },
    json(body) { jsonBody = body; return this; },
  };

  await logMeal(req, res);

  check(statusCode === 201, `logMeal responded 201 (got ${statusCode})`);
  check(jsonBody && jsonBody.id, 'response is the inserted row directly (has .id)');
  check(jsonBody?.foodName === 'Greek Yogurt Bowl', 'foodName persisted correctly');
  check(jsonBody?.fats === 6, 'fats persisted correctly (previously dropped as `fat`)');

  // Give the fire-and-forget history backfill a moment to complete.
  await new Promise((r) => setTimeout(r, 300));

  const [foodRow] = await db.select().from(foodLogTable).where(eq(foodLogTable.userId, TEST_USER_ID));
  check(!!foodRow, 'food_log row exists');

  const [historyRow] = await db.select().from(recommendationsHistoryTable).where(eq(recommendationsHistoryTable.userId, TEST_USER_ID));
  check(!!historyRow, 'recommendations_history backfill row was created');
  check(historyRow?.interactionStatus === 'accepted', 'backfill row marked accepted');
  check(historyRow?.recommendationType === 'SMART_PICK', 'backfill row uses SMART_PICK type (not a real bandit arm)');
  check(historyRow?.wasLogged === true && historyRow?.loggedFoodId === foodRow?.id, 'backfill row correctly links to the food_log row');

  await cleanup();

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll quick-log fix checks passed.');
  process.exit(0);
}

run().catch(async (err) => {
  console.error('Test threw:', err);
  await cleanup().catch(() => {});
  process.exit(1);
});
