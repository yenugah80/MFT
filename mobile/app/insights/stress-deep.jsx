/**
 * Stress Deep Analytics Screen
 *
 * Enhanced visualizations for stress tracking:
 * - Stress level gauge
 * - Stress level distribution (donut chart)
 * - Time of day patterns with mini gauges
 * - Trigger analysis
 * - Recent stress entries
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

import { useStressLog, STRESS_LEVELS } from '../../hooks/useStressLog';
import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  SHADOWS,
  SEMANTIC,
} from '../../constants/premiumTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Stress color gradient
const STRESS_COLORS = [
  '#10B981', '#10B981', '#22C55E', '#22C55E', '#F59E0B',
  '#F59E0B', '#F97316', '#F97316', '#EF4444', '#EF4444',
];

const getStressColor = (level) => {
  const index = Math.min(Math.max(Math.round(level) - 1, 0), 9);
  return STRESS_COLORS[index];
};

const getStressMeta = (level) => {
  const color = getStressColor(level);
  if (level <= 3) return { color, light: '#D1FAE5', label: 'Low', gradient: ['#10B981', '#34D399'] };
  if (level <= 5) return { color, light: '#FEF3C7', label: 'Moderate', gradient: ['#F59E0B', '#FBBF24'] };
  if (level <= 7) return { color, light: '#FFEDD5', label: 'High', gradient: ['#F97316', '#FB923C'] };
  return { color, light: '#FEE2E2', label: 'Severe', gradient: ['#EF4444', '#F87171'] };
};

// ============================================================================
// STRESS GAUGE - Main display
// ============================================================================

const StressGauge = ({ value, size = 160 }) => {
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
          <SvgLinearGradient id="stressGaugeBg" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
            <Stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
          </SvgLinearGradient>
          <SvgLinearGradient id="stressGaugeProgress" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#10B981" />
            <Stop offset="30%" stopColor="#F59E0B" />
            <Stop offset="60%" stopColor="#F97316" />
            <Stop offset="100%" stopColor="#EF4444" />
          </SvgLinearGradient>
        </Defs>
        <Path
          d={bgPath}
          fill="none"
          stroke="url(#stressGaugeBg)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {progressPath && (
          <Path
            d={progressPath}
            fill="none"
            stroke="url(#stressGaugeProgress)"
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
  const gradientId = `stress-mini-gauge-${Math.random().toString(36).substr(2, 9)}`;

  // Color based on value (inverted - lower is better for stress)
  const getGaugeColors = () => {
    if (value <= 3) return ['#10B981', '#34D399'];
    if (value <= 5) return ['#F59E0B', '#FBBF24'];
    if (value <= 7) return ['#F97316', '#FB923C'];
    return ['#EF4444', '#F87171'];
  };

  const colors = getGaugeColors();

  return (
    <Svg width={size} height={size / 2 + strokeWidth / 2} viewBox={`0 0 ${size} ${size / 2 + strokeWidth / 2}`}>
      <Defs>
        <SvgLinearGradient id={`${gradientId}-bg`} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#E2E8F0" stopOpacity={0.5} />
          <Stop offset="100%" stopColor="#E2E8F0" stopOpacity={0.5} />
        </SvgLinearGradient>
        <SvgLinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={colors[0]} />
          <Stop offset="100%" stopColor={colors[1]} />
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
// DONUT CHART - For stress level distribution
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
          <Ionicons name="pulse" size={24} color={data[0].color} />
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
// STRESS DISTRIBUTION
// ============================================================================

const StressDistribution = ({ stressLogs }) => {
  const distribution = useMemo(() => {
    if (!stressLogs?.length) return [];

    const buckets = {
      low: { label: 'Low', range: '1-3', count: 0, color: '#10B981' },
      moderate: { label: 'Moderate', range: '4-5', count: 0, color: '#F59E0B' },
      high: { label: 'High', range: '6-7', count: 0, color: '#F97316' },
      severe: { label: 'Severe', range: '8-10', count: 0, color: '#EF4444' },
    };

    stressLogs.forEach(log => {
      const level = log.level || 5;
      if (level <= 3) buckets.low.count++;
      else if (level <= 5) buckets.moderate.count++;
      else if (level <= 7) buckets.high.count++;
      else buckets.severe.count++;
    });

    const total = stressLogs.length;
    return Object.values(buckets)
      .filter(b => b.count > 0)
      .map(b => ({
        ...b,
        percent: (b.count / total) * 100,
      }))
      .sort((a, b) => b.count - a.count);
  }, [stressLogs]);

  if (!distribution.length) return null;

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name="pie-chart" size={18} color={SEMANTIC.warning.base} />
        <Text style={styles.sectionTitle}>Stress Level Breakdown</Text>
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
// TIME PATTERNS
// ============================================================================

const TimePatterns = ({ stressLogs }) => {
  const patterns = useMemo(() => {
    if (!stressLogs?.length || stressLogs.length < 3) return null;

    const timeSlots = {
      morning: { logs: [], label: 'Morning', sublabel: '6am-12pm', icon: 'sunny', iconColor: '#F59E0B' },
      afternoon: { logs: [], label: 'Afternoon', sublabel: '12pm-5pm', icon: 'partly-sunny', iconColor: '#3B82F6' },
      evening: { logs: [], label: 'Evening', sublabel: '5pm-9pm', icon: 'moon', iconColor: '#8B5CF6' },
      night: { logs: [], label: 'Night', sublabel: '9pm-6am', icon: 'cloudy-night', iconColor: '#64748B' },
    };

    stressLogs.forEach(log => {
      const date = new Date(log.loggedAt || log.createdAt);
      const hour = date.getHours();
      if (hour >= 6 && hour < 12) timeSlots.morning.logs.push(log);
      else if (hour >= 12 && hour < 17) timeSlots.afternoon.logs.push(log);
      else if (hour >= 17 && hour < 21) timeSlots.evening.logs.push(log);
      else timeSlots.night.logs.push(log);
    });

    return Object.entries(timeSlots)
      .filter(([_, slot]) => slot.logs.length > 0)
      .map(([name, slot]) => {
        const avgLevel = slot.logs.reduce((sum, l) => sum + (l.level || 5), 0) / slot.logs.length;
        return {
          name,
          ...slot,
          count: slot.logs.length,
          avgLevel: avgLevel.toFixed(1),
        };
      });
  }, [stressLogs]);

  if (!patterns?.length) return null;

  // Find highest stress time (worst)
  const maxLevel = Math.max(...patterns.map(p => parseFloat(p.avgLevel)));
  // Find lowest stress time (best)
  const minLevel = Math.min(...patterns.map(p => parseFloat(p.avgLevel)));

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name="time" size={18} color={SEMANTIC.warning.base} />
        <Text style={styles.sectionTitle}>Stress by Time of Day</Text>
      </View>

      <View style={styles.timePatternsGrid}>
        {patterns.map(p => {
          const isLowest = parseFloat(p.avgLevel) === minLevel;
          const isHighest = parseFloat(p.avgLevel) === maxLevel && !isLowest;
          return (
            <View key={p.name} style={[
              styles.timePatternItem,
              isLowest && styles.timePatternItemBest,
              isHighest && styles.timePatternItemWorst,
            ]}>
              <View style={styles.timePatternGaugeContainer}>
                <MiniHalfGauge value={parseFloat(p.avgLevel)} maxValue={10} size={70} />
                <View style={styles.timePatternGaugeCenter}>
                  <Ionicons name={p.icon} size={16} color={isLowest ? '#10B981' : isHighest ? '#EF4444' : p.iconColor} />
                </View>
              </View>

              <Text style={[styles.timePatternScore, { color: getStressColor(parseFloat(p.avgLevel)) }]}>
                {p.avgLevel}
              </Text>
              <Text style={styles.timePatternLabel}>{p.label}</Text>
              <Text style={styles.timePatternSublabel}>{p.count} check-ins</Text>

              {isLowest && (
                <View style={styles.timePatternBestBadge}>
                  <Ionicons name="leaf" size={10} color="#10B981" />
                  <Text style={styles.timePatternBestText}>Calmest</Text>
                </View>
              )}
              {isHighest && (
                <View style={styles.timePatternWorstBadge}>
                  <Ionicons name="alert" size={10} color="#EF4444" />
                  <Text style={styles.timePatternWorstText}>Peak</Text>
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
// TOP TRIGGERS
// ============================================================================

const TopTriggers = ({ stressLogs }) => {
  const triggers = useMemo(() => {
    if (!stressLogs?.length) return [];

    const triggerCounts = {};
    stressLogs.forEach(log => {
      if (log.trigger) {
        triggerCounts[log.trigger] = (triggerCounts[log.trigger] || 0) + 1;
      }
    });

    return Object.entries(triggerCounts)
      .map(([trigger, count]) => ({ trigger, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [stressLogs]);

  if (!triggers.length) return null;

  const maxCount = triggers[0]?.count || 1;

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name="flash" size={18} color={SEMANTIC.warning.base} />
        <Text style={styles.sectionTitle}>Top Stress Triggers</Text>
      </View>

      {triggers.map((t, idx) => (
        <View key={t.trigger} style={styles.triggerRow}>
          <Text style={styles.triggerRank}>#{idx + 1}</Text>
          <View style={styles.triggerContent}>
            <Text style={styles.triggerName}>{t.trigger}</Text>
            <View style={styles.triggerBarContainer}>
              <View
                style={[
                  styles.triggerBar,
                  { width: `${(t.count / maxCount) * 100}%` }
                ]}
              />
            </View>
          </View>
          <Text style={styles.triggerCount}>{t.count}×</Text>
        </View>
      ))}
    </View>
  );
};

// ============================================================================
// RECENT ENTRIES
// ============================================================================

const RecentEntries = ({ stressLogs }) => {
  const recentLogs = useMemo(() => {
    if (!stressLogs?.length) return [];
    return stressLogs.slice(0, 10);
  }, [stressLogs]);

  if (!recentLogs.length) return null;

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
        <Ionicons name="list" size={18} color={SEMANTIC.warning.base} />
        <Text style={styles.sectionTitle}>Recent Check-ins</Text>
        <Text style={styles.entriesCount}>{stressLogs.length} total</Text>
      </View>

      {recentLogs.map((log, idx) => {
        const meta = getStressMeta(log.level || 5);
        const stressInfo = STRESS_LEVELS.find(l => l.value === Math.round(log.level)) || STRESS_LEVELS[4];

        return (
          <View key={log.id || idx} style={[styles.entryRow, idx === recentLogs.length - 1 && { borderBottomWidth: 0 }]}>
            <LinearGradient
              colors={meta.gradient}
              style={styles.entryIconBg}
            >
              <Text style={styles.entryLevel}>{log.level}</Text>
            </LinearGradient>

            <View style={styles.entryContent}>
              <View style={styles.entryTopRow}>
                <Text style={[styles.entryType, { color: meta.color }]}>{stressInfo.label}</Text>
                <Text style={styles.entryDuration}>{log.level}/10</Text>
              </View>
              <Text style={styles.entryTime}>{formatDateTime(log.loggedAt || log.createdAt)}</Text>

              <View style={styles.entryStats}>
                {log.trigger && (
                  <View style={[styles.entryStat, { backgroundColor: `${meta.color}15` }]}>
                    <Ionicons name="flash" size={10} color={meta.color} />
                    <Text style={[styles.entryStatText, { color: meta.color }]}>
                      {log.trigger}
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

export default function StressDeepInsights() {
  const router = useRouter();
  const { stressLogs, stats, isLoading } = useStressLog();

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard');
  }, [router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={SEMANTIC.warning.base} />
        <Text style={styles.loadingText}>Loading stress data...</Text>
      </View>
    );
  }

  const hasData = stressLogs && stressLogs.length > 0;
  const avgLevel = stats?.avgLevel || 5;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Stress Analysis',
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
          colors={['#F59E0B', '#D97706']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroContent}>
            <StressGauge value={avgLevel} size={140} />
            <Text style={styles.heroLabel}>Average Stress Level</Text>

            <View style={styles.heroStats}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>{stressLogs?.length || 0}</Text>
                <Text style={styles.heroStatLabel}>check-ins</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>
                  {stats?.topTriggers?.[0] || '—'}
                </Text>
                <Text style={styles.heroStatLabel}>top trigger</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {!hasData ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="pulse-outline" size={48} color={TEXT.tertiary} />
            </View>
            <Text style={styles.emptyStateTitle}>No stress data yet</Text>
            <Text style={styles.emptyStateText}>
              Log your stress levels to see detailed analytics and patterns
            </Text>
          </View>
        ) : (
          <>
            {/* Stress Distribution */}
            <StressDistribution stressLogs={stressLogs} />

            {/* Time Patterns */}
            <TimePatterns stressLogs={stressLogs} />

            {/* Top Triggers */}
            <TopTriggers stressLogs={stressLogs} />

            {/* Recent Entries */}
            <RecentEntries stressLogs={stressLogs} />

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Stress insights help identify patterns. Remember, some stress is normal—focus on managing triggers!
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
  timePatternItemBest: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  timePatternItemWorst: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
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
  timePatternWorstBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginTop: SPACING[2],
  },
  timePatternWorstText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#EF4444',
  },

  // Triggers
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    gap: SPACING[3],
  },
  triggerRank: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
    width: 24,
  },
  triggerContent: {
    flex: 1,
  },
  triggerName: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
    marginBottom: 4,
  },
  triggerBarContainer: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  triggerBar: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },
  triggerCount: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    width: 30,
    textAlign: 'right',
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
  entryLevel: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
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
