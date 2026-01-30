/**
 * Mood Deep Insights - Premium Analytics Screen
 *
 * Features:
 * - Vibrant gradient hero card with mood score
 * - WEEK/MONTH/QUARTER tab navigation
 * - Smart AI-powered recommendations
 * - Beautiful weekly mood chart with comparisons
 * - Correlation insights (what affects your mood)
 * - Time-of-day patterns
 * - Mood distribution breakdown
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Path, Text as SvgText } from 'react-native-svg';

import { useMoodInsights } from '../../hooks/useMoodInsights';
import {
  SPACING,
  RADIUS,
  TYPOGRAPHY,
} from '../../constants/premiumTheme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// PREMIUM DESIGN TOKENS
// ============================================================================

const COLORS = {
  primary: '#8B5CF6',
  primaryDark: '#7C3AED',
  primaryLight: '#EDE9FE',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
    tertiary: '#94A3B8',
  },
  background: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  gradient: {
    hero: ['#A78BFA', '#8B5CF6', '#7C3AED'],
    success: ['#34D399', '#10B981', '#059669'],
    happy: ['#34D399', '#10B981'],
    calm: ['#60A5FA', '#3B82F6'],
    stressed: ['#F87171', '#EF4444'],
    neutral: ['#A78BFA', '#8B5CF6'],
  },
};

// Mood metadata with rich colors
const MOOD_META = {
  happy: { emoji: '😊', label: 'Happy', color: '#10B981', light: '#D1FAE5', gradient: ['#34D399', '#10B981'], valence: 1 },
  calm: { emoji: '😌', label: 'Calm', color: '#3B82F6', light: '#DBEAFE', gradient: ['#60A5FA', '#3B82F6'], valence: 0.7 },
  focused: { emoji: '🎯', label: 'Focused', color: '#6366F1', light: '#E0E7FF', gradient: ['#818CF8', '#6366F1'], valence: 0.6 },
  energized: { emoji: '⚡', label: 'Energized', color: '#F59E0B', light: '#FEF3C7', gradient: ['#FBBF24', '#F59E0B'], valence: 0.8 },
  neutral: { emoji: '😐', label: 'Neutral', color: '#8B5CF6', light: '#EDE9FE', gradient: ['#A78BFA', '#8B5CF6'], valence: 0 },
  tired: { emoji: '😴', label: 'Tired', color: '#64748B', light: '#F1F5F9', gradient: ['#94A3B8', '#64748B'], valence: -0.3 },
  stressed: { emoji: '😰', label: 'Stressed', color: '#EF4444', light: '#FEE2E2', gradient: ['#F87171', '#EF4444'], valence: -0.7 },
  sad: { emoji: '😢', label: 'Sad', color: '#6366F1', light: '#E0E7FF', gradient: ['#818CF8', '#6366F1'], valence: -0.8 },
};

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ============================================================================
// HELPERS
// ============================================================================

const getLocalDateKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// ============================================================================
// SMART RECOMMENDATIONS ENGINE
// ============================================================================

const generateMoodRecommendations = (logs, stats) => {
  if (!logs?.length || logs.length < 5) return [];

  const recommendations = [];
  const positiveMoods = ['happy', 'calm', 'focused', 'energized'];

  // Analyze patterns
  const tagStats = {};
  const timeStats = { morning: [], afternoon: [], evening: [], night: [] };
  const dayStats = {};

  logs.forEach(log => {
    // Time of day
    const logHour = new Date(log.loggedDate).getHours();
    if (logHour >= 6 && logHour < 12) timeStats.morning.push(log);
    else if (logHour >= 12 && logHour < 17) timeStats.afternoon.push(log);
    else if (logHour >= 17 && logHour < 21) timeStats.evening.push(log);
    else timeStats.night.push(log);

    // Day of week
    const dow = new Date(log.loggedDate).getDay();
    if (!dayStats[dow]) dayStats[dow] = [];
    dayStats[dow].push(log);

    // Tags
    if (log.tags) {
      Object.entries(log.tags).forEach(([cat, val]) => {
        const key = `${cat}:${val}`;
        if (!tagStats[key]) tagStats[key] = { logs: [], category: cat, value: val };
        tagStats[key].logs.push(log);
      });
    }
  });

  const avgMood = stats?.avgMood || 5;

  // 1. Best time recommendation
  const timePeriods = Object.entries(timeStats)
    .filter(([, arr]) => arr.length >= 3)
    .map(([name, arr]) => {
      const avg = arr.reduce((sum, l) => sum + (l.intensity || 5), 0) / arr.length;
      const positiveRate = arr.filter(l => positiveMoods.includes(l.mood)).length / arr.length;
      return { name, avg, positiveRate, count: arr.length };
    })
    .sort((a, b) => b.avg - a.avg);

  if (timePeriods.length >= 2) {
    const best = timePeriods[0];
    const worst = timePeriods[timePeriods.length - 1];
    if (best.avg - worst.avg > 0.8) {
      const timeLabels = { morning: 'mornings', afternoon: 'afternoons', evening: 'evenings', night: 'late nights' };
      recommendations.push({
        id: 'best_time',
        icon: 'sunny',
        iconColor: '#F59E0B',
        title: `${timeLabels[best.name].charAt(0).toUpperCase() + timeLabels[best.name].slice(1)} are your power hours`,
        message: `You average ${best.avg.toFixed(1)}/10 in ${timeLabels[best.name]} vs ${worst.avg.toFixed(1)} in ${timeLabels[worst.name]}. Schedule important tasks accordingly.`,
        priority: 1,
      });
    }
  }

  // 2. Tag-based recommendations
  const tagEffects = Object.values(tagStats)
    .filter(t => t.logs.length >= 3)
    .map(t => {
      const avg = t.logs.reduce((sum, l) => sum + (l.intensity || 5), 0) / t.logs.length;
      return { ...t, avg, lift: avg - avgMood };
    })
    .sort((a, b) => Math.abs(b.lift) - Math.abs(a.lift));

  const bestTag = tagEffects.find(t => t.lift > 0.5);
  if (bestTag) {
    const categoryLabels = { sleep: 'Sleep', exercise: 'Exercise', social: 'Being with', connection: 'Feeling', stress: 'Stress level' };
    recommendations.push({
      id: 'best_tag',
      icon: bestTag.category === 'sleep' ? 'moon' : bestTag.category === 'exercise' ? 'barbell' : bestTag.category === 'social' ? 'people' : 'heart',
      iconColor: COLORS.success,
      title: `${categoryLabels[bestTag.category] || bestTag.category}: ${bestTag.value} boosts your mood`,
      message: `Your mood averages +${bestTag.lift.toFixed(1)} points higher. That's a ${Math.round((bestTag.lift / avgMood) * 100)}% improvement.`,
      priority: 2,
      actionable: true,
      action: 'Track this pattern',
    });
  }

  const worstTag = tagEffects.find(t => t.lift < -0.5);
  if (worstTag) {
    recommendations.push({
      id: 'stress_alert',
      icon: 'alert-circle',
      iconColor: COLORS.warning,
      title: `${worstTag.category}: ${worstTag.value} affects your mood`,
      message: `Your mood drops ${Math.abs(worstTag.lift).toFixed(1)} points in these conditions. Awareness is the first step.`,
      priority: 3,
    });
  }

  // 3. Current state recommendation
  if (stats?.trend === 'improving') {
    recommendations.push({
      id: 'momentum',
      icon: 'trending-up',
      iconColor: COLORS.success,
      title: "You're on an upswing",
      message: 'Your mood has been improving. Keep doing what you\'re doing - the patterns are working.',
      priority: 0,
    });
  } else if (stats?.trend === 'declining' && avgMood < 5) {
    recommendations.push({
      id: 'support',
      icon: 'heart',
      iconColor: COLORS.primary,
      title: 'Be gentle with yourself',
      message: 'Your mood has been lower lately. Small wins matter - even logging how you feel is progress.',
      priority: 0,
    });
  }

  // 4. Best day recommendation
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const bestDay = Object.entries(dayStats)
    .filter(([, arr]) => arr.length >= 2)
    .map(([dow, arr]) => ({
      dow: parseInt(dow),
      name: dayNames[parseInt(dow)],
      avg: arr.reduce((sum, l) => sum + (l.intensity || 5), 0) / arr.length,
    }))
    .sort((a, b) => b.avg - a.avg)[0];

  if (bestDay && bestDay.avg > avgMood + 0.5) {
    recommendations.push({
      id: 'best_day',
      icon: 'calendar',
      iconColor: COLORS.primary,
      title: `${bestDay.name}s are your best days`,
      message: `You average ${bestDay.avg.toFixed(1)}/10 on ${bestDay.name}s. What makes them special?`,
      priority: 4,
    });
  }

  return recommendations.sort((a, b) => a.priority - b.priority).slice(0, 4);
};

// ============================================================================
// TAB SELECTOR
// ============================================================================

const TabSelector = ({ selected, onSelect }) => {
  const tabs = ['WEEK', 'MONTH', 'QUARTER'];

  return (
    <View style={styles.tabContainer}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, selected === tab && styles.tabSelected]}
          onPress={() => {
            Haptics.selectionAsync();
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            onSelect(tab);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, selected === tab && styles.tabTextSelected]}>{tab}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ============================================================================
// PREMIUM HERO CARD
// ============================================================================

// ============================================================================
// HALF GAUGE COMPONENT - Premium mood score visualization
// ============================================================================

const HalfGauge = ({ value, maxValue = 10, size = 180, strokeWidth = 16, moodMeta }) => {
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth) / 2;
  const percentage = Math.min((value / maxValue) * 100, 100);
  const progressAngle = (percentage / 100) * 180;

  // SVG arc path calculation
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
  const gradientId = `mood-gauge-${Math.random().toString(36).substr(2, 9)}`;

  // Tick marks for scale
  const ticks = [0, 2, 4, 6, 8, 10].map(tickValue => {
    const angle = (tickValue / 10) * 180;
    const pos = polarToCartesian(cx, cy, radius + strokeWidth / 2 + 14, angle);
    return { value: tickValue, x: pos.x, y: pos.y };
  });

  return (
    <View style={[styles.gaugeContainer, { width: size, height: size / 2 + 50 }]}>
      <Svg width={size} height={size / 2 + strokeWidth} viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}>
        <Defs>
          {/* Meter-style gradient: Red → Yellow → Green */}
          <SvgLinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#EF4444" />
            <Stop offset="30%" stopColor="#F59E0B" />
            <Stop offset="50%" stopColor="#FBBF24" />
            <Stop offset="70%" stopColor="#84CC16" />
            <Stop offset="100%" stopColor="#10B981" />
          </SvgLinearGradient>
          <SvgLinearGradient id={`${gradientId}-bg`} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#EF4444" stopOpacity={0.12} />
            <Stop offset="50%" stopColor="#FBBF24" stopOpacity={0.12} />
            <Stop offset="100%" stopColor="#10B981" stopOpacity={0.12} />
          </SvgLinearGradient>
        </Defs>

        {/* Background Track */}
        <Path
          d={bgPath}
          fill="none"
          stroke={`url(#${gradientId}-bg)`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Progress Arc */}
        {progressPath && (
          <Path
            d={progressPath}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}

        {/* End Cap Glow */}
        {progressAngle > 0 && (
          <Circle
            cx={polarToCartesian(cx, cy, radius, progressAngle).x}
            cy={polarToCartesian(cx, cy, radius, progressAngle).y}
            r={strokeWidth / 2 + 4}
            fill={moodMeta?.color || COLORS.primary}
            opacity={0.5}
          />
        )}

        {/* Tick Labels */}
        {ticks.map((tick, index) => (
          <SvgText
            key={index}
            x={tick.x}
            y={tick.y + 4}
            fontSize={10}
            fill={COLORS.text.tertiary}
            textAnchor="middle"
            fontWeight="600"
          >
            {tick.value}
          </SvgText>
        ))}
      </Svg>

      {/* Center Content */}
      <View style={styles.gaugeCenter}>
        <Text style={styles.gaugeEmoji}>{moodMeta?.emoji || '😐'}</Text>
        <Text style={[styles.gaugeValue, { color: moodMeta?.color || COLORS.primary }]}>
          {value > 0 ? value.toFixed(1) : '–'}
        </Text>
        <Text style={styles.gaugeLabel}>avg mood</Text>
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
  const gradientId = `mini-gauge-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <Svg width={size} height={size / 2 + strokeWidth / 2} viewBox={`0 0 ${size} ${size / 2 + strokeWidth / 2}`}>
      <Defs>
        <SvgLinearGradient id={`${gradientId}-bg`} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#EF4444" stopOpacity={0.15} />
          <Stop offset="50%" stopColor="#FBBF24" stopOpacity={0.15} />
          <Stop offset="100%" stopColor="#10B981" stopOpacity={0.15} />
        </SvgLinearGradient>
        <SvgLinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#EF4444" />
          <Stop offset="30%" stopColor="#F59E0B" />
          <Stop offset="50%" stopColor="#FBBF24" />
          <Stop offset="70%" stopColor="#84CC16" />
          <Stop offset="100%" stopColor="#10B981" />
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
// DONUT CHART - For mood distribution
// ============================================================================

const DonutChart = ({ data, size = 140, strokeWidth = 28 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  // Calculate cumulative rotation for each segment
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
        {/* Background circle */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={COLORS.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Segments */}
        {segments.map((segment) => (
          <Circle
            key={segment.mood}
            cx={cx}
            cy={cy}
            r={radius}
            stroke={segment.meta.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={segment.dashArray}
            strokeLinecap="butt"
            transform={`rotate(${segment.rotation} ${cx} ${cy})`}
          />
        ))}
      </Svg>
      {/* Center content - show top mood */}
      {data.length > 0 && (
        <View style={styles.donutCenter}>
          <Text style={styles.donutEmoji}>{data[0].meta.emoji}</Text>
          <Text style={[styles.donutPercent, { color: data[0].meta.color }]}>
            {data[0].percent.toFixed(0)}%
          </Text>
          <Text style={styles.donutLabel}>{data[0].meta.label}</Text>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// RING CHART COMPONENT - For metric visualization
// ============================================================================

const RingChart = ({ value, maxValue = 100, size = 80, strokeWidth = 8, color, label, sublabel }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min((value / maxValue) * 100, 100);
  const strokeDashoffset = circumference * (1 - percentage / 100);
  const gradientId = `ring-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <View style={[styles.ringContainer, { width: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity={1} />
            <Stop offset="100%" stopColor={color} stopOpacity={0.6} />
          </SvgLinearGradient>
        </Defs>
        {/* Background */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={COLORS.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={[styles.ringValue, { color }]}>{Math.round(value)}</Text>
        {sublabel && <Text style={styles.ringSublabel}>{sublabel}</Text>}
      </View>
      {label && <Text style={styles.ringLabel}>{label}</Text>}
    </View>
  );
};

// ============================================================================
// HERO CARD WITH GAUGE
// ============================================================================

const HeroCard = ({ stats, dominantMood, trend }) => {
  const moodMeta = MOOD_META[dominantMood] || MOOD_META.neutral;
  const avgMood = stats?.avgMood || 0;

  const getTrendIcon = () => {
    if (trend === 'improving') return 'trending-up';
    if (trend === 'declining') return 'trending-down';
    return 'remove';
  };

  const getTrendColor = () => {
    if (trend === 'improving') return COLORS.success;
    if (trend === 'declining') return COLORS.warning;
    return COLORS.text.secondary;
  };

  return (
    <View style={styles.heroCard}>
      {/* Header */}
      <View style={styles.heroHeader}>
        <View style={styles.heroBadge}>
          <Ionicons name="analytics" size={14} color={COLORS.primary} />
          <Text style={styles.heroBadgeText}>MOOD SCORE</Text>
        </View>
        <View style={[styles.heroTrend, { backgroundColor: hexToRgba(getTrendColor(), 0.12) }]}>
          <Ionicons name={getTrendIcon()} size={14} color={getTrendColor()} />
          <Text style={[styles.heroTrendText, { color: getTrendColor() }]}>
            {trend || 'stable'}
          </Text>
        </View>
      </View>

      {/* Half Gauge */}
      <HalfGauge
        value={avgMood}
        maxValue={10}
        size={200}
        strokeWidth={18}
        moodMeta={moodMeta}
      />

      {/* Dominant Mood */}
      <View style={styles.heroFooter}>
        <Text style={styles.heroDominant}>
          Usually feeling <Text style={{ color: moodMeta.color, fontWeight: '700' }}>{moodMeta.label.toLowerCase()}</Text>
        </Text>
      </View>
    </View>
  );
};

// ============================================================================
// STATS ROW
// ============================================================================

const StatsRow = ({ logs, stats }) => {
  const computed = useMemo(() => {
    if (!logs?.length) return { entries: 0, days: 0, positive: 0, consistency: 0 };

    const positiveMoods = ['happy', 'calm', 'focused', 'energized'];
    const uniqueDays = new Set(logs.map(l => getLocalDateKey(l.loggedDate)));
    const positiveCount = logs.filter(l => positiveMoods.includes(l.mood)).length;

    // Calculate consistency (days with entries / total days in period)
    const now = new Date();
    const oldestLog = logs[logs.length - 1];
    const daysSinceStart = oldestLog
      ? Math.ceil((now - new Date(oldestLog.loggedDate)) / (1000 * 60 * 60 * 24))
      : 1;
    const consistency = Math.min(100, Math.round((uniqueDays.size / Math.max(daysSinceStart, 1)) * 100));

    return {
      entries: logs.length,
      days: uniqueDays.size,
      positive: Math.round((positiveCount / logs.length) * 100),
      consistency,
    };
  }, [logs]);

  return (
    <View style={styles.statsRow}>
      {/* Positive Mood Ring */}
      <RingChart
        value={computed.positive}
        maxValue={100}
        size={90}
        strokeWidth={10}
        color={COLORS.success}
        label="Positive"
        sublabel="%"
      />

      {/* Entries Ring */}
      <RingChart
        value={computed.entries}
        maxValue={Math.max(computed.entries, 30)}
        size={90}
        strokeWidth={10}
        color={COLORS.primary}
        label="Entries"
      />

      {/* Consistency Ring */}
      <RingChart
        value={computed.consistency}
        maxValue={100}
        size={90}
        strokeWidth={10}
        color="#F59E0B"
        label="Consistency"
        sublabel="%"
      />
    </View>
  );
};

// ============================================================================
// RECOMMENDATIONS SECTION
// ============================================================================

const RecommendationsSection = ({ recommendations }) => {
  if (!recommendations?.length) return null;

  return (
    <View style={styles.recommendationsContainer}>
      <Text style={styles.sectionTitle}>Smart Insights</Text>
      {recommendations.map((rec) => (
        <View key={rec.id} style={styles.recommendationCard}>
          <View style={[styles.recommendationIcon, { backgroundColor: hexToRgba(rec.iconColor, 0.15) }]}>
            <Ionicons name={rec.icon} size={20} color={rec.iconColor} />
          </View>
          <View style={styles.recommendationContent}>
            <Text style={styles.recommendationTitle}>{rec.title}</Text>
            <Text style={styles.recommendationMessage}>{rec.message}</Text>
            {rec.actionable && (
              <TouchableOpacity style={styles.recommendationAction} activeOpacity={0.7}>
                <Text style={styles.recommendationActionText}>{rec.action}</Text>
                <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};

// ============================================================================
// WEEKLY MOOD CHART
// ============================================================================

const WeeklyMoodChart = ({ logs }) => {
  const chartData = useMemo(() => {
    if (!logs?.length) return null;

    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    // Current week data
    const currentWeek = [];
    let currentWeekTotal = 0;
    let currentWeekCount = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - mondayOffset + i);
      const dateKey = getLocalDateKey(d);
      const dayLogs = logs.filter(l => getLocalDateKey(l.loggedDate) === dateKey);

      const avgMood = dayLogs.length > 0
        ? dayLogs.reduce((sum, l) => sum + (l.intensity || 5), 0) / dayLogs.length
        : 0;

      const dominantMood = dayLogs.length > 0
        ? dayLogs.sort((a, b) => (b.intensity || 5) - (a.intensity || 5))[0]?.mood
        : null;

      currentWeek.push({
        day: WEEK_DAYS[i],
        avgMood,
        dominantMood,
        hasData: dayLogs.length > 0,
        isToday: dateKey === getLocalDateKey(today),
        entryCount: dayLogs.length,
      });

      if (dayLogs.length > 0 && d <= today) {
        currentWeekTotal += avgMood;
        currentWeekCount++;
      }
    }

    // Last week comparison
    let lastWeekTotal = 0;
    let lastWeekCount = 0;
    const daysElapsed = mondayOffset + 1;

    for (let i = 0; i < daysElapsed; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - mondayOffset + i - 7);
      const dateKey = getLocalDateKey(d);
      const dayLogs = logs.filter(l => getLocalDateKey(l.loggedDate) === dateKey);

      if (dayLogs.length > 0) {
        const avg = dayLogs.reduce((sum, l) => sum + (l.intensity || 5), 0) / dayLogs.length;
        lastWeekTotal += avg;
        lastWeekCount++;
      }
    }

    const currentAvg = currentWeekCount > 0 ? currentWeekTotal / currentWeekCount : 0;
    const lastAvg = lastWeekCount > 0 ? lastWeekTotal / lastWeekCount : 0;
    const comparison = lastAvg > 0 ? Math.round(((currentAvg - lastAvg) / lastAvg) * 100) : 0;

    return {
      days: currentWeek,
      currentAvg,
      lastAvg,
      comparison,
    };
  }, [logs]);

  if (!chartData) return null;

  const isImproving = chartData.comparison >= 0;
  const maxMood = 10;

  return (
    <View style={styles.weeklyChartCard}>
      <View style={styles.weeklyChartHeader}>
        <View style={styles.weeklyChartTitleRow}>
          <Ionicons name="bar-chart" size={18} color={COLORS.primary} />
          <Text style={styles.weeklyChartTitle}>This Week</Text>
        </View>
        <View style={styles.weeklyChartStats}>
          <Text style={styles.weeklyChartAvg}>{chartData.currentAvg.toFixed(1)}</Text>
          <Text style={styles.weeklyChartAvgLabel}>avg</Text>
          {chartData.lastAvg > 0 && (
            <View style={[styles.comparisonBadge, isImproving ? styles.comparisonBadgeUp : styles.comparisonBadgeDown]}>
              <Ionicons
                name={isImproving ? 'trending-up' : 'trending-down'}
                size={12}
                color={isImproving ? COLORS.success : COLORS.warning}
              />
              <Text style={[styles.comparisonText, isImproving ? styles.comparisonTextUp : styles.comparisonTextDown]}>
                {isImproving ? '+' : ''}{chartData.comparison}%
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Chart */}
      <View style={styles.weeklyChartContainer}>
        {/* Goal line at 7 */}
        <View style={[styles.goalLine, { bottom: '70%' }]}>
          <View style={styles.goalLineDash} />
          <Text style={styles.goalLineLabel}>Good</Text>
        </View>

        <View style={styles.weeklyBars}>
          {chartData.days.map((day, idx) => {
            const heightPct = day.hasData ? (day.avgMood / maxMood) * 100 : 0;
            const moodMeta = day.dominantMood ? MOOD_META[day.dominantMood] : null;

            return (
              <View key={idx} style={styles.weeklyBarItem}>
                <View style={styles.weeklyBarTrack}>
                  {day.hasData ? (
                    <LinearGradient
                      colors={moodMeta?.gradient || [COLORS.border, COLORS.border]}
                      style={[styles.weeklyBarFill, { height: `${heightPct}%` }]}
                    />
                  ) : (
                    <View style={[styles.weeklyBarEmpty, { height: 4 }]} />
                  )}
                </View>
                {day.hasData && (
                  <Text style={styles.weeklyBarEmoji}>{moodMeta?.emoji}</Text>
                )}
                <Text style={[styles.weeklyBarLabel, day.isToday && styles.weeklyBarLabelToday]}>
                  {day.day}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.weeklyChartFooter}>
        <Text style={styles.weeklyChartFooterText}>
          {chartData.lastAvg > 0
            ? `vs ${chartData.lastAvg.toFixed(1)} avg last week`
            : 'Keep logging to see weekly trends'}
        </Text>
      </View>
    </View>
  );
};

// ============================================================================
// CORRELATION INSIGHTS
// ============================================================================

const CorrelationInsights = ({ logs }) => {
  const correlations = useMemo(() => {
    if (!logs?.length || logs.length < 10) return [];

    const baseline = logs.reduce((sum, l) => sum + (l.intensity || 5), 0) / logs.length;
    const tagStats = {};

    logs.forEach(log => {
      if (!log.tags) return;
      Object.entries(log.tags).forEach(([cat, val]) => {
        const key = `${cat}:${val}`;
        if (!tagStats[key]) tagStats[key] = { intensities: [], category: cat, value: val };
        tagStats[key].intensities.push(log.intensity || 5);
      });
    });

    return Object.values(tagStats)
      .filter(t => t.intensities.length >= 3)
      .map(t => {
        const avg = t.intensities.reduce((a, b) => a + b, 0) / t.intensities.length;
        return {
          ...t,
          avg,
          lift: avg - baseline,
          count: t.intensities.length,
        };
      })
      .sort((a, b) => Math.abs(b.lift) - Math.abs(a.lift))
      .slice(0, 6);
  }, [logs]);

  if (!correlations.length) {
    return (
      <View style={styles.correlationsCard}>
        <Text style={styles.sectionTitle}>What Affects Your Mood</Text>
        <View style={styles.correlationsEmpty}>
          <Ionicons name="analytics-outline" size={32} color={COLORS.text.tertiary} />
          <Text style={styles.correlationsEmptyText}>
            Add context tags when logging moods to discover patterns
          </Text>
        </View>
      </View>
    );
  }

  const categoryIcons = {
    sleep: 'moon',
    exercise: 'barbell',
    social: 'people',
    connection: 'heart',
    stress: 'briefcase',
    weather: 'partly-sunny',
  };

  return (
    <View style={styles.correlationsCard}>
      <Text style={styles.sectionTitle}>What Affects Your Mood</Text>
      <Text style={styles.sectionSubtitle}>Based on {logs.length} entries</Text>

      {correlations.map((corr, idx) => {
        const isPositive = corr.lift > 0;
        const barWidth = Math.min(Math.abs(corr.lift) * 20, 100);

        return (
          <View key={idx} style={styles.correlationRow}>
            <View style={[styles.correlationIcon, { backgroundColor: hexToRgba(isPositive ? COLORS.success : COLORS.warning, 0.15) }]}>
              <Ionicons
                name={categoryIcons[corr.category] || 'pricetag'}
                size={16}
                color={isPositive ? COLORS.success : COLORS.warning}
              />
            </View>
            <View style={styles.correlationContent}>
              <Text style={styles.correlationLabel}>
                {corr.category}: {corr.value}
              </Text>
              <View style={styles.correlationBarContainer}>
                <View
                  style={[
                    styles.correlationBar,
                    {
                      width: `${barWidth}%`,
                      backgroundColor: isPositive ? COLORS.success : COLORS.warning,
                    }
                  ]}
                />
              </View>
            </View>
            <Text style={[styles.correlationLift, { color: isPositive ? COLORS.success : COLORS.warning }]}>
              {isPositive ? '+' : ''}{corr.lift.toFixed(1)}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

// ============================================================================
// MOOD DISTRIBUTION - Enhanced with Donut Chart
// ============================================================================

const MoodDistribution = ({ logs }) => {
  const distribution = useMemo(() => {
    if (!logs?.length) return [];

    const counts = {};
    logs.forEach(log => {
      counts[log.mood] = (counts[log.mood] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([mood, count]) => ({
        mood,
        count,
        percent: (count / logs.length) * 100,
        meta: MOOD_META[mood] || MOOD_META.neutral,
      }))
      .sort((a, b) => b.count - a.count);
  }, [logs]);

  if (!distribution.length) return null;

  return (
    <View style={styles.distributionCard}>
      <View style={styles.distributionHeader}>
        <Ionicons name="pie-chart" size={18} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>Mood Breakdown</Text>
      </View>

      <View style={styles.distributionContent}>
        {/* Donut Chart */}
        <DonutChart data={distribution} size={140} strokeWidth={24} />

        {/* Legend */}
        <View style={styles.distributionLegendVertical}>
          {distribution.map(d => (
            <View key={d.mood} style={styles.distributionLegendRow}>
              <View style={[styles.distributionColorBar, { backgroundColor: d.meta.color }]} />
              <Text style={styles.distributionLegendEmoji}>{d.meta.emoji}</Text>
              <Text style={styles.distributionLegendLabel}>{d.meta.label}</Text>
              <Text style={[styles.distributionLegendPercent, { color: d.meta.color }]}>
                {d.percent.toFixed(0)}%
              </Text>
              <Text style={styles.distributionLegendCount}>({d.count})</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// TIME PATTERNS - Enhanced with Mini Half Gauges
// ============================================================================

const TimePatterns = ({ logs }) => {
  const patterns = useMemo(() => {
    if (!logs?.length || logs.length < 7) return null;

    const timeSlots = {
      morning: { logs: [], label: 'Morning', sublabel: '6am-12pm', icon: 'sunny', iconColor: '#F59E0B' },
      afternoon: { logs: [], label: 'Afternoon', sublabel: '12pm-5pm', icon: 'partly-sunny', iconColor: '#3B82F6' },
      evening: { logs: [], label: 'Evening', sublabel: '5pm-9pm', icon: 'moon', iconColor: '#8B5CF6' },
      night: { logs: [], label: 'Night', sublabel: '9pm-6am', icon: 'cloudy-night', iconColor: '#64748B' },
    };

    logs.forEach(log => {
      const hour = new Date(log.loggedDate).getHours();
      if (hour >= 6 && hour < 12) timeSlots.morning.logs.push(log);
      else if (hour >= 12 && hour < 17) timeSlots.afternoon.logs.push(log);
      else if (hour >= 17 && hour < 21) timeSlots.evening.logs.push(log);
      else timeSlots.night.logs.push(log);
    });

    return Object.entries(timeSlots)
      .filter(([, slot]) => slot.logs.length >= 2)
      .map(([name, slot]) => ({
        name,
        ...slot,
        avg: slot.logs.reduce((sum, l) => sum + (l.intensity || 5), 0) / slot.logs.length,
        count: slot.logs.length,
      }));
  }, [logs]);

  if (!patterns?.length) return null;

  const maxAvg = Math.max(...patterns.map(p => p.avg));

  return (
    <View style={styles.timePatternsCard}>
      <View style={styles.timePatternsHeader}>
        <Ionicons name="time" size={18} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>Mood by Time of Day</Text>
      </View>

      <View style={styles.timePatternsGrid}>
        {patterns.map(p => {
          const isHighest = p.avg === maxAvg;
          return (
            <View key={p.name} style={[styles.timePatternItem, isHighest && styles.timePatternItemHighlight]}>
              {/* Mini Half Gauge */}
              <View style={styles.timePatternGaugeContainer}>
                <MiniHalfGauge value={p.avg} maxValue={10} size={70} />
                <View style={styles.timePatternGaugeCenter}>
                  <Ionicons name={p.icon} size={16} color={isHighest ? COLORS.success : p.iconColor} />
                </View>
              </View>

              <Text style={[styles.timePatternScore, isHighest && { color: COLORS.success }]}>
                {p.avg.toFixed(1)}
              </Text>
              <Text style={styles.timePatternLabel}>{p.label}</Text>
              <Text style={styles.timePatternSublabel}>{p.count} entries</Text>

              {isHighest && (
                <View style={styles.timePatternBestBadge}>
                  <Ionicons name="star" size={10} color={COLORS.success} />
                  <Text style={styles.timePatternBestText}>Best</Text>
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
// RECENT ENTRIES - Individual mood log history
// ============================================================================

const RecentEntries = ({ logs }) => {
  const recentLogs = useMemo(() => {
    if (!logs?.length) return [];
    return logs.slice(0, 10);
  }, [logs]);

  if (!recentLogs.length) return null;

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = getLocalDateKey(date) === getLocalDateKey(now);
    const isYesterday = getLocalDateKey(new Date(now.setDate(now.getDate() - 1))) === getLocalDateKey(date);

    const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + `, ${timeStr}`;
  };

  const categoryIcons = {
    sleep: 'moon',
    exercise: 'barbell',
    social: 'people',
    connection: 'heart',
    stress: 'briefcase',
    weather: 'partly-sunny',
  };

  return (
    <View style={styles.recentEntriesCard}>
      <View style={styles.recentEntriesHeader}>
        <Ionicons name="list" size={18} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>Recent Entries</Text>
        <Text style={styles.recentEntriesCount}>{logs.length} total</Text>
      </View>

      {recentLogs.map((log, idx) => {
        const moodMeta = MOOD_META[log.mood] || MOOD_META.neutral;
        const hasTags = log.tags && Object.keys(log.tags).length > 0;

        return (
          <View key={log.id || idx} style={[styles.recentEntryRow, idx === recentLogs.length - 1 && { borderBottomWidth: 0 }]}>
            {/* Mood emoji and intensity bar */}
            <View style={styles.recentEntryLeft}>
              <LinearGradient
                colors={moodMeta.gradient}
                style={styles.recentEntryEmojiBg}
              >
                <Text style={styles.recentEntryEmoji}>{moodMeta.emoji}</Text>
              </LinearGradient>
              {/* Intensity bar */}
              <View style={styles.recentEntryIntensityBar}>
                <View
                  style={[
                    styles.recentEntryIntensityFill,
                    {
                      height: `${((log.intensity || 5) / 10) * 100}%`,
                      backgroundColor: moodMeta.color,
                    }
                  ]}
                />
              </View>
            </View>

            {/* Content */}
            <View style={styles.recentEntryContent}>
              <View style={styles.recentEntryTopRow}>
                <Text style={[styles.recentEntryMood, { color: moodMeta.color }]}>
                  {moodMeta.label}
                </Text>
                <Text style={styles.recentEntryIntensity}>{log.intensity || 5}/10</Text>
              </View>
              <Text style={styles.recentEntryTime}>{formatDateTime(log.loggedDate)}</Text>

              {/* Tags */}
              {hasTags && (
                <View style={styles.recentEntryTags}>
                  {Object.entries(log.tags).slice(0, 3).map(([cat, val]) => (
                    <View key={cat} style={[styles.recentEntryTag, { backgroundColor: hexToRgba(moodMeta.color, 0.1) }]}>
                      <Ionicons
                        name={categoryIcons[cat] || 'pricetag'}
                        size={10}
                        color={moodMeta.color}
                      />
                      <Text style={[styles.recentEntryTagText, { color: moodMeta.color }]}>{val}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Note preview */}
              {log.note && (
                <Text style={styles.recentEntryNote} numberOfLines={1}>
                  {`"${log.note}"`}
                </Text>
              )}
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

export default function MoodDeepInsights() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState('WEEK');

  // Get period days based on tab
  const periodDays = selectedTab === 'WEEK' ? 7 : selectedTab === 'MONTH' ? 30 : 90;

  const { data, isLoading, refetch } = useMoodInsights({ windowDays: periodDays });
  const logs = useMemo(() => data?.logs || [], [data]);

  // Compute stats
  const stats = useMemo(() => {
    if (!logs.length) return null;

    const intensities = logs.filter(l => l.intensity).map(l => l.intensity);
    const avgMood = intensities.length
      ? intensities.reduce((a, b) => a + b, 0) / intensities.length
      : 0;

    // Count moods to find dominant
    const moodCounts = {};
    logs.forEach(l => { moodCounts[l.mood] = (moodCounts[l.mood] || 0) + 1; });
    const dominant = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

    // Trend (compare last 3 days to previous 3 days)
    const recent = logs.slice(0, Math.min(logs.length, 10));
    const recentAvg = recent.length
      ? recent.reduce((sum, l) => sum + (l.intensity || 5), 0) / recent.length
      : 0;
    const older = logs.slice(10, 20);
    const olderAvg = older.length
      ? older.reduce((sum, l) => sum + (l.intensity || 5), 0) / older.length
      : recentAvg;

    let trend = 'stable';
    if (recentAvg - olderAvg > 0.5) trend = 'improving';
    else if (olderAvg - recentAvg > 0.5) trend = 'declining';

    return { avgMood, dominant, trend };
  }, [logs]);

  // Generate recommendations
  const recommendations = useMemo(() => {
    return generateMoodRecommendations(logs, stats);
  }, [logs, stats]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/insights/mood-history');
    }
  }, [router]);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Mood Analysis',
          headerTitleStyle: { fontWeight: '600', fontFamily: TYPOGRAPHY.family.semibold, color: COLORS.text.primary },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: COLORS.background },
          headerLeft: () => (
            <TouchableOpacity
              onPress={handleBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ marginLeft: 8 }}
            >
              <Ionicons name="chevron-back" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={COLORS.primary} />
        }
      >
        {/* Tab Selector */}
        <TabSelector selected={selectedTab} onSelect={setSelectedTab} />

        {isLoading && !data ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading insights...</Text>
          </View>
        ) : logs.length < 5 ? (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={COLORS.gradient.hero}
              style={styles.emptyStateIcon}
            >
              <Ionicons name="analytics" size={32} color="#FFF" />
            </LinearGradient>
            <Text style={styles.emptyStateTitle}>Not Enough Data Yet</Text>
            <Text style={styles.emptyStateText}>
              Log at least 5 moods to unlock insights and recommendations.
            </Text>
            <Text style={styles.emptyStateProgress}>
              {logs.length}/5 entries
            </Text>
          </View>
        ) : (
          <>
            {/* Hero Card */}
            <HeroCard
              stats={stats}
              dominantMood={stats?.dominant}
              trend={stats?.trend}
            />

            {/* Stats Row */}
            <StatsRow logs={logs} stats={stats} />

            {/* Smart Recommendations */}
            <RecommendationsSection recommendations={recommendations} />

            {/* Weekly Chart */}
            <WeeklyMoodChart logs={logs} />

            {/* Correlations */}
            <CorrelationInsights logs={logs} />

            {/* Time Patterns */}
            <TimePatterns logs={logs} />

            {/* Mood Distribution */}
            <MoodDistribution logs={logs} />

            {/* Recent Entries */}
            <RecentEntries logs={logs} />

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Insights are based on your logged data. Patterns suggest correlations, not causation.
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
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[8],
  },

  // Loading
  loadingContainer: {
    paddingVertical: SPACING[12],
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING[3],
    color: COLORS.text.secondary,
    fontSize: 14,
  },

  // Tab Selector
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 4,
    marginVertical: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING[2],
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  tabSelected: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: COLORS.text.secondary,
  },
  tabTextSelected: {
    color: '#FFF',
  },

  // Half Gauge
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  gaugeCenter: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  gaugeEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  gaugeValue: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    letterSpacing: -1,
  },
  gaugeLabel: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Ring Chart
  ringContainer: {
    alignItems: 'center',
  },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
  },
  ringSublabel: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    marginTop: -2,
  },
  ringLabel: {
    fontSize: 11,
    color: COLORS.text.secondary,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    marginTop: SPACING[2],
    textAlign: 'center',
  },

  // Hero Card
  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING[2],
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: hexToRgba(COLORS.primary, 0.1),
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
    gap: 6,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  heroTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
    gap: 4,
  },
  heroTrendText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    textTransform: 'capitalize',
  },
  heroFooter: {
    marginTop: SPACING[2],
  },
  heroDominant: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  heroMainValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  heroEmoji: {
    fontSize: 48,
  },
  heroScoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroScore: {
    fontSize: 56,
    fontWeight: '200',
    color: '#FFF',
    letterSpacing: -2,
  },
  heroScoreUnit: {
    fontSize: 20,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.family.medium,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 4,
  },
  heroProgressContainer: {
    marginBottom: SPACING[3],
  },
  heroProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 4,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[2],
    marginBottom: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // Section titles
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING[2],
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginBottom: SPACING[3],
    marginTop: -SPACING[1],
  },

  // Recommendations
  recommendationsContainer: {
    marginBottom: SPACING[4],
  },
  recommendationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  recommendationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  recommendationMessage: {
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  recommendationAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING[2],
    gap: 4,
  },
  recommendationActionText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: COLORS.primary,
  },

  // Weekly Chart
  weeklyChartCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  weeklyChartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  weeklyChartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  weeklyChartTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: COLORS.text.primary,
  },
  weeklyChartStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  weeklyChartAvg: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: COLORS.text.primary,
  },
  weeklyChartAvgLabel: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  comparisonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    gap: 2,
  },
  comparisonBadgeUp: {
    backgroundColor: hexToRgba(COLORS.success, 0.15),
  },
  comparisonBadgeDown: {
    backgroundColor: hexToRgba(COLORS.warning, 0.15),
  },
  comparisonText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  comparisonTextUp: {
    color: COLORS.success,
  },
  comparisonTextDown: {
    color: COLORS.warning,
  },
  weeklyChartContainer: {
    height: 160,
    position: 'relative',
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalLineDash: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  goalLineLabel: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    marginLeft: 8,
  },
  weeklyBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 20,
  },
  weeklyBarItem: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - SPACING[4] * 2 - SPACING[4] * 2) / 7,
  },
  weeklyBarTrack: {
    width: 24,
    height: 100,
    backgroundColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  weeklyBarFill: {
    width: '100%',
    borderRadius: 12,
  },
  weeklyBarEmpty: {
    width: '100%',
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  weeklyBarEmoji: {
    fontSize: 14,
    marginTop: 4,
  },
  weeklyBarLabel: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    marginTop: 4,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.family.medium,
  },
  weeklyBarLabelToday: {
    color: COLORS.primary,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
  },
  weeklyChartFooter: {
    marginTop: SPACING[3],
    alignItems: 'center',
  },
  weeklyChartFooterText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },

  // Correlations
  correlationsCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  correlationsEmpty: {
    alignItems: 'center',
    paddingVertical: SPACING[6],
  },
  correlationsEmptyText: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: SPACING[2],
    maxWidth: 240,
  },
  correlationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  correlationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  correlationContent: {
    flex: 1,
  },
  correlationLabel: {
    fontSize: 13,
    color: COLORS.text.primary,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.family.medium,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  correlationBarContainer: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
  },
  correlationBar: {
    height: '100%',
    borderRadius: 3,
  },
  correlationLift: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    marginLeft: SPACING[3],
    minWidth: 40,
    textAlign: 'right',
  },

  // Distribution
  distributionCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  distributionBar: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: SPACING[3],
  },
  distributionSegment: {
    height: '100%',
  },
  distributionLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[3],
  },
  distributionLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distributionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  distributionLegendEmoji: {
    fontSize: 14,
  },
  distributionLegendText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.family.medium,
  },
  // Enhanced Distribution styles
  distributionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  distributionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
  },
  distributionLegendVertical: {
    flex: 1,
    gap: SPACING[2],
  },
  distributionLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  distributionColorBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  distributionLegendLabel: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text.primary,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.family.medium,
  },
  distributionLegendPercent: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    minWidth: 36,
    textAlign: 'right',
  },
  distributionLegendCount: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    minWidth: 30,
  },

  // Donut Chart
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  donutPercent: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
  },
  donutLabel: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Time Patterns - Enhanced with Mini Gauges
  timePatternsCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  timePatternsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  timePatternsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[3],
  },
  timePatternItem: {
    width: (SCREEN_WIDTH - SPACING[4] * 2 - SPACING[4] * 2 - SPACING[3]) / 2,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    alignItems: 'center',
  },
  timePatternItemHighlight: {
    backgroundColor: hexToRgba(COLORS.success, 0.08),
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.success, 0.2),
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
  timePatternIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[2],
  },
  timePatternLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: COLORS.text.secondary,
  },
  timePatternScore: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: COLORS.text.primary,
    marginTop: SPACING[1],
  },
  timePatternSublabel: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  timePatternBestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: hexToRgba(COLORS.success, 0.15),
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginTop: SPACING[2],
  },
  timePatternBestText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: COLORS.success,
  },

  // Recent Entries
  recentEntriesCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  recentEntriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  recentEntriesCount: {
    marginLeft: 'auto',
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.family.medium,
  },
  recentEntryRow: {
    flexDirection: 'row',
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recentEntryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  recentEntryEmojiBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentEntryEmoji: {
    fontSize: 24,
  },
  recentEntryIntensityBar: {
    width: 4,
    height: 44,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginLeft: SPACING[2],
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  recentEntryIntensityFill: {
    width: '100%',
    borderRadius: 2,
  },
  recentEntryContent: {
    flex: 1,
  },
  recentEntryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentEntryMood: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  recentEntryIntensity: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: COLORS.text.secondary,
  },
  recentEntryTime: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  recentEntryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[1],
    marginTop: SPACING[2],
  },
  recentEntryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: SPACING[2],
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  recentEntryTagText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  recentEntryNote: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
    marginTop: SPACING[2],
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING[8],
  },
  emptyStateIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[4],
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING[2],
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  emptyStateProgress: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    marginTop: SPACING[3],
  },

  // Footer
  footer: {
    paddingVertical: SPACING[4],
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 300,
  },
});
