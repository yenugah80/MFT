/**
 * PersonalizationProgress Component
 *
 * Visual progress indicator showing how personalized the user's model is.
 * Encourages continued logging to improve prediction accuracy.
 *
 * DESIGN SYSTEM:
 * - Circular progress ring with animated fill
 * - Stage indicators (Population -> Adapting -> Personalized)
 * - Motivational messaging based on progress
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { TEXT, SURFACES, BRAND, TYPOGRAPHY } from '../../constants/premiumTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Stage configuration
const STAGES = [
  { key: 'population', label: 'Starting', threshold: 0 },
  { key: 'early', label: 'Learning', threshold: 15 },
  { key: 'adapting', label: 'Adapting', threshold: 45 },
  { key: 'personalized', label: 'Personalized', threshold: 100 },
];

// Motivational messages
const MESSAGES = {
  population: {
    title: 'Getting Started',
    subtitle: 'Log your first few days to begin personalization',
    tip: 'Each log helps us understand your patterns better',
  },
  early: {
    title: 'Learning Your Patterns',
    subtitle: 'We are starting to understand your health rhythms',
    tip: 'Keep logging for more accurate predictions',
  },
  adapting: {
    title: 'Personalizing for You',
    subtitle: 'Your predictions are becoming more tailored',
    tip: 'A few more days until full personalization',
  },
  personalized: {
    title: 'Fully Personalized',
    subtitle: 'Your predictions are now customized to you',
    tip: 'Continue logging to maintain accuracy',
  },
};

export default function PersonalizationProgress({ status }) {
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const progress = status?.status?.progress || 0;
  const level = status?.status?.level || 'population';
  const daysOfData = status?.status?.daysOfData || 0;
  const daysRemaining = status?.status?.daysRemaining || 7;

  const message = MESSAGES[level] || MESSAGES.population;

  // Circle dimensions
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(animatedProgress, {
        toValue: progress,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [progress]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  // Find current stage
  const currentStageIndex = STAGES.findIndex((s, i) => {
    const next = STAGES[i + 1];
    return !next || progress < next.threshold;
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#F8FAFC', '#EFF6FF']}
        style={styles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{message.title}</Text>
          <View style={styles.daysBadge}>
            <Text style={styles.daysText}>{daysOfData} days</Text>
          </View>
        </View>

        {/* Progress Ring */}
        <View style={styles.progressContainer}>
          <Svg width={size} height={size} style={styles.svg}>
            <Defs>
              <SvgGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#8B5CF6" />
                <Stop offset="100%" stopColor="#3B82F6" />
              </SvgGradient>
            </Defs>

            {/* Background circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#E2E8F0"
              strokeWidth={strokeWidth}
              fill="none"
            />

            {/* Progress circle */}
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="url(#progressGradient)"
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>

          {/* Center content */}
          <View style={styles.centerContent}>
            <Text style={styles.percentText}>{Math.round(progress)}%</Text>
            <Text style={styles.percentLabel}>Complete</Text>
          </View>
        </View>

        {/* Stage indicators */}
        <View style={styles.stagesContainer}>
          {STAGES.map((stage, index) => {
            const isActive = index <= currentStageIndex;
            const isCurrent = index === currentStageIndex;

            return (
              <View key={stage.key} style={styles.stageItem}>
                <View
                  style={[
                    styles.stageDot,
                    isActive && styles.stageDotActive,
                    isCurrent && styles.stageDotCurrent,
                  ]}
                >
                  {isActive && (
                    <Ionicons
                      name={isCurrent ? 'ellipse' : 'checkmark'}
                      size={isCurrent ? 8 : 12}
                      color="#FFFFFF"
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.stageLabel,
                    isActive && styles.stageLabelActive,
                  ]}
                >
                  {stage.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.subtitle}>{message.subtitle}</Text>
          <View style={styles.tipContainer}>
            <Ionicons name="bulb-outline" size={14} color={BRAND.primary} />
            <Text style={styles.tipText}>{message.tip}</Text>
          </View>
        </View>

        {/* Days remaining */}
        {daysRemaining > 0 && (
          <View style={styles.remainingContainer}>
            <Ionicons name="calendar-outline" size={16} color={TEXT.tertiary} />
            <Text style={styles.remainingText}>
              {daysRemaining} more {daysRemaining === 1 ? 'day' : 'days'} to full personalization
            </Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  daysBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  daysText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#8B5CF6',
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentText: {
    fontSize: 28,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  percentLabel: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  stagesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  stageItem: {
    alignItems: 'center',
  },
  stageDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stageDotActive: {
    backgroundColor: '#8B5CF6',
  },
  stageDotCurrent: {
    backgroundColor: '#3B82F6',
    borderWidth: 2,
    borderColor: '#93C5FD',
  },
  stageLabel: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  stageLabelActive: {
    color: TEXT.secondary,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tipText: {
    fontSize: 12,
    color: BRAND.primary,
    marginLeft: 6,
  },
  remainingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  remainingText: {
    fontSize: 13,
    color: TEXT.tertiary,
    marginLeft: 6,
  },
});
