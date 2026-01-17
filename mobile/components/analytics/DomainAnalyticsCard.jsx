/**
 * DomainAnalyticsCard Component
 *
 * Reusable analytics card for different health domains.
 * Supports: food, hydration, mood, activity with domain-specific styling.
 * Handles missing data gracefully with appropriate messaging.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, SURFACES, BRAND, SEMANTIC } from '../../constants/premiumTheme';
import MiniLineChart from './MiniLineChart';

// Domain configurations with friendly, engaging messaging
const DOMAIN_CONFIG = {
  nutrition: {
    icon: 'nutrition',
    label: 'Nutrition',
    color: '#10B981',
    gradient: ['#10B98120', '#10B98105'],
    unit: 'cal',
    emptyIcon: 'restaurant-outline',
    emptyTitle: "What's on your plate?",
    emptyMessage: "Let's track your meals and see how you're fueling up!",
    emptyAction: "Add Meal",
  },
  hydration: {
    icon: 'water',
    label: 'Hydration',
    color: '#3B82F6',
    gradient: ['#3B82F620', '#3B82F605'],
    unit: 'glasses',
    emptyIcon: 'water-outline',
    emptyTitle: 'Stay refreshed!',
    emptyMessage: 'Track your water and beverages to stay on top of hydration',
    emptyAction: 'Log Drink',
  },
  mood: {
    icon: 'happy',
    label: 'Mood',
    color: '#8B5CF6',
    gradient: ['#8B5CF620', '#8B5CF605'],
    unit: 'avg',
    emptyIcon: 'happy-outline',
    emptyTitle: 'How are you feeling?',
    emptyMessage: 'A quick check-in helps spot what lifts your spirits',
    emptyAction: 'Check In',
  },
  activity: {
    icon: 'fitness',
    label: 'Activity',
    color: '#F59E0B',
    gradient: ['#F59E0B20', '#F59E0B05'],
    unit: 'min',
    emptyIcon: 'fitness-outline',
    emptyTitle: 'On the move?',
    emptyMessage: 'Any movement counts - walks, stretches, workouts!',
    emptyAction: 'Log Activity',
  },
};

const DomainAnalyticsCard = ({
  domain = 'nutrition',
  data,
  timeframe = 'weekly',
  trend,
  goal,
  onPress,
  compact = false,
}) => {
  const config = DOMAIN_CONFIG[domain] || DOMAIN_CONFIG.nutrition;
  const hasData = data && (data.value !== null && data.value !== undefined);

  // Trend icon and color
  const getTrendDisplay = (direction, change) => {
    if (!direction || direction === 'stable') {
      return { icon: 'remove', color: TEXT.tertiary, text: 'Stable' };
    }
    if (direction === 'up') {
      return {
        icon: 'trending-up',
        color: domain === 'mood' ? SEMANTIC.success : (change > 0 ? SEMANTIC.success : SEMANTIC.warning),
        text: `+${Math.abs(change)}%`,
      };
    }
    return {
      icon: 'trending-down',
      color: domain === 'mood' ? SEMANTIC.danger : (change < 0 ? SEMANTIC.danger : SEMANTIC.success),
      text: `-${Math.abs(change)}%`,
    };
  };

  // Progress percentage towards goal
  const getGoalProgress = () => {
    if (!goal || !hasData) return null;
    const progress = Math.min(100, (data.value / goal) * 100);
    return progress;
  };

  const goalProgress = getGoalProgress();
  const trendDisplay = trend ? getTrendDisplay(trend.direction, trend.change) : null;

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.compactIconBg, { backgroundColor: config.color + '15' }]}>
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>
        <View style={styles.compactContent}>
          <Text style={styles.compactLabel}>{config.label}</Text>
          {hasData ? (
            <Text style={styles.compactValue}>
              {data.value} <Text style={styles.compactUnit}>{config.unit}</Text>
            </Text>
          ) : (
            <Text style={styles.compactEmpty}>No data</Text>
          )}
        </View>
        {trendDisplay && (
          <Ionicons name={trendDisplay.icon} size={18} color={trendDisplay.color} />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <LinearGradient
        colors={config.gradient}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
              <Ionicons name={config.icon} size={20} color={config.color} />
            </View>
            <Text style={styles.title}>{config.label}</Text>
          </View>
          {timeframe && (
            <View style={styles.timeframeBadge}>
              <Text style={styles.timeframeText}>
                {timeframe === 'daily' ? 'Today' : timeframe === 'weekly' ? 'This Week' : 'This Month'}
              </Text>
            </View>
          )}
        </View>

        {hasData ? (
          <>
            {/* Main Value */}
            <View style={styles.valueSection}>
              <Text style={[styles.mainValue, { color: config.color }]}>
                {data.value}
              </Text>
              <Text style={styles.unit}>{config.unit}</Text>
              {trendDisplay && (
                <View style={[styles.trendBadge, { backgroundColor: trendDisplay.color + '15' }]}>
                  <Ionicons name={trendDisplay.icon} size={14} color={trendDisplay.color} />
                  <Text style={[styles.trendText, { color: trendDisplay.color }]}>
                    {trendDisplay.text}
                  </Text>
                </View>
              )}
            </View>

            {/* Goal Progress */}
            {goalProgress !== null && (
              <View style={styles.goalSection}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalLabel}>Goal Progress</Text>
                  <Text style={styles.goalValue}>{Math.round(goalProgress)}%</Text>
                </View>
                <View style={styles.goalBarBg}>
                  <View
                    style={[
                      styles.goalBarFill,
                      {
                        width: `${goalProgress}%`,
                        backgroundColor: goalProgress >= 100 ? SEMANTIC.success : config.color,
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            {/* Mini Chart */}
            {data.chartData && data.chartData.length > 0 && (
              <View style={styles.chartSection}>
                <MiniLineChart
                  data={data.chartData}
                  color={config.color}
                  height={50}
                  showDots={false}
                />
              </View>
            )}

            {/* Insight Snippet */}
            {data.insight && (
              <View style={styles.insightContainer}>
                <Ionicons name="bulb-outline" size={14} color={config.color} />
                <Text style={styles.insightText}>{data.insight}</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name={config.emptyIcon} size={40} color={config.color} />
            <Text style={styles.emptyTitle}>{config.emptyTitle}</Text>
            <Text style={styles.emptyMessage}>{config.emptyMessage}</Text>
            {onPress && (
              <TouchableOpacity
                style={[styles.logButton, { backgroundColor: config.color + '15' }]}
                onPress={onPress}
              >
                <Ionicons name="add-circle" size={18} color={config.color} />
                <Text style={[styles.logButtonText, { color: config.color }]}>
                  {config.emptyAction}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Data Quality Indicator */}
        {data?.dataQuality !== undefined && (
          <View style={styles.qualityIndicator}>
            <Ionicons
              name={data.dataQuality >= 0.7 ? 'checkmark-circle' : 'information-circle'}
              size={14}
              color={data.dataQuality >= 0.7 ? SEMANTIC.success : TEXT.tertiary}
            />
            <Text style={styles.qualityText}>
              {(() => {
                const quality = data.dataQuality;
                const percent = Math.round(quality * 100);
                if (quality >= 0.9) {
                  return domain === 'nutrition' ? 'Complete meal data' :
                         domain === 'hydration' ? 'Hydration fully tracked' :
                         domain === 'mood' ? 'Mood patterns captured' :
                         domain === 'activity' ? 'Activity well logged' : 'Excellent coverage';
                }
                if (quality >= 0.7) {
                  return domain === 'nutrition' ? `${percent}% of meals logged` :
                         domain === 'hydration' ? `${percent}% hydration tracked` :
                         domain === 'mood' ? `${percent}% mood data captured` :
                         domain === 'activity' ? `${percent}% activity recorded` : 'Good coverage';
                }
                if (quality >= 0.4) {
                  return domain === 'nutrition' ? `${percent}% - log more meals` :
                         domain === 'hydration' ? `${percent}% - track more water` :
                         domain === 'mood' ? `${percent}% - add mood check-ins` :
                         domain === 'activity' ? `${percent}% - log more activity` : `${percent}% coverage`;
                }
                return domain === 'nutrition' ? 'Log meals for insights' :
                       domain === 'hydration' ? 'Track water for patterns' :
                       domain === 'mood' ? 'Check in for mood trends' :
                       domain === 'activity' ? 'Log activity to track' : 'Start logging';
              })()}
            </Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  gradient: {
    padding: 16,
    backgroundColor: SURFACES.card.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT.primary,
  },
  timeframeBadge: {
    backgroundColor: SURFACES.background.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeframeText: {
    fontSize: 12,
    color: TEXT.secondary,
    fontWeight: '500',
  },
  valueSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 16,
  },
  mainValue: {
    fontSize: 42,
    fontWeight: '700',
  },
  unit: {
    fontSize: 16,
    color: TEXT.secondary,
    fontWeight: '500',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  goalSection: {
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  goalLabel: {
    fontSize: 12,
    color: TEXT.secondary,
  },
  goalValue: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT.primary,
  },
  goalBarBg: {
    height: 6,
    backgroundColor: SURFACES.background.secondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  chartSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  insightContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: SURFACES.background.secondary,
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: TEXT.secondary,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT.primary,
    marginTop: 12,
  },
  emptyMessage: {
    fontSize: 13,
    color: TEXT.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND.primary + '15',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  logButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.primary,
  },
  qualityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  qualityText: {
    fontSize: 12,
    color: TEXT.tertiary,
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.card.primary,
    padding: 12,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  compactIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
  },
  compactLabel: {
    fontSize: 12,
    color: TEXT.secondary,
  },
  compactValue: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT.primary,
  },
  compactUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: TEXT.tertiary,
  },
  compactEmpty: {
    fontSize: 14,
    color: TEXT.tertiary,
    fontStyle: 'italic',
  },
});

export default DomainAnalyticsCard;
