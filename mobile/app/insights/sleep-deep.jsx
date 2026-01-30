/**
 * Sleep Deep Analytics Screen
 *
 * Enhanced visualizations for sleep tracking:
 * - Sleep quality gauge
 * - Weekly sleep duration chart
 * - Sleep quality distribution (donut chart)
 * - Sleep timing patterns
 * - Recent sleep entries
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

import { useSleepLog, SLEEP_QUALITY_LABELS } from '../../hooks/useSleepLog';
import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  SHADOWS,
  VIBRANT_WELLNESS,
} from '../../constants/premiumTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Sleep quality color mapping
const getQualityColor = (quality) => {
  if (quality >= 8) return { color: '#10B981', light: '#D1FAE5', gradient: ['#10B981', '#34D399'] };
  if (quality >= 6) return { color: '#3B82F6', light: '#DBEAFE', gradient: ['#3B82F6', '#60A5FA'] };
  if (quality >= 4) return { color: '#F59E0B', light: '#FEF3C7', gradient: ['#F59E0B', '#FBBF24'] };
  return { color: '#EF4444', light: '#FEE2E2', gradient: ['#EF4444', '#F87171'] };
};

// ============================================================================
// HALF GAUGE - For sleep quality
// ============================================================================

const SleepQualityGauge = ({ value, size = 160 }) => {
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const percentage = Math.min((value / 10) * 100, 100);
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

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size / 2 + strokeWidth} viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}>
        <Defs>
          <SvgLinearGradient id="sleepGaugeBg" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
            <Stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
          </SvgLinearGradient>
          <SvgLinearGradient id="sleepGaugeProgress" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#EF4444" />
            <Stop offset="30%" stopColor="#F59E0B" />
            <Stop offset="60%" stopColor="#10B981" />
            <Stop offset="100%" stopColor="#10B981" />
          </SvgLinearGradient>
        </Defs>
        <Path
          d={bgPath}
          fill="none"
          stroke="url(#sleepGaugeBg)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {progressPath && (
          <Path
            d={progressPath}
            fill="none"
            stroke="url(#sleepGaugeProgress)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
      </Svg>
      <View style={styles.gaugeValueContainer}>
        <Text style={styles.gaugeValue}>{value.toFixed(1)}</Text>
        <Text style={styles.gaugeMax}>/10</Text>
      </View>
    </View>
  );
};

// ============================================================================
// MINI HALF GAUGE - For time pattern cards
// ============================================================================

const MiniHalfGauge = ({ value, maxValue = 10, size = 70 }) => {
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
  const gradientId = `sleep-mini-gauge-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <Svg width={size} height={size / 2 + strokeWidth / 2} viewBox={`0 0 ${size} ${size / 2 + strokeWidth / 2}`}>
      <Defs>
        <SvgLinearGradient id={`${gradientId}-bg`} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#E2E8F0" stopOpacity={0.5} />
          <Stop offset="100%" stopColor="#E2E8F0" stopOpacity={0.5} />
        </SvgLinearGradient>
        <SvgLinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#6366F1" />
          <Stop offset="50%" stopColor="#8B5CF6" />
          <Stop offset="100%" stopColor="#A855F7" />
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
// DONUT CHART - For quality distribution
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
            key={segment.label || index}
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
          <Ionicons name="moon" size={24} color={data[0].color} />
          <Text style={[styles.donutPercent, { color: data[0].color }]}>
            {data[0].percent.toFixed(0)}%
          </Text>
          <Text style={styles.donutLabel}>{data[0].label}</Text>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// QUALITY DISTRIBUTION
// ============================================================================

const QualityDistribution = ({ sleepLogs }) => {
  const distribution = useMemo(() => {
    if (!sleepLogs?.length) return [];

    const buckets = {
      excellent: { label: 'Excellent', range: '8-10', count: 0, color: '#10B981' },
      good: { label: 'Good', range: '6-7', count: 0, color: '#3B82F6' },
      fair: { label: 'Fair', range: '4-5', count: 0, color: '#F59E0B' },
      poor: { label: 'Poor', range: '1-3', count: 0, color: '#EF4444' },
    };

    sleepLogs.forEach(log => {
      const quality = log.quality || 5;
      if (quality >= 8) buckets.excellent.count++;
      else if (quality >= 6) buckets.good.count++;
      else if (quality >= 4) buckets.fair.count++;
      else buckets.poor.count++;
    });

    const total = sleepLogs.length;
    return Object.values(buckets)
      .filter(b => b.count > 0)
      .map(b => ({
        ...b,
        percent: (b.count / total) * 100,
      }))
      .sort((a, b) => b.count - a.count);
  }, [sleepLogs]);

  if (!distribution.length) return null;

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name="pie-chart" size={18} color={VIBRANT_WELLNESS.sleep.solid} />
        <Text style={styles.sectionTitle}>Sleep Quality Breakdown</Text>
      </View>

      <View style={styles.distributionContent}>
        <DonutChart data={distribution} size={140} strokeWidth={24} />

        <View style={styles.legendVertical}>
          {distribution.map(d => (
            <View key={d.label} style={styles.legendRow}>
              <View style={[styles.legendColorBar, { backgroundColor: d.color }]} />
              <Text style={styles.legendLabel}>{d.label}</Text>
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
// DURATION PATTERNS
// ============================================================================

const DurationPatterns = ({ sleepLogs }) => {
  const patterns = useMemo(() => {
    if (!sleepLogs?.length || sleepLogs.length < 3) return null;

    const buckets = {
      short: { logs: [], label: '<6h', sublabel: 'Under 6 hours', icon: 'alert-circle', iconColor: '#EF4444' },
      optimal: { logs: [], label: '7-9h', sublabel: 'Optimal range', icon: 'checkmark-circle', iconColor: '#10B981' },
      long: { logs: [], label: '>9h', sublabel: 'Over 9 hours', icon: 'time', iconColor: '#3B82F6' },
    };

    sleepLogs.forEach(log => {
      const hours = (log.durationMinutes || 0) / 60;
      if (hours < 6) buckets.short.logs.push(log);
      else if (hours <= 9) buckets.optimal.logs.push(log);
      else buckets.long.logs.push(log);
    });

    return Object.entries(buckets)
      .filter(([_, bucket]) => bucket.logs.length > 0)
      .map(([name, bucket]) => {
        const avgQuality = bucket.logs.reduce((sum, l) => sum + (l.quality || 5), 0) / bucket.logs.length;
        return {
          name,
          ...bucket,
          count: bucket.logs.length,
          avgQuality: avgQuality.toFixed(1),
        };
      });
  }, [sleepLogs]);

  if (!patterns?.length) return null;

  const maxCount = Math.max(...patterns.map(p => p.count));

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name="time" size={18} color={VIBRANT_WELLNESS.sleep.solid} />
        <Text style={styles.sectionTitle}>Sleep Duration Patterns</Text>
      </View>

      <View style={styles.timePatternsGrid}>
        {patterns.map(p => {
          const isHighest = p.count === maxCount;
          return (
            <View key={p.name} style={[styles.timePatternItem, isHighest && styles.timePatternItemHighlight]}>
              <View style={styles.timePatternGaugeContainer}>
                <MiniHalfGauge value={parseFloat(p.avgQuality)} maxValue={10} size={70} />
                <View style={styles.timePatternGaugeCenter}>
                  <Ionicons name={p.icon} size={16} color={isHighest ? '#10B981' : p.iconColor} />
                </View>
              </View>

              <Text style={[styles.timePatternScore, isHighest && { color: '#10B981' }]}>
                {p.avgQuality}
              </Text>
              <Text style={styles.timePatternLabel}>{p.label}</Text>
              <Text style={styles.timePatternSublabel}>{p.count} nights</Text>

              {isHighest && (
                <View style={styles.timePatternBestBadge}>
                  <Ionicons name="star" size={10} color="#10B981" />
                  <Text style={styles.timePatternBestText}>Most</Text>
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

const RecentEntries = ({ sleepLogs }) => {
  const recentLogs = useMemo(() => {
    if (!sleepLogs?.length) return [];
    return sleepLogs.slice(0, 10);
  }, [sleepLogs]);

  if (!recentLogs.length) return null;

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) return 'Last night';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name="list" size={18} color={VIBRANT_WELLNESS.sleep.solid} />
        <Text style={styles.sectionTitle}>Recent Sleep</Text>
        <Text style={styles.entriesCount}>{sleepLogs.length} nights</Text>
      </View>

      {recentLogs.map((log, idx) => {
        const qualityMeta = getQualityColor(log.quality || 5);
        const qualityLabel = SLEEP_QUALITY_LABELS.find(l => l.value === log.quality);

        return (
          <View key={log.id || idx} style={[styles.entryRow, idx === recentLogs.length - 1 && { borderBottomWidth: 0 }]}>
            <LinearGradient
              colors={qualityMeta.gradient}
              style={styles.entryIconBg}
            >
              <Ionicons name="moon" size={20} color="#FFFFFF" />
            </LinearGradient>

            <View style={styles.entryContent}>
              <View style={styles.entryTopRow}>
                <Text style={[styles.entryType, { color: qualityMeta.color }]}>
                  {formatDuration(log.durationMinutes || 0)}
                </Text>
                <Text style={styles.entryDuration}>{log.quality}/10</Text>
              </View>
              <Text style={styles.entryTime}>{formatDate(log.sleepDate || log.createdAt)}</Text>

              <View style={styles.entryStats}>
                {qualityLabel && (
                  <View style={[styles.entryStat, { backgroundColor: `${qualityMeta.color}15` }]}>
                    <Ionicons name={qualityLabel.icon} size={10} color={qualityMeta.color} />
                    <Text style={[styles.entryStatText, { color: qualityMeta.color }]}>
                      {qualityLabel.label}
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

export default function SleepDeepInsights() {
  const router = useRouter();
  const { sleepLogs, stats, isLoading } = useSleepLog();

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard');
  }, [router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={VIBRANT_WELLNESS.sleep.solid} />
        <Text style={styles.loadingText}>Loading sleep data...</Text>
      </View>
    );
  }

  const hasData = sleepLogs && sleepLogs.length > 0;
  const avgQuality = stats?.avgQuality || 5;
  const avgDuration = stats?.avgDurationMinutes || 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Sleep Analysis',
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
          colors={['#6366F1', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroContent}>
            <SleepQualityGauge value={avgQuality} size={140} />
            <Text style={styles.heroLabel}>Average Sleep Quality</Text>

            <View style={styles.heroStats}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>
                  {Math.floor(avgDuration / 60)}h {avgDuration % 60}m
                </Text>
                <Text style={styles.heroStatLabel}>avg duration</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>{sleepLogs?.length || 0}</Text>
                <Text style={styles.heroStatLabel}>nights tracked</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {!hasData ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="moon-outline" size={48} color={TEXT.tertiary} />
            </View>
            <Text style={styles.emptyStateTitle}>No sleep data yet</Text>
            <Text style={styles.emptyStateText}>
              Log your sleep to see detailed analytics and patterns
            </Text>
          </View>
        ) : (
          <>
            {/* Quality Distribution */}
            <QualityDistribution sleepLogs={sleepLogs} />

            {/* Duration Patterns */}
            <DurationPatterns sleepLogs={sleepLogs} />

            {/* Recent Entries */}
            <RecentEntries sleepLogs={sleepLogs} />

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Sleep insights are based on your logged data. Consistent tracking helps identify patterns!
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
  heroLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: SPACING[2],
    marginBottom: SPACING[4],
  },
  gaugeValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: -30,
  },
  gaugeValue: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
  },
  gaugeMax: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 2,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    width: '100%',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 20,
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
    height: 32,
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
