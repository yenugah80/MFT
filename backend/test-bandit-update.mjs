/**
 * Integration check for thompsonSamplingService.updateArm() — the DB-backed
 * half of the bandit (the pure math is covered by
 * __tests__/thompsonSamplingMath.test.js). Verifies the actual Bayesian
 * posterior update writes the correct alpha/beta/trials/successes to
 * recommendation_arms, using real Postgres rather than a mocked drizzle
 * chain (mocking 3+ chained calls faithfully is more fragile than just
 * hitting local dev Postgres, per this session's established pattern).
 *
 * Run against local dev DB:
 *   DATABASE_URL=postgresql://$(whoami)@localhost:5432/mft_dev DB_SSL=false \
 *     node test-bandit-update.mjs
 */
import { db } from './src/db/index.js';
import { profilesTable, recommendationArmsTable } from './src/db/schema.js';
import { updateArm } from './src/services/thompsonSamplingService.js';
import { eq, and } from 'drizzle-orm';

const TEST_USER_ID = `test_bandit_${Date.now()}`;
const ARM_KEY = 'PROTEIN_BOOST:lunch:afternoon';
let failures = 0;
function check(cond, label) {
  if (!cond) { failures++; console.error(`FAIL: ${label}`); }
  else console.log(`OK:   ${label}`);
}

async function getArm() {
  const [row] = await db
    .select()
    .from(recommendationArmsTable)
    .where(and(eq(recommendationArmsTable.userId, TEST_USER_ID), eq(recommendationArmsTable.armKey, ARM_KEY)));
  return row;
}

async function cleanup() {
  await db.delete(recommendationArmsTable).where(eq(recommendationArmsTable.userId, TEST_USER_ID));
  await db.delete(profilesTable).where(eq(profilesTable.userId, TEST_USER_ID));
}

async function run() {
  await db.insert(profilesTable).values({ userId: TEST_USER_ID, fullName: 'Bandit Test' });

  // First update: arm doesn't exist yet -> initializes at DEFAULT_ALPHA=1, DEFAULT_BETA=1, then updates.
  await updateArm(TEST_USER_ID, ARM_KEY, true, { foodName: 'Chicken Salad' });
  let arm = await getArm();
  check(!!arm, 'arm row was created on first update');
  check(Number(arm.alpha) === 2 && Number(arm.beta) === 1, `first accept: alpha=2, beta=1 (got alpha=${arm.alpha}, beta=${arm.beta})`);
  check(arm.trials === 1 && arm.successes === 1, `trials=1, successes=1 (got trials=${arm.trials}, successes=${arm.successes})`);

  // Second update, a rejection: alpha stays, beta increments.
  await updateArm(TEST_USER_ID, ARM_KEY, false, { foodName: 'Chicken Salad' });
  arm = await getArm();
  check(Number(arm.alpha) === 2 && Number(arm.beta) === 2, `after reject: alpha=2, beta=2 (got alpha=${arm.alpha}, beta=${arm.beta})`);
  check(arm.trials === 2 && arm.successes === 1, `trials=2, successes=1 (got trials=${arm.trials}, successes=${arm.successes})`);

  // Third update, another accept: alpha increments again.
  await updateArm(TEST_USER_ID, ARM_KEY, true, {});
  arm = await getArm();
  check(Number(arm.alpha) === 3 && Number(arm.beta) === 2, `after second accept: alpha=3, beta=2 (got alpha=${arm.alpha}, beta=${arm.beta})`);
  check(arm.trials === 3 && arm.successes === 2, `trials=3, successes=2 (got trials=${arm.trials}, successes=${arm.successes})`);
  check(arm.metadata?.lastOutcome === 'accept', 'metadata.lastOutcome tracks the most recent interaction');

  await cleanup();

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll bandit update checks passed.');
  process.exit(0);
}

run().catch(async (err) => {
  console.error('Test threw:', err);
  await cleanup().catch(() => {});
  process.exit(1);
});
