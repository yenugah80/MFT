import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Circle } from 'react-native-svg';
import { BRAND, SEMANTIC } from '../../constants/premiumTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function HydrationProgressRing({
  percentage,
  size = 200,
  strokeWidth = 14,
  reduceMotion = false,
  milestones = [],
  styles,
}) {
  const animatedProgress = useRef(new Animated.Value(0)).current;
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
  }, [percentage, reduceMotion, animatedProgress]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

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
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={SEMANTIC.info.light} stopOpacity="1" />
            <Stop offset="50%" stopColor={SEMANTIC.info.base} stopOpacity="1" />
            <Stop offset="100%" stopColor={SEMANTIC.info.dark} stopOpacity="1" />
          </SvgGradient>
        </Defs>

        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`${BRAND.primary}14`}
          strokeWidth={strokeWidth}
          fill="none"
        />

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
              fill={reached ? SEMANTIC.success.base : `${BRAND.primary}33`}
            />
          );
        })}
      </Svg>
    </View>
  );
}
