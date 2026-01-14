/**
 * ReminderNotification Component
 *
 * Friendly reminder card inspired by Zomato/Swiggy style.
 * Personalized messages based on user data and patterns.
 * Supports dismiss, snooze, and quick-action interactions.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, SURFACES, BRAND, SEMANTIC } from '../../constants/premiumTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Reminder type configurations
const REMINDER_CONFIG = {
  hydration_morning: {
    icon: 'water',
    gradient: ['#3B82F6', '#60A5FA'],
    accentColor: '#3B82F6',
  },
  hydration_midday: {
    icon: 'water',
    gradient: ['#0EA5E9', '#38BDF8'],
    accentColor: '#0EA5E9',
  },
  hydration_afternoon: {
    icon: 'water',
    gradient: ['#06B6D4', '#22D3EE'],
    accentColor: '#06B6D4',
  },
  food_breakfast: {
    icon: 'sunny',
    gradient: ['#F59E0B', '#FBBF24'],
    accentColor: '#F59E0B',
  },
  food_lunch: {
    icon: 'restaurant',
    gradient: ['#10B981', '#34D399'],
    accentColor: '#10B981',
  },
  food_dinner: {
    icon: 'moon',
    gradient: ['#8B5CF6', '#A78BFA'],
    accentColor: '#8B5CF6',
  },
  mood_checkin_morning: {
    icon: 'happy',
    gradient: ['#EC4899', '#F472B6'],
    accentColor: '#EC4899',
  },
  mood_checkin_evening: {
    icon: 'bed',
    gradient: ['#6366F1', '#818CF8'],
    accentColor: '#6366F1',
  },
  activity_reminder: {
    icon: 'fitness',
    gradient: ['#EF4444', '#F87171'],
    accentColor: '#EF4444',
  },
  streak_at_risk: {
    icon: 'flame',
    gradient: ['#F97316', '#FB923C'],
    accentColor: '#F97316',
  },
  streak_celebration: {
    icon: 'trophy',
    gradient: ['#EAB308', '#FDE047'],
    accentColor: '#EAB308',
  },
  weekly_review: {
    icon: 'bar-chart',
    gradient: ['#14B8A6', '#2DD4BF'],
    accentColor: '#14B8A6',
  },
  default: {
    icon: 'notifications',
    gradient: [BRAND.primary, BRAND.secondary],
    accentColor: BRAND.primary,
  },
};

// Snooze duration options (in minutes)
const SNOOZE_OPTIONS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
];

const ReminderNotification = ({
  reminder,
  onDismiss,
  onSnooze,
  onAction,
  showSnoozeOptions = false,
  style,
}) => {
  const [showSnooze, setShowSnooze] = useState(false);
  const config = REMINDER_CONFIG[reminder?.type] || REMINDER_CONFIG.default;

  if (!reminder) return null;

  const handleSnooze = (duration) => {
    setShowSnooze(false);
    onSnooze?.(reminder.type, duration);
  };

  const handleDismiss = () => {
    onDismiss?.(reminder.type, 'dismissed');
  };

  const handleAction = () => {
    onAction?.(reminder.actionRoute || 'log', reminder.type);
  };

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={config.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Dismiss Button */}
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name={config.icon} size={28} color="#fff" />
          </View>

          <View style={styles.textContent}>
            <Text style={styles.title}>{reminder.title}</Text>
            <Text style={styles.message}>{reminder.message}</Text>
          </View>
        </View>

        {/* Quick Stats (if available) */}
        {reminder.stats && (
          <View style={styles.statsRow}>
            {reminder.stats.map((stat, index) => (
              <View key={index} style={styles.statItem}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {showSnoozeOptions && !showSnooze && (
            <TouchableOpacity
              style={styles.snoozeToggle}
              onPress={() => setShowSnooze(true)}
            >
              <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.snoozeToggleText}>Snooze</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAction}
          >
            <Text style={styles.actionText}>{reminder.actionLabel || 'Log Now'}</Text>
            <Ionicons name="arrow-forward" size={16} color={config.accentColor} />
          </TouchableOpacity>
        </View>

        {/* Snooze Options Popup */}
        {showSnooze && (
          <View style={styles.snoozeOptions}>
            <Text style={styles.snoozeTitle}>Remind me in:</Text>
            <View style={styles.snoozeButtons}>
              {SNOOZE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.snoozeButton}
                  onPress={() => handleSnooze(option.value)}
                >
                  <Text style={styles.snoozeButtonText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.snoozeCancel}
              onPress={() => setShowSnooze(false)}
            >
              <Text style={styles.snoozeCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

/**
 * ReminderList Component
 * Displays a list of reminders in a stack
 */
export const ReminderList = ({
  reminders = [],
  onDismiss,
  onSnooze,
  onAction,
  maxVisible = 3,
}) => {
  if (!reminders || reminders.length === 0) return null;

  const visibleReminders = reminders.slice(0, maxVisible);
  const hiddenCount = reminders.length - maxVisible;

  return (
    <View style={styles.listContainer}>
      {visibleReminders.map((reminder, index) => (
        <ReminderNotification
          key={reminder.id || index}
          reminder={reminder}
          onDismiss={onDismiss}
          onSnooze={onSnooze}
          onAction={onAction}
          showSnoozeOptions={index === 0}
          style={index > 0 && { marginTop: -8, opacity: 1 - (index * 0.15) }}
        />
      ))}
      {hiddenCount > 0 && (
        <View style={styles.hiddenIndicator}>
          <Text style={styles.hiddenText}>+{hiddenCount} more reminders</Text>
        </View>
      )}
    </View>
  );
};

/**
 * CompactReminder Component
 * Smaller inline reminder for dashboard
 */
export const CompactReminder = ({
  reminder,
  onPress,
  onDismiss,
}) => {
  const config = REMINDER_CONFIG[reminder?.type] || REMINDER_CONFIG.default;

  if (!reminder) return null;

  return (
    <TouchableOpacity
      style={styles.compactContainer}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.compactIcon, { backgroundColor: config.accentColor + '20' }]}>
        <Ionicons name={config.icon} size={18} color={config.accentColor} />
      </View>
      <View style={styles.compactContent}>
        <Text style={styles.compactTitle} numberOfLines={1}>{reminder.title}</Text>
        <Text style={styles.compactMessage} numberOfLines={1}>{reminder.message}</Text>
      </View>
      <TouchableOpacity
        onPress={() => onDismiss?.(reminder.type)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close-circle" size={20} color={TEXT.tertiary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  gradient: {
    padding: 20,
  },
  dismissButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
    paddingRight: 24,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  snoozeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  snoozeToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT.primary,
  },
  snoozeOptions: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
  },
  snoozeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  snoozeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  snoozeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  snoozeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  snoozeCancel: {
    alignItems: 'center',
    marginTop: 10,
  },
  snoozeCancelText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  // List styles
  listContainer: {
    gap: 0,
  },
  hiddenIndicator: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  hiddenText: {
    fontSize: 12,
    color: TEXT.tertiary,
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.card.primary,
    padding: 12,
    borderRadius: 12,
    gap: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  compactIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
  },
  compactMessage: {
    fontSize: 12,
    color: TEXT.secondary,
    marginTop: 2,
  },
});

export default ReminderNotification;
