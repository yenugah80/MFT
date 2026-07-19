/**
 * Achievements Screen ("Treasure Quest")
 * Orchestrates data-fetching and composes the presentational components in
 * components/achievements/ — see that folder for the header, quest cards,
 * captain tip, voyage map, treasure chests, and badges.
 */

import React, { useMemo, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useNavigation } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useDashboard } from '../hooks/useDashboard';
import { useSmartRecommendations } from '../hooks/useRecommendations';
import { useBadges, useChallenges } from '../hooks/useGamification';
import XPHeader from '../components/achievements/XPHeader';
import CaptainCoach from '../components/achievements/CaptainCoach';
import QuestCard from '../components/achievements/QuestCard';
import VoyageMap from '../components/achievements/VoyageMap';
import TreasureChest from '../components/achievements/TreasureChest';
import BadgeCard from '../components/achievements/BadgeCard';
import { BRAND, TYPOGRAPHY, TEXT, RADIUS, SHADOWS } from '../constants/premiumTheme';
import {
  JOURNEY_ISLANDS,
  FALLBACK_DAILY_QUESTS,
  FALLBACK_WEEKLY_CHALLENGE,
  SAMPLE_TREASURES,
  CAPTAIN_TIPS,
  getRarityFromScore,
  ACHIEVEMENT_COLORS,
} from '../components/achievements/data';

export default function AchievementsScreen() {
  const router = useRouter();
  const { data: dashboardData } = useDashboard();

  const {
    recommendations: smartRecs,
    loading: recsLoading,
    fetchRecommendations,
  } = useSmartRecommendations({ enabled: false });

  const { data: badgesData, isLoading: badgesLoading } = useBadges();
  const badges = badgesData?.achievements || [];

  const { data: challengesData, isLoading: challengesLoading } = useChallenges();
  const dailyChallenges = challengesData?.daily?.challenges || [];
  const weeklyChallenges = challengesData?.weekly?.challenges || [];

  useEffect(() => {
    fetchRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Picked once per screen visit — previously re-randomized on every render
  // (any state change anywhere on the screen would swap the tip mid-read).
  const captainTip = useMemo(
    () => CAPTAIN_TIPS[Math.floor(Math.random() * CAPTAIN_TIPS.length)],
    []
  );

  const treasureChests = useMemo(() => {
    if (smartRecs && smartRecs.length > 0) {
      return smartRecs.slice(0, 4).map((rec, idx) => ({
        id: rec.id || `rec-${idx}`,
        name: rec.title?.replace(/^[^\s]+\s/, '') || rec.foodName || 'Treasure',
        food: rec.foodName || rec.name,
        rarity: getRarityFromScore(rec.personalization?.score || 0.5),
        benefit: rec.personalization?.reasoning || rec.reason || 'Great choice for you',
        originalRec: rec,
      }));
    }
    if (recsLoading) {
      return [{ id: 'loading-1', name: 'Loading...', food: 'Finding treasures', rarity: 'common', benefit: 'Personalized for you', isLoading: true }];
    }
    return SAMPLE_TREASURES;
  }, [smartRecs, recsLoading]);

  const gamification = dashboardData?.gamification || {};
  const userLifecycle = dashboardData?.userLifecycle || {};
  const level = gamification.level || 1;
  const streak = gamification.streak || 0;
  const totalMeals = gamification.totalMealsLogged || 0;
  const daysWithData = userLifecycle.totalDaysWithLogs || 0;

  // Real, non-linear level/XP curve from the backend's levelCalculator (100 + 50*level per
  // level) — previously this screen recomputed its own flat 100-XP/level + 4-tier rank title
  // locally, which drifted from what the rest of the app (dashboard, gamification routes) uses.
  const currentLevelXp = gamification.currentLevelXp || 0;
  const nextLevelXp = gamification.nextLevelXp || 100;
  const xpProgress = (gamification.progressPercent || 0) / 100;
  const rankTitle = gamification.levelName || 'Beginner';

  const currentIslandIndex = JOURNEY_ISLANDS.findIndex((island, i) =>
    daysWithData >= island.minDays && (i === JOURNEY_ISLANDS.length - 1 || daysWithData < JOURNEY_ISLANDS[i + 1].minDays)
  );
  const journeyProgress = Math.min(currentIslandIndex / (JOURNEY_ISLANDS.length - 1), 1);

  // Guards against handleBack's own router.back()/replace() re-triggering the
  // beforeRemove listener below and recursing.
  const isNavigatingAway = useRef(false);
  const handleBack = useCallback(async () => {
    if (isNavigatingAway.current) return;
    isNavigatingAway.current = true;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [router]);

  // The iOS edge-swipe gesture dispatches GO_BACK straight to the native stack,
  // bypassing the header button's onPress entirely — this screen sits outside any
  // group Stack, so the native stack it lands in has no prior route registered even
  // though router.canGoBack() (expo-router's own history) correctly knows there is
  // one. Intercept every back attempt — swipe, hardware back, or button — and route
  // it through the same handleBack logic so they all behave identically.
  const navigation = useNavigation();
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isNavigatingAway.current) return;
      e.preventDefault();
      handleBack();
    });
    return unsubscribe;
  }, [navigation, handleBack]);

  const handleQuestPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/log');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <XPHeader
          onBack={handleBack}
          title="Treasure Quest"
          level={level}
          rankTitle={rankTitle}
          xpProgress={xpProgress}
          currentLevelXp={currentLevelXp}
          xpPerLevel={nextLevelXp}
          streak={streak}
          totalMeals={totalMeals}
          daysWithData={daysWithData}
        />

        <View style={styles.section}>
          <CaptainCoach streak={streak} tip={captainTip} />
        </View>

        {/* Daily Quests — uses API challenges when available, else static fallback */}
        <View style={styles.section}>
          <SectionHead icon="⚔️" title="Daily Quests" subtitle={
            challengesData?.daily ? `${challengesData.daily.completed}/${challengesData.daily.total} complete` : 'Complete for XP rewards'
          } />
          <View style={styles.questsCol}>
            {challengesLoading ? (
              <LoadingRow text="Loading challenges..." />
            ) : dailyChallenges.length > 0 ? (
              dailyChallenges.map((c) => (
                <QuestCard
                  key={c.id}
                  icon={c.icon || '⚔️'}
                  title={c.title || c.name}
                  description={c.description}
                  xp={c.xpReward || 25}
                  color={BRAND.secondary}
                  completed={c.completed}
                  progress={!c.completed ? { current: c.progress || 0, target: c.target || 1 } : null}
                  onPress={handleQuestPress}
                />
              ))
            ) : (
              FALLBACK_DAILY_QUESTS.map((q) => (
                <QuestCard
                  key={q.id}
                  icon={q.emoji}
                  title={q.title}
                  description={q.desc}
                  xp={q.xp}
                  color={q.color}
                  completed={false}
                  onPress={handleQuestPress}
                />
              ))
            )}
          </View>
        </View>

        {/* Weekly Challenge — uses API challenges when available, else static fallback card */}
        <View style={styles.section}>
          <SectionHead icon="🌟" title="Weekly Challenges" subtitle={
            challengesData?.weekly ? `${challengesData.weekly.completed}/${challengesData.weekly.total} complete` : 'Bigger rewards'
          } />
          {weeklyChallenges.length > 0 ? (
            <View style={styles.questsCol}>
              {weeklyChallenges.map((c) => (
                <QuestCard
                  key={c.id}
                  icon={c.icon || '🌟'}
                  title={c.title || c.name}
                  description={c.description}
                  xp={c.xpReward || 25}
                  color={BRAND.primary}
                  completed={c.completed}
                  progress={!c.completed ? { current: c.progress || 0, target: c.target || 1 } : null}
                  onPress={handleQuestPress}
                />
              ))}
            </View>
          ) : (
            <LinearGradient colors={[BRAND.primary, BRAND.primaryDark]} style={styles.weeklyCard}>
              <View style={styles.weeklyHead}>
                <Text style={styles.weeklyEmoji}>{FALLBACK_WEEKLY_CHALLENGE.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.weeklyTitle}>{FALLBACK_WEEKLY_CHALLENGE.title}</Text>
                  <Text style={styles.weeklyDesc}>{FALLBACK_WEEKLY_CHALLENGE.description}</Text>
                </View>
              </View>
              <View style={styles.weeklyReward}>
                <Text style={styles.weeklyRewardText}>🎁 {FALLBACK_WEEKLY_CHALLENGE.reward}</Text>
              </View>
            </LinearGradient>
          )}
        </View>

        <View style={styles.section}>
          <SectionHead icon="🏅" title="Badges" subtitle="Collect achievements as you progress" />
          {badgesLoading ? (
            <LoadingRow text="Loading badges..." />
          ) : badges.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesRow}>
              {badges.map((badge) => (
                <BadgeCard key={badge.id || badge.name} achievement={badge} />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🎖️</Text>
              <Text style={styles.emptyText}>Start logging to earn badges!</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <SectionHead icon="🗺️" title="Voyage Map" subtitle="Your journey across the seas" />
          <VoyageMap islands={JOURNEY_ISLANDS} currentIslandIndex={currentIslandIndex} journeyProgress={journeyProgress} />
        </View>

        <View style={styles.section}>
          <SectionHead icon="🎁" title="Treasure Chests" subtitle="AI-powered recommendations" />
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
                onLike={(chest) => console.log('Liked recommendation:', chest.name)}
                onDismiss={(chest) => console.log('Dismissed recommendation:', chest.name)}
              />
            ))}
          </ScrollView>
          {recsLoading && <Text style={styles.loadingText}>Finding treasures for you...</Text>}
        </View>

        <View style={styles.footer}>
          <View style={styles.footerCard}>
            <Text style={styles.footerEmoji}>⚓</Text>
            <Text style={styles.footerText}>Keep sailing to unlock Treasure Island!</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const SectionHead = ({ icon, title, subtitle }) => (
  <View style={styles.sectionHead}>
    <Text style={styles.sectionIcon}>{icon}</Text>
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSub}>{subtitle}</Text>
    </View>
  </View>
);

const LoadingRow = ({ text }) => (
  <View style={styles.loadingWrap}>
    <Text style={styles.loadingText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { paddingBottom: 100 },

  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionIcon: { fontSize: 22 },
  sectionTitle: { fontSize: 17, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },
  sectionSub: { fontSize: 12, fontFamily: TYPOGRAPHY.family.regular, color: TEXT.tertiary, marginTop: 1 },

  questsCol: { gap: 10 },

  weeklyCard: { borderRadius: RADIUS.lg, padding: 16, ...SHADOWS.md },
  weeklyHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  weeklyEmoji: { fontSize: 28 },
  weeklyTitle: { fontSize: 16, fontFamily: TYPOGRAPHY.family.bold, color: '#FFFFFF' },
  weeklyDesc: { fontSize: 12, fontFamily: TYPOGRAPHY.family.regular, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  weeklyReward: { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start' },
  weeklyRewardText: { fontSize: 11, fontFamily: TYPOGRAPHY.family.semibold, color: '#FFFFFF' },

  badgesRow: { paddingRight: 16, gap: 12 },
  chestsRow: { paddingRight: 16, gap: 12 },

  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: RADIUS.lg, padding: 24, alignItems: 'center', ...SHADOWS.sm },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 13, fontFamily: TYPOGRAPHY.family.medium, color: TEXT.tertiary, textAlign: 'center' },

  loadingWrap: { padding: 16, alignItems: 'center' },
  loadingText: { fontSize: 12, fontFamily: TYPOGRAPHY.family.medium, color: TEXT.tertiary, textAlign: 'center', marginTop: 12, fontStyle: 'italic' },

  footer: { marginTop: 24, marginHorizontal: 16, marginBottom: 16 },
  footerCard: { backgroundColor: '#F3F4F6', borderRadius: RADIUS.lg, padding: 16, alignItems: 'center', gap: 6 },
  footerEmoji: { fontSize: 26 },
  footerText: { fontSize: 13, fontFamily: TYPOGRAPHY.family.medium, color: TEXT.secondary, textAlign: 'center' },
});
