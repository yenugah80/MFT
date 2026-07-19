import React, { useRef, useEffect } from 'react';
import { View, Pressable, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AUTH_COLORS } from '../auth/constants';

const GoalCard = ({
  id, iconName, label, description,
  gradientStart: accentColor,
  isSelected = false, onPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const selectAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(selectAnim, {
      toValue: isSelected ? 1 : 0,
      useNativeDriver: false,
      stiffness: 260,
      damping: 22,
    }).start();
  }, [isSelected]);

  const borderColor = selectAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(15, 36, 31, 0.08)', accentColor],
  });
  const backgroundColor = selectAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 0.82)', `${accentColor}14`],
  });
  const iconBg = selectAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [`${accentColor}20`, `${accentColor}38`],
  });

  return (
    // Scale (native-driven) and border/shadow color (JS-driven) can't live on the
    // same Animated node — RN errors once one is flattened to native. Split them.
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Animated.View
        style={[
          styles.wrapper,
          {
            borderColor,
            backgroundColor,
            shadowColor: isSelected ? accentColor : 'rgba(7, 19, 30, 0.16)',
            shadowOpacity: isSelected ? 0.28 : 0.08,
            shadowRadius: isSelected ? 18 : 12,
          },
        ]}
      >
        <Pressable
          onPress={() => onPress?.(id)}
          onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, stiffness: 400, damping: 20 }).start()}
          onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, stiffness: 300, damping: 20 }).start()}
          style={styles.pressable}
          accessibilityRole="radio"
          accessibilityLabel={label}
          accessibilityState={{ selected: isSelected }}
        >
          <Animated.View style={[styles.iconBubble, { backgroundColor: iconBg }]}>
            <Ionicons name={iconName} size={22} color={accentColor} />
          </Animated.View>

          <View style={styles.textBlock}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.description}>{description}</Text>
          </View>

          <View style={[styles.badge, isSelected && { backgroundColor: accentColor, borderColor: accentColor }]}>
            {isSelected && <Ionicons name="checkmark" size={13} color={AUTH_COLORS.white} />}
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: 'rgba(7, 19, 30, 0.16)',
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 76,
  },
  iconBubble: {
    width: 46, height: 46, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 13, flexShrink: 0,
  },
  textBlock: { flex: 1, marginRight: 8 },
  label: {
    fontSize: 15, fontFamily: 'DMSans_700Bold',
    color: AUTH_COLORS.ink, marginBottom: 2, letterSpacing: 0.1,
  },
  description: {
    fontSize: 12.5, fontFamily: 'DMSans_500Medium',
    color: AUTH_COLORS.muted, lineHeight: 17,
  },
  badge: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(15, 36, 31, 0.16)',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
});

export default GoalCard;
