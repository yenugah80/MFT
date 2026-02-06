/**
 * Achievements Screen - High Contrast Premium Theme
 * Clean, readable design with solid colors and strong contrast
 */

import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

import SafeScreen from '../components/SafeScreen';
import { useDashboard } from '../hooks/useDashboard';
import { useSmartRecommendations } from '../hooks/useRecommendations';
import { useLeaderboard, useBadges, useChallenges } from '../hooks/useGamification';
import LeaderboardCard from '../components/gamification/LeaderboardCard';
import { InlineFeedback } from '../components/feedback/RecommendationFeedback';
import {
  BRAND,
  TYPOGRAPHY,
  TEXT,
  RADIUS,
  SHADOWS,
} from '../constants/premiumTheme';

// ============================================================================
// HIGH CONTRAST COLORS - Solid, readable
// ============================================================================
const THEME = {
  bg: '#FFFFFF',
  cardBg: '#FFFFFF',
  headerBg: [BRAND.primary, BRAND.primaryDark],
  accent: BRAND.primary,
  accentLight: BRAND.primaryLight,
  success: '#10B981',
  warning: '#F59E0B',
  gold: '#D97706',
};

// Island colors - vibrant and distinct
const ISLAND_COLORS = {
  starter: BRAND.primary,
  builder: BRAND.secondary,
  tracker: BRAND.accent,
  storm: BRAND.primaryLight,
  reef: '#10B981',
  harbor: '#F59E0B',
  treasure: '#D97706',
};

// ============================================================================
// JOURNEY ISLANDS
// ============================================================================
const JOURNEY_ISLANDS = [
  { key: 'STARTER', name: 'Starter Cove', emoji: '🏝️', minDays: 0, color: ISLAND_COLORS.starter },
  { key: 'BUILDER', name: 'Builder Bay', emoji: '⚓', minDays: 5, color: ISLAND_COLORS.builder },
  { key: 'TRACKER', name: 'Tracker Lagoon', emoji: '🗺️', minDays: 14, color: ISLAND_COLORS.tracker },
  { key: 'STORM', name: 'Storm Peak', emoji: '⛈️', minDays: 30, color: ISLAND_COLORS.storm },
  { key: 'REEF', name: 'Golden Reef', emoji: '🐚', minDays: 60, color: ISLAND_COLORS.reef },
  { key: 'HARBOR', name: 'Legends Harbor', emoji: '🏰', minDays: 120, color: ISLAND_COLORS.harbor },
  { key: 'TREASURE', name: 'Treasure Island', emoji: '💎', minDays: 365, color: ISLAND_COLORS.treasure },
];

// Daily Quests
const DAILY_QUESTS = [
  { id: 'meal', title: "Captain's Feast", desc: 'Log a nutritious meal', xp: 25, emoji: '🍽️', color: BRAND.secondary },
  { id: 'water', title: 'Ocean Hydration', desc: 'Track your water intake', xp: 15, emoji: '🌊', color: BRAND.accent },
  { id: 'mood', title: 'Crew Morale', desc: 'Check how you feel', xp: 20, emoji: '😊', color: BRAND.primary },
];

// Weekly Challenge
const WEEKLY_CHALLENGE = {
  title: 'Seven Seas Voyage',
  description: 'Complete all daily quests for 7 consecutive days',
  reward: 'Mystery Chest + 500 XP',
  emoji: '🌟',
};

// Rarity helpers
const getRarityFromScore = (score) => {
  if (score >= 0.8) return 'legendary';
  if (score >= 0.6) return 'epic';
  if (score >= 0.4) return 'rare';
  return 'common';
};

const getMealEmoji = (mealType) => {
  const emojis = { breakfast: '🌅', lunch: '🥗', dinner: '🍽️', snack: '🍎' };
  return emojis[mealType] || '✨';
};

// Chest rarity - solid colors with high contrast
const CHEST_RARITY = {
  common: { name: 'Common', bg: '#E5E7EB', color: '#6B7280' },
  rare: { name: 'Rare', bg: BRAND.accent, color: '#FFFFFF' },
  epic: { name: 'Epic', bg: BRAND.primary, color: '#FFFFFF' },
  legendary: { name: 'Legendary', bg: THEME.gold, color: '#FFFFFF' },
};

// ============================================================================
// COMPONENTS
// ============================================================================

// Animated Ship
const AnimatedShip = ({ progress }) => {
  const bobAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bobAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [bobAnim]);

  const translateY = bobAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const rotate = bobAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-3deg', '3deg', '-3deg'] });

  return (
    <Animated.View style={[styles.ship, { left: `${Math.min(progress * 100, 85)}%`, transform: [{ translateY }, { rotate }] }]}>
      <Text style={styles.shipEmoji}>⛵</Text>
    </Animated.View>
  );
};

// Captain Coach - solid card, no glass
const CaptainCoach = ({ streak, tip }) => {
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.delay(2000),
      ])
    ).start();
  }, [waveAnim]);

  const rotate = waveAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '20deg'] });

  return (
    <View style={styles.captainCard}>
      <View style={styles.captainAvatar}>
        <Text style={styles.captainEmoji}>🧭</Text>
        <Animated.Text style={[styles.captainHand, { transform: [{ rotate }] }]}>👋</Animated.Text>
      </View>
      <View style={styles.captainBubble}>
        <Text style={styles.captainTitle}>Captain Tip</Text>
        <Text style={styles.captainText}>{tip}</Text>
        {streak > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakBadgeText}>🔥 {streak} day streak!</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// XP Ring - compact
const XPRing = ({ progress, level }) => {
  const circumference = 2 * Math.PI * 32;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={styles.levelRingWrap}>
      <Svg width={80} height={80}>
        <Defs>
          <SvgLinearGradient id="xpGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={BRAND.secondary} />
            <Stop offset="100%" stopColor={BRAND.primary} />
          </SvgLinearGradient>
        </Defs>
        <Circle cx="40" cy="40" r="32" stroke="rgba(255,255,255,0.3)" strokeWidth="5" fill="none" />
        <Circle
          cx="40" cy="40" r="32"
          stroke="url(#xpGrad)" strokeWidth="5" fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 40 40)"
        />
      </Svg>
      <View style={styles.levelCenter}>
        <Text style={styles.levelEmoji}>⭐</Text>
        <Text style={styles.levelNum}>Lv {level}</Text>
      </View>
    </View>
  );
};

// Treasure Chest - solid colors with feedback
const TreasureChest = ({ chest, onOpen, onLike, onDismiss }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const rarity = CHEST_RARITY[chest.rarity] || CHEST_RARITY.common;

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsOpen(!isOpen);
    if (!isOpen && onOpen) onOpen(chest);
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike?.(chest);
  };

  const handleDismiss = () => {
    onDismiss?.(chest);
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={styles.chestWrap}>
      <View style={[styles.chestCard, { backgroundColor: rarity.bg }]}>
        <View style={styles.chestHeader}>
          <Text style={styles.chestIcon}>{isOpen ? '📜' : '🎁'}</Text>
          <View style={[styles.rarityTag, { backgroundColor: 'rgba(0,0,0,0.15)' }]}>
            <Text style={[styles.rarityTagText, { color: rarity.color }]}>{rarity.name}</Text>
          </View>
        </View>
        <View style={styles.chestBody}>
          <Text style={styles.chestName}>{chest.name}</Text>
          {isOpen ? (
            <>
              <Text style={styles.chestFood}>{chest.food}</Text>
              <View style={styles.benefitRow}>
                <Ionicons name="sparkles" size={11} color={BRAND.primary} />
                <Text style={styles.benefitText}>{chest.benefit}</Text>
              </View>
              <View style={styles.chestFeedback}>
                <InlineFeedback
                  onLike={handleLike}
                  onDismiss={handleDismiss}
                  isLiked={isLiked}
                />
              </View>
            </>
          ) : (
            <Text style={styles.chestHint}>Tap to reveal</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Quest Card - solid white background
const QuestCard = ({ quest, isCompleted, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.questCard, isCompleted && styles.questCardCompleted]}>
        <View style={[styles.questIconWrap, { backgroundColor: isCompleted ? '#D1FAE5' : `${quest.color}20` }]}>
          <Text style={styles.questEmoji}>{quest.emoji}</Text>
        </View>
        <View style={styles.questContent}>
          <Text style={[styles.questTitle, isCompleted && styles.questTitleDone]}>{quest.title}</Text>
          <Text style={styles.questDesc}>{quest.desc}</Text>
        </View>
        <View style={styles.questReward}>
          {isCompleted ? (
            <View style={styles.questCheck}>
              <Ionicons name="checkmark" size={16} color="#FFF" />
            </View>
          ) : (
            <View style={styles.xpChip}>
              <Text style={styles.xpValue}>+{quest.xp}</Text>
              <Text style={styles.xpLabel}>XP</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Badge Card - displays earned badges
const BadgeCard = ({ badge }) => {
  const currentTier = badge.currentTier;
  const progressPercent = badge.progressPercent || 0;
  const isEarned = !!currentTier;

  // Tier colors
  const tierColors = {
    bronze: { bg: '#CD7F32', text: '#FFF' },
    silver: { bg: '#C0C0C0', text: '#1F2937' },
    gold: { bg: '#FFD700', text: '#1F2937' },
    platinum: { bg: '#E5E4E2', text: '#1F2937' },
    diamond: { bg: '#B9F2FF', text: '#1F2937' },
  };

  const tierStyle = currentTier ? tierColors[currentTier] || tierColors.bronze : { bg: '#E5E7EB', text: '#6B7280' };

  return (
    <View style={[styles.badgeCard, isEarned && { borderColor: tierStyle.bg, borderWidth: 2 }]}>
      <View style={[styles.badgeIconWrap, { backgroundColor: isEarned ? tierStyle.bg : '#F3F4F6' }]}>
        <Text style={styles.badgeEmoji}>{badge.icon || '🏅'}</Text>
      </View>
      <Text style={[styles.badgeName, !isEarned && { color: TEXT.tertiary }]} numberOfLines={1}>{badge.name}</Text>
      {isEarned ? (
        <View style={[styles.tierTag, { backgroundColor: tierStyle.bg }]}>
          <Text style={[styles.tierTagText, { color: tierStyle.text }]}>{currentTier}</Text>
        </View>
      ) : (
        <View style={styles.badgeProgressWrap}>
          <View style={styles.badgeProgressTrack}>
            <View style={[styles.badgeProgressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.badgeProgressText}>{Math.round(progressPercent)}%</Text>
        </View>
      )}
    </View>
  );
};

// Challenge Card - displays daily/weekly challenges from API
const ChallengeCard = ({ challenge, type = 'daily', onPress }) => {
  const isCompleted = challenge.completed;
  const progress = challenge.progress || 0;
  const target = challenge.target || 1;
  const progressPercent = Math.min((progress / target) * 100, 100);

  const typeColors = {
    daily: BRAND.secondary,
    weekly: BRAND.primary,
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.questCard, isCompleted && styles.questCardCompleted]}>
        <View style={[styles.questIconWrap, { backgroundColor: isCompleted ? '#D1FAE5' : `${typeColors[type]}20` }]}>
          <Text style={styles.questEmoji}>{challenge.icon || (type === 'daily' ? '⚔️' : '🌟')}</Text>
        </View>
        <View style={styles.questContent}>
          <Text style={[styles.questTitle, isCompleted && styles.questTitleDone]}>{challenge.title || challenge.name}</Text>
          <Text style={styles.questDesc}>{challenge.description}</Text>
          {!isCompleted && (
            <View style={styles.challengeProgressWrap}>
              <View style={styles.challengeProgressTrack}>
                <View style={[styles.challengeProgressFill, { width: `${progressPercent}%`, backgroundColor: typeColors[type] }]} />
              </View>
              <Text style={styles.challengeProgressText}>{progress}/{target}</Text>
            </View>
          )}
        </View>
        <View style={styles.questReward}>
          {isCompleted ? (
            <View style={styles.questCheck}>
              <Ionicons name="checkmark" size={16} color="#FFF" />
            </View>
          ) : (
            <View style={styles.xpChip}>
              <Text style={styles.xpValue}>+{challenge.xpReward || 25}</Text>
              <Text style={styles.xpLabel}>XP</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ============================================================================
// MAIN SCREEN
// ============================================================================
export default function AchievementsScreen() {
  const router = useRouter();
  const { data: dashboardData } = useDashboard();

  const {
    recommendations: smartRecs,
    loading: recsLoading,
    fetchRecommendations,
  } = useSmartRecommendations({ enabled: false });

  // Leaderboard data
  const { data: globalLeaderboard, isLoading: leaderboardLoading, refetch: refetchLeaderboard } = useLeaderboard('global', 10);

  // Badges data
  const { data: badgesData, isLoading: badgesLoading } = useBadges();
  const badges = badgesData?.badges || [];

  // Challenges data
  const { data: challengesData, isLoading: challengesLoading } = useChallenges();
  const dailyChallenges = challengesData?.daily?.challenges || [];
  const weeklyChallenges = challengesData?.weekly?.challenges || [];

  // Fetch recommendations on mount
  useEffect(() => {
    fetchRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sample treasures (fallback when API is loading)
  const SAMPLE_TREASURES = useMemo(() => [
    { id: 'sample-1', name: 'Greek Yogurt Bowl', food: 'High protein breakfast', rarity: 'epic', emoji: '🌅', benefit: 'Great for muscle recovery' },
    { id: 'sample-2', name: 'Grilled Salmon', food: 'Omega-3 rich dinner', rarity: 'legendary', emoji: '🍽️', benefit: 'Heart-healthy fats' },
    { id: 'sample-3', name: 'Mixed Nuts', food: 'Healthy snack', rarity: 'rare', emoji: '🍎', benefit: 'Sustained energy' },
    { id: 'sample-4', name: 'Quinoa Salad', food: 'Balanced lunch', rarity: 'epic', emoji: '🥗', benefit: 'Complete protein source' },
  ], []);

  const treasureChests = useMemo(() => {
    if (smartRecs && smartRecs.length > 0) {
      return smartRecs.slice(0, 4).map((rec, idx) => ({
        id: rec.id || `rec-${idx}`,
        name: rec.title?.replace(/^[^\s]+\s/, '') || rec.foodName || 'Treasure',
        food: rec.foodName || rec.name,
        rarity: getRarityFromScore(rec.personalization?.score || 0.5),
        emoji: getMealEmoji(rec.mealType),
        benefit: rec.personalization?.reasoning || rec.reason || 'Great choice for you',
        originalRec: rec,
      }));
    }
    if (recsLoading) {
      return [{ id: 'loading-1', name: 'Loading...', food: 'Finding treasures', rarity: 'common', emoji: '🔮', benefit: 'Personalized for you', isLoading: true }];
    }
    return SAMPLE_TREASURES;
  }, [smartRecs, recsLoading, SAMPLE_TREASURES]);

  // Data
  const gamification = dashboardData?.gamification || {};
  const userLifecycle = dashboardData?.userLifecycle || {};
  const level = gamification.level || 1;
  const xp = gamification.xp || 0;
  const streak = gamification.streak || 0;
  const totalMeals = gamification.totalMealsLogged || 0;
  const daysWithData = userLifecycle.totalDaysWithLogs || 0;

  const xpPerLevel = 100;
  const currentLevelXp = xp % xpPerLevel;
  const xpProgress = currentLevelXp / xpPerLevel;

  const rankTitle = level >= 10 ? 'Admiral' : level >= 5 ? 'Captain' : level >= 3 ? 'First Mate' : 'Sailor';

  const currentIslandIndex = JOURNEY_ISLANDS.findIndex((island, i) =>
    daysWithData >= island.minDays && (i === JOURNEY_ISLANDS.length - 1 || daysWithData < JOURNEY_ISLANDS[i + 1].minDays)
  );
  const journeyProgress = Math.min(currentIslandIndex / (JOURNEY_ISLANDS.length - 1), 1);

  const tips = [
    'Log your meals consistently to build momentum!',
    'Great sailors drink plenty of water.',
    'Track your mood to discover patterns.',
    'Every meal logged is treasure found!',
  ];
  const captainTip = tips[Math.floor(Math.random() * tips.length)];

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleQuestPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/log');
  };

  return (
    <SafeScreen edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header - Solid gradient */}
        <LinearGradient colors={THEME.headerBg} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Ionicons name="chevron-back" size={20} color="#FFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Treasure Quest</Text>
          <XPRing progress={xpProgress} level={level} />
          <Text style={styles.rankTitle}>{rankTitle}</Text>

          <View style={styles.xpBarWrap}>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${xpProgress * 100}%`, backgroundColor: BRAND.secondary }]} />
            </View>
            <Text style={styles.xpText}>{Math.round(currentLevelXp)} / {xpPerLevel} XP</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}><Text style={styles.statEmoji}>🔥</Text><Text style={styles.statVal}>{streak}</Text><Text style={styles.statLbl}>Streak</Text></View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}><Text style={styles.statEmoji}>🍽️</Text><Text style={styles.statVal}>{totalMeals}</Text><Text style={styles.statLbl}>Meals</Text></View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}><Text style={styles.statEmoji}>📅</Text><Text style={styles.statVal}>{daysWithData}</Text><Text style={styles.statLbl}>Days</Text></View>
          </View>
        </LinearGradient>

        {/* Captain Coach */}
        <View style={styles.section}>
          <CaptainCoach streak={streak} tip={captainTip} />
        </View>

        {/* Daily Quests - Uses API challenges when available */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionIcon}>⚔️</Text>
            <View>
              <Text style={styles.sectionTitle}>Daily Quests</Text>
              <Text style={styles.sectionSub}>
                {challengesData?.daily ? `${challengesData.daily.completed}/${challengesData.daily.total} complete` : 'Complete for XP rewards'}
              </Text>
            </View>
          </View>
          <View style={styles.questsCol}>
            {challengesLoading ? (
              <View style={styles.loadingWrap}>
                <Text style={styles.loadingText}>Loading challenges...</Text>
              </View>
            ) : dailyChallenges.length > 0 ? (
              dailyChallenges.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} type="daily" onPress={handleQuestPress} />
              ))
            ) : (
              DAILY_QUESTS.map((q) => (
                <QuestCard key={q.id} quest={q} isCompleted={false} onPress={handleQuestPress} />
              ))
            )}
          </View>
        </View>

        {/* Weekly Challenge - Uses API challenges when available */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionIcon}>🌟</Text>
            <View>
              <Text style={styles.sectionTitle}>Weekly Challenges</Text>
              <Text style={styles.sectionSub}>
                {challengesData?.weekly ? `${challengesData.weekly.completed}/${challengesData.weekly.total} complete` : 'Bigger rewards'}
              </Text>
            </View>
          </View>
          {weeklyChallenges.length > 0 ? (
            <View style={styles.questsCol}>
              {weeklyChallenges.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} type="weekly" onPress={handleQuestPress} />
              ))}
            </View>
          ) : (
            <LinearGradient colors={THEME.headerBg} style={styles.weeklyCard}>
              <View style={styles.weeklyHead}>
                <Text style={styles.weeklyEmoji}>{WEEKLY_CHALLENGE.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.weeklyTitle}>{WEEKLY_CHALLENGE.title}</Text>
                  <Text style={styles.weeklyDesc}>{WEEKLY_CHALLENGE.description}</Text>
                </View>
              </View>
              <View style={styles.weeklyReward}>
                <Ionicons name="gift" size={14} color="#FFF" />
                <Text style={styles.weeklyRewardText}>{WEEKLY_CHALLENGE.reward}</Text>
              </View>
            </LinearGradient>
          )}
        </View>

        {/* Leaderboard */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionIcon}>🏆</Text>
            <View>
              <Text style={styles.sectionTitle}>Leaderboard</Text>
              <Text style={styles.sectionSub}>Compete with other sailors</Text>
            </View>
          </View>
          <LeaderboardCard
            globalData={globalLeaderboard?.leaderboard || []}
            weeklyData={[]}
            streakData={[]}
            userRank={globalLeaderboard?.userRank}
            userInTop={globalLeaderboard?.userRank && globalLeaderboard.userRank <= 10}
            isLoading={leaderboardLoading}
            onRefresh={refetchLeaderboard}
          />
        </View>

        {/* Badges */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionIcon}>🏅</Text>
            <View>
              <Text style={styles.sectionTitle}>Badges</Text>
              <Text style={styles.sectionSub}>Collect achievements as you progress</Text>
            </View>
          </View>
          {badgesLoading ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.loadingText}>Loading badges...</Text>
            </View>
          ) : badges.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesRow}>
              {badges.map((badge) => (
                <BadgeCard key={badge.id || badge.name} badge={badge} />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🎖️</Text>
              <Text style={styles.emptyText}>Start logging to earn badges!</Text>
            </View>
          )}
        </View>

        {/* Journey Map */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionIcon}>🗺️</Text>
            <View>
              <Text style={styles.sectionTitle}>Voyage Map</Text>
              <Text style={styles.sectionSub}>Your journey across the seas</Text>
            </View>
          </View>
          <View style={styles.mapCard}>
            <View style={styles.mapBg}>
              <AnimatedShip progress={journeyProgress} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.islandsRow}>
                {JOURNEY_ISLANDS.map((island, idx) => {
                  const isCompleted = idx < currentIslandIndex;
                  const isCurrent = idx === currentIslandIndex;
                  const isLocked = idx > currentIslandIndex;

                  return (
                    <View key={island.key} style={styles.islandMarker}>
                      <View style={[
                        styles.islandCircle,
                        { backgroundColor: isLocked ? '#D1D5DB' : island.color },
                        isCurrent && styles.islandCurrent
                      ]}>
                        <Text style={styles.islandEmoji}>{island.emoji}</Text>
                        {isCompleted && (
                          <View style={styles.islandCheck}>
                            <Ionicons name="checkmark" size={10} color="#FFF" />
                          </View>
                        )}
                      </View>
                      <Text style={[styles.islandName, isLocked && styles.islandNameLocked]}>{island.name}</Text>
                      {!isCompleted && !isCurrent && (
                        <View style={styles.daysChip}>
                          <Text style={styles.daysChipText}>{island.minDays}d</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </View>

        {/* Treasure Chests */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionIcon}>🎁</Text>
            <View>
              <Text style={styles.sectionTitle}>Treasure Chests</Text>
              <Text style={styles.sectionSub}>AI-powered recommendations</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chestsRow}>
            {treasureChests.map((c) => (
              <TreasureChest
                key={c.id}
                chest={c}
                onOpen={async (chest) => {
                  if (chest.originalRec && !chest.isLoading && chest.rarity === 'legendary') {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                }}
                onLike={(chest) => {
                  console.log('Liked recommendation:', chest.name);
                }}
                onDismiss={(chest) => {
                  console.log('Dismissed recommendation:', chest.name);
                }}
              />
            ))}
          </ScrollView>
          {recsLoading && <Text style={styles.loadingText}>Finding treasures for you...</Text>}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerCard}>
            <Text style={styles.footerEmoji}>⚓</Text>
            <Text style={styles.footerText}>Keep sailing to unlock Treasure Island!</Text>
          </View>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

// ============================================================================
// STYLES - High contrast, solid colors
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { paddingBottom: 100 },

  // Header (Compact)
  header: { paddingTop: 44, paddingBottom: 20, alignItems: 'center', borderBottomLeftRadius: RADIUS.xl, borderBottomRightRadius: RADIUS.xl },
  backBtn: { position: 'absolute', top: 44, left: 16, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontFamily: TYPOGRAPHY.family.bold, color: '#FFF', marginBottom: 8 },

  // Level Ring
  levelRingWrap: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  levelCenter: { position: 'absolute', alignItems: 'center' },
  levelEmoji: { fontSize: 18 },
  levelNum: { fontSize: 11, fontFamily: TYPOGRAPHY.family.bold, color: '#FFF', marginTop: 1 },
  rankTitle: { fontSize: 10, fontFamily: TYPOGRAPHY.family.semibold, color: '#FFF', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },

  // XP Bar
  xpBarWrap: { width: '70%', marginTop: 8, alignItems: 'center' },
  xpTrack: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 3 },
  xpText: { fontSize: 10, fontFamily: TYPOGRAPHY.family.medium, color: '#FFF', marginTop: 4 },

  // Stats
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 16 },
  statItem: { alignItems: 'center' },
  statEmoji: { fontSize: 14 },
  statVal: { fontSize: 15, fontFamily: TYPOGRAPHY.family.bold, color: '#FFF', marginTop: 1 },
  statLbl: { fontSize: 9, fontFamily: TYPOGRAPHY.family.medium, color: 'rgba(255,255,255,0.8)' },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.3)' },

  // Sections
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionIcon: { fontSize: 22 },
  sectionTitle: { fontSize: 17, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },
  sectionSub: { fontSize: 12, fontFamily: TYPOGRAPHY.family.regular, color: TEXT.tertiary, marginTop: 1 },

  // Captain - solid white card
  captainCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: RADIUS.lg, padding: 14, gap: 12, ...SHADOWS.md },
  captainAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  captainEmoji: { fontSize: 26 },
  captainHand: { position: 'absolute', bottom: -2, right: -2, fontSize: 14 },
  captainBubble: { flex: 1 },
  captainTitle: { fontSize: 12, fontFamily: TYPOGRAPHY.family.bold, color: BRAND.primary, marginBottom: 3 },
  captainText: { fontSize: 13, fontFamily: TYPOGRAPHY.family.regular, color: TEXT.secondary, lineHeight: 18 },
  streakBadge: { marginTop: 6, backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  streakBadgeText: { fontSize: 11, fontFamily: TYPOGRAPHY.family.semibold, color: '#92400E' },

  // Quests
  questsCol: { gap: 10 },
  questCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: RADIUS.lg, padding: 13, alignItems: 'center', ...SHADOWS.sm },
  questCardCompleted: { backgroundColor: '#ECFDF5' },
  questIconWrap: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  questEmoji: { fontSize: 20 },
  questContent: { flex: 1, marginLeft: 11 },
  questTitle: { fontSize: 14, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.primary },
  questTitleDone: { textDecorationLine: 'line-through', color: TEXT.tertiary },
  questDesc: { fontSize: 11, fontFamily: TYPOGRAPHY.family.regular, color: TEXT.tertiary, marginTop: 1 },
  questReward: { alignItems: 'center' },
  questCheck: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  xpChip: { alignItems: 'center' },
  xpValue: { fontSize: 15, fontFamily: TYPOGRAPHY.family.bold, color: BRAND.primary },
  xpLabel: { fontSize: 8, fontFamily: TYPOGRAPHY.family.medium, color: TEXT.muted },

  // Weekly
  weeklyCard: { borderRadius: RADIUS.lg, padding: 16, ...SHADOWS.md },
  weeklyHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  weeklyEmoji: { fontSize: 28 },
  weeklyTitle: { fontSize: 16, fontFamily: TYPOGRAPHY.family.bold, color: '#FFF' },
  weeklyDesc: { fontSize: 12, fontFamily: TYPOGRAPHY.family.regular, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  weeklyReward: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start' },
  weeklyRewardText: { fontSize: 11, fontFamily: TYPOGRAPHY.family.semibold, color: '#FFF' },

  // Map
  mapCard: { borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.md, backgroundColor: '#E0F2FE' },
  mapBg: { paddingVertical: 20, position: 'relative' },
  ship: { position: 'absolute', top: 30, zIndex: 10 },
  shipEmoji: { fontSize: 24 },
  islandsRow: { paddingTop: 24, paddingBottom: 8, paddingHorizontal: 8, gap: 20 },
  islandMarker: { alignItems: 'center', width: 60 },
  islandCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
  islandCurrent: { borderWidth: 3, borderColor: '#FFF' },
  islandEmoji: { fontSize: 18 },
  islandCheck: { position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  islandName: { fontSize: 9, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.primary, textAlign: 'center', marginTop: 4 },
  islandNameLocked: { color: TEXT.muted },
  daysChip: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 3 },
  daysChipText: { fontSize: 8, fontFamily: TYPOGRAPHY.family.bold, color: '#92400E' },

  // Chests
  chestsRow: { paddingRight: 16, gap: 12 },
  chestWrap: { position: 'relative' },
  chestCard: { width: 140, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.md },
  chestHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10 },
  chestIcon: { fontSize: 24 },
  rarityTag: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  rarityTagText: { fontSize: 8, fontFamily: TYPOGRAPHY.family.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  chestBody: { backgroundColor: '#FFFFFF', padding: 10 },
  chestName: { fontSize: 13, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },
  chestFood: { fontSize: 11, fontFamily: TYPOGRAPHY.family.regular, color: TEXT.secondary, marginTop: 2 },
  chestHint: { fontSize: 10, fontFamily: TYPOGRAPHY.family.medium, color: TEXT.muted, fontStyle: 'italic', marginTop: 3 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  benefitText: { fontSize: 10, fontFamily: TYPOGRAPHY.family.medium, color: BRAND.primary },
  chestFeedback: { marginTop: 8, alignItems: 'center' },

  // Badges
  badgesRow: { paddingRight: 16, gap: 12 },
  badgeCard: { width: 90, backgroundColor: '#FFFFFF', borderRadius: RADIUS.lg, padding: 12, alignItems: 'center', ...SHADOWS.sm },
  badgeIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  badgeEmoji: { fontSize: 22 },
  badgeName: { fontSize: 11, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.primary, textAlign: 'center' },
  tierTag: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tierTagText: { fontSize: 9, fontFamily: TYPOGRAPHY.family.bold, textTransform: 'capitalize' },
  badgeProgressWrap: { marginTop: 6, width: '100%', alignItems: 'center' },
  badgeProgressTrack: { width: '100%', height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden' },
  badgeProgressFill: { height: '100%', backgroundColor: BRAND.primary, borderRadius: 2 },
  badgeProgressText: { fontSize: 9, fontFamily: TYPOGRAPHY.family.medium, color: TEXT.muted, marginTop: 2 },

  // Challenge progress
  challengeProgressWrap: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 8 },
  challengeProgressTrack: { flex: 1, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden' },
  challengeProgressFill: { height: '100%', borderRadius: 2 },
  challengeProgressText: { fontSize: 10, fontFamily: TYPOGRAPHY.family.medium, color: TEXT.tertiary },

  // Empty state
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: RADIUS.lg, padding: 24, alignItems: 'center', ...SHADOWS.sm },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 13, fontFamily: TYPOGRAPHY.family.medium, color: TEXT.tertiary, textAlign: 'center' },

  // Loading wrapper
  loadingWrap: { padding: 16, alignItems: 'center' },

  // Footer
  footer: { marginTop: 24, marginHorizontal: 16, marginBottom: 16 },
  footerCard: { backgroundColor: '#F3F4F6', borderRadius: RADIUS.lg, padding: 16, alignItems: 'center', gap: 6 },
  footerEmoji: { fontSize: 26 },
  footerText: { fontSize: 13, fontFamily: TYPOGRAPHY.family.medium, color: TEXT.secondary, textAlign: 'center' },

  // Loading
  loadingText: { fontSize: 12, fontFamily: TYPOGRAPHY.family.medium, color: TEXT.tertiary, textAlign: 'center', marginTop: 12, fontStyle: 'italic' },
});
