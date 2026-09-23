/**
 * Regression check for the Wellness Score period-awareness fix.
 *
 * Guards against the bug: the score's 4 components (nutrition/hydration/
 * activity/mood) previously read a hardcoded today-only or fixed-weekly
 * stat regardless of the requested period, so Week vs Month always
 * produced the identical Wellness Score. Seeds data so the two windows are
 * mathematically guaranteed to differ, then asserts the returned score
 * (and its breakdown) actually does.
 *
 * Run against the local dev database (see mft-no-dev-environment):
 *   DATABASE_URL=postgresql://$(whoami)@localhost:5432/mft_dev DB_SSL=false \
 *     node test-wellness-score-period-aware.mjs
 */

import { db } from './src/db/index.js';
import {
  profilesTable,
  foodLogTable,
  moodLogTable,
} from './src/db/schema.js';
import { eq } from 'drizzle-orm';
import { getAnalyticsRecommendations } from './src/services/analyticsRecommendationService.js';

const TEST_USER_ID = `test_wellness_${Date.now()}`;

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  console.log(`[test-wellness-score] Seeding disposable user ${TEST_USER_ID}`);
  await db.insert(profilesTable).values({
    userId: TEST_USER_ID,
    calorieGoal: 2000,
  });

  try {
    // Recent 5 days: light eating, low mood — pulls the week average down.
    for (let i = 0; i < 5; i++) {
      await db.insert(foodLogTable).values({
        userId: TEST_USER_ID,
        foodName: 'Light snack',
        calories: 400,
        protein: 10,
        carbs: 40,
        fats: 10,
        loggedDate: daysAgo(i),
        mealType: 'snack',
      });
      await db.insert(moodLogTable).values({
        userId: TEST_USER_ID,
        mood: 'tired',
        intensity: 3,
        loggedDate: daysAgo(i),
      });
    }

    // Days 10-25: heavy eating, high mood — only shows up in the month window.
    for (let i = 10; i < 25; i++) {
      await db.insert(foodLogTable).values({
        userId: TEST_USER_ID,
        foodName: 'Full meal',
        calories: 2200,
        protein: 100,
        carbs: 200,
        fats: 60,
        loggedDate: daysAgo(i),
        mealType: 'lunch',
      });
      await db.insert(moodLogTable).values({
        userId: TEST_USER_ID,
        mood: 'happy',
        intensity: 9,
        loggedDate: daysAgo(i),
      });
    }

    console.log('\n[Step 1] Fetch with period=week (7-day lookback)');
    const week = await getAnalyticsRecommendations(TEST_USER_ID, 'week', 0);
    const weekScore = week.recommendations.wellness.find((r) => r.id === 'wellness_score');

    console.log('\n[Step 2] Fetch with period=month (30-day lookback)');
    const month = await getAnalyticsRecommendations(TEST_USER_ID, 'month', 0);
    const monthScore = month.recommendations.wellness.find((r) => r.id === 'wellness_score');

    assert(!!weekScore, 'week fetch includes a wellness_score card');
    assert(!!monthScore, 'month fetch includes a wellness_score card');
    assert(
      weekScore.metric.overall !== monthScore.metric.overall,
      `overall score differs between week (${weekScore.metric.overall}) and month (${monthScore.metric.overall})`
    );
    assert(
      weekScore.metric.breakdown.nutrition !== monthScore.metric.breakdown.nutrition,
      `nutrition breakdown differs between week (${weekScore.metric.breakdown.nutrition}) and month (${monthScore.metric.breakdown.nutrition})`
    );
    assert(
      weekScore.metric.breakdown.mood !== monthScore.metric.breakdown.mood,
      `mood breakdown differs between week (${weekScore.metric.breakdown.mood}) and month (${monthScore.metric.breakdown.mood})`
    );
    // The heavier/happier days only enter the window once lookback >= 10
    // days, so the month score should be higher on both fronts.
    assert(
      monthScore.metric.breakdown.nutrition > weekScore.metric.breakdown.nutrition,
      'month nutrition score is higher than week (the bigger meals are outside the 7-day window)'
    );
    assert(
      monthScore.metric.breakdown.mood > weekScore.metric.breakdown.mood,
      'month mood score is higher than week (the happier days are outside the 7-day window)'
    );

    console.log('\n✅ All checks passed');
  } finally {
    console.log(`\n[test-wellness-score] Cleaning up ${TEST_USER_ID}`);
    await db.delete(foodLogTable).where(eq(foodLogTable.userId, TEST_USER_ID));
    await db.delete(moodLogTable).where(eq(moodLogTable.userId, TEST_USER_ID));
    await db.delete(profilesTable).where(eq(profilesTable.userId, TEST_USER_ID));
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
