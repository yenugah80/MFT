/**
 * Recommendation Resolver Service
 *
 * Maps generic intents from orchestrator (e.g., "improve mood", "better sleep")
 * to specific, personalized food recommendations based on:
 * - User's dietary preferences and allergies
 * - Nutritional profile
 * - Correlation evidence
 * - Previous accepted recommendations
 *
 * Resolves abstract health intents into concrete, actionable food suggestions.
 */

import { db } from '../db/index.js';
import {
  foodLogTable,
  userCorrelationsTable,
  recommendationsHistoryTable,
  dietaryPreferencesTable,
  userPortionPreferencesTable,
  profilesTable,
} from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { openaiClient } from './apiClients/OpenAIClient.js';

/**
 * Resolve a generic intent to specific food recommendations
 *
 * @param {string} userId - User ID
 * @param {string} intent - Generic intent (e.g., "improve sleep", "reduce fatigue")
 * @param {number} count - Number of recommendations (default: 3)
 * @returns {Promise<Array>} Resolved food recommendations
 */
export async function resolveIntent(userId, intent, count = 3) {
  try {
    // 1. Fetch user's dietary constraints
    const dietaryPrefs = await db
      .select()
      .from(dietaryPreferencesTable)
      .where(eq(dietaryPreferencesTable.userId, userId))
      .then((rows) => rows[0]);

    const allergies = dietaryPrefs?.allergies || [];
    const dislikes = dietaryPrefs?.dislikes || [];

    // 2. Fetch user's profile for personalization
    const userProfile = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .then((rows) => rows[0]);

    // 3. Fetch relevant correlations for this intent
    const correlations = await db
      .select()
      .from(userCorrelationsTable)
      .where(
        and(
          eq(userCorrelationsTable.userId, userId),
          sql`${userCorrelationsTable.tags}::text ILIKE ${'%' + intent.split(' ')[0] + '%'}`
        )
      )
      .orderBy(desc(userCorrelationsTable.confidence))
      .limit(5);

    // 4. Fetch recently accepted recommendations (to avoid repetition)
    const recentlyAccepted = await db
      .select()
      .from(recommendationsHistoryTable)
      .where(
        and(
          eq(recommendationsHistoryTable.userId, userId),
          sql`${recommendationsHistoryTable.accepted} = true`,
          sql`${recommendationsHistoryTable.createdAt} > NOW() - INTERVAL '30 days'`
        )
      )
      .orderBy(desc(recommendationsHistoryTable.createdAt))
      .limit(20);

    const acceptedFoods = recentlyAccepted.map((r) => r.foodName.toLowerCase());

    // 5. Use AI to generate specific foods for this intent
    const aiPrompt = buildResolverPrompt(
      intent,
      correlations,
      allergies,
      dislikes,
      acceptedFoods,
      userProfile
    );

    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a nutritionist AI helping resolve health intents to specific foods.
Return a JSON array of ${count} foods that help with "${intent}".
Each food must:
1. Be specific (e.g., "almonds" not "nuts")
2. Respect allergies and dislikes
3. Be different from recently accepted foods
4. Include scientific reasoning
Format: [{"food": "name", "reason": "why", "quantity": "serving", "timing": "when"}]`,
        },
        {
          role: 'user',
          content: aiPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const aiContent = response.choices[0].message.content;
    const recommendedFoods = parseAIRecommendations(aiContent, count);

    // 6. Rank by correlation strength if applicable
    const rankedFoods = rankRecommendations(
      recommendedFoods,
      correlations,
      acceptedFoods
    );

    // 7. Store resolution for tracking
    await storeResolution(userId, intent, rankedFoods);

    return rankedFoods.slice(0, count);
  } catch (error) {
    console.error('Error resolving intent:', error);
    // Fallback to generic intent handling
    return getFallbackRecommendations(intent, count);
  }
}

/**
 * Build AI prompt for intent resolution
 */
function buildResolverPrompt(
  intent,
  correlations,
  allergies,
  dislikes,
  acceptedFoods,
  profile
) {
  const intentDetails = `Intent: ${intent}`;

  const correlationContext =
    correlations.length > 0
      ? `User's relevant patterns:\n${correlations
          .slice(0, 3)
          .map((c) => `- ${c.pattern}: ${(c.confidence * 100).toFixed(0)}% confidence`)
          .join('\n')}`
      : 'No specific patterns identified yet.';

  const constraints = `Dietary Constraints:
Allergies: ${allergies.length > 0 ? allergies.join(', ') : 'None'}
Dislikes: ${dislikes.length > 0 ? dislikes.join(', ') : 'None'}
Already suggested recently: ${acceptedFoods.length > 0 ? acceptedFoods.slice(0, 5).join(', ') : 'None'}`;

  const personalization = profile
    ? `User profile: ${profile.age}-year-old, ${profile.activityLevel} activity level, region: ${profile.region || 'Not specified'}`
    : '';

  return `${intentDetails}

${correlationContext}

${constraints}

${personalization}

Provide 3 diverse food recommendations that address this intent.`;
}

/**
 * Parse AI-generated recommendations
 */
function parseAIRecommendations(content, count) {
  try {
    // Try to extract JSON from AI response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error parsing AI recommendations:', error);
    return [];
  }
}

/**
 * Rank recommendations by correlation strength
 */
function rankRecommendations(foods, correlations, acceptedFoods) {
  return foods.map((food) => {
    let score = 1.0;

    // Penalize if recently accepted
    if (acceptedFoods.includes(food.food.toLowerCase())) {
      score *= 0.3;
    }

    // Boost if mentioned in correlations
    const correlationMatch = correlations.find((c) =>
      c.foodName?.toLowerCase().includes(food.food.toLowerCase())
    );
    if (correlationMatch) {
      score *= 1.0 + correlationMatch.confidence;
    }

    return {
      ...food,
      resolverScore: score,
    };
  });
}

/**
 * Store resolution for audit trail and learning
 */
async function storeResolution(userId, intent, recommendations) {
  try {
    // Could store in a resolutions_history table if needed for audit trail
    // For now, this is a hook for future logging
    console.log(
      `Resolved intent "${intent}" to ${recommendations.length} foods for user ${userId}`
    );
  } catch (error) {
    console.error('Error storing resolution:', error);
  }
}

/**
 * Fallback recommendations for common intents
 */
function getFallbackRecommendations(intent, count) {
  const fallbacks = {
    sleep: [
      { food: 'almonds', reason: 'Rich in magnesium', quantity: '1 oz', timing: '1 hour before bed' },
      { food: 'warm milk', reason: 'Contains tryptophan', quantity: '1 cup', timing: '30 minutes before bed' },
      { food: 'chamomile tea', reason: 'Calming effects', quantity: '1 cup', timing: 'Before bed' },
    ],
    energy: [
      { food: 'banana', reason: 'Natural sugars and potassium', quantity: '1 medium', timing: 'Morning' },
      { food: 'greek yogurt', reason: 'High protein', quantity: '150g', timing: 'Breakfast' },
      { food: 'dark chocolate', reason: 'Caffeine and antioxidants', quantity: '1 oz', timing: 'Afternoon' },
    ],
    mood: [
      { food: 'salmon', reason: 'Omega-3 fatty acids', quantity: '100g', timing: 'Lunch/dinner' },
      { food: 'berries', reason: 'Antioxidants and dopamine', quantity: '1 cup', timing: 'Anytime' },
      { food: 'dark leafy greens', reason: 'Folate and B vitamins', quantity: '1 cup', timing: 'Any meal' },
    ],
    focus: [
      { food: 'eggs', reason: 'Choline for brain', quantity: '2 eggs', timing: 'Breakfast' },
      { food: 'walnuts', reason: 'Omega-3 and antioxidants', quantity: '1 oz', timing: 'Snack' },
      { food: 'blueberries', reason: 'Brain health anthocyanins', quantity: '1 cup', timing: 'Anytime' },
    ],
  };

  // Find best match for intent
  const key = Object.keys(fallbacks).find((k) => intent.toLowerCase().includes(k));
  const recommendations = fallbacks[key] || fallbacks.mood; // default to mood

  return recommendations.slice(0, count);
}

/**
 * Get resolver confidence
 * Indicates how confident the resolver is about this recommendation set
 */
export function getResolverConfidence(recommendations, intent) {
  if (!recommendations || recommendations.length === 0) {
    return 0; // No recommendations = no confidence
  }

  const avgScore = recommendations.reduce((sum, r) => sum + (r.resolverScore || 1), 0) / recommendations.length;

  return Math.min(1, avgScore);
}
