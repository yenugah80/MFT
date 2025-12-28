/**
 * PremiumAchievementsCard - Ultra-Luxurious Gamification Display
 *
 * Engineering & Design Principles:
 * - Visual Hierarchy: Level (Long-term) vs Streak (Short-term)
 * - Performance: Memoized rank calculations, optimized SVG paths
 * - Safety: Clamped progress values to prevent render artifacts
 * - UX: Added "Rank Titles" to give semantic meaning to levels
 */

import React, { useEffect, useRef, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Modal, TouchableOpacity, Dimensions, Share, Platform, Linking } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import GlassCard from './GlassCard';
import {
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SURFACES,
  SHADOWS,
  BRAND
} from '../../constants/premiumTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const { width, height } = Dimensions.get('window');

// Rank logic to make levels meaningful
const getRankTitle = (level) => {
  if (level >= 50) return 'Legend';
  if (level >= 30) return 'Grandmaster';
  if (level >= 20) return 'Master';
  if (level >= 10) return 'Expert';
  if (level >= 5) return 'Apprentice';
  return 'Novice';
};

// ============================================================================
// LEVEL UP MODAL COMPONENT
// ============================================================================
const LevelUpModal = ({ visible, level, rank, onClose }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const viewShotRef = useRef();

  const handleShare = async () => {
    try {
      const uri = await captureRef(viewShotRef, { format: 'png', quality: 0.9 });
      const message = `🏆 I just hit Level ${level} (${rank}) on My-Food-Tracker! #HealthGoals #LevelUp`;

      if (Platform.OS === 'ios') {
        await Share.share({
          url: uri,
          message: message,
        });
      } else { // Android
        await Share.share({
          title: 'Level Up Achievement!',
          message: message,
          url: uri,
        });
      }
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const handleInstagramShare = async () => {
    try {
      const uri = await captureRef(viewShotRef, { format: 'png', quality: 0.9 });
      if (Platform.OS === 'ios') {
        // Instagram Stories URL Scheme
        const instagramUrl = `instagram-stories://share?source_application=com.myfoodtracker&backgroundImage=${uri}`;
        if (await Linking.canOpenURL(instagramUrl)) {
          await Linking.openURL(instagramUrl);
          return;
        }
      }
      handleShare(); // Fallback to standard share if Instagram not installed/Android
    } catch (error) {
      console.log('Error sharing to Instagram:', error);
    }
  };

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
          ])
        )
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      glowAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }} style={{ backgroundColor: 'transparent' }}>
          <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
            {/* Glow Effect */}
            <Animated.View style={[styles.modalGlow, { opacity: glowAnim }]} />
            
            <ExpoLinearGradient
              colors={['#1F2937', '#111827']}
              style={styles.modalCard}
            >
              <View style={styles.modalIconContainer}>
                <Ionicons name="trophy" size={64} color="#F59E0B" />
              </View>
              
              <Text style={styles.modalTitle}>LEVEL UP!</Text>
              <Text style={styles.modalLevel}>{level}</Text>
              <Text style={styles.modalRank}>{rank}</Text>
              
              <Text style={styles.modalDesc}>
                You've reached a new milestone. Keep crushing your goals!
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={handleInstagramShare} style={styles.instagramButton}>
                  <ExpoLinearGradient
                    colors={['#833AB4', '#FD1D1D', '#F77737']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconButtonGradient}
                  >
                    <Ionicons name="logo-instagram" size={24} color="#FFF" />
                  </ExpoLinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
                  <ExpoLinearGradient
                    colors={['#374151', '#1F2937']}
                    style={styles.actionButtonGradient}
                  >
                    <Ionicons name="share-social" size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.shareButtonText}>Share</Text>
                  </ExpoLinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={onClose} style={styles.claimButton}>
                  <ExpoLinearGradient
                    colors={SURFACES.gradient.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionButtonGradient}
                  >
                    <Text style={styles.claimButtonText}>Continue</Text>
                  </ExpoLinearGradient>
                </TouchableOpacity>
              </View>
            </ExpoLinearGradient>
          </Animated.View>
        </ViewShot>
      </View>
    </Modal>
  );
};

// Calculate next level XP requirement (aligned with backend level calculator)
const getNextLevelXp = (currentLevel) => {
  // Formula: Base XP * ((level + 1) ^ 1.3)
  // Level 1 → 2: 2462, Level 2 → 3: 4327, Level 4 → 5: 9036
  const baseXp = 1000;
  return Math.floor(baseXp * Math.pow(currentLevel + 1, 1.3));
};

export default function PremiumAchievementsCard({
  level = 1,
  xp = 0,
  streak = 0,
  nextLevelXp, // Can be passed from backend or calculated
  streakFreezes = 0,
}) {
  // Calculate XP for current level
  const calculatedNextLevelXp = nextLevelXp || getNextLevelXp(level);

  // Get total XP needed for all previous levels
  const getTotalXpForLevel = (targetLevel) => {
    let total = 0;
    for (let i = 1; i < targetLevel; i++) {
      total += getNextLevelXp(i);
    }
    return total;
  };

  const totalXpForCurrentLevel = getTotalXpForLevel(level);
  const currentLevelXp = Math.max(0, xp - totalXpForCurrentLevel);

  // 1. Safety & Logic: Clamp values to prevent visual bugs
  const safeXp = Math.max(0, currentLevelXp);
  const safeTarget = Math.max(1, calculatedNextLevelXp);
  const progress = Math.min(safeXp / safeTarget, 1); // Cap at 100%
  const rankTitle = useMemo(() => getRankTitle(level), [level]);
  const streakMessage = useMemo(() => {
    if (streak === 0) return 'Start your streak today';
    if (streak < 7) return 'Keep the fire burning!';
    if (streak < 30) return 'Amazing consistency!';
    return "You're on a legendary run!";
  }, [streak]);

  // 1.5 Level Up Detection
  const [showLevelUp, setShowLevelUp] = useState(false);
  const prevLevelRef = useRef(level);

  useEffect(() => {
    if (level > prevLevelRef.current) {
      setShowLevelUp(true);
    }
    prevLevelRef.current = level;
  }, [level]);

  // 2. Animation State
  const progressAnim = useRef(new Animated.Value(0)).current;
  const flameScale = useRef(new Animated.Value(1)).current;
  const flameOpacity = useRef(new Animated.Value(0.8)).current;

  // 3. Ring Geometry
  const size = 100;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    // Progress Ring Animation
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 1500,
      easing: Easing.out(Easing.exp),
      useNativeDriver: false, // SVG props don't support native driver
    }).start();

    // Flame Pulse Animation (Only if streak exists)
    if (streak > 0) {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(flameScale, {
              toValue: 1.1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(flameScale, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(flameOpacity, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(flameOpacity, {
              toValue: 0.8,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    }
  }, [progress, streak]);

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <>
    <LevelUpModal 
      visible={showLevelUp} 
      level={level} 
      rank={rankTitle} 
      onClose={() => setShowLevelUp(false)} 
    />
    <GlassCard padding="lg" style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{rankTitle}</Text>
        </View>
      </View>

      <View style={styles.contentRow}>
        {/* LEFT: Level Progress Ring */}
        <View style={styles.levelSection}>
          <View style={{ width: size, height: size }}>
            <Svg width={size} height={size} style={styles.svg}>
              <Defs>
                <LinearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#F59E0B" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#D97706" stopOpacity="1" />
                </LinearGradient>
              </Defs>
              {/* Track */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="rgba(245, 158, 11, 0.1)"
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Progress */}
              <AnimatedCircle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="url(#goldGradient)"
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            </Svg>
            
            {/* Center Level Display */}
            <View style={styles.levelCenter}>
              <Text style={styles.levelLabel}>LEVEL</Text>
              <Text style={styles.levelValue}>{level}</Text>
            </View>
          </View>
          
          <Text style={styles.xpText}>
            {Math.round(safeXp)} / {safeTarget} XP
          </Text>
          <Text style={styles.totalXpText}>
            {Math.max(0, Math.round(safeTarget - safeXp)).toLocaleString()} XP to Level {level + 1}
          </Text>
        </View>

        {/* DIVIDER */}
        <View style={styles.divider} />

        {/* RIGHT: Streak Display */}
        <View style={styles.streakSection}>
          <View style={styles.streakIconContainer}>
            {/* Glow Effect */}
            <Animated.View
              style={[
                styles.streakGlow,
                {
                  transform: [{ scale: flameScale }],
                  opacity: flameOpacity,
                },
              ]}
            />
            <ExpoLinearGradient
              colors={streak > 0 ? ['#EF4444', '#F59E0B'] : ['#9CA3AF', '#D1D5DB']}
              style={styles.streakCircle}
            >
              <Ionicons name="flame" size={32} color="#FFF" />
            </ExpoLinearGradient>
          </View>

          <View style={styles.streakTextContainer}>
            <Text style={styles.streakValue}>{streak}</Text>
            <Text style={styles.streakLabel}>Day Streak</Text>
          </View>

          {streakFreezes > 0 && (
            <View style={styles.streakFreezeContainer}>
              <Ionicons name="snow" size={12} color="#3B82F6" />
              <Text style={styles.streakFreezeText}>{streakFreezes} freeze left</Text>
            </View>
          )}

          <View style={styles.streakMessageContainer}>
            <Text style={styles.streakMessage}>
              {streakMessage}
            </Text>
          </View>
        </View>
      </View>
    </GlassCard>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rankBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: SPACING[3],
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  rankText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#D97706',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  levelCenter: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
    marginBottom: -2,
  },
  levelValue: {
    fontSize: 32,
    fontWeight: '900',
    color: TEXT.primary,
    lineHeight: 36,
  },
  xpText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    marginTop: SPACING[2],
    fontWeight: '600',
  },
  totalXpText: {
    fontSize: 10,
    color: TEXT.muted,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginHorizontal: SPACING[2],
  },
  streakSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakIconContainer: {
    position: 'relative',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[2],
  },
  streakCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    ...SHADOWS.md,
  },
  streakGlow: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    zIndex: 1,
  },
  streakTextContainer: {
    alignItems: 'center',
  },
  streakValue: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT.primary,
  },
  streakLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  streakFreezeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    marginTop: SPACING[1],
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.full,
  },
  streakFreezeText: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: '600',
  },
  streakMessageContainer: {
    marginTop: SPACING[2],
    backgroundColor: SURFACES.background.tertiary,
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: RADIUS.md,
  },
  streakMessage: {
    fontSize: 10,
    color: TEXT.secondary,
    fontWeight: '500',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.85,
    alignItems: 'center',
  },
  modalGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#F59E0B',
    opacity: 0.3,
    zIndex: -1,
  },
  modalCard: {
    width: '100%',
    borderRadius: RADIUS.xl,
    padding: SPACING[8],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  modalIconContainer: {
    marginBottom: SPACING[4],
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontWeight: TYPOGRAPHY.weight.black,
    color: '#FFF',
    fontStyle: 'italic',
    letterSpacing: 2,
  },
  modalLevel: {
    fontSize: 80,
    fontWeight: '900',
    color: '#F59E0B',
    lineHeight: 90,
  },
  modalRank: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#D1D5DB',
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: SPACING[4],
  },
  modalDesc: {
    fontSize: TYPOGRAPHY.size.sm,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: SPACING[6],
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING[3],
    width: '100%',
  },
  instagramButton: {
    width: 50,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  iconButtonGradient: {
    paddingVertical: SPACING[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButton: {
    flex: 1,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  shareButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: TYPOGRAPHY.size.md,
  },
  claimButton: {
    flex: 2,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    paddingVertical: SPACING[3],
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  claimButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: TYPOGRAPHY.size.md,
    textTransform: 'uppercase',
  },
});
