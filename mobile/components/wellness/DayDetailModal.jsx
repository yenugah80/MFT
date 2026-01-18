/**
 * DayDetailModal - Day Breakdown Bottom Sheet
 *
 * Shows detailed wellness breakdown for a selected day.
 * Includes:
 * - Total score with tier label
 * - 4-domain breakdown with progress bars
 * - Meals logged list
 * - Water intake summary
 * - Mood entries
 * - Activity logs
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { TEXT, SURFACES, BRAND } from '../../constants/premiumTheme';
import { SPACING, RADIUS } from '../../constants/designTokens';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Domain colors for progress bars
const DOMAIN_COLORS = {
  nutrition: '#10B981',
  mood: '#F59E0B',
  hydration: '#3B82F6',
  activity: '#8B5CF6',
};

// Score tier configurations
const TIER_CONFIG = {
  exceptional: { color: '#10B981', label: 'Exceptional', icon: 'star' },
  great: { color: '#8B5CF6', label: 'Great', icon: 'thumbs-up' },
  good: { color: '#3B82F6', label: 'Good', icon: 'checkmark-circle' },
  fair: { color: '#F59E0B', label: 'Fair', icon: 'alert-circle' },
  needsWork: { color: '#EF4444', label: 'Needs Work', icon: 'arrow-up-circle' },
};

/**
 * Progress bar for domain scores
 */
function DomainProgressBar({ domain, score, maxScore = 25 }) {
  const color = DOMAIN_COLORS[domain] || '#6B7280';
  const progress = Math.min(score / maxScore, 1);
  const labels = {
    nutrition: 'Food',
    mood: 'Mood',
    hydration: 'Hydration',
    activity: 'Activity',
  };

  return (
    <View style={barStyles.container}>
      <View style={barStyles.labelRow}>
        <Text style={barStyles.label}>{labels[domain]}</Text>
        <Text style={[barStyles.score, { color }]}>
          {Math.round(score)}<Text style={barStyles.maxScore}>/25</Text>
        </Text>
      </View>
      <View style={barStyles.track}>
        <View
          style={[
            barStyles.fill,
            {
              width: `${progress * 100}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: {
    marginBottom: SPACING[3],
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING[1],
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
  },
  score: {
    fontSize: 14,
    fontWeight: '700',
  },
  maxScore: {
    fontSize: 12,
    fontWeight: '400',
    color: TEXT.tertiary,
  },
  track: {
    height: 8,
    backgroundColor: SURFACES.background.secondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});

/**
 * Meal item row
 */
function MealItem({ meal }) {
  const mealTime = new Date(meal.loggedDate || meal.timestamp);
  const timeStr = mealTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <View style={mealStyles.container}>
      <View style={mealStyles.iconContainer}>
        <Ionicons name="restaurant-outline" size={16} color="#10B981" />
      </View>
      <View style={mealStyles.content}>
        <Text style={mealStyles.name} numberOfLines={1}>
          {meal.foodName || meal.name || 'Meal'}
        </Text>
        <Text style={mealStyles.details}>
          {meal.calories || 0} cal | {timeStr}
        </Text>
      </View>
    </View>
  );
}

const mealStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.divider,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
  },
  details: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginTop: 2,
  },
});

/**
 * Mood entry row
 */
function MoodItem({ entry }) {
  const moodTime = new Date(entry.loggedDate || entry.timestamp);
  const timeStr = moodTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const moodEmoji = {
    happy: '😊',
    calm: '😌',
    energized: '⚡',
    content: '😊',
    neutral: '😐',
    tired: '😴',
    stressed: '😰',
    anxious: '😟',
    sad: '😢',
    irritated: '😤',
  };

  return (
    <View style={moodStyles.container}>
      <Text style={moodStyles.emoji}>{moodEmoji[entry.mood] || '😐'}</Text>
      <View style={moodStyles.content}>
        <Text style={moodStyles.mood}>
          {entry.mood?.charAt(0).toUpperCase() + entry.mood?.slice(1) || 'Neutral'}
        </Text>
        <Text style={moodStyles.details}>
          Energy: {entry.energyLevel || 5}/10 | {timeStr}
        </Text>
      </View>
    </View>
  );
}

const moodStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.divider,
  },
  emoji: {
    fontSize: 24,
    marginRight: SPACING[3],
  },
  content: {
    flex: 1,
  },
  mood: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
  },
  details: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginTop: 2,
  },
});

/**
 * Main DayDetailModal Component
 */
export default function DayDetailModal({
  visible,
  onClose,
  dayData, // { date, score, breakdown, tier, meals, water, moods, activities }
}) {
  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  if (!dayData) return null;

  const {
    date,
    dayName,
    score = 0,
    breakdown = {},
    tier = 'fair',
    label,
    rawData = {},
  } = dayData;

  const { foodLogs = [], moodLogs = [], waterLogs = [], activityLogs = [] } = rawData;

  // Calculate total water
  const totalWater = waterLogs.reduce((sum, log) => {
    return sum + parseFloat(log.amountLiters || log.hydrationLiters || 0);
  }, 0);

  // Get tier config
  const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.fair;

  // Format date
  const dateObj = new Date(date);
  const dateStr = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.dayLabel}>{dayName || dateStr}</Text>
            <Text style={styles.dateLabel}>{dateStr}</Text>
          </View>
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={TEXT.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Score Hero */}
          <View style={styles.scoreHero}>
            <View style={[styles.scoreBadge, { backgroundColor: `${tierConfig.color}15` }]}>
              <Text style={[styles.scoreValue, { color: tierConfig.color }]}>{Math.round(score)}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
            <View style={[styles.tierBadge, { backgroundColor: `${tierConfig.color}15` }]}>
              <Ionicons name={tierConfig.icon} size={14} color={tierConfig.color} />
              <Text style={[styles.tierLabel, { color: tierConfig.color }]}>
                {label || tierConfig.label}
              </Text>
            </View>
          </View>

          {/* Domain Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Domain Breakdown</Text>
            <View style={styles.card}>
              <DomainProgressBar domain="nutrition" score={typeof breakdown.nutrition === 'number' ? breakdown.nutrition : (breakdown.nutrition?.score || 0)} />
              <DomainProgressBar domain="mood" score={typeof breakdown.mood === 'number' ? breakdown.mood : (breakdown.mood?.score || 0)} />
              <DomainProgressBar domain="hydration" score={typeof breakdown.hydration === 'number' ? breakdown.hydration : (breakdown.hydration?.score || 0)} />
              <DomainProgressBar domain="activity" score={typeof breakdown.activity === 'number' ? breakdown.activity : (breakdown.activity?.score || 0)} />
            </View>
          </View>

          {/* Meals */}
          {foodLogs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Meals Logged ({foodLogs.length})
              </Text>
              <View style={styles.card}>
                {foodLogs.slice(0, 5).map((meal, index) => (
                  <MealItem key={meal.id || index} meal={meal} />
                ))}
                {foodLogs.length > 5 && (
                  <Text style={styles.moreText}>+{foodLogs.length - 5} more meals</Text>
                )}
              </View>
            </View>
          )}

          {/* Water */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hydration</Text>
            <View style={styles.card}>
              <View style={styles.waterRow}>
                <View style={styles.waterIcon}>
                  <Ionicons name="water" size={24} color="#3B82F6" />
                </View>
                <View>
                  <Text style={styles.waterValue}>
                    {totalWater.toFixed(1)}L
                  </Text>
                  <Text style={styles.waterLabel}>
                    {waterLogs.length} log{waterLogs.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Mood Entries */}
          {moodLogs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Mood Check-ins ({moodLogs.length})
              </Text>
              <View style={styles.card}>
                {moodLogs.slice(0, 3).map((entry, index) => (
                  <MoodItem key={entry.id || index} entry={entry} />
                ))}
                {moodLogs.length > 3 && (
                  <Text style={styles.moreText}>+{moodLogs.length - 3} more entries</Text>
                )}
              </View>
            </View>
          )}

          {/* Activity */}
          {activityLogs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Activity</Text>
              <View style={styles.card}>
                {activityLogs.map((activity, index) => (
                  <View key={activity.id || index} style={styles.activityRow}>
                    <Ionicons name="fitness-outline" size={18} color="#8B5CF6" />
                    <Text style={styles.activityText}>
                      {activity.type || activity.activityType || 'Exercise'} -{' '}
                      {activity.durationMinutes || activity.duration || 0} min
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Empty state */}
          {foodLogs.length === 0 && moodLogs.length === 0 && activityLogs.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={TEXT.tertiary} />
              <Text style={styles.emptyText}>No logs for this day</Text>
              <Text style={styles.emptySubtext}>Start logging to see your wellness breakdown</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING[5],
    paddingTop: SPACING[5],
    paddingBottom: SPACING[4],
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.divider,
  },
  dayLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT.primary,
  },
  dateLabel: {
    fontSize: 14,
    color: TEXT.secondary,
    marginTop: 2,
  },
  closeButton: {
    padding: SPACING[2],
    marginRight: -SPACING[2],
    marginTop: -SPACING[2],
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING[5],
  },

  // Score Hero
  scoreHero: {
    alignItems: 'center',
    marginBottom: SPACING[5],
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.xl,
    marginBottom: SPACING[2],
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -2,
  },
  scoreMax: {
    fontSize: 20,
    fontWeight: '500',
    color: TEXT.tertiary,
    marginLeft: 4,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.lg,
  },
  tierLabel: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Sections
  section: {
    marginBottom: SPACING[4],
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[3],
  },
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Water
  waterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  waterIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3B82F6',
  },
  waterLabel: {
    fontSize: 13,
    color: TEXT.tertiary,
  },

  // Activity
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[2],
  },
  activityText: {
    fontSize: 14,
    color: TEXT.primary,
  },

  // More text
  moreText: {
    fontSize: 13,
    color: TEXT.tertiary,
    textAlign: 'center',
    paddingTop: SPACING[2],
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING[6],
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT.secondary,
    marginTop: SPACING[3],
  },
  emptySubtext: {
    fontSize: 14,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
    textAlign: 'center',
  },
});
