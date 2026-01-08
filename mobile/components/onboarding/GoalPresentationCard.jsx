/**
 * GoalPresentationCard - Premium Edition
 * Presents a calculated nutrition goal in a sophisticated, non-intimidating way
 * Shows context, prominent number, reassuring copy, and refined edit interaction
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const GoalPresentationCard = ({
  label,
  value,
  unit,
  context,
  iconName, // Ionicon name instead of emoji
  onEdit,
  showEditLink = true,
  gradientStart = '#6B4EFF',
  gradientEnd = '#8B6EFF',
  iconColor = '#FFFFFF',
}) => {
  const animScale = React.useRef(new Animated.Value(1)).current;
  const animOpacity = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.spring(animScale, {
        toValue: 0.98,
        useNativeDriver: true,
        speed: 15,
        bounciness: 8,
      }),
      Animated.timing(animOpacity, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(animScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 15,
        bounciness: 8,
      }),
      Animated.timing(animOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: animScale }],
          opacity: animOpacity,
        },
      ]}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pressable}
        disabled={!onEdit}
      >
        <LinearGradient
          colors={[gradientStart, gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Header section with label and icon */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.label}>{label}</Text>
              {context && <Text style={styles.context}>{context}</Text>}
            </View>
            {iconName && (
              <View style={styles.iconWrapper}>
                <Ionicons name={iconName} size={24} color={iconColor} />
              </View>
            )}
          </View>

          {/* Main value section */}
          <View style={styles.valueSection}>
            <View style={styles.valueContainer}>
              <Text style={styles.value}>
                {value}
              </Text>
              {unit && <Text style={styles.unit}>{unit}</Text>}
            </View>
          </View>

          {/* Reassuring note */}
          <View style={styles.noteSection}>
            <Text style={styles.note}>(You can adjust this anytime)</Text>
          </View>

          {/* Edit link at bottom */}
          {showEditLink && onEdit && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onEdit?.();
              }}
              style={({ pressed }) => [
                styles.editButton,
                pressed && styles.editButtonPressed,
              ]}
              hitSlop={12}
            >
              <Ionicons name="pencil" size={12} color="#FFFFFF" />
              <Text style={styles.editText}>Adjust</Text>
            </Pressable>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  pressable: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  card: {
    padding: 24,
    borderRadius: 20,
    minHeight: 200,
    justifyContent: 'space-between',
    // Premium shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    // Shadow for Android
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  headerContent: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.92)',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  context: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.78)',
    lineHeight: 17,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  valueContainer: {
    alignItems: 'baseline',
    gap: 6,
  },
  value: {
    fontSize: 56,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 64,
    letterSpacing: -1.5,
  },
  unit: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.88)',
    letterSpacing: 0.5,
  },
  noteSection: {
    alignItems: 'center',
    marginVertical: 10,
  },
  note: {
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.72)',
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },
  editButton: {
    flexDirection: 'row',
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    marginTop: 10,
    gap: 6,
    alignItems: 'center',
  },
  editButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  editText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

export default GoalPresentationCard;
