/**
 * One-time script to clear bad/test food log data
 * Run this to fix the data explosion bug
 */

import { db } from './src/config/db.js';
import { foodLogTable, dailyNutritionSummaryTable } from './src/db/schema.js';

async function clearBadData() {
  try {
    console.log('🧹 Clearing all food logs and daily summaries...');

    // Delete all food logs
    const deletedLogs = await db.delete(foodLogTable);
    console.log(`✅ Deleted all food logs`);

    // Delete all daily nutrition summaries
    const deletedSummaries = await db.delete(dailyNutritionSummaryTable);
    console.log(`✅ Deleted all daily summaries`);

    console.log('\n✨ Database cleaned! All new logs will use normalized values.');
    console.log('📊 Your dashboard should now show 0 calories - log new meals to test.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    process.exit(1);
  }
}

clearBadData();
