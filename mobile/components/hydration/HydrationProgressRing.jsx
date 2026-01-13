import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Warm gold/amber - premium, celebratory, matches warm app aesthetic
const WATER_COLORS = {
  track: '#FFFBEB',           // Light amber background
  trackBorder: '#FCD34D',     // Soft gold border
  gradientStart: '#FBBF24',   // Light vibrant gold (top)
  gradientMid: '#F59E0B',     // Medium amber (middle)
  gradientEnd: '#D97706',     // Deep gold (bottom)
  milestone: '#FCD34D',       // Light gold milestone
  milestoneReached: '#10B981', // Vibrant emerald for reached
  glow: 'rgba(245, 158, 11, 0.35)', // Gold glow
};

export default function HydrationProgressRing({
  percentage,
  size = 200,
  strokeWidth = 14,
  reduceMotion = false,
  milestones = [],
  styles,
}) {
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const animConfig = reduceMotion
      ? { duration: 250, useNativeDriver: false }
      : { tension: 60, friction: 10, useNativeDriver: false };

    Animated[reduceMotion ? 'timing' : 'spring'](animatedProgress, {
      toValue: percentage,
      ...animConfig,
    }).start();

    // Subtle pulsing glow animation when progress > 0
    if (percentage > 0 && !reduceMotion) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Gentle pulse effect when near goal (80%+)
      if (percentage >= 80) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.03,
              duration: 1500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    }
  }, [percentage, reduceMotion, animatedProgress, glowAnim, pulseAnim]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.5],
  });

  // Dynamic gradient colors based on progress - warm gold theme
  const getGradientColors = () => {
    if (percentage >= 100) {
      return { start: '#10B981', mid: '#059669', end: '#047857' }; // Emerald gradient when complete
    }
    if (percentage >= 75) {
      return { start: '#F59E0B', mid: '#D97706', end: '#B45309' }; // Deep vibrant gold
    }
    if (percentage >= 50) {
      return { start: '#FBBF24', mid: '#F59E0B', end: '#D97706' }; // Medium gold
    }
    return { start: '#FCD34D', mid: '#FBBF24', end: '#F59E0B' }; // Soft to medium gold
  };

  const gradientColors = getGradientColors();

  return (
    <View
      style={[
        styles.ringContainer,
        { width: size, height: size },
      ]}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={`Hydration progress: ${Math.round(percentage)} percent of daily goal`}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(percentage) }}
    >
      {/* Animated glow effect behind the ring */}
      {percentage > 0 && (
        <Animated.View
          style={{
            position: 'absolute',
            width: size + 16,
            height: size + 16,
            borderRadius: (size + 16) / 2,
            backgroundColor: percentage >= 100 ? 'rgba(16, 185, 129, 0.4)' : WATER_COLORS.glow,
            opacity: glowOpacity,
            transform: [{ scale: pulseAnim }],
            top: -8,
            left: -8,
          }}
        />
      )}

      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Svg width={size} height={size}>
          <Defs>
            <SvgGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={gradientColors.start} stopOpacity="1" />
              <Stop offset="50%" stopColor={gradientColors.mid} stopOpacity="1" />
              <Stop offset="100%" stopColor={gradientColors.end} stopOpacity="1" />
            </SvgGradient>
          </Defs>

          {/* Background track - soft amber */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={WATER_COLORS.track}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Subtle border on track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={WATER_COLORS.trackBorder}
            strokeWidth={1}
            fill="none"
            opacity={0.5}
          />

          {/* Progress ring - vibrant gradient */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#ringGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />

          {/* Milestone dots */}
          {milestones.map((milestone) => {
            const angle = (milestone / 100) * 360 - 90;
            const x = size / 2 + radius * Math.cos((angle * Math.PI) / 180);
            const y = size / 2 + radius * Math.sin((angle * Math.PI) / 180);
            const reached = percentage >= milestone;

            return (
              <Circle
                key={milestone}
                cx={x}
                cy={y}
                r={reached ? 6 : 4}
                fill={reached ? WATER_COLORS.milestoneReached : WATER_COLORS.milestone}
              />
            );
          })}
        </Svg>
      </Animated.View>
    </View>
  );
}
