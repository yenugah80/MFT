/**
 * Dietary Compliance Card
 * Shows daily dietary compliance score with circular progress indicator
 * Premium design with gradient and animations
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { BRAND, TEXT, SHADOWS, RADIUS, SPACING } from '../../constants/premiumTheme';
import { getComplianceLevel } from '../../utils/complianceCalculations';

const CIRCLE_RADIUS = 50;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export default function DietaryComplianceCard({ score = 0, todaysMeals = [] }) {
  const mealCount = todaysMeals.length;
  const animatedValue = React.useRef(new Animated.Value(0)).current;
  const level = getComplianceLevel(score);

  // Animate the progress circle
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: score,
      duration: 1500,
      useNativeDriver: false
    }).start();
  }, [score, animatedValue]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [CIRCLE_CIRCUMFERENCE, 0]
  });

  return (
    <LinearGradient
      colors={['#F0F9FF', '#E0F2FE']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { borderLeftColor: level.color }]}
    >
      <View style={styles.header}>
        <Text style={styles.emoji}>{level.emoji}</Text>
        <Text style={styles.title}>Dietary Compliance</Text>
      </View>

      <View style={styles.scoreSection}>
        <View style={styles.circleContainer}>
          <Svg width={140} height={140} viewBox="0 0 120 120">
            {/* Background circle */}
            <Circle
              cx="60"
              cy="60"
              r={CIRCLE_RADIUS}
              stroke=SURFACES.divider
              strokeWidth="8"
              fill="none"
            />
            {/* Progress circle */}
            <Circle
              cx="60"
              cy="60"
              r={CIRCLE_RADIUS}
              stroke={level.color}
              strokeWidth="8"
              fill="none"
              strokeDasharray={CIRCLE_CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin="60, 60"
            />
          </Svg>

          {/* Score text overlay */}
          <View style={styles.scoreText}>
            <Text style={styles.scoreValue}>{Math.round(score)}%</Text>
            <Text style={styles.scoreLabel}>Score</Text>
          </View>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{mealCount}</Text>
            <Text style={styles.statLabel}>Meals</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: level.color }]}>
              {level.level}
            </Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.message, { color: level.color }]}>
        {level.message}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F0F9FF',
    borderRadius: RADIUS.lg,
    borderLeftWidth: 4,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[5],
    marginBottom: SPACING[4],
    ...SHADOWS.sm
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[4],
    gap: SPACING[2]
  },
  emoji: {
    fontSize: 24
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT.primary,
    letterSpacing: -0.3
  },
  scoreSection: {
    alignItems: 'center',
    marginBottom: SPACING[4]
  },
  circleContainer: {
    position: 'relative',
    width: 140,
    height: 140,
    marginBottom: SPACING[4],
    justifyContent: 'center',
    alignItems: 'center'
  },
  scoreText: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center'
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '700',
    color: BRAND.primary
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT.secondary,
    marginTop: SPACING[1]
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[4],
    width: '100%'
  },
  stat: {
    alignItems: 'center',
    flex: 1
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.primary
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT.secondary,
    marginTop: SPACING[1]
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: SURFACES.divider
  },
  message: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18
  }
});
