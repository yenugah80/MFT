/**
 * CaptainCoach
 * Small tip card with a waving captain avatar and an optional streak badge.
 */
import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { BRAND, TEXT, TYPOGRAPHY, RADIUS, SHADOWS } from '../../constants/premiumTheme';

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
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.emoji}>🧭</Text>
        <Animated.Text style={[styles.hand, { transform: [{ rotate }] }]}>👋</Animated.Text>
      </View>
      <View style={styles.bubble}>
        <Text style={styles.title}>Captain Tip</Text>
        <Text style={styles.text}>{tip}</Text>
        {streak > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakBadgeText}>🔥 {streak} day streak!</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 12,
    ...SHADOWS.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  emoji: { fontSize: 26 },
  hand: { position: 'absolute', bottom: -2, right: -2, fontSize: 14 },
  bubble: { flex: 1 },
  title: { fontSize: 12, fontFamily: TYPOGRAPHY.family.bold, color: BRAND.primary, marginBottom: 3 },
  text: { fontSize: 13, fontFamily: TYPOGRAPHY.family.regular, color: TEXT.secondary, lineHeight: 18 },
  streakBadge: {
    marginTop: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  streakBadgeText: { fontSize: 11, fontFamily: TYPOGRAPHY.family.semibold, color: '#92400E' },
});

export default CaptainCoach;
