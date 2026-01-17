/**
 * Insights Recommendations Landing Page
 * Navigation hub for all 4 recommendation output screens
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../../constants/designSystem';

export default function RecommendationsScreen() {
  const router = useRouter();
  const [loading] = useState(false);

  const recommendations = [
    {
      id: 'food',
      title: 'Food Recommendations',
      icon: 'restaurant',
      description: 'Personalized nutrition advice based on your energy patterns',
      color: COLORS.nutrition.primary,
      action: () => router.push('/insights/recommendations/food'),
      stats: 'Updated: Today',
    },
    {
      id: 'mood-food',
      title: 'Mood-Food Patterns',
      icon: 'analytics',
      description: 'Which foods correlate with your mood improvements',
      color: COLORS.mood.primary,
      action: () => router.push('/insights/recommendations/mood-food'),
      stats: '7-day analysis',
    },
    {
      id: 'hydration',
      title: 'Hydration-Energy Link',
      icon: 'water',
      description: 'How water intake affects your energy levels throughout the day',
      color: COLORS.hydration.primary,
      action: () => router.push('/insights/recommendations/hydration'),
      stats: '24-hour timeline',
    },
    {
      id: 'recovery',
      title: 'Activity Recovery',
      icon: 'fitness',
      description: 'Optimal nutrition timing for faster post-workout recovery',
      color: COLORS.activity.primary,
      action: () => router.push('/insights/recommendations/recovery'),
      stats: 'Last activity analyzed',
    },
  ];

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.brand.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Personalized Insights</Text>
        <Text style={styles.headerSubtitle}>
          AI-powered recommendations based on your patterns
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Recommendations Grid */}
        {recommendations.map((rec, index) => (
          <TouchableOpacity
            key={rec.id}
            style={[styles.card, SHADOWS.md]}
            onPress={rec.action}
            activeOpacity={0.7}
          >
            {/* Color accent bar */}
            <View
              style={[
                styles.accentBar,
                { backgroundColor: rec.color },
              ]}
            />

            <View style={styles.cardContent}>
              {/* Icon & Title */}
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconContainer, { backgroundColor: `${rec.color}15` }]}>
                  <Ionicons name={rec.icon} size={24} color={rec.color} />
                </View>
                <View style={styles.cardTitleGroup}>
                  <Text style={styles.cardTitle}>{rec.title}</Text>
                  <Text style={styles.cardStats}>{rec.stats}</Text>
                </View>
              </View>

              {/* Description */}
              <Text style={styles.cardDescription}>{rec.description}</Text>

              {/* Arrow indicator */}
              <View style={styles.cardArrow}>
                <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Information Section */}
        <View style={[styles.infoCard, SHADOWS.sm]}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.text.secondary} />
            <Text style={styles.infoTitle}>About These Recommendations</Text>
          </View>
          <Text style={styles.infoText}>
            These insights are generated using machine learning analysis of your logged food, mood, hydration, and activity data. The more data you log, the more personalized and accurate these recommendations become.
          </Text>

          <View style={styles.infoBullets}>
            <Text style={styles.infoBullet}>
              • Confidence scores show how certain the AI is about each pattern
            </Text>
            <Text style={styles.infoBullet}>
              • All data is processed locally and securely
            </Text>
            <Text style={styles.infoBullet}>
              • Recommendations update daily as you log new entries
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.primary,
  },
  header: {
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.title2,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.secondary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface.primary,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  accentBar: {
    height: 4,
  },
  cardContent: {
    padding: SPACING.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  cardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  cardTitleGroup: {
    flex: 1,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.size.headline,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
  },
  cardStats: {
    fontSize: TYPOGRAPHY.size.caption,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  cardDescription: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed,
    marginBottom: SPACING.md,
  },
  cardArrow: {
    alignItems: 'flex-end',
  },
  arrowText: {
    fontSize: TYPOGRAPHY.size.title2,
    color: COLORS.brand.primary,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  infoCard: {
    backgroundColor: COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING['2xl'],
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  infoTitle: {
    fontSize: TYPOGRAPHY.size.headline,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
  },
  infoText: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed,
    marginBottom: SPACING.md,
  },
  infoBullets: {
    gap: SPACING.sm,
  },
  infoBullet: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface.primary,
  },
});
