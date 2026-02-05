/**
 * LeaderboardCard - Premium Leaderboard Component
 *
 * Features:
 * - Tab switching (Global, Weekly, Streak)
 * - Animated rank changes
 * - User highlight
 * - Pull to refresh
 * - Skeleton loading
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  SHADOWS,
} from '../../constants/premiumTheme';

// ============================================================================
// THEME
// ============================================================================

const LEADERBOARD_THEME = {
  tabs: {
    global: { icon: 'globe', label: 'Global', color: '#3B82F6' },
    weekly: { icon: 'calendar', label: 'Weekly', color: '#10B981' },
    streak: { icon: 'flame', label: 'Streak', color: '#F59E0B' },
  },
  ranks: {
    1: { gradient: ['#FFD700', '#FFA500'], emoji: '🥇', glow: '#FFD700' },
    2: { gradient: ['#C0C0C0', '#A8A8A8'], emoji: '🥈', glow: '#C0C0C0' },
    3: { gradient: ['#CD7F32', '#B87333'], emoji: '🥉', glow: '#CD7F32' },
  },
};

// ============================================================================
// RANK BADGE COMPONENT
// ============================================================================

function RankBadge({ rank, isUser = false }) {
  const topThree = LEADERBOARD_THEME.ranks[rank];

  if (topThree) {
    return (
      <LinearGradient
        colors={topThree.gradient}
        style={styles.rankBadgeTop}
      >
        <Text style={styles.rankBadgeEmoji}>{topThree.emoji}</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.rankBadge, isUser && styles.rankBadgeUser]}>
      <Text style={[styles.rankNumber, isUser && styles.rankNumberUser]}>
        {rank}
      </Text>
    </View>
  );
}

// ============================================================================
// LEADERBOARD ROW COMPONENT
// ============================================================================

function LeaderboardRow({ item, isUser, type }) {
  const topThree = LEADERBOARD_THEME.ranks[item.rank];

  return (
    <View style={[
      styles.row,
      isUser && styles.rowUser,
      topThree && styles.rowTopThree,
    ]}>
      {/* Rank */}
      <RankBadge rank={item.rank} isUser={isUser} />

      {/* Avatar & Name */}
      <View style={styles.userInfo}>
        <View style={[styles.avatar, isUser && styles.avatarUser]}>
          <Text style={styles.avatarText}>
            {item.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.nameContainer}>
          <Text style={[styles.name, isUser && styles.nameUser]} numberOfLines={1}>
            {isUser ? 'You' : item.name}
          </Text>
          <Text style={styles.level}>Level {item.level}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        {type === 'global' && (
          <View style={styles.statBadge}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={styles.statValue}>{formatNumber(item.xp)}</Text>
          </View>
        )}
        {type === 'weekly' && (
          <View style={[styles.statBadge, { backgroundColor: '#10B98115' }]}>
            <Ionicons name="trending-up" size={12} color="#10B981" />
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              +{formatNumber(item.weeklyXp)}
            </Text>
          </View>
        )}
        {type === 'streak' && (
          <View style={[styles.statBadge, { backgroundColor: '#F59E0B15' }]}>
            <Ionicons name="flame" size={12} color="#F59E0B" />
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {item.streak} days
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// SKELETON LOADING
// ============================================================================

function LeaderboardSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.skeletonRow}>
          <View style={styles.skeletonRank} />
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonName} />
          <View style={styles.skeletonStat} />
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// USER POSITION CARD
// ============================================================================

function UserPositionCard({ rank, inTop, position }) {
  if (inTop) return null;

  return (
    <View style={styles.userPositionCard}>
      <LinearGradient
        colors={['#3B82F615', '#3B82F605']}
        style={styles.userPositionGradient}
      >
        <Ionicons name="person" size={16} color="#3B82F6" />
        <Text style={styles.userPositionText}>
          Your rank: <Text style={styles.userPositionRank}>#{rank}</Text>
        </Text>
        <Text style={styles.userPositionHint}>
          Keep going to climb higher!
        </Text>
      </LinearGradient>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LeaderboardCard({
  globalData = [],
  weeklyData = [],
  streakData = [],
  userRank = null,
  userInTop = false,
  userPosition = null,
  isLoading = false,
  onRefresh,
}) {
  const [activeTab, setActiveTab] = useState('global');
  const [refreshing, setRefreshing] = useState(false);

  // Get current data based on tab
  const currentData = {
    global: globalData,
    weekly: weeklyData,
    streak: streakData,
  }[activeTab];

  // Handle tab change
  const handleTabChange = useCallback((tab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRefresh?.();
    setRefreshing(false);
  }, [onRefresh]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="trophy" size={20} color="#F59E0B" />
          <Text style={styles.headerTitle}>Leaderboard</Text>
        </View>
        {userRank && !userInTop && (
          <View style={styles.yourRankBadge}>
            <Text style={styles.yourRankText}>#{userRank}</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {Object.entries(LEADERBOARD_THEME.tabs).map(([key, config]) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeTab === key && styles.tabActive]}
            onPress={() => handleTabChange(key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={config.icon}
              size={16}
              color={activeTab === key ? config.color : TEXT.tertiary}
            />
            <Text style={[
              styles.tabLabel,
              activeTab === key && { color: config.color },
            ]}>
              {config.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {isLoading ? (
        <LeaderboardSkeleton />
      ) : currentData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={40} color={TEXT.tertiary} />
          <Text style={styles.emptyText}>No data yet</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#3B82F6"
            />
          }
        >
          {/* Top 3 Podium */}
          <View style={styles.podium}>
            {currentData.slice(0, 3).map((item, idx) => (
              <LeaderboardRow
                key={item.userId || idx}
                item={item}
                isUser={item.userId === userPosition}
                type={activeTab}
              />
            ))}
          </View>

          {/* Rest of the list */}
          {currentData.slice(3, 10).map((item, idx) => (
            <LeaderboardRow
              key={item.userId || idx}
              item={item}
              isUser={item.userId === userPosition}
              type={activeTab}
            />
          ))}

          {/* User position if not in top */}
          <UserPositionCard
            rank={userRank}
            inTop={userInTop}
            position={userPosition}
          />
        </ScrollView>
      )}
    </View>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatNumber(num) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num?.toString() || '0';
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.card,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    ...SHADOWS.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: '700',
    color: TEXT.primary,
  },
  yourRankBadge: {
    backgroundColor: '#3B82F615',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
  },
  yourRankText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    padding: 4,
    marginBottom: SPACING[4],
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.md,
    gap: 4,
  },
  tabActive: {
    backgroundColor: SURFACES.card,
    ...SHADOWS.sm,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT.tertiary,
  },

  // List
  listContainer: {
    maxHeight: 400,
  },
  podium: {
    marginBottom: SPACING[2],
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[2],
    borderRadius: RADIUS.md,
    marginBottom: SPACING[1],
  },
  rowUser: {
    backgroundColor: '#3B82F608',
    borderWidth: 1,
    borderColor: '#3B82F620',
  },
  rowTopThree: {
    backgroundColor: '#F59E0B08',
  },

  // Rank badge
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SURFACES.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  rankBadgeUser: {
    backgroundColor: '#3B82F620',
  },
  rankBadgeTop: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  rankBadgeEmoji: {
    fontSize: 14,
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT.secondary,
  },
  rankNumberUser: {
    color: '#3B82F6',
  },

  // User info
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUser: {
    backgroundColor: '#3B82F620',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.secondary,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
  },
  nameUser: {
    color: '#3B82F6',
  },
  level: {
    fontSize: 11,
    color: TEXT.tertiary,
  },

  // Stats
  statsContainer: {
    alignItems: 'flex-end',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B15',
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING[8],
    gap: SPACING[2],
  },
  emptyText: {
    fontSize: 14,
    color: TEXT.tertiary,
  },

  // User position card
  userPositionCard: {
    marginTop: SPACING[3],
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  userPositionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING[3],
    gap: SPACING[2],
  },
  userPositionText: {
    flex: 1,
    fontSize: 13,
    color: TEXT.secondary,
  },
  userPositionRank: {
    fontWeight: '700',
    color: '#3B82F6',
  },
  userPositionHint: {
    fontSize: 11,
    color: TEXT.tertiary,
  },

  // Skeleton
  skeletonContainer: {
    gap: SPACING[2],
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    padding: SPACING[2],
  },
  skeletonRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  skeletonAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
  },
  skeletonName: {
    flex: 1,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  skeletonStat: {
    width: 60,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
});
