/**
 * Cuisine Diversity Card
 * Shows how many different cuisines user has eaten this week
 * With interactive breakdown chart
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  AccessibilityInfo
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, SHADOWS, RADIUS, SPACING, SURFACES, TYPOGRAPHY } from '../../constants/premiumTheme';
import { getCuisineColor } from '../../utils/cuisineDiversity';

export default function CuisineDiversityCard({ diversity = {} }) {
  const {
    uniqueCuisines = 0,
    totalMeals = 0,
    diversityScore = 0,
    cuisineBreakdown = []
  } = diversity;

  // Announce for accessibility
  React.useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      `You've tried ${uniqueCuisines} different cuisines this week`
    );
  }, [uniqueCuisines]);

  return (
    <LinearGradient
      colors={['#FFFBF0', '#FEF3C7']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { borderLeftColor: '#F97316' }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.emoji}>🌍</Text>
        <View style={styles.headerText}>
          <Text style={styles.title}>Cuisine Diversity</Text>
          <Text style={styles.subtitle}>This week</Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{uniqueCuisines}</Text>
          <Text style={styles.statLabel}>Cuisines</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.stat}>
          <Text style={styles.statValue}>{totalMeals}</Text>
          <Text style={styles.statLabel}>Meals</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.stat}>
          <Text style={styles.statValue}>{diversityScore}%</Text>
          <Text style={styles.statLabel}>Score</Text>
        </View>
      </View>

      {/* Breakdown */}
      {cuisineBreakdown.length > 0 && (
        <View style={styles.breakdown}>
          <Text style={styles.breakdownTitle}>Cuisine Breakdown</Text>

          {cuisineBreakdown.map(({ cuisine, count, percentage }) => (
            <View key={cuisine} style={styles.cuisineRow}>
              <Text style={styles.cuisineName}>{cuisine}</Text>

              {/* Bar chart */}
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${percentage}%`,
                      backgroundColor: getCuisineColor(cuisine)
                    }
                  ]}
                />
              </View>

              <View style={styles.cuisineStats}>
                <Text style={styles.cuisinePercentage}>{percentage}%</Text>
                <Text style={styles.cuisineCount}>({count})</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Empty state */}
      {uniqueCuisines === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="restaurant-outline" size={32} color="#F97316" />
          <Text style={styles.emptyStateText}>
            Start logging meals to track your cuisine diversity
          </Text>
        </View>
      )}

      {/* Insight message */}
      {uniqueCuisines > 0 && (
        <View style={styles.insight}>
          {uniqueCuisines >= 3 && (
            <>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.insightText}>
                Great variety! Keep exploring new cuisines
              </Text>
            </>
          )}
          {uniqueCuisines === 2 && (
            <>
              <Ionicons name="trending-up" size={14} color="#F59E0B" />
              <Text style={styles.insightText}>
                Try adding one more cuisine for more variety
              </Text>
            </>
          )}
          {uniqueCuisines === 1 && (
            <>
              <Ionicons name="bulb-outline" size={14} color="#F59E0B" />
              <Text style={styles.insightText}>
                Explore different cuisines this week
              </Text>
            </>
          )}
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFBF0',
    borderRadius: RADIUS.lg,
    borderLeftWidth: 4,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOWS.sm
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[3],
    gap: SPACING[2]
  },
  emoji: {
    fontSize: 24,
    fontFamily: TYPOGRAPHY.family.regular,
  },
  headerText: {
    flex: 1
  },
  title: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    letterSpacing: -0.3
  },
  subtitle: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
    marginTop: SPACING[1]
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: SPACING[3],
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: RADIUS.md,
    marginBottom: SPACING[3]
  },
  stat: {
    alignItems: 'center',
    flex: 1
  },
  statValue: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#F97316'
  },
  statLabel: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
    marginTop: SPACING[1]
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: SURFACES.divider
  },
  breakdown: {
    marginTop: SPACING[3]
  },
  breakdownTitle: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: SPACING[2]
  },
  cuisineRow: {
    marginBottom: SPACING[2]
  },
  cuisineName: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[1]
  },
  barContainer: {
    height: 24,
    backgroundColor: SURFACES.divider,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    marginBottom: SPACING[1]
  },
  barFill: {
    height: '100%',
    borderRadius: RADIUS.sm
  },
  cuisineStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1]
  },
  cuisinePercentage: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary
  },
  cuisineCount: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING[4],
    gap: SPACING[2]
  },
  emptyStateText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
    textAlign: 'center'
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: RADIUS.md,
    marginTop: SPACING[3]
  },
  insightText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.medium,
    color: '#F59E0B',
    flex: 1
  }
});
