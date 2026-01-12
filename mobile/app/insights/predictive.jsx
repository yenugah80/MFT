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

import {
  PREMIUM_COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../../constants/premiumDesignSystem';

// Mock data for demonstration
const MOCK_PREDICTIONS = {
  energy: {
    statement: 'Based on your meal timing, you may experience an energy dip around 2-3pm today.',
    hourlyLevels: [75, 82, 78, 45, 55, 72, 68],
    prevention: 'Have a protein-rich snack at 1pm to maintain steady energy',
  },
  mood: {
    statement: 'We noticed a pattern: high-sugar lunches correlate with lower afternoon mood scores.',
    moodScores: [7, 6, 8, 4, 7, 8, 7],
    factor: 'High-sugar lunches',
    percentage: 67,
    suggestion: 'Try a balanced lunch with protein and fiber',
  },
  nutrient: {
    statement: 'At your current rate, you may fall short on vitamin K and iron this week.',
    nutrients: [
      { name: 'Vitamin K', current: 66, target: 100, projected: 72, unit: 'mcg' },
      { name: 'Iron', current: 58, target: 100, projected: 62, unit: 'mg' },
      { name: 'Fiber', current: 78, target: 100, projected: 85, unit: 'g' },
    ],
    recommendation: 'Add leafy greens to 2 meals to hit your vitamin K target',
  },
};

const MOCK_CORRELATIONS = [
  {
    id: '1',
    factor: 'eat breakfast before 8am',
    outcome: 'more water logged',
    type: 'positive',
    correlation: 23,
    dataPoints: 21,
    instances: 15,
    confidence: 78,
    explanation: 'Early eaters tend to be more mindful about hydration throughout the day.',
    suggestion: 'Keep up the early breakfast habit to maintain good hydration',
  },
  {
    id: '2',
    factor: 'high-sugar lunch',
    outcome: 'afternoon tiredness',
    type: 'negative',
    correlation: 67,
    dataPoints: 18,
    instances: 12,
    confidence: 72,
    explanation: 'Sugar spikes lead to crashes, affecting your energy in the afternoon.',
    suggestion: 'Try protein + fiber at lunch to avoid the crash',
  },
  {
    id: '3',
    factor: 'skip dinner logging',
    outcome: 'lower mood next morning',
    type: 'negative',
    correlation: 45,
    dataPoints: 14,
    instances: 8,
    confidence: 65,
  },
];

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // In real app, fetch from API
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

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
                    Based on 21 days of patterns
                  </Text>
                </View>
              </FadeInView>

              {/* Energy Prediction */}
              <FadeInView animation="floatIn" delay={100}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Today's Forecast</Text>
                  <PredictiveInsightCard
                    type="energy"
                    prediction={MOCK_PREDICTIONS.energy}
                    confidence={82}
                    dataPoints={21}
                    onAction={() => handlePredictionAction('energy')}
                    style={styles.card}
                  />
                </View>
              </FadeInView>

              {/* Mood Correlation */}
              <FadeInView animation="floatIn" delay={200}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Mood Patterns</Text>
                  <PredictiveInsightCard
                    type="mood"
                    prediction={MOCK_PREDICTIONS.mood}
                    confidence={72}
                    dataPoints={18}
                    onAction={() => handlePredictionAction('mood')}
                    style={styles.card}
                  />
                </View>
              </FadeInView>

              {/* Nutrient Projections */}
              <FadeInView animation="floatIn" delay={300}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>This Week's Trajectory</Text>
                  <PredictiveInsightCard
                    type="nutrient"
                    prediction={MOCK_PREDICTIONS.nutrient}
                    confidence={78}
                    dataPoints={14}
                    onAction={() => handlePredictionAction('nutrient')}
                    style={styles.card}
                  />
                </View>
              </FadeInView>

              {/* Discovered Correlations */}
              <FadeInView animation="floatIn" delay={400}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Discovered Patterns</Text>
                  <Text style={styles.sectionSubtitle}>
                    Behavioral connections we've found in your data
                  </Text>
                  {MOCK_CORRELATIONS.map((correlation, idx) => (
                    <CorrelationCard
                      key={correlation.id}
                      factor={correlation.factor}
                      outcome={correlation.outcome}
                      type={correlation.type}
                      correlation={correlation.correlation}
                      dataPoints={correlation.dataPoints}
                      instances={correlation.instances}
                      confidence={correlation.confidence}
                      explanation={correlation.explanation}
                      suggestion={correlation.suggestion}
                      onPress={() => handleCorrelationPress(correlation)}
                      style={styles.correlationCard}
                    />
                  ))}
                </View>
              </FadeInView>

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
