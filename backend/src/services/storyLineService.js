import { db } from "../config/db.js";
import { dailyNutritionSummaryTable } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";

/**
 * Generates a short "Story Line" insight for a specific day based on logs.
 * 
 * Logic:
 * 1. Prioritize negative correlations (e.g., High Sugar -> Low Mood)
 * 2. Fallback to positive reinforcements (e.g., Goal Hit -> High Energy)
 * 3. Default to factual summary if no strong pattern
 */
export function generateDailyStoryLine(nutrition, mood, hydration, goals) {
  const { totalCalories, totalSugar, totalProtein } = nutrition;
  const { avgMood, avgEnergy, dominantMood } = mood;
  const { percentage: hydrationPercent } = hydration;

  // 1. Negative Patterns (High Priority)
  if (totalSugar > (goals.sugar || 50) * 1.5 && avgEnergy < 4) {
    return "High sugar intake → noticeable energy crash.";
  }
  
  if (hydrationPercent < 50 && (dominantMood === 'tired' || dominantMood === 'headache')) {
    return "Low hydration likely contributed to fatigue.";
  }

  if (totalCalories > (goals.calories || 2000) * 1.2 && avgMood < 4) {
    return "Heavy meals may have impacted your mood.";
  }

  // 2. Positive Patterns
  if (totalProtein > (goals.protein || 100) && avgEnergy > 7) {
    return "High protein day fueled steady energy! ⚡";
  }

  if (hydrationPercent >= 100 && avgMood > 7) {
    return "Great hydration supported mental clarity. 💧";
  }

  if (Math.abs(totalCalories - (goals.calories || 2000)) < 200 && avgMood > 6) {
    return "Balanced nutrition kept you feeling good.";
  }

  // 3. Neutral / Factual
  if (totalCalories === 0) {
    return "No nutrition logged for this day.";
  }

  return "Logged meals and tracked mood.";
}

/**
 * Calculates a 0-100 Daily Wellness Score
 */
export function calculateDailyScore(nutrition, mood, hydration, goals) {
  let score = 0;

  // Nutrition (40 points)
  const calDiff = Math.abs(nutrition.totalCalories - (goals.calories || 2000));
  const calScore = Math.max(0, 40 - (calDiff / 100)); // Lose 1 point per 100kcal off
  score += calScore;

  // Mood (30 points)
  // Mood is 1-10, so * 3
  const moodScore = (mood.avgMood || 5) * 3;
  score += moodScore;

  // Hydration (30 points)
  const hydroScore = Math.min(30, (hydration.percentage / 100) * 30);
  score += hydroScore;

  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Updates the daily summary table with the calculated story and score.
 * Should be called at the end of the day or when viewing the calendar.
 */
export async function updateDailySummary(userId, date, data) {
  try {
    const storyLine = generateDailyStoryLine(
      data.nutrition, 
      data.mood, 
      data.hydration, 
      data.goals
    );

    const dailyScore = calculateDailyScore(
      data.nutrition, 
      data.mood, 
      data.hydration, 
      data.goals
    );

    // Upsert into daily_nutrition_summary
    await db.insert(dailyNutritionSummaryTable)
      .values({
        userId,
        date: new Date(date),
        totalCalories: data.nutrition.totalCalories,
        totalProtein: data.nutrition.totalProtein,
        dailyScore,
        storyLine
      })
      .onConflictDoUpdate({
        target: [dailyNutritionSummaryTable.userId, dailyNutritionSummaryTable.date],
        set: { 
          dailyScore, 
          storyLine,
          updatedAt: new Date() 
        }
      });
      
    return { storyLine, dailyScore };
  } catch (error) {
    console.error("Failed to update daily summary:", error);
    return null;
  }
}