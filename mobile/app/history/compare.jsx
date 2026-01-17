import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFoodLog } from '../../hooks/useFoodLog';
import {
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SURFACES,
  BRAND,
} from '../../constants/premiumTheme';

const parseCompareId = (raw) => {
  if (!raw) return null;
  if (raw.startsWith('id:')) return { type: 'id', value: Number(raw.slice(3)) };
  if (raw.startsWith('cid:')) return { type: 'cid', value: raw.slice(4) };
  if (raw.startsWith('ts:')) return { type: 'ts', value: Number(raw.slice(3)) };
  return null;
};

const formatMacro = (value) => Math.round(Number(value) || 0);

/**
 * Calculate meal score for comparison (0-100)
 */
function calculateMealScore(meal) {
  if (!meal) return 0;

  const protein = meal.protein || 0;
  const carbs = meal.carbs || 0;
  const fat = meal.fat || meal.fats || 0;
  const fiber = meal.fiber || 0;
  const sugar = meal.sugar || 0;
  const calories = meal.calories || 0;

  if (calories <= 0) return 50;

  // Protein ratio score (higher protein per calorie is better)
  const proteinPerCal = (protein * 4) / calories;
  const proteinScore = Math.min(100, proteinPerCal * 250);

  // Fiber bonus
  const fiberScore = Math.min(100, (fiber / 8) * 100);

  // Sugar penalty
  const sugarPenalty = Math.min(40, (sugar / 25) * 40);

  // Macro balance
  const totalMacroCal = (protein * 4) + (carbs * 4) + (fat * 9) || 1;
  const proteinPct = (protein * 4) / totalMacroCal * 100;
  let balanceScore = 100;
  if (proteinPct < 15) balanceScore -= 30;
  else if (proteinPct < 20) balanceScore -= 15;

  return Math.round((proteinScore * 0.35 + fiberScore * 0.2 + balanceScore * 0.3 + (40 - sugarPenalty)) * 0.9);
}

/**
 * Generate smart recommendations based on comparison
 */
function generateRecommendations(log1, log2) {
  const recommendations = [];
  const score1 = calculateMealScore(log1);
  const score2 = calculateMealScore(log2);

  const winner = score1 >= score2 ? log1 : log2;
  const protein1 = log1?.protein || 0;
  const protein2 = log2?.protein || 0;
  const cal1 = log1?.calories || 0;
  const cal2 = log2?.calories || 0;
  const carbs1 = log1?.carbs || 0;
  const carbs2 = log2?.carbs || 0;
  const fiber1 = log1?.fiber || 0;
  const fiber2 = log2?.fiber || 0;

  // Protein comparison
  if (Math.abs(protein1 - protein2) > 5) {
    const higherProtein = protein1 > protein2 ? log1 : log2;
    const diff = Math.abs(protein1 - protein2);
    recommendations.push({
      icon: 'fitness',
      color: '#3B82F6',
      title: 'Protein Power',
      text: `${higherProtein?.foodName || 'This meal'} has ${Math.round(diff)}g more protein - better for muscle building & satiety`,
      favors: higherProtein,
    });
  }

  // Calorie comparison
  if (Math.abs(cal1 - cal2) > 100) {
    const lowerCal = cal1 < cal2 ? log1 : log2;
    const diff = Math.abs(cal1 - cal2);
    recommendations.push({
      icon: 'flame',
      color: '#F59E0B',
      title: 'Calorie Conscious',
      text: `${lowerCal?.foodName || 'This meal'} saves you ${Math.round(diff)} calories - ideal for weight management`,
      favors: lowerCal,
    });
  }

  // Protein density (protein per calorie)
  const proteinDensity1 = cal1 > 0 ? protein1 / cal1 * 100 : 0;
  const proteinDensity2 = cal2 > 0 ? protein2 / cal2 * 100 : 0;
  if (Math.abs(proteinDensity1 - proteinDensity2) > 2) {
    const denser = proteinDensity1 > proteinDensity2 ? log1 : log2;
    const densityValue = Math.round(Math.max(proteinDensity1, proteinDensity2));
    recommendations.push({
      icon: 'trending-up',
      color: '#10B981',
      title: 'Better Value',
      text: `${denser?.foodName || 'This meal'} gives ${densityValue}g protein per 100cal - more bang for your buck`,
      favors: denser,
    });
  }

  // Carbs comparison (for low-carb diets)
  if (Math.abs(carbs1 - carbs2) > 20) {
    const lowerCarb = carbs1 < carbs2 ? log1 : log2;
    const diff = Math.abs(carbs1 - carbs2);
    recommendations.push({
      icon: 'leaf',
      color: '#8B5CF6',
      title: 'Lower Carbs',
      text: `${lowerCarb?.foodName || 'This meal'} has ${Math.round(diff)}g fewer carbs - good for keto/low-carb`,
      favors: lowerCarb,
    });
  }

  // Fiber comparison
  if (Math.abs(fiber1 - fiber2) > 3) {
    const higherFiber = fiber1 > fiber2 ? log1 : log2;
    const diff = Math.abs(fiber1 - fiber2);
    recommendations.push({
      icon: 'nutrition',
      color: '#06B6D4',
      title: 'Fiber Rich',
      text: `${higherFiber?.foodName || 'This meal'} has ${Math.round(diff)}g more fiber - supports digestion`,
      favors: higherFiber,
    });
  }

  return { recommendations, winner, score1, score2 };
}

/**
 * Get score color based on value
 */
function getScoreColor(score) {
  if (score >= 75) return '#10B981';
  if (score >= 55) return '#3B82F6';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
}

/**
 * Get score label
 */
function getScoreLabel(score) {
  if (score >= 75) return 'Excellent';
  if (score >= 55) return 'Good';
  if (score >= 40) return 'Okay';
  return 'Poor';
}

export default function CompareScreen() {
  const router = useRouter();
  const { ids } = useLocalSearchParams();
  const foodLog = useFoodLog();
  const [isLoading, setIsLoading] = useState(false);

  const compareIds = useMemo(() => {
    if (!ids || typeof ids !== 'string') return [];
    return ids.split(',').map(parseCompareId).filter(Boolean);
  }, [ids]);

  const compareLogs = useMemo(() => {
    if (!compareIds.length) return [];

    return compareIds.map((entry) => {
      if (entry.type === 'id') {
        return foodLog.logs.find((log) => log?.id === entry.value);
      }
      if (entry.type === 'cid') {
        return foodLog.logs.find((log) => log?.clientEventId === entry.value);
      }
      if (entry.type === 'ts') {
        return foodLog.logs.find((log) => log?.timestamp === entry.value);
      }
      return null;
    }).filter(Boolean);
  }, [compareIds, foodLog.logs]);

  const ensureHistory = useCallback(async () => {
    if (compareLogs.length >= 2) return;
    setIsLoading(true);
    try {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(end.getDate() - 90 + 1);
      start.setHours(0, 0, 0, 0);

      await foodLog.fetchHistory({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        limit: 200,
      });
    } finally {
      setIsLoading(false);
    }
  }, [compareLogs.length, foodLog]);

  useEffect(() => {
    ensureHistory().catch(() => {});
  }, [ensureHistory]);

  const [logA, logB] = compareLogs;

  // Calculate scores on-the-fly
  const { recommendations, winner, score1, score2 } = useMemo(() => {
    if (compareLogs.length < 2) return { recommendations: [], winner: null, score1: 0, score2: 0 };
    return generateRecommendations(logA, logB);
  }, [logA, logB, compareLogs.length]);

  const scoreDiff = Math.abs(score1 - score2);
  const hasWinner = scoreDiff >= 8;

  if (!compareIds.length) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="git-compare-outline" size={40} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>No items selected</Text>
          <Text style={styles.emptySubtitle}>Pick two meals from history to compare.</Text>
          <TouchableOpacity style={styles.goBackButton} onPress={() => router.replace('/history')}>
            <Text style={styles.goBackButtonText}>Go to History</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/history');
            }
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Smart Comparison</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading && compareLogs.length < 2 && (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading meals...</Text>
          </View>
        )}

        {compareLogs.length < 2 && !isLoading && (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle" size={32} color={TEXT.tertiary} />
            <Text style={styles.emptyTitle}>Comparison unavailable</Text>
            <Text style={styles.emptySubtitle}>We couldn't find both meals. Try again from History.</Text>
          </View>
        )}

        {compareLogs.length >= 2 && (
          <>
            {/* Winner Banner */}
            {hasWinner ? (
              <View style={styles.winnerBanner}>
                <View style={styles.winnerIconWrap}>
                  <Ionicons name="trophy" size={28} color="#F59E0B" />
                </View>
                <View style={styles.winnerTextWrap}>
                  <Text style={styles.winnerLabel}>RECOMMENDED CHOICE</Text>
                  <Text style={styles.winnerName}>{winner?.foodName || 'Better option'}</Text>
                  <Text style={styles.winnerReason}>
                    {scoreDiff >= 20 ? 'Significantly healthier option' : 'Slightly better overall'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.tieBanner}>
                <Ionicons name="swap-horizontal" size={22} color="#6B7280" />
                <Text style={styles.tieText}>Both meals are nutritionally similar - pick based on preference!</Text>
              </View>
            )}

            {/* Score Cards Side by Side */}
            <View style={styles.scoreCardsRow}>
              <View style={[styles.scoreCard, winner === logA && hasWinner && styles.scoreCardWinner]}>
                <Text style={styles.scoreCardName} numberOfLines={2}>{logA?.foodName || 'Meal 1'}</Text>
                <View style={[styles.scoreCircle, { borderColor: getScoreColor(score1) }]}>
                  <Text style={[styles.scoreValue, { color: getScoreColor(score1) }]}>{score1}</Text>
                </View>
                <Text style={[styles.scoreLabel, { color: getScoreColor(score1) }]}>{getScoreLabel(score1)}</Text>
                {winner === logA && hasWinner && (
                  <View style={styles.winnerBadge}>
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  </View>
                )}
              </View>

              <View style={styles.vsContainer}>
                <View style={styles.vsLine} />
                <View style={styles.vsBadge}>
                  <Text style={styles.vsText}>VS</Text>
                </View>
                <View style={styles.vsLine} />
              </View>

              <View style={[styles.scoreCard, winner === logB && hasWinner && styles.scoreCardWinner]}>
                <Text style={styles.scoreCardName} numberOfLines={2}>{logB?.foodName || 'Meal 2'}</Text>
                <View style={[styles.scoreCircle, { borderColor: getScoreColor(score2) }]}>
                  <Text style={[styles.scoreValue, { color: getScoreColor(score2) }]}>{score2}</Text>
                </View>
                <Text style={[styles.scoreLabel, { color: getScoreColor(score2) }]}>{getScoreLabel(score2)}</Text>
                {winner === logB && hasWinner && (
                  <View style={styles.winnerBadge}>
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  </View>
                )}
              </View>
            </View>

            {/* Key Insights / Recommendations */}
            {recommendations.length > 0 && (
              <View style={styles.insightsSection}>
                <Text style={styles.sectionTitle}>Key Insights</Text>
                {recommendations.map((rec, index) => (
                  <View key={index} style={styles.insightCard}>
                    <View style={[styles.insightIconWrap, { backgroundColor: rec.color + '15' }]}>
                      <Ionicons name={rec.icon} size={20} color={rec.color} />
                    </View>
                    <View style={styles.insightContent}>
                      <Text style={styles.insightTitle}>{rec.title}</Text>
                      <Text style={styles.insightText}>{rec.text}</Text>
                    </View>
                    {rec.favors === winner && hasWinner && (
                      <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Nutrition Breakdown */}
            <View style={styles.breakdownSection}>
              <Text style={styles.sectionTitle}>Nutrition Breakdown</Text>
              <View style={styles.breakdownCard}>
                <NutritionRow
                  label="Calories"
                  val1={logA?.calories}
                  val2={logB?.calories}
                  unit="kcal"
                  lowerIsBetter
                />
                <NutritionRow
                  label="Protein"
                  val1={logA?.protein}
                  val2={logB?.protein}
                  unit="g"
                />
                <NutritionRow
                  label="Carbs"
                  val1={logA?.carbs}
                  val2={logB?.carbs}
                  unit="g"
                  lowerIsBetter
                />
                <NutritionRow
                  label="Fat"
                  val1={logA?.fat || logA?.fats}
                  val2={logB?.fat || logB?.fats}
                  unit="g"
                  isLast={!((logA?.fiber || 0) > 0 || (logB?.fiber || 0) > 0) && !((logA?.sugar || 0) > 0 || (logB?.sugar || 0) > 0)}
                />
                {/* Only show Fiber if at least one meal has data */}
                {((logA?.fiber || 0) > 0 || (logB?.fiber || 0) > 0) && (
                  <NutritionRow
                    label="Fiber"
                    val1={logA?.fiber}
                    val2={logB?.fiber}
                    unit="g"
                    isLast={!((logA?.sugar || 0) > 0 || (logB?.sugar || 0) > 0)}
                  />
                )}
                {/* Only show Sugar if at least one meal has data */}
                {((logA?.sugar || 0) > 0 || (logB?.sugar || 0) > 0) && (
                  <NutritionRow
                    label="Sugar"
                    val1={logA?.sugar}
                    val2={logB?.sugar}
                    unit="g"
                    lowerIsBetter
                    isLast
                  />
                )}
              </View>
            </View>

            {/* Action Card */}
            <View style={styles.actionCard}>
              <Text style={styles.actionTitle}>Make better choices</Text>
              <Text style={styles.actionText}>
                Small decisions add up. Pick meals that align with your goals - whether that's more protein, fewer carbs, or simply lower calories.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/history');
                  }
                }}
              >
                <Ionicons name="swap-horizontal-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Compare Different Meals</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Nutrition comparison row component
 */
function NutritionRow({ label, val1, val2, unit, lowerIsBetter = false, isLast = false }) {
  const v1 = formatMacro(val1);
  const v2 = formatMacro(val2);
  const threshold = label === 'Calories' ? 50 : 5;
  const hasDiff = Math.abs(v1 - v2) > threshold;
  const better1 = hasDiff && (lowerIsBetter ? v1 < v2 : v1 > v2);
  const better2 = hasDiff && (lowerIsBetter ? v2 < v1 : v2 > v1);

  return (
    <View style={[styles.nutritionRow, !isLast && styles.nutritionRowBorder]}>
      <Text style={[styles.nutritionVal, better1 && styles.nutritionValBetter]}>
        {v1}<Text style={styles.nutritionUnit}>{unit}</Text>
      </Text>
      <Text style={styles.nutritionLabel}>{label}</Text>
      <Text style={[styles.nutritionVal, better2 && styles.nutritionValBetter]}>
        {v2}<Text style={styles.nutritionUnit}>{unit}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: SPACING[4],
    paddingBottom: SPACING[8],
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: SPACING[8],
  },
  loadingText: {
    color: TEXT.tertiary,
    fontSize: 14,
  },

  // Winner Banner
  winnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
  },
  winnerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  winnerTextWrap: {
    flex: 1,
  },
  winnerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  winnerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  winnerReason: {
    fontSize: 13,
    color: '#B45309',
  },

  // Tie Banner
  tieBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tieText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    lineHeight: 20,
  },

  // Score Cards
  scoreCardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  scoreCardWinner: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  scoreCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 12,
    height: 36,
  },
  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  winnerBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  // VS Container
  vsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
  },
  vsLine: {
    width: 2,
    height: 20,
    backgroundColor: '#E5E7EB',
  },
  vsBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  vsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Insights Section
  insightsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  insightIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
    marginRight: 8,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  insightText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
  },

  // Breakdown Section
  breakdownSection: {
    marginBottom: 24,
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  nutritionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  nutritionVal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    minWidth: 70,
  },
  nutritionValBetter: {
    color: '#059669',
    fontWeight: '700',
  },
  nutritionUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  nutritionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    flex: 1,
    textAlign: 'center',
  },

  // Action Card
  actionCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#312E81',
    marginBottom: 6,
  },
  actionText: {
    fontSize: 13,
    color: '#4338CA',
    lineHeight: 19,
    marginBottom: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[8],
    paddingHorizontal: SPACING[6],
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
  },
  goBackButton: {
    backgroundColor: BRAND.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  goBackButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
