/**
 * EnhancedHydrationCard - Premium Dashboard Hydration Display
 *
 * Features:
 * - Mini progress ring (60px) with percentage
 * - Quick-add buttons (250ml, 500ml) with haptic feedback
 * - Streak display (if >2 days)
 * - Recent entries preview (last 3)
 * - Tap to open full tracker
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import GlassCard from './GlassCard';
import {
  TEXT,
  SEMANTIC,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  ICON_SIZES,
  SURFACES,
  BRAND,
} from '../../constants/premiumTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ============================================================================
// MINI PROGRESS RING
// ============================================================================

const MiniProgressRing = ({ percentage, size = 60 }) => {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="miniRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={SEMANTIC.info.light} stopOpacity="1" />
            <Stop offset="50%" stopColor={SEMANTIC.info.base} stopOpacity="1" />
            <Stop offset="100%" stopColor={SEMANTIC.info.dark} stopOpacity="1" />
          </SvgGradient>
        </Defs>

        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(59, 130, 246, 0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#miniRingGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Percentage text overlay */}
      <View style={styles.miniRingText}>
        <Text style={styles.miniRingPercentage}>{Math.round(percentage)}%</Text>
      </View>
    </View>
  );
};

// ============================================================================
// ENHANCED HYDRATION CARD
// ============================================================================

export default function EnhancedHydrationCard({
  currentIntake = 0,
  goal = 2.0,
  streak = 0,
  recentEntries = [],
  onQuickAdd,
  onOpenFull,
}) {
  const percentage = Math.min((currentIntake / goal) * 100, 100);
  const currentMl = Math.round(currentIntake * 1000);
  const goalMl = Math.round(goal * 1000);
  const remaining = Math.max(goalMl - currentMl, 0);
  const goalReached = percentage >= 100;

  const handleQuickAdd = async (ml) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onQuickAdd) {
      onQuickAdd(ml);
    }
  };

  const handleOpenFull = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onOpenFull) {
      onOpenFull();
    }
  };

  return (
    <GlassCard padding="lg">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="water" size={ICON_SIZES.lg} color={SEMANTIC.info.base} />
          <Text style={styles.title}>Hydration</Text>
        </View>
        {streak > 2 && (
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={ICON_SIZES.sm} color="#F59E0B" />
            <Text style={styles.streakText}>{streak}d</Text>
          </View>
        )}
      </View>

      {/* Main Content - Progress Ring + Stats */}
      <View style={styles.mainContent}>
        <MiniProgressRing percentage={percentage} size={70} />

        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <Text style={styles.statValue}>{currentMl}ml</Text>
            <Text style={styles.statLabel}>/ {goalMl}ml</Text>
          </View>
          <Text style={styles.remainingText}>
            {goalReached ? '🎉 Goal achieved!' : `${remaining}ml remaining`}
          </Text>
        </View>
      </View>

      {/* Quick Add Buttons */}
      <View style={styles.quickAddRow}>
        <TouchableOpacity
          style={styles.quickAddButton}
          onPress={() => handleQuickAdd(250)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[SEMANTIC.info.light, SEMANTIC.info.base]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quickAddGradient}
          >
            <Ionicons name="water-outline" size={ICON_SIZES.md} color="#FFF" />
            <Text style={styles.quickAddLabel}>+250ml</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAddButton}
          onPress={() => handleQuickAdd(500)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[SEMANTIC.info.light, SEMANTIC.info.base]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quickAddGradient}
          >
            <Ionicons name="water" size={ICON_SIZES.md} color="#FFF" />
            <Text style={styles.quickAddLabel}>+500ml</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moreButton}
          onPress={handleOpenFull}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={ICON_SIZES.lg} color={BRAND.primary} />
        </TouchableOpacity>
      </View>

      {/* Recent Entries Preview */}
      {recentEntries.length > 0 && (
        <View style={styles.recentEntries}>
          <Text style={styles.recentLabel}>Recent</Text>
          <View style={styles.entryPills}>
            {recentEntries.slice(0, 3).map((entry, index) => {
              const emoji = entry.type === 'water' ? '💧' : entry.type === 'coffee' ? '☕' : '🍵';
              const timeAgo = getTimeAgo(entry.timestamp);

              return (
                <View key={index} style={styles.entryPill}>
                  <Text style={styles.entryPillText}>
                    {emoji} {entry.amount}ml • {timeAgo}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Tap hint */}
      <TouchableOpacity onPress={handleOpenFull} activeOpacity={0.9}>
        <Text style={styles.tapHint}>Tap to view full tracker →</Text>
      </TouchableOpacity>
    </GlassCard>
  );
}

// Helper function for time ago
function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[2],
    borderRadius: RADIUS.full,
  },
  streakText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#F59E0B',
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
    marginBottom: SPACING[4],
  },
  miniRingText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniRingPercentage: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: SEMANTIC.info.base,
  },
  statsContainer: {
    flex: 1,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING[1],
  },
  statValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: SEMANTIC.info.base,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.muted,
  },
  remainingText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    marginTop: SPACING[1],
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  quickAddButton: {
    flex: 1,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  quickAddGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[1],
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
  },
  quickAddLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFF',
  },
  moreButton: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(107, 78, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentEntries: {
    marginBottom: SPACING[3],
  },
  recentLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[2],
  },
  entryPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  entryPill: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[2],
    borderRadius: RADIUS.full,
  },
  entryPillText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: SEMANTIC.info.base,
  },
  tapHint: {
    fontSize: TYPOGRAPHY.size.sm,
    color: BRAND.primary,
    textAlign: 'center',
    fontWeight: TYPOGRAPHY.weight.medium,
  },
});
