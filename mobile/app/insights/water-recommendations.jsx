/**
 * Water Recommendations Screen
 *
 * Evidence-Based Hydration Intelligence System
 *
 * Research Foundation:
 * - Dehydration >2% body mass impairs cognitive function (AJHB 2024)
 * - Hydration affects sustained attention and short-term memory
 * - Exercise-induced dehydration has compounding effects
 * - Water intake correlates with 2-year cognitive performance changes (BMC Medicine 2023)
 *
 * Design: Calm Luxury - Oura Ring / Apple Health inspired
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop, Path } from 'react-native-svg';

import { useNotification } from '../../providers/NotificationProvider';
import { useDashboard } from '../../hooks/useDashboard';
import { useHydrationAnalytics } from '../../hooks/useHydrationAnalytics';
import {
  TEXT,
  SEMANTIC,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SURFACES,
  SHADOWS,
} from '../../constants/premiumTheme';
import {
  HYDRATION_ACCENT,
  HYDRATION_SEMANTIC,
  HYDRATION_PREDICTION,
} from '../../constants/hydrationTheme';

// ============================================================================
// SCIENTIFIC EVIDENCE BASE
// ============================================================================

const HYDRATION_SCIENCE = {
  cognitiveImpact: {
    threshold: 0.02, // 2% body water loss
    effects: ['Reduced attention span', 'Impaired short-term memory', 'Slower reaction time'],
    sources: ['American Journal of Human Biology 2024', 'PMC Hydration Equation'],
  },
  exerciseHydration: {
    preWorkout: 500, // ml, 2 hours before
    duringWorkout: 200, // ml per 20 min
    postWorkout: 1.5, // multiplier of fluid lost
    sources: ['American College of Sports Medicine', 'Journal of Athletic Training'],
  },
  dailyRecommendation: {
    sedentary: { min: 2000, max: 2500 },
    lightActive: { min: 2500, max: 3000 },
    active: { min: 3000, max: 3500 },
    veryActive: { min: 3500, max: 4000 },
    sources: ['European Food Safety Authority', 'Institute of Medicine'],
  },
  optimalTiming: {
    morning: 'Rehydrate after sleep (16oz within 30 min of waking)',
    preMeals: 'Drink 30 min before meals for digestion',
    exercise: 'Begin hydrated, maintain during, replace after',
    evening: 'Reduce 2 hours before bed for sleep quality',
    sources: ['Journal of Clinical Nutrition', 'Sleep Medicine Reviews'],
  },
};

// ============================================================================
// HYDRATION GOAL RING
// ============================================================================

function HydrationGoalRing({ current, goal, size = 180 }) {
  const progress = Math.min(current / goal, 1);
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference * (1 - progress);

  const currentMl = Math.round(current * 1000);
  const goalMl = Math.round(goal * 1000);
  const percentage = Math.round(progress * 100);

  return (
    <View style={ringStyles.container}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={HYDRATION_ACCENT.primary} />
            <Stop offset="100%" stopColor={HYDRATION_ACCENT.primaryLight} />
          </SvgGradient>
        </Defs>

        {/* Background ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={ringStyles.centerContent}>
        <Text style={ringStyles.percentage}>{percentage}%</Text>
        <Text style={ringStyles.current}>{currentMl}ml</Text>
        <Text style={ringStyles.goal}>of {goalMl}ml</Text>
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  percentage: {
    fontSize: 36,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  current: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: HYDRATION_ACCENT.primary,
    marginTop: SPACING[1],
  },
  goal: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
  },
});

// ============================================================================
// SCIENCE CARD
// ============================================================================

function ScienceCard({ title, icon, children, source }) {
  return (
    <View style={scienceStyles.card}>
      <View style={scienceStyles.header}>
        <View style={scienceStyles.iconContainer}>
          <Ionicons name={icon} size={20} color={HYDRATION_ACCENT.primary} />
        </View>
        <Text style={scienceStyles.title}>{title}</Text>
      </View>
      <View style={scienceStyles.content}>{children}</View>
      {source && (
        <View style={scienceStyles.sourceContainer}>
          <Ionicons name="library-outline" size={12} color={TEXT.muted} />
          <Text style={scienceStyles.source}>{source}</Text>
        </View>
      )}
    </View>
  );
}

const scienceStyles = StyleSheet.create({
  card: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOWS.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: `${HYDRATION_ACCENT.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    flex: 1,
  },
  content: {
    gap: SPACING[2],
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  source: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    fontStyle: 'italic',
  },
});

// ============================================================================
// RECOMMENDATION ITEM
// ============================================================================

function RecommendationItem({ icon, title, description, priority, onAction }) {
  const priorityColors = {
    high: SEMANTIC.success.base,
    medium: SEMANTIC.warning.base,
    low: TEXT.tertiary,
  };

  return (
    <TouchableOpacity
      style={recItemStyles.container}
      onPress={onAction}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${description}`}
    >
      <View style={[recItemStyles.priorityDot, { backgroundColor: priorityColors[priority] }]} />
      <View style={recItemStyles.iconContainer}>
        <Ionicons name={icon} size={20} color={HYDRATION_ACCENT.primary} />
      </View>
      <View style={recItemStyles.content}>
        <Text style={recItemStyles.title}>{title}</Text>
        <Text style={recItemStyles.description}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={TEXT.muted} />
    </TouchableOpacity>
  );
}

const recItemStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: `${HYDRATION_ACCENT.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  description: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    marginTop: 2,
  },
});

// ============================================================================
// MAIN SCREEN
// ============================================================================

export default function WaterRecommendationsScreen() {
  const router = useRouter();
  const notify = useNotification();

  const { data: dashboardData } = useDashboard();
  const { analytics, isLoading, refetch } = useHydrationAnalytics();

  const currentIntake = dashboardData?.today?.waterIntakeLiters || 0;
  const goalLiters = dashboardData?.goals?.waterLiters || 2.0;

  // Generate personalized recommendations based on patterns
  const recommendations = useMemo(() => {
    const recs = [];

    // Morning hydration
    recs.push({
      icon: 'sunny-outline',
      title: 'Morning Boost',
      description: 'Drink 16oz (500ml) within 30 minutes of waking to rehydrate after sleep',
      priority: 'high',
    });

    // Based on activity level
    if (dashboardData?.goals?.activityMinutes > 30) {
      recs.push({
        icon: 'fitness-outline',
        title: 'Pre-Workout Hydration',
        description: 'Drink 500ml 2 hours before exercise. Dehydration impairs performance by 25%',
        priority: 'high',
      });
    }

    // Weekend pattern
    if (analytics?.patterns?.weekendDrop > 0.15) {
      recs.push({
        icon: 'calendar-outline',
        title: 'Weekend Consistency',
        description: `Your weekend intake drops ${Math.round((analytics.patterns.weekendDrop) * 100)}%. Set reminders for Sat/Sun`,
        priority: 'medium',
      });
    }

    // Time-based
    const hour = new Date().getHours();
    if (hour >= 14 && hour <= 17) {
      recs.push({
        icon: 'cafe-outline',
        title: 'Afternoon Slump',
        description: 'Mild dehydration causes afternoon fatigue. A glass of water beats coffee',
        priority: 'medium',
      });
    }

    // Cognitive benefits
    recs.push({
      icon: 'bulb-outline',
      title: 'Brain Boost',
      description: 'Proper hydration improves focus and reaction time. Stay above 2L daily',
      priority: 'medium',
    });

    // Pre-meal
    recs.push({
      icon: 'restaurant-outline',
      title: 'Pre-Meal Water',
      description: 'Drink water 30 min before meals for better digestion and satiety',
      priority: 'low',
    });

    return recs;
  }, [analytics, dashboardData]);

  const handleShare = async () => {
    const message = `My Hydration Goal\n\n${Math.round(currentIntake * 1000)}ml / ${Math.round(goalLiters * 1000)}ml today\n\nTracking with MyFoodTracker`;

    try {
      await Share.share({ message });
    } catch (error) {
      notify.error('Unable to share');
    }
  };

  const handleRecommendationPress = (rec) => {
    notify.info(`${rec.title}: ${rec.description}`);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/dashboard');
            }
          }}
          style={styles.backButton}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={TEXT.primary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Hydration Guide</Text>
          <Text style={styles.headerSubtitle}>Research-backed recommendations</Text>
        </View>
        <TouchableOpacity
          onPress={handleShare}
          style={styles.shareButton}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Share progress"
        >
          <Ionicons name="share-outline" size={20} color={TEXT.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={HYDRATION_ACCENT.primary} />
          </View>
        )}

        {!isLoading && (
          <>
            {/* Today's Progress */}
            <View style={styles.progressCard}>
              <Text style={styles.progressTitle}>Today's Progress</Text>
              <HydrationGoalRing current={currentIntake} goal={goalLiters} />

              <View style={styles.quickStats}>
                <View style={styles.quickStat}>
                  <Ionicons name="water" size={16} color={HYDRATION_ACCENT.primary} />
                  <Text style={styles.quickStatValue}>{Math.round(currentIntake * 1000)}ml</Text>
                  <Text style={styles.quickStatLabel}>consumed</Text>
                </View>
                <View style={styles.quickStatDivider} />
                <View style={styles.quickStat}>
                  <Ionicons name="flag-outline" size={16} color={SEMANTIC.success.base} />
                  <Text style={styles.quickStatValue}>{Math.round(goalLiters * 1000)}ml</Text>
                  <Text style={styles.quickStatLabel}>daily goal</Text>
                </View>
                <View style={styles.quickStatDivider} />
                <View style={styles.quickStat}>
                  <Ionicons name="trending-up" size={16} color={HYDRATION_PREDICTION.primary} />
                  <Text style={styles.quickStatValue}>
                    {Math.max(0, Math.round((goalLiters - currentIntake) * 1000))}ml
                  </Text>
                  <Text style={styles.quickStatLabel}>remaining</Text>
                </View>
              </View>
            </View>

            {/* Personalized Recommendations */}
            <ScienceCard
              title="Personalized Recommendations"
              icon="sparkles"
              source="Based on your patterns and research"
            >
              {recommendations.map((rec, index) => (
                <RecommendationItem
                  key={index}
                  {...rec}
                  onAction={() => handleRecommendationPress(rec)}
                />
              ))}
            </ScienceCard>

            {/* Why Hydration Matters */}
            <ScienceCard
              title="Why Hydration Matters"
              icon="brain-outline"
              source={HYDRATION_SCIENCE.cognitiveImpact.sources.join(', ')}
            >
              <Text style={styles.scienceText}>
                Losing just <Text style={styles.scienceHighlight}>2% body water</Text> impairs:
              </Text>
              {HYDRATION_SCIENCE.cognitiveImpact.effects.map((effect, index) => (
                <View key={index} style={styles.effectRow}>
                  <Ionicons name="alert-circle" size={14} color={SEMANTIC.warning.base} />
                  <Text style={styles.effectText}>{effect}</Text>
                </View>
              ))}
            </ScienceCard>

            {/* Optimal Timing */}
            <ScienceCard
              title="Optimal Timing"
              icon="time-outline"
              source={HYDRATION_SCIENCE.optimalTiming.sources.join(', ')}
            >
              <View style={styles.timingGrid}>
                <View style={styles.timingItem}>
                  <Ionicons name="sunny" size={18} color="#F59E0B" />
                  <Text style={styles.timingLabel}>Morning</Text>
                  <Text style={styles.timingDesc}>500ml within 30min of waking</Text>
                </View>
                <View style={styles.timingItem}>
                  <Ionicons name="restaurant" size={18} color="#10B981" />
                  <Text style={styles.timingLabel}>Pre-Meals</Text>
                  <Text style={styles.timingDesc}>250ml 30min before eating</Text>
                </View>
                <View style={styles.timingItem}>
                  <Ionicons name="fitness" size={18} color="#3B82F6" />
                  <Text style={styles.timingLabel}>Exercise</Text>
                  <Text style={styles.timingDesc}>500ml 2hr before + 200ml/20min</Text>
                </View>
                <View style={styles.timingItem}>
                  <Ionicons name="moon" size={18} color="#8B5CF6" />
                  <Text style={styles.timingLabel}>Evening</Text>
                  <Text style={styles.timingDesc}>Reduce 2hr before sleep</Text>
                </View>
              </View>
            </ScienceCard>

            {/* Exercise Hydration Guide */}
            <ScienceCard
              title="Exercise Hydration Guide"
              icon="barbell-outline"
              source={HYDRATION_SCIENCE.exerciseHydration.sources.join(', ')}
            >
              <View style={styles.exerciseGuide}>
                <View style={styles.exerciseStep}>
                  <View style={styles.exerciseStepNumber}>
                    <Text style={styles.exerciseStepNumberText}>1</Text>
                  </View>
                  <View style={styles.exerciseStepContent}>
                    <Text style={styles.exerciseStepTitle}>Before</Text>
                    <Text style={styles.exerciseStepDesc}>
                      {HYDRATION_SCIENCE.exerciseHydration.preWorkout}ml, 2 hours prior
                    </Text>
                  </View>
                </View>
                <View style={styles.exerciseStep}>
                  <View style={styles.exerciseStepNumber}>
                    <Text style={styles.exerciseStepNumberText}>2</Text>
                  </View>
                  <View style={styles.exerciseStepContent}>
                    <Text style={styles.exerciseStepTitle}>During</Text>
                    <Text style={styles.exerciseStepDesc}>
                      {HYDRATION_SCIENCE.exerciseHydration.duringWorkout}ml every 20 minutes
                    </Text>
                  </View>
                </View>
                <View style={styles.exerciseStep}>
                  <View style={styles.exerciseStepNumber}>
                    <Text style={styles.exerciseStepNumberText}>3</Text>
                  </View>
                  <View style={styles.exerciseStepContent}>
                    <Text style={styles.exerciseStepTitle}>After</Text>
                    <Text style={styles.exerciseStepDesc}>
                      Replace 150% of fluid lost during exercise
                    </Text>
                  </View>
                </View>
              </View>
            </ScienceCard>

            {/* Daily Requirements by Activity */}
            <ScienceCard
              title="Daily Requirements"
              icon="body-outline"
              source={HYDRATION_SCIENCE.dailyRecommendation.sources.join(', ')}
            >
              <View style={styles.requirementsGrid}>
                {Object.entries(HYDRATION_SCIENCE.dailyRecommendation)
                  .filter(([key]) => key !== 'sources')
                  .map(([level, { min, max }]) => (
                    <View key={level} style={styles.requirementItem}>
                      <Text style={styles.requirementLevel}>
                        {level.replace(/([A-Z])/g, ' $1').trim()}
                      </Text>
                      <Text style={styles.requirementRange}>
                        {min / 1000}L - {max / 1000}L
                      </Text>
                    </View>
                  ))}
              </View>
            </ScienceCard>

            {/* Quick Tips */}
            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>Quick Tips</Text>
              <View style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={18} color={SEMANTIC.success.base} />
                <Text style={styles.tipText}>Keep a water bottle visible at your desk</Text>
              </View>
              <View style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={18} color={SEMANTIC.success.base} />
                <Text style={styles.tipText}>Set hourly hydration reminders</Text>
              </View>
              <View style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={18} color={SEMANTIC.success.base} />
                <Text style={styles.tipText}>Drink a glass with each meal</Text>
              </View>
              <View style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={18} color={SEMANTIC.success.base} />
                <Text style={styles.tipText}>Infuse water with fruit for variety</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[6],
    paddingBottom: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    backgroundColor: SURFACES.background.primary,
  },
  backButton: {
    padding: SPACING[2],
  },
  headerText: {
    flex: 1,
    marginLeft: SPACING[2],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  shareButton: {
    padding: SPACING[2],
  },
  scrollContent: {
    padding: SPACING[4],
    paddingBottom: SPACING[8],
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[10],
  },

  // Progress Card
  progressCard: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.xl,
    padding: SPACING[5],
    marginBottom: SPACING[4],
    alignItems: 'center',
    ...SHADOWS.md,
  },
  progressTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: SPACING[4],
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING[4],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    width: '100%',
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING[1],
  },
  quickStatValue: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  quickStatLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  quickStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },

  // Science Text
  scienceText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
  },
  scienceHighlight: {
    color: HYDRATION_ACCENT.primary,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  effectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginTop: SPACING[2],
  },
  effectText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },

  // Timing Grid
  timingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[3],
  },
  timingItem: {
    width: '47%',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING[3],
    alignItems: 'center',
    gap: SPACING[1],
  },
  timingLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  timingDesc: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textAlign: 'center',
  },

  // Exercise Guide
  exerciseGuide: {
    gap: SPACING[3],
  },
  exerciseStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  exerciseStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: HYDRATION_ACCENT.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseStepNumberText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },
  exerciseStepContent: {
    flex: 1,
  },
  exerciseStepTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  exerciseStepDesc: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    marginTop: 2,
  },

  // Requirements Grid
  requirementsGrid: {
    gap: SPACING[2],
  },
  requirementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  requirementLevel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    textTransform: 'capitalize',
  },
  requirementRange: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: HYDRATION_ACCENT.primary,
  },

  // Tips Card
  tipsCard: {
    backgroundColor: `${HYDRATION_ACCENT.primary}08`,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[4],
  },
  tipsTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: SPACING[3],
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[2],
  },
  tipText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
});
