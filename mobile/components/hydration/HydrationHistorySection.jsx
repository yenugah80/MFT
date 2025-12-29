import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  TEXT,
  SEMANTIC,
  TYPOGRAPHY,
  ICON_SIZES,
  BRAND,
} from '../../constants/premiumTheme';

function HydrationEmptyState({ styles }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="water-outline" size={64} color="#93C5FD" />
      </View>
      <Text style={styles.emptyTitle}>Start Your Hydration Journey</Text>
      <Text style={styles.emptySubtitle}>
        Tap a quick-add button below to log your first drink! 💧
      </Text>
      <View style={styles.emptyTips}>
        <View style={styles.emptyTip}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.emptyTipText}>Track all beverages</Text>
        </View>
        <View style={styles.emptyTip}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.emptyTipText}>Swipe to undo entries</Text>
        </View>
        <View style={styles.emptyTip}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.emptyTipText}>Celebrate milestones</Text>
        </View>
      </View>
    </View>
  );
}

function StatsCard({ beverageHistory, styles }) {
  const stats = useMemo(() => {
    const today = beverageHistory || [];
    const totalToday = today.reduce((sum, entry) => {
      const hydrationLiters = Number.isFinite(entry.hydrationLiters)
        ? entry.hydrationLiters
        : entry.amountLiters;
      return sum + (hydrationLiters || 0);
    }, 0);
    const avgPerEntry = today.length > 0 ? totalToday / today.length : 0;

    const hourlyCounts = new Array(24).fill(0);
    today.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
      hourlyCounts[hour]++;
    });
    const peakHour = hourlyCounts.indexOf(Math.max(...hourlyCounts));

    return {
      totalToday: (totalToday * 1000).toFixed(0),
      entriesCount: today.length,
      avgPerEntry: (avgPerEntry * 1000).toFixed(0),
      peakHour: peakHour >= 0 ? `${peakHour}:00` : 'N/A',
    };
  }, [beverageHistory]);

  return (
    <View style={styles.statsCard}>
      <View style={styles.statsHeader}>
        <Ionicons name="stats-chart" size={ICON_SIZES.md} color={SEMANTIC.info.base} />
        <Text style={styles.statsTitle}>Today&apos;s Stats</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalToday}ml</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.entriesCount}</Text>
          <Text style={styles.statLabel}>Entries</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.avgPerEntry}ml</Text>
          <Text style={styles.statLabel}>Avg/Entry</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.peakHour}</Text>
          <Text style={styles.statLabel}>Peak Time</Text>
        </View>
      </View>
    </View>
  );
}

function SwipeableEntry({ entry, onDelete, bevType, styles }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;
  const deleteScale = useRef(new Animated.Value(0.8)).current;
  const lastHapticThreshold = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx < 0) {
          const clampedDx = Math.max(gesture.dx, -120);
          translateX.setValue(clampedDx);

          const progress = Math.min(Math.abs(clampedDx) / 100, 1);
          deleteOpacity.setValue(progress);
          deleteScale.setValue(0.8 + (progress * 0.2));

          if (Math.abs(clampedDx) > 60 && lastHapticThreshold.current === 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            lastHapticThreshold.current = 1;
          }
        }
      },
      onPanResponderRelease: (_, gesture) => {
        lastHapticThreshold.current = 0;

        if (gesture.dx < -60) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: -400,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(deleteOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            if (onDelete) onDelete();
          });
        } else {
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              tension: 100,
              friction: 12,
              useNativeDriver: true,
            }),
            Animated.spring(deleteOpacity, {
              toValue: 0,
              tension: 100,
              friction: 12,
              useNativeDriver: true,
            }),
            Animated.spring(deleteScale, {
              toValue: 0.8,
              tension: 100,
              friction: 12,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const handleDirectDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Entry',
      `Remove ${entry.amount}ml ${bevType.emoji} entry?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (onDelete) onDelete();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.swipeableContainer}>
      <Animated.View
        style={[
          styles.deleteBackground,
          {
            opacity: deleteOpacity,
            transform: [{ scale: deleteScale }],
          },
        ]}
      >
        <Ionicons name="trash" size={ICON_SIZES.md} color={TEXT.white} />
        <Text style={styles.deleteText}>Delete</Text>
      </Animated.View>
      <Animated.View
        style={[styles.timelineEntry, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.timelineDot} />
        <Text style={styles.timelineEmoji}>{bevType.emoji}</Text>
        <View style={styles.timelineContent}>
          <View style={styles.timelineAmountRow}>
            <Text style={styles.timelineAmount}>{entry.amount}ml</Text>
            {bevType.hydrationFactor !== 1.0 && (
              <View style={styles.hydrationFactorBadge}>
                <View
                  style={[
                    styles.hydrationBar,
                    { width: `${bevType.hydrationFactor * 100}%`, backgroundColor: bevType.color },
                  ]}
                />
                <Text style={styles.hydrationFactorText}>
                  {Math.round(entry.amount * bevType.hydrationFactor)}ml 💧
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.timelineTime}>
            {new Date(entry.timestamp).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleDirectDelete}
          style={styles.timelineDeleteButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close-circle" size={20} color="#EF4444" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function Timeline({ beverageHistory, onDelete, beverageTypes, styles }) {
  const timelineData = useMemo(() => {
    const sortedHistory = [...(beverageHistory || [])].sort(
      (a, b) => b.timestamp - a.timestamp
    );

    const periods = {
      morning: [],
      afternoon: [],
      evening: [],
      night: [],
    };

    sortedHistory.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
      if (hour >= 5 && hour < 12) periods.morning.push(entry);
      else if (hour >= 12 && hour < 17) periods.afternoon.push(entry);
      else if (hour >= 17 && hour < 22) periods.evening.push(entry);
      else periods.night.push(entry);
    });

    return periods;
  }, [beverageHistory]);

  const renderPeriod = (periodName, icon, data) => {
    const totalMl = data.reduce((sum, entry) => sum + entry.amount, 0);
    if (data.length === 0) return null;

    return (
      <View key={periodName} style={styles.timelinePeriod}>
        <View style={styles.timelinePeriodHeader}>
          <Ionicons name={icon} size={ICON_SIZES.sm} color={SEMANTIC.info.base} />
          <Text style={styles.timelinePeriodName}>{periodName}</Text>
          <Text style={styles.timelinePeriodTotal}>{totalMl}ml</Text>
        </View>
        <View style={styles.timelinePeriodEntries}>
          {data.map((entry, idx) => {
            const bevType = beverageTypes[entry.type] || beverageTypes.water;
            return (
              <SwipeableEntry
                key={entry.id || idx}
                entry={entry}
                bevType={bevType}
                onDelete={() => onDelete(entry)}
                styles={styles}
              />
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.timelineContainer}>
      <View style={styles.timelineHeader}>
        <Ionicons name="time-outline" size={ICON_SIZES.md} color={SEMANTIC.info.base} />
        <Text style={styles.timelineTitle}>Timeline</Text>
        <Text style={styles.timelineHint}>← Swipe to delete</Text>
      </View>
      {renderPeriod('Morning', 'sunny', timelineData.morning)}
      {renderPeriod('Afternoon', 'partly-sunny', timelineData.afternoon)}
      {renderPeriod('Evening', 'moon', timelineData.evening)}
      {renderPeriod('Night', 'moon-outline', timelineData.night)}
    </View>
  );
}

export default function HydrationHistorySection({
  beverageHistory,
  dailyGoal,
  onDelete,
  beverageTypes,
  styles,
}) {
  const isEmpty = beverageHistory.length === 0;

  return (
    <>
      {!isEmpty && (
        <StatsCard
          beverageHistory={beverageHistory}
          dailyGoal={dailyGoal}
          styles={styles}
        />
      )}

      {isEmpty ? (
        <HydrationEmptyState styles={styles} />
      ) : (
        <Timeline
          beverageHistory={beverageHistory}
          onDelete={onDelete}
          beverageTypes={beverageTypes}
          styles={styles}
        />
      )}
    </>
  );
}
