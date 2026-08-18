/**
 * Verifies the CF (collaborative filtering) migration didn't just get the
 * caching mechanics right, but that getCollaborativeCandidates still
 * produces real, sensible output — not just an empty array that happens
 * to cache/invalidate correctly.
 */
import { getCollaborativeCandidates, invalidateCFCache } from './src/services/collaborativeFilteringService.js';
import { db } from './src/db/index.js';
import { recommendationsHistoryTable } from './src/db/schema.js';
import { eq, and } from 'drizzle-orm';

const userId = 'user_3HgUj90Az5gLi0FTw95ADqHijw2';

async function main() {
  // Force a fresh (uncached) computation so this actually exercises the
  // real query logic, not a cached candidates array from earlier tonight.
  await invalidateCFCache(userId);

  const accepted = await db
    .select({ foodName: recommendationsHistoryTable.foodName })
    .from(recommendationsHistoryTable)
    .where(and(
      eq(recommendationsHistoryTable.userId, userId),
      eq(recommendationsHistoryTable.interactionStatus, 'accepted')
    ))
    .limit(20);

  console.log(`This user has ${accepted.length} accepted foods in recommendations_history`);

  const acceptedNames = accepted.map((r) => r.foodName).filter(Boolean);
  if (acceptedNames.length === 0) {
    console.log('No accepted foods to seed the CF query with — cannot test candidate generation meaningfully for this user.');
    process.exit(0);
  }

  const t0 = Date.now();
  const candidates = await getCollaborativeCandidates(userId, acceptedNames, { limit: 8 });
  console.log(`\ngetCollaborativeCandidates took ${Date.now() - t0}ms (uncached)`);
  console.log(`Returned ${candidates.length} candidates:`);
  candidates.forEach((c) => console.log(`  - ${c.name} (score=${c.score}, source=${c.source})`));

  // Sanity checks on shape, not just "didn't crash"
  for (const c of candidates) {
    if (!c.id || !c.name || typeof c.score !== 'number' || Number.isNaN(c.score)) {
      console.error(`⚠️  Malformed candidate:`, c);
      process.exit(1);
    }
  }
  console.log('\n✅ All returned candidates have sane shape (id, name, numeric score)');

  // Verify caching now serves this exact result fast
  const t1 = Date.now();
  const cached = await getCollaborativeCandidates(userId, acceptedNames, { limit: 8 });
  console.log(`\nSecond call (cached) took ${Date.now() - t1}ms, returned ${cached.length} candidates`);
  if (JSON.stringify(cached) !== JSON.stringify(candidates)) {
    console.error('⚠️  Cached result differs from the fresh computation!');
    process.exit(1);
  }
  console.log('✅ Cached result matches the fresh computation exactly');

  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
