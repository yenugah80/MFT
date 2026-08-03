/**
 * Layout primitives for the activity and recovery surfaces.
 *
 * These screens had grown to fifteen identical white cards stacked vertically:
 * nothing signalled importance, nothing grouped, so a personal-best row had the
 * same visual weight as the weekly ring. The content was right and the
 * structure was flat.
 *
 * Four tiers, used consistently:
 *
 *   Hero     tinted surface, large numerals — the one number that matters
 *   Card     white surface, optional accent chip — a chart or a comparison
 *   Dense    rows inside a single card, no chrome per row
 *   Strip    borderless inline text — handoffs, coverage, footnotes
 *
 * Everything is built from existing design tokens, so these screens stay in the
 * same visual family as Dashboard, Log and Profile.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

// LayoutAnimation needs opting into on Android; on iOS it is on by default
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Groups cards without adding another container around them */
export function SectionHeader({ title, action, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      {!!action && !!onAction && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Tier 2. `accent` tints the icon chip and nothing else — the card stays white
 * so a screen of them does not turn into a paint chart.
 */
export function Card({ title, icon, accent = BRAND.primary, meta, children, style }) {
  return (
    <View style={[styles.card, style]}>
      {(!!title || !!meta) && (
        <View style={styles.cardHeader}>
          {!!icon && (
            <View style={[styles.chip, { backgroundColor: `${accent}18` }]}>
              <Ionicons name={icon} size={15} color={accent} />
            </View>
          )}
          {!!title && <Text style={styles.cardTitle}>{title}</Text>}
          {!!meta && <Text style={styles.cardMeta}>{meta}</Text>}
        </View>
      )}
      {children}
    </View>
  );
}

/**
 * Tier 1. A tinted surface rather than a saturated gradient: the numbers on top
 * have to stay legible, and a full-bleed gradient forces white text that then
 * clashes with every other screen.
 */
export function Hero({ accent = BRAND.primary, children, style }) {
  // A wash rather than a flat fill: the gradient gives the card depth without
  // forcing white text the way a saturated gradient would.
  return (
    <LinearGradient
      colors={[`${accent}1F`, `${accent}08`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, { borderColor: `${accent}2A` }, style]}
    >
      {children}
    </LinearGradient>
  );
}

/** Tier 3. Pair two of these to replace two full-width single-fact cards. */
export function StatTile({ value, label, delta, accent = BRAND.primary, style }) {
  return (
    <View style={[styles.tile, style]}>
      <Text style={[styles.tileValue, { color: accent }]}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
      {delta !== undefined && <Text style={styles.tileDelta}>{delta}</Text>}
    </View>
  );
}

/** Lays tiles out two-up with consistent spacing */
export function TileRow({ children }) {
  return <View style={styles.tileRow}>{children}</View>;
}

/** Tier 4. Inline, borderless — a handoff or a caveat, never a headline. */
export function Strip({ children, onPress, actionLabel }) {
  return (
    <View style={styles.strip}>
      <Text style={styles.stripText}>{children}</Text>
      {!!onPress && !!actionLabel && (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.stripAction}>
          <Text style={styles.stripActionText}>{actionLabel}</Text>
          <Ionicons name="arrow-forward" size={13} color={BRAND.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * A section that stays out of the way until asked for.
 *
 * Merging Recovery into this screen made it six sections and roughly eighteen
 * cards — organised, but a wall on open. Only a handful are daily questions
 * ("am I ready", "how is the week", "what next"); the rest are review, and
 * review should be opt-in rather than scrolled past every time.
 */
export function CollapsibleSection({
  title,
  subtitle,
  icon,
  accent = BRAND.primary,
  badge,
  defaultOpen = false,
  open: openProp,
  onToggle,
  children,
}) {
  const [openState, setOpenState] = useState(defaultOpen);

  // Controlled when a parent passes `open` — lets a summary elsewhere on the
  // screen reveal the section it summarises.
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;

  const toggle = useCallback(() => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (isControlled) onToggle?.(!openProp);
    else setOpenState((value) => !value);
  }, [isControlled, onToggle, openProp]);

  return (
    <View style={styles.collapsible}>
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.8}
        style={[styles.collapsibleHeader, open && styles.collapsibleHeaderOpen]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}, ${open ? 'expanded' : 'collapsed'}`}
      >
        {!!icon && (
          <View style={[styles.collapsibleChip, { backgroundColor: `${accent}18` }]}>
            <Ionicons name={icon} size={17} color={accent} />
          </View>
        )}
        <View style={styles.collapsibleTitleWrap}>
          <Text style={styles.collapsibleTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.collapsibleSubtitle}>{subtitle}</Text>}
        </View>
        {!!badge && (
          <View style={[styles.collapsibleBadge, { backgroundColor: `${accent}14` }]}>
            <Text style={[styles.collapsibleBadgeText, { color: accent }]}>{badge}</Text>
          </View>
        )}
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={TEXT.tertiary}
        />
      </TouchableOpacity>
      {open && <View>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  collapsible: {
    marginBottom: SPACING[3],
  },
  // A tappable row deserves to look tappable: a card, not text on background
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    ...SHADOWS.sm,
  },
  collapsibleHeaderOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: SPACING[2],
  },
  collapsibleChip: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsibleTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  collapsibleTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  collapsibleSubtitle: {
    marginTop: 1,
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  collapsibleBadge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  collapsibleBadgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING[2],
    marginBottom: SPACING[2],
    paddingHorizontal: SPACING[1],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.tertiary,
    letterSpacing: 1,
  },
  sectionAction: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },

  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  chip: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  cardMeta: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },

  hero: {
    borderRadius: RADIUS['2xl'],
    borderWidth: 1,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    overflow: 'hidden',
  },

  tileRow: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  tile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[3],
    ...SHADOWS.sm,
  },
  tileValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontFamily: TYPOGRAPHY.family.bold,
  },
  tileLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  tileDelta: {
    marginTop: 1,
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
  },

  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING[3],
    paddingTop: SPACING[3],
    marginTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  stripText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 19,
  },
  stripAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  stripActionText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },
});

export default { SectionHeader, CollapsibleSection, Card, Hero, StatTile, TileRow, Strip };
