/**
 * Collapsible More Insights
 * Hidden section containing: Mood, Energy, Recommendations, Progress
 * Tap to expand and see all secondary features
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designSystem';

export default function CollapsibleMoreInsights({
  moodScore = 7.2,
  moodTrend = 'up',
  energyStatement = 'Predict dip at 3pm - add snack?',
  energyPremium = true,
  streak = 4,
  nextMilestone = 7,
  recommendations = [
    { id: 1, title: 'Increase protein intake', icon: '💪' },
    { id: 2, title: 'Set hydration reminder', icon: '💧' },
  ],
  onMoodPress,
  onEnergyPress,
  onRecommendationPress,
  onProgressPress,
}) {
  const [expanded, setExpanded] = useState(false);
  const rotationAnim = useRef(new Animated.Value(0)).current;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);

    Animated.timing(rotationAnim, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.container}>
      {/* Header - Always visible */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={20} color={COLORS.nutrition.primary} />
          <Text style={styles.headerTitle}>More Insights</Text>
        </View>

        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Ionicons name="chevron-down" size={24} color={COLORS.text.inverse} />
        </Animated.View>
      </TouchableOpacity>

      {/* Expanded Content */}
      {expanded && (
        <View style={styles.content}>
          {/* Mood & Energy */}
          <TouchableOpacity
            style={styles.card}
            onPress={onMoodPress}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardEmoji}>😊</Text>
              <View>
                <Text style={styles.cardTitle}>Mood & Energy</Text>
                <Text style={styles.cardSubtitle}>
                  Current: {moodScore}/10 • {moodTrend === 'up' ? '↗' : '↘'} {moodTrend === 'up' ? 'Improving' : 'Declining'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.5)" />
          </TouchableOpacity>

          {/* Energy Stability (Premium) */}
          {energyPremium && (
            <TouchableOpacity
              style={styles.card}
              onPress={onEnergyPress}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardEmoji}>⚡</Text>
                <View>
                  <Text style={styles.cardTitle}>Energy Stability</Text>
                  <Text style={styles.cardSubtitle}>{energyStatement}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>
          )}

          {/* Recommendations */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💡 Smart Recommendations</Text>
            <View style={styles.recommendationsList}>
              {recommendations.map(rec => (
                <TouchableOpacity
                  key={rec.id}
                  style={styles.recommendationItem}
                  onPress={() => onRecommendationPress?.(rec)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.recEmoji}>{rec.icon}</Text>
                  <Text style={styles.recText}>{rec.title}</Text>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.nutrition.primary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Progress & Streaks */}
          <TouchableOpacity
            style={styles.card}
            onPress={onProgressPress}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardEmoji}>🏆</Text>
              <View>
                <Text style={styles.cardTitle}>Progress & Streaks</Text>
                <Text style={styles.cardSubtitle}>
                  {streak} day streak • {nextMilestone - streak} days to next milestone
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.5)" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.headline,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.inverse,
  },
  content: {
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  cardEmoji: {
    fontSize: TYPOGRAPHY.size.title1,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.size.body,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.inverse,
    marginBottom: SPACING.xs,
  },
  cardSubtitle: {
    fontSize: TYPOGRAPHY.size.caption,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  recommendationsList: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: RADIUS.md,
  },
  recEmoji: {
    fontSize: TYPOGRAPHY.size.title2,
  },
  recText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.inverse,
  },
});
