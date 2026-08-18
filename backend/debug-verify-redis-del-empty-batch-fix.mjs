/**
 * Regression check for the invalidateSignalCache Redis bug: node-redis v5's
 * scanIterator() yields an empty array [] for a pattern with zero matches
 * (confirmed directly against real Redis), and the old code called
 * redis.del([]) unconditionally — DEL with zero key arguments, which Redis
 * rejects with "ERR wrong number of arguments". This is the COMMON case
 * (invalidating a user with nothing cached yet), so it fired on nearly
 * every call. Verifies both the empty-match case (no error now) and the
 * real-match case (keys actually get deleted) against real Redis.
 */
import './src/config/env.js';
import { ensureRedisReady } from './src/config/redisClient.js';
import { invalidateSignalCache } from './src/services/hydrationSignalService.js';

const userId = `test_redis_del_fix_${Date.now()}`;

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

async function main() {
  const redis = await ensureRedisReady();
  assert(!!redis, 'Redis is reachable for this test');

  // Case 1: nothing cached for this user — this is the empty-batch case
  // that used to throw "ERR wrong number of arguments".
  let caughtError = null;
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (String(args[0]).includes('Redis invalidate failed')) caughtError = args.join(' ');
    originalWarn(...args);
  };
  await invalidateSignalCache(userId);
  console.warn = originalWarn;
  assert(!caughtError, `no "Redis invalidate failed" warning for a user with nothing cached (was: ${caughtError})`);

  // Case 2: real keys present — must actually get deleted, not just avoid erroring.
  const key1 = `signal:${userId}:0`;
  const key2 = `signal:${userId}:-300`;
  await redis.setEx(key1, 60, JSON.stringify({ fake: true }));
  await redis.setEx(key2, 60, JSON.stringify({ fake: true }));
  assert((await redis.get(key1)) !== null, 'seeded key 1 present before invalidation');
  assert((await redis.get(key2)) !== null, 'seeded key 2 present before invalidation');

  await invalidateSignalCache(userId);

  assert((await redis.get(key1)) === null, 'key 1 actually deleted by invalidateSignalCache');
  assert((await redis.get(key2)) === null, 'key 2 actually deleted by invalidateSignalCache');

  console.log('\n✅ invalidateSignalCache no longer errors on empty batches, and still genuinely deletes real keys');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌', err.message);
  process.exit(1);
});
