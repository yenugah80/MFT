import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFoodLog } from '../../hooks/useFoodLog';
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

const parseCompareId = (raw) => {
  if (!raw) return null;
  if (raw.startsWith('id:')) return { type: 'id', value: Number(raw.slice(3)) };
  if (raw.startsWith('cid:')) return { type: 'cid', value: raw.slice(4) };
  if (raw.startsWith('ts:')) return { type: 'ts', value: Number(raw.slice(3)) };
  return null;
};

const formatMacro = (value) => Math.round(Number(value) || 0);

export default function CompareScreen() {
  const router = useRouter();
  const { ids } = useLocalSearchParams();
  const foodLog = useFoodLog();
  const [isLoading, setIsLoading] = useState(false);

  const compareIds = useMemo(() => {
    if (!ids || typeof ids !== 'string') return [];
    return ids.split(',').map(parseCompareId).filter(Boolean);
  }, [ids]);

  const compareLogs = useMemo(() => {
    if (!compareIds.length) return [];

    return compareIds.map((entry) => {
      if (entry.type === 'id') {
        return foodLog.logs.find((log) => log?.id === entry.value);
      }
      if (entry.type === 'cid') {
        return foodLog.logs.find((log) => log?.clientEventId === entry.value);
      }
      if (entry.type === 'ts') {
        return foodLog.logs.find((log) => log?.timestamp === entry.value);
      }
      return null;
    }).filter(Boolean);
  }, [compareIds, foodLog.logs]);

  const ensureHistory = useCallback(async () => {
    if (compareLogs.length >= 2) return;
    setIsLoading(true);
    try {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(end.getDate() - 90 + 1);
      start.setHours(0, 0, 0, 0);

      await foodLog.fetchHistory({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        limit: 200,
      });
    } finally {
      setIsLoading(false);
    }
  }, [compareLogs.length, foodLog]);

  useEffect(() => {
    ensureHistory().catch(() => {});
  }, [ensureHistory]);

  const [logA, logB] = compareLogs;
  const scoreA = typeof logA?.healthScore === 'number' ? logA.healthScore : null;
  const scoreB = typeof logB?.healthScore === 'number' ? logB.healthScore : null;
  const delta = scoreA !== null && scoreB !== null ? Math.abs(scoreA - scoreB) : null;
  const showWinner = delta !== null && delta >= 10;
  const winner = showWinner ? (scoreA >= scoreB ? logA : logB) : null;

  const renderComparisonRow = (label, valueA, valueB, highlight) => (
    <View style={[styles.compareRow, highlight && styles.compareRowHighlight]}>
      <Text style={styles.compareLabel}>{label}</Text>
      <View style={styles.compareValues}>
        <Text style={styles.compareValue}>{valueA}</Text>
        <Text style={styles.compareValue}>{valueB}</Text>
      </View>
    </View>
  );

  if (!compareIds.length) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle" size={32} color={TEXT.tertiary} />
          <Text style={styles.emptyTitle}>No items selected</Text>
          <Text style={styles.emptySubtitle}>Pick two meals from history to compare.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={TEXT.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Food Comparison</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading && compareLogs.length < 2 && (
          <Text style={styles.loadingText}>Loading meals...</Text>
        )}

        {compareLogs.length < 2 && !isLoading && (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle" size={32} color={TEXT.tertiary} />
            <Text style={styles.emptyTitle}>Comparison unavailable</Text>
            <Text style={styles.emptySubtitle}>We couldn’t find both meals. Try again from History.</Text>
          </View>
        )}

        {compareLogs.length >= 2 && (
          <>
            {showWinner ? (
              <View style={styles.winnerBanner}>
                <Ionicons name="trophy-outline" size={20} color={SEMANTIC.success.base} />
                <Text style={styles.winnerText}>
                  Higher health score: {winner?.foodName || 'This item'}
                </Text>
              </View>
            ) : (
              <View style={styles.neutralBanner}>
                <Text style={styles.neutralText}>Similar overall health impact</Text>
              </View>
            )}

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardColumn}>
                  <Text style={styles.cardTitle}>{logA?.foodName || 'Item A'}</Text>
                  <Text style={styles.cardMeta}>{logA?.mealType || 'Meal'}</Text>
                </View>
                <View style={styles.cardColumn}>
                  <Text style={styles.cardTitle}>{logB?.foodName || 'Item B'}</Text>
                  <Text style={styles.cardMeta}>{logB?.mealType || 'Meal'}</Text>
                </View>
              </View>

              {renderComparisonRow(
                'Health Score',
                scoreA !== null ? `${scoreA}/100` : '—',
                scoreB !== null ? `${scoreB}/100` : '—',
                showWinner
              )}
              {renderComparisonRow(
                'Calories',
                `${formatMacro(logA?.calories)} kcal`,
                `${formatMacro(logB?.calories)} kcal`,
                Math.abs((logA?.calories || 0) - (logB?.calories || 0)) > 50
              )}
              {renderComparisonRow(
                'Protein',
                `${formatMacro(logA?.protein)} g`,
                `${formatMacro(logB?.protein)} g`,
                Math.abs((logA?.protein || 0) - (logB?.protein || 0)) > 5
              )}
              {renderComparisonRow(
                'Carbs',
                `${formatMacro(logA?.carbs)} g`,
                `${formatMacro(logB?.carbs)} g`,
                Math.abs((logA?.carbs || 0) - (logB?.carbs || 0)) > 10
              )}
              {renderComparisonRow(
                'Fat',
                `${formatMacro(logA?.fat)} g`,
                `${formatMacro(logB?.fat)} g`,
                Math.abs((logA?.fat || 0) - (logB?.fat || 0)) > 5
              )}
            </View>

            <View style={styles.notesCard}>
              <Text style={styles.notesTitle}>How to use this</Text>
              <Text style={styles.notesText}>
                Compare two meals and pick the one that aligns with your goals. Small choices add up.
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
                <Text style={styles.primaryButtonText}>Pick another meal</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
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
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    padding: SPACING[4],
    paddingBottom: SPACING[8],
  },
  loadingText: {
    textAlign: 'center',
    color: TEXT.tertiary,
    marginBottom: SPACING[3],
  },
  winnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    padding: SPACING[3],
    backgroundColor: `${SEMANTIC.success.base}15`,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: `${SEMANTIC.success.base}40`,
    marginBottom: SPACING[3],
  },
  winnerText: {
    color: SEMANTIC.success.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  neutralBanner: {
    padding: SPACING[3],
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    marginBottom: SPACING[3],
  },
  neutralText: {
    color: '#4F46E5',
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  card: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: SPACING[4],
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: SPACING[4],
    marginBottom: SPACING[3],
  },
  cardColumn: {
    flex: 1,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  cardMeta: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  compareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  compareRowHighlight: {
    backgroundColor: '#FEF3C7',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING[2],
  },
  compareLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
  compareValues: {
    flexDirection: 'row',
    gap: SPACING[4],
  },
  compareValue: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.primary,
    minWidth: 70,
    textAlign: 'right',
  },
  notesCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notesTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[2],
  },
  notesText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    marginBottom: SPACING[3],
    lineHeight: 16,
  },
  primaryButton: {
    backgroundColor: BRAND.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING[2],
    alignItems: 'center',
  },
  primaryButtonText: {
    color: TEXT.white,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING[8],
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
    marginTop: SPACING[2],
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
  },
});
