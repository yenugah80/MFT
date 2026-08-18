/**
 * The AI-recs cache fix was verified in isolation (generateAIRecommendations
 * alone: 8058ms -> 25ms), but the actual route the user complained about
 * calls getDashboardAnalytics, which ALSO runs analyzeCorrelations,
 * predictTomorrow, and classifyActivityPersona in the same request. None
 * of those were individually profiled — this checks the real end-to-end
 * latency of what the route actually returns, twice in a row.
 */
import activityAnalyticsService from './src/services/activityAnalyticsService.js';

const userId = 'user_3HgUj90Az5gLi0FTw95ADqHijw2';

async function main() {
  console.log('[1] First call to getDashboardAnalytics (days=7, matches the route default)');
  const t0 = Date.now();
  await activityAnalyticsService.getDashboardAnalytics(userId, 7);
  const firstMs = Date.now() - t0;
  console.log(`  took ${firstMs}ms`);

  console.log('\n[2] Second call, same user (AI recs should be cached now, everything else is not)');
  const t1 = Date.now();
  await activityAnalyticsService.getDashboardAnalytics(userId, 7);
  const secondMs = Date.now() - t1;
  console.log(`  took ${secondMs}ms`);

  console.log(`\nDelta: ${firstMs - secondMs}ms faster on the second call`);
  if (secondMs > 3000) {
    console.log(`⚠️  Second call is still ${secondMs}ms — something besides the AI call is contributing real latency`);
  } else {
    console.log(`✅ Full route is fast even accounting for everything else in getDashboardAnalytics`);
  }
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
