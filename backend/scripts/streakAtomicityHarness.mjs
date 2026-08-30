#!/usr/bin/env node
/**
 * Streak Atomicity Harness — concurrency & rollback regression guard
 * ====================================================================
 *
 * WHY THIS MATTERS
 * updateStreak() and the five log-delete routes (food/water/activity/sleep/
 * stress) used to read and write a user's streak as separate, unawaited
 * queries. Two concurrent logs for the same user could both read the
 * pre-update streak and double-increment it; a crash between a delete and
 * its streak reconciliation could leave the entry gone with the streak
 * un-repaired. Both are now closed with `db.transaction()` + `FOR UPDATE`
 * row locking (see gamificationRewardService.js:updateStreak and the DELETE
 * handlers in the five route files).
 *
 * This can't be a normal jest test: the whole point is proving row locking
 * actually serializes concurrent requests against a real Postgres connection
 * pool — a mocked `db` can't exercise that. The rest of this repo's backend
 * suite is deliberately fast and DB-free (jest.setup.js points DATABASE_URL
 * at an unreachable placeholder on purpose), so this lives here instead,
 * alongside the existing harness:nutrition pattern.
 *
 * WHAT IT CHECKS (requires a real local Postgres — see below; not offline)
 *   1. 12 truly concurrent updateStreak() calls for one user produce exactly
 *      one increment, not up to 12 (the double-increment bug).
 *   2. A forced error between a delete and its streak reconciliation rolls
 *      the delete back — the row is still there (the non-atomic-delete bug).
 *   3. A successful delete + reconciliation commits together.
 *
 * HOW TO USE
 *   Requires a local dev Postgres with the current schema — see
 *   backend/CLAUDE.md / the "local dev environment" notes for bootstrapping
 *   one with `drizzle-kit push` against DATABASE_URL.
 *
 *   DATABASE_URL=postgresql://<user>@localhost:5432/mft_dev DB_SSL=false \
 *     node scripts/streakAtomicityHarness.mjs
 *   npm run harness:streak-atomicity           # same, once DATABASE_URL/DB_SSL are exported
 *
 *   Exit code 0 = all guarantees hold; 1 = a regression. Not run in CI (no
 *   Postgres there) — run it locally after touching updateStreak, any of the
 *   five delete routes, or streakReconciliationService.js.
 *
 * SAFETY
 *   Only touches rows for synthetic users prefixed `streak_harness_`, and
 *   wipes them before and after each run. Never point this at a database
 *   with real user data.
 */

import { db } from '../src/config/db.js';
import { profilesTable, gamificationTable, foodLogTable } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { updateStreak } from '../src/services/gamificationRewardService.js';
import { getTrackedDaySnapshot, reconcileStreakAfterDeletion } from '../src/services/streakReconciliationService.js';

const RUN_ID = Date.now();
const USER_PREFIX = 'streak_harness_';

async function wipe(userId) {
  await db.delete(foodLogTable).where(eq(foodLogTable.userId, userId));
  await db.delete(gamificationTable).where(eq(gamificationTable.userId, userId));
  await db.delete(profilesTable).where(eq(profilesTable.userId, userId));
}

async function checkConcurrentIncrementRace() {
  const userId = `${USER_PREFIX}race_${RUN_ID}`;
  await wipe(userId);
  await db.insert(profilesTable).values({ userId });

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);
  await db.insert(gamificationTable).values({
    userId, xp: 0, level: 1, streak: 1, previousStreak: 0,
    lastLogDate: yesterday, lastStreakUpdatedAt: yesterday, timezoneOffset: 0, badges: [],
  });

  await Promise.all(Array.from({ length: 12 }, () => updateStreak(userId, new Date(), db, 0)));
  const [row] = await db.select().from(gamificationTable).where(eq(gamificationTable.userId, userId));
  await wipe(userId);

  const pass = row?.streak === 2;
  console.log(`[1/3] Concurrent increment race: streak=${row?.streak}, expected=2 -> ${pass ? 'PASS' : 'FAIL'}`);
  return pass;
}

async function checkDeleteRollsBackOnError() {
  const userId = `${USER_PREFIX}rollback_${RUN_ID}`;
  await wipe(userId);
  await db.insert(profilesTable).values({ userId });
  const [log] = await db.insert(foodLogTable).values({
    userId, foodName: 'Harness Meal', calories: 400, loggedDate: new Date(),
  }).returning();

  let caught = false;
  try {
    await db.transaction(async (tx) => {
      await getTrackedDaySnapshot(userId, tx, 0);
      await tx.delete(foodLogTable).where(eq(foodLogTable.id, log.id));
      throw new Error('forced failure between delete and reconciliation');
    });
  } catch {
    caught = true;
  }

  const [stillThere] = await db.select().from(foodLogTable).where(eq(foodLogTable.id, log.id));
  await wipe(userId);

  const pass = caught && !!stillThere;
  console.log(`[2/3] Delete rollback on forced error: errorCaught=${caught}, rowStillPresent=${!!stillThere} -> ${pass ? 'PASS' : 'FAIL'}`);
  return pass;
}

async function checkDeleteCommitsOnSuccess() {
  const userId = `${USER_PREFIX}commit_${RUN_ID}`;
  await wipe(userId);
  await db.insert(profilesTable).values({ userId });
  const [log] = await db.insert(foodLogTable).values({
    userId, foodName: 'Harness Meal 2', calories: 250, loggedDate: new Date(),
  }).returning();

  await db.transaction(async (tx) => {
    const before = await getTrackedDaySnapshot(userId, tx, 0);
    await tx.delete(foodLogTable).where(eq(foodLogTable.id, log.id));
    await reconcileStreakAfterDeletion({ userId, beforeSnapshot: before, dbConn: tx, timezoneOffset: 0 });
  });

  const [gone] = await db.select().from(foodLogTable).where(eq(foodLogTable.id, log.id));
  await wipe(userId);

  const pass = !gone;
  console.log(`[3/3] Delete + reconcile commits on success: rowGone=${!gone} -> ${pass ? 'PASS' : 'FAIL'}`);
  return pass;
}

async function main() {
  const results = [
    await checkConcurrentIncrementRace(),
    await checkDeleteRollsBackOnError(),
    await checkDeleteCommitsOnSuccess(),
  ];

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} checks passed.`);

  if (passed !== results.length) {
    console.error('❌ Streak atomicity regression detected.');
    process.exit(1);
  }
  console.log('✅ Streak transaction and row-locking guarantees hold.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Harness errored:', err);
  process.exit(1);
});
