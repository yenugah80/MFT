/**
 * Verifies the sleep.js fix: updateStreak() must credit wakeTimeDate (the
 * night the sleep is FOR), not new Date() (the moment it's submitted).
 * Uses a disposable synthetic user against LOCAL DEV POSTGRES ONLY — after
 * two accidental production streak incidents tonight from testing this
 * exact code path against the real demo account, this verification must
 * not touch production again.
 *
 * Scenario: log a sleep entry for "3 days ago" right now. With the bug,
 * updateStreak(new Date()) would set last_log_date to TODAY. With the fix,
 * it must set last_log_date to 3 days ago — i.e., logging a backdated
 * entry does NOT silently claim today's streak day.
 */
import sleepRouter from './src/routes/sleep.js';
import { db } from './src/db/index.js';
import { profilesTable, gamificationTable } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

const userId = `test_sleep_streak_date_${Date.now()}`;

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

function daysAgo(n, hour, minute) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  await db.insert(profilesTable).values({ userId });

  const layer = sleepRouter.stack.find((l) => l.route && l.route.path === '/log' && l.route.methods.post);
  const handler = layer.route.stack[layer.route.stack.length - 1].handle;

  const bedTime = daysAgo(4, 23, 0);
  const wakeTime = daysAgo(3, 7, 0);

  let responseBody = null;
  const req = {
    auth: () => ({ userId }),
    headers: { 'x-timezone-offset': '0' },
    body: {
      bedTime: bedTime.toISOString(),
      wakeTime: wakeTime.toISOString(),
      quality: 7,
      tags: {},
    },
  };
  const res = {
    json(b) { responseBody = b; },
    status(c) { return this; },
  };

  await handler(req, res);
  console.log('Sleep log response:', responseBody?.message);

  const [gam] = await db.select().from(gamificationTable).where(eq(gamificationTable.userId, userId)).limit(1);
  console.log('gamification.last_log_date:', gam?.lastLogDate);
  console.log('expected (wakeTime, day-truncated):', wakeTime.toISOString().slice(0, 10));

  const today = new Date().toISOString().slice(0, 10);
  const lastLogDateStr = new Date(gam.lastLogDate).toISOString().slice(0, 10);
  const wakeTimeDateStr = wakeTime.toISOString().slice(0, 10);

  assert(lastLogDateStr !== today, 'last_log_date is NOT today (the bug would have set it to today)');
  assert(lastLogDateStr === wakeTimeDateStr, `last_log_date (${lastLogDateStr}) matches the sleep entry's wake date (${wakeTimeDateStr}), not the submission moment`);

  console.log('\n✅ sleep.js now credits the streak to the night the sleep is FOR, not the moment it was logged');

  await db.delete(gamificationTable).where(eq(gamificationTable.userId, userId));
  await db.delete(profilesTable).where(eq(profilesTable.userId, userId));
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌', err.message);
  process.exit(1);
});
