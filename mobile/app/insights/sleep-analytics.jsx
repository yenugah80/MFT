/**
 * Sleep Analytics Screen
 *
 * Detailed view of sleep patterns with:
 * - Sleep quality trends
 * - Duration tracking
 * - Context tag analysis
 * - Tips for better sleep
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  SURFACES,
  SHADOWS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SEMANTIC,
  VIBRANT_WELLNESS,
} from '../../constants/premiumTheme';
import { useSleepLog, SLEEP_QUALITY_LABELS, SLEEP_CONTEXT_TAGS } from '../../hooks/useSleepLog';

export default function SleepAnalyticsScreen() {
  const router = useRouter();
  const {
    sleepLogs,
    lastSleep,
    trends,
    isLoading,
    refetch,
  } = useSleepLog();

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  // Calculate stats
  const avgDuration = trends?.avgDuration || 0;
  const avgQuality = trends?.avgQuality || 0;
  const consistencyScore = trends?.consistencyScore || 0;
  const tagImpacts = trends?.tagImpacts || [];

  // Format duration
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  // Get quality label
  const getQualityLabel = (quality) => {
    const label = SLEEP_QUALITY_LABELS.find(l => l.value === Math.round(quality));
    return label || SLEEP_QUALITY_LABELS[6];
  };

  const qualityLabel = getQualityLabel(avgQuality);

  // Get sleep status
  const getSleepStatus = () => {
    if (avgDuration < 360) return { text: 'Get More Rest', color: SEMANTIC.warning.base };
    if (avgDuration >= 420 && avgDuration <= 540) return { text: 'Great Sleep', color: SEMANTIC.success.base };
    return { text: 'Good Sleep', color: SEMANTIC.success.base };
  };

  const sleepStatus = getSleepStatus();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[VIBRANT_WELLNESS.sleep.solid, `${VIBRANT_WELLNESS.sleep.solid}CC`]}
        style={styles.header}
      >
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="moon" size={32} color="#FFF" />
          <Text style={styles.headerTitle}>Sleep Analytics</Text>
          <Text style={styles.headerSubtitle}>Your sleep patterns</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={VIBRANT_WELLNESS.sleep.solid}
          />
        }
      >
        {/* Overview Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={24} color={VIBRANT_WELLNESS.sleep.solid} />
              <Text style={styles.statValue}>{formatDuration(avgDuration)}</Text>
              <Text style={styles.statLabel}>Avg Duration</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name={qualityLabel.icon} size={24} color={qualityLabel.color} />
              <Text style={styles.statValue}>{avgQuality.toFixed(1)}/10</Text>
              <Text style={styles.statLabel}>Avg Quality</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="calendar-outline" size={24} color={SEMANTIC.info.base} />
              <Text style={styles.statValue}>{consistencyScore}%</Text>
              <Text style={styles.statLabel}>Consistency</Text>
            </View>
          </View>
        </View>

        {/* Status Card */}
        <View style={[styles.statusCard, { borderLeftColor: sleepStatus.color }]}>
          <View style={styles.statusContent}>
            <Ionicons name="checkmark-circle" size={28} color={sleepStatus.color} />
            <View style={styles.statusText}>
              <Text style={[styles.statusTitle, { color: sleepStatus.color }]}>
                {sleepStatus.text}
              </Text>
              <Text style={styles.statusDescription}>
                Based on your last 7 days of sleep
              </Text>
            </View>
          </View>
        </View>

        {/* What Affects Your Sleep */}
        {tagImpacts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What Affects Your Sleep</Text>
            <View style={styles.impactsList}>
              {tagImpacts.slice(0, 4).map((impact, index) => {
                const tag = SLEEP_CONTEXT_TAGS.find(t => t.key === impact.tag);
                const isPositive = impact.qualityDiff > 0;
                return (
                  <View key={index} style={styles.impactItem}>
                    <View style={[
                      styles.impactIcon,
                      { backgroundColor: isPositive ? `${SEMANTIC.success.base}15` : `${SEMANTIC.warning.base}15` }
                    ]}>
                      <Ionicons
                        name={tag?.icon || 'help'}
                        size={20}
                        color={isPositive ? SEMANTIC.success.base : SEMANTIC.warning.base}
                      />
                    </View>
                    <View style={styles.impactContent}>
                      <Text style={styles.impactLabel}>{tag?.label || impact.tag}</Text>
                      <Text style={[
                        styles.impactValue,
                        { color: isPositive ? SEMANTIC.success.base : SEMANTIC.warning.base }
                      ]}>
                        {isPositive ? '+' : ''}{impact.qualityDiff.toFixed(1)} quality
                      </Text>
                    </View>
                    <Ionicons
                      name={isPositive ? 'trending-up' : 'trending-down'}
                      size={20}
                      color={isPositive ? SEMANTIC.success.base : SEMANTIC.warning.base}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Recent Sleep */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Sleep</Text>
          {sleepLogs?.slice(0, 5).map((log, index) => {
            const quality = getQualityLabel(log.quality);
            return (
              <View key={log.id || index} style={styles.logItem}>
                <View style={styles.logDate}>
                  <Text style={styles.logDateText}>
                    {new Date(log.sleepDate || log.createdAt).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.logDetails}>
                  <Text style={styles.logDuration}>{formatDuration(log.durationMinutes)}</Text>
                  <View style={[styles.qualityBadge, { backgroundColor: `${quality.color}15` }]}>
                    <Ionicons name={quality.icon} size={14} color={quality.color} />
                    <Text style={[styles.qualityText, { color: quality.color }]}>
                      {log.quality}/10
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Tips Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tips for Better Sleep</Text>
          <View style={styles.tipCard}>
            <Ionicons name="bulb" size={20} color={VIBRANT_WELLNESS.sleep.solid} />
            <Text style={styles.tipText}>
              Keep a consistent bedtime to improve your sleep quality and wake up feeling refreshed.
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Ionicons name="bulb" size={20} color={VIBRANT_WELLNESS.sleep.solid} />
            <Text style={styles.tipText}>
              Avoid screens 30 minutes before bed - the blue light can make it harder to fall asleep.
            </Text>
          </View>
        </View>

        {/* Deep Analytics CTA */}
        <TouchableOpacity
          style={styles.deepAnalyticsCta}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/insights/sleep-deep');
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[VIBRANT_WELLNESS.sleep.solid, `${VIBRANT_WELLNESS.sleep.solid}CC`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.deepAnalyticsGradient}
          >
            <View style={styles.deepAnalyticsContent}>
              <View style={styles.deepAnalyticsIcon}>
                <Ionicons name="analytics" size={24} color={VIBRANT_WELLNESS.sleep.solid} />
              </View>
              <View style={styles.deepAnalyticsText}>
                <Text style={styles.deepAnalyticsTitle}>Deep Analytics</Text>
                <Text style={styles.deepAnalyticsSub}>Enhanced visualizations & detailed breakdowns</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },

  // Header
  header: {
    paddingTop: SPACING[2],
    paddingBottom: SPACING[5],
    paddingHorizontal: SPACING[4],
  },
  backButton: {
    padding: SPACING[2],
    marginLeft: -SPACING[2],
    marginBottom: SPACING[2],
  },
  headerContent: {
    alignItems: 'center',
    gap: SPACING[2],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING[4],
    paddingBottom: SPACING[8],
  },

  // Sections
  section: {
    marginBottom: SPACING[5],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[3],
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  statCard: {
    flex: 1,
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    alignItems: 'center',
    gap: SPACING[2],
    ...SHADOWS.sm,
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textAlign: 'center',
  },

  // Status Card
  statusCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    borderLeftWidth: 4,
    padding: SPACING[4],
    marginBottom: SPACING[5],
    ...SHADOWS.sm,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  statusDescription: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: 2,
  },

  // Impacts List
  impactsList: {
    gap: SPACING[2],
  },
  impactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.md,
    padding: SPACING[3],
    gap: SPACING[3],
    ...SHADOWS.sm,
  },
  impactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  impactContent: {
    flex: 1,
  },
  impactLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
  },
  impactValue: {
    fontSize: TYPOGRAPHY.size.xs,
    marginTop: 2,
  },

  // Log Items
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.md,
    padding: SPACING[3],
    marginBottom: SPACING[2],
    ...SHADOWS.sm,
  },
  logDate: {
    flex: 1,
  },
  logDateText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.primary,
  },
  logDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  logDuration: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
  },
  qualityText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },

  // Tips
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
    backgroundColor: `${VIBRANT_WELLNESS.sleep.solid}10`,
    padding: SPACING[3],
    borderRadius: RADIUS.md,
    marginBottom: SPACING[2],
  },
  tipText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
  },

  // Deep Analytics CTA
  deepAnalyticsCta: {
    marginBottom: SPACING[4],
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  deepAnalyticsGradient: {
    padding: SPACING[4],
  },
  deepAnalyticsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  deepAnalyticsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deepAnalyticsText: {
    flex: 1,
  },
  deepAnalyticsTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFF',
  },
  deepAnalyticsSub: {
    fontSize: TYPOGRAPHY.size.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
});
