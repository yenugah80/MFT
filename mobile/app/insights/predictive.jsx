/**
 * Predictive Insights Screen - Real Data Only
 *
 * Features:
 * - Tab-based navigation (Energy, Mood, Nutrients)
 * - Only shows real data from API
import { TYPOGRAPHY } from '../../constants/premiumTheme';
 * - Proper "awaiting data" state when no predictions available
 * - Horizontal carousel for discovered patterns
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
  TouchableOpacity,
  Dimensions,
  FlatList,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useNotification } from '../../providers/NotificationProvider';
import FadeInView from '../../components/FadeInView';
import { usePredictiveInsights, useCorrelations } from '../../hooks/useInsights';

import {
  PREMIUM_COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../../constants/premiumDesignSystem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Tab configurations
const PREDICTION_TABS = [
  { key: 'energy', label: 'Energy', icon: 'flash', color: '#F59E0B', gradient: ['#F59E0B', '#D97706'] },
  { key: 'mood', label: 'Mood', icon: 'happy', color: '#8B5CF6', gradient: ['#8B5CF6', '#7C3AED'] },
  { key: 'nutrient', label: 'Nutrients', icon: 'nutrition', color: '#10B981', gradient: ['#10B981', '#059669'] },
];

// ============================================================================
// COMPACT SUMMARY PILLS
// ============================================================================

function PredictionPill({ tab, prediction, isActive, onPress }) {
  const hasData = prediction && (prediction.statement || prediction.confidence);
  // Backend returns confidence as 0-100, not 0-1
  const rawConfidence = prediction?.confidence || 0;
  const confidence = rawConfidence > 1 ? Math.round(rawConfidence) : Math.round(rawConfidence * 100);

  return (
    <TouchableOpacity
      style={[
        styles.pill,
        isActive && styles.pillActive,
        isActive && { borderColor: tab.color },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.pillIcon, { backgroundColor: `${tab.color}15` }]}>
        <Ionicons name={tab.icon} size={16} color={tab.color} />
      </View>
      <View style={styles.pillContent}>
        <Text style={[styles.pillLabel, isActive && { color: tab.color }]}>
          {tab.label}
        </Text>
        {hasData && confidence > 0 ? (
          <Text style={[styles.pillConfidence, { color: tab.color }]}>{confidence}%</Text>
        ) : (
          <Text style={styles.pillNoData}>Awaiting</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// MINI BAR CHART (for real data only)
// ============================================================================

function MiniBarChart({ data, color }) {
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data, 1);

  return (
    <View style={styles.miniChart}>
      {data.map((val, idx) => (
        <View key={idx} style={styles.miniBarWrapper}>
          <View
            style={[
              styles.miniBar,
              {
                height: `${(val / maxVal) * 100}%`,
                backgroundColor: val === Math.min(...data) ? '#EF4444' : color,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// NO DATA STATE COMPONENT
// ============================================================================

function NoDataState({ type, color }) {
  const messages = {
    energy: {
      title: 'Energy Prediction',
      message: 'Log meals and mood for 7+ days to see your energy patterns',
      icon: 'flash-outline',
    },
    mood: {
      title: 'Mood Patterns',
      message: 'Track your mood after meals to discover food-mood connections',
      icon: 'happy-outline',
    },
    nutrient: {
      title: 'Nutrient Trajectory',
      message: 'Log more meals to see your nutrient projections',
      icon: 'nutrition-outline',
    },
  };

  const config = messages[type] || messages.energy;

  return (
    <View style={styles.noDataCard}>
      <View style={[styles.noDataIconContainer, { backgroundColor: `${color}10` }]}>
        <Ionicons name={config.icon} size={32} color={color} />
      </View>
      <Text style={styles.noDataTitle}>{config.title}</Text>
      <Text style={styles.noDataMessage}>{config.message}</Text>
      <View style={styles.noDataTips}>
        <View style={styles.tipRow}>
          <Ionicons name="time-outline" size={14} color={PREMIUM_COLORS.text.tertiary} />
          <Text style={styles.tipText}>Requires 7+ days of data</Text>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// PREDICTION DETAIL CARDS (Real Data Only)
// ============================================================================

function EnergyDetailCard({ prediction, dataPoints }) {
  const hasData = prediction && prediction.hourlyLevels;

  if (!hasData) {
    return <NoDataState type="energy" color="#F59E0B" />;
  }

  // Backend returns 24 hourly values, extract 7 key hours (8am-8pm every 2 hours)
  const fullHourlyLevels = prediction.hourlyLevels || [];
  const keyHours = [8, 10, 12, 14, 16, 18, 20];
  const hourlyLevels = fullHourlyLevels.length === 24
    ? keyHours.map(h => fullHourlyLevels[h] || 0)
    : fullHourlyLevels.slice(0, 7);
  const times = ['8a', '10a', '12p', '2p', '4p', '6p', '8p'];
  const minIdx = hourlyLevels.indexOf(Math.min(...hourlyLevels));
  const dipTime = times[minIdx] || '2p';

  return (
    <View style={styles.detailCard}>
      <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.detailHeader}>
        <View style={styles.detailHeaderContent}>
          <Ionicons name="flash" size={20} color="#FFF" />
          <Text style={styles.detailHeaderTitle}>Energy Forecast</Text>
        </View>
        <Text style={styles.detailHeaderBadge}>{dataPoints || 0} days</Text>
      </LinearGradient>

      <View style={styles.detailBody}>
        <Text style={styles.detailStatement}>
          {prediction.statement}
        </Text>

        {/* Visual Bar Chart - Real Data */}
        <View style={styles.chartSection}>
          <View style={styles.chartLabels}>
            {times.map((t, i) => (
              <Text key={i} style={[styles.chartLabel, i === minIdx && styles.chartLabelHighlight]}>{t}</Text>
            ))}
          </View>
          <MiniBarChart data={hourlyLevels} color="#F59E0B" />
        </View>

        {/* Dip Alert */}
        <View style={styles.alertBadge}>
          <Ionicons name="arrow-down" size={14} color="#D97706" />
          <Text style={styles.alertText}>Energy dip expected around {dipTime}</Text>
        </View>

        {/* Suggestion */}
        {prediction.suggestion && (
          <View style={styles.suggestionBox}>
            <Ionicons name="bulb" size={16} color="#F59E0B" />
            <Text style={styles.suggestionText}>{prediction.suggestion}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function MoodDetailCard({ prediction, dataPoints }) {
  const hasData = prediction && (prediction.moodScores || prediction.statement);

  if (!hasData) {
    return <NoDataState type="mood" color="#8B5CF6" />;
  }

  const moodScores = prediction.moodScores || [];
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <View style={styles.detailCard}>
      <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.detailHeader}>
        <View style={styles.detailHeaderContent}>
          <Ionicons name="happy" size={20} color="#FFF" />
          <Text style={styles.detailHeaderTitle}>Mood Patterns</Text>
        </View>
        <Text style={styles.detailHeaderBadge}>{dataPoints || 0} days</Text>
      </LinearGradient>

      <View style={styles.detailBody}>
        <Text style={styles.detailStatement}>
          {prediction.statement}
        </Text>

        {/* Visual Bar Chart - Real Data */}
        {moodScores.length > 0 && (
          <View style={styles.chartSection}>
            <View style={styles.chartLabels}>
              {days.slice(0, moodScores.length).map((d, i) => (
                <Text key={i} style={styles.chartLabel}>{d}</Text>
              ))}
            </View>
            <MiniBarChart data={moodScores} color="#8B5CF6" />
          </View>
        )}

        {/* Correlation Insight */}
        {prediction.factor && (
          <View style={[styles.alertBadge, { backgroundColor: '#F5F3FF' }]}>
            <View style={[styles.correlationDot, { backgroundColor: '#8B5CF6' }]} />
            <Text style={[styles.alertText, { color: '#6D28D9' }]}>
              {prediction.factor} → {prediction.percentage}% mood impact
            </Text>
          </View>
        )}

        {/* Suggestion */}
        {prediction.suggestion && (
          <View style={styles.suggestionBox}>
            <Ionicons name="bulb" size={16} color="#8B5CF6" />
            <Text style={styles.suggestionText}>{prediction.suggestion}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function NutrientDetailCard({ prediction, dataPoints }) {
  const hasData = prediction && prediction.nutrients && prediction.nutrients.length > 0;

  if (!hasData) {
    return <NoDataState type="nutrient" color="#10B981" />;
  }

  const nutrients = prediction.nutrients;

  return (
    <View style={styles.detailCard}>
      <LinearGradient colors={['#10B981', '#059669']} style={styles.detailHeader}>
        <View style={styles.detailHeaderContent}>
          <Ionicons name="nutrition" size={20} color="#FFF" />
          <Text style={styles.detailHeaderTitle}>Nutrient Trajectory</Text>
        </View>
        <Text style={styles.detailHeaderBadge}>7-day</Text>
      </LinearGradient>

      <View style={styles.detailBody}>
        <Text style={styles.detailStatement}>
          {prediction.statement}
        </Text>

        {/* Nutrient Bars - Real Data */}
        <View style={styles.nutrientList}>
          {nutrients.slice(0, 3).map((nutrient, idx) => {
            const isAtRisk = nutrient.projected < 80;
            return (
              <View key={idx} style={styles.nutrientItem}>
                <View style={styles.nutrientHeader}>
                  <Text style={styles.nutrientName}>{nutrient.name}</Text>
                  <Text style={[styles.nutrientValue, { color: isAtRisk ? '#F59E0B' : '#10B981' }]}>
                    {nutrient.projected}%
                  </Text>
                </View>
                <View style={styles.nutrientBar}>
                  <View
                    style={[
                      styles.nutrientFill,
                      {
                        width: `${nutrient.projected}%`,
                        backgroundColor: isAtRisk ? '#F59E0B' : '#10B981'
                      }
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* Suggestion */}
        {prediction.suggestion && (
          <View style={styles.suggestionBox}>
            <Ionicons name="bulb" size={16} color="#10B981" />
            <Text style={styles.suggestionText}>{prediction.suggestion}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// CORRELATION CHIP (for horizontal scroll)
// ============================================================================

function CorrelationChip({ correlation, onPress }) {
  const isPositive = correlation.type !== 'negative';
  const color = isPositive ? '#10B981' : '#EF4444';
  const bgColor = isPositive ? '#D1FAE5' : '#FEE2E2';

  return (
    <TouchableOpacity
      style={[styles.correlationChip, { backgroundColor: bgColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.correlationChipHeader}>
        <Ionicons
          name={isPositive ? 'trending-up' : 'trending-down'}
          size={14}
          color={color}
        />
        <Text style={[styles.correlationChipConfidence, { color }]}>
          {Math.round((correlation.confidence || 0) * 100)}%
        </Text>
      </View>
      <Text style={styles.correlationChipPattern} numberOfLines={2}>
        {correlation.pattern || 'Pattern discovered'}
      </Text>
      {correlation.explanation && (
        <Text style={styles.correlationChipExplanation} numberOfLines={1}>
          {correlation.explanation}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PredictiveInsightsScreen() {
  const router = useRouter();
  const notify = useNotification();

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('energy');

  // Fetch real data from API
  const {
    energyPrediction,
    moodPrediction,
    nutrientPrediction,
    dataPoints,
    isLoading: predictionsLoading,
    refetch: refetchPredictions,
  } = usePredictiveInsights({ enabled: true });

  const {
    correlations,
    isLoading: correlationsLoading,
    refetch: refetchCorrelations,
  } = useCorrelations({ enabled: true, limit: 5 });

  const isLoading = predictionsLoading || correlationsLoading;

  // Map predictions to tabs
  const predictions = useMemo(() => ({
    energy: energyPrediction,
    mood: moodPrediction,
    nutrient: nutrientPrediction,
  }), [energyPrediction, moodPrediction, nutrientPrediction]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetchPredictions(), refetchCorrelations()]);
    setRefreshing(false);
  }, [refetchPredictions, refetchCorrelations]);

  const handleTabPress = useCallback((tabKey) => {
    Haptics.selectionAsync();
    setActiveTab(tabKey);
  }, []);

  const handleCorrelationPress = useCallback((correlation) => {
    notify.info(`${correlation.pattern || 'Pattern'} details`);
  }, [notify]);

  // Render the active detail card
  const renderDetailCard = () => {
    switch (activeTab) {
      case 'energy':
        return <EnergyDetailCard prediction={energyPrediction} dataPoints={dataPoints} />;
      case 'mood':
        return <MoodDetailCard prediction={moodPrediction} dataPoints={dataPoints} />;
      case 'nutrient':
        return <NutrientDetailCard prediction={nutrientPrediction} dataPoints={dataPoints} />;
      default:
        return null;
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Predictions',
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
          {/* Compact Header */}
          <FadeInView animation="fadeIn" delay={0}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Your Forecast</Text>
              <View style={styles.headerMeta}>
                <Ionicons name="calendar-outline" size={14} color={PREMIUM_COLORS.text.tertiary} />
                <Text style={styles.headerSubtitle}>
                  Based on {dataPoints || 0} days of data
                </Text>
              </View>
            </View>
          </FadeInView>

          {/* Loading State */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={PREMIUM_COLORS.brand.primary} />
              <Text style={styles.loadingText}>Analyzing patterns...</Text>
            </View>
          )}

          {/* Tab Pills */}
          {!isLoading && (
            <FadeInView animation="fadeIn" delay={100}>
              <View style={styles.tabsContainer}>
                {PREDICTION_TABS.map((tab) => (
                  <PredictionPill
                    key={tab.key}
                    tab={tab}
                    prediction={predictions[tab.key]}
                    isActive={activeTab === tab.key}
                    onPress={() => handleTabPress(tab.key)}
                  />
                ))}
              </View>
            </FadeInView>
          )}

          {/* Active Detail Card */}
          {!isLoading && (
            <FadeInView animation="floatIn" delay={200}>
              <View style={styles.detailSection}>
                {renderDetailCard()}
              </View>
            </FadeInView>
          )}

          {/* Discovered Patterns - Horizontal Scroll */}
          {!isLoading && correlations.length > 0 && (
            <FadeInView animation="fadeIn" delay={300}>
              <View style={styles.patternsSection}>
                <Text style={styles.sectionTitle}>Discovered Patterns</Text>
                <FlatList
                  horizontal
                  data={correlations}
                  keyExtractor={(item, idx) => item.id || `correlation-${idx}`}
                  renderItem={({ item }) => (
                    <CorrelationChip
                      correlation={item}
                      onPress={() => handleCorrelationPress(item)}
                    />
                  )}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.patternsList}
                  ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                />
              </View>
            </FadeInView>
          )}

          {/* Footer Note */}
          <View style={styles.footerNote}>
            <Ionicons name="shield-checkmark" size={14} color={PREMIUM_COLORS.text.muted} />
            <Text style={styles.footerText}>
              Predictions improve with more data
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PREMIUM_COLORS.surface.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING[4],
    paddingBottom: SPACING[8],
  },

  // Header
  header: {
    marginBottom: SPACING[4],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.title2,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: PREMIUM_COLORS.text.primary,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    marginTop: SPACING[1],
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.tertiary,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[10],
  },
  loadingText: {
    marginTop: SPACING[3],
    fontSize: TYPOGRAPHY.size.subhead,
    color: PREMIUM_COLORS.text.secondary,
  },

  // Tab Pills
  tabsContainer: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginBottom: SPACING[4],
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING[2],
    backgroundColor: PREMIUM_COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pillActive: {
    backgroundColor: PREMIUM_COLORS.surface.primary,
    ...SHADOWS.sm,
  },
  pillIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillContent: {
    marginLeft: SPACING[2],
    flex: 1,
  },
  pillLabel: {
    fontSize: TYPOGRAPHY.size.footnote,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: PREMIUM_COLORS.text.secondary,
  },
  pillConfidence: {
    fontSize: TYPOGRAPHY.size.caption,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  pillNoData: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.muted,
    fontStyle: 'italic',
  },

  // Detail Card
  detailSection: {
    marginBottom: SPACING[5],
  },
  detailCard: {
    backgroundColor: PREMIUM_COLORS.surface.primary,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border.light,
    ...SHADOWS.md,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
  },
  detailHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  detailHeaderTitle: {
    fontSize: TYPOGRAPHY.size.headline,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#FFFFFF',
  },
  detailHeaderBadge: {
    fontSize: TYPOGRAPHY.size.caption,
    color: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  detailBody: {
    padding: SPACING[4],
  },
  detailStatement: {
    fontSize: TYPOGRAPHY.size.subhead,
    color: PREMIUM_COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.size.subhead * 1.4,
    marginBottom: SPACING[4],
  },

  // No Data State
  noDataCard: {
    backgroundColor: PREMIUM_COLORS.surface.secondary,
    borderRadius: RADIUS.xl,
    padding: SPACING[6],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border.light,
    borderStyle: 'dashed',
  },
  noDataIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[3],
  },
  noDataTitle: {
    fontSize: TYPOGRAPHY.size.headline,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: PREMIUM_COLORS.text.primary,
    marginBottom: SPACING[2],
  },
  noDataMessage: {
    fontSize: TYPOGRAPHY.size.subhead,
    color: PREMIUM_COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.size.subhead * 1.4,
    marginBottom: SPACING[3],
  },
  noDataTips: {
    gap: SPACING[2],
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  tipText: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.muted,
  },

  // Mini Chart
  chartSection: {
    marginBottom: SPACING[3],
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING[1],
  },
  chartLabel: {
    fontSize: 10,
    color: PREMIUM_COLORS.text.muted,
    textAlign: 'center',
    flex: 1,
  },
  chartLabelHighlight: {
    color: '#EF4444',
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  miniChart: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: PREMIUM_COLORS.surface.secondary,
    borderRadius: RADIUS.md,
    padding: SPACING[2],
  },
  miniBarWrapper: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 2,
  },
  miniBar: {
    width: '80%',
    borderRadius: 4,
    minHeight: 4,
  },

  // Alert Badge
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    backgroundColor: '#FEF3C7',
    borderRadius: RADIUS.md,
    marginBottom: SPACING[3],
  },
  alertText: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: '#D97706',
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  correlationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Suggestion Box
  suggestionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
    padding: SPACING[3],
    backgroundColor: PREMIUM_COLORS.surface.secondary,
    borderRadius: RADIUS.md,
  },
  suggestionText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.size.footnote * 1.4,
  },

  // Nutrient List
  nutrientList: {
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  nutrientItem: {
    gap: SPACING[1],
  },
  nutrientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nutrientName: {
    fontSize: TYPOGRAPHY.size.footnote,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: PREMIUM_COLORS.text.primary,
  },
  nutrientValue: {
    fontSize: TYPOGRAPHY.size.footnote,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  nutrientBar: {
    height: 6,
    backgroundColor: PREMIUM_COLORS.border.light,
    borderRadius: 3,
    overflow: 'hidden',
  },
  nutrientFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Patterns Section
  patternsSection: {
    marginBottom: SPACING[4],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.subhead,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: PREMIUM_COLORS.text.primary,
    marginBottom: SPACING[3],
  },
  patternsList: {
    paddingRight: SPACING[4],
  },
  correlationChip: {
    width: 160,
    padding: SPACING[3],
    borderRadius: RADIUS.lg,
  },
  correlationChipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[1],
  },
  correlationChipConfidence: {
    fontSize: TYPOGRAPHY.size.caption,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  correlationChipPattern: {
    fontSize: TYPOGRAPHY.size.footnote,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: PREMIUM_COLORS.text.primary,
    marginBottom: SPACING[1],
  },
  correlationChipExplanation: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.tertiary,
  },

  // Footer Note
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingTop: SPACING[4],
  },
  footerText: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.muted,
  },
});
