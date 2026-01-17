/**
 * NotificationCenter - Centralized Notification Hub
 *
 * Zomato/Swiggy-style notification center that consolidates:
 * - Smart insights (protein, hydration, calorie nudges)
 * - Streak alerts
 * - Data anomalies
 * - Actionable suggestions
 *
 * Design Philosophy:
 * - Clean dashboard = all nudges move here
 * - Grouped by priority and type
 * - Swipe to dismiss or tap to action
 * - Badge count in header
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SURFACES,
  BRAND,
} from '../../constants/premiumTheme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Priority levels for notifications
const PRIORITY = {
  URGENT: 'urgent',      // Streak at risk, allergen warning
  HIGH: 'high',          // Low intake, anomalies
  NORMAL: 'normal',      // Suggestions, nudges
  INFO: 'info',          // Welcome, tips
};

// Notification type configurations
const NOTIFICATION_CONFIG = {
  streak_risk: {
    icon: 'flame',
    color: '#EF4444',
    priority: PRIORITY.URGENT,
  },
  low_protein: {
    icon: 'fitness',
    color: '#8B5CF6',
    priority: PRIORITY.HIGH,
  },
  low_calories: {
    icon: 'alert-circle',
    color: '#F59E0B',
    priority: PRIORITY.HIGH,
  },
  hydration: {
    icon: 'water',
    color: '#3B82F6',
    priority: PRIORITY.NORMAL,
  },
  meal_reminder: {
    icon: 'restaurant',
    color: '#10B981',
    priority: PRIORITY.NORMAL,
  },
  insight: {
    icon: 'bulb',
    color: '#6366F1',
    priority: PRIORITY.INFO,
  },
  achievement: {
    icon: 'trophy',
    color: '#F59E0B',
    priority: PRIORITY.INFO,
  },
};

/**
 * Single Notification Item
 */
const NotificationItem = ({ notification, onAction, onDismiss, isLast }) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.insight;

  const handleDismiss = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animate out
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.(notification.id);
    });
  };

  const handleAction = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAction?.(notification);
  };

  return (
    <Animated.View
      style={[
        styles.notificationItem,
        !isLast && styles.notificationItemBorder,
        {
          transform: [{ translateX: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${config.color}15` }]}>
        <Ionicons name={config.icon} size={20} color={config.color} />
      </View>

      <TouchableOpacity
        style={styles.contentContainer}
        onPress={handleAction}
        activeOpacity={0.7}
      >
        <Text style={styles.notificationTitle}>{notification.title}</Text>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {notification.message}
        </Text>
        {notification.actionLabel && (
          <View style={styles.actionRow}>
            <Text style={[styles.actionLabel, { color: config.color }]}>
              {notification.actionLabel}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={config.color} />
          </View>
        )}
        {notification.timestamp && (
          <Text style={styles.timestamp}>{notification.timestamp}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.dismissButton}
        onPress={handleDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={16} color={TEXT.tertiary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * Notification Section Header
 */
const SectionHeader = ({ title, count }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {count > 0 && (
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionBadgeText}>{count}</Text>
      </View>
    )}
  </View>
);

/**
 * Empty State
 */
const EmptyNotifications = () => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconContainer}>
      <Ionicons name="notifications-off-outline" size={48} color={TEXT.tertiary} />
    </View>
    <Text style={styles.emptyTitle}>All caught up!</Text>
    <Text style={styles.emptyMessage}>
      No new notifications. Keep tracking to unlock personalized insights.
    </Text>
  </View>
);

/**
 * Main NotificationCenter Component
 */
export default function NotificationCenter({
  visible,
  onClose,
  notifications = [],
  onNotificationAction,
  onNotificationDismiss,
  onClearAll,
}) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose?.();
  };

  // Group notifications by priority
  const urgentNotifications = notifications.filter(n =>
    NOTIFICATION_CONFIG[n.type]?.priority === PRIORITY.URGENT
  );
  const actionableNotifications = notifications.filter(n =>
    [PRIORITY.HIGH, PRIORITY.NORMAL].includes(NOTIFICATION_CONFIG[n.type]?.priority)
  );
  const infoNotifications = notifications.filter(n =>
    NOTIFICATION_CONFIG[n.type]?.priority === PRIORITY.INFO
  );

  const hasNotifications = notifications.length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={handleClose}
        />

        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnim }],
              paddingTop: insets.top,
              paddingBottom: insets.bottom + 20,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Notifications</Text>
              {hasNotifications && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>{notifications.length}</Text>
                </View>
              )}
            </View>
            <View style={styles.headerActions}>
              {hasNotifications && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={onClearAll}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.clearButtonText}>Clear all</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={TEXT.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {!hasNotifications ? (
              <EmptyNotifications />
            ) : (
              <>
                {/* Urgent Notifications */}
                {urgentNotifications.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader title="Urgent" count={urgentNotifications.length} />
                    <View style={styles.notificationList}>
                      {urgentNotifications.map((notification, index) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onAction={onNotificationAction}
                          onDismiss={onNotificationDismiss}
                          isLast={index === urgentNotifications.length - 1}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* Actionable Notifications */}
                {actionableNotifications.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader title="For You" count={actionableNotifications.length} />
                    <View style={styles.notificationList}>
                      {actionableNotifications.map((notification, index) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onAction={onNotificationAction}
                          onDismiss={onNotificationDismiss}
                          isLast={index === actionableNotifications.length - 1}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* Info Notifications */}
                {infoNotifications.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader title="Updates" count={infoNotifications.length} />
                    <View style={styles.notificationList}>
                      {infoNotifications.map((notification, index) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onAction={onNotificationAction}
                          onDismiss={onNotificationDismiss}
                          isLast={index === infoNotifications.length - 1}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    minHeight: SCREEN_HEIGHT * 0.4,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  headerBadge: {
    backgroundColor: BRAND.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  clearButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: BRAND.primary,
  },
  closeButton: {
    padding: 4,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING[4],
  },

  // Section
  section: {
    marginTop: SPACING[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    gap: SPACING[2],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT.secondary,
  },

  // Notification List
  notificationList: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: SPACING[3],
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING[3],
    backgroundColor: '#FFFFFF',
  },
  notificationItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  // Icon
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },

  // Content
  contentContainer: {
    flex: 1,
    marginRight: SPACING[2],
  },
  notificationTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING[2],
    gap: 2,
  },
  actionLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  timestamp: {
    fontSize: 11,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
  },

  // Dismiss
  dismissButton: {
    padding: 4,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[8],
    paddingHorizontal: SPACING[6],
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[4],
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[2],
  },
  emptyMessage: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
