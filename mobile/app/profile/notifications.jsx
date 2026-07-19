/**
 * Notifications Settings Screen
 * Beautiful premium UI for managing notification preferences
 *
 * Features:
 * - Permission status banner with action button
 * - Animated toggle switches
 * - Visual notification type cards
 * - Haptic feedback on interactions
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Animated,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useNotification } from '../../providers/NotificationProvider';
import apiClient from '../../services/apiClient';
import {
  BRAND,
  SURFACES,
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../../constants/premiumTheme';
import {
  requestNotificationPermissions,
  getNotificationPermissionStatus,
} from '../../services/pushNotifications';

// Notification type configurations
const NOTIFICATION_TYPES = [
  {
    key: 'dailyReminder',
    icon: 'calendar-outline',
    iconActive: 'calendar',
    title: 'Daily check-in',
    subtitle: 'A gentle prompt to log meals',
    color: BRAND.primary,
    gradient: ['#6B4EFF', '#8B5CF6'],
  },
  {
    key: 'hydrationNudges',
    icon: 'water-outline',
    iconActive: 'water',
    title: 'Hydration nudges',
    subtitle: 'Smart reminders when intake is low',
    color: '#3B82F6',
    gradient: ['#3B82F6', '#60A5FA'],
  },
  {
    key: 'activityReminders',
    icon: 'walk-outline',
    iconActive: 'walk',
    title: 'Activity reminders',
    subtitle: 'Movement nudges throughout the day',
    color: '#10B981',
    gradient: ['#10B981', '#34D399'],
  },
  {
    key: 'moodCheckins',
    icon: 'happy-outline',
    iconActive: 'happy',
    title: 'Mood check-ins',
    subtitle: 'Evening reflection prompts',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#A78BFA'],
  },
  {
    key: 'streakProtection',
    icon: 'shield-outline',
    iconActive: 'shield',
    title: 'Streak protection',
    subtitle: 'Alert when your streak is at risk',
    color: '#EF4444',
    gradient: ['#EF4444', '#F87171'],
  },
  {
    key: 'insightDrops',
    icon: 'bulb-outline',
    iconActive: 'bulb',
    title: 'Insight drops',
    subtitle: 'Highlights from your patterns',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#FBBF24'],
  },
  {
    key: 'streakCelebrations',
    icon: 'flame-outline',
    iconActive: 'flame',
    title: 'Streak celebrations',
    subtitle: 'Celebrate consistency milestones',
    color: '#EC4899',
    gradient: ['#EC4899', '#F472B6'],
  },
];

// Animated Notification Card Component
const NotificationCard = ({
  config,
  isEnabled,
  onToggle,
  index,
  disabled,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const toggleAnim = useRef(new Animated.Value(isEnabled ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 80,
      tension: 300,
      friction: 20,
      useNativeDriver: true,
    }).start();
  }, [index, scaleAnim]);

  useEffect(() => {
    Animated.spring(toggleAnim, {
      toValue: isEnabled ? 1 : 0,
      tension: 300,
      friction: 20,
      useNativeDriver: false,
    }).start();
  }, [isEnabled, toggleAnim]);

  const handleToggle = useCallback((value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(config.key, value);
  }, [config.key, onToggle]);

  const iconBackgroundColor = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#F3F4F6', config.color],
  });

  return (
    <Animated.View
      style={[
        styles.notificationCard,
        {
          transform: [{ scale: scaleAnim }],
          opacity: scaleAnim,
        },
      ]}
    >
      <View style={styles.cardContent}>
        <Animated.View
          style={[
            styles.iconContainer,
            { backgroundColor: iconBackgroundColor },
          ]}
        >
          <Ionicons
            name={isEnabled ? config.iconActive : config.icon}
            size={24}
            color={isEnabled ? '#FFFFFF' : TEXT.secondary}
          />
        </Animated.View>

        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>{config.title}</Text>
          <Text style={styles.cardSubtitle}>{config.subtitle}</Text>
        </View>

        <Switch
          value={isEnabled}
          onValueChange={handleToggle}
          disabled={disabled}
          trackColor={{ false: '#E5E7EB', true: `${config.color}40` }}
          thumbColor={isEnabled ? config.color : '#FFFFFF'}
          ios_backgroundColor="#E5E7EB"
        />
      </View>
    </Animated.View>
  );
};

// Permission Banner Component
const PermissionBanner = ({ status, onRequestPermission, isLoading }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  if (status === 'granted') {
    return (
      <Animated.View style={[styles.permissionBanner, styles.permissionGranted, { opacity: fadeAnim }]}>
        <View style={styles.permissionContent}>
          <View style={[styles.permissionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          </View>
          <View style={styles.permissionText}>
            <Text style={[styles.permissionTitle, { color: '#065F46' }]}>
              Notifications enabled
            </Text>
            <Text style={[styles.permissionSubtitle, { color: '#047857' }]}>
              You&apos;ll receive timely reminders and updates
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  if (status === 'denied') {
    return (
      <Animated.View style={[styles.permissionBanner, styles.permissionDenied, { opacity: fadeAnim }]}>
        <View style={styles.permissionContent}>
          <View style={[styles.permissionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
            <Ionicons name="notifications-off" size={24} color="#EF4444" />
          </View>
          <View style={styles.permissionText}>
            <Text style={[styles.permissionTitle, { color: '#7F1D1D' }]}>
              Notifications blocked
            </Text>
            <Text style={[styles.permissionSubtitle, { color: '#991B1B' }]}>
              Enable in Settings to receive reminders
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Linking.openSettings();
          }}
        >
          <Text style={styles.permissionButtonText}>Open Settings</Text>
          <Ionicons name="open-outline" size={16} color={BRAND.primary} />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Undetermined or first time
  return (
    <Animated.View style={[styles.permissionBanner, styles.permissionPrompt, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={SURFACES.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.permissionGradient}
      >
        <View style={styles.permissionContent}>
          <View style={[styles.permissionIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
            <Ionicons name="notifications" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.permissionText}>
            <Text style={[styles.permissionTitle, { color: '#FFFFFF' }]}>
              Enable notifications
            </Text>
            <Text style={[styles.permissionSubtitle, { color: 'rgba(255, 255, 255, 0.85)' }]}>
              Stay on track with helpful reminders
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.permissionButton, styles.permissionButtonWhite]}
          onPress={onRequestPermission}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={BRAND.primary} />
          ) : (
            <>
              <Text style={[styles.permissionButtonText, { color: BRAND.primary }]}>
                Enable Now
              </Text>
              <Ionicons name="arrow-forward" size={16} color={BRAND.primary} />
            </>
          )}
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
};

// Default notification settings fallback
const DEFAULT_NOTIFICATION_SETTINGS = {
  dailyReminder: true,
  hydrationNudges: true,
  activityReminders: true,
  moodCheckins: true,
  streakProtection: true,
  insightDrops: true,
  streakCelebrations: true,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const notify = useNotification();

  // Initialize settings from NotificationProvider context with fallback
  const [settings, setSettings] = useState(() => notify?.push?.preferences ?? DEFAULT_NOTIFICATION_SETTINGS);
  const [permissionStatus, setPermissionStatus] = useState('undetermined');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Load permission status on mount (no duplicate API fetch for preferences)
  useEffect(() => {
    let isMounted = true;

    const loadPermissionStatus = async () => {
      try {
        const status = await getNotificationPermissionStatus();
        if (!isMounted) return;
        setPermissionStatus(status);
      } catch (error) {
        console.error('[NotificationsScreen] Failed to load permission status:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadPermissionStatus();
    return () => { isMounted = false; };
  }, []);

  // Handle permission request
  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const granted = await requestNotificationPermissions();
      setPermissionStatus(granted ? 'granted' : 'denied');

      if (granted) {
        notify.success('Notifications enabled!');
        // Re-initialize push notifications
        await notify.push.initialize();
      }
    } catch (error) {
      console.error('[NotificationsScreen] Permission request error:', error);
      notify.error('Failed to enable notifications');
    } finally {
      setIsRequestingPermission(false);
    }
  };

  // Handle toggle
  const handleToggle = useCallback(async (key, value) => {
    const oldSettings = { ...settings };
    const newSettings = { ...settings, [key]: value };

    // Optimistic update
    setSettings(newSettings);
    setIsSaving(true);

    try {
      await apiClient.post('/profile/notifications', { notifications: newSettings });

      // Sync notification schedules (if available)
      if (notify?.push?.syncSchedules) {
        await notify.push.syncSchedules();
      }

      console.log('[NotificationsScreen] Settings saved:', newSettings);
    } catch (error) {
      console.error('[NotificationsScreen] Failed to save:', error);
      // Rollback on error
      setSettings(oldSettings);
      notify?.error?.('Failed to save setting');
    } finally {
      setIsSaving(false);
    }
  }, [settings, notify]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <LinearGradient
        colors={SURFACES.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/profile');
            }
          }}
          accessibilityLabel="Back to Profile"
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Customize your reminders</Text>
        </View>

        {/* Decorative bell icon */}
        <View style={styles.headerIconContainer}>
          <Ionicons name="notifications" size={80} color="rgba(255,255,255,0.1)" />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Permission Banner */}
        <PermissionBanner
          status={permissionStatus}
          onRequestPermission={handleRequestPermission}
          isLoading={isRequestingPermission}
        />

        {/* Notification Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reminder Types</Text>
          <Text style={styles.sectionSubtitle}>
            Choose which notifications you&apos;d like to receive
          </Text>

          <View style={styles.cardsContainer}>
            {NOTIFICATION_TYPES.map((config, index) => (
              <NotificationCard
                key={config.key}
                config={config}
                isEnabled={settings[config.key]}
                onToggle={handleToggle}
                index={index}
                disabled={isSaving || permissionStatus === 'denied'}
              />
            ))}
          </View>
        </View>

        {/* Info Footer */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={20} color={TEXT.tertiary} />
          <Text style={styles.infoText}>
            Notifications help you build healthy habits. You can change these settings anytime.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[3],
  },
  loadingText: {
    fontSize: TYPOGRAPHY.size.base,
    color: TEXT.secondary,
  },
  header: {
    paddingHorizontal: SPACING[5],
    paddingTop: SPACING[4],
    paddingBottom: SPACING[6],
    borderBottomLeftRadius: RADIUS['2xl'],
    borderBottomRightRadius: RADIUS['2xl'],
    position: 'relative',
    overflow: 'hidden',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[3],
  },
  headerText: {
    gap: 6,
  },
  title: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.base,
    color: 'rgba(255,255,255,0.85)',
  },
  headerIconContainer: {
    position: 'absolute',
    right: -10,
    top: 20,
    transform: [{ rotate: '15deg' }],
  },
  content: {
    padding: SPACING[5],
    paddingBottom: SPACING[8],
    gap: SPACING[5],
  },
  permissionBanner: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  permissionGranted: {
    backgroundColor: '#ECFDF5',
    padding: SPACING[4],
  },
  permissionDenied: {
    backgroundColor: '#FEF2F2',
    padding: SPACING[4],
  },
  permissionPrompt: {
    // Gradient will fill
  },
  permissionGradient: {
    padding: SPACING[4],
  },
  permissionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  permissionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionText: {
    flex: 1,
    gap: 4,
  },
  permissionTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  permissionSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    marginTop: SPACING[3],
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignSelf: 'flex-start',
  },
  permissionButtonWhite: {
    backgroundColor: '#FFFFFF',
    ...SHADOWS.sm,
  },
  permissionButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },
  section: {
    gap: SPACING[3],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginBottom: SPACING[2],
  },
  cardsContainer: {
    gap: SPACING[3],
  },
  notificationCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    ...SHADOWS.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextContainer: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  cardSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
    paddingTop: SPACING[2],
    paddingHorizontal: SPACING[2],
  },
  infoText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    lineHeight: 20,
  },
});
