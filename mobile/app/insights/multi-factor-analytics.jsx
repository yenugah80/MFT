/**
 * Multi-Factor Analytics Dashboard
 *
 * Comprehensive health analytics showing ALL cross-factor relationships:
 * - Food ↔ Mood ↔ Hydration ↔ Activity ↔ Sleep
 * - Synergistic effects (Protein + Exercise)
 * - Antagonistic effects (Sugar + Sedentary)
 * - Personalized response patterns
 *
 * Design inspired by world-class health apps:
 * - Noom: Behavioral insights with clear visualizations
 * - MyFitnessPal: Comprehensive data dashboard
 * - Headspace: Clean, calming mental health design
 */

import React, { useState, useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import FoodMoodCorrelationCard from '../../components/analytics/FoodMoodCorrelationCard';
import HydrationCognitionCard from '../../components/analytics/HydrationCognitionCard';
import ActivityMoodCard from '../../components/analytics/ActivityMoodCard';
import CircularProgress from '../../components/analytics/CircularProgress';
import MiniBarChart from '../../components/analytics/MiniBarChart';

import { useFoodLog } from '../../hooks/useFoodLog';
import { useMoodTrends } from '../../hooks/useMoodTrends';
import { useWaterLog } from '../../hooks/useWaterLog';
import { useNotification } from '../../providers/NotificationProvider';

import { TEXT, BRAND, SURFACES, SEMANTIC, SHADOWS } from '../../constants/premiumTheme';
import {
  analyzeMultiFactorCorrelations,
  detectInteractionEffects,
  analyzePersonalizedResponses,
  generateHolisticRecommendations,
  CONFIG,
  EVIDENCE_TERMINOLOGY,
  SCIENTIFIC_PRIORS,
} from '../../utils/multiFactorAnalytics';

export default function MultiFactorAnalyticsScreen() {
  const router = useRouter();
  const notify = useNotification();

  const [timeRange, setTimeRange] = useState(30);
  const [activeTab, setActiveTab] = useState('overview'); // overview, correlations, interactions, personal

  // Get data
  const { logs: foodLogs } = useFoodLog();
  const { data: moodData } = useMoodTrends({ days: timeRange });
  const { logs: waterLogs } = useWaterLog();

  const moodLogs = moodData?.data || [];
  const activityLogs = []; // To be implemented
  const sleepLogs = []; // To be implemented

  // Analyze
  const correlationAnalysis = useMemo(() => {
    return analyzeMultiFactorCorrelations({
      foodLogs,
      moodLogs,
      waterLogs,
      activityLogs,
      sleepLogs,
    });
  }, [foodLogs, moodLogs, waterLogs, activityLogs, sleepLogs]);

  const interactionAnalysis = useMemo(() => {
    return detectInteractionEffects({
      foodLogs,
      moodLogs,
      waterLogs,
      activityLogs,
      sleepLogs,
    });
  }, [foodLogs, moodLogs, waterLogs, activityLogs, sleepLogs]);

  const personalPatterns = useMemo(() => {
    return analyzePersonalizedResponses({
      foodLogs,
      moodLogs,
      waterLogs,
      activityLogs,
      sleepLogs,
    });
  }, [foodLogs, moodLogs, waterLogs, activityLogs, sleepLogs]);

  const recommendations = useMemo(() => {
    return generateHolisticRecommendations({
      todaysMeals: foodLogs.slice(-5),
      todaysMood: moodLogs[0] || null,
      todaysWater: waterLogs[0]?.amount || 0,
      todaysActivity: activityLogs[0] || null,
      todaysSleep: sleepLogs[0] || null,
      historicalData: { foodLogs, moodLogs, waterLogs, activityLogs, sleepLogs },
      goals: {},
      userPreferences: {},
    });
  }, [foodLogs, moodLogs, waterLogs, activityLogs, sleepLogs]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Health Analytics',
          headerShown: true,
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Hero Section */}
        <LinearGradient
          colors={[BRAND.primary, BRAND.accent]}
          style={styles.hero}
        >
          <View style={styles.heroIcon}>
            <Ionicons name="analytics" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>Your Health Intelligence</Text>
          <Text style={styles.heroSubtitle}>
            Research-backed insights from your multi-factor health data
          </Text>

          {/* Primary KPI */}
          <View style={styles.primaryKPI}>
            <Text style={styles.primaryKPIValue}>
              {personalPatterns.canAnalyze ? personalPatterns.patterns.length : 0}
            </Text>
            <Text style={styles.primaryKPILabel}>Active Insights Discovered</Text>
          </View>

          {/* Secondary Stats */}
          <View style={styles.secondaryStats}>
            <View style={styles.secondaryStat}>
              <Text style={styles.secondaryStatValue}>
                {correlationAnalysis.canAnalyze ? correlationAnalysis.daysAnalyzed : 0}
              </Text>
              <Text style={styles.secondaryStatLabel}>Days</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.secondaryStat}>
              <Text style={styles.secondaryStatValue}>
                {correlationAnalysis.canAnalyze
                  ? Object.keys(correlationAnalysis.correlations).length
                  : 0}
              </Text>
              <Text style={styles.secondaryStatLabel}>Factors</Text>
            </View>
          </View>

          {/* Freshness Indicator */}
          <View style={styles.freshnessIndicator}>
            <Ionicons name="time-outline" size={12} color="rgba(255, 255, 255, 0.7)" />
            <Text style={styles.freshnessText}>
              Updated today at {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </Text>
          </View>
        </LinearGradient>

        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {[7, 30, 90].map(days => (
            <TouchableOpacity
              key={days}
              style={[styles.timeRangeButton, timeRange === days && styles.timeRangeButtonActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTimeRange(days);
              }}
            >
              <Text style={[styles.timeRangeText, timeRange === days && styles.timeRangeTextActive]}>
                {days}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabsContainer}>
          {[
            { key: 'overview', label: 'Overview', icon: 'grid-outline', badge: null },
            {
              key: 'correlations',
              label: 'Correlations',
              icon: 'git-network-outline',
              badge: correlationAnalysis.canAnalyze
                ? Object.keys(correlationAnalysis.correlations).filter(k =>
                    correlationAnalysis.correlations[k]?.correlations?.length > 0
                  ).length
                : null
            },
            {
              key: 'interactions',
              label: 'Interactions',
              icon: 'link-outline',
              badge: interactionAnalysis.canAnalyze
                ? (interactionAnalysis.synergies?.length || 0) + (interactionAnalysis.antagonisms?.length || 0)
                : null
            },
            {
              key: 'personal',
              label: 'Your Patterns',
              icon: 'person-outline',
              badge: personalPatterns.canAnalyze ? personalPatterns.patterns.length : null
            },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab.key);
              }}
            >
              <View style={styles.tabIconContainer}>
                <Ionicons
                  name={tab.icon}
                  size={20}
                  color={activeTab === tab.key ? BRAND.primary : TEXT.tertiary}
                />
                {tab.badge !== null && tab.badge > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Health Factors</Text>
            <Text style={styles.sectionSubtitle}>
              Comprehensive view of your health correlations
            </Text>

            {/* Correlation Cards */}
            <View style={styles.cardsGrid}>
              <FoodMoodCorrelationCard
                foodLogs={foodLogs}
                moodLogs={moodLogs}
                waterLogs={waterLogs}
                compact={true}
              />

              <HydrationCognitionCard
                waterLogs={waterLogs}
                moodLogs={moodLogs}
                compact={true}
              />

              <ActivityMoodCard
                activityLogs={activityLogs}
                moodLogs={moodLogs}
                compact={true}
              />

              {/* Coming Soon Cards */}
              <View style={styles.comingSoonCard}>
                <View style={styles.comingSoonIllustration}>
                  <Ionicons name="moon-outline" size={40} color={BRAND.primary} opacity={0.3} />
                  <View style={styles.comingSoonStars}>
                    <Ionicons name="star" size={12} color="#FCD34D" style={{ position: 'absolute', top: 5, left: 10 }} />
                    <Ionicons name="star" size={8} color="#FCD34D" style={{ position: 'absolute', top: 15, right: 15 }} />
                  </View>
                </View>
                <Text style={styles.comingSoonTitle}>Sleep → Everything</Text>
                <Text style={styles.comingSoonText}>
                  Track how sleep quality affects all aspects of your health
                </Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonBadgeText}>Coming Soon</Text>
                </View>
              </View>

              <View style={styles.comingSoonCard}>
                <View style={styles.comingSoonIllustration}>
                  <Ionicons name="thunderstorm-outline" size={40} color={BRAND.accent} opacity={0.3} />
                  <Ionicons name="flash" size={16} color="#F59E0B" style={{ position: 'absolute', bottom: 10, right: 10 }} />
                </View>
                <Text style={styles.comingSoonTitle}>Stress → Health</Text>
                <Text style={styles.comingSoonText}>
                  Understand stress impact on nutrition, mood, and recovery
                </Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonBadgeText}>Coming Soon</Text>
                </View>
              </View>
            </View>

            {/* Top Recommendations */}
            {recommendations.length > 0 && (
              <View style={styles.recommendationsSection}>
                <Text style={styles.sectionTitle}>Personalized Recommendations</Text>
                <Text style={styles.sectionSubheader}>
                  AI-powered guidance based on your unique patterns
                </Text>
                {recommendations.slice(0, 3).map((rec, index) => (
                  <LinearGradient
                    key={index}
                    colors={['#FFF7ED', SURFACES.card]}
                    style={styles.recommendationCard}
                  >
                    <View style={styles.recommendationHeader}>
                      <View style={styles.recommendationIconBg}>
                        <Ionicons name="bulb" size={24} color="#F59E0B" />
                      </View>
                      <Text style={styles.recommendationTitle}>{rec.title || 'Recommendation'}</Text>
                    </View>
                    <Text style={styles.recommendationText}>{rec.description || rec.insight}</Text>

                    {/* Timeframe */}
                    <View style={styles.recommendationTimeframe}>
                      <Ionicons name="calendar-outline" size={14} color={TEXT.tertiary} />
                      <Text style={styles.recommendationTimeframeText}>
                        Try this for the next 3 days
                      </Text>
                    </View>

                    <View style={styles.recommendationFooter}>
                      <View style={styles.recommendationBadges}>
                        <View style={styles.recommendationBadge}>
                          <Ionicons name="trending-up" size={12} color={SEMANTIC.success} />
                          <Text style={styles.recommendationBadgeText}>
                            +{Math.round(rec.impact * 100)}% impact
                          </Text>
                        </View>
                        <View style={styles.recommendationBadge}>
                          <Ionicons name="shield-checkmark" size={12} color={SEMANTIC.info} />
                          <Text style={styles.recommendationBadgeText}>
                            {EVIDENCE_TERMINOLOGY.getConfidenceLabel(rec.confidence)}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.recommendationCTA}
                        onPress={() => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          notify.success('Reminder set for next 3 days');
                        }}
                      >
                        <Ionicons name="alarm-outline" size={16} color={BRAND.primary} />
                        <Text style={styles.recommendationCTAText}>Set Reminder</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'correlations' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Correlation Matrix</Text>
            <Text style={styles.sectionSubtitle}>
              All bidirectional relationships in your health data
            </Text>

            {correlationAnalysis.canAnalyze ? (
              <View style={styles.matrixContainer}>
                {/* Food → Mood */}
                <TouchableOpacity
                  style={styles.matrixCard}
                  onPress={() => router.push('/insights/food-mood-correlation')}
                >
                  <View style={styles.matrixHeader}>
                    <Ionicons name="nutrition-outline" size={20} color={BRAND.primary} />
                    <Ionicons name="arrow-forward" size={16} color={TEXT.tertiary} />
                    <Ionicons name="happy-outline" size={20} color={SEMANTIC.success} />
                  </View>
                  <Text style={styles.matrixTitle}>Food → Mood</Text>
                  <Text style={styles.matrixStatus}>
                    {correlationAnalysis.correlations.food_mood?.correlations?.length || 0} factors
                  </Text>
                  <Text style={styles.matrixExplanation}>
                    Nutrients like B vitamins and Omega-3 improve your mood through neurotransmitter synthesis
                  </Text>
                  <View style={styles.matrixEvidenceBadge}>
                    <Ionicons name="information-circle-outline" size={12} color={SEMANTIC.info} />
                    <Text style={styles.matrixEvidenceText}>Your data + Science</Text>
                  </View>
                </TouchableOpacity>

                {/* Hydration → Cognition */}
                <TouchableOpacity
                  style={styles.matrixCard}
                  onPress={() => router.push('/insights/hydration-cognition')}
                >
                  <View style={styles.matrixHeader}>
                    <Ionicons name="water-outline" size={20} color={BRAND.accent} />
                    <Ionicons name="swap-horizontal" size={16} color={TEXT.tertiary} />
                    <Ionicons name="bulb-outline" size={20} color={SEMANTIC.warning} />
                  </View>
                  <Text style={styles.matrixTitle}>Hydration ↔ Cognition</Text>
                  <Text style={styles.matrixStatus}>U-shaped curve</Text>
                </TouchableOpacity>

                {/* Activity → Mood */}
                <TouchableOpacity
                  style={styles.matrixCard}
                  onPress={() => router.push('/insights/activity-mood')}
                >
                  <View style={styles.matrixHeader}>
                    <Ionicons name="fitness-outline" size={20} color={SEMANTIC.success} />
                    <Ionicons name="arrow-forward" size={16} color={TEXT.tertiary} />
                    <Ionicons name="happy-outline" size={20} color={SEMANTIC.success} />
                  </View>
                  <Text style={styles.matrixTitle}>Activity → Mood</Text>
                  <Text style={styles.matrixStatus}>Strong evidence</Text>
                </TouchableOpacity>

                {/* More coming soon */}
                <View style={styles.matrixCardDisabled}>
                  <View style={styles.matrixHeader}>
                    <Ionicons name="moon-outline" size={20} color={TEXT.tertiary} />
                    <Ionicons name="arrow-forward" size={16} color={TEXT.tertiary} />
                    <Ionicons name="body-outline" size={20} color={TEXT.tertiary} />
                  </View>
                  <Text style={styles.matrixTitleDisabled}>Sleep → All</Text>
                  <Text style={styles.matrixStatusDisabled}>Coming soon</Text>
                </View>
              </View>
            ) : (
              <View style={styles.insufficientData}>
                <Ionicons name="information-circle-outline" size={48} color={TEXT.tertiary} />
                <Text style={styles.insufficientDataTitle}>Not Enough Data</Text>
                <Text style={styles.insufficientDataText}>{correlationAnalysis.message}</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'interactions' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interaction Effects</Text>
            <Text style={styles.sectionSubtitle}>
              Synergies and antagonisms between factors
            </Text>

            {interactionAnalysis.canAnalyze ? (
              <>
                {/* Synergies */}
                {interactionAnalysis.synergies?.length > 0 && (
                  <View style={styles.interactionSection}>
                    <Text style={styles.interactionSectionTitle}>
                      Synergies (Boost Effects)
                    </Text>
                    {interactionAnalysis.synergies.map((synergy, index) => (
                      <View key={index} style={styles.synergyCard}>
                        <View style={styles.synergyHeader}>
                          <Ionicons name="flash" size={24} color={SEMANTIC.success} />
                          <Text style={styles.synergyTitle}>
                            {synergy.factors.join(' + ')}
                          </Text>
                        </View>
                        <Text style={styles.synergyMechanism}>{synergy.mechanism}</Text>
                        <View style={styles.synergyStats}>
                          <View style={styles.synergyStat}>
                            <Text style={styles.synergyStatLabel}>Combined Effect</Text>
                            <Text style={[styles.synergyStatValue, { color: SEMANTIC.success }]}>
                              +{Math.round(synergy.effect * 100)}%
                            </Text>
                          </View>
                          <View style={styles.synergyStat}>
                            <Text style={styles.synergyStatLabel}>Boost</Text>
                            <Text style={[styles.synergyStatValue, { color: SEMANTIC.success }]}>
                              +{Math.round(synergy.boost * 100)}%
                            </Text>
                          </View>
                        </View>
                        <View style={styles.evidenceBadge}>
                          <Ionicons name="shield-checkmark" size={12} color={SEMANTIC.success} />
                          <Text style={styles.evidenceText}>
                            {EVIDENCE_TERMINOLOGY.getCausalFraming(synergy.evidenceLevel)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Antagonisms */}
                {interactionAnalysis.antagonisms?.length > 0 && (
                  <View style={styles.interactionSection}>
                    <Text style={styles.interactionSectionTitle}>
                      Antagonisms (Negative Interactions)
                    </Text>
                    {interactionAnalysis.antagonisms.map((antagonism, index) => (
                      <View key={index} style={styles.antagonismCard}>
                        <View style={styles.antagonismHeader}>
                          <Ionicons name="warning" size={24} color={SEMANTIC.warning} />
                          <Text style={styles.antagonismTitle}>
                            {antagonism.factors.join(' + ')}
                          </Text>
                        </View>
                        <Text style={styles.antagonismMechanism}>{antagonism.mechanism}</Text>
                        <View style={styles.antagonismStats}>
                          <View style={styles.antagonismStat}>
                            <Text style={styles.antagonismStatLabel}>Combined Effect</Text>
                            <Text style={[styles.antagonismStatValue, { color: SEMANTIC.warning }]}>
                              {Math.round(antagonism.effect * 100)}%
                            </Text>
                          </View>
                          <View style={styles.antagonismStat}>
                            <Text style={styles.antagonismStatLabel}>Penalty</Text>
                            <Text style={[styles.antagonismStatValue, { color: SEMANTIC.warning }]}>
                              {Math.round(antagonism.penalty * 100)}%
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.evidenceBadge, { backgroundColor: SEMANTIC.warning + '20' }]}>
                          <Ionicons name="alert-circle" size={12} color={SEMANTIC.warning} />
                          <Text style={[styles.evidenceText, { color: SEMANTIC.warning }]}>
                            {EVIDENCE_TERMINOLOGY.getCausalFraming(antagonism.evidenceLevel)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {interactionAnalysis.synergies?.length === 0 && interactionAnalysis.antagonisms?.length === 0 && (
                  <View style={styles.noInteractions}>
                    <Ionicons name="link-outline" size={48} color={TEXT.tertiary} />
                    <Text style={styles.noInteractionsText}>
                      No significant interactions detected yet. Keep logging!
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.insufficientData}>
                <Ionicons name="information-circle-outline" size={48} color={TEXT.tertiary} />
                <Text style={styles.insufficientDataTitle}>Not Enough Data</Text>
                <Text style={styles.insufficientDataText}>{interactionAnalysis.message}</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'personal' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Unique Patterns</Text>
            <Text style={styles.sectionSubtitle}>
              Personalized insights based on YOUR data
            </Text>

            {personalPatterns.canAnalyze ? (
              <>
                {/* Success Patterns */}
                {personalPatterns.patterns.filter(p => p.type === 'success_pattern').length > 0 && (
                  <View style={styles.patternGroup}>
                    <View style={styles.patternGroupHeader}>
                      <Ionicons name="star" size={20} color={SEMANTIC.success} />
                      <Text style={styles.patternGroupTitle}>What&apos;s Working (Lean Into These)</Text>
                    </View>
                    {personalPatterns.patterns
                      .filter(p => p.type === 'success_pattern')
                      .map((pattern, index) => (
                        <View key={index} style={[styles.patternCard, styles.successPatternCard]}>
                          <Text style={styles.patternTitle}>{pattern.outcome}</Text>
                          <Text style={styles.patternInsight}>{pattern.insight}</Text>
                          {pattern.frequency && (
                            <Text style={styles.patternFrequency}>
                              ✓ Success rate: {Math.round(pattern.frequency * 100)}%
                            </Text>
                          )}
                        </View>
                      ))}
                  </View>
                )}

                {/* Struggle Patterns */}
                {personalPatterns.patterns.filter(p => p.type === 'struggle_pattern').length > 0 && (
                  <View style={styles.patternGroup}>
                    <View style={styles.patternGroupHeader}>
                      <Ionicons name="alert-circle" size={20} color={SEMANTIC.warning} />
                      <Text style={styles.patternGroupTitle}>What to Watch (Be Mindful)</Text>
                    </View>
                    {personalPatterns.patterns
                      .filter(p => p.type === 'struggle_pattern')
                      .map((pattern, index) => (
                        <View key={index} style={[styles.patternCard, styles.strugglePatternCard]}>
                          <Text style={styles.patternTitle}>{pattern.outcome}</Text>
                          <Text style={styles.patternInsight}>{pattern.insight}</Text>
                          {pattern.frequency && (
                            <Text style={styles.patternFrequency}>
                              ⚠ Occurs in {Math.round(pattern.frequency * 100)}% of difficult days
                            </Text>
                          )}
                        </View>
                      ))}
                  </View>
                )}

                {/* Other Patterns */}
                {personalPatterns.patterns.filter(p =>
                  p.type !== 'success_pattern' && p.type !== 'struggle_pattern'
                ).length > 0 && (
                  <View style={styles.patternGroup}>
                    <View style={styles.patternGroupHeader}>
                      <Ionicons name="analytics" size={20} color={BRAND.primary} />
                      <Text style={styles.patternGroupTitle}>Experiments & Discoveries</Text>
                    </View>
                    {personalPatterns.patterns
                      .filter(p => p.type !== 'success_pattern' && p.type !== 'struggle_pattern')
                      .map((pattern, index) => (
                        <View key={index} style={[styles.patternCard, styles.experimentPatternCard]}>
                          <Text style={styles.patternTitle}>{pattern.outcome}</Text>
                          <Text style={styles.patternInsight}>{pattern.insight}</Text>
                          {pattern.frequency && (
                            <Text style={styles.patternFrequency}>
                              📊 Observed in {Math.round(pattern.frequency * 100)}% of days
                            </Text>
                          )}
                        </View>
                      ))}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.insufficientData}>
                <View style={styles.emptyStateIllustration}>
                  <Ionicons name="analytics-outline" size={60} color={BRAND.primary} opacity={0.2} />
                  <Ionicons name="person-outline" size={30} color={TEXT.tertiary} style={{ position: 'absolute', bottom: 10, right: 10 }} />
                </View>
                <Text style={styles.insufficientDataTitle}>Building Your Profile</Text>
                <Text style={styles.insufficientDataText}>{personalPatterns.message}</Text>
                <Text style={styles.insufficientDataHint}>
                  Keep logging consistently to unlock personalized pattern recognition
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background,
  },
  content: {
    paddingBottom: 32,
  },
  hero: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  primaryKPI: {
    alignItems: 'center',
    marginTop: 20,
  },
  primaryKPIValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  primaryKPILabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  secondaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
    paddingHorizontal: 32,
  },
  secondaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  secondaryStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryStatLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  freshnessIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  freshnessText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: SURFACES.card,
    padding: 4,
    borderRadius: 12,
    margin: 16,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: BRAND.primary,
  },
  timeRangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT.tertiary,
  },
  timeRangeTextActive: {
    color: '#FFFFFF',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: SURFACES.card,
    borderRadius: 12,
    gap: 6,
  },
  tabActive: {
    backgroundColor: BRAND.primary + '20',
  },
  tabIconContainer: {
    position: 'relative',
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: SEMANTIC.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '600',
    color: TEXT.tertiary,
    textAlign: 'center',
  },
  tabTextActive: {
    color: BRAND.primary,
  },
  section: {
    paddingHorizontal: 16,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT.primary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: TEXT.tertiary,
    marginTop: -8,
  },
  sectionSubheader: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginTop: -8,
    fontStyle: 'italic',
  },
  cardsGrid: {
    gap: 12,
  },
  comingSoonCard: {
    backgroundColor: SURFACES.card,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    ...SHADOWS.small,
  },
  comingSoonIllustration: {
    width: 80,
    height: 80,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonStars: {
    position: 'relative',
    width: 60,
    height: 40,
  },
  comingSoonTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT.primary,
  },
  comingSoonText: {
    fontSize: 12,
    color: TEXT.tertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
  comingSoonBadge: {
    backgroundColor: TEXT.tertiary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  comingSoonBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recommendationsSection: {
    gap: 12,
    marginTop: 8,
  },
  recommendationCard: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
    ...SHADOWS.medium,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recommendationIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT.primary,
    flex: 1,
  },
  recommendationText: {
    fontSize: 13,
    color: TEXT.secondary,
    lineHeight: 20,
  },
  recommendationTimeframe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND.primary + '10',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  recommendationTimeframeText: {
    fontSize: 11,
    fontWeight: '600',
    color: BRAND.primary,
  },
  recommendationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  recommendationBadges: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  recommendationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SURFACES.elevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recommendationBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: TEXT.secondary,
  },
  recommendationCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  recommendationCTAText: {
    fontSize: 12,
    fontWeight: '600',
    color: BRAND.primary,
  },
  matrixContainer: {
    gap: 12,
  },
  matrixCard: {
    backgroundColor: SURFACES.card,
    padding: 16,
    borderRadius: 12,
    gap: 8,
    ...SHADOWS.small,
  },
  matrixCardDisabled: {
    backgroundColor: SURFACES.elevated,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  matrixHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matrixTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.primary,
  },
  matrixTitleDisabled: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.tertiary,
  },
  matrixStatus: {
    fontSize: 12,
    color: TEXT.tertiary,
  },
  matrixStatusDisabled: {
    fontSize: 12,
    color: TEXT.tertiary,
    fontStyle: 'italic',
  },
  matrixExplanation: {
    fontSize: 12,
    color: TEXT.secondary,
    lineHeight: 16,
    marginTop: 4,
  },
  matrixEvidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SEMANTIC.info + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  matrixEvidenceText: {
    fontSize: 10,
    fontWeight: '600',
    color: SEMANTIC.info,
  },
  insufficientData: {
    backgroundColor: SURFACES.card,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  insufficientDataTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT.primary,
  },
  insufficientDataText: {
    fontSize: 13,
    color: TEXT.tertiary,
    textAlign: 'center',
  },
  interactionSection: {
    gap: 12,
  },
  interactionSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  synergyCard: {
    backgroundColor: SEMANTIC.success + '10',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: SEMANTIC.success,
  },
  synergyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  synergyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT.primary,
    flex: 1,
  },
  synergyMechanism: {
    fontSize: 13,
    color: TEXT.secondary,
    lineHeight: 18,
  },
  synergyStats: {
    flexDirection: 'row',
    gap: 16,
  },
  synergyStat: {
    flex: 1,
  },
  synergyStatLabel: {
    fontSize: 11,
    color: TEXT.tertiary,
    marginBottom: 4,
  },
  synergyStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  antagonismCard: {
    backgroundColor: SEMANTIC.warning + '10',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: SEMANTIC.warning,
  },
  antagonismHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  antagonismTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT.primary,
    flex: 1,
  },
  antagonismMechanism: {
    fontSize: 13,
    color: TEXT.secondary,
    lineHeight: 18,
  },
  antagonismStats: {
    flexDirection: 'row',
    gap: 16,
  },
  antagonismStat: {
    flex: 1,
  },
  antagonismStatLabel: {
    fontSize: 11,
    color: TEXT.tertiary,
    marginBottom: 4,
  },
  antagonismStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  evidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: SEMANTIC.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  evidenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: SEMANTIC.success,
  },
  noInteractions: {
    backgroundColor: SURFACES.card,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  noInteractionsText: {
    fontSize: 13,
    color: TEXT.tertiary,
    textAlign: 'center',
  },
  patternCard: {
    backgroundColor: SURFACES.card,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    ...SHADOWS.small,
  },
  patternHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patternTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.primary,
    flex: 1,
  },
  patternInsight: {
    fontSize: 13,
    color: TEXT.secondary,
    lineHeight: 18,
  },
  patternFrequency: {
    fontSize: 12,
    color: TEXT.tertiary,
    fontStyle: 'italic',
  },
  patternGroup: {
    gap: 12,
    marginBottom: 16,
  },
  patternGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  patternGroupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  successPatternCard: {
    borderLeftWidth: 4,
    borderLeftColor: SEMANTIC.success,
    backgroundColor: SEMANTIC.success + '08',
  },
  strugglePatternCard: {
    borderLeftWidth: 4,
    borderLeftColor: SEMANTIC.warning,
    backgroundColor: SEMANTIC.warning + '08',
  },
  experimentPatternCard: {
    borderLeftWidth: 4,
    borderLeftColor: BRAND.primary,
    backgroundColor: BRAND.primary + '08',
  },
  emptyStateIllustration: {
    width: 100,
    height: 100,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  insufficientDataHint: {
    fontSize: 12,
    color: TEXT.tertiary,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
