import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/db/schema.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/harikay/Desktop/MFT/backend/.env' });

const {
  foodLogTable, dailyNutritionSummaryTable, waterLogTable, weightHistoryTable, 
  moodLogTable, gamificationTable, nutritionGoalsTable
} = schema;

const sqlClient = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });
const db = drizzle(sqlClient, { schema });

const userId = 'user_36cLVWM9lUKPKmw8Sb59HubUEKb';

// Simulate today/yesterday dates (UTC midnight)
const today = new Date();
today.setUTCHours(0, 0, 0, 0);
const yesterday = new Date(today);
yesterday.setUTCDate(yesterday.getUTCDate() - 1);
const sevenDaysAgo = new Date(today);
sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
const streakWindowStart = new Date(today);
streakWindowStart.setUTCDate(streakWindowStart.getUTCDate() - 365);

const todayStart = today;
const todayEnd = new Date(today);
todayEnd.setUTCHours(23, 59, 59, 999);
const yesterdayStart = yesterday;
const yesterdayEnd = new Date(yesterday);
yesterdayEnd.setUTCHours(23, 59, 59, 999);

console.log('Testing each query...');
const queries = [
  ['todaySummary', () => db.select().from(dailyNutritionSummaryTable).where(and(eq(dailyNutritionSummaryTable.userId, userId), eq(dailyNutritionSummaryTable.date, today))).limit(1)],
  ['weekSummaries', () => db.select().from(dailyNutritionSummaryTable).where(and(eq(dailyNutritionSummaryTable.userId, userId), gte(dailyNutritionSummaryTable.date, sevenDaysAgo))).orderBy(desc(dailyNutritionSummaryTable.date))],
  ['todayFoodLogs', () => db.selectDistinctOn([foodLogTable.clientEventId]).from(foodLogTable).where(and(eq(foodLogTable.userId, userId), gte(foodLogTable.loggedDate, todayStart), lte(foodLogTable.loggedDate, todayEnd))).orderBy(foodLogTable.clientEventId, desc(foodLogTable.loggedDate))],
  ['todayWaterLogs', () => db.select().from(waterLogTable).where(and(eq(waterLogTable.userId, userId), gte(waterLogTable.loggedDate, todayStart), lte(waterLogTable.loggedDate, todayEnd)))],
  ['recentWeightEntries', () => db.select().from(weightHistoryTable).where(eq(weightHistoryTable.userId, userId)).orderBy(desc(weightHistoryTable.recordedDate)).limit(5)],
  ['todayMoodLogs', () => db.select().from(moodLogTable).where(and(eq(moodLogTable.userId, userId), gte(moodLogTable.loggedDate, todayStart), lte(moodLogTable.loggedDate, todayEnd))).orderBy(desc(moodLogTable.loggedDate))],
  ['streakFoodLogs', () => db.select({ loggedDate: foodLogTable.loggedDate }).from(foodLogTable).where(and(eq(foodLogTable.userId, userId), gte(foodLogTable.loggedDate, streakWindowStart)))],
  ['streakWaterLogs', () => db.select({ loggedDate: waterLogTable.loggedDate }).from(waterLogTable).where(and(eq(waterLogTable.userId, userId), gte(waterLogTable.loggedDate, streakWindowStart)))],
  ['streakMoodLogs', () => db.select({ loggedDate: moodLogTable.loggedDate, timezoneOffset: moodLogTable.timezoneOffset }).from(moodLogTable).where(and(eq(moodLogTable.userId, userId), gte(moodLogTable.loggedDate, streakWindowStart)))],
  ['goals', () => db.select().from(nutritionGoalsTable).where(eq(nutritionGoalsTable.userId, userId)).limit(1)],
  ['gamification', () => db.select().from(gamificationTable).where(eq(gamificationTable.userId, userId)).limit(1)],
  ['activityLogs', () => db.execute(sql`SELECT * FROM activity_log WHERE user_id = ${userId} AND logged_at >= ${todayStart} AND logged_at <= ${todayEnd}`)],
  ['yesterdaySummary', () => db.select().from(dailyNutritionSummaryTable).where(and(eq(dailyNutritionSummaryTable.userId, userId), eq(dailyNutritionSummaryTable.date, yesterday))).limit(1)],
  ['yesterdayFoodLogs', () => db.selectDistinctOn([foodLogTable.clientEventId]).from(foodLogTable).where(and(eq(foodLogTable.userId, userId), gte(foodLogTable.loggedDate, yesterdayStart), lte(foodLogTable.loggedDate, yesterdayEnd))).orderBy(foodLogTable.clientEventId, desc(foodLogTable.loggedDate))],
  ['yesterdayWaterLogs', () => db.select().from(waterLogTable).where(and(eq(waterLogTable.userId, userId), gte(waterLogTable.loggedDate, yesterdayStart), lte(waterLogTable.loggedDate, yesterdayEnd)))],
  ['yesterdayMoodLogs', () => db.select().from(moodLogTable).where(and(eq(moodLogTable.userId, userId), gte(moodLogTable.loggedDate, yesterdayStart), lte(moodLogTable.loggedDate, yesterdayEnd))).orderBy(desc(moodLogTable.loggedDate))],
];

for (const [name, queryFn] of queries) {
  try {
    const result = await queryFn();
    console.log(`✅ ${name}: ${Array.isArray(result) ? result.length + ' rows' : 'OK (non-array result type: ' + typeof result + ')'}`);
  } catch (e) {
    console.error(`❌ ${name} FAILED: ${e.message}`);
  }
}

await sqlClient.end();
