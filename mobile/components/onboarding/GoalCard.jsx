import React, { useRef, useEffect } from 'react';
import { View, Pressable, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY } from '../../constants/premiumTheme';

const GoalCard = ({
  id, iconName, label, description,
  gradientStart, gradientEnd,
  isSelected = false, onPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(glowOpacity, { toValue: isSelected ? 1 : 0, useNativeDriver: true, stiffness: 200, damping: 20 }),
      Animated.spring(checkScale, { toValue: isSelected ? 1 : 0.5, useNativeDriver: true, stiffness: 300, damping: 18 }),
    ]).start();
  }, [isSelected]);

  return (
    <Animated.View style={[
      styles.wrapper,
      {
        shadowOpacity: isSelected ? 0.40 : 0.08,
        shadowRadius: isSelected ? 24 : 8,
        shadowColor: gradientStart,
        shadowOffset: { width: 0, height: isSelected ? 10 : 4 },
        elevation: isSelected ? 18 : 4,
        transform: [{ scale: scaleAnim }],
      }
    ]}>
      <Pressable
        onPress={() => onPress?.(id)}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, stiffness: 400, damping: 20 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, stiffness: 300, damping: 20 }).start()}
        accessibilityRole="radio"
        accessibilityLabel={label}
        accessibilityState={{ selected: isSelected }}
      >
        {/* Base white card — always visible */}
        <View style={styles.cardBase}>
          {/* Gradient overlay — fades in when selected */}
          <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: glowOpacity, borderRadius: 20 }]}>
            <LinearGradient
              colors={[gradientStart, gradientEnd]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>

          {/* Decorative orbs */}
          <Animated.View style={[styles.orb, styles.orbLarge, { opacity: glowOpacity, backgroundColor: 'rgba(255,255,255,0.13)' }]} />
          <Animated.View style={[styles.orb, styles.orbSmall, { opacity: glowOpacity, backgroundColor: 'rgba(255,255,255,0.09)' }]} />

          {/* Icon bubble */}
          <Animated.View style={[
            styles.iconBubble,
            {
              backgroundColor: glowOpacity.interpolate({ inputRange: [0, 1], outputRange: [`${gradientStart}18`, 'rgba(255,255,255,0.25)'] }),
              borderColor: glowOpacity.interpolate({ inputRange: [0, 1], outputRange: [`${gradientStart}35`, 'rgba(255,255,255,0.45)'] }),
            }
          ]}>
            <Animated.View>
              <Ionicons
                name={iconName}
                size={28}
                color={isSelected ? '#FFFFFF' : gradientStart}
              />
            </Animated.View>
          </Animated.View>

          {/* Text */}
          <View style={styles.textBlock}>
            <Animated.Text style={[
              styles.label,
              { color: isSelected ? '#FFFFFF' : '#111827' }
            ]}>
              {label}
            </Animated.Text>
            <Animated.Text style={[
              styles.description,
              { color: isSelected ? 'rgba(255,255,255,0.82)' : '#6B7280' }
            ]}>
              {description}
            </Animated.Text>
          </View>

          {/* Check badge */}
          <Animated.View style={[
            styles.badge,
            {
              backgroundColor: isSelected ? 'rgba(255,255,255,0.95)' : '#F3F4F6',
              transform: [{ scale: checkScale }],
            }
          ]}>
            <Ionicons
              name={isSelected ? 'checkmark-sharp' : 'chevron-forward'}
              size={15}
              color={isSelected ? gradientStart : '#9CA3AF'}
            />
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: { borderRadius: 20 },
  cardBase: {
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 20,
    overflow: 'hidden',
    minHeight: 90,
    backgroundColor: '#FFFFFF',
  },
  orb: { position: 'absolute', borderRadius: 999 },
  orbLarge: { width: 180, height: 180, top: -70, right: -50 },
  orbSmall: { width: 110, height: 110, bottom: -45, right: 55 },
  iconBubble: {
    width: 62, height: 62, borderRadius: 18, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16, flexShrink: 0,
  },
  textBlock: { flex: 1, marginRight: 12 },
  label: { fontSize: 17, fontFamily: TYPOGRAPHY.family.bold, marginBottom: 4, letterSpacing: -0.3 },
  description: { fontSize: 13, fontFamily: TYPOGRAPHY.family.regular, lineHeight: 18 },
  badge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
});

export default GoalCard;
