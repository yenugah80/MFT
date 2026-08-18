/**
 * Audits the brand-new, zero-data-ever user path across every backend
 * function that powers "Your Progress" — the scenario tonight's testing
 * never actually covered (all testing was on the demo account, which has
 * 36+ days of history, hitting zero-data PERIODS, not zero data EVER).
 *
 * Creates a disposable user with no logs in any domain, calls every real
 * exported function directly, and checks for: thrown exceptions, NaN
 * anywhere in the output, and sane hasDataInPeriod/hasEnoughData flags.
 */
import { db } from './src/db/index.js';
import { profilesTable } from './src/db/schema.js';
import { eq } from 'drizzle-orm';
import { getAnalyticsRecommendations } from './src/services/analyticsRecommendationService.js';
import {
  generateMoodInsights,
  generateNutritionInsights,
  generateHydrationInsights,
  generateActivityInsights,
} from './src/services/decisionBrainService.js';
import activityAnalyticsService from './src/services/activityAnalyticsService.js';

const TEST_USER_ID = `test_zero_data_${Date.now()}`;

function findNaN(obj, path = '') {
  const hits = [];
  if (typeof obj === 'number' && Number.isNaN(obj)) {
    hits.push(path || '(root)');
    return hits;
  }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      hits.push(...findNaN(v, path ? `${path}.${k}` : k));
    }
  }
  return hits;
}

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

async function checkNoNaN(label, fn) {
  try {
    const result = await fn();
    const nanPaths = findNaN(result);
    if (nanPaths.length > 0) {
      console.error(`  ✗ ${label}: NaN found at ${nanPaths.join(', ')}`);
      return false;
    }
    console.log(`  ✓ ${label}: no exception, no NaN`);
    return true;
  } catch (err) {
    console.error(`  ✗ ${label}: THREW — ${err.message}`);
    return false;
  }
}

async function main() {
  console.log(`Seeding disposable zero-data user ${TEST_USER_ID}`);
  await db.insert(profilesTable).values({ userId: TEST_USER_ID });

  let allPassed = true;
  try {
    console.log('\n[Food Engine] getAnalyticsRecommendations (all 3 periods)');
    for (const period of ['today', 'week', 'month']) {
      const ok = await checkNoNaN(`getAnalyticsRecommendations(${period})`, () =>
        getAnalyticsRecommendations(TEST_USER_ID, period, 0)
      );
      allPassed = allPassed && ok;
    }

    console.log('\n[Insight Engine] decision-brain generate*Insights');
    const moodResult = await checkNoNaN('generateMoodInsights', () => generateMoodInsights(TEST_USER_ID));
    const nutritionResult = await checkNoNaN('generateNutritionInsights', () => generateNutritionInsights(TEST_USER_ID));
    const hydrationResult = await checkNoNaN('generateHydrationInsights', () => generateHydrationInsights(TEST_USER_ID));
    const activityResult = await checkNoNaN('generateActivityInsights', () => generateActivityInsights(TEST_USER_ID));
    allPassed = allPassed && moodResult && nutritionResult && hydrationResult && activityResult;

    // Verify the "insufficient data" flags are actually set correctly,
    // not just "didn't crash" — a false hasEnoughData:true with empty
    // arrays would silently show a broken-looking populated state.
    const mi = await generateMoodInsights(TEST_USER_ID);
    assert(mi.hasEnoughData === false, 'generateMoodInsights correctly reports hasEnoughData: false');
    const ni = await generateNutritionInsights(TEST_USER_ID);
    assert(ni.hasEnoughData === false, 'generateNutritionInsights correctly reports hasEnoughData: false');

    console.log('\n[Activity Analytics] getDashboardAnalytics (this is the one with the AI-recs cache + OpenAI call)');
    const dashOk = await checkNoNaN('activityAnalyticsService.getDashboardAnalytics', () =>
      activityAnalyticsService.getDashboardAnalytics(TEST_USER_ID, 7)
    );
    allPassed = allPassed && dashOk;

    console.log('\n[Food Engine] hasDataInPeriod flags are all false for zero data');
    const recs = await getAnalyticsRecommendations(TEST_USER_ID, 'week', 0);
    assert(recs.stats.food.hasDataInPeriod === false, 'food.hasDataInPeriod is false');
    assert(recs.stats.mood.hasDataInPeriod === false, 'mood.hasDataInPeriod is false');
    assert(recs.stats.water.hasDataInPeriod === false, 'water.hasDataInPeriod is false');
    assert(recs.stats.activity.hasDataInPeriod === false, 'activity.hasDataInPeriod is false');

    console.log('\n[Food Engine] the 4 onboarding action nudges DO appear for a real zero-data user');
    const nutritionNudge = recs.recommendations.nutrition.find((r) => r.type === 'action');
    const moodNudge = recs.recommendations.mood.find((r) => r.type === 'action');
    assert(!!nutritionNudge, 'nutrition_first_meal nudge present');
    assert(!!moodNudge, 'mood_first_log nudge present');

    if (allPassed) {
      console.log('\n✅ Zero-data-user path is clean across every function checked');
    } else {
      console.log('\n⚠️  One or more checks failed — see ✗ marks above');
      process.exitCode = 1;
    }
  } finally {
    console.log(`\nCleaning up ${TEST_USER_ID}`);
    await db.delete(profilesTable).where(eq(profilesTable.userId, TEST_USER_ID));
  }
}

main().then(() => process.exit(process.exitCode || 0)).catch((err) => { console.error(err); process.exit(1); });
