/**
 * XPHeader
 * Top hero section: back button, XP ring + level, rank title, XP bar,
 * and the streak/meals/days stat row.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { BRAND, TYPOGRAPHY, RADIUS } from '../../constants/premiumTheme';

const XPRing = ({ progress, level }) => {
  const circumference = 2 * Math.PI * 32;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={styles.ringWrap}>
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
      <View style={styles.ringCenter}>
        <Text style={styles.ringEmoji}>⭐</Text>
        <Text style={styles.ringLevel}>Lv {level}</Text>
      </View>
    </View>
  );
};

const StatItem = ({ emoji, value, label }) => (
  <View style={styles.statItem}>
    <Text style={styles.statEmoji}>{emoji}</Text>
    <Text style={styles.statVal}>{value}</Text>
    <Text style={styles.statLbl}>{label}</Text>
  </View>
);

const XPHeader = ({
  onBack,
  title,
  level,
  rankTitle,
  xpProgress,
  currentLevelXp,
  xpPerLevel,
  streak,
  totalMeals,
  daysWithData,
}) => (
  <LinearGradient colors={[BRAND.primary, BRAND.primaryDark]} style={styles.header}>
    <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={8}>
      <Ionicons name="chevron-back" size={20} color="#FFF" />
    </TouchableOpacity>

    <Text style={styles.title}>{title}</Text>
    <XPRing progress={xpProgress} level={level} />
    <Text style={styles.rankTitle}>{rankTitle}</Text>

    <View style={styles.xpBarWrap}>
      <View style={styles.xpTrack}>
        <View style={[styles.xpFill, { width: `${xpProgress * 100}%` }]} />
      </View>
      <Text style={styles.xpText}>{Math.round(currentLevelXp)} / {xpPerLevel} XP</Text>
    </View>

    <View style={styles.statsRow}>
      <StatItem emoji="🔥" value={streak} label="Streak" />
      <View style={styles.statDivider} />
      <StatItem emoji="🍽️" value={totalMeals} label="Meals" />
      <View style={styles.statDivider} />
      <StatItem emoji="📅" value={daysWithData} label="Days" />
    </View>
  </LinearGradient>
);

const styles = StyleSheet.create({
  header: {
    paddingTop: 16,
    paddingBottom: 20,
    alignItems: 'center',
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontFamily: TYPOGRAPHY.family.bold, color: '#FFF', marginBottom: 8 },

  ringWrap: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringEmoji: { fontSize: 18 },
  ringLevel: { fontSize: 11, fontFamily: TYPOGRAPHY.family.bold, color: '#FFF', marginTop: 1 },
  rankTitle: { fontSize: 10, fontFamily: TYPOGRAPHY.family.semibold, color: '#FFF', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },

  xpBarWrap: { width: '70%', marginTop: 8, alignItems: 'center' },
  xpTrack: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 3, backgroundColor: BRAND.secondary },
  xpText: { fontSize: 10, fontFamily: TYPOGRAPHY.family.medium, color: '#FFF', marginTop: 4 },

  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 16 },
  statItem: { alignItems: 'center' },
  statEmoji: { fontSize: 14 },
  statVal: { fontSize: 15, fontFamily: TYPOGRAPHY.family.bold, color: '#FFF', marginTop: 1 },
  statLbl: { fontSize: 9, fontFamily: TYPOGRAPHY.family.medium, color: 'rgba(255,255,255,0.8)' },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.3)' },
});

export default XPHeader;
