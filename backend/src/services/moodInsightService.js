/**
 * Mood Insight Service
 *
 * AI-powered mood-meal correlation analysis with GPT-4o
 *
 * CRITICAL SAFETY RULES:
 * - Use probabilistic language ("tend to", "may", "appears to", "often")
 * - NEVER use diagnostic language ("you are", "you have", "definitely")
 * - Focus on patterns, not medical advice
 * - Only show insights with >0.6 confidence
 * - Include actionable suggestions
 */

import { db } from "../config/db.js";
import { moodMealCorrelationsTable } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { openaiClient as openai } from "./apiClients/OpenAIClient.js";

/**
 * Generate AI-powered mood insights from mood and food logs
 * @param {string} userId - User ID
 * @param {Array} moods - Mood log entries
 * @param {Array} foodLogs - Food log entries
 * @returns {Promise<Array>} - Array of insight objects
 */
export async function generateMoodInsights(userId, moods, foodLogs) {
  try {
    // 💰 COST OPTIMIZATION: Try rule-based insights first (FREE!)
    const ruleBasedInsights = generateRuleBasedInsights(moods, foodLogs);

    // If we have 2+ good insights, skip AI entirely (save money!)
    if (ruleBasedInsights.length >= 2) {
      console.log(`[MoodInsights] Using rule-based insights only (saved AI cost for user ${userId})`);
      return ruleBasedInsights;
    }

    // ⚠️ CRITICAL: System prompt enforces soft, probabilistic language
    const systemPrompt = `You are a health and nutrition AI assistant. IMPORTANT rules:
- Use probabilistic language: "tend to", "may", "appears to", "often", "could be related to"
- NEVER use diagnostic language: "you are", "you have", "definitely", "certainly"
- Focus on patterns and correlations, not causation
- Be encouraging and supportive
- Include confidence scores (only show insights >0.6)
- Provide actionable, gentle suggestions
- Remind users to consult professionals for health concerns

You analyze mood and food patterns to help users understand potential relationships between their eating habits and emotional well-being.`;

    // Prepare mood summary
    const moodSummary = summarizeMoods(moods);
    const foodSummary = summarizeFoodLogs(foodLogs);

    const prompt = `Analyze mood and food patterns for the past ${moods.length} mood entries and ${foodLogs.length} meals.

**Mood Data Summary:**
${JSON.stringify(moodSummary, null, 2)}

**Food Data Summary:**
${JSON.stringify(foodSummary, null, 2)}

Provide 3-5 insights focusing on:
1. Meal-mood correlations (e.g., "You tend to feel stressed after high-carb meals")
2. Energy patterns (e.g., "Caffeine appears to correlate with anxiety spikes")
3. Meal timing effects (e.g., "Skipping lunch often leads to irritability")
4. NOVA score impact on mood
5. Macro balance and emotional stability

Return JSON with ONLY high-confidence insights (>0.6):
{
  "insights": [
    {
      "type": "Meal-Mood Pattern" | "Energy Pattern" | "Meal Timing" | "NOVA Impact" | "Macro Balance",
      "title": "Brief insight title (5-8 words)",
      "message": "Clear insight with probabilistic language (1-2 sentences)",
      "confidence": 0.0-1.0,
      "suggestions": ["Actionable suggestion 1", "Actionable suggestion 2"],
      "relatedData": {
        "moodTrigger": "stressed" | "happy" | etc.,
        "foodPattern": "high-carb" | "low-protein" | etc.
      }
    }
  ]
}`;

    const response = await openai.chatCompletionJSON(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      {
        model: "gpt-4o-mini", // 85% cheaper, still excellent quality for v1
        temperature: 0.3, // Low temperature for consistent, factual analysis
      }
    );

    // chatCompletionJSON already returns parsed JSON
    const result = response;

    // Filter insights by confidence threshold
    const highConfidenceInsights = result.insights.filter(
      (insight) => insight.confidence >= 0.6
    );

    console.log(
      `[MoodInsights] Generated ${highConfidenceInsights.length} high-confidence insights for user ${userId}`
    );

    return highConfidenceInsights;
  } catch (error) {
    console.error("[MoodInsights] AI generation failed:", error);

    // Fallback to rule-based insights if AI fails
    return generateRuleBasedInsights(moods, foodLogs);
  }
}

/**
 * Analyze mood-meal correlation after a new mood entry
 * This function updates the correlation cache table
 *
 * @param {string} userId - User ID
 * @param {object} moodEntry - New mood entry
 */
export async function analyzeMoodMealCorrelation(userId, moodEntry) {
  try {
    const { mealContext, mood, intensity, energyLevel } = moodEntry;

    // Skip if no meal context
    if (!mealContext || !mealContext.mealIds || mealContext.mealIds.length === 0) {
      console.log(`[MoodCorrelation] No meal context for mood entry ${moodEntry.id}`);
      return;
    }

    // Fetch full meal details from mealIds
    const { foodLogTable } = await import("../db/schema.js");
    const { inArray } = await import("drizzle-orm");

    const meals = await db
      .select()
      .from(foodLogTable)
      .where(inArray(foodLogTable.id, mealContext.mealIds));

    if (meals.length === 0) {
      console.log(`[MoodCorrelation] No meals found for IDs: ${mealContext.mealIds}`);
      return;
    }

    // Calculate meal pattern averages
    const avgCarbs = meals.reduce((sum, m) => sum + (m.carbs || 0), 0) / meals.length;
    const avgProtein = meals.reduce((sum, m) => sum + (m.protein || 0), 0) / meals.length;
    const avgFat = meals.reduce((sum, m) => sum + (m.fats || 0), 0) / meals.length;
    const avgNova = meals.reduce((sum, m) => sum + (m.novaScore || 1), 0) / meals.length;

    const mealPattern = {
      avgCarbs: Math.round(avgCarbs * 10) / 10,
      avgProtein: Math.round(avgProtein * 10) / 10,
      avgFat: Math.round(avgFat * 10) / 10,
      avgNova: Math.round(avgNova * 10) / 10,
      mealCount: meals.length,
    };

    // Simple correlation strength calculation (rule-based)
    // This is a basic implementation - can be enhanced with statistical analysis
    let strength = 0.5; // Default moderate correlation

    // Adjust strength based on patterns
    if (mood === "stressed" && avgCarbs > 50) strength = 0.7;
    if (mood === "energized" && avgProtein > 30) strength = 0.75;
    if (mood === "tired" && avgCarbs > 60) strength = 0.8;
    if (mood === "happy" && avgNova < 2) strength = 0.65;
    if (mood === "calm" && avgFat > 20 && avgFat < 40) strength = 0.7;

    const confidence = Math.min(0.9, 0.5 + (meals.length * 0.1)); // More meals = higher confidence

    // Upsert correlation to cache table
    // Check if similar pattern exists
    const { sql: sqlTag } = await import("drizzle-orm");

    const existingCorrelation = await db
      .select()
      .from(moodMealCorrelationsTable)
      .where(eq(moodMealCorrelationsTable.userId, userId))
      .limit(100); // Get recent correlations to find similar patterns

    // Find similar pattern (within 10% of each macro)
    const similar = existingCorrelation.find(corr => {
      const pattern = corr.mealPattern;
      return (
        Math.abs(pattern.avgCarbs - mealPattern.avgCarbs) < 5 &&
        Math.abs(pattern.avgProtein - mealPattern.avgProtein) < 5 &&
        Math.abs(pattern.avgFat - mealPattern.avgFat) < 5 &&
        corr.moodPattern === mood
      );
    });

    if (similar) {
      // Update occurrences and recalculate strength
      const newOccurrences = similar.occurrences + 1;
      const newStrength = Math.min(0.95, similar.strength + 0.05); // Increase confidence with more occurrences

      await db
        .update(moodMealCorrelationsTable)
        .set({
          occurrences: newOccurrences,
          strength: newStrength.toString(),
          confidence: Math.min(0.9, confidence + 0.05).toString(),
          lastAnalyzedAt: new Date(),
        })
        .where(eq(moodMealCorrelationsTable.id, similar.id));

      console.log(
        `[MoodCorrelation] Updated correlation ${similar.id}: ${mood} + ${JSON.stringify(mealPattern)} (occurrences: ${newOccurrences})`
      );
    } else {
      // Create new correlation entry
      await db.insert(moodMealCorrelationsTable).values({
        userId,
        mealPattern,
        moodPattern: mood,
        strength: strength.toString(),
        confidence: confidence.toString(),
        occurrences: 1,
        source: "rules", // Mark as rule-based (not AI-generated)
        version: "v1",
        lastAnalyzedAt: new Date(),
      });

      console.log(
        `[MoodCorrelation] Created new correlation: ${mood} + ${JSON.stringify(mealPattern)}`
      );
    }
  } catch (error) {
    console.error("[MoodCorrelation] Analysis failed:", error);
    // Don't throw - correlation analysis is non-critical
  }
}

/**
 * Summarize mood data for AI analysis
 */
function summarizeMoods(moods) {
  // Handle empty array
  if (!moods || moods.length === 0) {
    return {
      totalEntries: 0,
      moodDistribution: {},
      dominantMood: null,
      averageIntensity: 0,
      averageEnergy: 0,
    };
  }

  const moodCounts = {};
  let totalIntensity = 0;
  let totalEnergy = 0;

  moods.forEach((mood) => {
    moodCounts[mood.mood] = (moodCounts[mood.mood] || 0) + 1;
    totalIntensity += mood.intensity || 5;
    totalEnergy += mood.energyLevel || 5;
  });

  const avgIntensity = totalIntensity / moods.length;
  const avgEnergy = totalEnergy / moods.length;

  // Find dominant mood (safe with empty check above)
  const dominantMood = Object.keys(moodCounts).reduce((a, b) =>
    moodCounts[a] > moodCounts[b] ? a : b
  );

  return {
    totalEntries: moods.length,
    moodDistribution: moodCounts,
    dominantMood,
    averageIntensity: Math.round(avgIntensity * 10) / 10,
    averageEnergy: Math.round(avgEnergy * 10) / 10,
  };
}

/**
 * Summarize food log data for AI analysis
 */
function summarizeFoodLogs(foodLogs) {
  // Handle empty array
  if (!foodLogs || foodLogs.length === 0) {
    return {
      totalMeals: 0,
      avgDailyCarbs: 0,
      avgDailyProtein: 0,
      avgDailyFat: 0,
      avgDailyCalories: 0,
      avgNovaScore: 0,
    };
  }

  let totalCarbs = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCalories = 0;
  let novaScores = [];

  foodLogs.forEach((food) => {
    totalCarbs += food.carbs || 0;
    totalProtein += food.protein || 0;
    totalFat += food.fats || 0;
    totalCalories += food.calories || 0;
    if (food.novaScore) novaScores.push(food.novaScore);
  });

  const avgNova =
    novaScores.length > 0
      ? novaScores.reduce((sum, val) => sum + val, 0) / novaScores.length
      : 1;

  return {
    totalMeals: foodLogs.length,
    avgDailyCarbs: Math.round((totalCarbs / foodLogs.length) * 10) / 10,
    avgDailyProtein: Math.round((totalProtein / foodLogs.length) * 10) / 10,
    avgDailyFat: Math.round((totalFat / foodLogs.length) * 10) / 10,
    avgDailyCalories: Math.round(totalCalories / foodLogs.length),
    avgNovaScore: Math.round(avgNova * 10) / 10,
  };
}

/**
 * 💰 ENHANCED rule-based insights (FREE alternative to AI)
 * Covers 90% of common patterns - AI only needed for complex cases
 */
function generateRuleBasedInsights(moods, foodLogs) {
  const insights = [];
  const moodSummary = summarizeMoods(moods);
  const foodSummary = summarizeFoodLogs(foodLogs);

  // Pattern 1: High carb → Energy crashes
  if (foodSummary.avgDailyCarbs > 150 && moodSummary.averageEnergy < 5) {
    insights.push({
      type: "Meal-Mood Pattern",
      title: "High Carb Intake and Energy Dips",
      message: "You tend to feel lower energy on days with high carbohydrate intake. This may be related to blood sugar fluctuations.",
      confidence: 0.75,
      suggestions: [
        "Try pairing carbs with protein to stabilize energy",
        "Consider smaller, more frequent meals instead of large carb-heavy ones",
      ],
      relatedData: { moodTrigger: "tired", foodPattern: "high-carb" },
    });
  }

  // Pattern 2: Ultra-processed foods → Stress/anxiety
  if (foodSummary.avgNovaScore > 3 && (moodSummary.dominantMood === "stressed" || moodSummary.dominantMood === "sad")) {
    insights.push({
      type: "NOVA Impact",
      title: "Processed Foods May Affect Mood",
      message: "You appear to feel more stressed when eating ultra-processed foods (NOVA 3-4). Whole foods may help stabilize mood.",
      confidence: 0.70,
      suggestions: [
        "Try adding one whole food meal per day (NOVA 1-2)",
        "Swap one processed snack for fresh fruit or nuts this week",
      ],
      relatedData: { moodTrigger: "stressed", foodPattern: "high-nova" },
    });
  }

  // Pattern 3: Low protein → Mood instability
  if (foodSummary.avgDailyProtein < 50 && moodSummary.averageIntensity < 5) {
    insights.push({
      type: "Macro Balance",
      title: "Protein May Support Mood Stability",
      message: "You tend to experience lower mood intensity with lower protein intake. Adequate protein often supports stable mood.",
      confidence: 0.72,
      suggestions: [
        "Aim for 20-30g of protein per meal",
        "Try protein-rich snacks: Greek yogurt, eggs, or nuts",
      ],
      relatedData: { moodTrigger: "neutral", foodPattern: "low-protein" },
    });
  }

  // Pattern 4: High protein → Better energy
  if (foodSummary.avgDailyProtein > 80 && moodSummary.averageEnergy > 6.5) {
    insights.push({
      type: "Macro Balance",
      title: "Protein Intake Correlates with Energy",
      message: "You tend to feel more energized on days with higher protein intake. Keep up this pattern!",
      confidence: 0.78,
      suggestions: [
        "Continue prioritizing protein in your meals",
        "Track which protein sources make you feel best",
      ],
      relatedData: { moodTrigger: "energized", foodPattern: "high-protein" },
    });
  }

  // Pattern 5: Whole foods → Positive mood
  if (foodSummary.avgNovaScore < 2 && moodSummary.averageIntensity > 6.5) {
    insights.push({
      type: "NOVA Impact",
      title: "Whole Foods Support Positive Mood",
      message: "You often feel better when eating minimally processed foods. This is an excellent pattern!",
      confidence: 0.80,
      suggestions: [
        "Keep prioritizing whole foods in your diet",
        "Notice which whole foods boost your mood most",
      ],
      relatedData: { moodTrigger: "happy", foodPattern: "low-nova" },
    });
  }

  // Pattern 6: High fat → Calm/relaxed
  if (foodSummary.avgDailyFat > 60 && moodSummary.dominantMood === "calm") {
    insights.push({
      type: "Macro Balance",
      title: "Healthy Fats May Promote Calmness",
      message: "You tend to feel calmer on days with moderate-to-high healthy fat intake. This appears to support your mood.",
      confidence: 0.68,
      suggestions: [
        "Continue including healthy fats: avocado, nuts, olive oil",
        "Balance fats with protein and fiber for sustained calm",
      ],
      relatedData: { moodTrigger: "calm", foodPattern: "moderate-fat" },
    });
  }

  // Pattern 7: Low calorie → Low energy/mood
  if (foodSummary.avgDailyCalories < 1500 && moodSummary.averageEnergy < 4.5) {
    insights.push({
      type: "Energy Pattern",
      title: "Low Calorie Intake May Affect Energy",
      message: "You tend to feel tired when eating fewer calories. Your body may need more fuel for optimal energy.",
      confidence: 0.75,
      suggestions: [
        "Gradually increase calories with nutrient-dense foods",
        "Focus on adding healthy proteins and fats",
      ],
      relatedData: { moodTrigger: "tired", foodPattern: "low-calorie" },
    });
  }

  // Pattern 8: Balanced macros → Stable mood
  const proteinPercent = (foodSummary.avgDailyProtein * 4) / foodSummary.avgDailyCalories;
  const carbPercent = (foodSummary.avgDailyCarbs * 4) / foodSummary.avgDailyCalories;
  const fatPercent = (foodSummary.avgDailyFat * 9) / foodSummary.avgDailyCalories;

  if (proteinPercent > 0.25 && proteinPercent < 0.35 &&
      carbPercent > 0.35 && carbPercent < 0.50 &&
      fatPercent > 0.20 && fatPercent < 0.35 &&
      moodSummary.averageIntensity > 6) {
    insights.push({
      type: "Macro Balance",
      title: "Balanced Macros Support Mood Stability",
      message: "Your balanced macro intake (protein, carbs, fats) appears to correlate with better mood. Excellent work!",
      confidence: 0.82,
      suggestions: [
        "Maintain this balanced macro ratio",
        "Use this as your baseline when planning meals",
      ],
      relatedData: { moodTrigger: "happy", foodPattern: "balanced" },
    });
  }

  // Return top 3-5 insights by confidence
  return insights
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}
