/**
 * Regression check for the streak-corruption bug: invokes the real
 * /nutrition/dashboard route handler directly (same pattern as
 * debug-invoke-route-handler.mjs) against the real demo account, then
 * confirms gamification.streak in the DB is UNCHANGED afterward — the
 * route must never write to it, no matter what it recomputes internally.
 */
import nutritionRouter from './src/routes/nutrition.js';
import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

const userId = 'user_3HgUj90Az5gLi0FTw95ADqHijw2';

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

async function getStoredStreak() {
  const result = await db.execute(sql`SELECT streak FROM gamification WHERE user_id = ${userId}`);
  return result[0]?.streak;
}

async function main() {
  const before = await getStoredStreak();
  console.log('gamification.streak before route call:', before);
  assert(before === 37, 'streak is 37 before the route call (restored value, sanity check)');

  const layer = nutritionRouter.stack.find(
    (l) => l.route && l.route.path === '/dashboard' && l.route.methods.get
  );
  const handler = layer.route.stack[layer.route.stack.length - 1].handle;

  let responseBody = null;
  const req = {
    auth: () => ({ userId }),
    query: {},
    headers: { 'x-timezone-offset': '0' },
  };
  const res = {
    json(body) { responseBody = body; },
    status(code) { return this; },
  };
  await handler(req, res);

  console.log('\nroute response gamification.streak:', responseBody?.gamification?.streak);
  console.log('route response trends.currentStreak:', responseBody?.trends?.currentStreak);
  assert(responseBody?.gamification?.streak === 37, 'response gamification.streak reflects the stored value (37), not a recomputation');
  assert(responseBody?.trends?.currentStreak === 37, 'response trends.currentStreak reflects the stored value (37), not a recomputation');

  // Give any stray fire-and-forget write a moment to land, if one somehow still exists.
  await new Promise((r) => setTimeout(r, 1500));

  const after = await getStoredStreak();
  console.log('\ngamification.streak after route call + 1.5s grace period:', after);
  assert(after === 37, 'streak is STILL 37 after the route call — the route no longer overwrites it');

  console.log('\n✅ /nutrition/dashboard no longer corrupts gamification.streak');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌', err.message);
  process.exit(1);
});
