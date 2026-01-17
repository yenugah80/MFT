/**
 * MLInsightsDashboard Component
 *
 * Main dashboard for displaying ML-powered health predictions.
 * Combines personalization progress, predictions, and forecast.
 *
 * DESIGN PRINCIPLES:
 * - Information hierarchy: Most actionable insights first
 * - Progressive disclosure: Summary first, details on tap
 * - Visual consistency with app design system
 * - Accessibility: High contrast, readable fonts
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TEXT, SURFACES, BRAND } from '../../constants/premiumTheme';

import PredictionCard from './PredictionCard';
import PersonalizationProgress from './PersonalizationProgress';
import { useMLPredictions } from '../../hooks/useMLPredictions';

// Task display order (most important first)
const TASK_ORDER = ['mood', 'energy', 'sleep', 'hydration', 'compliance'];

export default function MLInsightsDashboard() {
  const {
    predictions,
    status,
    insights,
    isLoading,
    error,
    refetch,
  } = useMLPredictions();

  const [refreshing, setRefreshing] = useState(false);
  const [expandedView, setExpandedView] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading && !predictions) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND.primary} />
        <Text style={styles.loadingText}>Generating predictions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={TEXT.tertiary} />
        <Text style={styles.errorTitle}>Unable to Load Predictions</Text>
        <Text style={styles.errorText}>{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const predictionData = predictions?.predictions || {};
  const personalization = predictions?.personalization || {};

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Health Predictions</Text>
          <Text style={styles.headerSubtitle}>
            Based on your logged data and patterns
          </Text>
        </View>
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => setExpandedView(!expandedView)}
        >
          <Ionicons
            name={expandedView ? 'chevron-up' : 'information-circle-outline'}
            size={24}
            color={BRAND.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Personalization Progress */}
      {status && <PersonalizationProgress status={status} />}

      {/* Summary Card */}
      <SummaryCard predictions={predictionData} personalization={personalization} />

      {/* Predictions Grid */}
      <View style={styles.predictionsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Outlook</Text>
          {personalization.confidence && (
            <View style={styles.confidenceBadge}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#10B981" />
              <Text style={styles.confidenceValue}>
                {Math.round(personalization.confidence * 100)}% reliable
              </Text>
            </View>
          )}
        </View>

        {TASK_ORDER.map((task, index) => (
          <PredictionCard
            key={task}
            task={task}
            prediction={predictionData[task]}
            animationDelay={index * 100}
          />
        ))}
      </View>

      {/* Expanded Info Section */}
      {expandedView && insights && (
        <View style={styles.insightsSection}>
          <Text style={styles.sectionTitle}>Model Insights</Text>

          <View style={styles.insightCard}>
            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Data Quality</Text>
              <View style={styles.qualityIndicator}>
                {[1, 2, 3, 4, 5].map(i => (
                  <View
                    key={i}
                    style={[
                      styles.qualityDot,
                      i <= (insights.dataQuality?.daysOfData / 2 || 0) &&
                        styles.qualityDotFilled,
                    ]}
                  />
                ))}
              </View>
            </View>

            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Current Streak</Text>
              <Text style={styles.insightValue}>
                {insights.dataQuality?.currentStreak || 0} days
              </Text>
            </View>

            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Model Source</Text>
              <Text style={styles.insightValue}>
                {personalization.level === 'personalized' ? 'Personal' : 'Population + Personal'}
              </Text>
            </View>
          </View>

          {/* Task Reliability */}
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
            Prediction Reliability
          </Text>

          <View style={styles.reliabilityGrid}>
            {insights.tasks && Object.entries(insights.tasks).map(([task, data]) => (
              <View key={task} style={styles.reliabilityItem}>
                <Text style={styles.reliabilityTask}>
                  {task.charAt(0).toUpperCase() + task.slice(1)}
                </Text>
                <Text
                  style={[
                    styles.reliabilityValue,
                    data.reliabilityLabel === 'High' && styles.reliabilityHigh,
                    data.reliabilityLabel === 'Moderate' && styles.reliabilityModerate,
                    data.reliabilityLabel === 'Building' && styles.reliabilityBuilding,
                  ]}
                >
                  {data.reliabilityLabel}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Recommendation */}
      {insights?.dataQuality?.recommendation && (
        <View style={styles.recommendationCard}>
          <Ionicons name="sparkles-outline" size={20} color={BRAND.primary} />
          <Text style={styles.recommendationText}>
            {insights.dataQuality.recommendation}
          </Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Predictions update as you log more data
        </Text>
      </View>
    </ScrollView>
  );
}

/**
 * Summary Card - Quick glance at overall status
 */
function SummaryCard({ predictions, personalization }) {
  // Calculate overall score (average of available predictions)
  const scores = Object.entries(predictions)
    .filter(([_, p]) => p?.taskType === 'regression' && p?.value)
    .map(([_, p]) => p.value);

  const avgScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : null;

  const overallLabel = avgScore
    ? avgScore >= 4 ? 'Great Day Ahead'
      : avgScore >= 3 ? 'Looking Good'
        : avgScore >= 2 ? 'Room for Improvement'
          : 'Take It Easy'
    : 'Keep Logging';

  const gradientColors = avgScore
    ? avgScore >= 4 ? ['#10B981', '#34D399']
      : avgScore >= 3 ? ['#3B82F6', '#60A5FA']
        : avgScore >= 2 ? ['#F59E0B', '#FBBF24']
          : ['#EF4444', '#F87171']
    : ['#6B7280', '#9CA3AF'];

  return (
    <LinearGradient
      colors={gradientColors}
      style={styles.summaryCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.summaryContent}>
        <View>
          <Text style={styles.summaryLabel}>Overall Outlook</Text>
          <Text style={styles.summaryTitle}>{overallLabel}</Text>
        </View>
        {avgScore && (
          <View style={styles.summaryScore}>
            <Text style={styles.summaryScoreValue}>{avgScore.toFixed(1)}</Text>
            <Text style={styles.summaryScoreLabel}>/5</Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: TEXT.secondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT.primary,
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: TEXT.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: BRAND.primary,
    borderRadius: 20,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: TEXT.secondary,
    marginTop: 4,
  },
  infoButton: {
    padding: 8,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryScore: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  summaryScoreValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryScoreLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 2,
  },
  predictionsSection: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: TEXT.primary,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceValue: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 4,
  },
  insightsSection: {
    marginTop: 24,
  },
  insightCard: {
    backgroundColor: SURFACES.card,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.background.secondary,
  },
  insightLabel: {
    fontSize: 14,
    color: TEXT.secondary,
  },
  insightValue: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
  },
  qualityIndicator: {
    flexDirection: 'row',
    gap: 4,
  },
  qualityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SURFACES.background.secondary,
  },
  qualityDotFilled: {
    backgroundColor: BRAND.primary,
  },
  reliabilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  reliabilityItem: {
    backgroundColor: SURFACES.card,
    borderRadius: 8,
    padding: 12,
    width: '48%',
  },
  reliabilityTask: {
    fontSize: 13,
    color: TEXT.secondary,
    marginBottom: 4,
  },
  reliabilityValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  reliabilityHigh: {
    color: '#10B981',
  },
  reliabilityModerate: {
    color: '#F59E0B',
  },
  reliabilityBuilding: {
    color: TEXT.tertiary,
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: BRAND.primary,
    marginLeft: 12,
    lineHeight: 20,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: TEXT.tertiary,
  },
});
