import React, { useState } from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, SURFACES, TYPOGRAPHY, BRAND } from '../../constants/premiumTheme';

// ─── Macro helpers ────────────────────────────────────────────────────────────

const MACRO_META = {
  calories: { label: 'Calories', unit: 'kcal', color: '#3B82F6', key: 'totalCalories', goalKey: 'dailyCalories', goalDefault: 2000 },
  protein:  { label: 'Protein',  unit: 'g',    color: '#10B981', key: 'totalProtein',  goalKey: 'proteinG',      goalDefault: 150  },
  carbs:    { label: 'Carbs',    unit: 'g',    color: '#F59E0B', key: 'totalCarbs',    goalKey: 'carbsG',        goalDefault: 250  },
  fat:      { label: 'Fat',      unit: 'g',    color: '#EF4444', key: 'totalFats',     goalKey: 'fatG',          goalDefault: 65   },
};

// ─── Micronutrient helpers ────────────────────────────────────────────────────

const MICRO_DISPLAY = {
  calcium:    { label: 'Calcium',     icon: 'fitness-outline' },
  iron:       { label: 'Iron',        icon: 'water-outline' },
  magnesium:  { label: 'Magnesium',   icon: 'leaf-outline' },
  potassium:  { label: 'Potassium',   icon: 'heart-outline' },
  zinc:       { label: 'Zinc',        icon: 'shield-outline' },
  vitaminA:   { label: 'Vitamin A',   icon: 'eye-outline' },
  vitaminC:   { label: 'Vitamin C',   icon: 'sunny-outline' },
  vitaminD:   { label: 'Vitamin D',   icon: 'partly-sunny-outline' },
  vitaminB12: { label: 'Vitamin B12', icon: 'flash-outline' },
  folate:     { label: 'Folate',      icon: 'medical-outline' },
};

const statusColor = (status) => {
  if (status === 'adequate')  return '#10B981';
  if (status === 'low')       return '#F59E0B';
  return '#EF4444';
};

const statusLabel = (status) => {
  if (status === 'adequate')  return 'Adequate';
  if (status === 'low')       return 'Low';
  return 'Deficient';
};

// ─── Main component ───────────────────────────────────────────────────────────

export const NutrientTrendsModal = ({
  visible,
  onClose,
  nutrient,        // macro key: 'calories' | 'protein' | 'carbs' | 'fat'
  trends,          // macro weekly summaries from dashboardData
  goals,           // user goals object
  microTrends,     // from GET /api/nutrition/micronutrient-trends
  microLoading,    // boolean
}) => {
  const [tab, setTab] = useState('macros');

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Nutrient Trends</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={TEXT.tertiary} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === 'macros' && styles.tabActive]}
              onPress={() => setTab('macros')}
            >
              <Text style={[styles.tabText, tab === 'macros' && styles.tabTextActive]}>
                Macros
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'micros' && styles.tabActive]}
              onPress={() => setTab('micros')}
            >
              <Text style={[styles.tabText, tab === 'micros' && styles.tabTextActive]}>
                Micronutrients
              </Text>
              {microTrends?.activeDeficits?.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{microTrends.activeDeficits.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {tab === 'macros' ? (
              <MacroTab nutrient={nutrient} trends={trends} goals={goals} />
            ) : (
              <MicroTab microTrends={microTrends} loading={microLoading} />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Macro tab ────────────────────────────────────────────────────────────────

function MacroTab({ nutrient, trends, goals }) {
  const meta = MACRO_META[nutrient] || MACRO_META.calories;
  const goalValue = (goals && goals[meta.goalKey]) || meta.goalDefault;

  const chartData = (trends || []).slice(-7).map(day => ({
    value: parseFloat(day[meta.key] || 0),
    label: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
  }));

  const maxValue = Math.max(...chartData.map(d => d.value), goalValue) * 1.1 || 100;

  return (
    <View>
      <Text style={styles.subtitle}>{meta.label} — Last 7 Days</Text>

      <View style={styles.chartContainer}>
        <View style={[styles.goalLine, { bottom: (goalValue / maxValue) * 180 }]} />
        <Text style={[styles.goalLabel, { bottom: (goalValue / maxValue) * 180 + 4 }]}>
          Goal: {Math.round(goalValue)}{meta.unit}
        </Text>

        <View style={styles.barsContainer}>
          {chartData.map((day, i) => (
            <View key={i} style={styles.barGroup}>
              <View style={styles.barTrack}>
                <View style={[styles.bar, {
                  height: Math.max((day.value / maxValue) * 180, 4),
                  backgroundColor: day.value >= goalValue * 0.8 ? meta.color : '#EF4444',
                }]} />
              </View>
              <Text style={styles.dayLabel}>{day.label}</Text>
              <Text style={styles.valueLabel}>{Math.round(day.value)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Average pill */}
      {chartData.length > 0 && (() => {
        const avg = Math.round(chartData.reduce((s, d) => s + d.value, 0) / chartData.length);
        const pct = Math.round((avg / goalValue) * 100);
        return (
          <View style={styles.avgRow}>
            <Text style={styles.avgLabel}>7-day avg:</Text>
            <Text style={[styles.avgValue, { color: pct >= 80 ? '#10B981' : '#EF4444' }]}>
              {avg} {meta.unit} ({pct}% of goal)
            </Text>
          </View>
        );
      })()}
    </View>
  );
}

// ─── Micronutrient tab ────────────────────────────────────────────────────────

function MicroTab({ microTrends, loading }) {
  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={BRAND.primary} />
        <Text style={styles.loadingText}>Analysing micronutrients…</Text>
      </View>
    );
  }

  if (!microTrends?.nutrientAnalysis) {
    return (
      <View style={styles.emptyBox}>
        <Ionicons name="analytics-outline" size={40} color={TEXT.tertiary} />
        <Text style={styles.emptyText}>No micronutrient data yet.</Text>
        <Text style={styles.emptySubtext}>Log meals with detailed nutrition info to see trends.</Text>
      </View>
    );
  }

  const { nutrientAnalysis, activeDeficits } = microTrends;

  return (
    <View>
      {activeDeficits?.length > 0 && (
        <View style={styles.deficitAlert}>
          <Ionicons name="warning-outline" size={18} color="#F59E0B" />
          <Text style={styles.deficitAlertText}>
            {activeDeficits.length} nutrient{activeDeficits.length > 1 ? 's' : ''} consistently low
          </Text>
        </View>
      )}

      <Text style={styles.subtitle}>30-Day Average vs RDA</Text>

      {Object.entries(nutrientAnalysis).map(([key, data]) => {
        const meta = MICRO_DISPLAY[key];
        if (!meta) return null;
        const color = statusColor(data.status);
        const fillPct = Math.min(data.percentOfRDA, 100);

        return (
          <View key={key} style={styles.microRow}>
            <View style={styles.microLeft}>
              <Ionicons name={meta.icon} size={16} color={color} />
              <Text style={styles.microLabel}>{meta.label}</Text>
            </View>

            <View style={styles.microRight}>
              {/* Progress bar */}
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${fillPct}%`, backgroundColor: color }]} />
              </View>

              {/* Status pill + streak */}
              <View style={styles.microMeta}>
                <View style={[styles.statusPill, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.statusPillText, { color }]}>
                    {data.percentOfRDA}% RDA
                  </Text>
                </View>
                {data.deficitStreak >= 3 && (
                  <View style={styles.streakPill}>
                    <Ionicons name="trending-down" size={10} color="#EF4444" />
                    <Text style={styles.streakText}>Low {data.deficitStreak}d</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        );
      })}

      <Text style={styles.footnote}>
        Based on logs from the last 30 days. RDA values per NIH/USDA guidelines.
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: SURFACES.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: TYPOGRAPHY.size.xl,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  closeButton: { padding: 4 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: SURFACES.background.secondary,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: { backgroundColor: SURFACES.background.primary, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.tertiary },
  tabTextActive: { color: TEXT.primary },
  badge: { backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { fontSize: 10, color: '#fff', fontFamily: TYPOGRAPHY.family.bold },
  scroll: { flex: 1 },

  // Macro chart
  subtitle: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.secondary, marginBottom: 16 },
  chartContainer: { height: 220, position: 'relative', marginBottom: 16 },
  goalLine: { position: 'absolute', left: 0, right: 0, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: TEXT.tertiary, opacity: 0.4, zIndex: 1 },
  goalLabel: { position: 'absolute', right: 0, fontSize: TYPOGRAPHY.size.xs, color: TEXT.secondary, zIndex: 1 },
  barsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 180 },
  barGroup: { alignItems: 'center', flex: 1 },
  barTrack: { height: 180, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  bar: { width: 12, borderRadius: 6 },
  dayLabel: { marginTop: 8, fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.secondary },
  valueLabel: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary, marginTop: 2 },
  avgRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  avgLabel: { fontSize: TYPOGRAPHY.size.sm, color: TEXT.secondary },
  avgValue: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold },

  // Micro tab
  loadingBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingText: { color: TEXT.secondary, fontSize: TYPOGRAPHY.size.sm },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: TYPOGRAPHY.size.md, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.secondary },
  emptySubtext: { fontSize: TYPOGRAPHY.size.sm, color: TEXT.tertiary, textAlign: 'center' },
  deficitAlert: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginBottom: 16 },
  deficitAlertText: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold, color: '#92400E' },
  microRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  microLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 120 },
  microLabel: { fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.primary, flexShrink: 1 },
  microRight: { flex: 1, gap: 4 },
  progressTrack: { height: 6, backgroundColor: SURFACES.background.secondary, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  microMeta: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  statusPill: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  statusPillText: { fontSize: 10, fontFamily: TYPOGRAPHY.family.semibold },
  streakPill: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  streakText: { fontSize: 10, fontFamily: TYPOGRAPHY.family.semibold, color: '#EF4444' },
  footnote: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary, marginTop: 16, marginBottom: 32, textAlign: 'center' },
});
