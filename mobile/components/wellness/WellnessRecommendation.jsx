/**
 * WellnessRecommendation - Modern Sleek Insights Section
 *
 * Premium design with glassmorphism, gradients, and smooth animations.
 * Integrates with backend insights API for real recommendations.
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import { TEXT, SURFACES, BRAND } from '../../constants/premiumTheme';
import { SPACING, RADIUS } from '../../constants/designTokens';

// Type configurations
const TYPE_CONFIG = {
  protein: {
    icon: 'nutrition',
    route: '/(tabs)/log',
    gradient: ['#10B981', '#059669'],
    color: '#10B981',
  },
  hydration: {
    icon: 'water',
    route: '/(tabs)/log',
    gradient: ['#3B82F6', '#1D4ED8'],
    color: '#3B82F6',
  },
  logging: {
    icon: 'create',
    route: '/(tabs)/log',
    gradient: ['#8B5CF6', '#6D28D9'],
    color: '#8B5CF6',
  },
  activity: {
    icon: 'fitness',
    route: '/(tabs)/activity',
    gradient: ['#F59E0B', '#D97706'],
    color: '#F59E0B',
  },
  mood: {
    icon: 'happy',
    route: '/mood-log',
    gradient: ['#EC4899', '#DB2777'],
    color: '#EC4899',
  },
  default: {
    icon: 'sparkles',
    route: '/(tabs)/log',
    gradient: ['#6366F1', '#4F46E5'],
    color: '#6366F1',
  },
};

const getTypeConfig = (title = '') => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('protein')) return TYPE_CONFIG.protein;
  if (lowerTitle.includes('water') || lowerTitle.includes('hydrat')) return TYPE_CONFIG.hydration;
  if (lowerTitle.includes('activity') || lowerTitle.includes('exercise')) return TYPE_CONFIG.activity;
  if (lowerTitle.includes('mood')) return TYPE_CONFIG.mood;
  return TYPE_CONFIG.default;
};

/**
 * Primary Recommendation Card - Premium glassmorphism design
 */
export function PrimaryRecommendationCard({
  title,
  subtitle,
  whyMatters = [],
  difficulty = 'easy',
  impact = 'high',
  confidence,
  isLoading,
  onPress,
}) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const config = getTypeConfig(title);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    if (onPress) {
      onPress();
    } else {
      router.push(config.route);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingCard}>
        <LinearGradient
          colors={['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.05)']}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="small" color="#6366F1" />
          <Text style={styles.loadingText}>Analyzing your patterns...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.95}>
        <View style={styles.primaryCard}>
          {/* Gradient accent */}
          <LinearGradient
            colors={config.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientAccent}
          />

          {/* Header with icon */}
          <View style={styles.cardHeader}>
            <LinearGradient
              colors={[`${config.color}20`, `${config.color}10`]}
              style={styles.iconGradient}
            >
              <Ionicons name={config.icon} size={24} color={config.color} />
            </LinearGradient>
            <View style={styles.headerContent}>
              <Text style={styles.cardLabel}>RECOMMENDED</Text>
              <Text style={styles.cardTitle}>{title}</Text>
            </View>
          </View>

          {/* Subtitle */}
          <Text style={styles.cardSubtitle}>{subtitle}</Text>

          {/* Why it matters */}
          {whyMatters && whyMatters.length > 0 && (
            <View style={styles.whyBox}>
              <Ionicons name="information-circle" size={16} color={config.color} />
              <Text style={styles.whyText}>{whyMatters[0]}</Text>
            </View>
          )}

          {/* Meta badges */}
          <View style={styles.metaBadges}>
            <View style={[styles.badge, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="flash" size={12} color="#10B981" />
              <Text style={[styles.badgeText, { color: '#059669' }]}>
                {difficulty?.charAt(0).toUpperCase() + difficulty?.slice(1)}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="trending-up" size={12} color="#6366F1" />
              <Text style={[styles.badgeText, { color: '#4F46E5' }]}>
                {impact?.charAt(0).toUpperCase() + impact?.slice(1)} Impact
              </Text>
            </View>
            {confidence && (
              <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="analytics" size={12} color="#D97706" />
                <Text style={[styles.badgeText, { color: '#B45309' }]}>
                  {Math.round(typeof confidence === 'number' && confidence < 1 ? confidence * 100 : confidence)}%
                </Text>
              </View>
            )}
          </View>

          {/* CTA Button */}
          <LinearGradient
            colors={config.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaButton}
          >
            <Text style={styles.ctaText}>Take Action</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Pattern Card - Sleek minimal design
 */
export function PatternCard({ pattern, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isPositive = pattern.impactType === 'positive';
  const color = isPositive ? '#10B981' : '#F59E0B';

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.98, duration: 60, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
    ]).start();
    onPress?.(pattern);
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <View style={styles.patternCard}>
          <View style={[styles.patternIcon, { backgroundColor: `${color}15` }]}>
            <Ionicons
              name={isPositive ? 'checkmark-circle' : 'alert-circle'}
              size={20}
              color={color}
            />
          </View>
          <View style={styles.patternContent}>
            <Text style={styles.patternText}>{pattern.statement}</Text>
            <View style={styles.patternMeta}>
              <Text style={[styles.confidenceTag, { color }]}>
                {pattern.confidenceLabel || 'likely'}
              </Text>
              {pattern.occurrences > 1 && (
                <Text style={styles.occurrenceText}>
                  • Observed {pattern.occurrences}x
                </Text>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={TEXT.tertiary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Main Wellness Recommendations Section
 */
export default function WellnessRecommendationsSection({
  whatToChange,
  patterns = [],
  isLoading,
  onPatternPress,
}) {
  // Deduplicate patterns by statement
  const uniquePatterns = patterns.reduce((acc, pattern) => {
    const key = pattern.statement?.toLowerCase().trim();
    if (key && !acc.some(p => p.statement?.toLowerCase().trim() === key)) {
      acc.push(pattern);
    }
    return acc;
  }, []);

  if (isLoading && !whatToChange && patterns.length === 0) {
    return (
      <View style={styles.container}>
        <PrimaryRecommendationCard isLoading={true} />
      </View>
    );
  }

  const hasInsights = whatToChange || uniquePatterns.length > 0;

  if (!hasInsights) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyCard}>
          <LinearGradient
            colors={['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.05)']}
            style={styles.emptyGradient}
          >
            <View style={styles.emptyIconContainer}>
              <Ionicons name="sparkles" size={32} color="#6366F1" />
            </View>
            <Text style={styles.emptyTitle}>Keep Logging!</Text>
            <Text style={styles.emptyText}>
              Log meals, mood, and water to unlock personalized insights.
            </Text>
          </LinearGradient>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Primary recommendation */}
      {whatToChange && (
        <PrimaryRecommendationCard
          title={whatToChange.title}
          subtitle={whatToChange.subtitle}
          whyMatters={whatToChange.whyMatters}
          difficulty={whatToChange.difficulty}
          impact={whatToChange.impact}
          confidence={whatToChange.confidence}
          isLoading={isLoading}
        />
      )}

      {/* Patterns section */}
      {uniquePatterns.length > 0 && (
        <View style={styles.patternsSection}>
          <Text style={styles.sectionTitle}>INSIGHTS</Text>
          {uniquePatterns.slice(0, 3).map((pattern, index) => (
            <PatternCard
              key={pattern.id || `pattern-${index}`}
              pattern={pattern}
              onPress={onPatternPress}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING[4],
    marginBottom: SPACING[4],
  },

  // Loading & Empty States
  loadingCard: {
    borderRadius: RADIUS['2xl'],
    overflow: 'hidden',
  },
  loadingGradient: {
    padding: SPACING[6],
    alignItems: 'center',
    gap: SPACING[3],
  },
  loadingText: {
    fontSize: 14,
    color: TEXT.secondary,
    fontWeight: '500',
  },
  emptyCard: {
    borderRadius: RADIUS['2xl'],
    overflow: 'hidden',
  },
  emptyGradient: {
    padding: SPACING[6],
    alignItems: 'center',
    gap: SPACING[2],
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[2],
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT.primary,
  },
  emptyText: {
    fontSize: 14,
    color: TEXT.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Primary Card
  primaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS['2xl'],
    padding: SPACING[4],
    paddingTop: SPACING[5],
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  gradientAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  iconGradient: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: TEXT.tertiary,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT.primary,
    lineHeight: 26,
  },
  cardSubtitle: {
    fontSize: 15,
    color: TEXT.secondary,
    lineHeight: 22,
    marginBottom: SPACING[3],
  },

  // Why Box
  whyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: SPACING[3],
    borderRadius: RADIUS.lg,
    marginBottom: SPACING[3],
    gap: SPACING[2],
  },
  whyText: {
    flex: 1,
    fontSize: 13,
    color: TEXT.secondary,
    lineHeight: 19,
  },

  // Meta Badges
  metaBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
    marginBottom: SPACING[4],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[2],
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // CTA Button
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.xl,
    gap: SPACING[2],
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Patterns Section
  patternsSection: {
    marginTop: SPACING[5],
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT.tertiary,
    letterSpacing: 1,
    marginBottom: SPACING[3],
  },

  // Pattern Card
  patternCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: SPACING[3],
    borderRadius: RADIUS.xl,
    marginBottom: SPACING[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    gap: SPACING[3],
  },
  patternIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patternContent: {
    flex: 1,
  },
  patternText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
    lineHeight: 20,
    marginBottom: 4,
  },
  patternMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confidenceTag: {
    fontSize: 12,
    fontWeight: '600',
  },
  occurrenceText: {
    fontSize: 12,
    color: TEXT.tertiary,
  },
});
