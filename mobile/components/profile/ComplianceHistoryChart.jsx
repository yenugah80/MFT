/**
 * Compliance History Chart
 * Shows 30-day dietary compliance trend with animated line chart
 * Visual indicators for compliance levels over time
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../services/apiClient';
import { BRAND, TEXT, SURFACES, SHADOWS } from '../../constants/premiumTheme';

const screenWidth = Dimensions.get('window').width;

export default function ComplianceHistoryChart() {
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadComplianceHistory = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get('/nutrition/compliance-history');
        if (response && response.length > 0) {
          // Prepare data for chart
          const data = response.slice(0, 30); // Last 30 days
          const labels = data.map((item) => {
            const date = new Date(item.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          });
          const scores = data.map((item) => item.score || 0);

          setChartData({
            labels: labels.length > 7 ? labels.filter((_, i) => i % 5 === 0) : labels,
            datasets: [
              {
                data: scores,
                color: () => '#A78BFA',
                strokeWidth: 2,
              },
            ],
          });
          setError(null);
        }
      } catch (err) {
        console.error('[ComplianceHistoryChart] Failed to load history:', err);
        setError('Failed to load compliance history');
      } finally {
        setIsLoading(false);
      }
    };

    loadComplianceHistory();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A78BFA" />
        <Text style={[styles.loadingText, { color: TEXT.secondary }]}>
          Loading compliance history...
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

  if (!chartData) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="bar-chart-outline" size={40} color={TEXT.tertiary} />
        <Text style={[styles.emptyText, { color: TEXT.secondary }]}>
          No compliance data available yet
        </Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[SURFACES.card.background.default, SURFACES.card.background.elevated]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: TEXT.primary }]}>
          Compliance Trend
        </Text>
        <Text style={[styles.subtitle, { color: TEXT.secondary }]}>
          Last 30 days
        </Text>
      </View>

      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={screenWidth - 32}
          height={220}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: 'transparent',
            backgroundGradientTo: 'transparent',
            color: () => '#E9D5FF',
            strokeWidth: 2,
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: '#A78BFA',
            },
            propsForLabels: {
              fontSize: 12,
              fill: TEXT.secondary,
            },
            decimalPlaces: 0,
          }}
          style={styles.chart}
          bezier
          withHorizontalLines={true}
          withVerticalLines={false}
          withOuterLines={false}
          withInnerLines={true}
          yAxisInterval={20}
          yMax={100}
          yMin={0}
        />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: TEXT.secondary }]}>
            Current Streak
          </Text>
          <Text style={[styles.statValue, { color: '#8B5CF6' }]}>
            7 days
          </Text>
        </View>
        <View style={[styles.statItem, { borderLeftWidth: 1, borderLeftColor: TEXT.tertiary }]}>
          <Text style={[styles.statLabel, { color: TEXT.secondary }]}>
            Average Score
          </Text>
          <Text style={[styles.statValue, { color: '#8B5CF6' }]}>
            82%
          </Text>
        </View>
        <View style={[styles.statItem, { borderLeftWidth: 1, borderLeftColor: TEXT.tertiary }]}>
          <Text style={[styles.statLabel, { color: TEXT.secondary }]}>
            Best Day
          </Text>
          <Text style={[styles.statValue, { color: '#8B5CF6' }]}>
            95%
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.medium,
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
  chartContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  chart: {
    borderRadius: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
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
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    ...SHADOWS.medium,
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
