/**
 * Predictive Insights Screen
 *
 * Premium feature showing:
 * - Energy predictions
 * - Mood-food correlations
 * - Nutrient projections
 * - Behavioral patterns
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useSubscription } from '../../contexts/SubscriptionContext';
import { useNotification } from '../../providers/NotificationProvider';
import PredictiveInsightCard from '../../components/insights/PredictiveInsightCard';
import CorrelationCard, { CorrelationCardCompact } from '../../components/insights/CorrelationCard';
import FadeInView from '../../components/FadeInView';
import { usePredictiveInsights, useCorrelations } from '../../hooks/useInsights';

import {
  PREMIUM_COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../../constants/premiumDesignSystem';

function UpgradePrompt({ onUpgrade }) {
  return (
    <View style={styles.upgradeContainer}>
      <LinearGradient
        colors={['#8B5CF6', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.upgradeGradient}
      >
        <View style={styles.upgradeIcon}>
          <Ionicons name="analytics" size={48} color="#FFFFFF" />
        </View>
        <Text style={styles.upgradeTitle}>Unlock Predictive Insights</Text>
        <Text style={styles.upgradeDescription}>
          See what your data predicts about your energy, mood, and nutrition—before it happens.
        </Text>
        <View style={styles.upgradeFeatures}>
          <View style={styles.upgradeFeature}>
            <Ionicons name="flash" size={20} color="#FFFFFF" />
            <Text style={styles.upgradeFeatureText}>Energy level predictions</Text>
          </View>
          <View style={styles.upgradeFeature}>
            <Ionicons name="happy" size={20} color="#FFFFFF" />
            <Text style={styles.upgradeFeatureText}>Mood-food correlations</Text>
          </View>
          <View style={styles.upgradeFeature}>
            <Ionicons name="nutrition" size={20} color="#FFFFFF" />
            <Text style={styles.upgradeFeatureText}>Nutrient projections</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

export default function PredictiveInsightsScreen() {
  const router = useRouter();
  const notify = useNotification();
  const subscription = useSubscription();
  const isPremium = subscription?.isPremium ?? false;

  const [refreshing, setRefreshing] = useState(false);

  // Fetch real data from API
  const {
    energyPrediction,
    moodPrediction,
    nutrientPrediction,
    dataPoints,
    isLoading: predictionsLoading,
    refetch: refetchPredictions,
  } = usePredictiveInsights({ enabled: isPremium });

  const {
    correlations,
    isLoading: correlationsLoading,
    refetch: refetchCorrelations,
  } = useCorrelations({ enabled: isPremium, limit: 5 });

  const isLoading = predictionsLoading || correlationsLoading;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetchPredictions(), refetchCorrelations()]);
    setRefreshing(false);
  }, [refetchPredictions, refetchCorrelations]);

  const handlePredictionAction = useCallback((type) => {
    notify.success(`Action for ${type} prediction!`);
    // Navigate to relevant action screen
  }, [notify]);

  const handleCorrelationPress = useCallback((correlation) => {
    notify.info(`Viewing ${correlation.factor} pattern details`);
    // Could open a details modal
  }, [notify]);

  const handleUpgrade = useCallback(() => {
    router.push('/profile/subscription');
  }, [router]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Predictive Insights',
          headerStyle: {
            backgroundColor: PREMIUM_COLORS.surface.primary,
          },
          headerTintColor: PREMIUM_COLORS.brand.primary,
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={PREMIUM_COLORS.brand.primary}
            />
          }
        >
          {isPremium ? (
            <>
              {/* Header */}
              <FadeInView animation="fadeIn" delay={0}>
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>What Your Data Predicts</Text>
                  <Text style={styles.headerSubtitle}>
                    Based on {dataPoints || 0} days of patterns
                  </Text>
                </View>
              </FadeInView>

              {/* Loading State */}
              {isLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={PREMIUM_COLORS.brand.primary} />
                  <Text style={styles.loadingText}>Analyzing your patterns...</Text>
                </View>
              )}

              {/* Energy Prediction */}
              {energyPrediction && (
                <FadeInView animation="floatIn" delay={100}>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Today's Forecast</Text>
                    <PredictiveInsightCard
                      type="energy"
                      prediction={{
                        statement: energyPrediction.statement,
                        hourlyLevels: energyPrediction.hourlyLevels,
                        prevention: energyPrediction.suggestion,
                      }}
                      confidence={Math.round((energyPrediction.confidence || 0) * 100)}
                      dataPoints={dataPoints}
                      onAction={() => handlePredictionAction('energy')}
                      style={styles.card}
                    />
                  </View>
                </FadeInView>
              )}

              {/* Mood Correlation */}
              {moodPrediction && (
                <FadeInView animation="floatIn" delay={200}>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Mood Patterns</Text>
                    <PredictiveInsightCard
                      type="mood"
                      prediction={{
                        statement: moodPrediction.statement,
                        moodScores: moodPrediction.moodScores,
                        factor: moodPrediction.factor,
                        percentage: moodPrediction.percentage,
                        suggestion: moodPrediction.suggestion,
                      }}
                      confidence={Math.round((moodPrediction.confidence || 0) * 100)}
                      dataPoints={dataPoints}
                      onAction={() => handlePredictionAction('mood')}
                      style={styles.card}
                    />
                  </View>
                </FadeInView>
              )}

              {/* Nutrient Projections */}
              {nutrientPrediction && (
                <FadeInView animation="floatIn" delay={300}>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>This Week's Trajectory</Text>
                    <PredictiveInsightCard
                      type="nutrient"
                      prediction={{
                        statement: nutrientPrediction.statement,
                        nutrients: nutrientPrediction.nutrients,
                        recommendation: nutrientPrediction.suggestion,
                      }}
                      confidence={Math.round((nutrientPrediction.confidence || 0) * 100)}
                      dataPoints={dataPoints}
                      onAction={() => handlePredictionAction('nutrient')}
                      style={styles.card}
                    />
                  </View>
                </FadeInView>
              )}

              {/* Discovered Correlations */}
              {correlations.length > 0 && (
                <FadeInView animation="floatIn" delay={400}>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Discovered Patterns</Text>
                    <Text style={styles.sectionSubtitle}>
                      Behavioral connections we've found in your data
                    </Text>
                    {correlations.map((correlation, idx) => (
                      <CorrelationCard
                        key={correlation.id || idx}
                        factor={correlation.pattern?.split(' → ')[0] || 'Pattern'}
                        outcome={correlation.pattern?.split(' → ')[1] || 'detected'}
                        type={correlation.type || 'neutral'}
                        correlation={Math.round((correlation.confidence || 0) * 100)}
                        dataPoints={correlation.occurrences || 0}
                        instances={correlation.occurrences || 0}
                        confidence={Math.round((correlation.confidence || 0) * 100)}
                        explanation={correlation.explanation}
                        suggestion={correlation.suggestion}
                        onPress={() => handleCorrelationPress(correlation)}
                        style={styles.correlationCard}
                      />
                    ))}
                  </View>
                </FadeInView>
              )}

              {/* No Data State */}
              {!isLoading && !energyPrediction && !moodPrediction && !nutrientPrediction && correlations.length === 0 && (
                <FadeInView animation="fadeIn" delay={100}>
                  <View style={styles.emptyState}>
                    <Ionicons name="analytics-outline" size={48} color={PREMIUM_COLORS.text.tertiary} />
                    <Text style={styles.emptyStateTitle}>Building Your Predictions</Text>
                    <Text style={styles.emptyStateText}>
                      Keep logging meals, mood, and hydration to unlock personalized predictions and patterns.
                    </Text>
                  </View>
                </FadeInView>
              )}

              {/* Data quality note */}
              <FadeInView animation="fadeIn" delay={500}>
                <View style={styles.dataQualityNote}>
                  <Ionicons name="shield-checkmark" size={16} color={PREMIUM_COLORS.text.tertiary} />
                  <Text style={styles.dataQualityText}>
                    Predictions improve with more logged data. Keep tracking for better accuracy!
                  </Text>
                </View>
              </FadeInView>
            </>
          ) : (
            <UpgradePrompt onUpgrade={handleUpgrade} />
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PREMIUM_COLORS.surface.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING[5],
    paddingBottom: SPACING[10],
  },

  // Header
  header: {
    marginBottom: SPACING[6],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.title2,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: PREMIUM_COLORS.text.primary,
    marginBottom: SPACING[1],
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.subhead,
    color: PREMIUM_COLORS.text.tertiary,
  },

  // Sections
  section: {
    marginBottom: SPACING[6],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.headline,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: PREMIUM_COLORS.text.primary,
    marginBottom: SPACING[2],
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.tertiary,
    marginBottom: SPACING[4],
  },
  card: {
    marginBottom: SPACING[4],
  },
  correlationCard: {
    marginBottom: SPACING[4],
  },

  // Loading State
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[10],
  },
  loadingText: {
    marginTop: SPACING[3],
    fontSize: TYPOGRAPHY.size.body,
    color: PREMIUM_COLORS.text.secondary,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[10],
    paddingHorizontal: SPACING[4],
  },
  emptyStateTitle: {
    fontSize: TYPOGRAPHY.size.headline,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: PREMIUM_COLORS.text.primary,
    marginTop: SPACING[4],
    marginBottom: SPACING[2],
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.size.body,
    color: PREMIUM_COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.size.body * 1.4,
  },

  // Data quality note
  dataQualityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
    padding: SPACING[4],
    backgroundColor: PREMIUM_COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
  },
  dataQualityText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.tertiary,
    lineHeight: TYPOGRAPHY.size.footnote * 1.4,
  },

  // Upgrade Prompt
  upgradeContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: SPACING[8],
  },
  upgradeGradient: {
    borderRadius: RADIUS['2xl'],
    padding: SPACING[6],
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  upgradeIcon: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[5],
  },
  upgradeTitle: {
    fontSize: TYPOGRAPHY.size.title2,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: SPACING[3],
  },
  upgradeDescription: {
    fontSize: TYPOGRAPHY.size.body,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.size.body * 1.5,
    marginBottom: SPACING[5],
  },
  upgradeFeatures: {
    gap: SPACING[3],
  },
  upgradeFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  upgradeFeatureText: {
    fontSize: TYPOGRAPHY.size.subhead,
    color: '#FFFFFF',
  },
});
