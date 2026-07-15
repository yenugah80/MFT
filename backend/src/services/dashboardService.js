/**
 * Dashboard Service
 * Provides direct database access for dashboard-related queries
 * Used by internal backend services to avoid HTTP overhead
 */

import { and, eq, gte, lte, desc } from 'drizzle-orm';
import {
  dailyNutritionSummaryTable,
  foodLogTable,
  waterLogTable,
  nutritionGoalsTable,
  gamificationTable,
  moodLogTable,
} from '../db/schema.js';
import {
  parseTimezoneOffsetMinutes,
  getLocalDayRange,
  getLocalDateUTC,
  addDaysUTC,
  normalizeDateUTC,
  toDateStr,
} from '../utils/timezone.js';

/**
 * Get today's dashboard data (internal service)
 * Provides essentials: nutrition totals, water intake, goals
 * Avoids HTTP overhead by querying database directly
 *
 * @param {Object} db - Drizzle database instance
 * @param {string} userId - Clerk user ID
 * @param {Object} headers - Request headers (for timezone offset)
 * @returns {Promise<Object>} Dashboard data with today's nutrition and goals
 */
export async function getDashboardData(db, userId, offsetMinutes = 0) {
  try {
    const { start: todayStart, end: todayEnd } = getLocalDayRange(offsetMinutes);
    const today = getLocalDateUTC(offsetMinutes);
    const sevenDaysAgo = addDaysUTC(today, -7);

    // Fetch all data in parallel for performance
    const [
      todaySummary,
      weekSummaries,
      todayFoodLogs,
      todayWaterLogs,
      goals,
      gamification,
    ] = await Promise.all([
      // Today's nutrition summary
      db.select()
        .from(dailyNutritionSummaryTable)
        .where(
          and(
            eq(dailyNutritionSummaryTable.userId, userId),
            eq(dailyNutritionSummaryTable.date, toDateStr(today))
          )
        )
        .limit(1),

      // Last 7 days summaries for calculating weekly averages
      db.select()
        .from(dailyNutritionSummaryTable)
        .where(
          and(
            eq(dailyNutritionSummaryTable.userId, userId),
            gte(dailyNutritionSummaryTable.date, toDateStr(sevenDaysAgo))
          )
        )
        .orderBy(desc(dailyNutritionSummaryTable.date)),

      // Today's food logs
      db.selectDistinctOn([foodLogTable.clientEventId])
        .from(foodLogTable)
        .where(
          and(
            eq(foodLogTable.userId, userId),
            gte(foodLogTable.loggedDate, todayStart),
            lte(foodLogTable.loggedDate, todayEnd)
          )
        )
        .orderBy(foodLogTable.clientEventId, desc(foodLogTable.loggedDate)),

      // Today's water intake
      db.select()
        .from(waterLogTable)
        .where(
          and(
            eq(waterLogTable.userId, userId),
            gte(waterLogTable.loggedDate, todayStart),
            lte(waterLogTable.loggedDate, todayEnd)
          )
        ),

      // User's nutrition goals
      db.select()
        .from(nutritionGoalsTable)
        .where(eq(nutritionGoalsTable.userId, userId))
        .limit(1),

      // Gamification stats
      db.select()
        .from(gamificationTable)
        .where(eq(gamificationTable.userId, userId))
        .limit(1),
    ]);

    // Calculate today's water total
    const todayWaterTotal = todayWaterLogs.reduce((sum, log) => {
      const hydrationValue = parseFloat(log.hydrationLiters || 0);
      if (hydrationValue > 0) return sum + hydrationValue;
      return sum + parseFloat(log.amountLiters || 0);
    }, 0);

    // Aggregate micronutrients from today's food logs
    const todayMicros = {};
    todayFoodLogs.forEach(log => {
      if (log.micros && typeof log.micros === 'object') {
        Object.entries(log.micros).forEach(([key, value]) => {
          // Handle different micronutrient formats: "10mg", 10, { value: 10, unit: "mg" }
          let numValue;
          if (typeof value === 'number') {
            numValue = value;
          } else if (typeof value === 'object' && value.value !== undefined) {
            numValue = value.value;
          } else if (typeof value === 'string') {
            numValue = parseFloat(value.replace(/[^0-9.]/g, ''));
          }

          if (!isNaN(numValue) && numValue > 0) {
            todayMicros[key] = (todayMicros[key] || 0) + numValue;
          }
        });
      }
    });

    // Build response
    const dashboard = {
      today: {
        date: today,
        nutrition: {
          ...(todaySummary[0] || {
            totalCalories: 0,
            totalProtein: 0,
            totalCarbs: 0,
            totalFats: 0,
          }),
          micros: todayMicros,
        },
        waterIntakeLiters: todayWaterTotal,
      },
      goals: goals[0] || null,
      gamification: gamification[0] || null,
    };

    return dashboard;
  } catch (error) {
    console.error('❌ Error fetching dashboard data:', error);
    throw error;
  }
}
