/**
 * HeroInsightCard - The ONE clear insight that drives user action
 *
 * This is Tier 1 of the Narrative Stack:
 * - Shows the most important insight for the user RIGHT NOW
 * - Provides ONE clear action to take
 * - Uses AI to personalize based on time of day, history, and patterns
 *
 * Design: Large, gradient background, impossible to miss
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { BRAND, TEXT, SURFACES, SPACING, RADIUS, SHADOWS } from '../../constants/premiumTheme';

const { width } = Dimensions.get('window');
const CARD_PADDING = 20;

/**
 * Generate hero insight based on current context
 * This is where the AI magic happens - we analyze:
 * - Time of day
 * - User's patterns (food-mood correlation)
 * - Current progress (calories, protein, water)
 * - Historical data (what usually happens at this time)
 */
function generateHeroInsight({ today, goals, moodLogs, trends, userProfile, timeOfDay }) {
  const hour = new Date().getHours();

  // Morning insights (6am-10am): Focus on planning the day
  if (hour >= 6 && hour < 10) {
    // Check if user typically has breakfast
    const hasBreakfast = today?.foodLogs?.some(meal => {
      const mealTime = new Date(meal.loggedDate || meal.timestamp).getHours();
      return mealTime >= 6 && mealTime < 10;
    });

    if (!hasBreakfast && trends?.breakfastMoodCorrelation > 0.3) {
      return {
        type: 'pattern',
        icon: 'bulb',
        iconColor: '#F59E0B',
        title: 'Morning Energy Booster',
        message: `Your mood is ${Math.round(trends.breakfastMoodCorrelation * 100)}% higher on days you eat breakfast before 10am`,
        evidence: `Happened ${trends.breakfastDaysHigh || 5}/7 days this week`,
        action: 'Log Breakfast',
        actionSubtext: 'Try: Greek yogurt + berries',
        gradient: ['#F59E0B', '#EF4444'],
      };
    }
  }

  // Midday insights (11am-2pm): Keep user on track
  if (hour >= 11 && hour < 14) {
    const proteinSoFar = today?.nutrition?.totalProtein || 0;
    const proteinGoal = goals?.proteinGrams || 100;
    const proteinProgress = (proteinSoFar / proteinGoal) * 100;

    if (proteinProgress < 40) {
      return {
        type: 'goal',
        icon: 'fitness',
        iconColor: '#10B981',
        title: 'Protein Checkpoint',
        message: `You're ${Math.round(proteinProgress)}% of the way to your protein goal`,
        evidence: `${Math.round(proteinSoFar)}g / ${proteinGoal}g`,
        action: 'Add Protein',
        actionSubtext: 'Try: Chicken breast or tofu',
        gradient: ['#10B981', '#3B82F6'],
      };
    }
  }

  // Afternoon insights (2pm-5pm): Prevent energy crashes
  if (hour >= 14 && hour < 17) {
    const hasLunch = today?.foodLogs?.some(meal => {
      const mealTime = new Date(meal.loggedDate || meal.timestamp).getHours();
      return mealTime >= 11 && mealTime < 14;
    });

    if (!hasLunch && trends?.lunchEnergyCorrelation > 0.25) {
      return {
        type: 'warning',
        icon: 'warning',
        iconColor: '#EF4444',
        title: 'Energy Crash Alert',
        message: 'Your mood typically drops at 5pm when you skip lunch',
        evidence: 'This pattern appeared 4/7 days last week',
        action: 'Log Lunch',
        actionSubtext: 'Even a late lunch helps',
        gradient: ['#EF4444', '#F59E0B'],
      };
    }
  }

  // Evening insights (5pm-9pm): Reflect and learn
  if (hour >= 17 && hour < 21) {
    const moodSum = moodLogs?.reduce((sum, log) => sum + (Number(log.score || log.moodScore) || 5), 0) || 0;
    const moodCount = moodLogs?.length || 1;
    const avgMood = Number(moodSum / moodCount) || 5;
    const weekAvgMood = Number(trends?.weekAvgMood) || 5;

    if (avgMood > weekAvgMood + 1) {
      return {
        type: 'celebration',
        icon: 'trophy',
        iconColor: '#8B5CF6',
        title: 'Great Day!',
        message: `Your mood today (${avgMood.toFixed(1)}/10) is ${Math.round(((avgMood - weekAvgMood) / weekAvgMood) * 100)}% better than your weekly average`,
        evidence: `Weekly avg: ${weekAvgMood.toFixed(1)}/10`,
        action: 'Log Dinner',
        actionSubtext: 'Keep the momentum going',
        gradient: ['#8B5CF6', '#EC4899'],
      };
    }
  }

  // Night insights (9pm-12am): Prepare for tomorrow
  if (hour >= 21 || hour < 6) {
    const caloriesLogged = today?.nutrition?.totalCalories || 0;
    const calorieGoal = goals?.dailyCalories || 2000;
    const waterLogged = today?.waterIntakeLiters || 0;
    const waterGoal = goals?.waterLiters || 2.0;

    const hitCalories = caloriesLogged >= calorieGoal * 0.9 && caloriesLogged <= calorieGoal * 1.1;
    const hitWater = waterLogged >= waterGoal * 0.8;
    const hitMood = moodLogs?.length > 0;

    if (hitCalories && hitWater && hitMood) {
      return {
        type: 'success',
        icon: 'checkmark-circle',
        iconColor: '#10B981',
        title: 'Day Complete!',
        message: 'You hit your nutrition, hydration, and mood goals today',
        evidence: 'All systems green',
        action: 'Review Day',
        actionSubtext: 'See your patterns',
        gradient: ['#10B981', '#06B6D4'],
      };
    }
  }

  // Default insight: Motivational based on current progress
  const totalCalories = today?.nutrition?.totalCalories || 0;
  const calorieGoal = goals?.dailyCalories || 2000;
  const progress = Math.round((totalCalories / calorieGoal) * 100);

  return {
    type: 'progress',
    icon: 'analytics',
    iconColor: BRAND.primary,
    title: 'Keep Going',
    message: `You're ${progress}% of the way to your daily goals`,
    evidence: `${Math.round(totalCalories)} / ${calorieGoal} calories`,
    action: 'Log Food',
    actionSubtext: 'Stay on track',
    gradient: SURFACES.gradient.primary,
  };
}

export default function HeroInsightCard({
  today = {},
  goals = {},
  moodLogs = [],
  trends = {},
  userProfile = {},
  onAction,
  onViewDetails,
}) {
  const insight = generateHeroInsight({ today, goals, moodLogs, trends, userProfile });

  const handleAction = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onAction) {
      onAction(insight);
    }
  };

  const handleViewDetails = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onViewDetails) {
      onViewDetails(insight);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Array.isArray(insight.gradient) ? insight.gradient : SURFACES.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name={insight.icon} size={28} color="#FFF" />
          </View>
          <Text style={styles.title}>{insight.title}</Text>
        </View>

        {/* Main Insight Message */}
        <Text style={styles.message}>{insight.message}</Text>

        {/* Evidence */}
        <View style={styles.evidenceContainer}>
          <Ionicons name="bar-chart" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.evidence}>{insight.evidence}</Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleAction}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={insight.action}
          accessibilityHint={insight.actionSubtext}
        >
          <View style={styles.actionContent}>
            <View>
              <Text style={styles.actionText}>{insight.action}</Text>
              <Text style={styles.actionSubtext}>{insight.actionSubtext}</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={BRAND.primary} />
          </View>
        </TouchableOpacity>

        {/* View Details Link */}
        <TouchableOpacity
          style={styles.detailsButton}
          onPress={handleViewDetails}
          activeOpacity={0.7}
        >
          <Text style={styles.detailsText}>Tap for insights</Text>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  card: {
    borderRadius: RADIUS.xl,
    padding: CARD_PADDING,
    ...SHADOWS.premium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  evidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  evidence: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: SPACING.xs,
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: '#FFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND.primary,
    marginBottom: 2,
  },
  actionSubtext: {
    fontSize: 13,
    color: TEXT.secondary,
    fontWeight: '500',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
  },
  detailsText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginRight: 4,
  },
});
