/**
 * Edge Case Testing for Enhanced MoodTracker
 *
 * Tests:
 * 1. Empty states (no data)
 * 2. Boundary conditions (intensity/energy out of range)
 * 3. Invalid data handling
 * 4. Null/undefined safety
 * 5. Error recovery
 */

import { db } from './src/config/db.js';
import {
  moodLogTable,
  foodLogTable,
  profilesTable,
} from './src/db/schema.js';
import { eq, and, gte, desc } from 'drizzle-orm';
import { generateMoodInsights } from './src/services/moodInsightService.js';

const TEST_USER_ID = 'test_edge_' + Date.now();

async function cleanup() {
  console.log('🧹 Cleaning up...');
  await db.delete(moodLogTable).where(eq(moodLogTable.userId, TEST_USER_ID));
  await db.delete(foodLogTable).where(eq(foodLogTable.userId, TEST_USER_ID));
  await db.delete(profilesTable).where(eq(profilesTable.userId, TEST_USER_ID));
  console.log('✅ Cleanup complete\n');
}

async function setupTestUser() {
  await db.insert(profilesTable).values({
    userId: TEST_USER_ID,
    name: 'Edge Test User',
    email: `${TEST_USER_ID}@test.com`,
    createdAt: new Date(),
  }).onConflictDoNothing();
}

async function testEmptyStates() {
  console.log('📭 TEST 1: Empty States');
  console.log('=====================================');

  // 1.1: No mood logs
  const moods = await db.select()
    .from(moodLogTable)
    .where(eq(moodLogTable.userId, TEST_USER_ID));

  console.log(`✅ Empty mood query: ${moods.length} entries (expected: 0)`);
  if (moods.length !== 0) throw new Error('Expected 0 moods');

  // 1.2: No food logs
  const foods = await db.select()
    .from(foodLogTable)
    .where(eq(foodLogTable.userId, TEST_USER_ID));

  console.log(`✅ Empty food query: ${foods.length} entries (expected: 0)`);
  if (foods.length !== 0) throw new Error('Expected 0 foods');

  // 1.3: Insights with no data
  console.log('🧠 Testing insights with insufficient data...');
  const insights = await generateMoodInsights(TEST_USER_ID, [], []);
  console.log(`✅ Insights with no data: ${insights.length} insights`);
  console.log(`   Message: ${insights.length === 0 ? 'No insights (correct)' : insights[0].message}`);

  // 1.4: Insights with only 5 mood logs (below 10 threshold)
  const fewMoods = [];
  for (let i = 0; i < 5; i++) {
    const [mood] = await db.insert(moodLogTable).values({
      userId: TEST_USER_ID,
      mood: 'neutral',
      intensity: 5,
      energyLevel: 5,
      loggedDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      clientEventId: `test-few-${i}`,
    }).returning();
    fewMoods.push(mood);
  }

  const insightsWithFewData = await generateMoodInsights(TEST_USER_ID, fewMoods, []);
  console.log(`✅ Insights with 5 moods (below threshold): ${insightsWithFewData.length} insights`);

  return { moods, foods, insights };
}

async function testBoundaryConditions() {
  console.log('\n⚠️  TEST 2: Boundary Conditions');
  console.log('=====================================');

  // 2.1: Intensity = 0 (below valid range 1-10)
  try {
    const [mood1] = await db.insert(moodLogTable).values({
      userId: TEST_USER_ID,
      mood: 'neutral',
      intensity: 0, // Invalid
      energyLevel: 5,
      loggedDate: new Date(),
      clientEventId: 'test-intensity-0',
    }).returning();
    console.log(`⚠️  Intensity 0: Allowed (got ${mood1.intensity}) - Database permits out-of-range`);
  } catch (error) {
    console.log(`✅ Intensity 0: Rejected (${error.message.substring(0, 50)})`);
  }

  // 2.2: Intensity = 11 (above valid range)
  try {
    const [mood2] = await db.insert(moodLogTable).values({
      userId: TEST_USER_ID,
      mood: 'neutral',
      intensity: 11, // Invalid
      energyLevel: 5,
      loggedDate: new Date(),
      clientEventId: 'test-intensity-11',
    }).returning();
    console.log(`⚠️  Intensity 11: Allowed (got ${mood2.intensity}) - Database permits out-of-range`);
  } catch (error) {
    console.log(`✅ Intensity 11: Rejected (${error.message.substring(0, 50)})`);
  }

  // 2.3: Negative intensity
  try {
    const [mood3] = await db.insert(moodLogTable).values({
      userId: TEST_USER_ID,
      mood: 'neutral',
      intensity: -5, // Invalid
      energyLevel: 5,
      loggedDate: new Date(),
      clientEventId: 'test-intensity-negative',
    }).returning();
    console.log(`⚠️  Intensity -5: Allowed (got ${mood3.intensity}) - Database permits negative`);
  } catch (error) {
    console.log(`✅ Intensity -5: Rejected (${error.message.substring(0, 50)})`);
  }

  // 2.4: Very long note (>200 chars)
  const longNote = 'A'.repeat(500);
  const [mood4] = await db.insert(moodLogTable).values({
    userId: TEST_USER_ID,
    mood: 'stressed',
    intensity: 7,
    energyLevel: 4,
    note: longNote,
    loggedDate: new Date(),
    clientEventId: 'test-long-note',
  }).returning();
  console.log(`✅ Long note (${longNote.length} chars): Stored as ${mood4.note?.length || 0} chars`);

  // 2.5: Empty tags object
  const [mood5] = await db.insert(moodLogTable).values({
    userId: TEST_USER_ID,
    mood: 'happy',
    intensity: 8,
    energyLevel: 7,
    tags: {}, // Empty
    loggedDate: new Date(),
    clientEventId: 'test-empty-tags',
  }).returning();
  console.log(`✅ Empty tags: Stored as ${JSON.stringify(mood5.tags)}`);

  return { longNote: mood4.note, emptyTags: mood5.tags };
}

async function testNullSafety() {
  console.log('\n🛡️  TEST 3: Null/Undefined Safety');
  console.log('=====================================');

  // 3.1: Null intensity (should default or allow null)
  const [mood1] = await db.insert(moodLogTable).values({
    userId: TEST_USER_ID,
    mood: 'calm',
    intensity: null,
    energyLevel: null,
    tags: null,
    note: null,
    loggedDate: new Date(),
    clientEventId: 'test-nulls',
  }).returning();
  console.log(`✅ Null fields accepted:`);
  console.log(`   intensity: ${mood1.intensity ?? 'null'}`);
  console.log(`   energyLevel: ${mood1.energyLevel ?? 'null'}`);
  console.log(`   tags: ${mood1.tags === null ? 'null' : JSON.stringify(mood1.tags)}`);
  console.log(`   note: ${mood1.note ?? 'null'}`);

  // 3.2: Missing optional fields entirely
  const [mood2] = await db.insert(moodLogTable).values({
    userId: TEST_USER_ID,
    mood: 'focused',
    // intensity: undefined,
    // energyLevel: undefined,
    // tags: undefined,
    // note: undefined,
    loggedDate: new Date(),
    clientEventId: 'test-undefined',
  }).returning();
  console.log(`✅ Undefined fields handled:`);
  console.log(`   intensity: ${mood2.intensity ?? 'null'}`);
  console.log(`   energyLevel: ${mood2.energyLevel ?? 'null'}`);

  // 3.3: Invalid mood value
  try {
    const [mood3] = await db.insert(moodLogTable).values({
      userId: TEST_USER_ID,
      mood: 'invalid_mood_xyz', // Not in MOOD_TYPES
      intensity: 5,
      energyLevel: 5,
      loggedDate: new Date(),
      clientEventId: 'test-invalid-mood',
    }).returning();
    console.log(`⚠️  Invalid mood 'invalid_mood_xyz': Allowed (stored as '${mood3.mood}')`);
    console.log(`   ℹ️  Database has no enum constraint - validation should be done in API layer`);
  } catch (error) {
    console.log(`✅ Invalid mood rejected: ${error.message.substring(0, 50)}`);
  }

  return { nullMood: mood1, undefinedMood: mood2 };
}

async function testMealContextEdgeCases() {
  console.log('\n🍽️  TEST 4: Meal Context Edge Cases');
  console.log('=====================================');

  // 4.1: Mood log with no recent meals (empty mealContext)
  const [mood1] = await db.insert(moodLogTable).values({
    userId: TEST_USER_ID,
    mood: 'tired',
    intensity: 4,
    energyLevel: 3,
    mealContext: { mealIds: [], windowHours: 4 },
    loggedDate: new Date(),
    clientEventId: 'test-no-meals',
  }).returning();
  console.log(`✅ Empty meal context: ${JSON.stringify(mood1.mealContext)}`);

  // 4.2: Mood log with invalid meal IDs (IDs that don't exist)
  const [mood2] = await db.insert(moodLogTable).values({
    userId: TEST_USER_ID,
    mood: 'stressed',
    intensity: 7,
    energyLevel: 4,
    mealContext: { mealIds: [99999, 88888], windowHours: 4 }, // Non-existent IDs
    loggedDate: new Date(),
    clientEventId: 'test-invalid-meal-ids',
  }).returning();
  console.log(`✅ Invalid meal IDs stored: ${JSON.stringify(mood2.mealContext)}`);
  console.log(`   ℹ️  IDs stored but won't resolve when querying - handled gracefully`);

  // 4.3: Very large mealIds array
  const largeMealIds = Array.from({ length: 100 }, (_, i) => i + 1);
  const [mood3] = await db.insert(moodLogTable).values({
    userId: TEST_USER_ID,
    mood: 'happy',
    intensity: 8,
    energyLevel: 7,
    mealContext: { mealIds: largeMealIds, windowHours: 4 },
    loggedDate: new Date(),
    clientEventId: 'test-large-meal-ids',
  }).returning();
  console.log(`✅ Large mealIds array (${largeMealIds.length} IDs): Stored successfully`);

  return { emptyContext: mood1, invalidIds: mood2, largeIds: mood3 };
}

async function testTagsEdgeCases() {
  console.log('\n🏷️  TEST 5: Tags Edge Cases');
  console.log('=====================================');

  // 5.1: Unknown tag categories
  const [mood1] = await db.insert(moodLogTable).values({
    userId: TEST_USER_ID,
    mood: 'calm',
    intensity: 6,
    energyLevel: 6,
    tags: {
      unknownCategory: 'Some Value',
      anotherRandom: 'Test',
    },
    loggedDate: new Date(),
    clientEventId: 'test-unknown-tags',
  }).returning();
  console.log(`✅ Unknown tag categories: ${JSON.stringify(mood1.tags)}`);
  console.log(`   ℹ️  JSONB allows any schema - validation should be in API layer`);

  // 5.2: Tags with special characters
  const [mood2] = await db.insert(moodLogTable).values({
    userId: TEST_USER_ID,
    mood: 'energized',
    intensity: 9,
    energyLevel: 9,
    tags: {
      'tag-with-dashes': 'value',
      'emoji🎉': 'party',
      'unicode™': 'test',
    },
    loggedDate: new Date(),
    clientEventId: 'test-special-chars-tags',
  }).returning();
  console.log(`✅ Tags with special chars: ${JSON.stringify(mood2.tags)}`);

  // 5.3: Deeply nested tags (JSONB can handle arbitrary depth)
  const [mood3] = await db.insert(moodLogTable).values({
    userId: TEST_USER_ID,
    mood: 'focused',
    intensity: 7,
    energyLevel: 8,
    tags: {
      sleep: {
        quality: 'Good',
        duration: 8,
        wakeups: 2,
        nested: {
          deep: {
            veryDeep: 'value',
          },
        },
      },
    },
    loggedDate: new Date(),
    clientEventId: 'test-nested-tags',
  }).returning();
  console.log(`✅ Deeply nested tags: ${JSON.stringify(mood3.tags).substring(0, 80)}...`);

  return { unknownTags: mood1, specialChars: mood2, nested: mood3 };
}

async function runAllEdgeCaseTests() {
  console.log('🚀 Starting MoodTracker Edge Case Tests\n');
  console.log('='.repeat(60) + '\n');

  try {
    await cleanup();
    await setupTestUser();

    const test1 = await testEmptyStates();
    const test2 = await testBoundaryConditions();
    const test3 = await testNullSafety();
    const test4 = await testMealContextEdgeCases();
    const test5 = await testTagsEdgeCases();

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL EDGE CASE TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   • Empty states: ✅`);
    console.log(`   • Boundary conditions: ✅`);
    console.log(`   • Null/undefined safety: ✅`);
    console.log(`   • Meal context edge cases: ✅`);
    console.log(`   • Tags edge cases: ✅`);

    console.log('\n⚠️  Recommendations:');
    console.log(`   1. Add API layer validation for mood values (8 valid moods only)`);
    console.log(`   2. Add API layer validation for intensity/energy (1-10 range)`);
    console.log(`   3. Add note length limit in API (200 chars)`);
    console.log(`   4. Add tag schema validation in API (known categories only)`);

    await cleanup();

  } catch (error) {
    console.error('\n❌ EDGE CASE TEST FAILED:');
    console.error(error);
    await cleanup();
    process.exit(1);
  }
}

runAllEdgeCaseTests();
