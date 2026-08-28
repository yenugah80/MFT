import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import {
  RADIUS,
  SHADOWS,
  SPACING,
  SURFACES,
  TEXT,
  TYPOGRAPHY,
} from '../../constants/premiumTheme';
import { getQualityColor, getQualityLabel, SLEEP_CONTEXT_TAGS } from '../../hooks/useSleepLog';
import {
  COPING_STRATEGIES,
  getStressColor,
  getStressLevel,
  PHYSICAL_SYMPTOMS,
  STRESS_TRIGGERS,
} from '../../hooks/useStressLog';
import SleepLogger from '../SleepLogger';
import StressLogger from '../StressLogger';

const RANGES = [7, 30, 90];

const formatDay = (dateKey, options = {}) => {
  if (!dateKey) return '';
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('en-US', options);
};

const formatTime = (value) => value
  ? new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  : '—';

const durationLabel = (minutes = 0) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

function MetricCard({ icon, value, label, accent }) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: `${accent}14` }]}>
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function TrendChart({ entries, type, accent }) {
  const visible = entries.slice(-14);
  const max = type === 'sleep' ? 10 : 10;

  if (!visible.length) return null;

  return (
    <View style={styles.chartCard}>
      <View style={styles.sectionHeadingRow}>
        <View>
          <Text style={styles.sectionEyebrow}>DAILY RHYTHM</Text>
          <Text style={styles.sectionTitle}>{type === 'sleep' ? 'Rest over time' : 'Stress over time'}</Text>
        </View>
        <View style={[styles.legendPill, { backgroundColor: `${accent}12` }]}>
          <View style={[styles.legendDot, { backgroundColor: accent }]} />
          <Text style={[styles.legendText, { color: accent }]}>{type === 'sleep' ? 'Hours' : 'Level'}</Text>
        </View>
      </View>
      <View style={styles.chart} accessibilityLabel={`${type} daily trend chart`}>
        {visible.map((entry, index) => {
          const value = type === 'sleep' ? (entry.durationMinutes || 0) / 60 : (entry.avgLevel || 0);
          const barColor = type === 'sleep' ? accent : getStressColor(Math.max(1, Math.round(value)));
          return (
            <View key={`${entry.date}-${index}`} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { height: `${Math.max(8, Math.min(100, (value / max) * 100))}%`, backgroundColor: barColor }]} />
              </View>
              {(index === 0 || index === visible.length - 1) && (
                <Text style={styles.barLabel}>{formatDay(entry.date, { month: 'short', day: 'numeric' })}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function SleepEntry({ entry, onDelete, isDeleting, deleteDisabled }) {
  const quality = getQualityLabel(entry.quality);
  const tags = Object.entries(entry.tags || {})
    .filter(([, active]) => active)
    .map(([key]) => SLEEP_CONTEXT_TAGS.find((item) => item.key === key)?.label || key);
  return (
    <View style={styles.entryCard}>
      <View style={styles.entryTopRow}>
        <View style={styles.dateBlock}>
          <Text style={styles.dateDay}>{formatDay(entry.sleepDate, { weekday: 'short' })}</Text>
          <Text style={styles.dateNumber}>{formatDay(entry.sleepDate, { day: 'numeric' })}</Text>
        </View>
        <View style={styles.entryMain}>
          <Text style={styles.entryTitle}>{durationLabel(entry.durationMinutes)}</Text>
          <Text style={styles.entrySubtitle}>{formatTime(entry.bedTime)} – {formatTime(entry.wakeTime)}</Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: `${getQualityColor(entry.quality)}14` }]}>
          <Ionicons name={quality.icon} size={15} color={getQualityColor(entry.quality)} />
          <Text style={[styles.scoreText, { color: getQualityColor(entry.quality) }]}>{entry.quality}/10</Text>
        </View>
        <TouchableOpacity onPress={onDelete} disabled={deleteDisabled} style={styles.moreButton} accessibilityLabel="Delete sleep entry" accessibilityState={{ disabled: deleteDisabled, busy: isDeleting }}>
          {isDeleting ? <ActivityIndicator size="small" color={TEXT.tertiary} /> : <Ionicons name="trash-outline" size={17} color={TEXT.tertiary} />}
        </TouchableOpacity>
      </View>
      {!!tags.length && (
        <View style={styles.chipRow}>
          {tags.map((tag) => <Text key={tag} style={styles.chip}>{tag}</Text>)}
        </View>
      )}
      {!!entry.notes && <Text style={styles.notes}>{entry.notes}</Text>}
    </View>
  );
}

function StressEntry({ entry, onDelete, isDeleting, deleteDisabled }) {
  const info = getStressLevel(entry.level);
  const triggers = (entry.triggers || []).map((key) => STRESS_TRIGGERS.find((item) => item.key === key)?.label || key);
  const coping = (entry.copingUsed || []).map((key) => COPING_STRATEGIES.find((item) => item.key === key)?.label || key);
  const symptoms = PHYSICAL_SYMPTOMS
    .filter(({ key }) => entry.physicalSymptoms?.[key])
    .map(({ label }) => label);
  return (
    <View style={styles.entryCard}>
      <View style={styles.entryTopRow}>
        <View style={[styles.levelOrb, { backgroundColor: `${info.color}16`, borderColor: `${info.color}35` }]}>
          <Text style={[styles.levelOrbValue, { color: info.color }]}>{entry.level}</Text>
        </View>
        <View style={styles.entryMain}>
          <Text style={styles.entryTitle}>{info.label}</Text>
          <Text style={styles.entrySubtitle}>
            {formatDay(entry.loggedDate, { weekday: 'short', month: 'short', day: 'numeric' })} · {formatTime(entry.loggedAt)}
          </Text>
        </View>
        <TouchableOpacity onPress={onDelete} disabled={deleteDisabled} style={styles.moreButton} accessibilityLabel="Delete stress entry" accessibilityState={{ disabled: deleteDisabled, busy: isDeleting }}>
          {isDeleting ? <ActivityIndicator size="small" color={TEXT.tertiary} /> : <Ionicons name="trash-outline" size={17} color={TEXT.tertiary} />}
        </TouchableOpacity>
      </View>
      {!!triggers.length && <Text style={styles.contextLine}><Text style={styles.contextLabel}>Triggered by </Text>{triggers.join(', ')}</Text>}
      {!!symptoms.length && <Text style={styles.contextLine}><Text style={styles.contextLabel}>Body signals </Text>{symptoms.join(', ')}</Text>}
      {!!coping.length && <Text style={styles.contextLine}><Text style={styles.contextLabel}>What helped </Text>{coping.join(', ')}</Text>}
      {!!entry.notes && <Text style={styles.notes}>{entry.notes}</Text>}
    </View>
  );
}

export default function WellnessHistoryScreen({ type, days, setDays, history }) {
  const router = useRouter();
  const isSleep = type === 'sleep';
  const accent = isSleep ? '#6366F1' : '#F59E0B';
  const gradient = isSleep ? ['#4F46E5', '#7C3AED', '#A78BFA'] : ['#D97706', '#F59E0B', '#FBBF24'];
  const logs = useMemo(
    () => history.data?.[isSleep ? 'sleepLogs' : 'stressLogs'] || [],
    [history.data, isSleep]
  );
  const derived = useMemo(() => {
    if (!logs.length) return { summary: {}, daily: [] };
    if (isSleep) {
      const totalDuration = logs.reduce((sum, entry) => sum + (Number(entry.durationMinutes) || 0), 0);
      const totalQuality = logs.reduce((sum, entry) => sum + (Number(entry.quality) || 0), 0);
      return {
        summary: {
          avgDurationMinutes: Math.round(totalDuration / logs.length),
          avgQuality: Math.round((totalQuality / logs.length) * 10) / 10,
          daysTracked: new Set(logs.map((entry) => entry.sleepDate)).size,
          goalNights: logs.filter((entry) => entry.durationMinutes >= 420 && entry.durationMinutes <= 540).length,
          restorativeNights: logs.filter((entry) => entry.quality >= 7).length,
        },
        daily: [...logs].reverse().map((entry) => ({
          date: entry.sleepDate,
          durationMinutes: entry.durationMinutes,
          quality: entry.quality,
        })),
      };
    }

    const byDay = new Map();
    const triggerCounts = {};
    const copingCounts = {};
    logs.forEach((entry) => {
      const entries = byDay.get(entry.loggedDate) || [];
      entries.push(entry);
      byDay.set(entry.loggedDate, entries);
      (entry.triggers || []).forEach((key) => { triggerCounts[key] = (triggerCounts[key] || 0) + 1; });
      (entry.copingUsed || []).forEach((key) => { copingCounts[key] = (copingCounts[key] || 0) + 1; });
    });
    const daily = [...byDay.entries()].map(([date, entries]) => ({
      date,
      avgLevel: Math.round((entries.reduce((sum, entry) => sum + entry.level, 0) / entries.length) * 10) / 10,
      entriesCount: entries.length,
    })).sort((a, b) => a.date.localeCompare(b.date));
    const mostFrequent = (counts) => Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    return {
      summary: {
        avgLevel: Math.round((logs.reduce((sum, entry) => sum + entry.level, 0) / logs.length) * 10) / 10,
        entriesCount: logs.length,
        calmDays: daily.filter((entry) => entry.avgLevel <= 3).length,
        highStressDays: daily.filter((entry) => entry.avgLevel >= 7).length,
        topTrigger: mostFrequent(triggerCounts),
        topCoping: mostFrequent(copingCounts),
      },
      daily,
    };
  }, [isSleep, logs]);
  const summary = useMemo(() => {
    const serverSummary = history.data?.summary || {};
    return Object.fromEntries(
      Object.entries({ ...derived.summary, ...serverSummary }).map(([key, value]) => [
        key,
        serverSummary[key] ?? value,
      ])
    );
  }, [derived.summary, history.data?.summary]);
  const daily = history.data?.dailySummaries?.length ? history.data.dailySummaries : derived.daily;
  const [refreshing, setRefreshing] = useState(false);
  const [showLogger, setShowLogger] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const topTriggerLabel = STRESS_TRIGGERS.find((item) => item.key === summary.topTrigger)?.label || summary.topTrigger;
  const topCopingLabel = COPING_STRATEGIES.find((item) => item.key === summary.topCoping)?.label || summary.topCoping;

  const metrics = useMemo(() => isSleep ? [
    { icon: 'time-outline', value: durationLabel(summary.avgDurationMinutes), label: 'Avg sleep' },
    { icon: 'sparkles-outline', value: `${summary.avgQuality || 0}/10`, label: 'Avg quality' },
    { icon: 'calendar-outline', value: summary.daysTracked || 0, label: 'Nights logged' },
    { icon: 'checkmark-circle-outline', value: summary.goalNights || 0, label: 'In goal range' },
  ] : [
    { icon: 'pulse-outline', value: `${summary.avgLevel || 0}/10`, label: 'Avg level' },
    { icon: 'chatbubble-ellipses-outline', value: summary.entriesCount || 0, label: 'Check-ins' },
    { icon: 'leaf-outline', value: summary.calmDays || 0, label: 'Calm days' },
    { icon: 'alert-circle-outline', value: summary.highStressDays || 0, label: 'High days' },
  ], [isSleep, summary]);

  const refresh = async () => {
    setRefreshing(true);
    try { await history.refetch(); } finally { setRefreshing(false); }
  };

  const deleteEntry = async (entry) => {
    setDeleteError(null);
    setDeletingId(entry.id);
    try {
      await history.deleteEntry(entry.id);
    } catch (error) {
      console.error(`[WellnessHistory] Failed to delete ${type} entry:`, error);
      setDeleteError(`Couldn’t delete this ${type} entry. Check your connection and try again.`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (entry) => Alert.alert(
    `Delete ${isSleep ? 'sleep' : 'stress'} entry?`,
    'This removes the check-in from your history and insights.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteEntry(entry) },
    ]
  );

  const openLogger = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowLogger(true);
  };

  return (
    <View style={styles.screen}>
      <LinearGradient colors={gradient} style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.navRow}>
            <TouchableOpacity style={styles.navButton} onPress={() => router.back()} accessibilityLabel="Go back">
              <Ionicons name="chevron-back" size={23} color={TEXT.white} />
            </TouchableOpacity>
            <Text style={styles.navTitle}>{isSleep ? 'Sleep history' : 'Stress history'}</Text>
            <TouchableOpacity style={styles.navButton} onPress={openLogger} accessibilityLabel={`Log ${type}`}>
              <Ionicons name="add" size={24} color={TEXT.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.heroCopy}>
            <View style={styles.heroIcon}><Ionicons name={isSleep ? 'moon' : 'pulse'} size={24} color={TEXT.white} /></View>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>{isSleep ? 'Build a better night' : 'Notice what shifts'}</Text>
              <Text style={styles.heroSubtitle}>{isSleep ? 'Rest patterns, quality, and consistency.' : 'Pressure patterns and recovery supports.'}</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={accent} />}
      >
        <View style={styles.rangeSelector}>
          {RANGES.map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.rangeButton, days === range && { backgroundColor: accent }]}
              onPress={() => setDays(range)}
              accessibilityRole="button"
              accessibilityLabel={`Show ${range} days`}
              accessibilityState={{ selected: days === range }}
            >
              <Text style={[styles.rangeText, days === range && styles.rangeTextActive]}>{range} days</Text>
            </TouchableOpacity>
          ))}
        </View>

        {!!deleteError && (
          <View style={styles.errorBanner} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
            <Text style={styles.errorBannerText}>{deleteError}</Text>
            <TouchableOpacity onPress={() => setDeleteError(null)} accessibilityLabel="Dismiss delete error">
              <Ionicons name="close" size={18} color="#B91C1C" />
            </TouchableOpacity>
          </View>
        )}

        {history.isLoading ? (
          <View style={styles.stateCard}><ActivityIndicator color={accent} /><Text style={styles.stateText}>Bringing your history together…</Text></View>
        ) : history.error ? (
          <View style={styles.stateCard}>
            <Ionicons name="cloud-offline-outline" size={28} color={TEXT.tertiary} />
            <Text style={styles.stateTitle}>History is taking a pause</Text>
            <Text style={styles.stateText}>Check your connection and try again.</Text>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: accent }]} onPress={() => history.refetch()}><Text style={styles.primaryButtonText}>Try again</Text></TouchableOpacity>
          </View>
        ) : !logs.length ? (
          <View style={styles.stateCard}>
            <View style={[styles.emptyIcon, { backgroundColor: `${accent}12` }]}><Ionicons name={isSleep ? 'moon-outline' : 'pulse-outline'} size={30} color={accent} /></View>
            <Text style={styles.stateTitle}>Your story starts here</Text>
            <Text style={styles.stateText}>A few quick check-ins will reveal useful patterns over time.</Text>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: accent }]} onPress={openLogger}><Text style={styles.primaryButtonText}>Log {isSleep ? 'sleep' : 'stress'}</Text></TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.metricsGrid}>
              {metrics.map((metric) => <MetricCard key={metric.label} {...metric} accent={accent} />)}
            </View>
            <TrendChart entries={daily} type={type} accent={accent} />

            <TouchableOpacity
              style={[styles.insightCard, { borderLeftColor: accent }]}
              onPress={() => router.push(`${isSleep ? '/insights/sleep-analytics' : '/insights/stress-patterns'}?days=${days}`)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${type} insights`}
            >
              <Ionicons name="bulb-outline" size={21} color={accent} />
              <View style={styles.insightCopy}>
                <Text style={styles.insightTitle}>{isSleep ? `${summary.restorativeNights || 0} restorative nights` : (topTriggerLabel ? `Most common trigger: ${topTriggerLabel}` : 'Keep checking in')}</Text>
                <Text style={styles.insightText}>{isSleep ? 'Quality scores of 7 or higher are counted as restorative.' : (topCopingLabel ? `Your most-used support was ${topCopingLabel}.` : 'Add triggers and coping tools to uncover what changes your stress.')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={TEXT.tertiary} />
            </TouchableOpacity>

            <View style={styles.sectionHeadingRow}>
              <View>
                <Text style={styles.sectionEyebrow}>RECENT</Text>
                <Text style={styles.sectionTitle}>{isSleep ? 'Nights' : 'Check-ins'}</Text>
              </View>
              <Text style={styles.countText}>{history.data?.total || logs.length} total</Text>
            </View>
            <View style={styles.entryList}>
              {logs.map((entry) => isSleep
                ? <SleepEntry key={entry.id} entry={entry} isDeleting={deletingId === entry.id} deleteDisabled={deletingId !== null} onDelete={() => confirmDelete(entry)} />
                : <StressEntry key={entry.id} entry={entry} isDeleting={deletingId === entry.id} deleteDisabled={deletingId !== null} onDelete={() => confirmDelete(entry)} />)}
            </View>
            {!!history.paginationError && (
              <View style={styles.paginationError} accessibilityRole="alert">
                <Ionicons name="cloud-offline-outline" size={17} color="#B91C1C" />
                <Text style={styles.paginationErrorText}>Couldn’t load more entries. Your current history is still available.</Text>
              </View>
            )}
            {history.hasNextPage && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => history.fetchNextPage()}
                disabled={history.isFetchingNextPage}
                accessibilityRole="button"
                accessibilityState={{ disabled: history.isFetchingNextPage, busy: history.isFetchingNextPage }}
              >
                {history.isFetchingNextPage
                  ? <ActivityIndicator size="small" color={accent} />
                  : <Ionicons name="chevron-down" size={17} color={accent} />}
                <Text style={[styles.loadMoreText, { color: accent }]}>{history.isFetchingNextPage ? 'Loading…' : (history.paginationError ? 'Try loading more' : 'Load more')}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
        <View style={styles.bottomSpace} />
      </ScrollView>
      {isSleep ? (
        <SleepLogger visible={showLogger} onClose={() => setShowLogger(false)} />
      ) : (
        <StressLogger visible={showLogger} onClose={() => setShowLogger(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SURFACES.background.primary },
  hero: { paddingBottom: SPACING[4], borderBottomLeftRadius: RADIUS['2xl'], borderBottomRightRadius: RADIUS['2xl'] },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING[4], paddingTop: SPACING[2] },
  navButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  navTitle: { fontSize: TYPOGRAPHY.size.base, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.white },
  heroCopy: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3], paddingHorizontal: SPACING[5], paddingTop: SPACING[3] },
  heroIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  heroText: { flex: 1 },
  heroTitle: { fontSize: TYPOGRAPHY.size.xl, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.white, letterSpacing: -0.2 },
  heroSubtitle: { marginTop: 2, color: 'rgba(255,255,255,0.84)', fontFamily: TYPOGRAPHY.family.regular, fontSize: TYPOGRAPHY.size.xs, lineHeight: 17 },
  scroll: { flex: 1 },
  content: { padding: SPACING[4] },
  rangeSelector: { flexDirection: 'row', backgroundColor: SURFACES.card.primary, borderRadius: RADIUS.lg, padding: 4, marginBottom: SPACING[4], ...SHADOWS.md },
  rangeButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: RADIUS.md },
  rangeText: { color: TEXT.secondary, fontFamily: TYPOGRAPHY.family.semibold, fontSize: TYPOGRAPHY.size.sm },
  rangeTextActive: { color: TEXT.white },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2], padding: SPACING[3], marginBottom: SPACING[4], backgroundColor: '#FEF2F2', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#FECACA' },
  errorBannerText: { flex: 1, color: '#991B1B', fontSize: TYPOGRAPHY.size.xs, lineHeight: 17, fontFamily: TYPOGRAPHY.family.medium },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[3], marginBottom: SPACING[4] },
  metricCard: { width: '48%', flexGrow: 1, minHeight: 118, padding: SPACING[4], backgroundColor: SURFACES.card.primary, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: SURFACES.card.border, ...SHADOWS.sm },
  metricIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING[3] },
  metricValue: { fontSize: TYPOGRAPHY.size.xl, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },
  metricLabel: { marginTop: 3, color: TEXT.tertiary, fontFamily: TYPOGRAPHY.family.medium, fontSize: TYPOGRAPHY.size.xs },
  chartCard: { backgroundColor: SURFACES.card.primary, borderRadius: RADIUS.xl, padding: SPACING[4], marginBottom: SPACING[4], borderWidth: 1, borderColor: SURFACES.card.border, ...SHADOWS.sm },
  sectionHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING[3] },
  sectionEyebrow: { fontSize: 10, letterSpacing: 1.2, color: TEXT.tertiary, fontFamily: TYPOGRAPHY.family.bold },
  sectionTitle: { marginTop: 3, fontSize: TYPOGRAPHY.size.lg, color: TEXT.primary, fontFamily: TYPOGRAPHY.family.bold },
  legendPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 6 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.family.semibold },
  chart: { height: 146, flexDirection: 'row', alignItems: 'flex-end', gap: 5, paddingTop: SPACING[3], marginBottom: SPACING[2] },
  barColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  barTrack: { width: '100%', minWidth: 5, maxWidth: 18, flex: 1, backgroundColor: SURFACES.background.tertiary, borderRadius: RADIUS.full, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: RADIUS.full },
  barLabel: { position: 'absolute', bottom: -17, width: 56, textAlign: 'center', fontSize: 9, color: TEXT.tertiary },
  insightCard: { flexDirection: 'row', gap: SPACING[3], padding: SPACING[4], backgroundColor: SURFACES.card.primary, borderRadius: RADIUS.lg, borderLeftWidth: 3, marginBottom: SPACING[5] },
  insightCopy: { flex: 1 },
  insightTitle: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.primary },
  insightText: { marginTop: 3, fontSize: TYPOGRAPHY.size.xs, lineHeight: 17, color: TEXT.secondary },
  countText: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary, fontFamily: TYPOGRAPHY.family.medium },
  entryList: { gap: SPACING[3] },
  loadMoreButton: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING[2], minHeight: 44, marginTop: SPACING[4], paddingHorizontal: SPACING[5], borderRadius: RADIUS.full, backgroundColor: SURFACES.card.primary, borderWidth: 1, borderColor: SURFACES.card.border },
  loadMoreText: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold },
  paginationError: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2], marginTop: SPACING[4], paddingHorizontal: SPACING[3] },
  paginationErrorText: { flex: 1, color: '#991B1B', fontSize: TYPOGRAPHY.size.xs, lineHeight: 17 },
  entryCard: { backgroundColor: SURFACES.card.primary, borderRadius: RADIUS.lg, padding: SPACING[4], borderWidth: 1, borderColor: SURFACES.card.border, ...SHADOWS.sm },
  entryTopRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3] },
  dateBlock: { width: 40, height: 48, borderRadius: RADIUS.md, backgroundColor: SURFACES.background.tertiary, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 9, textTransform: 'uppercase', color: TEXT.tertiary, fontFamily: TYPOGRAPHY.family.bold },
  dateNumber: { fontSize: TYPOGRAPHY.size.lg, color: TEXT.primary, fontFamily: TYPOGRAPHY.family.bold },
  entryMain: { flex: 1 },
  entryTitle: { color: TEXT.primary, fontSize: TYPOGRAPHY.size.base, fontFamily: TYPOGRAPHY.family.bold },
  entrySubtitle: { marginTop: 3, color: TEXT.tertiary, fontSize: TYPOGRAPHY.size.xs },
  scoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 6 },
  scoreText: { fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.family.bold },
  moreButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  levelOrb: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  levelOrbValue: { fontSize: TYPOGRAPHY.size.xl, fontFamily: TYPOGRAPHY.family.bold },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING[3] },
  chip: { overflow: 'hidden', color: TEXT.secondary, backgroundColor: SURFACES.background.tertiary, borderRadius: RADIUS.full, paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, textTransform: 'capitalize' },
  contextLine: { marginTop: SPACING[2], color: TEXT.secondary, fontSize: TYPOGRAPHY.size.xs, lineHeight: 17 },
  contextLabel: { fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.primary },
  notes: { marginTop: SPACING[2], color: TEXT.secondary, fontSize: TYPOGRAPHY.size.xs, fontStyle: 'italic', lineHeight: 17 },
  stateCard: { alignItems: 'center', backgroundColor: SURFACES.card.primary, borderRadius: RADIUS.xl, padding: SPACING[6], gap: SPACING[3], ...SHADOWS.sm },
  stateTitle: { textAlign: 'center', color: TEXT.primary, fontSize: TYPOGRAPHY.size.lg, fontFamily: TYPOGRAPHY.family.bold },
  stateText: { textAlign: 'center', maxWidth: 270, color: TEXT.secondary, fontSize: TYPOGRAPHY.size.sm, lineHeight: 20 },
  emptyIcon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { marginTop: SPACING[2], borderRadius: RADIUS.full, paddingHorizontal: SPACING[5], paddingVertical: SPACING[3] },
  primaryButtonText: { color: TEXT.white, fontFamily: TYPOGRAPHY.family.semibold, fontSize: TYPOGRAPHY.size.sm },
  bottomSpace: { height: 40 },
});
