/**
 * ThisWeekCard - Premium aggregate nutrition trends component
 *
 * Design Philosophy: "Aggregate trends and insights over time"
 * - NOT individual items, but patterns and statistics
 * - Tabbed interface: Stats | Insights
 * - Period selector (7/14/30/90 days)
 * - Oura Ring "Calm Luxury" aesthetic
 *
 * Navigation:
 * - View Trends → /insights/nutrition (detailed trends screen)
 * - Tap insight → relevant detail screen
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designTokens';
import { BRAND, TEXT, SURFACES, SHADOWS, SEMANTIC, CARD_SYSTEM } from '../../constants/premiumTheme';

// Tab options - Stats shows aggregate data, Insights shows AI tips
const TABS = [
  { key: 'stats', label: 'Stats' },
  { key: 'insights', label: 'Insights' },
];

// Period options for history tab
const PERIODS = [7, 14, 30, 90];

// Meal type icons
const MEAL_TYPE_ICONS = {
  breakfast: 'sunny-outline',
  lunch: 'restaurant-outline',
  dinner: 'moon-outline',
  snack: 'cafe-outline',
};

/**
 * Group meals that were logged together
 * Groups by: mealId, or clientEventId prefix, or timestamp proximity
 */
function groupMeals(meals) {
  if (!meals || meals.length === 0) return [];

  const groups = new Map();

  meals.forEach((meal) => {
    // Determine group key
    let groupKey;

    if (meal.mealId) {
      groupKey = meal.mealId;
    } else if (meal.clientEventId) {
      // Use first 2 segments of clientEventId as group key
      const parts = meal.clientEventId.split('-');
      groupKey = parts.slice(0, 2).join('-');
    } else {
      // Use timestamp rounded to nearest minute
      const date = new Date(meal.loggedDate || meal.createdAt);
      groupKey = `${date.toDateString()}-${date.getHours()}-${date.getMinutes()}`;
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        id: groupKey,
        items: [],
        totalCalories: 0,
        totalProtein: 0,
        timestamp: meal.loggedDate || meal.createdAt,
        mealType: meal.mealType,
        imageUrl: meal.imageUrl,
      });
    }

    const group = groups.get(groupKey);
    group.items.push(meal);
    group.totalCalories += meal.calories || 0;
    group.totalProtein += meal.protein || 0;

    // Use earliest timestamp
    const mealTime = new Date(meal.loggedDate || meal.createdAt);
    const groupTime = new Date(group.timestamp);
    if (mealTime < groupTime) {
      group.timestamp = meal.loggedDate || meal.createdAt;
    }

    // Use first image found
    if (!group.imageUrl && meal.imageUrl) {
      group.imageUrl = meal.imageUrl;
    }
  });

  // Convert to array and sort by timestamp (newest first)
  return Array.from(groups.values())
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Format time from timestamp
 */
function formatTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Get display name for grouped meal
 */
function getGroupDisplayName(group) {
  if (group.items.length === 1) {
    return group.items[0].foodName || 'Food item';
  }

  const firstItem = group.items[0].foodName || 'Food';
  const remaining = group.items.length - 1;
  return `${firstItem} + ${remaining} more`;
}

/**
 * Single grouped meal item
 */
function GroupedMealItem({ group, expanded, onToggle, onPress }) {
  const time = formatTime(group.timestamp);
  const displayName = getGroupDisplayName(group);
  const hasMultiple = group.items.length > 1;

  return (
    <View style={styles.mealItemContainer}>
      <TouchableOpacity
        style={styles.mealItem}
        onPress={() => hasMultiple ? onToggle() : onPress?.(group.items[0])}
        activeOpacity={0.7}
      >
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {group.imageUrl ? (
            <Image
              source={{ uri: group.imageUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons
                name={MEAL_TYPE_ICONS[group.mealType] || 'restaurant-outline'}
                size={18}
                color={TEXT.tertiary}
              />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.mealContent}>
          <View style={styles.mealHeader}>
            <Text style={styles.mealName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.mealTime}>{time}</Text>
          </View>
          <View style={styles.mealStats}>
            <Text style={styles.calorieText}>
              {Math.round(group.totalCalories)} cal
            </Text>
            {group.totalProtein > 0 && (
              <Text style={styles.proteinText}>
                {Math.round(group.totalProtein)}g protein
              </Text>
            )}
          </View>
        </View>

        {/* Expand/Chevron */}
        {hasMultiple ? (
          <TouchableOpacity
            onPress={onToggle}
            style={styles.expandButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={TEXT.tertiary}
            />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
        )}
      </TouchableOpacity>

      {/* Expanded items */}
      {expanded && hasMultiple && (
        <View style={styles.expandedItems}>
          {group.items.map((item, idx) => (
            <TouchableOpacity
              key={item.id || item.clientEventId || idx}
              style={styles.subItem}
              onPress={() => onPress?.(item)}
              activeOpacity={0.7}
            >
              <View style={styles.subItemDot} />
              <Text style={styles.subItemName} numberOfLines={1}>
                {item.foodName || 'Food item'}
              </Text>
              <Text style={styles.subItemCal}>
                {Math.round(item.calories || 0)} cal
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Tab selector component
 */
function TabSelector({ activeTab, onTabChange }) {
  return (
    <View style={styles.tabContainer}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tab,
            activeTab === tab.key && styles.tabActive,
          ]}
          onPress={() => onTabChange(tab.key)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            activeTab === tab.key && styles.tabTextActive,
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/**
 * Period selector for History tab
 */
function PeriodSelector({ selectedPeriod, onPeriodChange }) {
  return (
    <View style={styles.periodContainer}>
      {PERIODS.map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodChip,
            selectedPeriod === period && styles.periodChipActive,
          ]}
          onPress={() => onPeriodChange(period)}
          activeOpacity={0.7}
        >
          {selectedPeriod === period ? (
            <LinearGradient
              colors={[BRAND.primary, '#8B6EFF']}
              style={styles.periodChipGradient}
            >
              <Text style={styles.periodTextActive}>{period}d</Text>
            </LinearGradient>
          ) : (
            <Text style={styles.periodText}>{period}d</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

/**
 * Summary stats row
 */
function SummaryRow({ totalCalories, totalMeals, avgScore }) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{Math.round(totalCalories)}</Text>
        <Text style={styles.summaryLabel}>total cal</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{totalMeals}</Text>
        <Text style={styles.summaryLabel}>items</Text>
      </View>
      {avgScore > 0 && (
        <>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: SEMANTIC.success.base }]}>
              {Math.round(avgScore)}
            </Text>
            <Text style={styles.summaryLabel}>avg score</Text>
          </View>
        </>
      )}
    </View>
  );
}

/**
 * Empty state
 */
function EmptyState({ message }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="restaurant-outline" size={28} color={TEXT.tertiary} />
      </View>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

/**
 * Today tab content
 */
function TodayTab({ meals, onMealPress }) {
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const groupedMeals = useMemo(() => groupMeals(meals), [meals]);

  const toggleGroup = useCallback((groupId) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const totalCalories = useMemo(() =>
    meals.reduce((sum, m) => sum + (m.calories || 0), 0),
    [meals]
  );

  if (groupedMeals.length === 0) {
    return <EmptyState message="No meals logged today. Start tracking!" />;
  }

  return (
    <View>
      <SummaryRow
        totalCalories={totalCalories}
        totalMeals={meals.length}
        avgScore={0}
      />

      <View style={styles.mealsList}>
        {groupedMeals.slice(0, 5).map((group) => (
          <GroupedMealItem
            key={group.id}
            group={group}
            expanded={expandedGroups.has(group.id)}
            onToggle={() => toggleGroup(group.id)}
            onPress={onMealPress}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * Stats tab content - shows aggregate data for selected period
 */
function StatsTab({ periodData, selectedPeriod, onPeriodChange }) {
  if (!periodData || periodData.totalMeals === 0) {
    return (
      <View>
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={onPeriodChange}
        />
        <EmptyState message={`No data in the last ${selectedPeriod} days`} />
      </View>
    );
  }

  return (
    <View>
      <PeriodSelector
        selectedPeriod={selectedPeriod}
        onPeriodChange={onPeriodChange}
      />

      <View style={styles.statsContainer}>
        <View style={styles.historyStat}>
          <Text style={styles.historyStatValue}>
            {Math.round(periodData.avgCalories || 0)}
          </Text>
          <Text style={styles.historyStatLabel}>avg cal/day</Text>
          {periodData.caloriesTrend !== 0 && (
            <View style={[
              styles.trendBadge,
              periodData.caloriesTrend > 0 ? styles.trendUp : styles.trendDown,
            ]}>
              <Ionicons
                name={periodData.caloriesTrend > 0 ? 'arrow-up' : 'arrow-down'}
                size={10}
                color={periodData.caloriesTrend > 0 ? SEMANTIC.success.base : SEMANTIC.error?.base || '#EF4444'}
              />
              <Text style={[
                styles.trendText,
                { color: periodData.caloriesTrend > 0 ? SEMANTIC.success.base : SEMANTIC.error?.base || '#EF4444' },
              ]}>
                {Math.abs(periodData.caloriesTrend)}%
              </Text>
            </View>
          )}
        </View>

        <View style={styles.historyStatDivider} />

        <View style={styles.historyStat}>
          <Text style={styles.historyStatValue}>
            {Math.round(periodData.avgProtein || 0)}g
          </Text>
          <Text style={styles.historyStatLabel}>avg protein</Text>
        </View>

        <View style={styles.historyStatDivider} />

        <View style={styles.historyStat}>
          <Text style={styles.historyStatValue}>
            {periodData.totalMeals || 0}
          </Text>
          <Text style={styles.historyStatLabel}>total meals</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Insights tab content
 */
function InsightsTab({ insights }) {
  if (!insights || insights.length === 0) {
    return <EmptyState message="Log more meals to see insights" />;
  }

  return (
    <View style={styles.insightsList}>
      {insights.map((insight, idx) => (
        <View key={idx} style={styles.insightItem}>
          <View style={[styles.insightIcon, { backgroundColor: `${insight.color}15` }]}>
            <Ionicons name={insight.icon} size={16} color={insight.color} />
          </View>
          <Text style={styles.insightText}>{insight.text}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Main MealInsightsCard Component
 */
export default function MealInsightsCard({
  meals = [],
  periodData = null,
  insights = [],
  onMealPress,
  onViewAll,
}) {
  const [activeTab, setActiveTab] = useState('stats');
  const [selectedPeriod, setSelectedPeriod] = useState(7);

  // Generate default insights if none provided
  const displayInsights = useMemo(() => {
    if (insights.length > 0) return insights;

    // Generate basic insights from meals
    const generatedInsights = [];

    if (meals.length > 0) {
      const totalProtein = meals.reduce((sum, m) => sum + (m.protein || 0), 0);
      const avgProtein = totalProtein / meals.length;

      if (avgProtein < 20) {
        generatedInsights.push({
          icon: 'nutrition-outline',
          text: 'Try adding more protein to your meals',
          color: BRAND.primary,
        });
      }

      // Check meal distribution
      const mealTypes = meals.map(m => m.mealType).filter(Boolean);
      const hasBreakfast = mealTypes.includes('breakfast');

      if (!hasBreakfast) {
        generatedInsights.push({
          icon: 'sunny-outline',
          text: "You haven't logged breakfast today",
          color: '#F59E0B',
        });
      }
    }

    return generatedInsights;
  }, [meals, insights]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="analytics-outline" size={16} color={BRAND.primary} />
          </View>
          <Text style={styles.headerTitle}>This Week</Text>
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}>
            <Text style={styles.viewAllText}>View Trends</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Selector */}
      <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'stats' && (
          <StatsTab
            periodData={periodData}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />
        )}
        {activeTab === 'insights' && (
          <InsightsTab insights={displayInsights} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...CARD_SYSTEM.standard,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  headerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(107, 78, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold, // Consistent with other cards
    color: TEXT.primary,
  },
  viewAllText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: BRAND.primary,
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(107, 78, 255, 0.05)',
    borderRadius: RADIUS.lg,
    padding: 3,
    marginBottom: SPACING[3],
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: SURFACES.card.primary,
    ...SHADOWS.sm,
  },
  tabText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
  },
  tabTextActive: {
    color: BRAND.primary,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },

  // Tab content
  tabContent: {
    minHeight: 120,
  },

  // Period selector
  periodContainer: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  periodChip: {
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  periodChipActive: {
    // Handled by gradient
  },
  periodChipGradient: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1] + 2,
  },
  periodText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1] + 2,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  periodTextActive: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#FFF',
  },

  // Summary row
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(107, 78, 255, 0.05)',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING[2],
    marginBottom: SPACING[3],
  },
  summaryItem: {
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  summaryLabel: {
    fontSize: 10,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(107, 78, 255, 0.15)',
  },

  // Meals list
  mealsList: {
    gap: SPACING[2],
  },
  mealItemContainer: {
    // Container for grouped meal item + expanded sub-items
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    padding: SPACING[2],
    gap: SPACING[3],
  },
  thumbnailContainer: {
    // Wrapper for thumbnail
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
  },
  thumbnailPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealContent: {
    flex: 1,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  mealName: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginRight: SPACING[2],
  },
  mealTime: {
    fontSize: 10,
    color: TEXT.tertiary,
  },
  mealStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  calorieText: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
  },
  proteinText: {
    fontSize: 11,
    color: '#3B82F6',
  },
  expandButton: {
    padding: SPACING[1],
  },

  // Expanded sub-items
  expandedItems: {
    marginTop: SPACING[1],
    marginLeft: 44 + SPACING[3],
    paddingLeft: SPACING[2],
    borderLeftWidth: 2,
    borderLeftColor: `${BRAND.primary}30`,
  },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[1],
    gap: SPACING[2],
  },
  subItemDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: BRAND.primary,
  },
  subItemName: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
  },
  subItemCal: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },

  // Stats container (for This Week Stats tab)
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(107, 78, 255, 0.05)',
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
  },
  historyStat: {
    alignItems: 'center',
    gap: 2,
  },
  historyStatValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  historyStatLabel: {
    fontSize: 10,
    color: TEXT.tertiary,
  },
  historyStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(107, 78, 255, 0.15)',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginTop: 2,
  },
  trendUp: {
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
  },
  trendDown: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  trendText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },

  // Insights
  insightsList: {
    gap: SPACING[2],
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    padding: SPACING[4],
  },
  emptyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(107, 78, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    textAlign: 'center',
  },
});
