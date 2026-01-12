/**
 * Recommendations Screen
 *
 * Displays all 5W2H personalized recommendations for premium users.
 * Shows upgrade prompt for free users.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
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

import {
  PREMIUM_COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../constants/premiumDesignSystem';

// Mock recommendations (replace with API call)
const MOCK_RECOMMENDATIONS = [
  {
    id: '1',
    who: {
      userId: 'user123',
      persona: 'health-conscious',
      relevanceScore: 92,
      personalization: 'Based on your vitamin K pattern',
    },
    what: {
      type: 'food',
      action: 'Add leafy greens to your next meal',
      specifics: ['Spinach', 'Kale', 'Mixed greens'],
      alternatives: ['Broccoli', 'Brussels sprouts'],
    },
    when: {
      timing: 'next-meal',
      specificTime: 'Lunch or dinner',
      frequency: '3x per week',
      urgency: 'medium',
    },
    where: {
      context: 'any',
      preparation: 'Add 1 cup raw or ½ cup cooked to any dish',
      purchaseHint: 'Available at most grocery stores',
    },
    why: {
      primaryReason: 'Your vitamin K intake is 34% below optimal this week',
      dataPoints: [
        { label: 'Current intake', value: '66% of target' },
        { label: 'Days tracked', value: '14 days' },
      ],
      healthBenefit: 'Supports bone health and blood clotting',
      scienceSource: 'USDA FoodData Central',
    },
    how: {
      instructions: [
        'Add 1 cup raw spinach to salads',
        'Sauté ½ cup with garlic as a side',
        'Blend into smoothies',
      ],
      difficulty: 'easy',
      timeRequired: '2 minutes',
      tips: ['Fresh or frozen both work well'],
    },
    howMuch: {
      quantity: '1 cup raw or ½ cup cooked',
      metricAmount: 30,
      metricUnit: 'g',
      nutritionImpact: [
        { nutrient: 'Vitamin K', amount: 145, percentDV: 120 },
        { nutrient: 'Folate', amount: 58, percentDV: 15 },
      ],
    },
    confidence: {
      score: 87,
      dataPoints: 14,
      source: 'USDA + Your patterns',
    },
    status: 'pending',
  },
  {
    id: '2',
    who: {
      userId: 'user123',
      persona: 'health-conscious',
      relevanceScore: 85,
      personalization: 'Based on your hydration patterns',
    },
    what: {
      type: 'hydration',
      action: 'Drink water before your afternoon meetings',
      specifics: ['Water', 'Herbal tea'],
      alternatives: ['Sparkling water'],
    },
    when: {
      timing: 'today',
      specificTime: 'Before 2pm',
      frequency: 'Daily',
      urgency: 'low',
    },
    where: {
      context: 'office',
      preparation: 'Keep a water bottle at your desk',
      purchaseHint: null,
    },
    why: {
      primaryReason: 'Your energy dips 67% more often when dehydrated before 2pm',
      dataPoints: [
        { label: 'Pattern detected', value: '12 instances' },
        { label: 'Correlation', value: '67%' },
      ],
      healthBenefit: 'Maintains cognitive performance and energy',
      scienceSource: 'Your logged patterns',
    },
    how: {
      instructions: [
        'Set a reminder for 1:30pm',
        'Drink 8oz water before meetings',
        'Notice your energy levels after',
      ],
      difficulty: 'easy',
      timeRequired: '1 minute',
      tips: ['Room temperature water absorbs faster'],
    },
    howMuch: {
      quantity: '8oz (1 glass)',
      metricAmount: 250,
      metricUnit: 'ml',
      nutritionImpact: [],
    },
    confidence: {
      score: 78,
      dataPoints: 12,
      source: 'Your logged patterns',
    },
    status: 'pending',
  },
  {
    id: '3',
    who: {
      userId: 'user123',
      persona: 'busy-professional',
      relevanceScore: 80,
      personalization: 'Based on your breakfast habits',
    },
    what: {
      type: 'food',
      action: 'Add protein to your morning meal',
      specifics: ['Eggs', 'Greek yogurt', 'Cottage cheese'],
      alternatives: ['Protein shake', 'Nuts'],
    },
    when: {
      timing: 'next-meal',
      specificTime: 'Breakfast tomorrow',
      frequency: 'Daily',
      urgency: 'medium',
    },
    where: {
      context: 'home',
      preparation: 'Quick 5-minute prep options available',
      purchaseHint: null,
    },
    why: {
      primaryReason: 'Your morning meals average only 12g protein (target: 25g)',
      dataPoints: [
        { label: 'Average breakfast protein', value: '12g' },
        { label: 'Recommended', value: '25g' },
      ],
      healthBenefit: 'Sustains energy and reduces mid-morning cravings',
      scienceSource: 'Nutrition guidelines + Your patterns',
    },
    how: {
      instructions: [
        'Add 2 eggs to your breakfast (12g protein)',
        'Or include 1 cup Greek yogurt (17g protein)',
        'Combine with your usual breakfast',
      ],
      difficulty: 'easy',
      timeRequired: '5 minutes',
      tips: ['Prep hard-boiled eggs in advance'],
    },
    howMuch: {
      quantity: '2 eggs or 1 cup Greek yogurt',
      metricAmount: 100,
      metricUnit: 'g',
      nutritionImpact: [
        { nutrient: 'Protein', amount: 12, percentDV: 24 },
      ],
    },
    confidence: {
      score: 82,
      dataPoints: 21,
      source: 'Nutrition guidelines + Your patterns',
    },
    status: 'pending',
  },
];

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

  const [refreshing, setRefreshing] = useState(false);
  const [recommendations, setRecommendations] = useState(MOCK_RECOMMENDATIONS);
  const [selectedRec, setSelectedRec] = useState(null);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // In real app, fetch from API
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleComplete = useCallback((rec) => {
    setRecommendations(prev =>
      prev.map(r => r.id === rec.id ? { ...r, status: 'completed' } : r)
    );
    notify.success('Recommendation marked as complete!');
  }, [notify]);

  const handleDismiss = useCallback((rec) => {
    setRecommendations(prev =>
      prev.map(r => r.id === rec.id ? { ...r, status: 'dismissed' } : r)
    );
  }, []);

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
                    Based on {recommendations.length * 14} days of data
                  </Text>
                </View>
              </FadeInView>

              {/* Pending Recommendations */}
              {pendingRecs.length > 0 && (
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
