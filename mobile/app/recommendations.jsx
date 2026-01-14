/**
 * Recommendations Screen
 *
 * Displays all 5W2H personalized recommendations for premium users.
 * Shows upgrade prompt for free users.
 */

import React, { useState, useCallback, useMemo } from 'react';
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

import { useSubscription, TIERS } from '../contexts/SubscriptionContext';
import { useNotification } from '../providers/NotificationProvider';
import Recommendation5W2HCard from '../components/recommendations/Recommendation5W2HCard';
import InsightDetailsSheet from '../components/recommendations/InsightDetailsSheet';
import FadeInView from '../components/FadeInView';
import { useRecommendations } from '../hooks/useRecommendations';

import {
  PREMIUM_COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../constants/premiumDesignSystem';

/**
 * Transform API recommendation to 5W2H format for UI display
 */
function transformTo5W2H(rec) {
  if (!rec) return null;

  // If already in 5W2H format, return as-is
  if (rec.who && rec.what && rec.why) {
    return rec;
  }

  // Transform from API format to 5W2H format
  return {
    id: rec.id || `rec-${Date.now()}`,
    who: {
      userId: rec.userId || 'user',
      persona: rec.persona || 'health-conscious',
      relevanceScore: rec.relevanceScore || Math.round((rec.confidence || 0.7) * 100),
      personalization: rec.personalization || rec.why || 'Based on your patterns',
    },
    what: {
      type: rec.type || 'food',
      action: rec.title || rec.action || rec.name || 'Recommendation',
      specifics: rec.specifics || (rec.name ? [rec.name] : []),
      alternatives: rec.alternatives || [],
    },
    when: {
      timing: rec.timing || 'today',
      specificTime: rec.specificTime || rec.when || 'Any time',
      frequency: rec.frequency || 'As needed',
      urgency: rec.urgency || 'medium',
    },
    where: {
      context: rec.context || 'any',
      preparation: rec.preparation || rec.how || '',
      purchaseHint: rec.purchaseHint || null,
    },
    why: {
      primaryReason: rec.why || rec.reason || 'Based on your health patterns',
      dataPoints: rec.dataPoints || [],
      healthBenefit: rec.healthBenefit || rec.benefit || '',
      scienceSource: rec.source || 'Your logged patterns',
    },
    how: {
      instructions: rec.instructions || (rec.how ? [rec.how] : []),
      difficulty: rec.difficulty || 'easy',
      timeRequired: rec.timeRequired || '5 minutes',
      tips: rec.tips || [],
    },
    howMuch: {
      quantity: rec.quantity || rec.servingSize || '',
      metricAmount: rec.metricAmount || 0,
      metricUnit: rec.metricUnit || 'g',
      nutritionImpact: rec.nutritionImpact || [],
    },
    confidence: {
      score: Math.round((rec.confidence || 0.7) * 100),
      dataPoints: rec.dataPointsCount || 14,
      source: rec.source || 'Your patterns + Nutrition science',
    },
    status: rec.status || 'pending',
  };
}

function UpgradePrompt({ onUpgrade }) {
  return (
    <View style={styles.upgradeContainer}>
      <LinearGradient
        colors={PREMIUM_COLORS.functional.insights.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.upgradeGradient}
      >
        <View style={styles.upgradeIcon}>
          <Ionicons name="diamond" size={48} color="#FFFFFF" />
        </View>
        <Text style={styles.upgradeTitle}>Unlock 5W2H Recommendations</Text>
        <Text style={styles.upgradeDescription}>
          Get personalized, explainable recommendations that answer WHO, WHAT, WHEN, WHERE, WHY, HOW, and HOW MUCH.
        </Text>
        <View style={styles.upgradeFeatures}>
          <View style={styles.upgradeFeature}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.upgradeFeatureText}>Full explainability on every insight</Text>
          </View>
          <View style={styles.upgradeFeature}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.upgradeFeatureText}>Confidence scores with data sources</Text>
          </View>
          <View style={styles.upgradeFeature}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.upgradeFeatureText}>Outcome tracking to prove value</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

export default function RecommendationsScreen() {
  const router = useRouter();
  const notify = useNotification();
  const subscription = useSubscription();
  const isPremium = subscription?.isPremium ?? false;

  const [selectedRec, setSelectedRec] = useState(null);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);

  // Fetch real recommendations from API
  const {
    recommendations: apiRecommendations,
    isLoading,
    error,
    refetch,
    trackInteraction,
  } = useRecommendations({ enabled: isPremium });

  // Transform API recommendations to 5W2H format
  const recommendations = useMemo(() => {
    if (!apiRecommendations || apiRecommendations.length === 0) {
      return [];
    }
    return apiRecommendations.map(transformTo5W2H).filter(Boolean);
  }, [apiRecommendations]);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleComplete = useCallback(async (rec) => {
    try {
      // Track acceptance via API
      await trackInteraction?.(rec.id, 'accept');
      notify.success('Recommendation marked as complete!');
      // Refetch to get updated list
      refetch();
    } catch (err) {
      notify.error('Failed to mark as complete');
    }
  }, [notify, trackInteraction, refetch]);

  const handleDismiss = useCallback(async (rec) => {
    try {
      // Track rejection via API
      await trackInteraction?.(rec.id, 'reject');
      // Refetch to get updated list
      refetch();
    } catch (err) {
      // Silent failure for dismiss
    }
  }, [trackInteraction, refetch]);

  const handleUpgrade = useCallback(() => {
    router.push('/profile/subscription');
  }, [router]);

  const handlePressDetails = useCallback((rec) => {
    setSelectedRec(rec);
    setShowDetailsSheet(true);
  }, []);

  const handleCloseDetailsSheet = useCallback(() => {
    setShowDetailsSheet(false);
    setTimeout(() => setSelectedRec(null), 300);
  }, []);

  const pendingRecs = recommendations.filter(r => r.status === 'pending');
  const completedRecs = recommendations.filter(r => r.status === 'completed');

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Recommendations',
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
                  <Text style={styles.headerTitle}>Your Personalized Actions</Text>
                  <Text style={styles.headerSubtitle}>
                    {recommendations.length > 0
                      ? `${recommendations.length} recommendations based on your patterns`
                      : 'Building your personalized recommendations'}
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

              {/* Error State */}
              {error && !isLoading && (
                <View style={styles.errorContainer}>
                  <Ionicons name="cloud-offline-outline" size={48} color={PREMIUM_COLORS.text.tertiary} />
                  <Text style={styles.errorTitle}>Couldn't load recommendations</Text>
                  <Text style={styles.errorText}>{error.message || 'Please try again later'}</Text>
                </View>
              )}

              {/* Pending Recommendations */}
              {!isLoading && pendingRecs.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Suggested Actions</Text>
                  {pendingRecs.map((rec, index) => (
                    <FadeInView
                      key={rec.id}
                      animation="floatIn"
                      delay={100 + index * 100}
                    >
                      <Recommendation5W2HCard
                        recommendation={rec}
                        onComplete={handleComplete}
                        onDismiss={handleDismiss}
                        onPressDetails={handlePressDetails}
                        style={styles.card}
                      />
                    </FadeInView>
                  ))}
                </View>
              )}

              {/* Completed Recommendations */}
              {completedRecs.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Completed</Text>
                  {completedRecs.map((rec, index) => (
                    <FadeInView
                      key={rec.id}
                      animation="fadeIn"
                      delay={100 + index * 50}
                    >
                      <Recommendation5W2HCard
                        recommendation={rec}
                        variant="compact"
                        onPressDetails={handlePressDetails}
                        style={[styles.card, styles.completedCard]}
                      />
                    </FadeInView>
                  ))}
                </View>
              )}

              {/* Empty State */}
              {pendingRecs.length === 0 && completedRecs.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="checkmark-done-circle"
                    size={64}
                    color={PREMIUM_COLORS.semantic.success.primary}
                  />
                  <Text style={styles.emptyTitle}>All caught up!</Text>
                  <Text style={styles.emptySubtitle}>
                    New recommendations will appear as we learn more about your patterns.
                  </Text>
                </View>
              )}
            </>
          ) : (
            <UpgradePrompt onUpgrade={handleUpgrade} />
          )}
        </ScrollView>

        {/* Insight Details Sheet */}
        <InsightDetailsSheet
          visible={showDetailsSheet}
          recommendation={selectedRec}
          onClose={handleCloseDetailsSheet}
          onComplete={(rec) => {
            handleComplete(rec);
            handleCloseDetailsSheet();
          }}
          onDismiss={(rec) => {
            handleDismiss(rec);
            handleCloseDetailsSheet();
          }}
        />
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
    marginBottom: SPACING[4],
  },
  card: {
    marginBottom: SPACING[4],
  },
  completedCard: {
    opacity: 0.7,
  },

  // Loading State
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[12],
  },
  loadingText: {
    marginTop: SPACING[3],
    fontSize: TYPOGRAPHY.size.body,
    color: PREMIUM_COLORS.text.secondary,
  },

  // Error State
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[12],
    paddingHorizontal: SPACING[4],
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.size.headline,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: PREMIUM_COLORS.text.primary,
    marginTop: SPACING[4],
    marginBottom: SPACING[2],
  },
  errorText: {
    fontSize: TYPOGRAPHY.size.body,
    color: PREMIUM_COLORS.text.tertiary,
    textAlign: 'center',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING[12],
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.title3,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: PREMIUM_COLORS.text.primary,
    marginTop: SPACING[4],
    marginBottom: SPACING[2],
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.size.body,
    color: PREMIUM_COLORS.text.tertiary,
    textAlign: 'center',
    maxWidth: 280,
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
