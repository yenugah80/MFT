/**
 * Recommendation Stats Card
 * Shows user's recommendation acceptance analytics and breakdown by type
 * Displays circular progress, acceptance rate, and type distribution
 *
 * Features:
 * - 10s loading timeout
 * - Defensive theme fallbacks
 * - Graceful error handling
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import apiClient from '../../services/apiClient';
import { TEXT, SURFACES, SHADOWS, SPACING, RADIUS } from '../../constants/premiumTheme';

const CIRCLE_RADIUS = 45;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
const LOADING_TIMEOUT = 10000; // 10 seconds

export default function RecommendationStatsCard() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const loadStats = async () => {
      setIsLoading(true);
      setError(null);

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), LOADING_TIMEOUT)
      );

      try {
        // Race between API call and timeout
        const response = await Promise.race([
          apiClient.get('/recommendations/stats/acceptance-by-preference'),
          timeoutPromise,
        ]);

        if (!isMounted.current) return;

        if (response) {
          setStats(response);

          // Animate progress circle (convert decimal 0-1 to percentage 0-100)
          Animated.timing(progressAnim, {
            toValue: (response.acceptanceRate || 0) * 100,
            duration: 1500,
            useNativeDriver: false,
          }).start();
        }
      } catch (err) {
        if (!isMounted.current) return;
        console.error('[RecommendationStatsCard] Failed to load stats:', err);
        setError(err.message === 'Request timeout'
          ? 'Loading took too long. Please try again.'
          : 'Unable to load stats');
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    loadStats();

    return () => {
      isMounted.current = false;
    };
  }, [progressAnim]);

  const renderProgressCircle = () => {
    const strokeDashoffset = progressAnim.interpolate({
      inputRange: [0, 100],
      outputRange: [CIRCLE_CIRCUMFERENCE, 0],
    });

    return (
      <View style={styles.progressContainer}>
        <Svg width={120} height={120} viewBox="0 0 120 120">
          {/* Background circle */}
          <Circle
            cx="60"
            cy="60"
            r={CIRCLE_RADIUS}
            stroke={SURFACES.background.tertiary}
            strokeWidth="8"
            fill="none"
          />

          {/* Progress circle - animated */}
          <Animated.Circle
            cx="60"
            cy="60"
            r={CIRCLE_RADIUS}
            stroke="#A78BFA"
            strokeWidth="8"
            fill="none"
            strokeDasharray={CIRCLE_CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            originX="60"
            originY="60"
          />
        </Svg>

        <View style={styles.progressText}>
          <Text style={[styles.progressValue, { color: '#8B5CF6' }]}>
            {Math.round((stats?.acceptanceRate || 0) * 100)}%
          </Text>
          <Text style={[styles.progressLabel, { color: TEXT.secondary }]}>
            Acceptance
          </Text>
        </View>
      </View>
    );
  };

  const renderTypeBreakdown = () => {
    if (!stats?.byType || Object.keys(stats.byType).length === 0) {
      return (
        <Text style={[styles.noDataText, { color: TEXT.secondary }]}>
          No breakdown data available
        </Text>
      );
    }

    return (
      <View style={styles.breakdownContainer}>
        {Object.entries(stats.byType).map(([type, data]) => (
          <View key={type} style={styles.typeItem}>
            <View style={styles.typeHeader}>
              <Text style={[styles.typeName, { color: TEXT.primary }]}>
                {type.replace(/_/g, ' ').charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')}
              </Text>
              <Text style={[styles.typeRate, { color: '#8B5CF6' }]}>
                {Math.round((data.acceptanceRate || 0) * 100)}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${(data.acceptanceRate || 0) * 100}%`,
                    backgroundColor: getTypeColor(type),
                  },
                ]}
              />
            </View>
            <Text style={[styles.typeCount, { color: TEXT.tertiary }]}>
              {data.accepted} / {data.total} recommendations
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const getTypeColor = (type) => {
    const colorMap = {
      dietary: '#A78BFA',
      cuisine: '#F97316',
      trending: '#3B82F6',
      default: '#10B981',
    };
    return colorMap[type] || colorMap.default;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A78BFA" />
        <Text style={[styles.loadingText, { color: TEXT.secondary }]}>
          Loading recommendation stats...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <LinearGradient
        colors={['#FEE2E2', '#FECACA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.errorContainer}
      >
        <Ionicons name="alert-circle-outline" size={32} color="#DC2626" />
        <Text style={[styles.errorText, { color: '#7F1D1D' }]}>
          {error}
        </Text>
      </LinearGradient>
    );
  }

  if (!stats) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="star-outline" size={40} color={TEXT.tertiary} />
        <Text style={[styles.emptyText, { color: TEXT.secondary }]}>
          No recommendation data available yet
        </Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={SURFACES.gradient.softPurple}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: TEXT.primary }]}>
          Recommendation Insights
        </Text>
        <Text style={[styles.subtitle, { color: TEXT.secondary }]}>
          Your acceptance rate
        </Text>
      </View>

      {renderProgressCircle()}

      <View style={styles.divider} />

      <View style={styles.breakdownHeader}>
        <Text style={[styles.breakdownTitle, { color: TEXT.primary }]}>
          Breakdown by Type
        </Text>
      </View>

      {renderTypeBreakdown()}

      <View style={styles.footer}>
        <Ionicons name="information-circle-outline" size={16} color={TEXT.tertiary} />
        <Text style={[styles.footerText, { color: TEXT.tertiary }]}>
          Based on all recommendations you&apos;ve received
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOWS.md,
  },
  header: {
    marginBottom: 16,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  progressText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
  },
  progressValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: 16,
  },
  breakdownHeader: {
    marginBottom: 12,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  breakdownContainer: {
    gap: 16,
    marginBottom: 16,
  },
  typeItem: {
    gap: 6,
  },
  typeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeName: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  typeRate: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  typeCount: {
    fontSize: 11,
  },
  noDataText: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[4],
    ...SHADOWS.md,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
