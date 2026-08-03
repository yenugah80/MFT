/**
 * RecoveryHero (combo A+B, with the strain band as a handoff)
 *
 * The recovery score, how much of the model had data behind it, and the
 * arithmetic that produced it — in one card, so the number and its causes can
 * never disagree.
 *
 * The score is `50 + Σ (signal - 50) × weight`. A signal with no data
 * contributes nothing, so a thin day drags the result toward 50 while still
 * looking like a measurement. Previously the screen showed "50 · Moderate" to
 * someone who had logged nothing at all. Now coverage is stated, and below
 * half the model's weight the number is withheld entirely.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SEMANTIC,
  BRAND,
} from '../../constants/premiumTheme';
import { Hero, Strip } from './layout';
import * as Haptics from 'expo-haptics';

/**
 * Mirror of RECOVERY_FACTOR_WEIGHTS in the backend engine.
 *
 * The API only started returning per-factor weight/contribution recently, and
 * the mobile release does not land at the same moment as the backend deploy.
 * Without this fallback every row renders "not logged · 0%" against a server
 * that has not shipped the fields yet.
 */
const FALLBACK_WEIGHTS = {
  sleep: 0.4,
  stress: 0.25,
  activity_load: 0.2,
  hydration: 0.1,
  mood: 0.05,
};

/** Fill in whatever the server did not send */
const hydrateFactor = (factor) => {
  const counted = factor.counted ?? Number.isFinite(factor.value);
  const weight = factor.weight ?? FALLBACK_WEIGHTS[factor.factor] ?? 0;
  const contribution = Number.isFinite(factor.contribution)
    ? factor.contribution
    : counted
    ? Math.round((factor.value - 50) * weight)
    : null;
  return { ...factor, counted, weight, contribution };
};

const FACTOR_LABELS = {
  sleep: 'Sleep',
  stress: 'Stress',
  activity_load: 'Prior training',
  hydration: 'Hydration',
  mood: 'Mood',
};

/** Where a factor's contribution sits on a -20..+20 scale */
const OFFSET_RANGE = 20;

function ContributionRow({ factor: raw }) {
  const factor = hydrateFactor(raw);
  const label = FACTOR_LABELS[factor.factor] || factor.factor;
  const weightPct = Math.round((factor.weight || 0) * 100);

  if (!factor.counted) {
    return (
      <View style={styles.rowMissingWrap}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowMissing}>not logged · {weightPct}% of the score</Text>
      </View>
    );
  }

  const contribution = Number(factor.contribution) || 0;
  const magnitude = Math.min(Math.abs(contribution) / OFFSET_RANGE, 1);
  const positive = contribution >= 0;
  const color = positive ? SEMANTIC.success.base : SEMANTIC.danger.base;

  return (
    <View style={styles.row}>
      <View style={styles.rowLabelWrap}>
        <Text style={styles.rowLabel} numberOfLines={1}>
          {label}
        </Text>
        {!!factor.detail && (
          <Text style={styles.rowDetail} numberOfLines={1}>
            {factor.detail}
          </Text>
        )}
      </View>
      <View style={styles.rowTrack}>
        <View style={styles.rowCentre} />
        <View
          style={[
            styles.rowBar,
            {
              backgroundColor: color,
              width: `${Math.max(magnitude * 50, contribution === 0 ? 0 : 3)}%`,
              left: positive ? '50%' : undefined,
              right: positive ? undefined : '50%',
            },
          ]}
        />
      </View>
      <Text style={[styles.rowValue, { color }]}>
        {positive ? '+' : ''}
        {contribution}
      </Text>
    </View>
  );
}

/** The single factor that moved the score most, in plain words */
function headline(factors) {
  const counted = factors.filter((f) => f.counted && Number.isFinite(f.contribution));
  if (counted.length === 0) return null;

  const biggest = counted.reduce((best, f) =>
    Math.abs(f.contribution) > Math.abs(best.contribution) ? f : best
  );
  if (biggest.contribution === 0) return 'Everything logged sat near your baseline';

  const label = (FACTOR_LABELS[biggest.factor] || biggest.factor).toLowerCase();
  return biggest.contribution > 0
    ? `${label.charAt(0).toUpperCase()}${label.slice(1)} carried it today`
    : `${label.charAt(0).toUpperCase()}${label.slice(1)} held it back today`;
}

export default function RecoveryHero({ recovery, strainTarget, onLogSignal, onPlanSession, trend }) {
  // Detail is opt-in: the score and its main driver answer the daily question,
  // the five contribution rows are evidence for when it is questioned.
  const [showDetail, setShowDetail] = useState(false);
  const toggleDetail = useCallback(() => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowDetail((v) => !v);
  }, []);

  const { score, label, color, factors = [], coverage, baseline = 50 } = recovery || {};

  // Derive coverage locally when the server has not deployed the block yet
  const hydrated = factors.map(hydrateFactor);
  const countedFactors = hydrated.filter((f) => f.counted);
  const countedWeight = countedFactors.reduce((sum, f) => sum + f.weight, 0);

  // A signal with no data at all is omitted from `factors` rather than sent
  // with a null value, so absences have to be found by diffing against the
  // model's own signal list — otherwise the card reports missing weight with
  // nothing to attribute it to.
  const present = new Set(hydrated.map((f) => f.factor));
  const absent = Object.keys(FALLBACK_WEIGHTS).filter((key) => !present.has(key));
  const missingFactors = [
    ...hydrated.filter((f) => !f.counted),
    ...absent.map((factor) => ({ factor, weight: FALLBACK_WEIGHTS[factor] })),
  ];

  const counted = coverage?.counted ?? countedFactors.length;
  const total = coverage?.total ?? Object.keys(FALLBACK_WEIGHTS).length;
  const missingWeight = coverage?.missingWeight ?? Math.round((1 - countedWeight) * 100);
  const reliable = coverage?.isReliable ?? countedWeight >= 0.5;

  const missingLabels = (coverage?.missing || missingFactors.map((f) => f.factor))
    .map((key) => FACTOR_LABELS[key] || key)
    .join(' and ');

  // Tint the hero with the score's own colour, so readiness is legible before
  // a single number is read
  const accent = color || BRAND.primary;

  return (
    <Hero accent={accent}>
      <View style={styles.header}>
        <Text style={styles.title}>Recovery</Text>
        <TouchableOpacity
          style={styles.coveragePill}
          onPress={toggleDetail}
          activeOpacity={0.7}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${counted} of ${total} signals, ${showDetail ? 'hide' : 'show'} detail`}
        >
          <Ionicons
            name={reliable ? 'ellipse' : 'ellipse-outline'}
            size={9}
            color={reliable ? SEMANTIC.success.base : SEMANTIC.warning.base}
          />
          <Text style={styles.coverageText}>
            {counted} of {total} signals
          </Text>
          <Ionicons
            name={showDetail ? 'chevron-up' : 'chevron-down'}
            size={13}
            color={TEXT.tertiary}
          />
        </TouchableOpacity>
      </View>

      {!reliable ? (
        // Under half the model's weight, the number would be mostly baseline
        <>
          <Text style={styles.withheldValue}>—</Text>
          <Text style={styles.withheldBody}>
            {counted === 0
              ? 'Recovery needs sleep or stress data to mean anything. Without it this would be a baseline number, not a measurement.'
              : `${missingLabels} ${missingWeight >= 50 ? 'account' : 'accounts'} for ${missingWeight}% of the score — too much missing to report a figure yet.`}
          </Text>
          {!!onLogSignal && (
            <TouchableOpacity style={styles.ghostButton} onPress={onLogSignal} activeOpacity={0.85}>
              <Text style={styles.ghostButtonText}>Log today&apos;s signals</Text>
              <Ionicons name="chevron-forward" size={14} color={BRAND.primary} />
            </TouchableOpacity>
          )}
        </>
      ) : (
        <>
          <View style={styles.scoreRow}>
            <Text style={[styles.score, { color: color || TEXT.primary }]}>{score}</Text>
            <Text style={styles.scoreLabel}>{label}</Text>
          </View>

          <View style={styles.scoreTrack}>
            <View
              style={[
                styles.scoreFill,
                { width: `${Math.max(0, Math.min(score, 100))}%`, backgroundColor: color || BRAND.primary },
              ]}
            />
          </View>

          {showDetail && missingWeight > 0 && (
            <Text style={styles.caveat}>
              {missingLabels} not logged — {missingWeight}% of the model had no data.
            </Text>
          )}

          {!showDetail ? (
            !!headline(hydrated) && <Text style={styles.headline}>{headline(hydrated)}</Text>
          ) : (
            <>
              <Text style={styles.sectionLabel}>What moved it</Text>
              {factors.map((factor) => (
                <ContributionRow key={factor.factor} factor={factor} />
              ))}
              <Text style={styles.baseline}>
                Baseline {baseline} → {score}
              </Text>
              {/* Recovery history extends the score, so it sits with it rather
                  than under weekly training volume */}
              {!!trend && <View style={styles.trendSlot}>{trend}</View>}
            </>
          )}

          {/* Readiness translated into a session length — a handoff, not a
              competing recommendation. The plan itself lives on Activity. */}
          {showDetail && !!strainTarget && (
            <Strip onPress={onPlanSession} actionLabel="Plan a session">
              Ready for a {strainTarget.zone?.name?.toLowerCase() || 'moderate'} session
              {strainTarget.target ? ` — target strain ${strainTarget.target}` : ''}.
            </Strip>
          )}
        </>
      )}
    </Hero>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[3],
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  coveragePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  coverageText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING[2],
  },
  score: {
    fontSize: 44,
    lineHeight: 48,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  scoreLabel: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },
  scoreTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    marginTop: SPACING[2],
  },
  scoreFill: {
    height: '100%',
    borderRadius: 4,
  },
  caveat: {
    marginTop: SPACING[2],
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: SEMANTIC.warning.base,
  },

  withheldValue: {
    fontSize: 44,
    lineHeight: 48,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.muted,
  },
  withheldBody: {
    marginTop: SPACING[1],
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    lineHeight: 19,
  },

  headline: {
    marginTop: SPACING[2],
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  trendSlot: {
    marginTop: SPACING[3],
    marginHorizontal: -SPACING[2],
  },
  sectionLabel: {
    marginTop: SPACING[4],
    marginBottom: SPACING[2],
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.tertiary,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  rowLabelWrap: {
    width: 104,
  },
  rowDetail: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.muted,
  },
  rowMissingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[2],
  },
  rowLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  rowTrack: {
    flex: 1,
    height: 14,
    justifyContent: 'center',
  },
  rowCentre: {
    position: 'absolute',
    left: '50%',
    width: 1,
    height: 14,
    backgroundColor: 'rgba(0,0,0,0.10)',
  },
  rowBar: {
    position: 'absolute',
    height: 6,
    borderRadius: 3,
  },
  rowMissing: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.muted,
  },
  rowValue: {
    width: 34,
    textAlign: 'right',
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  rowValueMuted: {
    width: 34,
    textAlign: 'right',
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
  },
  baseline: {
    marginTop: SPACING[1],
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },


  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[1],
    marginTop: SPACING[3],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.md,
    backgroundColor: `${BRAND.primary}12`,
  },
  ghostButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },
});
