import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

function ConfettiParticle({ delay = 0, styles }) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const randomX = (Math.random() - 0.5) * 100;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 300,
        duration: 2000,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: randomX,
        duration: 2000,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 2000,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: Math.random() * 360,
        duration: 2000,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, rotate, translateX, translateY]);

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  return (
    <Animated.View
      style={[
        styles.confettiParticle,
        {
          backgroundColor: color,
          transform: [
            { translateY },
            { translateX },
            { rotate: rotate.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) },
          ],
          opacity,
        },
      ]}
    />
  );
}

export default function Confetti({ visible, styles }) {
  if (!visible) return null;

  return (
    <View style={styles.confettiContainer} pointerEvents="none">
      {Array.from({ length: 30 }).map((_, i) => (
        <ConfettiParticle key={i} delay={i * 50} styles={styles} />
      ))}
    </View>
  );
}
