/**
 * Verifies the new gamification_audit_log table actually captures streak
 * changes made through updateStreak() — the exact mechanism that would have
 * made tonight's two production streak incidents a five-second lookup
 * instead of a live investigation. Uses a disposable synthetic user against
 * LOCAL DEV POSTGRES ONLY.
 */
import { db } from './src/db/index.js';
import { profilesTable, gamificationTable, gamificationAuditLogTable } from './src/db/schema.js';
import { eq } from 'drizzle-orm';
import { updateStreak } from './src/services/gamificationRewardService.js';

const userId = `test_audit_log_${Date.now()}`;

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

async function main() {
  await db.insert(profilesTable).values({ userId });

  // First log ever — inserts a fresh gamification row (streak: 1), not
  // instrumented (see comment in gamificationRewardService.js — low value,
  // benign INSERT of a fresh row).
  await updateStreak(userId, new Date(), db, 0);

  // Second day — this UPDATE path IS instrumented.
  const day2 = new Date();
  day2.setUTCDate(day2.getUTCDate() + 1);
  await updateStreak(userId, day2, db, 0);

  // Give the fire-and-forget insert a moment to land.
  await new Promise((r) => setTimeout(r, 500));

  const logs = await db.select().from(gamificationAuditLogTable).where(eq(gamificationAuditLogTable.userId, userId));
  console.log('audit log rows:', JSON.stringify(logs, null, 2));

  assert(logs.length === 1, 'exactly one audit row exists (only the instrumented UPDATE path, not the initial INSERT)');
  assert(logs[0].source === 'updateStreak', 'source is recorded');
  assert(logs[0].oldValues.streak === 1, 'old streak value (1) captured correctly');
  assert(logs[0].newValues.streak === 2, 'new streak value (2) captured correctly');
  assert(!!logs[0].callSite, 'call site hint is populated');

  console.log('\n✅ gamification_audit_log genuinely captures real streak changes with before/after values');

  await db.delete(gamificationAuditLogTable).where(eq(gamificationAuditLogTable.userId, userId));
  await db.delete(gamificationTable).where(eq(gamificationTable.userId, userId));
  await db.delete(profilesTable).where(eq(profilesTable.userId, userId));
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌', err);
  process.exit(1);
});
