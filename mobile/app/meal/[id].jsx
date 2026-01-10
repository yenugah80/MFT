/**
 * Meal Detail Screen
 * Full nutrition breakdown for a logged meal
 */

import React, { useState, useEffect } from 'react';
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

import { getMealById } from '@/services/database';
import {
  TEXT,
  BRAND,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  SURFACES,
} from '@/constants/premiumTheme';

// Source icons mapping
const SOURCE_ICONS = {
  text: 'chatbubble-outline',
  photo: 'camera-outline',
  voice: 'mic-outline',
  barcode: 'barcode-outline',
};

// Meal type colors
const MEAL_TYPE_COLORS = {
  breakfast: '#F59E0B',
  lunch: '#10B981',
  dinner: '#6366F1',
  snack: '#EC4899',
};

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [meal, setMeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch meal data
  useEffect(() => {
    const fetchMeal = async () => {
      try {
        setLoading(true);
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

    if (id) {
      fetchMeal();
    }
  }, [id]);

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

  const calories = meal.calories || 0;
  const protein = meal.protein || 0;
  const carbs = meal.carbs || 0;
  const fat = meal.fats || meal.fat || 0;
  const fiber = meal.fiber || 0;
  const sugar = meal.sugar || 0;
  const netCarbs = meal.netCarbs || (carbs - fiber);
  const mealType = meal.mealType || 'snack';
  const source = meal.source || 'text';

  return (
    <View style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={[BRAND.primary, '#8B5CF6']}
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
            <View style={[styles.mealTypeBadge, { backgroundColor: MEAL_TYPE_COLORS[mealType] + '40' }]}>
              <Text style={[styles.mealTypeText, { color: '#FFFFFF' }]}>
                {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
              </Text>
            </View>

            <View style={styles.sourceIndicator}>
              <Ionicons name={SOURCE_ICONS[source]} size={14} color="#FFFFFF80" />
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
        {/* Calorie Hero Card */}
        <View style={styles.calorieCard}>
          <View style={styles.calorieRing}>
            <Text style={styles.calorieValue}>{Math.round(calories)}</Text>
            <Text style={styles.calorieLabel}>calories</Text>
          </View>

          <View style={styles.quickMacros}>
            <View style={styles.quickMacro}>
              <View style={[styles.macroDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.quickMacroLabel}>Protein</Text>
              <Text style={styles.quickMacroValue}>{Math.round(protein)}g</Text>
            </View>
            <View style={styles.quickMacroDivider} />
            <View style={styles.quickMacro}>
              <View style={[styles.macroDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.quickMacroLabel}>Carbs</Text>
              <Text style={styles.quickMacroValue}>{Math.round(carbs)}g</Text>
            </View>
            <View style={styles.quickMacroDivider} />
            <View style={styles.quickMacro}>
              <View style={[styles.macroDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.quickMacroLabel}>Fat</Text>
              <Text style={styles.quickMacroValue}>{Math.round(fat)}g</Text>
            </View>
          </View>
        </View>

        {/* Macronutrients Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Macronutrients</Text>

          {/* Macro Distribution Bar */}
          <View style={styles.macroBar}>
            <View style={[styles.macroBarSegment, { flex: protein, backgroundColor: '#10B981' }]} />
            <View style={[styles.macroBarSegment, { flex: carbs, backgroundColor: '#F59E0B' }]} />
            <View style={[styles.macroBarSegment, { flex: fat, backgroundColor: '#EF4444' }]} />
          </View>

          {/* Macro Cards */}
          <View style={styles.macroCards}>
            <View style={[styles.macroCard, { borderLeftColor: '#10B981' }]}>
              <Text style={styles.macroCardTitle}>Protein</Text>
              <Text style={styles.macroCardValue}>{Math.round(protein)}g</Text>
              <Text style={styles.macroCardPercent}>
                {getMacroPercentage(protein * 4, calories)}% of cal
              </Text>
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
            <View style={styles.microGrid}>
              {Object.entries(meal.micros).slice(0, 8).map(([key, value]) => {
                const amount = typeof value === 'object' ? value.value : value;
                const unit = typeof value === 'object' ? value.unit : 'mg';
                return (
                  <View key={key} style={styles.microItem}>
                    <Text style={styles.microName}>
                      {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                    </Text>
                    <Text style={styles.microValue}>
                      {Math.round(amount || 0)}{unit}
                    </Text>
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

        {/* Health Scores */}
        {(meal.healthScore || meal.nutriscore) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Health Scores</Text>
            <View style={styles.scoresRow}>
              {meal.healthScore && (
                <View style={styles.scoreCard}>
                  <Text style={styles.scoreValue}>{meal.healthScore}</Text>
                  <Text style={styles.scoreLabel}>Health Score</Text>
                </View>
              )}
              {meal.nutriscore && (
                <View style={[styles.scoreCard, styles.nutriscoreCard]}>
                  <Text style={styles.nutriscoreValue}>{meal.nutriscore}</Text>
                  <Text style={styles.scoreLabel}>NutriScore</Text>
                </View>
              )}
            </View>
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
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
  },
  mealTypeText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
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

  // Micronutrients
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

  // Scores
  scoresRow: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  scoreCard: {
    flex: 1,
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: BRAND.primary,
  },
  scoreLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: SPACING[1],
  },
  nutriscoreCard: {
    backgroundColor: '#10B981' + '15',
  },
  nutriscoreValue: {
    fontSize: 32,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#10B981',
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
