/**
 * VoyageMap
 * Horizontal island progression with an animated ship marking current progress.
 */
import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, Animated, Easing, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SHADOWS, TYPOGRAPHY, TEXT } from '../../constants/premiumTheme';

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

const VoyageMap = ({ islands, currentIslandIndex, journeyProgress }) => (
  <View style={styles.card}>
    <View style={styles.bg}>
      <AnimatedShip progress={journeyProgress} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.islandsRow}>
        {islands.map((island, idx) => {
          const isCompleted = idx < currentIslandIndex;
          const isCurrent = idx === currentIslandIndex;
          const isLocked = idx > currentIslandIndex;

          return (
            <View key={island.key} style={styles.marker}>
              <View style={[
                styles.circle,
                { backgroundColor: isLocked ? '#D1D5DB' : island.color },
                isCurrent && styles.circleCurrent,
              ]}>
                <Text style={styles.emoji}>{island.emoji}</Text>
                {isCompleted && (
                  <View style={styles.check}>
                    <Ionicons name="checkmark" size={10} color="#FFF" />
                  </View>
                )}
              </View>
              <Text style={[styles.name, isLocked && styles.nameLocked]}>{island.name}</Text>
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
);

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.md, backgroundColor: '#E0F2FE' },
  bg: { paddingVertical: 20, position: 'relative' },
  ship: { position: 'absolute', top: 30, zIndex: 10 },
  shipEmoji: { fontSize: 24 },
  islandsRow: { paddingTop: 24, paddingBottom: 8, paddingHorizontal: 8, gap: 20 },
  marker: { alignItems: 'center', width: 60 },
  circle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
  circleCurrent: { borderWidth: 3, borderColor: '#FFF' },
  emoji: { fontSize: 18 },
  check: { position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 9, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.primary, textAlign: 'center', marginTop: 4 },
  nameLocked: { color: TEXT.muted },
  daysChip: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 3 },
  daysChipText: { fontSize: 8, fontFamily: TYPOGRAPHY.family.bold, color: '#92400E' },
});

export default VoyageMap;
