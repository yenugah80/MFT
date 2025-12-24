/**
 * EnhancedMoodCard - Premium Mood Tracker Dashboard Card
 *
 * Replaces the basic MoodChip with a comprehensive mood tracking interface
 *
 * Features:
 * - Current mood display with 3D Lottie icon
 * - 7-day mini sparkline trend
 * - Quick stats (avg mood, best day, patterns detected)
 * - Dual CTAs: "Log Mood" + "View Insights"
 * - Dynamic gradient based on current mood
 * - Empty state for first-time users
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polyline } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  SEMANTIC,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  ICON_SIZES,
  SURFACES,
  MOOD_PALETTE,
} from '../../constants/premiumTheme';

import MoodIcon3D from '../MoodTracker/MoodIcon3D';

const SPARKLINE_WIDTH = 280;
const SPARKLINE_HEIGHT = 60;

const EnhancedMoodCard = ({
  mood = null,
  trendData = [],
  stats = null,
  loading = false,
  onLogMood,
  onViewInsights,
}) => {
  const latestMood = Array.isArray(mood) && mood.length > 0 ? mood[0] : mood;
  const moodColors = latestMood?.mood
    ? MOOD_PALETTE[latestMood.mood]
    : MOOD_PALETTE.neutral;

  // Empty State - also check if mood field is missing
  if ((!latestMood || !latestMood.mood) && !loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={SURFACES.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyGradient}
        >
          <View style={styles.emptyState}>
            <MoodIcon3D mood="happy" size={64} selected={false} />
            <Text style={styles.emptyTitle}>How are you feeling?</Text>
            <Text style={styles.emptySubtitle}>
              Track your mood and discover patterns
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onLogMood?.();
              }}
            >
              <Ionicons name="add-circle" size={ICON_SIZES.md} color={TEXT.white} />
              <Text style={styles.emptyButtonText}>Log Your First Mood</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Loading State
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={SEMANTIC.info.base} />
          <Text style={styles.loadingText}>Loading mood data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Gradient Glow */}
      <LinearGradient
        colors={moodColors?.gradient || SURFACES.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Ionicons name="happy" size={ICON_SIZES.md} color={TEXT.white} />
            <Text style={styles.headerTitle}>Mood & Energy</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onViewInsights?.();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-forward" size={ICON_SIZES.md} color={TEXT.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Current Mood Section */}
      <View style={styles.currentMoodSection}>
        <View style={styles.currentMoodLeft}>
          <MoodIcon3D
            mood={latestMood?.mood || 'neutral'}
            size={64}
            selected={true}
            onSelect={() => {}}
          />
        </View>
        <View style={styles.currentMoodRight}>
          <Text style={styles.currentMoodLabel}>Current Mood</Text>
          <Text style={styles.currentMoodValue}>
            {latestMood?.mood ? latestMood.mood.charAt(0).toUpperCase() + latestMood.mood.slice(1) : 'Unknown'}
          </Text>
          <View style={styles.intensityContainer}>
            <Text style={styles.intensityLabel}>Intensity:</Text>
            <View style={styles.intensityBar}>
              <View
                style={[
                  styles.intensityFill,
                  {
                    width: `${((latestMood.intensity || 5) / 10) * 100}%`,
                    backgroundColor: moodColors?.base,
                  },
                ]}
              />
            </View>
            <Text style={styles.intensityValue}>{latestMood.intensity || 5}/10</Text>
          </View>
          {latestMood.energyLevel && (
            <View style={styles.energyContainer}>
              <Ionicons name="flash" size={ICON_SIZES.xs} color={SEMANTIC.warning.base} />
              <Text style={styles.energyText}>
                Energy: {latestMood.energyLevel}/10
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* 7-Day Trend Sparkline */}
      {trendData && trendData.length > 0 && (
        <View style={styles.trendSection}>
          <Text style={styles.trendLabel}>7-Day Trend</Text>
          <MiniSparkline data={trendData} width={SPARKLINE_WIDTH} height={SPARKLINE_HEIGHT} />
        </View>
      )}

      {/* Quick Stats Grid */}
      {stats && (
        <View style={styles.statsSection}>
          <Text style={styles.statsLabel}>This Week</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.avgMood || '5.0'}/10</Text>
              <Text style={styles.statLabel}>Avg Mood</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {stats.bestDay || 'Mon'}
              </Text>
              <Text style={styles.statLabel}>Best Day</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Ionicons
                name={stats.patternsDetected ? 'checkmark-circle' : 'close-circle'}
                size={ICON_SIZES.md}
                color={stats.patternsDetected ? SEMANTIC.success.base : TEXT.tertiary}
              />
              <Text style={styles.statLabel}>Patterns</Text>
            </View>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onLogMood?.();
          }}
        >
          <LinearGradient
            colors={moodColors?.gradient || SURFACES.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButtonGradient}
          >
            <Ionicons name="add" size={ICON_SIZES.md} color={TEXT.white} />
            <Text style={styles.primaryButtonText}>Log Mood</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onViewInsights?.();
          }}
        >
          <Ionicons name="bulb-outline" size={ICON_SIZES.md} color={SEMANTIC.info.base} />
          <Text style={styles.secondaryButtonText}>View Insights</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * Mini Sparkline Component
 */
const MiniSparkline = ({ data, width, height }) => {
  const points = useMemo(() => {
    if (data.length === 0) return '';

    const maxIntensity = 10;
    const minIntensity = 0;

    return data
      .map((point, i) => {
        const x = (i / Math.max(data.length - 1, 1)) * width;
        const y =
          height -
          ((point.intensity - minIntensity) / (maxIntensity - minIntensity)) * height;
        return `${x},${y}`;
      })
      .join(' ');
  }, [data, width, height]);

  if (data.length === 0) {
    return (
      <View style={[styles.sparklineContainer, { width, height }]}>
        <Text style={styles.sparklineEmpty}>Not enough data</Text>
      </View>
    );
  }

  return (
    <View style={[styles.sparklineContainer, { width, height }]}>
      <Svg width={width} height={height}>
        <Polyline
          points={points}
          fill="none"
          stroke={SEMANTIC.info.base}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.background.primary,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING[4],
    ...SHADOWS.lg,
  },
  header: {
    padding: SPACING[4],
    paddingBottom: SPACING[3],
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },
  currentMoodSection: {
    flexDirection: 'row',
    padding: SPACING[4],
    paddingTop: SPACING[3],
    gap: SPACING[4],
  },
  currentMoodLeft: {
    justifyContent: 'center',
  },
  currentMoodRight: {
    flex: 1,
    justifyContent: 'center',
  },
  currentMoodLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentMoodValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginTop: SPACING[0.5],
  },
  intensityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING[2],
    gap: SPACING[2],
  },
  intensityLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
  intensityBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  intensityFill: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },
  intensityValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    width: 36,
    textAlign: 'right',
  },
  energyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING[1],
    gap: SPACING[1],
  },
  energyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
  trendSection: {
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[3],
  },
  trendLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
    marginBottom: SPACING[2],
  },
  sparklineContainer: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.md,
    padding: SPACING[2],
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparklineEmpty: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  statsSection: {
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[3],
  },
  statsLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
    marginBottom: SPACING[2],
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: SPACING[2],
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: SPACING[0.5],
  },
  actionsSection: {
    flexDirection: 'row',
    gap: SPACING[3],
    padding: SPACING[4],
    paddingTop: SPACING[2],
  },
  primaryButton: {
    flex: 2,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
  },
  primaryButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[1],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[3],
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: SEMANTIC.info.base,
  },
  emptyGradient: {
    borderRadius: RADIUS.xl,
    padding: SPACING[6],
  },
  emptyState: {
    alignItems: 'center',
    gap: SPACING[2],
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
    marginTop: SPACING[2],
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.white,
    opacity: 0.9,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.lg,
    marginTop: SPACING[3],
  },
  emptyButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[10],
  },
  loadingText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: SPACING[3],
  },
});

export default EnhancedMoodCard;
