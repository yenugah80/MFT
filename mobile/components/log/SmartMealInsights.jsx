/**
 * SmartMealInsights - AI-Powered Personalized Meal Analysis
 *
 * Transforms raw nutrition data into actionable, personalized insights.
 * Goes beyond showing numbers to explain WHAT the meal means for the user.
 *
 * Features:
 * - Personalized health insights based on user goals
 * - Meal score breakdown with justification
 * - Nutrient density analysis
 * - Comparison with user's historical patterns
 * - Actionable improvement suggestions
 * - Ingredient quality analysis (NOVA, additives)
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  TEXT,
  SURFACES,
  BRAND,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SEMANTIC,
} from '../../constants/premiumTheme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSIGHT GENERATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Estimate glycemic load based on carb content, fiber, and sugar ratio
 * Research-backed: GL = (GI × available carbs) / 100
 * We estimate GI from fiber:sugar ratio as a proxy
 */
const estimateGlycemicImpact = (carbs, fiber, sugar) => {
  if (carbs <= 0) return { level: 'minimal', score: 0 };

  // Available carbs = total carbs - fiber (fiber doesn't spike blood sugar)
  const availableCarbs = Math.max(0, carbs - fiber);

  // Estimate GI based on sugar ratio (higher sugar = higher GI)
  // Fiber lowers GI significantly
  const sugarRatio = carbs > 0 ? (sugar / carbs) : 0;
  const fiberRatio = carbs > 0 ? (fiber / carbs) : 0;

  // Estimated GI: Base 55 (medium), adjusted by composition
  let estimatedGI = 55;
  estimatedGI += sugarRatio * 35;  // High sugar increases GI
  estimatedGI -= fiberRatio * 25;  // High fiber decreases GI
  estimatedGI = Math.max(20, Math.min(90, estimatedGI)); // Clamp 20-90

  // Glycemic Load = (GI × available carbs) / 100
  const glycemicLoad = (estimatedGI * availableCarbs) / 100;

  // GL categories (Harvard Health): Low ≤10, Medium 11-19, High ≥20
  let level = 'low';
  if (glycemicLoad > 20) level = 'high';
  else if (glycemicLoad > 10) level = 'medium';

  return { level, score: Math.round(glycemicLoad), estimatedGI: Math.round(estimatedGI) };
};

/**
 * Detect ultra-processed foods based on NOVA classification indicators
 * NOVA Group 4 (ultra-processed) markers: high sodium, high sugar, low fiber, certain additives
 * Research: Monteiro CA et al. NOVA classification system
 */
const detectProcessingLevel = (meal, macros) => {
  const calories = macros.calories_kcal || macros.calories || 0;
  const fiber = macros.fiber_g || macros.fiber || 0;
  const sugar = macros.sugar_g || macros.sugar || 0;
  const sodium = macros.sodium_mg || macros.sodium || 0;
  const protein = macros.protein_g || macros.protein || 0;

  if (calories <= 0) return { level: 1, classification: 'unprocessed' };

  // NOVA classification scoring heuristics
  let processingScore = 0;

  // High sodium:calorie ratio suggests processing
  const sodiumPer100cal = calories > 0 ? (sodium / calories) * 100 : 0;
  if (sodiumPer100cal > 200) processingScore += 3;
  else if (sodiumPer100cal > 100) processingScore += 2;

  // High sugar:carb ratio suggests added sugars
  const carbs = macros.carbs_g || macros.carbs || 0;
  const sugarToCarb = carbs > 0 ? (sugar / carbs) : 0;
  if (sugarToCarb > 0.5 && sugar > 10) processingScore += 2;

  // Low fiber relative to carbs suggests refined
  const fiberToCarb = carbs > 0 ? (fiber / carbs) : 0;
  if (fiberToCarb < 0.05 && carbs > 20) processingScore += 2;

  // Very low protein suggests highly processed snacks/sweets
  const proteinPercent = calories > 0 ? ((protein * 4) / calories) * 100 : 0;
  if (proteinPercent < 5 && calories > 200) processingScore += 1;

  // Check food name for ultra-processed indicators
  // Use word boundaries to avoid false positives (e.g., "fish and chips" shouldn't match "chips")
  const foodName = (meal.name || meal.foodName || '').toLowerCase();
  const ultraProcessedKeywords = [
    'potato chips', 'tortilla chips', 'corn chips', // Specific chip types
    'soda', 'cola', 'energy drink',
    'candy', 'gummy', 'gummies',
    'cookies', 'oreo', 'biscuit',
    'cake', 'cupcake', 'brownie',
    'donut', 'doughnut',
    'hot dog', 'hotdog',
    'chicken nuggets', 'nuggets',
    'french fries',
    'instant noodles', 'instant ramen',
    'frozen pizza', 'microwave',
    'ice cream', 'gelato',
    'cereal bar', 'protein bar', // Many are ultra-processed
  ];
  // Only add score if a specific ultra-processed term matches
  if (ultraProcessedKeywords.some(kw => foodName.includes(kw))) {
    processingScore += 2;
  }

  // NOVA classification based on score
  // 1: Unprocessed/minimally processed, 2: Processed culinary ingredients
  // 3: Processed foods, 4: Ultra-processed
  let novaLevel = 1;
  let classification = 'minimally processed';

  if (processingScore >= 5) {
    novaLevel = 4;
    classification = 'ultra-processed';
  } else if (processingScore >= 3) {
    novaLevel = 3;
    classification = 'processed';
  } else if (processingScore >= 1) {
    novaLevel = 2;
    classification = 'lightly processed';
  }

  return { level: novaLevel, classification, score: processingScore };
};

/**
 * Generate personalized insights based on meal data and user context
 */
const generateInsights = (meal, userGoals, historicalData) => {
  const insights = [];
  const macros = meal.macros || meal.nutrition || {};
  const calories = macros.calories_kcal || macros.calories || 0;
  const protein = macros.protein_g || macros.protein || 0;
  const carbs = macros.carbs_g || macros.carbs || 0;
  const fat = macros.fat_g || macros.fat || 0;
  const fiber = macros.fiber_g || macros.fiber || 0;
  const sugar = macros.sugar_g || macros.sugar || 0;
  const sodium = macros.sodium_mg || macros.sodium || 0;

  // Historical averages for personalized comparisons
  const weeklyAvg = historicalData?.weeklyAverage || {};
  const hasHistory = weeklyAvg.calories > 0;

  // Calculate key ratios
  const proteinCalories = protein * 4;
  const carbCalories = carbs * 4;
  const fatCalories = fat * 9;
  const totalMacroCalories = proteinCalories + carbCalories + fatCalories;

  const proteinPercent = totalMacroCalories > 0 ? (proteinCalories / totalMacroCalories) * 100 : 0;
  const carbPercent = totalMacroCalories > 0 ? (carbCalories / totalMacroCalories) * 100 : 0;
  const fatPercent = totalMacroCalories > 0 ? (fatCalories / totalMacroCalories) * 100 : 0;

  // Nutrient density (nutrients per 100 kcal)
  const nutrientDensity = calories > 0 ? ((protein + fiber) / calories) * 100 : 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSONALIZED HISTORICAL COMPARISONS (Priority - show these first!)
  // ═══════════════════════════════════════════════════════════════════════════

  if (hasHistory && weeklyAvg.calories > 0) {
    const caloriesDiff = calories - weeklyAvg.calories;
    const caloriesPercent = Math.round((caloriesDiff / weeklyAvg.calories) * 100);

    if (Math.abs(caloriesPercent) >= 20) {
      insights.push({
        type: caloriesDiff > 0 ? 'neutral' : 'positive',
        category: 'comparison',
        icon: caloriesDiff > 0 ? 'trending-up-outline' : 'trending-down-outline',
        title: caloriesDiff > 0 ? 'Larger Than Usual' : 'Lighter Than Usual',
        message: caloriesDiff > 0
          ? `${Math.abs(caloriesPercent)}% more calories than your weekly average (${weeklyAvg.calories} cal).`
          : `${Math.abs(caloriesPercent)}% fewer calories than your weekly average (${weeklyAvg.calories} cal).`,
        detail: caloriesDiff > 0
          ? 'Consider if this aligns with your goals, or balance with lighter meals later.'
          : 'Great choice if you\'re managing calorie intake!',
        priority: 0,
      });
    }
  }

  if (hasHistory && weeklyAvg.protein > 0) {
    const proteinDiff = protein - weeklyAvg.protein;
    const proteinPercent = Math.round((proteinDiff / weeklyAvg.protein) * 100);

    if (proteinDiff > 10) {
      insights.push({
        type: 'positive',
        category: 'comparison',
        icon: 'barbell-outline',
        title: 'Protein Boost!',
        message: `${Math.round(proteinDiff)}g more protein than your usual meals (avg: ${weeklyAvg.protein}g).`,
        detail: 'Extra protein supports muscle recovery and keeps you satisfied longer.',
        priority: 0,
      });
    } else if (proteinDiff < -10 && protein < 15) {
      insights.push({
        type: 'suggestion',
        category: 'comparison',
        icon: 'barbell-outline',
        title: 'Below Your Usual Protein',
        message: `${Math.abs(Math.round(proteinDiff))}g less protein than average (you usually get ${weeklyAvg.protein}g).`,
        detail: 'Add eggs, Greek yogurt, or nuts to reach your usual protein intake.',
        priority: 1,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GLYCEMIC IMPACT INSIGHTS (Research-backed blood sugar prediction)
  // Note: Only show if sugar < 25g to avoid redundancy with high sugar warning
  // ═══════════════════════════════════════════════════════════════════════════

  // Track if we show glycemic warning to avoid duplicate sugar warnings later
  let showedGlycemicWarning = false;

  if (carbs > 15) {
    const glycemicImpact = estimateGlycemicImpact(carbs, fiber, sugar);

    if (glycemicImpact.level === 'high') {
      showedGlycemicWarning = true;
      insights.push({
        type: 'warning',
        category: 'glycemic',
        icon: 'pulse-outline',
        title: 'High Blood Sugar Impact',
        message: `Glycemic load ~${glycemicImpact.score}. May cause energy spike followed by crash.`,
        detail: `High carbs (${Math.round(carbs)}g) with limited fiber (${Math.round(fiber)}g). Pair with protein or take a short walk after eating to moderate blood sugar response.`,
        priority: 1,
      });
    } else if (glycemicImpact.level === 'medium' && sugar > 15) {
      insights.push({
        type: 'info',
        category: 'glycemic',
        icon: 'pulse-outline',
        title: 'Moderate Blood Sugar Impact',
        message: `Glycemic load ~${glycemicImpact.score}. Moderate energy response expected.`,
        detail: fiber >= 3
          ? `The ${Math.round(fiber)}g fiber helps slow sugar absorption.`
          : 'Adding fiber-rich foods can help stabilize energy levels.',
        priority: 3,
      });
    } else if (glycemicImpact.level === 'low' && carbs > 20) {
      insights.push({
        type: 'positive',
        category: 'glycemic',
        icon: 'pulse-outline',
        title: 'Steady Energy',
        message: `Low glycemic load (~${glycemicImpact.score}). Promotes stable blood sugar.`,
        detail: 'Good balance of fiber and complex carbs for sustained energy.',
        priority: 4,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NOVA PROCESSING LEVEL (Ultra-processed food detection)
  // ═══════════════════════════════════════════════════════════════════════════

  const processingInfo = detectProcessingLevel(meal, macros);

  if (processingInfo.level === 4) {
    insights.push({
      type: 'warning',
      category: 'processing',
      icon: 'warning-outline',
      title: 'Ultra-Processed Food',
      message: `High processing indicators detected. Linked to reduced satiety.`,
      detail: 'Studies show ultra-processed foods may lead to overeating. Consider whole food alternatives when possible.',
      priority: 1,
    });
  } else if (processingInfo.level === 1 && calories > 100) {
    insights.push({
      type: 'positive',
      category: 'processing',
      icon: 'leaf-outline',
      title: 'Whole Food Choice',
      message: 'Minimally processed - retains natural nutrients and fiber.',
      priority: 5,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROTEIN INSIGHTS (Fallback when no history)
  // ═══════════════════════════════════════════════════════════════════════════

  if (!hasHistory || weeklyAvg.protein === 0) {
    if (protein >= 30) {
      insights.push({
        type: 'positive',
        category: 'protein',
        icon: 'fitness-outline',
        title: 'Excellent Protein',
        message: `${Math.round(protein)}g protein supports muscle maintenance and keeps you full longer.`,
        detail: `This provides ${Math.round(proteinPercent)}% of calories from protein - ideal for satiety.`,
        priority: 1,
      });
    } else if (protein >= 20) {
      insights.push({
        type: 'neutral',
        category: 'protein',
        icon: 'fitness-outline',
        title: 'Good Protein Content',
        message: `${Math.round(protein)}g protein is a solid amount for this meal.`,
        priority: 3,
      });
    } else if (protein < 10 && calories > 200) {
      insights.push({
        type: 'suggestion',
        category: 'protein',
        icon: 'add-circle-outline',
        title: 'Low Protein',
        message: `Only ${Math.round(protein)}g protein. Consider adding eggs, chicken, or Greek yogurt.`,
        detail: 'Protein helps maintain stable blood sugar and prevents energy crashes.',
        priority: 2,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USER GOAL-BASED INSIGHTS
  // ═══════════════════════════════════════════════════════════════════════════

  if (userGoals?.dailyCalories > 0) {
    const caloriePercent = Math.round((calories / userGoals.dailyCalories) * 100);
    if (caloriePercent >= 40) {
      insights.push({
        type: 'info',
        category: 'goals',
        icon: 'pie-chart-outline',
        title: 'Significant Portion of Daily Goal',
        message: `This meal is ${caloriePercent}% of your ${userGoals.dailyCalories} cal daily target.`,
        detail: caloriePercent >= 50
          ? 'Plan lighter meals for the rest of the day to stay on track.'
          : 'You have room for 2-3 more balanced meals today.',
        priority: 1,
      });
    }
  }

  if (userGoals?.proteinG > 0 && protein > 0) {
    const proteinPercent = Math.round((protein / userGoals.proteinG) * 100);
    if (proteinPercent >= 30) {
      insights.push({
        type: 'positive',
        category: 'goals',
        icon: 'trophy-outline',
        title: 'Great Protein Progress',
        message: `${proteinPercent}% of your daily protein goal (${userGoals.proteinG}g) in one meal!`,
        priority: 2,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIBER INSIGHTS
  // ═══════════════════════════════════════════════════════════════════════════

  if (fiber >= 8) {
    insights.push({
      type: 'positive',
      category: 'fiber',
      icon: 'leaf-outline',
      title: 'High Fiber',
      message: `${Math.round(fiber)}g fiber supports gut health and blood sugar control.`,
      priority: 2,
    });
  } else if (fiber < 3 && calories > 300) {
    insights.push({
      type: 'suggestion',
      category: 'fiber',
      icon: 'leaf-outline',
      title: 'Add More Fiber',
      message: `Only ${Math.round(fiber)}g fiber. Try adding vegetables, whole grains, or legumes.`,
      detail: 'Adults need 25-30g fiber daily for optimal digestion.',
      priority: 3,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUGAR & CARB INSIGHTS
  // Skip high sugar warning if we already showed glycemic warning (avoid redundancy)
  // ═══════════════════════════════════════════════════════════════════════════

  const sugarToCarb = carbs > 0 ? (sugar / carbs) * 100 : 0;

  if (sugar > 25 && !showedGlycemicWarning) {
    insights.push({
      type: 'warning',
      category: 'sugar',
      icon: 'warning-outline',
      title: 'High Sugar Content',
      message: `${Math.round(sugar)}g sugar (${Math.round(sugarToCarb)}% of carbs). May cause energy spike and crash.`,
      detail: 'WHO recommends limiting added sugars to 25g daily.',
      priority: 1,
    });
  } else if (sugar < 5 && carbs > 20) {
    insights.push({
      type: 'positive',
      category: 'sugar',
      icon: 'checkmark-circle-outline',
      title: 'Low Sugar',
      message: `Only ${Math.round(sugar)}g sugar with ${Math.round(carbs)}g carbs - mostly complex carbohydrates.`,
      priority: 4,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SODIUM INSIGHTS
  // ═══════════════════════════════════════════════════════════════════════════

  if (sodium > 1000) {
    insights.push({
      type: 'warning',
      category: 'sodium',
      icon: 'water-outline',
      title: 'High Sodium',
      message: `${Math.round(sodium)}mg sodium (${Math.round((sodium / 2300) * 100)}% of daily limit). Stay hydrated!`,
      detail: 'High sodium meals can cause water retention and affect blood pressure.',
      priority: 1,
    });
  } else if (sodium > 600) {
    insights.push({
      type: 'neutral',
      category: 'sodium',
      icon: 'water-outline',
      title: 'Moderate Sodium',
      message: `${Math.round(sodium)}mg sodium - within typical meal range.`,
      priority: 5,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FAT QUALITY INSIGHTS
  // ═══════════════════════════════════════════════════════════════════════════

  if (fatPercent > 50) {
    insights.push({
      type: 'neutral',
      category: 'fat',
      icon: 'flame-outline',
      title: 'High Fat Meal',
      message: `${Math.round(fatPercent)}% of calories from fat. Great for satiety, slower digestion.`,
      detail: fat > 20 ? 'Consider the source - unsaturated fats from nuts, fish, olive oil are beneficial.' : undefined,
      priority: 3,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NUTRIENT DENSITY
  // ═══════════════════════════════════════════════════════════════════════════

  if (nutrientDensity > 5) {
    insights.push({
      type: 'positive',
      category: 'density',
      icon: 'diamond-outline',
      title: 'Nutrient Dense',
      message: 'High nutrients relative to calories - excellent choice for your goals.',
      priority: 2,
    });
  } else if (nutrientDensity < 2 && calories > 400) {
    insights.push({
      type: 'suggestion',
      category: 'density',
      icon: 'trending-up-outline',
      title: 'Low Nutrient Density',
      message: 'This meal is calorie-heavy with fewer nutrients. Consider adding vegetables.',
      priority: 2,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MEAL TIMING INSIGHTS (Enhanced with eating window context)
  // ═══════════════════════════════════════════════════════════════════════════

  const hour = new Date().getHours();

  // Late night eating (affects sleep, digestion, weight)
  if (hour >= 21 && calories > 500) {
    insights.push({
      type: 'info',
      category: 'timing',
      icon: 'moon-outline',
      title: 'Late Night Meal',
      message: 'Eating heavy meals late may affect sleep quality and metabolism.',
      detail: 'Research shows finishing meals 2-3 hours before bed improves sleep and next-day energy.',
      priority: 2,
    });
  } else if (hour >= 22 && calories > 200) {
    insights.push({
      type: 'info',
      category: 'timing',
      icon: 'moon-outline',
      title: 'Late Night Snack',
      message: 'Late eating may reduce overnight fat burning.',
      detail: 'Your body naturally shifts to fat-burning mode during sleep; eating late can interrupt this.',
      priority: 4,
    });
  }

  // Early eating window (beneficial for circadian rhythm)
  if (hour >= 6 && hour <= 10 && calories > 300) {
    insights.push({
      type: 'positive',
      category: 'timing',
      icon: 'sunny-outline',
      title: 'Good Timing',
      message: 'Morning meals align well with your circadian rhythm.',
      detail: 'Eating earlier in the day supports better metabolic function and energy levels.',
      priority: 5,
    });
  }

  // Long gap detection (for those tracking eating windows)
  // Only show fasting insights for gaps up to 48 hours (beyond that, data may be stale/irrelevant)
  if (historicalData?.lastMealTime) {
    const lastMealDate = new Date(historicalData.lastMealTime);
    const hoursSinceLastMeal = (Date.now() - lastMealDate.getTime()) / (1000 * 60 * 60);

    // Only show fasting insights for reasonable time windows (up to 48 hours)
    if (hoursSinceLastMeal >= 12 && hoursSinceLastMeal <= 16) {
      insights.push({
        type: 'positive',
        category: 'timing',
        icon: 'timer-outline',
        title: 'Extended Fasting Window',
        message: `${Math.round(hoursSinceLastMeal)} hours since last meal - within intermittent fasting range.`,
        detail: '12-16 hour fasting windows may support metabolic health and cellular repair.',
        priority: 3,
      });
    } else if (hoursSinceLastMeal > 16 && hoursSinceLastMeal <= 48) {
      insights.push({
        type: 'info',
        category: 'timing',
        icon: 'timer-outline',
        title: 'Extended Fast',
        message: `${Math.round(hoursSinceLastMeal)} hours since last meal. Breaking your fast now.`,
        detail: 'Start with easily digestible foods if fasting for extended periods.',
        priority: 2,
      });
    }
    // Skip fasting insights if > 48 hours (likely incomplete logging, not actual fasting)
  }

  // Meal frequency context
  if (historicalData?.mealsToday !== undefined) {
    const mealsToday = historicalData.mealsToday;
    if (mealsToday >= 6 && hour < 18) {
      insights.push({
        type: 'info',
        category: 'timing',
        icon: 'restaurant-outline',
        title: 'Frequent Eating Pattern',
        message: `This is meal #${mealsToday + 1} today. Consider if you're eating from hunger or habit.`,
        detail: 'Mindful eating helps distinguish true hunger from emotional or habitual eating.',
        priority: 3,
      });
    }
  }

  // Sort by priority
  insights.sort((a, b) => a.priority - b.priority);

  return insights.slice(0, 5); // Return top 5 insights
};

/**
 * Generate meal score breakdown
 */
const generateScoreBreakdown = (meal) => {
  const macros = meal.macros || meal.nutrition || {};
  const healthScore = meal.healthScore || meal.mealScore || 0;
  const nutriScore = meal.nutriScore || meal.nutriScoreValue;

  const breakdown = [];
  const protein = macros.protein_g || macros.protein || 0;
  const fiber = macros.fiber_g || macros.fiber || 0;
  const sugar = macros.sugar_g || macros.sugar || 0;
  const sodium = macros.sodium_mg || macros.sodium || 0;
  const calories = macros.calories_kcal || macros.calories || 0;

  // Protein score contribution
  const proteinScore = Math.min(protein / 30, 1) * 25;
  breakdown.push({
    label: 'Protein',
    score: Math.round(proteinScore),
    maxScore: 25,
    status: proteinScore >= 20 ? 'excellent' : proteinScore >= 12 ? 'good' : 'needs_work',
    tip: protein < 15 ? 'Add lean protein' : null,
  });

  // Fiber score contribution
  const fiberScore = Math.min(fiber / 8, 1) * 20;
  breakdown.push({
    label: 'Fiber',
    score: Math.round(fiberScore),
    maxScore: 20,
    status: fiberScore >= 15 ? 'excellent' : fiberScore >= 10 ? 'good' : 'needs_work',
    tip: fiber < 5 ? 'Add vegetables or whole grains' : null,
  });

  // Sugar penalty
  const sugarPenalty = Math.min(sugar / 25, 1) * 20;
  const sugarScore = 20 - sugarPenalty;
  breakdown.push({
    label: 'Sugar',
    score: Math.round(sugarScore),
    maxScore: 20,
    status: sugarScore >= 15 ? 'excellent' : sugarScore >= 10 ? 'good' : 'needs_work',
    tip: sugar > 15 ? 'Reduce added sugars' : null,
    isNegative: true,
  });

  // Sodium penalty
  const sodiumPenalty = Math.min(sodium / 1500, 1) * 15;
  const sodiumScore = 15 - sodiumPenalty;
  breakdown.push({
    label: 'Sodium',
    score: Math.round(sodiumScore),
    maxScore: 15,
    status: sodiumScore >= 12 ? 'excellent' : sodiumScore >= 8 ? 'good' : 'needs_work',
    tip: sodium > 800 ? 'Choose low-sodium options' : null,
    isNegative: true,
  });

  // Balance score
  const totalMacroCals = (protein * 4) + ((macros.carbs_g || macros.carbs || 0) * 4) + ((macros.fat_g || macros.fat || 0) * 9);
  const proteinPct = totalMacroCals > 0 ? (protein * 4 / totalMacroCals) * 100 : 0;
  const isBalanced = proteinPct >= 15 && proteinPct <= 35;
  const balanceScore = isBalanced ? 20 : 10;
  breakdown.push({
    label: 'Balance',
    score: balanceScore,
    maxScore: 20,
    status: isBalanced ? 'excellent' : 'good',
    tip: !isBalanced ? 'Aim for balanced macros' : null,
  });

  return breakdown;
};

/**
 * Generate improvement suggestions
 */
const generateImprovements = (meal) => {
  const improvements = [];
  const macros = meal.macros || meal.nutrition || {};
  const protein = macros.protein_g || macros.protein || 0;
  const fiber = macros.fiber_g || macros.fiber || 0;
  const calories = macros.calories_kcal || macros.calories || 0;

  if (protein < 15 && calories > 200) {
    improvements.push({
      icon: 'add-circle-outline',
      text: 'Add a protein source',
      examples: ['2 eggs (+12g)', 'Greek yogurt (+15g)', '3oz chicken (+25g)'],
      impact: '+10-25g protein',
    });
  }

  if (fiber < 5 && calories > 200) {
    improvements.push({
      icon: 'leaf-outline',
      text: 'Boost fiber content',
      examples: ['Side salad (+3g)', 'Swap to whole grain (+4g)', 'Add beans (+6g)'],
      impact: '+3-6g fiber',
    });
  }

  if (calories > 600 && !meal.isComplex) {
    improvements.push({
      icon: 'resize-outline',
      text: 'Consider portion control',
      examples: ['Reduce by 25%', 'Save half for later'],
      impact: '-150 calories',
    });
  }

  return improvements.slice(0, 3);
};

/**
 * Generate meal pairing suggestions based on nutritional gaps
 * Recommends foods that would complement this meal
 *
 * NOTE: dailyTotals already INCLUDES the current meal, so we use it directly.
 */
const generateMealPairings = (meal, userGoals, dailyTotals) => {
  const pairings = [];
  const macros = meal.macros || meal.nutrition || {};
  const protein = macros.protein_g || macros.protein || 0;
  const fiber = macros.fiber_g || macros.fiber || 0;
  const calories = macros.calories_kcal || macros.calories || 0;

  // Calculate remaining daily targets
  // dailyTotals already includes the current meal, so use directly
  const dailyCaloriesGoal = userGoals?.dailyCalories || 2000;
  const dailyProteinGoal = userGoals?.proteinG || 50;

  const currentDayCalories = dailyTotals?.totalCalories || 0;
  const currentDayProtein = dailyTotals?.totalProtein || 0;

  const remainingCalories = dailyCaloriesGoal - currentDayCalories;
  const remainingProtein = dailyProteinGoal - currentDayProtein;

  // Suggest protein-rich pairings if below target
  if (protein < 15 && remainingProtein > 15) {
    pairings.push({
      icon: 'fitness',
      category: 'protein',
      title: 'Boost Protein',
      suggestions: [
        { name: 'Greek yogurt', benefit: '+15g protein', calories: 100 },
        { name: 'Hard-boiled egg', benefit: '+6g protein', calories: 78 },
        { name: 'Handful of almonds', benefit: '+6g protein', calories: 164 },
      ],
    });
  }

  // Suggest fiber-rich pairings
  if (fiber < 3 && calories > 200) {
    pairings.push({
      icon: 'leaf',
      category: 'fiber',
      title: 'Add Fiber',
      suggestions: [
        { name: 'Side salad', benefit: '+3g fiber', calories: 25 },
        { name: 'Apple', benefit: '+4g fiber', calories: 95 },
        { name: 'Raw carrots', benefit: '+3g fiber', calories: 35 },
      ],
    });
  }

  // Suggest hydration if heavy/salty meal
  const sodium = macros.sodium_mg || macros.sodium || 0;
  if (sodium > 600 || calories > 500) {
    pairings.push({
      icon: 'water',
      category: 'hydration',
      title: 'Stay Hydrated',
      suggestions: [
        { name: 'Glass of water', benefit: 'Aids digestion', calories: 0 },
        { name: 'Herbal tea', benefit: 'Antioxidants', calories: 2 },
        { name: 'Sparkling water', benefit: 'Refreshing', calories: 0 },
      ],
    });
  }

  return pairings.slice(0, 2);
};

/**
 * Generate cumulative daily context
 * Shows how this meal affects daily progress
 *
 * NOTE: dailyTotals already INCLUDES the current meal (based on MealLoggedCard usage),
 * so we use it directly without adding meal values again.
 */
const generateDailyContext = (meal, userGoals, dailyTotals) => {
  if (!userGoals?.dailyCalories || !dailyTotals) return null;

  const macros = meal.macros || meal.nutrition || {};
  const mealCalories = macros.calories_kcal || macros.calories || 0;
  const mealProtein = macros.protein_g || macros.protein || 0;

  // dailyTotals already includes the current meal, so use it directly
  // See MealLoggedCard ComparisonBar which subtracts meal to get "before" value
  const newTotalCalories = dailyTotals.totalCalories || 0;
  const newTotalProtein = dailyTotals.totalProtein || 0;

  // Calculate "before" values by subtracting the current meal
  const currentCalories = Math.max(0, newTotalCalories - mealCalories);
  const currentProtein = Math.max(0, newTotalProtein - mealProtein);

  const caloriePercent = Math.round((newTotalCalories / userGoals.dailyCalories) * 100);
  const proteinPercent = userGoals.proteinG
    ? Math.round((newTotalProtein / userGoals.proteinG) * 100)
    : null;

  const remainingCalories = Math.max(0, userGoals.dailyCalories - newTotalCalories);

  return {
    calories: {
      before: currentCalories,
      after: newTotalCalories,
      goal: userGoals.dailyCalories,
      percent: caloriePercent,
      remaining: remainingCalories,
    },
    protein: proteinPercent ? {
      before: currentProtein,
      after: newTotalProtein,
      goal: userGoals.proteinG,
      percent: proteinPercent,
    } : null,
    status: caloriePercent > 100 ? 'over' : caloriePercent > 85 ? 'close' : 'good',
  };
};

/**
 * Detect weekly patterns from historical data
 */
const detectWeeklyPatterns = (historicalData) => {
  const patterns = [];

  if (!historicalData?.weeklyAverage || !historicalData.weeklyAverage.daysOfData) {
    return patterns;
  }

  const { weeklyAverage, monthlyTrend, mealTypeAverage } = historicalData;

  // Consistency pattern
  if (weeklyAverage.daysOfData >= 5) {
    patterns.push({
      type: 'positive',
      icon: 'checkmark-circle-outline',
      message: `Great consistency! Logged ${weeklyAverage.daysOfData} of the last 7 days.`,
    });
  } else if (weeklyAverage.daysOfData <= 2) {
    patterns.push({
      type: 'info',
      icon: 'calendar-outline',
      message: 'Log more meals to get personalized insights.',
    });
  }

  // Trend pattern
  if (monthlyTrend === 'decreasing' && weeklyAverage.calories > 0) {
    patterns.push({
      type: 'positive',
      icon: 'trending-down-outline',
      message: 'Calorie intake trending down this month.',
    });
  } else if (monthlyTrend === 'increasing') {
    patterns.push({
      type: 'info',
      icon: 'trending-up-outline',
      message: 'Calorie intake trending up - stay mindful.',
    });
  }

  return patterns.slice(0, 1);
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: SkeletonLoader
// ═══════════════════════════════════════════════════════════════════════════════

const SkeletonLoader = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonHeader}>
        <Animated.View style={[styles.skeletonIcon, { opacity }]} />
        <Animated.View style={[styles.skeletonTitle, { opacity }]} />
      </View>
      {[1, 2, 3].map((i) => (
        <Animated.View key={i} style={[styles.skeletonCard, { opacity }]} />
      ))}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: DailyProgressBar
// ═══════════════════════════════════════════════════════════════════════════════

const DailyProgressBar = ({ dailyContext }) => {
  if (!dailyContext) return null;

  const { calories, status } = dailyContext;
  const progressColor = status === 'over' ? '#EF4444' : status === 'close' ? '#F59E0B' : '#10B981';
  const progressPercent = Math.min(calories.percent, 100);

  return (
    <View style={styles.dailyProgressContainer}>
      <View style={styles.dailyProgressHeader}>
        <Text style={styles.dailyProgressLabel}>Daily Progress</Text>
        <Text style={[styles.dailyProgressPercent, { color: progressColor }]}>
          {calories.percent}%
        </Text>
      </View>
      <View style={styles.dailyProgressTrack}>
        <Animated.View
          style={[
            styles.dailyProgressFill,
            { width: `${progressPercent}%`, backgroundColor: progressColor },
          ]}
        />
      </View>
      <Text style={styles.dailyProgressSubtext}>
        {calories.remaining > 0
          ? `${calories.remaining} cal remaining today`
          : `${Math.abs(calories.remaining)} cal over target`}
      </Text>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: MealPairingCard
// ═══════════════════════════════════════════════════════════════════════════════

const MealPairingCard = ({ pairing, onSelect }) => {
  const handlePress = async (suggestion) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect?.(suggestion);
  };

  return (
    <View style={styles.pairingCard}>
      <View style={styles.pairingHeader}>
        <Ionicons name={pairing.icon} size={16} color={BRAND.primary} />
        <Text style={styles.pairingTitle}>{pairing.title}</Text>
      </View>
      <View style={styles.pairingSuggestions}>
        {pairing.suggestions.map((suggestion, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.pairingSuggestion}
            onPress={() => handlePress(suggestion)}
            activeOpacity={0.7}
          >
            <Text style={styles.pairingSuggestionName}>{suggestion.name}</Text>
            <Text style={styles.pairingSuggestionBenefit}>{suggestion.benefit}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: WeeklyPatternBadge
// ═══════════════════════════════════════════════════════════════════════════════

const WeeklyPatternBadge = ({ pattern }) => {
  const bgColor = pattern.type === 'positive' ? '#ECFDF5' : '#F0F9FF';
  const iconColor = pattern.type === 'positive' ? '#10B981' : '#0EA5E9';

  return (
    <View style={[styles.patternBadge, { backgroundColor: bgColor }]}>
      <Ionicons name={pattern.icon} size={14} color={iconColor} />
      <Text style={styles.patternText}>{pattern.message}</Text>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: InsightCard
// ═══════════════════════════════════════════════════════════════════════════════

const InsightCard = ({ insight, isExpanded, onToggle }) => {
  const typeStyles = {
    positive: { bg: '#ECFDF5', border: '#10B981', icon: '#059669' },
    warning: { bg: '#FEF3C7', border: '#F59E0B', icon: '#D97706' },
    suggestion: { bg: '#EFF6FF', border: '#3B82F6', icon: '#2563EB' },
    neutral: { bg: SURFACES.background.tertiary, border: TEXT.tertiary, icon: TEXT.secondary },
    info: { bg: '#F0F9FF', border: '#0EA5E9', icon: '#0284C7' },
  };

  const style = typeStyles[insight.type] || typeStyles.neutral;

  return (
    <TouchableOpacity
      style={[styles.insightCard, { backgroundColor: style.bg, borderColor: style.border }]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={styles.insightHeader}>
        <View style={[styles.insightIconContainer, { backgroundColor: style.icon + '15' }]}>
          <Ionicons name={insight.icon} size={18} color={style.icon} />
        </View>
        <View style={styles.insightContent}>
          <Text style={[styles.insightTitle, { color: style.icon }]}>{insight.title}</Text>
          <Text style={styles.insightMessage}>{insight.message}</Text>
        </View>
        {insight.detail && (
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={TEXT.tertiary}
          />
        )}
      </View>
      {isExpanded && insight.detail && (
        <View style={styles.insightDetail}>
          <Text style={styles.insightDetailText}>{insight.detail}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: ScoreBreakdownBar
// ═══════════════════════════════════════════════════════════════════════════════

const ScoreBreakdownBar = ({ item }) => {
  const percentage = (item.score / item.maxScore) * 100;
  const statusColors = {
    excellent: '#10B981',
    good: '#F59E0B',
    needs_work: '#EF4444',
  };
  const color = statusColors[item.status] || TEXT.tertiary;

  return (
    <View style={styles.scoreBreakdownItem}>
      <View style={styles.scoreBreakdownHeader}>
        <Text style={styles.scoreBreakdownLabel}>{item.label}</Text>
        <Text style={[styles.scoreBreakdownValue, { color }]}>
          {item.score}/{item.maxScore}
        </Text>
      </View>
      <View style={styles.scoreBreakdownTrack}>
        <View
          style={[
            styles.scoreBreakdownFill,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
      {item.tip && (
        <Text style={styles.scoreBreakdownTip}>💡 {item.tip}</Text>
      )}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: SmartMealInsights
// ═══════════════════════════════════════════════════════════════════════════════

const SmartMealInsights = ({
  meal,
  userGoals,
  historicalData,
  dailyTotals,
  showScoreBreakdown = true,
  showImprovements = true,
  showDailyProgress = true,
  showPairings = true,
  isLoading = false,
  compact = false,
  onPairingSelect,
}) => {
  const [expandedInsight, setExpandedInsight] = useState(null);
  const [showAllInsights, setShowAllInsights] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showPairingsSection, setShowPairingsSection] = useState(false);

  // Generate insights
  const insights = useMemo(
    () => generateInsights(meal, userGoals, historicalData),
    [meal, userGoals, historicalData]
  );

  // Generate score breakdown
  const scoreBreakdown = useMemo(
    () => generateScoreBreakdown(meal),
    [meal]
  );

  // Generate improvements
  const improvements = useMemo(
    () => generateImprovements(meal),
    [meal]
  );

  // Generate meal pairings
  const mealPairings = useMemo(
    () => generateMealPairings(meal, userGoals, dailyTotals),
    [meal, userGoals, dailyTotals]
  );

  // Generate daily context
  const dailyContext = useMemo(
    () => generateDailyContext(meal, userGoals, dailyTotals),
    [meal, userGoals, dailyTotals]
  );

  // Detect weekly patterns
  const weeklyPatterns = useMemo(
    () => detectWeeklyPatterns(historicalData),
    [historicalData]
  );

  // Calculate total score from breakdown
  const totalScore = scoreBreakdown.reduce((sum, item) => sum + item.score, 0);
  const maxScore = scoreBreakdown.reduce((sum, item) => sum + item.maxScore, 0);

  const toggleInsight = async (index) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedInsight(expandedInsight === index ? null : index);
  };

  const toggleShowAll = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAllInsights(!showAllInsights);
  };

  const toggleBreakdown = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowBreakdown(!showBreakdown);
  };

  const togglePairings = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowPairingsSection(!showPairingsSection);
  };

  // Show skeleton while loading
  if (isLoading) {
    return <SkeletonLoader />;
  }

  if (insights.length === 0) {
    return null;
  }

  const displayInsights = showAllInsights ? insights : insights.slice(0, compact ? 2 : 3);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="bulb" size={20} color={BRAND.primary} />
          <Text style={styles.headerTitle}>Smart Insights</Text>
        </View>
        {insights.length > 3 && (
          <TouchableOpacity onPress={toggleShowAll}>
            <Text style={styles.headerAction}>
              {showAllInsights ? 'Show less' : `+${insights.length - 3} more`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Insights List */}
      <View style={styles.insightsList}>
        {displayInsights.map((insight, index) => (
          <InsightCard
            key={`${insight.category}-${index}`}
            insight={insight}
            isExpanded={expandedInsight === index}
            onToggle={() => toggleInsight(index)}
          />
        ))}
      </View>

      {/* Meal Score Breakdown */}
      {showScoreBreakdown && (
        <View style={styles.scoreSection}>
          <TouchableOpacity style={styles.scoreSectionHeader} onPress={toggleBreakdown}>
            <View style={styles.scoreHeaderLeft}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreValue}>{totalScore}</Text>
                <Text style={styles.scoreMax}>/{maxScore}</Text>
              </View>
              <View>
                <Text style={styles.scoreSectionTitle}>Meal Score Breakdown</Text>
                <Text style={styles.scoreSectionSubtitle}>
                  {totalScore >= 80 ? 'Excellent choice!' : totalScore >= 60 ? 'Good meal' : 'Room for improvement'}
                </Text>
              </View>
            </View>
            <Ionicons
              name={showBreakdown ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={TEXT.tertiary}
            />
          </TouchableOpacity>

          {showBreakdown && (
            <View style={styles.scoreBreakdownList}>
              {scoreBreakdown.map((item, index) => (
                <ScoreBreakdownBar key={item.label} item={item} />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Improvement Suggestions */}
      {showImprovements && improvements.length > 0 && (
        <View style={styles.improvementsSection}>
          <Text style={styles.improvementsTitle}>
            <Ionicons name="trending-up" size={14} color={BRAND.primary} /> Quick Improvements
          </Text>
          {improvements.map((imp, index) => (
            <View key={index} style={styles.improvementItem}>
              <Ionicons name={imp.icon} size={16} color={BRAND.primary} />
              <View style={styles.improvementContent}>
                <Text style={styles.improvementText}>{imp.text}</Text>
                <Text style={styles.improvementExamples}>
                  {imp.examples.join(' • ')}
                </Text>
              </View>
              <View style={styles.improvementImpact}>
                <Text style={styles.improvementImpactText}>{imp.impact}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Daily Progress Bar */}
      {showDailyProgress && dailyContext && (
        <DailyProgressBar dailyContext={dailyContext} />
      )}

      {/* Weekly Pattern Recognition */}
      {weeklyPatterns.length > 0 && (
        <View style={styles.patternsSection}>
          {weeklyPatterns.map((pattern, idx) => (
            <WeeklyPatternBadge key={idx} pattern={pattern} />
          ))}
        </View>
      )}

      {/* Meal Pairing Suggestions */}
      {showPairings && mealPairings.length > 0 && (
        <View style={styles.pairingsSection}>
          <TouchableOpacity
            style={styles.pairingsSectionHeader}
            onPress={togglePairings}
            activeOpacity={0.7}
          >
            <View style={styles.pairingsHeaderLeft}>
              <Ionicons name="restaurant-outline" size={18} color={BRAND.primary} />
              <Text style={styles.pairingsSectionTitle}>Pair With</Text>
            </View>
            <Ionicons
              name={showPairingsSection ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={TEXT.tertiary}
            />
          </TouchableOpacity>
          {showPairingsSection && (
            <View style={styles.pairingsList}>
              {mealPairings.map((pairing, idx) => (
                <MealPairingCard
                  key={idx}
                  pairing={pairing}
                  onSelect={onPairingSelect}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: SURFACES.card.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  headerAction: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.medium,
    color: BRAND.primary,
  },
  insightsList: {
    gap: 10,
  },
  insightCard: {
    borderRadius: RADIUS.md,
    padding: SPACING[3],
    borderWidth: 1,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  insightIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    marginBottom: 2,
  },
  insightMessage: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 18,
  },
  insightDetail: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  insightDetailText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    fontStyle: 'italic',
  },
  scoreSection: {
    marginTop: SPACING[4],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  scoreSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: BRAND.primary,
  },
  scoreValue: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.family.bold,
    color: BRAND.primary,
  },
  scoreMax: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: -2,
  },
  scoreSectionTitle: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  scoreSectionSubtitle: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginTop: 2,
  },
  scoreBreakdownList: {
    marginTop: SPACING[4],
    gap: 12,
  },
  scoreBreakdownItem: {
    marginBottom: 4,
  },
  scoreBreakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  scoreBreakdownLabel: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
  },
  scoreBreakdownValue: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  scoreBreakdownTrack: {
    height: 6,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreBreakdownFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoreBreakdownTip: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: 4,
  },
  improvementsSection: {
    marginTop: SPACING[4],
    padding: SPACING[3],
    backgroundColor: BRAND.primary + '08',
    borderRadius: RADIUS.md,
  },
  improvementsTitle: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
    marginBottom: SPACING[3],
  },
  improvementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.primary + '15',
  },
  improvementContent: {
    flex: 1,
  },
  improvementText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
  },
  improvementExamples: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginTop: 2,
  },
  improvementImpact: {
    backgroundColor: BRAND.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  improvementImpactText: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // NEW STYLES: Skeleton Loader
  // ═══════════════════════════════════════════════════════════════════════════
  skeletonContainer: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: SURFACES.card.border,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING[3],
  },
  skeletonIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: SURFACES.background.tertiary,
  },
  skeletonTitle: {
    width: 120,
    height: 16,
    borderRadius: 4,
    backgroundColor: SURFACES.background.tertiary,
  },
  skeletonCard: {
    height: 60,
    borderRadius: RADIUS.md,
    backgroundColor: SURFACES.background.tertiary,
    marginBottom: 10,
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // NEW STYLES: Daily Progress Bar
  // ═══════════════════════════════════════════════════════════════════════════
  dailyProgressContainer: {
    marginTop: SPACING[4],
    padding: SPACING[3],
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.md,
  },
  dailyProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dailyProgressLabel: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
  },
  dailyProgressPercent: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  dailyProgressTrack: {
    height: 8,
    backgroundColor: SURFACES.card.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  dailyProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  dailyProgressSubtext: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: 6,
    textAlign: 'center',
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // NEW STYLES: Weekly Patterns
  // ═══════════════════════════════════════════════════════════════════════════
  patternsSection: {
    marginTop: SPACING[3],
    gap: 8,
  },
  patternBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  patternText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // NEW STYLES: Meal Pairings
  // ═══════════════════════════════════════════════════════════════════════════
  pairingsSection: {
    marginTop: SPACING[4],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  pairingsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pairingsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pairingsSectionTitle: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  pairingsList: {
    marginTop: SPACING[3],
    gap: 12,
  },
  pairingCard: {
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.md,
    padding: SPACING[3],
  },
  pairingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  pairingTitle: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  pairingSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pairingSuggestion: {
    backgroundColor: SURFACES.card.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
  },
  pairingSuggestionName: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
  },
  pairingSuggestionBenefit: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.regular,
    color: BRAND.primary,
    marginTop: 2,
  },
});

export default SmartMealInsights;
