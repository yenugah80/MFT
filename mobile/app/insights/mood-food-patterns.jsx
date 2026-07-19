/**
 * Mood-Food Patterns Screen
 *
 * Deep-dive on which meal patterns correlate with which moods, backed by
 * the same rule-based correlation engine (mood_meal_correlations table /
 * generateBehavioralCorrelations fallback) that powers the dashboard's
 * lower-confidence pattern cards. Only shows patterns that clear the
 * confidence/occurrence bar the hook already enforces (>=65% confidence,
 * >=5 occurrences) — so nothing shown here is a low-signal guess.
 *
 * Wired to GET /api/insights/correlations via useCorrelations().
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { TEXT, SURFACES, TYPOGRAPHY, BRAND, SPACING, RADIUS } from '../../constants/premiumTheme';
import { useCorrelations } from '../../hooks/useInsights';

const TYPE_META = {
  positive: { color: '#10B981', icon: 'trending-up' },
  negative: { color: '#EF4444', icon: 'trending-down' },
  neutral: { color: TEXT.tertiary, icon: 'remove' },
};

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export default function MoodFoodPatternsScreen() {
  const router = useRouter();
  const { correlations, isLoading, refetch } = useCorrelations({ limit: 20 });
  const [refreshing, setRefreshing] = useState(false);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [router]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Mood & Food Patterns',
          headerStyle: { backgroundColor: SURFACES.background.primary },
          headerTintColor: TEXT.primary,
          headerTitleStyle: {
            fontFamily: TYPOGRAPHY.family.semibold,
            fontSize: TYPOGRAPHY.size.lg,
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.headerButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      {isLoading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.centerText}>Finding your patterns...</Text>
        </View>
      ) : correlations.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="restaurant-outline" size={48} color={TEXT.tertiary} />
          <Text style={styles.errorTitle}>Not enough data yet</Text>
          <Text style={styles.centerText}>
            Log meals and moods on the same days for a few weeks — patterns need at least
            5 similar occurrences before we're confident enough to show them.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BRAND.primary} />
          }
        >
          {correlations.map((corr) => {
            const meta = TYPE_META[corr.type] || TYPE_META.neutral;
            return (
              <View key={corr.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.typeIconBg, { backgroundColor: `${meta.color}20` }]}>
                    <Ionicons name={meta.icon} size={18} color={meta.color} />
                  </View>
                  <Text style={styles.pattern}>{capitalize(corr.pattern)}</Text>
                </View>

                {corr.explanation && (
                  <Text style={styles.explanation}>{corr.explanation}</Text>
                )}

                <View style={styles.statsRow}>
                  <View style={styles.statPill}>
                    <Text style={styles.statValue}>{Math.round(corr.confidence * 100)}%</Text>
                    <Text style={styles.statLabel}>Confidence</Text>
                  </View>
                  <View style={styles.statPill}>
                    <Text style={styles.statValue}>{corr.occurrences}</Text>
                    <Text style={styles.statLabel}>Times seen</Text>
                  </View>
                </View>

                {corr.suggestion && (
                  <View style={styles.suggestionRow}>
                    <Ionicons name="bulb-outline" size={14} color={BRAND.primary} />
                    <Text style={styles.suggestionText}>{corr.suggestion}</Text>
                  </View>
                )}
              </View>
            );
          })}

          <Text style={styles.disclaimer}>
            Patterns are based on your own logged meals and moods — not general nutrition advice.
          </Text>

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  headerButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[4],
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  centerText: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[3],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[2],
  },
  typeIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pattern: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  explanation: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginBottom: SPACING[3],
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginBottom: SPACING[2],
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING[3],
    paddingVertical: 6,
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: SPACING[2],
  },
  suggestionText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.medium,
    color: BRAND.primary,
  },
  disclaimer: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.muted,
    textAlign: 'center',
    marginTop: SPACING[2],
  },
  bottomPadding: {
    height: 40,
  },
});
