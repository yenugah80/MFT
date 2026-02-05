/**
 * SmartRecommendationCard - Premium Recommendation Experience
 *
 * Design Principles:
 * 1. VISUAL HIERARCHY - Clear scanning path: Rank > Name > Reason > Nutrients > Action
 * 2. TACTILE FEEDBACK - Responsive to touch with haptics
 * 3. INFORMATION DENSITY - Rich data without overwhelm
 * 4. PERSONALITY - Encouraging language, playful iconography
 * 5. ACCESSIBILITY - High contrast, adequate touch targets
 *
 * Features:
 * - Animated expand/collapse with LayoutAnimation
 * - Gradient-enhanced category icons
 * - Quick-log with press animation
 * - Rich nutrient visualization with highlighting
 * - Score badge with semantic meaning
 * - Category-based theming
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  BRAND,
  CARD_SYSTEM,
  VIBRANT_WELLNESS,
} from '../../constants/premiumTheme';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================================================
// CATEGORY CONFIGURATION - Premium Design
// ============================================================================

const CATEGORY_CONFIG = {
  protein: {
    icon: 'fish',
    emoji: '🥩',
    gradient: ['#FF6B6B', '#EE5A5A'],
    color: '#EF4444',
    lightBg: '#FEE2E2',
  },
  carbs: {
    icon: 'leaf',
    emoji: '🍞',
    gradient: ['#FFD93D', '#F59E0B'],
    color: '#F59E0B',
    lightBg: '#FEF3C7',
  },
  vegetables: {
    icon: 'nutrition',
    emoji: '🥗',
    gradient: ['#34D399', '#10B981'],
    color: '#10B981',
    lightBg: '#D1FAE5',
  },
  fats: {
    icon: 'water',
    emoji: '🥑',
    gradient: ['#A78BFA', '#8B5CF6'],
    color: '#8B5CF6',
    lightBg: '#EDE9FE',
  },
  fruit: {
    icon: 'rose',
    emoji: '🍎',
    gradient: ['#F472B6', '#EC4899'],
    color: '#EC4899',
    lightBg: '#FCE7F3',
  },
  dairy: {
    icon: 'cafe',
    emoji: '🥛',
    gradient: ['#22D3EE', '#06B6D4'],
    color: '#06B6D4',
    lightBg: '#CFFAFE',
  },
  snack: {
    icon: 'cafe',
    emoji: '🥜',
    gradient: ['#60A5FA', '#3B82F6'],
    color: '#3B82F6',
    lightBg: '#DBEAFE',
  },
  meal: {
    icon: 'restaurant',
    emoji: '🍽️',
    gradient: ['#818CF8', '#6366F1'],
    color: '#6366F1',
    lightBg: '#E0E7FF',
  },
  treat: {
    icon: 'heart',
    emoji: '🍫',
    gradient: ['#FB923C', '#F97316'],
    color: '#F97316',
    lightBg: '#FFEDD5',
  },
};

// Nutrient colors
const NUTRIENT_COLORS = {
  calories: { primary: '#EF4444', bg: '#FEF2F2' },
  protein: { primary: '#3B82F6', bg: '#EFF6FF' },
  carbs: { primary: '#F59E0B', bg: '#FFFBEB' },
  fat: { primary: '#8B5CF6', bg: '#F5F3FF' },
  fiber: { primary: '#10B981', bg: '#ECFDF5' },
};

// Score configuration
const SCORE_CONFIG = {
  getColor: (score) => {
    if (score >= 85) return '#10B981';
    if (score >= 70) return '#3B82F6';
    if (score >= 50) return '#F59E0B';
    return '#EF4444';
  },
  getLabel: (score) => {
    if (score >= 85) return 'Perfect';
    if (score >= 70) return 'Great';
    if (score >= 50) return 'Good';
    return 'Fair';
  },
};

// ============================================================================
// NUTRIENT PILL COMPONENT - Enhanced
// ============================================================================

function NutrientPill({ label, value, color, highlight = false }) {
  const bgOpacity = highlight ? '25' : '12';

  return (
    <View style={[styles.nutrientPill, { backgroundColor: color + bgOpacity }]}>
      <Text style={[styles.nutrientLabel, { color }]}>{label}</Text>
      <Text style={[styles.nutrientValue, { color }]}>{value}</Text>
    </View>
  );
}

// ============================================================================
// SCORE BADGE COMPONENT
// ============================================================================

function ScoreBadge({ score }) {
  if (!score) return null;

  const color = SCORE_CONFIG.getColor(score);

  return (
    <View style={[styles.scoreBadge, { backgroundColor: color + '15' }]}>
      <Ionicons name="star" size={10} color={color} />
      <Text style={[styles.scoreText, { color }]}>{score}</Text>
    </View>
  );
}

// ============================================================================
// REASON TAG COMPONENT
// ============================================================================

function ReasonTag({ reason, priority }) {
  const colors = {
    high: { bg: '#10B98115', text: '#10B981', dot: '#10B981' },
    medium: { bg: '#3B82F615', text: '#3B82F6', dot: '#3B82F6' },
    low: { bg: '#6B728015', text: '#6B7280', dot: '#6B7280' },
  };

  const scheme = colors[priority] || colors.medium;

  return (
    <View style={[styles.reasonTag, { backgroundColor: scheme.bg }]}>
      <View style={[styles.reasonDot, { backgroundColor: scheme.dot }]} />
      <Text style={[styles.reasonTagText, { color: scheme.text }]} numberOfLines={1}>
        {typeof reason === 'string' ? reason : reason.impact}
      </Text>
    </View>
  );
}

// ============================================================================
// SMART RECOMMENDATION CARD - Main Component
// ============================================================================

export default function SmartRecommendationCard({
  recommendation,
  onQuickLog,
  isLogging = false,
  rank,
  showRank = true,
}) {
  const [expanded, setExpanded] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const {
    name,
    category = 'meal',
    nutrition = {},
    explanation,
    primaryReason,
    allReasons = [],
    prepTime,
    difficulty,
    tags = [],
    mealType,
    score,
    satiety,
    energyImpact,
  } = recommendation;

  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.meal;

  // Handle expand/collapse with animation
  const handleToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  }, [expanded]);

  // Handle quick log with press animation
  const handleQuickLog = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.97,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    onQuickLog?.(recommendation);
  }, [onQuickLog, recommendation, scaleAnim]);

  // Get priority reasons (high and medium only, max 3)
  const priorityReasons = allReasons
    .filter(r => r.priority === 'high' || r.priority === 'medium')
    .slice(0, 3);

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <View style={[styles.card, { borderLeftColor: config.color }]}>
        {/* ============ HEADER ROW ============ */}
        <TouchableOpacity
          style={styles.header}
          onPress={handleToggle}
          activeOpacity={0.7}
        >
          <View style={styles.headerLeft}>
            {/* Rank Badge */}
            {showRank && rank && (
              <View style={[styles.rankBadge, { backgroundColor: config.lightBg }]}>
                <Text style={[styles.rankText, { color: config.color }]}>#{rank}</Text>
              </View>
            )}

            {/* Category Icon with Gradient */}
            <LinearGradient
              colors={config.gradient}
              style={styles.iconContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={config.icon} size={20} color="#FFFFFF" />
            </LinearGradient>

            {/* Title & Meal Type */}
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={2}>{name}</Text>
              <View style={styles.subtitleRow}>
                <Text style={styles.mealType}>{mealType}</Text>
                <ScoreBadge score={score} />
              </View>
            </View>
          </View>

          {/* Expand Icon */}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={TEXT.tertiary}
          />
        </TouchableOpacity>

        {/* ============ EXPLANATION BOX ============ */}
        <View style={[styles.explanationBox, { backgroundColor: config.color + '08' }]}>
          <Ionicons name="sparkles" size={14} color={config.color} />
          <Text style={styles.explanation} numberOfLines={expanded ? undefined : 2}>
            {explanation || primaryReason}
          </Text>
        </View>

        {/* ============ NUTRIENT PILLS ============ */}
        <View style={styles.nutrientsRow}>
          <NutrientPill
            label="Cal"
            value={nutrition.calories || 0}
            color={NUTRIENT_COLORS.calories.primary}
          />
          <NutrientPill
            label="Pro"
            value={`${nutrition.protein || 0}g`}
            color={NUTRIENT_COLORS.protein.primary}
            highlight={category === 'protein'}
          />
          <NutrientPill
            label="Carb"
            value={`${nutrition.carbs || 0}g`}
            color={NUTRIENT_COLORS.carbs.primary}
            highlight={category === 'carbs'}
          />
          <NutrientPill
            label="Fat"
            value={`${nutrition.fat || nutrition.fats || 0}g`}
            color={NUTRIENT_COLORS.fat.primary}
            highlight={category === 'fats'}
          />
          {(nutrition.fiber || 0) > 0 && (
            <NutrientPill
              label="Fib"
              value={`${nutrition.fiber}g`}
              color={NUTRIENT_COLORS.fiber.primary}
            />
          )}
        </View>

        {/* ============ EXPANDED CONTENT ============ */}
        {expanded && (
          <View style={styles.expandedSection}>
            {/* Meta Info Row */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={TEXT.tertiary} />
                <Text style={styles.metaText}>{prepTime || 10} min</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="speedometer-outline" size={14} color={TEXT.tertiary} />
                <Text style={styles.metaText}>{difficulty || 'easy'}</Text>
              </View>
              {satiety && (
                <View style={styles.metaItem}>
                  <Ionicons name="battery-charging" size={14} color={TEXT.tertiary} />
                  <Text style={styles.metaText}>{satiety}</Text>
                </View>
              )}
              {energyImpact && (
                <View style={styles.metaItem}>
                  <Ionicons name="flash" size={14} color="#F59E0B" />
                  <Text style={styles.metaText}>{energyImpact}</Text>
                </View>
              )}
            </View>

            {/* Why This Food */}
            {priorityReasons.length > 0 && (
              <View style={styles.reasonsSection}>
                <Text style={styles.reasonsTitle}>Why this food?</Text>
                <View style={styles.reasonsList}>
                  {priorityReasons.map((reason, idx) => (
                    <ReasonTag key={idx} reason={reason} priority={reason.priority} />
                  ))}
                </View>
              </View>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <View style={styles.tagsRow}>
                {tags.slice(0, 4).map((tag, idx) => (
                  <View key={idx} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ============ QUICK LOG BUTTON ============ */}
        <TouchableOpacity
          style={styles.quickLogButton}
          onPress={handleQuickLog}
          disabled={isLogging}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={isLogging ? ['#9CA3AF', '#9CA3AF'] : config.gradient}
            style={styles.quickLogGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isLogging ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                <Text style={styles.quickLogText}>Quick Log</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ============================================================================
// SMART RECOMMENDATIONS LIST
// ============================================================================

export function SmartRecommendationsList({
  recommendations = [],
  onQuickLog,
  loggingId = null,
  emptyMessage = 'No recommendations available',
}) {
  if (recommendations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrapper}>
          <Ionicons name="restaurant-outline" size={40} color={TEXT.tertiary} />
        </View>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {recommendations.map((rec, index) => (
        <SmartRecommendationCard
          key={rec.id || index}
          recommendation={rec}
          onQuickLog={onQuickLog}
          isLogging={loggingId === rec.id}
          rank={index + 1}
        />
      ))}
    </View>
  );
}

// ============================================================================
// SMART SUMMARY CARD
// ============================================================================

export function SmartRecommendationSummary({ summary, nutritionalStatus, userContext }) {
  if (!summary) return null;

  return (
    <View style={styles.summaryCard}>
      {/* Headline */}
      <Text style={styles.summaryHeadline}>{summary.headline}</Text>
      <Text style={styles.summarySubtext}>{summary.subtext}</Text>

      {/* Status Pills */}
      {summary.status && (
        <View style={styles.statusRow}>
          <View style={styles.statusPill}>
            <Ionicons name="flame" size={15} color={VIBRANT_WELLNESS.nutrition.solid} />
            <Text style={styles.statusText}>{summary.status.calories}</Text>
          </View>
          <View style={styles.statusPill}>
            <Ionicons name="barbell" size={15} color="#3B82F6" />
            <Text style={styles.statusText}>{summary.status.protein}</Text>
          </View>
        </View>
      )}

      {/* Priority Nutrients */}
      {summary.priorities?.length > 0 && (
        <View style={styles.priorityContainer}>
          <Text style={styles.priorityLabel}>Focus on:</Text>
          <View style={styles.priorityTags}>
            {summary.priorities.map((priority, idx) => (
              <View key={idx} style={styles.priorityTag}>
                <Text style={styles.priorityTagText}>{priority}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Card wrapper for animation
  cardWrapper: {
    marginBottom: SPACING[3],
  },

  // Main card - premium elevated style
  card: {
    backgroundColor: SURFACES.card,
    borderRadius: 20,
    borderLeftWidth: 4,
    padding: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankBadge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    marginRight: SPACING[2],
  },
  rankText: {
    fontSize: 11,
    fontWeight: '700',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: '600',
    color: TEXT.primary,
    lineHeight: 20,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: SPACING[2],
  },
  mealType: {
    fontSize: 12,
    color: TEXT.tertiary,
    textTransform: 'capitalize',
  },

  // Score badge
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    gap: 3,
  },
  scoreText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Explanation box
  explanationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING[3],
    borderRadius: RADIUS.md,
    marginBottom: SPACING[3],
    gap: SPACING[2],
  },
  explanation: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 18,
  },

  // Nutrients row
  nutrientsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  nutrientPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1] + 2,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  nutrientLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  nutrientValue: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Expanded section
  expandedSection: {
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
    paddingTop: SPACING[3],
    marginBottom: SPACING[2],
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[4],
    marginBottom: SPACING[3],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  metaText: {
    fontSize: 12,
    color: TEXT.secondary,
    textTransform: 'capitalize',
  },

  // Reasons section
  reasonsSection: {
    marginBottom: SPACING[3],
  },
  reasonsTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    color: TEXT.primary,
    marginBottom: SPACING[2],
  },
  reasonsList: {
    gap: SPACING[2],
  },
  reasonTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.md,
    gap: SPACING[2],
  },
  reasonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  reasonTagText: {
    flex: 1,
    fontSize: 13,
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: SURFACES.background.tertiary,
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.sm,
  },
  tagText: {
    fontSize: 11,
    color: TEXT.tertiary,
  },

  // Quick log button
  quickLogButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  quickLogGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[3],
    gap: SPACING[2],
  },
  quickLogText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // List container
  listContainer: {
    marginTop: SPACING[2],
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING[8],
    gap: SPACING[3],
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: TEXT.tertiary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    textAlign: 'center',
  },

  // Summary card
  summaryCard: {
    backgroundColor: BRAND.primary + '08',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BRAND.primary + '15',
    padding: SPACING[4],
    marginBottom: SPACING[4],
  },
  summaryHeadline: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: '700',
    color: TEXT.primary,
    marginBottom: SPACING[1],
  },
  summarySubtext: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  statusRow: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginTop: SPACING[4],
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.card,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2] + 2,
    borderRadius: RADIUS.md,
    gap: SPACING[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  statusText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    color: TEXT.primary,
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: SPACING[3],
    gap: SPACING[2],
  },
  priorityLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '500',
    color: TEXT.tertiary,
  },
  priorityTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  priorityTag: {
    backgroundColor: '#F59E0B20',
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.sm,
  },
  priorityTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    textTransform: 'capitalize',
  },
});