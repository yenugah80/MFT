/**
 * Activity Deep Analytics Screen
 *
 * Enhanced visualizations for activity tracking:
 * - Weekly activity ring chart
 * - Activity type distribution (donut chart)
 * - Time of day patterns with mini gauges
 * - Recent activity entries
 * - Calorie burn trends
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Path } from 'react-native-svg';

import { useActivityLog } from '../../hooks/useActivityLog';
import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  BRAND,
  SHADOWS,
} from '../../constants/premiumTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Colors for activity types
const ACTIVITY_COLORS = {
  running: { color: '#EF4444', light: '#FEE2E2', gradient: ['#EF4444', '#F87171'] },
  walking: { color: '#10B981', light: '#D1FAE5', gradient: ['#10B981', '#34D399'] },
  cycling: { color: '#3B82F6', light: '#DBEAFE', gradient: ['#3B82F6', '#60A5FA'] },
  swimming: { color: '#06B6D4', light: '#CFFAFE', gradient: ['#06B6D4', '#22D3EE'] },
  weights: { color: '#8B5CF6', light: '#EDE9FE', gradient: ['#8B5CF6', '#A78BFA'] },
  yoga: { color: '#EC4899', light: '#FCE7F3', gradient: ['#EC4899', '#F472B6'] },
  hiit: { color: '#F59E0B', light: '#FEF3C7', gradient: ['#F59E0B', '#FBBF24'] },
  general: { color: '#6366F1', light: '#E0E7FF', gradient: ['#6366F1', '#818CF8'] },
};

const getActivityMeta = (type) => {
  const normalizedType = (type || 'general').toLowerCase();
  return ACTIVITY_COLORS[normalizedType] || ACTIVITY_COLORS.general;
};

// ============================================================================
// MINI HALF GAUGE - For time pattern cards
// ============================================================================

const MiniHalfGauge = ({ value, maxValue = 100, size = 70 }) => {
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const percentage = Math.min((value / maxValue) * 100, 100);
  const progressAngle = (percentage / 100) * 180;

  const polarToCartesian = (centerX, centerY, r, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees - 180) * Math.PI) / 180.0;
    return {
      x: Math.round((centerX + r * Math.cos(angleInRadians)) * 100) / 100,
      y: Math.round((centerY + r * Math.sin(angleInRadians)) * 100) / 100,
    };
  };

  const describeArc = (centerX, centerY, r, startAngle, endAngle) => {
    const start = polarToCartesian(centerX, centerY, r, endAngle);
    const end = polarToCartesian(centerX, centerY, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  const bgPath = describeArc(cx, cy, radius, 0, 180);
  const progressPath = progressAngle > 0 ? describeArc(cx, cy, radius, 0, progressAngle) : '';
  const gradientId = `activity-gauge-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <Svg width={size} height={size / 2 + strokeWidth / 2} viewBox={`0 0 ${size} ${size / 2 + strokeWidth / 2}`}>
      <Defs>
        <SvgLinearGradient id={`${gradientId}-bg`} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#E2E8F0" stopOpacity={0.5} />
          <Stop offset="100%" stopColor="#E2E8F0" stopOpacity={0.5} />
        </SvgLinearGradient>
        <SvgLinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#8B5CF6" />
          <Stop offset="50%" stopColor="#6366F1" />
          <Stop offset="100%" stopColor="#3B82F6" />
        </SvgLinearGradient>
      </Defs>
      <Path
        d={bgPath}
        fill="none"
        stroke={`url(#${gradientId}-bg)`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {progressPath && (
        <Path
          d={progressPath}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
};

// ============================================================================
// DONUT CHART - For activity distribution
// ============================================================================

const DonutChart = ({ data, size = 140, strokeWidth = 28 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  let cumulativePercent = 0;
  const segments = data.map((item) => {
    const dashLength = (item.percent / 100) * circumference;
    const gapLength = circumference - dashLength;
    const rotation = (cumulativePercent / 100) * 360 - 90;
    cumulativePercent += item.percent;

    return {
      ...item,
      dashArray: `${dashLength} ${gapLength}`,
      rotation,
    };
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {segments.map((segment, index) => (
          <Circle
            key={segment.type || index}
            cx={cx}
            cy={cy}
            r={radius}
            stroke={segment.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={segment.dashArray}
            strokeLinecap="butt"
            transform={`rotate(${segment.rotation} ${cx} ${cy})`}
          />
        ))}
      </Svg>
      {data.length > 0 && (
        <View style={styles.donutCenter}>
          <Ionicons name="fitness" size={24} color={data[0].color} />
          <Text style={[styles.donutPercent, { color: data[0].color }]}>
            {data[0].percent.toFixed(0)}%
          </Text>
          <Text style={styles.donutLabel}>{data[0].type}</Text>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// ACTIVITY DISTRIBUTION
// ============================================================================

const ActivityDistribution = ({ activities }) => {
  const distribution = useMemo(() => {
    if (!activities?.length) return [];

    const counts = {};
    activities.forEach(activity => {
      const type = activity.type || activity.activityType || 'general';
      counts[type] = (counts[type] || 0) + 1;
    });

    const total = activities.length;
    return Object.entries(counts)
      .map(([type, count]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        count,
        percent: (count / total) * 100,
        ...getActivityMeta(type),
      }))
      .sort((a, b) => b.count - a.count);
  }, [activities]);

  if (!distribution.length) return null;

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name="pie-chart" size={18} color={BRAND.primary} />
        <Text style={styles.sectionTitle}>Activity Breakdown</Text>
      </View>

      <View style={styles.distributionContent}>
        <DonutChart data={distribution} size={140} strokeWidth={24} />

        <View style={styles.legendVertical}>
          {distribution.map(d => (
            <View key={d.type} style={styles.legendRow}>
              <View style={[styles.legendColorBar, { backgroundColor: d.color }]} />
              <Text style={styles.legendLabel}>{d.type}</Text>
              <Text style={[styles.legendPercent, { color: d.color }]}>
                {d.percent.toFixed(0)}%
              </Text>
              <Text style={styles.legendCount}>({d.count})</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// TIME PATTERNS
// ============================================================================

const TimePatterns = ({ activities }) => {
  const patterns = useMemo(() => {
    if (!activities?.length || activities.length < 3) return null;

    const timeSlots = {
      morning: { activities: [], label: 'Morning', sublabel: '6am-12pm', icon: 'sunny', iconColor: '#F59E0B' },
      afternoon: { activities: [], label: 'Afternoon', sublabel: '12pm-5pm', icon: 'partly-sunny', iconColor: '#3B82F6' },
      evening: { activities: [], label: 'Evening', sublabel: '5pm-9pm', icon: 'moon', iconColor: '#8B5CF6' },
      night: { activities: [], label: 'Night', sublabel: '9pm-6am', icon: 'cloudy-night', iconColor: '#64748B' },
    };

    activities.forEach(activity => {
      const date = new Date(activity.loggedAt || activity.createdAt);
      const hour = date.getHours();
      if (hour >= 6 && hour < 12) timeSlots.morning.activities.push(activity);
      else if (hour >= 12 && hour < 17) timeSlots.afternoon.activities.push(activity);
      else if (hour >= 17 && hour < 21) timeSlots.evening.activities.push(activity);
      else timeSlots.night.activities.push(activity);
    });

    return Object.entries(timeSlots)
      .filter(([_, slot]) => slot.activities.length > 0)
      .map(([name, slot]) => {
        const totalMinutes = slot.activities.reduce((sum, a) => sum + (a.durationMinutes || 0), 0);
        const avgMinutes = totalMinutes / slot.activities.length;
        return {
          name,
          ...slot,
          count: slot.activities.length,
          avgMinutes: Math.round(avgMinutes),
          totalMinutes,
        };
      });
  }, [activities]);

  if (!patterns?.length) return null;

  const maxMinutes = Math.max(...patterns.map(p => p.avgMinutes));

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name="time" size={18} color={BRAND.primary} />
        <Text style={styles.sectionTitle}>Activity by Time of Day</Text>
      </View>

      <View style={styles.timePatternsGrid}>
        {patterns.map(p => {
          const isHighest = p.avgMinutes === maxMinutes;
          return (
            <View key={p.name} style={[styles.timePatternItem, isHighest && styles.timePatternItemHighlight]}>
              <View style={styles.timePatternGaugeContainer}>
                <MiniHalfGauge value={p.avgMinutes} maxValue={Math.max(60, maxMinutes)} size={70} />
                <View style={styles.timePatternGaugeCenter}>
                  <Ionicons name={p.icon} size={16} color={isHighest ? '#10B981' : p.iconColor} />
                </View>
              </View>

              <Text style={[styles.timePatternScore, isHighest && { color: '#10B981' }]}>
                {p.avgMinutes}m
              </Text>
              <Text style={styles.timePatternLabel}>{p.label}</Text>
              <Text style={styles.timePatternSublabel}>{p.count} sessions</Text>

              {isHighest && (
                <View style={styles.timePatternBestBadge}>
                  <Ionicons name="star" size={10} color="#10B981" />
                  <Text style={styles.timePatternBestText}>Peak</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ============================================================================
// RECENT ENTRIES
// ============================================================================

const RecentEntries = ({ activities }) => {
  const recentActivities = useMemo(() => {
    if (!activities?.length) return [];
    return activities.slice(0, 10);
  }, [activities]);

  if (!recentActivities.length) return null;

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + `, ${timeStr}`;
  };

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name="list" size={18} color={BRAND.primary} />
        <Text style={styles.sectionTitle}>Recent Activities</Text>
        <Text style={styles.entriesCount}>{activities.length} total</Text>
      </View>

      {recentActivities.map((activity, idx) => {
        const meta = getActivityMeta(activity.type || activity.activityType);
        const type = (activity.type || activity.activityType || 'general').charAt(0).toUpperCase() +
                     (activity.type || activity.activityType || 'general').slice(1);

        return (
          <View key={activity.id || idx} style={[styles.entryRow, idx === recentActivities.length - 1 && { borderBottomWidth: 0 }]}>
            <LinearGradient
              colors={meta.gradient}
              style={styles.entryIconBg}
            >
              <Ionicons name="fitness" size={20} color="#FFFFFF" />
            </LinearGradient>

            <View style={styles.entryContent}>
              <View style={styles.entryTopRow}>
                <Text style={[styles.entryType, { color: meta.color }]}>{type}</Text>
                <Text style={styles.entryDuration}>{activity.durationMinutes || 0} min</Text>
              </View>
              <Text style={styles.entryTime}>{formatDateTime(activity.loggedAt || activity.createdAt)}</Text>

              <View style={styles.entryStats}>
                {activity.caloriesBurned > 0 && (
                  <View style={[styles.entryStat, { backgroundColor: `${meta.color}15` }]}>
                    <Ionicons name="flame" size={10} color={meta.color} />
                    <Text style={[styles.entryStatText, { color: meta.color }]}>
                      {activity.caloriesBurned} kcal
                    </Text>
                  </View>
                )}
                {activity.intensity && (
                  <View style={[styles.entryStat, { backgroundColor: `${meta.color}15` }]}>
                    <Ionicons name="speedometer" size={10} color={meta.color} />
                    <Text style={[styles.entryStatText, { color: meta.color }]}>
                      {activity.intensity}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

// ============================================================================
// MAIN SCREEN
// ============================================================================

export default function ActivityDeepInsights() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState('WEEK');

  const { activities, weeklyProgress, todaySummary, isLoading } = useActivityLog();

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard');
  }, [router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND.primary} />
        <Text style={styles.loadingText}>Loading activity data...</Text>
      </View>
    );
  }

  const hasData = activities && activities.length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Activity Analysis',
          headerTitleStyle: { fontWeight: '600', fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.primary },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#F8FAFC' },
          headerLeft: () => (
            <TouchableOpacity
              onPress={handleBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ marginLeft: 8 }}
            >
              <Ionicons name="chevron-back" size={24} color={TEXT.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <LinearGradient
          colors={['#8B5CF6', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroStats}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>{todaySummary?.totalCalories || 0}</Text>
                <Text style={styles.heroStatLabel}>kcal today</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>{todaySummary?.totalMinutes || 0}</Text>
                <Text style={styles.heroStatLabel}>min active</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>{weeklyProgress?.progress || 0}%</Text>
                <Text style={styles.heroStatLabel}>weekly goal</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {!hasData ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="fitness-outline" size={48} color={TEXT.tertiary} />
            </View>
            <Text style={styles.emptyStateTitle}>No activity data yet</Text>
            <Text style={styles.emptyStateText}>
              Log your workouts to see detailed analytics and patterns
            </Text>
          </View>
        ) : (
          <>
            {/* Activity Distribution */}
            <ActivityDistribution activities={activities} />

            {/* Time Patterns */}
            <TimePatterns activities={activities} />

            {/* Recent Entries */}
            <RecentEntries activities={activities} />

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Activity insights are based on your logged workouts. Keep tracking for better patterns!
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: SPACING[4],
    paddingBottom: SPACING[10],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: SPACING[3],
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },

  // Hero Card
  heroCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING[5],
    marginBottom: SPACING[4],
    ...SHADOWS.lg,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  heroStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Section Card
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOWS.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  sectionTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },

  // Donut Chart
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutPercent: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    marginTop: 4,
  },
  donutLabel: {
    fontSize: 10,
    color: TEXT.tertiary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Distribution
  distributionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
  },
  legendVertical: {
    flex: 1,
    gap: SPACING[2],
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  legendColorBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  legendLabel: {
    flex: 1,
    fontSize: 12,
    color: TEXT.primary,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.family.medium,
  },
  legendPercent: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    minWidth: 36,
    textAlign: 'right',
  },
  legendCount: {
    fontSize: 11,
    color: TEXT.tertiary,
    minWidth: 30,
  },

  // Time Patterns
  timePatternsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[3],
  },
  timePatternItem: {
    width: (SCREEN_WIDTH - SPACING[4] * 2 - SPACING[4] * 2 - SPACING[3]) / 2,
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    alignItems: 'center',
  },
  timePatternItemHighlight: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  timePatternGaugeContainer: {
    position: 'relative',
    width: 70,
    height: 45,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: SPACING[1],
  },
  timePatternGaugeCenter: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePatternScore: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginTop: SPACING[1],
  },
  timePatternLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },
  timePatternSublabel: {
    fontSize: 10,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  timePatternBestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginTop: SPACING[2],
  },
  timePatternBestText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#10B981',
  },

  // Recent Entries
  entriesCount: {
    marginLeft: 'auto',
    fontSize: 12,
    color: TEXT.tertiary,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.family.medium,
  },
  entryRow: {
    flexDirection: 'row',
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  entryIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  entryContent: {
    flex: 1,
  },
  entryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entryType: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  entryDuration: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },
  entryTime: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  entryStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[1],
    marginTop: SPACING[2],
  },
  entryStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: SPACING[2],
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  entryStatText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING[10],
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[4],
  },
  emptyStateTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[2],
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    textAlign: 'center',
    maxWidth: 280,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING[4],
  },
  footerText: {
    fontSize: 11,
    color: TEXT.tertiary,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 300,
  },
});
