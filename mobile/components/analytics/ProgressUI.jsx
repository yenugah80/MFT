import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { CARD_SYSTEM, RADIUS, SPACING, SURFACES, TEXT, TYPOGRAPHY } from '../../constants/premiumTheme';

export const PERIOD_COPY = {
  today: { eyebrow: 'TODAY', noun: 'today', adjective: "Today's" },
  week: { eyebrow: 'LAST 7 DAYS', noun: 'in the last 7 days', adjective: '7-day' },
  month: { eyebrow: 'LAST 30 DAYS', noun: 'in the last 30 days', adjective: '30-day' },
};

export function ProgressHero({ color, tint, eyebrow, title, subtitle, badge, icon, value, valueLabel }) {
  return (
    <LinearGradient colors={[tint, '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { borderColor: `${color}24` }]}>
      <View style={styles.heroCopy}>
        <Text style={[styles.eyebrow, { color }]}>{eyebrow}</Text>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroSubtitle}>{subtitle}</Text>
        {!!badge && <View style={[styles.badge, { backgroundColor: `${color}12` }]}><Ionicons name="information-circle-outline" size={14} color={color} /><Text style={[styles.badgeText, { color }]}>{badge}</Text></View>}
      </View>
      <View style={[styles.heroVisual, { backgroundColor: `${color}12` }]}>
        <Ionicons name={icon} size={30} color={color} />
        {value !== undefined && <Text style={styles.heroValue} adjustsFontSizeToFit numberOfLines={1}>{value}</Text>}
        {!!valueLabel && <Text style={styles.heroValueLabel}>{valueLabel}</Text>}
      </View>
    </LinearGradient>
  );
}

export function MetricTile({ icon, color, value, label, hint }) {
  return (
    <View style={styles.metric} accessible accessibilityLabel={`${label}, ${value}. ${hint || ''}`}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}12` }]}><Ionicons name={icon} size={18} color={color} /></View>
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.metricLabel} numberOfLines={2}>{label}</Text>
      {!!hint && <Text style={styles.metricHint} numberOfLines={2}>{hint}</Text>}
    </View>
  );
}

export function MetricRow({ children }) { return <View style={styles.metricRow}>{children}</View>; }
export function ProgressCard({ children, style }) { return <View style={[styles.card, style]}>{children}</View>; }

export function SectionHeader({ eyebrow, title, subtitle, icon, color }) {
  return <View style={styles.sectionHeader}><View style={[styles.sectionIcon, { backgroundColor: `${color}12` }]}><Ionicons name={icon} size={19} color={color} /></View><View style={styles.sectionCopy}><Text style={[styles.sectionEyebrow, { color }]}>{eyebrow}</Text><Text style={styles.sectionTitle}>{title}</Text>{!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}</View></View>;
}

export function SectionIntro({ eyebrow, title, subtitle, color }) {
  return <View style={styles.intro}><Text style={[styles.introEyebrow, { color }]}>{eyebrow}</Text><Text style={styles.introTitle}>{title}</Text>{!!subtitle && <Text style={styles.introSubtitle}>{subtitle}</Text>}</View>;
}

export function ProgressBar({ label, value, displayValue, color, icon }) {
  const safeValue = Math.max(0, Math.min(Number(value) || 0, 100));
  return <View style={styles.progressRow} accessible accessibilityLabel={`${label}, ${displayValue || `${Math.round(safeValue)} percent`}`}><View style={styles.progressHeader}><View style={styles.progressName}>{!!icon && <Ionicons name={icon} size={15} color={color} />}<Text style={styles.progressLabel}>{label}</Text></View><Text style={[styles.progressValue, { color }]}>{displayValue || `${Math.round(safeValue)}%`}</Text></View><View style={styles.track}><View style={[styles.fill, { width: `${safeValue}%`, backgroundColor: color }]} /></View></View>;
}

export function InsightList({ items }) {
  return <ProgressCard>{items.map((item, index) => <View key={item.title || index} style={[styles.insight, index > 0 && styles.divider]}><View style={[styles.insightIcon, { backgroundColor: `${item.color}12` }]}><Ionicons name={item.icon} size={19} color={item.color} /></View><View style={styles.insightCopy}><Text style={styles.insightTitle}>{item.title}</Text><Text style={styles.insightMessage}>{item.message}</Text></View></View>)}</ProgressCard>;
}

export function ProgressAction({ icon, label, hint, color, onPress }) {
  return <TouchableOpacity style={styles.action} onPress={onPress} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint}><View style={[styles.actionIcon, { backgroundColor: `${color}12` }]}><Ionicons name={icon} size={18} color={color} /></View><View style={styles.actionCopy}><Text style={styles.actionLabel}>{label}</Text><Text style={styles.actionHint} numberOfLines={2}>{hint}</Text></View><Ionicons name="chevron-forward" size={17} color={TEXT.tertiary} /></TouchableOpacity>;
}

export function ActionRow({ children }) { return <View style={styles.actionRow}>{children}</View>; }

const styles = StyleSheet.create({
  hero: { minHeight: 154, borderRadius: RADIUS['2xl'], borderWidth: 1, padding: SPACING[4], marginBottom: SPACING[3], flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  heroCopy: { flex: 1, paddingRight: SPACING[3] },
  eyebrow: { fontSize: 10, letterSpacing: 1.1, fontFamily: TYPOGRAPHY.family.bold, marginBottom: SPACING[1] },
  heroTitle: { fontSize: TYPOGRAPHY.size['2xl'], lineHeight: 29, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },
  heroSubtitle: { marginTop: SPACING[1], fontSize: TYPOGRAPHY.size.sm, lineHeight: 18, color: TEXT.secondary },
  badge: { marginTop: SPACING[3], alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: RADIUS.full, paddingHorizontal: SPACING[2], paddingVertical: 5 },
  badgeText: { fontSize: 10, fontFamily: TYPOGRAPHY.family.semibold },
  heroVisual: { width: 94, minHeight: 94, borderRadius: 29, alignItems: 'center', justifyContent: 'center', padding: SPACING[2] },
  heroValue: { maxWidth: 82, marginTop: 2, fontSize: TYPOGRAPHY.size['2xl'], fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },
  heroValueLabel: { marginTop: 1, fontSize: 9, color: TEXT.tertiary, textAlign: 'center' },
  metricRow: { flexDirection: 'row', gap: SPACING[2], marginBottom: SPACING[3] },
  metric: { ...CARD_SYSTEM.compact, flex: 1, minWidth: 0, minHeight: 122, overflow: 'hidden', backgroundColor: SURFACES.card.primary, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: SURFACES.card.border, padding: SPACING[3], alignItems: 'center', marginBottom: 0 },
  metricIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING[2] },
  metricValue: { width: '100%', fontSize: TYPOGRAPHY.size.xl, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary, textAlign: 'center' },
  metricLabel: { width: '100%', minHeight: 14, marginTop: 2, fontSize: 10, lineHeight: 13, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.secondary, textAlign: 'center' },
  metricHint: { marginTop: 3, width: '100%', fontSize: 9, lineHeight: 12, color: TEXT.tertiary, textAlign: 'center' },
  card: { ...CARD_SYSTEM.standard, borderRadius: RADIUS['2xl'], marginBottom: SPACING[3] },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING[3] },
  sectionIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: SPACING[3] },
  sectionCopy: { flex: 1 },
  sectionEyebrow: { fontSize: 9, letterSpacing: 0.9, fontFamily: TYPOGRAPHY.family.bold, marginBottom: 2 },
  sectionTitle: { fontSize: TYPOGRAPHY.size.md, lineHeight: 20, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },
  sectionSubtitle: { marginTop: 3, fontSize: 11, lineHeight: 15, color: TEXT.tertiary },
  intro: { marginTop: SPACING[2], marginBottom: SPACING[3] },
  introEyebrow: { fontSize: 10, letterSpacing: 1, fontFamily: TYPOGRAPHY.family.bold },
  introTitle: { marginTop: 3, fontSize: TYPOGRAPHY.size.xl, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },
  introSubtitle: { marginTop: 4, fontSize: TYPOGRAPHY.size.sm, lineHeight: 18, color: TEXT.tertiary },
  progressRow: { gap: 6, marginBottom: SPACING[3] },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressName: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
  progressLabel: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.primary },
  progressValue: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold },
  track: { height: 7, overflow: 'hidden', borderRadius: RADIUS.full, backgroundColor: SURFACES.background.tertiary },
  fill: { height: '100%', borderRadius: RADIUS.full },
  insight: { flexDirection: 'row', paddingVertical: SPACING[2] },
  divider: { borderTopWidth: 1, borderTopColor: SURFACES.divider, marginTop: SPACING[2], paddingTop: SPACING[4] },
  insightIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: SPACING[3] },
  insightCopy: { flex: 1 },
  insightTitle: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.primary },
  insightMessage: { marginTop: 3, fontSize: 11, lineHeight: 16, color: TEXT.secondary },
  actionRow: { flexDirection: 'row', gap: SPACING[2], marginTop: SPACING[1] },
  action: { flex: 1, minWidth: 0, minHeight: 72, flexDirection: 'row', alignItems: 'center', backgroundColor: SURFACES.card.primary, borderWidth: 1, borderColor: SURFACES.card.border, borderRadius: RADIUS.xl, padding: SPACING[3] },
  actionIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: SPACING[2] },
  actionCopy: { flex: 1, minWidth: 0 },
  actionLabel: { fontSize: 11, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.primary },
  actionHint: { marginTop: 2, fontSize: 9, lineHeight: 12, color: TEXT.tertiary },
});
