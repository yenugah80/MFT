/**
 * Meal Detail Screen
 * Full nutrition breakdown for a logged meal with calculated scores
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';

import { getMealById } from '@/services/database';
import {
  TEXT,
  BRAND,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  SURFACES,
} from '@/constants/premiumTheme';

// Source icons and labels
const SOURCE_CONFIG = {
  text: { icon: 'create-outline', label: 'Typed', color: '#6B7280' },
  photo: { icon: 'camera', label: 'Photo', color: '#EC4899' },
  voice: { icon: 'mic', label: 'Voice', color: '#8B5CF6' },
  barcode: { icon: 'barcode', label: 'Scanned', color: '#F59E0B' },
};

// Meal type colors and icons
const MEAL_TYPE_CONFIG = {
  breakfast: { color: '#F59E0B', icon: 'sunny-outline', gradient: ['#F59E0B', '#FBBF24'] },
  lunch: { color: '#10B981', icon: 'restaurant-outline', gradient: ['#10B981', '#34D399'] },
  dinner: { color: '#6366F1', icon: 'moon-outline', gradient: ['#6366F1', '#8B5CF6'] },
  snack: { color: '#06B6D4', icon: 'cafe-outline', gradient: ['#06B6D4', '#22D3EE'] }, // Cyan/teal
};

// Nutrition grade colors (A-E scale)
const GRADE_CONFIG = {
  A: { color: '#038141', label: 'Excellent', bg: '#D1FAE5' },
  B: { color: '#85BB2F', label: 'Good', bg: '#ECFCCB' },
  C: { color: '#FECB02', label: 'Average', bg: '#FEF9C3' },
  D: { color: '#EE8100', label: 'Below Average', bg: '#FFEDD5' },
  E: { color: '#E63E11', label: 'Poor', bg: '#FEE2E2' },
};

/**
 * Detect meal type from timestamp
 * Breakfast: 5am - 10:59am
 * Lunch: 11am - 3:59pm
 * Snack: 4pm - 5:59pm
 * Dinner: 6pm - 11:59pm (including late dinners)
 * Late night: 12am - 4:59am (treated as snack)
 */
function detectMealType(timestamp) {
  if (!timestamp) return 'snack';
  const date = new Date(timestamp);
  const hour = date.getHours();

  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 18 || hour < 1) return 'dinner'; // 6pm-12:59am
  return 'snack'; // 4-5:59pm or 1-4:59am
}

/**
 * Calculate meal health score (0-100)
 */
function calculateHealthScore(meal) {
  const protein = meal.protein || 0;
  const carbs = meal.carbs || 0;
  const fat = meal.fat || meal.fats || 0;
  const fiber = meal.fiber || 0;
  const sugar = meal.sugar || 0;
  const calories = meal.calories || 0;

  if (calories <= 0) return 50;

  // Calculate macro percentages
  const proteinCal = protein * 4;
  const carbsCal = carbs * 4;
  const fatCal = fat * 9;
  const totalCal = proteinCal + carbsCal + fatCal || 1;

  const proteinPct = (proteinCal / totalCal) * 100;
  const carbsPct = (carbsCal / totalCal) * 100;
  const fatPct = (fatCal / totalCal) * 100;

  // Macro balance score (60% weight)
  let macroScore = 100;
  if (proteinPct < 10) macroScore -= 35;
  else if (proteinPct < 15) macroScore -= 25;
  else if (proteinPct < 20) macroScore -= 10;

  if (carbsPct > 75) macroScore -= 30;
  else if (carbsPct > 65) macroScore -= 20;
  else if (carbsPct > 55) macroScore -= 5;

  if (fatPct < 10) macroScore -= 25;
  else if (fatPct < 20) macroScore -= 15;
  else if (fatPct > 50) macroScore -= 25;

  macroScore = Math.max(0, macroScore);

  // Fiber score (20% weight)
  const fiberScore = Math.min(100, (fiber / 8) * 100);

  // Sugar penalty (15% weight)
  const sugarScore = Math.max(0, 100 - (sugar / 25) * 100);

  // Final score
  const baseScore = macroScore * 0.60 + fiberScore * 0.20 + sugarScore * 0.15 + 5;
  return Math.min(100, Math.max(0, Math.round(baseScore)));
}

/**
 * Calculate nutrition grade (A-E)
 */
function calculateNutritionGrade(meal) {
  const protein = meal.protein || 0;
  const fat = meal.fat || meal.fats || 0;
  const fiber = meal.fiber || 0;
  const sugar = meal.sugar || 0;
  const calories = meal.calories || 0;
  const sodium = meal.sodium || 0;

  if (calories <= 0) return 'C';

  // Positive points
  let positivePoints = 0;
  positivePoints += Math.min(5, Math.floor(protein / 4));
  positivePoints += Math.min(5, Math.floor(fiber / 1.5));

  // Negative points
  let negativePoints = 0;
  negativePoints += Math.min(10, Math.floor(calories / 400));
  negativePoints += Math.min(10, Math.floor((fat * 0.35) / 1.5));
  negativePoints += Math.min(5, Math.floor(sugar / 6));
  negativePoints += Math.min(5, Math.floor(sodium / 150));

  const finalScore = negativePoints - positivePoints;

  if (finalScore <= 0) return 'A';
  if (finalScore <= 4) return 'B';
  if (finalScore <= 8) return 'C';
  if (finalScore <= 12) return 'D';
  return 'E';
}

/**
 * Get score color based on value
 */
function getScoreColor(score) {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#3B82F6';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
}

/**
 * Get score label based on value
 */
function getScoreLabel(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Work';
}

export default function MealDetailScreen() {
  const { id, logData } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [meal, setMeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch meal data - prefer passed logData, fallback to database lookup
  useEffect(() => {
    const fetchMeal = async () => {
      try {
        setLoading(true);

        // First, try to use the passed logData (from history screen)
        if (logData) {
          try {
            const parsedLog = JSON.parse(logData);
            if (parsedLog) {
              setMeal(parsedLog);
              setLoading(false);
              return;
            }
          } catch (parseErr) {
            console.warn('[MealDetail] Could not parse logData:', parseErr);
          }
        }

        // Fallback: try to fetch from local database
        const mealData = await getMealById(id);
        if (mealData) {
          setMeal(mealData.data || mealData);
        } else {
          setError('Meal not found');
        }
      } catch (err) {
        console.error('[MealDetail] Error fetching meal:', err);
        setError('Failed to load meal');
      } finally {
        setLoading(false);
      }
    };

    if (id || logData) {
      fetchMeal();
    }
  }, [id, logData]);

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  };

  // Format timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Calculate macro percentages
  const getMacroPercentage = (macro, total) => {
    if (!total || total === 0) return 0;
    return Math.round((macro / total) * 100);
  };

  // Calculate scores on the fly (must be before early returns for hooks rules)
  const healthScore = useMemo(() => meal ? calculateHealthScore(meal) : 50, [meal]);
  const nutritionGrade = useMemo(() => meal ? calculateNutritionGrade(meal) : 'C', [meal]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={BRAND.primary} />
        <Text style={styles.loadingText}>Loading meal details...</Text>
      </View>
    );
  }

  if (error || !meal) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="alert-circle-outline" size={64} color={TEXT.muted} />
        <Text style={styles.errorText}>{error || 'Meal not found'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Extract nutrition data with fallbacks
  const calories = meal.calories || 0;
  const protein = meal.protein || 0;
  const carbs = meal.carbs || 0;
  const fat = meal.fat || meal.fats || 0;
  const fiber = meal.fiber || 0;
  const sugar = meal.sugar || 0;
  const netCarbs = Math.max(0, carbs - fiber);

  // Always detect meal type from timestamp (stored value may be incorrect)
  const mealType = detectMealType(meal.timestamp);
  const mealConfig = MEAL_TYPE_CONFIG[mealType] || MEAL_TYPE_CONFIG.snack;

  // Source info
  const source = meal.source || 'text';
  const sourceConfig = SOURCE_CONFIG[source] || SOURCE_CONFIG.text;

  // Derived score values
  const gradeConfig = GRADE_CONFIG[nutritionGrade];
  const scoreColor = getScoreColor(healthScore);
  const scoreLabel = getScoreLabel(healthScore);

  // Calculate macro percentages
  const totalMacroCal = (protein * 4) + (carbs * 4) + (fat * 9) || 1;
  const proteinPct = Math.round((protein * 4 / totalMacroCal) * 100);
  const carbsPct = Math.round((carbs * 4 / totalMacroCal) * 100);
  const fatPct = Math.round((fat * 9 / totalMacroCal) * 100);

  return (
    <View style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={mealConfig.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + SPACING[2] }]}
      >
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.mealName} numberOfLines={2}>
            {meal.foodName || 'Meal'}
          </Text>

          <View style={styles.headerMeta}>
            <View style={styles.mealTypeBadge}>
              <Ionicons name={mealConfig.icon} size={14} color="#FFFFFF" />
              <Text style={styles.mealTypeText}>
                {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
              </Text>
            </View>

            <View style={[styles.sourceBadge, { backgroundColor: sourceConfig.color + '40' }]}>
              <Ionicons name={sourceConfig.icon} size={12} color="#FFFFFF" />
              <Text style={styles.sourceText}>{sourceConfig.label}</Text>
            </View>
          </View>

          <Text style={styles.timestamp}>{formatDate(meal.timestamp)}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + SPACING[6] }}
      >
        {/* Score Cards Row */}
        <View style={styles.scoreCardsRow}>
          {/* Health Score Card */}
          <View style={styles.scoreCard}>
            <View style={styles.scoreDialContainer}>
              <Svg width={80} height={80}>
                <Circle
                  cx={40}
                  cy={40}
                  r={34}
                  stroke="#E5E7EB"
                  strokeWidth={6}
                  fill="none"
                />
                <Circle
                  cx={40}
                  cy={40}
                  r={34}
                  stroke={scoreColor}
                  strokeWidth={6}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${(healthScore / 100) * 213.6} 213.6`}
                  transform="rotate(-90 40 40)"
                />
              </Svg>
              <View style={styles.scoreValueContainer}>
                <Text style={[styles.scoreValue, { color: scoreColor }]}>{healthScore}</Text>
              </View>
            </View>
            <Text style={styles.scoreCardTitle}>Meal Score</Text>
            <Text style={[styles.scoreCardLabel, { color: scoreColor }]}>{scoreLabel}</Text>
          </View>

          {/* Nutrition Grade Card */}
          <View style={styles.scoreCard}>
            <View style={[styles.gradeCircle, { backgroundColor: gradeConfig.bg }]}>
              <Text style={[styles.gradeValue, { color: gradeConfig.color }]}>{nutritionGrade}</Text>
            </View>
            <Text style={styles.scoreCardTitle}>Nutrition Grade</Text>
            <Text style={[styles.scoreCardLabel, { color: gradeConfig.color }]}>{gradeConfig.label}</Text>
          </View>

          {/* Calories Card */}
          <View style={styles.scoreCard}>
            <View style={styles.caloriesCircle}>
              <Ionicons name="flame" size={24} color="#F59E0B" />
              <Text style={styles.caloriesValue}>{Math.round(calories)}</Text>
            </View>
            <Text style={styles.scoreCardTitle}>Calories</Text>
            <Text style={styles.scoreCardLabel}>kcal</Text>
          </View>
        </View>

        {/* Macros Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Macro Breakdown</Text>

          {/* Macro Distribution Bar */}
          <View style={styles.macroBar}>
            <View style={[styles.macroBarSegment, { flex: proteinPct || 1, backgroundColor: '#3B82F6' }]} />
            <View style={[styles.macroBarSegment, { flex: carbsPct || 1, backgroundColor: '#F59E0B' }]} />
            <View style={[styles.macroBarSegment, { flex: fatPct || 1, backgroundColor: '#EF4444' }]} />
          </View>

          {/* Macro Cards */}
          <View style={styles.macroGrid}>
            <View style={[styles.macroCard, { borderLeftColor: '#3B82F6' }]}>
              <Text style={styles.macroCardTitle}>Protein</Text>
              <Text style={styles.macroCardValue}>{Math.round(protein)}g</Text>
              <Text style={styles.macroCardPercent}>{proteinPct}% of cal</Text>
            </View>

            <View style={[styles.macroCard, { borderLeftColor: '#F59E0B' }]}>
              <Text style={styles.macroCardTitle}>Carbohydrates</Text>
              <Text style={styles.macroCardValue}>{Math.round(carbs)}g</Text>
              <View style={styles.carbsBreakdown}>
                <Text style={styles.carbsDetail}>Fiber: {Math.round(fiber)}g</Text>
                <Text style={styles.carbsDetail}>Sugar: {Math.round(sugar)}g</Text>
                <Text style={styles.carbsDetail}>Net: {Math.round(netCarbs)}g</Text>
              </View>
            </View>

            <View style={[styles.macroCard, { borderLeftColor: '#EF4444' }]}>
              <Text style={styles.macroCardTitle}>Fat</Text>
              <Text style={styles.macroCardValue}>{Math.round(fat)}g</Text>
              <Text style={styles.macroCardPercent}>
                {getMacroPercentage(fat * 9, calories)}% of cal
              </Text>
            </View>
          </View>
        </View>

        {/* Micronutrients Section */}
        {meal.micros && Object.keys(meal.micros).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Micronutrients</Text>
            <View style={styles.microList}>
              {Object.entries(meal.micros).slice(0, 8).map(([key, value]) => {
                const amount = typeof value === 'object' ? value.value : value;
                const unit = typeof value === 'object' ? value.unit : 'mg';
                const displayAmount = Math.round(amount || 0);

                // Daily values for common nutrients
                const dailyValues = {
                  calcium: 1300, iron: 18, magnesium: 420, potassium: 4700,
                  sodium: 2300, zinc: 11, vitaminA: 900, vitaminC: 90,
                  vitaminD: 20, vitaminB12: 2.4, folate: 400,
                };
                const dvKey = key.toLowerCase().replace(/[_\s]/g, '');
                const dv = dailyValues[dvKey] || dailyValues[key] || 100;
                const dvPercent = Math.min(100, Math.round((displayAmount / dv) * 100));

                // Color based on percentage
                const getBarColor = (pct) => {
                  if (key.toLowerCase().includes('sodium')) {
                    return pct > 50 ? '#EF4444' : pct > 25 ? '#F59E0B' : '#10B981';
                  }
                  return pct >= 25 ? '#10B981' : pct >= 10 ? '#3B82F6' : '#9CA3AF';
                };
                const barColor = getBarColor(dvPercent);

                // Format name
                const formatName = (k) => k
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, s => s.toUpperCase())
                  .replace('Vitamin ', 'Vit. ');

                return (
                  <View key={key} style={styles.microRow}>
                    <View style={styles.microInfo}>
                      <Text style={styles.microLabel}>{formatName(key)}</Text>
                      <Text style={styles.microAmount}>{displayAmount}{unit}</Text>
                    </View>
                    <View style={styles.microBarContainer}>
                      <View style={styles.microBarBg}>
                        <View style={[styles.microBarFill, { width: `${dvPercent}%`, backgroundColor: barColor }]} />
                      </View>
                      <Text style={[styles.microPercent, { color: barColor }]}>{dvPercent}%</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Ingredients Section */}
        {meal.ingredients && meal.ingredients.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            {meal.ingredients.map((ingredient, index) => (
              <View key={index} style={styles.ingredientItem}>
                <View style={styles.ingredientHeader}>
                  <Text style={styles.ingredientName}>{ingredient.name}</Text>
                  <Text style={styles.ingredientCals}>
                    {Math.round(ingredient.calories || 0)} cal
                  </Text>
                </View>
                <View style={styles.ingredientMacros}>
                  <Text style={styles.ingredientMacro}>
                    P: {Math.round(ingredient.protein || 0)}g
                  </Text>
                  <Text style={styles.ingredientMacro}>
                    C: {Math.round(ingredient.carbs || 0)}g
                  </Text>
                  <Text style={styles.ingredientMacro}>
                    F: {Math.round(ingredient.fats || ingredient.fat || 0)}g
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}


        {/* Diet Labels */}
        {meal.dietLabels && meal.dietLabels.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Diet Labels</Text>
            <View style={styles.labelsRow}>
              {meal.dietLabels.map((label, index) => (
                <View key={index} style={styles.dietLabel}>
                  <Text style={styles.dietLabelText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING[4],
    fontSize: TYPOGRAPHY.size.base,
    color: TEXT.secondary,
  },
  errorText: {
    marginTop: SPACING[4],
    fontSize: TYPOGRAPHY.size.lg,
    color: TEXT.secondary,
  },
  backButton: {
    marginTop: SPACING[4],
    paddingHorizontal: SPACING[6],
    paddingVertical: SPACING[3],
    backgroundColor: BRAND.primary,
    borderRadius: RADIUS.lg,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },

  // Header
  header: {
    paddingHorizontal: SPACING[5],
    paddingBottom: SPACING[6],
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  headerContent: {
    gap: SPACING[2],
  },
  mealName: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
    lineHeight: 32,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  mealTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  mealTypeText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#FFFFFF',
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
  },
  sourceText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: '#FFFFFF',
  },
  sourceIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: SPACING[1],
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[4],
  },

  // Calorie Card
  calorieCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS['2xl'],
    padding: SPACING[5],
    marginBottom: SPACING[4],
    alignItems: 'center',
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  calorieRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: BRAND.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  calorieValue: {
    fontSize: 36,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  calorieLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
  quickMacros: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  quickMacro: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING[1],
  },
  quickMacroDivider: {
    width: 1,
    height: 40,
    backgroundColor: TEXT.muted + '30',
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  quickMacroLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  quickMacroValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },

  // Section
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS['2xl'],
    padding: SPACING[4],
    marginBottom: SPACING[4],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: SPACING[4],
  },

  // Macro Bar
  macroBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING[4],
  },
  macroBarSegment: {
    height: '100%',
  },

  // Macro Cards
  macroCards: {
    gap: SPACING[3],
  },
  macroCard: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    borderLeftWidth: 4,
  },
  macroCardTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginBottom: SPACING[1],
  },
  macroCardValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  macroCardPercent: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
  },
  carbsBreakdown: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginTop: SPACING[2],
  },
  carbsDetail: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },

  // Micronutrients - List with progress bars
  microList: {
    gap: SPACING[3],
  },
  microRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  microInfo: {
    flex: 1,
    marginRight: SPACING[3],
  },
  microLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.primary,
    marginBottom: 2,
  },
  microAmount: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  microBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  microBarBg: {
    width: 80,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  microBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  microPercent: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    width: 36,
    textAlign: 'right',
  },
  // Legacy - keeping for compatibility
  microGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  microItem: {
    width: '48%',
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.md,
    padding: SPACING[3],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  microName: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    flex: 1,
  },
  microValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },

  // Ingredients
  ingredientItem: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[2],
  },
  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  ingredientName: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    flex: 1,
  },
  ingredientCals: {
    fontSize: TYPOGRAPHY.size.sm,
    color: BRAND.primary,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  ingredientMacros: {
    flexDirection: 'row',
    gap: SPACING[4],
  },
  ingredientMacro: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },

  // Score Cards Row
  scoreCardsRow: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  scoreCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING[3],
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scoreDialContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    marginBottom: SPACING[2],
  },
  scoreValueContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  scoreCardTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
    marginBottom: SPACING[1],
  },
  scoreCardLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  gradeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  gradeValue: {
    fontSize: 28,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  caloriesCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  caloriesValue: {
    fontSize: 18,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#F59E0B',
  },
  macroGrid: {
    gap: SPACING[3],
  },

  // Diet Labels
  labelsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  dietLabel: {
    backgroundColor: BRAND.primary + '15',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.full,
  },
  dietLabelText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: BRAND.primary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
});
