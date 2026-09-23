import { invalidateCFCache } from './src/services/collaborativeFilteringService.js';
import { getHydrationSignal, invalidateSignalCache } from './src/services/hydrationSignalService.js';
import { ensureRedisReady } from './src/config/redisClient.js';

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

async function main() {
  const redis = await ensureRedisReady();
  const testUserId = `test_real_fns_${Date.now()}`;

  console.log('[1] invalidateCFCache() on a nonexistent key does not throw');
  await invalidateCFCache(testUserId);
  console.log('  ✓ ran without throwing');

  console.log('\n[2] getHydrationSignal() actually populates the Redis cache');
  const signal = await getHydrationSignal(testUserId, 0);
  assert(signal !== null && signal !== undefined, 'getHydrationSignal returned a signal object');
  const cached = await redis.get(`signal:${testUserId}:0`);
  assert(cached !== null, 'getHydrationSignal wrote through to the real Redis key');
  assert(JSON.parse(cached).userId === testUserId || JSON.parse(cached).goalLiters !== undefined, 'cached value looks like a real signal object');

  console.log('\n[3] invalidateSignalCache() actually clears it');
  await invalidateSignalCache(testUserId);
  const afterInvalidate = await redis.get(`signal:${testUserId}:0`);
  assert(afterInvalidate === null, 'signal key is gone after invalidateSignalCache()');

  console.log('\n✅ Real exported functions verified end-to-end against production Redis');
  await redis.quit();
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
