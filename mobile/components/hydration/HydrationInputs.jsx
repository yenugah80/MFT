import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  SEMANTIC,
  TYPOGRAPHY,
  RADIUS,
  SHADOWS,
  SURFACES,
} from '../../constants/premiumTheme';

export function BeverageChip({ bevKey, bev, selected, onSelect, styles }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bgAnim = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(bgAnim, {
      toValue: selected ? 1 : 0,
      tension: 80,
      friction: 10,
      useNativeDriver: false,
    }).start();
  }, [selected, bgAnim]);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.94,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
    ]).start();

    onSelect(bevKey);
  };

  const backgroundColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SURFACES.background.secondary, `${bev.color}15`],
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.beverageChip,
          selected && {
            borderColor: bev.color,
            ...SHADOWS.sm,
          },
        ]}
        onPress={handlePress}
        activeOpacity={1}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor, borderRadius: RADIUS.full },
          ]}
        />

        <View style={styles.beverageChipContent}>
          <Text style={styles.beverageEmoji}>{bev.emoji}</Text>
          <Text
            style={[
              styles.beverageChipLabel,
              selected && {
                color: bev.color,
                fontWeight: TYPOGRAPHY.weight.bold,
                fontFamily: TYPOGRAPHY.family.bold,
              },
            ]}
          >
            {bev.label}
          </Text>
          {bev.hydrationFactor !== 1 && (
            <View style={styles.multiplierBadge}>
              <Text style={styles.beverageMultiplier}>
                {Math.round(bev.hydrationFactor * 100)}%
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function PremiumQuickAddButton({
  size,
  onPress,
  isLoading = false,
  accessible,
  accessibilityRole,
  accessibilityLabel,
  accessibilityHint,
  styles,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        tension: 300,
        friction: 20,
        useNativeDriver: false,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 20,
        useNativeDriver: false,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.2],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      style={styles.quickAddTile}
      accessible={accessible}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      <Animated.View
        style={[
          styles.quickAddTileWrapper,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: SEMANTIC.info.base,
              opacity: glowOpacity,
              borderRadius: RADIUS.lg,
            },
          ]}
        />

        <LinearGradient
          colors={SURFACES.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.quickAddTileGradient}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name={size.icon} size={22} color="#FFF" />
              <Text style={styles.quickAddTileLabel}>{size.label}</Text>
            </>
          )}
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}
