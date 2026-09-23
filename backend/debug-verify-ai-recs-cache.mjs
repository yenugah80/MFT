/**
 * Verifies the AI recommendations cache actually cuts latency: calling
 * generateAIRecommendations twice in a row for the same user should show
 * a slow first call (real OpenAI request) and a near-instant second call
 * (cache hit).
 */
import activityAnalyticsService from './src/services/activityAnalyticsService.js';

const userId = 'user_3HgUj90Az5gLi0FTw95ADqHijw2';

async function main() {
  console.log('[1] Fetching patterns/correlations for the prompt...');
  const patterns = await activityAnalyticsService.analyzeActivityPatterns(userId, 30);

  console.log('\n[2] First call to generateAIRecommendations (expect: slow, real OpenAI call)');
  const t0 = Date.now();
  const first = await activityAnalyticsService.generateAIRecommendations(userId, patterns, null);
  const firstMs = Date.now() - t0;
  console.log(`  took ${firstMs}ms, got ${Array.isArray(first) ? first.length : 'non-array'} recommendations`);

  console.log('\n[3] Second call, same user (expect: fast, cache hit)');
  const t1 = Date.now();
  const second = await activityAnalyticsService.generateAIRecommendations(userId, patterns, null);
  const secondMs = Date.now() - t1;
  console.log(`  took ${secondMs}ms, got ${Array.isArray(second) ? second.length : 'non-array'} recommendations`);

  if (secondMs < firstMs / 3 || secondMs < 200) {
    console.log(`\n✅ Cache is working — second call was ${firstMs - secondMs}ms faster`);
  } else {
    console.error(`\n⚠️  Second call (${secondMs}ms) wasn't meaningfully faster than the first (${firstMs}ms) — cache may not be hitting`);
    process.exit(1);
  }
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
