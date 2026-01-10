/**
 * EnhancedGamificationCard - Tier 3: Meaningful Gamification
 *
 * Instead of generic "Level 2, 100 XP" gamification,
 * this shows achievements tied to LEARNING OUTCOMES:
 * - Pattern discoveries (food-mood correlations)
 * - Consistency streaks
 * - Milestone achievements
 *
 * Design: Celebratory, reward-focused premium card
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { BRAND, TEXT, SURFACES, SPACING, RADIUS, SHADOWS } from '../../constants/premiumTheme';

/**
 * Get level title based on progress
 */
function getLevelTitle(level) {
  if (level >= 10) return 'NUTRITION MASTER';
  if (level >= 7) return 'PATTERN DETECTIVE';
  if (level >= 5) return 'HEALTH ENTHUSIAST';
  if (level >= 3) return 'NUTRITION ANALYST';
  return 'WELLNESS EXPLORER';
}

/**
 * Get next unlock based on current progress
 */
function getNextUnlock(level, streak, patternsDiscovered = 0) {
  if (streak < 7) {
    return {
      name: 'Consistent Logger',
      requirement: `${7 - streak} more days in a row`,
      icon: 'calendar',
    };
  }

  if (patternsDiscovered < 3) {
    return {
      name: 'Pattern Detective',
      requirement: `Discover ${3 - patternsDiscovered} more food-mood patterns`,
      icon: 'bulb',
    };
  }

  if (level < 5) {
    return {
      name: 'Health Enthusiast',
      requirement: `Reach level ${level + 1}`,
      icon: 'trophy',
    };
  }

  return {
    name: 'Keep exploring',
    requirement: 'New achievements coming soon',
    icon: 'rocket',
  };
}

export default function EnhancedGamificationCard({
  level = 1,
  xp = 0,
  nextLevelXp = 100,
  streak = 0,
  streakFreezes = 0,
  patternsDiscovered = 0,
  onViewAchievements,
}) {
  const levelTitle = getLevelTitle(level);
  const progress = (xp / nextLevelXp) * 100;
  const nextUnlock = getNextUnlock(level, streak, patternsDiscovered);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onViewAchievements) {
      onViewAchievements();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handlePress}
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#F59E0B', '#EF4444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <Ionicons name="trophy" size={20} color="#FFF" />
          </LinearGradient>
          <View style={styles.headerText}>
            <Text style={styles.title}>ACHIEVEMENTS</Text>
            <Text style={styles.subtitle}>{levelTitle}</Text>
          </View>
        </View>

        {/* Level Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.levelText}>LEVEL {level}</Text>
            <Text style={styles.xpText}>
              {xp} / {nextLevelXp} XP
            </Text>
          </View>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={['#F59E0B', '#EF4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progress}%` }]}
            />
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {/* Streak */}
          <View style={styles.statItem}>
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={20} color="#EF4444" />
              <Text style={styles.streakValue}>{streak}</Text>
            </View>
            <Text style={styles.statLabel}>day streak</Text>
          </View>

          <View style={styles.statDivider} />

          {/* Freezes */}
          <View style={styles.statItem}>
            <View style={styles.freezeBadge}>
              <Ionicons name="snow" size={18} color="#3B82F6" />
              <Text style={styles.freezeValue}>{streakFreezes}</Text>
            </View>
            <Text style={styles.statLabel}>freezes</Text>
          </View>
        </View>

        {/* Next Unlock */}
        <View style={styles.unlockSection}>
          <View style={styles.unlockHeader}>
            <Ionicons name={nextUnlock.icon} size={16} color={BRAND.primary} />
            <Text style={styles.unlockTitle}>NEXT UNLOCK</Text>
          </View>
          <Text style={styles.unlockName}>{nextUnlock.name}</Text>
          <Text style={styles.unlockRequirement}>{nextUnlock.requirement}</Text>
        </View>

        {/* View All Link */}
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          <Text style={styles.viewAllText}>View all achievements</Text>
          <Ionicons name="chevron-forward" size={16} color={BRAND.primary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: SURFACES.card.background,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    ...SHADOWS.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT.primary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    marginTop: 2,
  },
  progressSection: {
    marginBottom: SPACING.md,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  levelText: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT.primary,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT.tertiary,
  },
  progressBar: {
    height: 8,
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  streakValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF4444',
    marginLeft: 4,
  },
  freezeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  freezeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
    marginLeft: 4,
  },
  statLabel: {
    fontSize: 11,
    color: TEXT.tertiary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: SURFACES.card.border,
  },
  unlockSection: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  unlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  unlockTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND.primary,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  unlockName: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT.primary,
    marginBottom: 4,
  },
  unlockRequirement: {
    fontSize: 13,
    color: TEXT.secondary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND.primary,
    marginRight: 4,
  },
});
