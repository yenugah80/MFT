/**
 * SmartInsightsCard
 *
 * Surfaces POST /activity/insights, which sends training patterns and
 * correlations to OpenAI and returns written observations.
 *
 * The endpoint has four meaningful outcomes and this card handles all four
 * explicitly, because each needs a different thing from the user:
 *
 *   403 + openai_consent_required — the user has not agreed to AI processing
 *   insights: [] + message         — fewer than 7 sessions, nothing to analyse
 *   insights: [...]                — observations
 *   error                          — retry
 *
 * Generation is never automatic. It costs a model call and sends data to a
 * third party, so it happens when asked for.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  SURFACES,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  BRAND,
} from '../../constants/premiumTheme';

const TYPE_ICON = {
  achievement: 'trophy-outline',
  positive: 'trending-up-outline',
  suggestion: 'bulb-outline',
  tip: 'information-circle-outline',
  warning: 'alert-circle-outline',
};

export default function SmartInsightsCard({
  insights,
  message,
  dataPoints,
  minDataRequired,
  needsConsent,
  isLoading,
  error,
  onGenerate,
  onGiveConsent,
}) {
  const [hasAsked, setHasAsked] = useState(false);

  const generate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHasAsked(true);
    onGenerate?.();
  }, [onGenerate]);

  const body = () => {
    if (isLoading) {
      return (
        <View style={styles.centre}>
          <ActivityIndicator size="small" color={BRAND.primary} />
          <Text style={styles.muted}>Reading your last 30 days…</Text>
        </View>
      );
    }

    if (needsConsent) {
      return (
        <>
          <Text style={styles.body}>
            This sends your training patterns — sessions, timing and intensity — to
            OpenAI to be written up. It needs your consent first, and you can withdraw
            it at any time.
          </Text>
          {!!onGiveConsent && (
            <TouchableOpacity style={styles.primary} onPress={onGiveConsent} activeOpacity={0.85}>
              <Text style={styles.primaryText}>Review and allow</Text>
            </TouchableOpacity>
          )}
        </>
      );
    }

    if (error) {
      return (
        <>
          <Text style={styles.body}>{error}</Text>
          <TouchableOpacity style={styles.ghost} onPress={generate} activeOpacity={0.85}>
            <Text style={styles.ghostText}>Try again</Text>
          </TouchableOpacity>
        </>
      );
    }

    // Not enough history — the endpoint says how much is missing, so repeat it
    if (message && (!insights || insights.length === 0)) {
      const have = dataPoints?.activities ?? 0;
      const need = minDataRequired?.activities ?? 7;
      return (
        <>
          <Text style={styles.body}>{message}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min((have / need) * 100, 100)}%` }]} />
          </View>
          <Text style={styles.muted}>
            {have} of {need} sessions
          </Text>
        </>
      );
    }

    if (insights?.length > 0) {
      return (
        <>
          {insights.map((insight, index) => (
            <View key={insight.id ?? index} style={styles.insight}>
              <Ionicons
                name={TYPE_ICON[insight.type] || 'sparkles-outline'}
                size={16}
                color={BRAND.primary}
                style={styles.insightIcon}
              />
              <View style={styles.insightBody}>
                {!!insight.title && <Text style={styles.insightTitle}>{insight.title}</Text>}
                <Text style={styles.insightText}>{insight.message || insight.text}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.ghost} onPress={generate} activeOpacity={0.85}>
            <Text style={styles.ghostText}>Refresh</Text>
          </TouchableOpacity>
        </>
      );
    }

    if (hasAsked) {
      return <Text style={styles.muted}>Nothing stood out in your recent training.</Text>;
    }

    return (
      <>
        <Text style={styles.body}>
          Have your last 30 days read for patterns you would not spot yourself.
        </Text>
        <TouchableOpacity style={styles.primary} onPress={generate} activeOpacity={0.85}>
          <Ionicons name="sparkles" size={15} color="#fff" />
          <Text style={styles.primaryText}>Generate insights</Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.chip}>
          <Ionicons name="sparkles" size={15} color={BRAND.primary} />
        </View>
        <Text style={styles.title}>Smart insights</Text>
        {!!insights?.length && <Text style={styles.meta}>{insights.length}</Text>}
      </View>
      {body()}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    ...SHADOWS.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  chip: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${BRAND.primary}18`,
  },
  title: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  meta: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
  },
  body: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 19,
  },
  muted: {
    marginTop: SPACING[2],
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  centre: {
    alignItems: 'center',
    paddingVertical: SPACING[3],
    gap: SPACING[1],
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    marginTop: SPACING[3],
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: BRAND.primary,
  },
  insight: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  insightIcon: {
    marginTop: 1,
  },
  insightBody: {
    flex: 1,
  },
  insightTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  insightText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 19,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    marginTop: SPACING[3],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: BRAND.primary,
  },
  primaryText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#fff',
  },
  ghost: {
    alignSelf: 'flex-start',
    marginTop: SPACING[1],
    paddingVertical: SPACING[2],
  },
  ghostText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },
});
