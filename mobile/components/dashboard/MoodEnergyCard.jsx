/**
 * MoodEnergyCard - Premium Mood & Energy Tracker
 *
 * Design Philosophy: "Emotional Wellness at a Glance"
 * Inspired by: Calm, Headspace, Apple Health
 *
 * Features:
 * - Beautiful gradient orbs with Ionicons
 * - Animated mood visualization
 * - Energy level with smooth transitions
 * - Quick mood logging
 * - Trend insights
 *
 * Note: Uses Ionicons instead of emojis. Lottie files can be added
 * per mood by placing them in assets/animations/mood-{name}.json
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designTokens';
import { BRAND, TEXT, SURFACES, SHADOWS } from '../../constants/premiumTheme';
import { useTheme } from '../../providers/ThemeProvider';

// Premium mood color palette with Ionicons
const MOOD_CONFIG = {
  amazing: {
    icon: 'sparkles',
    label: 'Amazing',
    gradient: ['#F472B6', '#EC4899', '#DB2777'],
    glow: 'rgba(236, 72, 153, 0.3)',
    score: 10,
  },
  happy: {
    icon: 'happy-outline',
    label: 'Happy',
    gradient: ['#34D399', '#10B981', '#059669'],
    glow: 'rgba(16, 185, 129, 0.3)',
    score: 8,
  },
  good: {
    icon: 'thumbs-up-outline',
    label: 'Good',
    gradient: ['#60A5FA', '#3B82F6', '#2563EB'],
    glow: 'rgba(59, 130, 246, 0.3)',
    score: 6,
  },
  okay: {
    icon: 'remove-outline',
    label: 'Okay',
    gradient: ['#FBBF24', '#F59E0B', '#D97706'],
    glow: 'rgba(245, 158, 11, 0.3)',
    score: 5,
  },
  tired: {
    icon: 'bed-outline',
    label: 'Tired',
    gradient: ['#A78BFA', '#8B5CF6', '#7C3AED'],
    glow: 'rgba(139, 92, 246, 0.3)',
    score: 3,
  },
  stressed: {
    icon: 'alert-circle-outline',
    label: 'Stressed',
    gradient: ['#F87171', '#EF4444', '#DC2626'],
    glow: 'rgba(239, 68, 68, 0.3)',
    score: 2,
  },
};

// Energy levels
const ENERGY_LEVELS = [
  { level: 1, label: 'Exhausted', color: '#EF4444', icon: 'battery-dead' },
  { level: 2, label: 'Low', color: '#F97316', icon: 'battery-charging' },
  { level: 3, label: 'Moderate', color: '#EAB308', icon: 'battery-half' },
  { level: 4, label: 'Good', color: '#84CC16', icon: 'battery-charging' },
  { level: 5, label: 'Energized', color: '#22C55E', icon: 'battery-full' },
];

/**
 * Animated Mood Orb with Ionicon
 */
function MoodOrb({ mood, size = 100 }) {
  const config = MOOD_CONFIG[mood] || MOOD_CONFIG.good;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse and glow animation
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.8,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.5,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // Subtle rotation for sparkles effect
    if (mood === 'amazing') {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [pulseAnim, glowAnim, rotateAnim, mood]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.orbContainer, { width: size, height: size }]}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.orbGlow,
          {
            width: size + 30,
            height: size + 30,
            backgroundColor: config.glow,
            opacity: glowAnim,
          },
        ]}
      />
      {/* Main orb */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }, { rotate: mood === 'amazing' ? rotation : '0deg' }] }}>
        <LinearGradient
          colors={config.gradient}
          style={[styles.orb, { width: size, height: size, borderRadius: size / 2 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={config.icon} size={size * 0.45} color="#FFF" />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

/**
 * Energy Bar Visualization
 */
function EnergyBar({ level = 3, animated = true }) {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const energyConfig = ENERGY_LEVELS[level - 1] || ENERGY_LEVELS[2];
  const percentage = (level / 5) * 100;

  useEffect(() => {
    if (animated) {
      Animated.spring(animatedWidth, {
        toValue: percentage,
        tension: 20,
        friction: 7,
        useNativeDriver: false,
      }).start();
    } else {
      animatedWidth.setValue(percentage);
    }
  }, [level, percentage, animated, animatedWidth]);

  const width = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.energyContainer}>
      <View style={styles.energyHeader}>
        <View style={styles.energyLabel}>
          <Ionicons name={energyConfig.icon} size={18} color={energyConfig.color} />
          <Text style={styles.energyLabelText}>Energy</Text>
        </View>
        <Text style={[styles.energyLevel, { color: energyConfig.color }]}>
          {energyConfig.label}
        </Text>
      </View>
      <View style={styles.energyBarBg}>
        <Animated.View style={[styles.energyBarFill, { width, backgroundColor: energyConfig.color }]}>
          <LinearGradient
            colors={[`${energyConfig.color}FF`, `${energyConfig.color}CC`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        {/* Level indicators */}
        <View style={styles.energyIndicators}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.energyIndicator} />
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * Quick Mood Selector with Ionicons
 */
function QuickMoodSelector({ currentMood, onSelectMood, isDark }) {
  const moods = ['happy', 'good', 'okay', 'tired', 'stressed'];

  const handleSelect = async (mood) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectMood?.(mood);
  };

  return (
    <View style={styles.moodSelector}>
      <Text style={[styles.moodSelectorTitle, isDark && styles.textMutedDark]}>How are you feeling?</Text>
      <View style={styles.moodSelectorRow}>
        {moods.map((mood) => {
          const config = MOOD_CONFIG[mood];
          const isSelected = currentMood === mood;
          return (
            <TouchableOpacity
              key={mood}
              onPress={() => handleSelect(mood)}
              style={[styles.moodOption, isSelected && styles.moodOptionSelected]}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={isSelected ? config.gradient : ['#F8FAFC', '#F1F5F9']}
                style={[styles.moodOptionGradient, isDark && !isSelected && styles.moodOptionGradientDark]}
              >
                <Ionicons
                  name={config.icon}
                  size={22}
                  color={isSelected ? '#FFF' : TEXT.tertiary}
                />
              </LinearGradient>
              <Text style={[
                styles.moodOptionLabel,
                isSelected && { color: config.gradient[1] },
                isDark && styles.textMutedDark
              ]}>
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Trend Insight
 */
function TrendInsight({ trend, message }) {
  const isPositive = trend === 'up';
  const color = isPositive ? '#10B981' : '#F59E0B';

  return (
    <View style={[styles.trendContainer, { backgroundColor: `${color}10` }]}>
      <Ionicons
        name={isPositive ? 'trending-up' : 'trending-down'}
        size={16}
        color={color}
      />
      <Text style={[styles.trendText, { color }]}>{message}</Text>
    </View>
  );
}

/**
 * Main MoodEnergyCard Component
 */
export default function MoodEnergyCard({
  currentMood = 'good',
  energyLevel = 3,
  lastLoggedAt,
  trend = null,
  trendMessage = '',
  onSelectMood,
  onViewInsights,
}) {
  const { isDark } = useTheme();
  const moodConfig = MOOD_CONFIG[currentMood] || MOOD_CONFIG.good;

  // Format last logged time
  const formatLastLogged = () => {
    if (!lastLoggedAt) return 'Not logged today';
    const date = new Date(lastLoggedAt);
    return `Logged at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={moodConfig.gradient}
            style={styles.headerIcon}
          >
            <Ionicons name="heart" size={18} color="#FFF" />
          </LinearGradient>
          <View>
            <Text style={[styles.title, isDark && styles.textDark]}>Mood & Energy</Text>
            <Text style={[styles.subtitle, isDark && styles.textMutedDark]}>{formatLastLogged()}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onViewInsights} style={styles.insightsButton}>
          <Text style={styles.insightsText}>Insights</Text>
          <Ionicons name="chevron-forward" size={16} color={BRAND.primary} />
        </TouchableOpacity>
      </View>

      {/* Main Display */}
      <View style={styles.mainDisplay}>
        {/* Mood Orb */}
        <View style={styles.moodDisplay}>
          <MoodOrb mood={currentMood} size={90} />
          <View style={styles.moodInfo}>
            <Text style={[styles.moodLabel, { color: moodConfig.gradient[1] }]}>
              {moodConfig.label}
            </Text>
            <View style={styles.moodScore}>
              <Text style={[styles.moodScoreValue, isDark && styles.textDark]}>{moodConfig.score}</Text>
              <Text style={[styles.moodScoreMax, isDark && styles.textMutedDark]}>/10</Text>
            </View>
          </View>
        </View>

        {/* Energy Bar */}
        <EnergyBar level={energyLevel} />
      </View>

      {/* Trend Insight */}
      {trend && trendMessage && (
        <TrendInsight trend={trend} message={trendMessage} />
      )}

      {/* Quick Mood Selector */}
      <QuickMoodSelector currentMood={currentMood} onSelectMood={onSelectMood} isDark={isDark} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl + 4,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOWS.lg,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  containerDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  textDark: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: 'rgba(248, 250, 252, 0.6)',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 1,
  },
  insightsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  insightsText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: BRAND.primary,
  },

  // Main Display
  mainDisplay: {
    marginBottom: SPACING[4],
  },
  moodDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
    marginBottom: SPACING[4],
  },
  orbContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbGlow: {
    position: 'absolute',
    borderRadius: 100,
  },
  orb: {
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  moodInfo: {
    flex: 1,
  },
  moodLabel: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  moodScore: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  moodScoreValue: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontWeight: TYPOGRAPHY.weight.black,
    color: TEXT.primary,
  },
  moodScoreMax: {
    fontSize: TYPOGRAPHY.size.lg,
    color: TEXT.tertiary,
    marginLeft: 2,
  },

  // Energy
  energyContainer: {
    gap: SPACING[2],
  },
  energyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  energyLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  energyLabelText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
  },
  energyLevel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  energyBarBg: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
    position: 'relative',
  },
  energyBarFill: {
    height: '100%',
    borderRadius: 6,
    overflow: 'hidden',
  },
  energyIndicators: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  energyIndicator: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },

  // Trend
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.lg,
    marginBottom: SPACING[4],
  },
  trendText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // Mood Selector
  moodSelector: {
    gap: SPACING[2],
  },
  moodSelectorTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  moodSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodOption: {
    alignItems: 'center',
    gap: 4,
  },
  moodOptionSelected: {
    // Handled by gradient
  },
  moodOptionGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  moodOptionGradientDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  moodOptionLabel: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
  },
});
