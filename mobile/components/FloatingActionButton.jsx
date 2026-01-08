/**
 * FloatingActionButton (FAB) - Quick Actions Menu
 *
 * Provides instant access to common logging actions:
 * - Water logging
 * - Mood logging
 * - Food logging
 *
 * Features:
 * - Material Design FAB pattern
 * - Animated menu expansion
 * - Haptic feedback
 * - Modal integration for water and mood
 * - Navigation to Log screen for food
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import WaterLogger from './WaterLogger';
import MoodLogger from './MoodLogger';

import {
  BRAND,
  TEXT,
  SPACING,
  RADIUS,
  SHADOWS,
  TYPOGRAPHY,
} from '../constants/premiumTheme';

const FAB_SIZE = 64;
const MENU_ITEM_SIZE = 56;

/**
 * Quick Action Menu Item
 */
const QuickActionItem = ({ icon, label, color, onPress, index, isOpen }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: -(index + 1) * (MENU_ITEM_SIZE + 12),
          tension: 80,
          friction: 8,
          useNativeDriver: true,
          delay: index * 50,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          delay: index * 50,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 80,
          friction: 8,
          delay: index * 50,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, index]);

  return (
    <Animated.View
      style={[
        styles.menuItem,
        {
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.menuButton, { backgroundColor: color }]}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityLabel={`Log ${label}`}
        accessibilityRole="button"
      >
        <Ionicons name={icon} size={24} color="#FFF" />
      </TouchableOpacity>
      <View style={styles.labelContainer}>
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
    </Animated.View>
  );
};

/**
 * Main FAB Component
 */
export default function FloatingActionButton({
  currentWater = 0,
  waterGoal = 2.0,
  onWaterLogged,
  onMoodLogged,
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [waterModalVisible, setWaterModalVisible] = useState(false);
  const [moodModalVisible, setMoodModalVisible] = useState(false);

  // Animations
  const rotation = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const quickActions = [
    {
      icon: 'water',
      label: 'Water',
      color: '#3B82F6',
      onPress: async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setMenuOpen(false);
        setWaterModalVisible(true);
      },
    },
    {
      icon: 'happy',
      label: 'Mood',
      color: '#F59E0B',
      onPress: async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setMenuOpen(false);
        setMoodModalVisible(true);
      },
    },
    {
      icon: 'restaurant',
      label: 'Meal',
      color: '#10B981',
      onPress: async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setMenuOpen(false);
        router.push('/(tabs)/log');
      },
    },
  ];

  const handleFABPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newMenuState = !menuOpen;
    setMenuOpen(newMenuState);

    // Rotate icon
    Animated.spring(rotation, {
      toValue: newMenuState ? 1 : 0,
      tension: 80,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Pulse effect
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 80,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const handleWaterSaved = () => {
    setWaterModalVisible(false);
    if (onWaterLogged) {
      onWaterLogged();
    }
  };

  const handleMoodSaved = () => {
    setMoodModalVisible(false);
    if (onMoodLogged) {
      onMoodLogged();
    }
  };

  return (
    <>
      {/* Backdrop */}
      {menuOpen && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
        />
      )}

      {/* Menu Items */}
      <View style={styles.menuContainer} pointerEvents="box-none">
        {quickActions.map((action, index) => (
          <QuickActionItem
            key={action.label}
            icon={action.icon}
            label={action.label}
            color={action.color}
            onPress={action.onPress}
            index={index}
            isOpen={menuOpen}
          />
        ))}
      </View>

      {/* Main FAB Button */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            transform: [{ scale }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={handleFABPress}
          activeOpacity={0.9}
          accessibilityLabel={menuOpen ? 'Close quick actions' : 'Open quick actions'}
          accessibilityRole="button"
          accessibilityHint="Opens menu to quickly log water, mood, or food"
        >
          <LinearGradient
            colors={['#6B4EFF', '#8B6EFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Animated.View
              style={{
                transform: [{ rotate: rotateInterpolate }],
              }}
            >
              <Ionicons
                name={menuOpen ? 'close' : 'add'}
                size={32}
                color="#FFF"
              />
            </Animated.View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Shadow effect */}
        <View style={styles.fabShadow} />
      </Animated.View>

      {/* Modals */}
      <WaterLogger
        visible={waterModalVisible}
        onClose={() => setWaterModalVisible(false)}
        onSave={handleWaterSaved}
        currentIntake={currentWater}
        dailyGoal={waterGoal}
      />

      <MoodLogger
        visible={moodModalVisible}
        onClose={() => setMoodModalVisible(false)}
        onSave={handleMoodSaved}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Backdrop
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 998,
  },

  // Menu Container
  menuContainer: {
    position: 'absolute',
    bottom: SPACING[6] + FAB_SIZE,
    right: SPACING[6],
    alignItems: 'flex-end',
    zIndex: 999,
  },

  // Menu Item
  menuItem: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },

  menuButton: {
    backgroundColor: '#FFFFFF',
    width: MENU_ITEM_SIZE,
    height: MENU_ITEM_SIZE,
    borderRadius: MENU_ITEM_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },

  labelContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.md,
  },

  menuLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.white,
  },

  // FAB Container
  fabContainer: {
    position: 'absolute',
    bottom: SPACING[6],
    right: SPACING[6],
    zIndex: 1000,
  },

  fab: {
    backgroundColor: '#FFFFFF',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    overflow: 'hidden',
    ...SHADOWS.xl,
  },

  fabGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  fabShadow: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: BRAND.primary,
    opacity: 0.3,
    bottom: -8,
    right: 0,
    zIndex: -1,
  },
});
