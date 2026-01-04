/**
 * Mood Insights Screen - Full Screen View
 * Personalized insights derived from user logs with share + filters.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import MoodInsightCard from '../../components/MoodTracker/MoodInsightCard';
import { useNotification } from '../../providers/NotificationProvider';
import apiClient from '../../services/apiClient';
import { getItem, setItem, STORAGE_KEYS } from '../../utils/storage';
import {
  TEXT,
  SEMANTIC,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SURFACES,
  BRAND,
  SHADOWS,
} from '../../constants/premiumTheme';

const DEFAULT_DAYS = 30;
const ALLOWED_DAYS = [7, 30, 90];

export default function MoodInsightsScreen() {
  const router = useRouter();
  const { days: daysParam } = useLocalSearchParams();
  const notify = useNotification();

  const [insightsDays, setInsightsDays] = useState(DEFAULT_DAYS);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [moodInsights, setMoodInsights] = useState([]);
  const [insightsMessage, setInsightsMessage] = useState(null);
  const [insightsError, setInsightsError] = useState(null);
  const [insightsMeta, setInsightsMeta] = useState({
    moods: 0,
    meals: 0,
    minMoods: 10,
    minMeals: 10,
    days: DEFAULT_DAYS,
    generatedAt: null,
    cached: false,
    cacheAge: null,
  });

  useEffect(() => {
    let isActive = true;
    const loadInitialDays = async () => {
      const savedDays = await getItem(STORAGE_KEYS.INSIGHTS_FILTER_DAYS);
      if (!isActive) return;

      if (ALLOWED_DAYS.includes(savedDays)) {
        setInsightsDays(savedDays);
      }
    };

    loadInitialDays();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const parsed = Number(daysParam);
    if (ALLOWED_DAYS.includes(parsed)) {
      setInsightsDays(parsed);
    }
  }, [daysParam]);

  useEffect(() => {
    setItem(STORAGE_KEYS.INSIGHTS_FILTER_DAYS, insightsDays);
  }, [insightsDays]);

  const loadMoodInsights = useCallback(async ({ days = insightsDays, forceRefresh = false } = {}) => {
    setInsightsLoading(true);
    setInsightsError(null);

    try {
      const response = await apiClient.post('/mood/insights', {
        days,
        forceRefresh,
      });

      setMoodInsights(response?.insights || []);

      const moodsCount = response?.dataPoints?.moods ?? response?.currentData?.moods ?? 0;
      const mealsCount = response?.dataPoints?.meals ?? response?.currentData?.meals ?? 0;
      const minMoods = response?.minDataRequired?.moods ?? 10;
      const minMeals = response?.minDataRequired?.meals ?? 10;
      setInsightsMeta({
        moods: moodsCount,
        meals: mealsCount,
        minMoods,
        minMeals,
        days,
        generatedAt: response?.generatedAt || null,
        cached: Boolean(response?.cached),
        cacheAge: response?.cacheAge ?? null,
      });

      if (response?.message) {
        if (response?.minDataRequired && response?.currentData) {
          const { moods, meals } = response.currentData;
          const { moods: minMoods, meals: minMeals } = response.minDataRequired;
          setInsightsMessage(
            `${response.message} (${moods}/${minMoods} mood logs, ${meals}/${minMeals} meals)`
          );
        } else {
          setInsightsMessage(response.message);
        }
      } else {
        setInsightsMessage(null);
      }
    } catch (err) {
      console.error('[MoodInsightsScreen] Failed to load insights:', err);
      setInsightsError('Unable to load insights right now. Please try again.');
    } finally {
      setInsightsLoading(false);
    }
  }, [insightsDays]);

  useEffect(() => {
    loadMoodInsights({ days: insightsDays });
  }, [insightsDays, loadMoodInsights]);

  const insightsCoverage = useMemo(() => {
    const moodProgress = insightsMeta.minMoods > 0
      ? Math.min(insightsMeta.moods / insightsMeta.minMoods, 1)
      : 1;
    const mealsProgress = insightsMeta.minMeals > 0
      ? Math.min(insightsMeta.meals / insightsMeta.minMeals, 1)
      : 1;
    return { moodProgress, mealsProgress };
  }, [insightsMeta]);

  const insightsUpdatedText = useMemo(() => {
    if (insightsMeta.cacheAge !== null && insightsMeta.cacheAge !== undefined) {
      return `Updated ${insightsMeta.cacheAge}m ago`;
    }

    if (insightsMeta.generatedAt) {
      const generatedAt = new Date(insightsMeta.generatedAt);
      if (!Number.isNaN(generatedAt.getTime())) {
        return `Updated ${generatedAt.toLocaleDateString()} ${generatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
    }

    return 'Updated recently';
  }, [insightsMeta]);

  const handleInsightsDaysChange = (days) => {
    setInsightsDays(days);
  };

  const handleShareInsights = async () => {
    if (!moodInsights.length && !insightsMessage) {
      notify.error('No insights to share yet.');
      return;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - insightsDays + 1);
    const dateRange = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    const header = `Mood Insights (${insightsDays} days)`;
    const coverage = `Data coverage: ${insightsMeta.moods}/${insightsMeta.minMoods}+ moods, ${insightsMeta.meals}/${insightsMeta.minMeals}+ meals`;
    const items = moodInsights.map((insight, index) => {
      const confidence = insight.confidence ? ` (${Math.round(insight.confidence * 100)}%)` : '';
      return `${index + 1}. ${insight.title}${confidence}\n${insight.message}`;
    });
    const highlights = items.length ? items.join('\n\n') : insightsMessage;
    const message = `${header}\n${dateRange}\n${coverage}\n\nHighlights\n${highlights}\n\nWhy this matters\nPatterns between mood and meals can help you make small changes with big impact.\n\nNext step\nPick one suggestion and try it for 3 days.`;

    try {
      await Share.share({ message });
    } catch (error) {
      console.error('[MoodInsightsScreen] Failed to share insights:', error);
      notify.error('Unable to share insights right now.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={TEXT.primary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Mood Insights</Text>
          <Text style={styles.headerSubtitle}>Personalized from your logs</Text>
        </View>
        <TouchableOpacity
          onPress={handleShareInsights}
          style={styles.shareButton}
          disabled={insightsLoading}
        >
          <Ionicons name="share-outline" size={20} color={TEXT.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.filterRow}>
          {ALLOWED_DAYS.map((days) => {
            const isActive = insightsDays === days;
            return (
              <TouchableOpacity
                key={days}
                style={styles.filterChip}
                onPress={() => handleInsightsDaysChange(days)}
              >
                {isActive ? (
                  <LinearGradient
                    colors={SURFACES.gradient.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.filterChipActive}
                  >
                    <Text style={[styles.filterChipText, styles.filterChipTextActive]}>
                      {days} days
                    </Text>
                  </LinearGradient>
                ) : (
                  <Text style={styles.filterChipText}>{days} days</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.summaryTitle}>Overview</Text>
              <Text style={styles.summaryMeta}>{insightsUpdatedText}</Text>
            </View>
            {insightsMeta.cached && (
              <Text style={styles.summaryBadge}>Cached</Text>
            )}
          </View>

          <View style={styles.coverageRow}>
            <View style={styles.coverageItem}>
              <View style={styles.coverageHeader}>
                <Text style={styles.coverageLabel}>Mood logs</Text>
                <Text style={styles.coverageValue}>
                  {insightsMeta.moods}/{insightsMeta.minMoods}+
                </Text>
              </View>
              <View style={styles.coverageBar}>
                <View style={[styles.coverageFill, { width: `${insightsCoverage.moodProgress * 100}%` }]} />
              </View>
            </View>

            <View style={styles.coverageItem}>
              <View style={styles.coverageHeader}>
                <Text style={styles.coverageLabel}>Meals</Text>
                <Text style={styles.coverageValue}>
                  {insightsMeta.meals}/{insightsMeta.minMeals}+
                </Text>
              </View>
              <View style={styles.coverageBar}>
                <View style={[styles.coverageFill, { width: `${insightsCoverage.mealsProgress * 100}%` }]} />
              </View>
            </View>
          </View>

          <View style={styles.summaryDivider} />
          <Text style={styles.summarySectionTitle}>Why this matters</Text>
          <Text style={styles.summaryText}>
            Patterns between mood and meals can highlight small changes that improve your day.
          </Text>
          <Text style={styles.summarySectionTitle}>Next step</Text>
          <Text style={styles.summaryText}>
            Pick one suggestion below and try it for 3 days, then check results.
          </Text>
        </View>

        {insightsError && <Text style={styles.errorText}>{insightsError}</Text>}

        <MoodInsightCard
          insights={moodInsights}
          loading={insightsLoading}
          onRefresh={() => loadMoodInsights({ forceRefresh: true })}
          minDataMessage={insightsMessage}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[6],
    paddingBottom: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    backgroundColor: SURFACES.background.primary,
  },
  backButton: {
    padding: SPACING[2],
  },
  headerText: {
    flex: 1,
    marginLeft: SPACING[2],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  shareButton: {
    padding: SPACING[2],
  },
  scrollContent: {
    padding: SPACING[4],
    paddingBottom: SPACING[8],
  },
  filterRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginBottom: SPACING[4],
  },
  filterChip: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: SURFACES.background.secondary,
    overflow: 'hidden',
  },
  filterChipActive: {
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.full,
  },
  filterChipText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.semibold,
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[3],
  },
  filterChipTextActive: {
    color: TEXT.white,
  },
  summaryCard: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOWS.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[3],
  },
  summaryTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  summaryMeta: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: SPACING[0.5],
  },
  summaryBadge: {
    fontSize: TYPOGRAPHY.size.xs,
    color: SEMANTIC.info.base,
    backgroundColor: `${SEMANTIC.info.base}15`,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.full,
  },
  coverageRow: {
    gap: SPACING[3],
  },
  coverageItem: {
    gap: SPACING[2],
  },
  coverageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coverageLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  coverageValue: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.primary,
  },
  coverageBar: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  coverageFill: {
    height: '100%',
    backgroundColor: BRAND.primary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: SPACING[3],
  },
  summarySectionTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginTop: SPACING[1],
  },
  summaryText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    marginTop: SPACING[1],
    lineHeight: 16,
  },
  errorText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: SEMANTIC.danger.base,
    marginBottom: SPACING[3],
  },
});
