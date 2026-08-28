import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

import MoodLogger from '../../components/MoodLogger';
import { useMoodHistory } from '../../hooks/useMoodInsights';
import {
  MOOD_PALETTE,
  RADIUS,
  SHADOWS,
  SPACING,
  SURFACES,
  TEXT,
  TYPOGRAPHY,
} from '../../constants/premiumTheme';

const RANGES = [7, 30, 90];
const ACCENT = '#10B981';
const MOOD_ICONS = {
  happy: 'happy-outline', calm: 'leaf-outline', focused: 'eye-outline',
  energized: 'flash-outline', neutral: 'remove-outline', tired: 'moon-outline',
  stressed: 'alert-circle-outline', sad: 'sad-outline',
};

const capitalize = (value) => value
  ? value.charAt(0).toUpperCase() + value.slice(1)
  : 'Unknown';

const formatLoggedAt = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
};

function Metric({ icon, value, label }) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}><Ionicons name={icon} size={16} color={ACCENT} /></View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function MoodEntry({ entry }) {
  const palette = MOOD_PALETTE[entry.mood] || MOOD_PALETTE.neutral;
  const activeTags = Object.entries(entry.tags || {})
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => typeof value === 'string' ? value : capitalize(key));

  return (
    <View style={styles.entryCard}>
      <View style={[styles.entryIcon, { backgroundColor: `${palette.base}14` }]}>
        <Ionicons name={MOOD_ICONS[entry.mood] || MOOD_ICONS.neutral} size={22} color={palette.base} />
      </View>
      <View style={styles.entryContent}>
        <View style={styles.entryHeader}>
          <Text style={styles.entryTitle}>{capitalize(entry.mood)}</Text>
          <Text style={[styles.intensityPill, { color: palette.base, backgroundColor: `${palette.base}12` }]}>
            {entry.intensity ?? 5}/10
          </Text>
        </View>
        <Text style={styles.entryTime}>{formatLoggedAt(entry.loggedDate)}</Text>
        <View style={styles.energyRow}>
          <Ionicons name="flash-outline" size={13} color={TEXT.tertiary} />
          <Text style={styles.energyText}>Energy {entry.energyLevel ?? 5}/10</Text>
        </View>
        {!!activeTags.length && <Text style={styles.contextText}>{activeTags.join(' · ')}</Text>}
        {!!entry.note && <Text style={styles.noteText}>{entry.note}</Text>}
      </View>
    </View>
  );
}

export default function MoodHistoryScreen() {
  const router = useRouter();
  const [days, setDays] = useState(30);
  const [refreshing, setRefreshing] = useState(false);
  const [loggerVisible, setLoggerVisible] = useState(false);
  const history = useMoodHistory(days);
  const logs = useMemo(() => history.data || [], [history.data]);

  const summary = useMemo(() => {
    if (!logs.length) return { average: 0, energy: 0, days: 0, dominant: '—' };
    const moodCounts = {};
    let intensityTotal = 0;
    let energyTotal = 0;
    logs.forEach((entry) => {
      intensityTotal += Number(entry.intensity) || 0;
      energyTotal += Number(entry.energyLevel) || 0;
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    });
    const dominant = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return {
      average: (intensityTotal / logs.length).toFixed(1),
      energy: (energyTotal / logs.length).toFixed(1),
      days: new Set(logs.map((entry) => entry.dayKey || new Date(entry.loggedDate).toDateString())).size,
      dominant: capitalize(dominant),
    };
  }, [logs]);

  const refresh = async () => {
    setRefreshing(true);
    try { await history.refetch(); } finally { setRefreshing(false); }
  };

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#059669', '#10B981', '#34D399']} style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.navRow}>
            <TouchableOpacity style={styles.navButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
              <Ionicons name="chevron-back" size={23} color={TEXT.white} />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Mood history</Text>
            <TouchableOpacity style={styles.navButton} onPress={() => setLoggerVisible(true)} accessibilityRole="button" accessibilityLabel="Log mood">
              <Ionicons name="add" size={24} color={TEXT.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.heroCopy}>
            <View style={styles.heroIcon}><Ionicons name="happy-outline" size={23} color={TEXT.white} /></View>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>See what shapes your day</Text>
              <Text style={styles.heroSubtitle}>Mood, intensity, energy, and context in one timeline.</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ACCENT} />}
      >
        <View style={styles.rangeSelector}>
          {RANGES.map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.rangeButton, days === range && styles.rangeButtonActive]}
              onPress={() => setDays(range)}
              accessibilityRole="button"
              accessibilityLabel={`Show ${range} days`}
              accessibilityState={{ selected: days === range }}
            >
              <Text style={[styles.rangeText, days === range && styles.rangeTextActive]}>{range} days</Text>
            </TouchableOpacity>
          ))}
        </View>

        {history.isLoading ? (
          <View style={styles.stateCard}><ActivityIndicator color={ACCENT} /><Text style={styles.stateText}>Bringing your mood history together…</Text></View>
        ) : history.error ? (
          <View style={styles.stateCard}>
            <Ionicons name="cloud-offline-outline" size={30} color={TEXT.tertiary} />
            <Text style={styles.stateTitle}>History is taking a pause</Text>
            <Text style={styles.stateText}>Check your connection and try again.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => history.refetch()} accessibilityRole="button"><Text style={styles.primaryButtonText}>Try again</Text></TouchableOpacity>
          </View>
        ) : !logs.length ? (
          <View style={styles.stateCard}>
            <View style={styles.emptyIcon}><Ionicons name="happy-outline" size={30} color={ACCENT} /></View>
            <Text style={styles.stateTitle}>Your mood story starts here</Text>
            <Text style={styles.stateText}>A few check-ins will reveal patterns in mood and energy.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setLoggerVisible(true)} accessibilityRole="button"><Text style={styles.primaryButtonText}>Log mood</Text></TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.metricsGrid}>
              <Metric icon="pulse-outline" value={`${summary.average}/10`} label="Avg intensity" />
              <Metric icon="flash-outline" value={`${summary.energy}/10`} label="Avg energy" />
              <Metric icon="calendar-outline" value={summary.days} label="Days tracked" />
              <Metric icon="sparkles-outline" value={summary.dominant} label="Most common" />
            </View>

            <TouchableOpacity
              style={styles.insightsCard}
              onPress={() => router.push({ pathname: '/analytics', params: { domain: 'mood' } })}
              accessibilityRole="button"
              accessibilityLabel="Open mood insights"
            >
              <View style={styles.insightsIcon}><Ionicons name="analytics-outline" size={20} color={ACCENT} /></View>
              <View style={styles.insightsCopy}>
                <Text style={styles.insightsTitle}>Explore your mood patterns</Text>
                <Text style={styles.insightsText}>See trends and what may be influencing them.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={TEXT.tertiary} />
            </TouchableOpacity>

            <View style={styles.sectionHeader}>
              <View><Text style={styles.eyebrow}>RECENT</Text><Text style={styles.sectionTitle}>Check-ins</Text></View>
              <Text style={styles.count}>{logs.length} in range</Text>
            </View>
            <View style={styles.entryList}>{logs.map((entry) => <MoodEntry key={entry.id} entry={entry} />)}</View>
          </>
        )}
      </ScrollView>

      <MoodLogger
        visible={loggerVisible}
        onClose={() => setLoggerVisible(false)}
        onSuccess={async () => {
          setLoggerVisible(false);
          await history.refetch();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SURFACES.background.primary },
  hero: { paddingBottom: SPACING[4], borderBottomLeftRadius: RADIUS['2xl'], borderBottomRightRadius: RADIUS['2xl'] },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING[4], paddingTop: SPACING[2] },
  navButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  navTitle: { color: TEXT.white, fontSize: TYPOGRAPHY.size.base, fontFamily: TYPOGRAPHY.family.semibold },
  heroCopy: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3], paddingHorizontal: SPACING[5], paddingTop: SPACING[3] },
  heroIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  heroText: { flex: 1 },
  heroTitle: { color: TEXT.white, fontSize: TYPOGRAPHY.size.xl, fontFamily: TYPOGRAPHY.family.bold, letterSpacing: -0.2 },
  heroSubtitle: { marginTop: 2, color: 'rgba(255,255,255,0.86)', fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.family.regular, lineHeight: 17 },
  scroll: { flex: 1 },
  content: { padding: SPACING[4], paddingBottom: SPACING[8] },
  rangeSelector: { flexDirection: 'row', padding: 4, marginBottom: SPACING[4], borderRadius: RADIUS.lg, backgroundColor: SURFACES.card.primary, ...SHADOWS.md },
  rangeButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md },
  rangeButtonActive: { backgroundColor: ACCENT },
  rangeText: { color: TEXT.secondary, fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold },
  rangeTextActive: { color: TEXT.white },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[3], marginBottom: SPACING[4] },
  metricCard: { width: '48%', flexGrow: 1, minHeight: 108, padding: SPACING[4], borderWidth: 1, borderColor: SURFACES.card.border, borderRadius: RADIUS.xl, backgroundColor: SURFACES.card.primary, ...SHADOWS.sm },
  metricIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING[2], backgroundColor: `${ACCENT}12` },
  metricValue: { color: TEXT.primary, fontSize: TYPOGRAPHY.size.lg, fontFamily: TYPOGRAPHY.family.bold },
  metricLabel: { marginTop: 3, color: TEXT.tertiary, fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.family.medium },
  insightsCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3], padding: SPACING[4], marginBottom: SPACING[5], borderRadius: RADIUS.lg, backgroundColor: SURFACES.card.primary, borderLeftWidth: 3, borderLeftColor: ACCENT },
  insightsIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: `${ACCENT}12` },
  insightsCopy: { flex: 1 },
  insightsTitle: { color: TEXT.primary, fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold },
  insightsText: { marginTop: 3, color: TEXT.secondary, fontSize: TYPOGRAPHY.size.xs, lineHeight: 17 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING[3] },
  eyebrow: { color: TEXT.tertiary, fontSize: 10, letterSpacing: 1.2, fontFamily: TYPOGRAPHY.family.bold },
  sectionTitle: { marginTop: 3, color: TEXT.primary, fontSize: TYPOGRAPHY.size.lg, fontFamily: TYPOGRAPHY.family.bold },
  count: { color: TEXT.tertiary, fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.family.medium },
  entryList: { gap: SPACING[3] },
  entryCard: { flexDirection: 'row', gap: SPACING[3], padding: SPACING[4], borderWidth: 1, borderColor: SURFACES.card.border, borderRadius: RADIUS.lg, backgroundColor: SURFACES.card.primary, ...SHADOWS.sm },
  entryIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  entryContent: { flex: 1 },
  entryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING[2] },
  entryTitle: { color: TEXT.primary, fontSize: TYPOGRAPHY.size.base, fontFamily: TYPOGRAPHY.family.bold },
  intensityPill: { overflow: 'hidden', borderRadius: RADIUS.full, paddingHorizontal: SPACING[2], paddingVertical: 4, fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.family.bold },
  entryTime: { marginTop: 2, color: TEXT.tertiary, fontSize: TYPOGRAPHY.size.xs },
  energyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING[2] },
  energyText: { color: TEXT.secondary, fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.family.medium },
  contextText: { marginTop: SPACING[2], color: TEXT.secondary, fontSize: TYPOGRAPHY.size.xs, lineHeight: 17 },
  noteText: { marginTop: SPACING[2], color: TEXT.primary, fontSize: TYPOGRAPHY.size.sm, lineHeight: 19 },
  stateCard: { minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: SPACING[3], padding: SPACING[6], borderRadius: RADIUS.xl, backgroundColor: SURFACES.card.primary },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: `${ACCENT}12` },
  stateTitle: { color: TEXT.primary, textAlign: 'center', fontSize: TYPOGRAPHY.size.lg, fontFamily: TYPOGRAPHY.family.bold },
  stateText: { color: TEXT.secondary, textAlign: 'center', fontSize: TYPOGRAPHY.size.sm, lineHeight: 20 },
  primaryButton: { minHeight: 44, justifyContent: 'center', marginTop: SPACING[2], paddingHorizontal: SPACING[5], borderRadius: RADIUS.full, backgroundColor: ACCENT },
  primaryButtonText: { color: TEXT.white, fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold },
});
