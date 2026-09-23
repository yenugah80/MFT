/**
 * Regression check for the GET /decision-brain/mood-insights crash:
 * generateMoodRecommendations(userId, moodProfile) passed userId as the
 * function's only real parameter (`profile`), so profile.foodMoodCorrelations
 * was undefined and getFoodMoodRecommendations's correlations.find() threw.
 * Seeds enough mood + food logs for a disposable synthetic user (>=3 mood
 * logs is generateMoodInsights's own minimum) against LOCAL DEV POSTGRES
 * ONLY — this call path writes to userCorrelationsTable as a caching side
 * effect, so it must not run against production.
 */
import { db } from './src/db/index.js';
import { profilesTable, moodLogTable, foodLogTable } from './src/db/schema.js';
import { eq } from 'drizzle-orm';
import { generateMoodInsights } from './src/services/decisionBrainService.js';

const userId = `test_mood_insights_${Date.now()}`;

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

async function main() {
  await db.insert(profilesTable).values({ userId });

  const moods = [];
  const foods = [];
  for (let i = 0; i < 10; i++) {
    moods.push({ userId, mood: i % 2 === 0 ? 'happy' : 'stressed', intensity: (i % 2 === 0 ? 8 : 3).toString(), loggedDate: daysAgo(i) });
    foods.push({ userId, foodName: i % 2 === 0 ? 'Salad' : 'Pizza', calories: 500, loggedDate: daysAgo(i) });
  }
  await db.insert(moodLogTable).values(moods);
  await db.insert(foodLogTable).values(foods);

  const result = await generateMoodInsights(userId);
  console.log('generateMoodInsights result keys:', Object.keys(result));
  console.log('recommendations:', JSON.stringify(result.recommendations || result.insights || 'n/a'));

  assert(result.success === true, 'generateMoodInsights did not throw and returned success: true');
  assert(result.hasEnoughData !== false, 'has enough seeded data to attempt full generation, not just the early-return path');

  console.log('\n✅ GET /decision-brain/mood-insights crash is fixed — generateMoodRecommendations no longer receives a malformed profile');

  await db.delete(moodLogTable).where(eq(moodLogTable.userId, userId));
  await db.delete(foodLogTable).where(eq(foodLogTable.userId, userId));
  await db.delete(profilesTable).where(eq(profilesTable.userId, userId));
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌', err);
  process.exit(1);
});
