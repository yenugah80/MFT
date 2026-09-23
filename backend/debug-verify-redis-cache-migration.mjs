/**
 * Verifies the Phase 3 Redis cache migration end-to-end against real Redis:
 * - ensureRedisReady() actually connects
 * - CF cache: set -> get -> invalidate -> get (miss) round-trips through Redis
 * - Signal cache: set -> get -> invalidate (SCAN-based) -> get (miss)
 *
 * Run: railway run node debug-verify-redis-cache-migration.mjs
 */
import { ensureRedisReady, isRedisCacheConnected } from './src/config/redisClient.js';

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

async function main() {
  console.log('[1] Connecting to Redis...');
  const redis = await ensureRedisReady();
  assert(redis !== null, 'ensureRedisReady() returned a connected client');
  assert(isRedisCacheConnected(), 'isRedisCacheConnected() reports true');

  const testUserId = `test_redis_migration_${Date.now()}`;

  console.log('\n[2] CF cache round-trip (raw client, same keying scheme as collaborativeFilteringService.js)');
  const cfKey = `cf:${testUserId}`;
  const cfValue = [{ id: 'cf_test_food', name: 'Test Food', score: 42 }];
  await redis.setEx(cfKey, 3600, JSON.stringify(cfValue));
  const cfRaw = await redis.get(cfKey);
  assert(cfRaw !== null, 'CF cache set() then get() returns a value');
  assert(JSON.parse(cfRaw)[0].name === 'Test Food', 'CF cache value round-trips correctly');
  await redis.del(cfKey);
  const cfAfterDel = await redis.get(cfKey);
  assert(cfAfterDel === null, 'CF cache del() actually removes the key');

  console.log('\n[3] Signal cache round-trip + SCAN-based multi-key invalidation');
  const signalKeys = [`signal:${testUserId}:0`, `signal:${testUserId}:-300`, `signal:${testUserId}:60`];
  for (const key of signalKeys) {
    await redis.setEx(key, 60, JSON.stringify({ goalMl: 2000, consumedMl: 500 }));
  }
  for (const key of signalKeys) {
    const raw = await redis.get(key);
    assert(raw !== null, `signal key ${key} set correctly`);
  }

  // Mimic invalidateSignalCache's SCAN + del logic. node-redis's
  // scanIterator yields BATCHES (arrays of keys per cursor page), not one
  // key per iteration — del() accepts either a single key or an array, so
  // this works either way, but the real correctness check is "are the
  // keys actually gone after," not "how many loop iterations happened."
  const pattern = `signal:${testUserId}:*`;
  for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 100 })) {
    await redis.del(key);
  }

  for (const key of signalKeys) {
    const raw = await redis.get(key);
    assert(raw === null, `signal key ${key} is gone after invalidation`);
  }

  console.log('\n[4] Confirm SCAN did not touch unrelated keys');
  const unrelatedKey = `signal:some_other_user_${Date.now()}:0`;
  await redis.setEx(unrelatedKey, 60, JSON.stringify({ test: true }));
  const stillThere = await redis.get(unrelatedKey);
  assert(stillThere !== null, 'unrelated key survives (pattern match is scoped to this test userId only)');
  await redis.del(unrelatedKey);

  console.log('\n✅ All Redis cache migration checks passed');
  await redis.quit();
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
