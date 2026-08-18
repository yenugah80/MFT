/**
 * Production has zero users with any accepted recommendations_history
 * rows — collaborative filtering's core query logic has apparently never
 * been exercised with real data. Seeds two synthetic users with
 * deliberately overlapping accepted foods in the LOCAL DEV DB (never
 * production for a write test like this) to verify the underlying
 * Jaccard-similarity logic actually produces sensible candidates.
 */
import { db } from './src/db/index.js';
import { profilesTable, recommendationsHistoryTable } from './src/db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import { getCollaborativeCandidates } from './src/services/collaborativeFilteringService.js';

const ts = Date.now();
const USER_A = `test_cf_a_${ts}`;
const USER_B = `test_cf_b_${ts}`;

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

async function acceptFood(userId, foodName, nutrition) {
  await db.insert(recommendationsHistoryTable).values({
    userId,
    recommendationId: `${userId}:${foodName.replace(/\s+/g, '_')}`,
    foodName,
    calories: nutrition.calories,
    protein: nutrition.protein,
    carbs: nutrition.carbs,
    fats: nutrition.fats,
    recommendationType: 'TEST_SEED',
    interactionStatus: 'accepted',
  });
}

async function main() {
  console.log(`Seeding two synthetic users: ${USER_A}, ${USER_B}`);
  await db.insert(profilesTable).values([{ userId: USER_A }, { userId: USER_B }]);

  // User B (the "neighbor") accepted 4 foods. User A shares 3 of them
  // (clears MIN_OVERLAP=3) and has NOT tried "Quinoa Bowl" — that should
  // surface as a CF candidate for User A.
  await acceptFood(USER_B, 'Grilled Chicken', { calories: 300, protein: 40, carbs: 5, fats: 8 });
  await acceptFood(USER_B, 'Greek Yogurt', { calories: 150, protein: 15, carbs: 10, fats: 5 });
  await acceptFood(USER_B, 'Brown Rice', { calories: 220, protein: 5, carbs: 45, fats: 2 });
  await acceptFood(USER_B, 'Quinoa Bowl', { calories: 280, protein: 12, carbs: 40, fats: 6 });

  await acceptFood(USER_A, 'Grilled Chicken', { calories: 300, protein: 40, carbs: 5, fats: 8 });
  await acceptFood(USER_A, 'Greek Yogurt', { calories: 150, protein: 15, carbs: 10, fats: 5 });
  await acceptFood(USER_A, 'Brown Rice', { calories: 220, protein: 5, carbs: 45, fats: 2 });

  try {
    const currentUserAccepted = ['Grilled Chicken', 'Greek Yogurt', 'Brown Rice'];
    const candidates = await getCollaborativeCandidates(USER_A, currentUserAccepted, { limit: 8 });

    console.log(`\nReturned ${candidates.length} candidates:`);
    candidates.forEach((c) => console.log(`  - ${c.name} (score=${c.score}, source=${c.source}, calories=${c.nutrition.calories})`));

    assert(candidates.length > 0, 'returns at least one candidate');
    const quinoa = candidates.find((c) => c.name.toLowerCase().includes('quinoa'));
    assert(!!quinoa, 'Quinoa Bowl (the food the overlapping neighbor accepted but User A has not tried) is surfaced');
    assert(quinoa.source === 'collaborative_filter', 'candidate is correctly tagged as collaborative_filter');
    assert(quinoa.nutrition.calories === 280, 'nutrition data correctly comes from the neighbor\'s actual logged values');
    assert(!candidates.some((c) => c.name === 'Grilled Chicken'), 'foods User A already accepted are correctly excluded');

    console.log('\n✅ Collaborative filtering core logic is genuinely correct, not just the caching around it');
  } finally {
    console.log('\nCleaning up synthetic users');
    await db.delete(recommendationsHistoryTable).where(inArray(recommendationsHistoryTable.userId, [USER_A, USER_B]));
    await db.delete(profilesTable).where(inArray(profilesTable.userId, [USER_A, USER_B]));
  }
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
