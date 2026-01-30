/**
 * WellnessScoreCard Component
 *
 * Displays overall wellness score with graceful degradation
 * when data is incomplete. Shows component breakdown and trends.
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, SURFACES, BRAND, TYPOGRAPHY } from '../../constants/premiumTheme';

const WellnessScoreCard = ({
  wellness,
  dataQuality,
  trends,
  onPress,
}) => {
  if (!wellness) {
    return (
      <View style={styles.container}>
        <InsufficientDataView message="Log more data to see your wellness score" />
      </View>
    );
  }

  const { overall, components, interpretation, hasEnoughData } = wellness;

  // Get trend direction icon
  const getTrendIcon = (direction) => {
    switch (direction) {
      case 'up': return { name: 'trending-up', color: '#10B981' };
      case 'down': return { name: 'trending-down', color: '#EF4444' };
      default: return { name: 'remove', color: '#6B7280' };
    }
  };

  // Get score color based on value
  const getScoreColor = (score) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#3B82F6';
    if (score >= 40) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[SURFACES.card.primary, SURFACES.card.secondary]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Wellness Score</Text>
          {dataQuality && (
            <View style={styles.qualityBadge}>
              <Ionicons name="analytics" size={12} color={TEXT.secondary} />
              <Text style={styles.qualityText}>
                {dataQuality.score}% data quality
              </Text>
            </View>
          )}
        </View>

        {/* Main Score */}
        {hasEnoughData && overall !== null ? (
          <View style={styles.scoreSection}>
            <View style={styles.scoreCircle}>
              <Text style={[styles.scoreValue, { color: getScoreColor(overall) }]}>
                {overall}
              </Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
            <View style={styles.interpretation}>
              <Text style={styles.interpretationEmoji}>
                {interpretation?.emoji || ''}
              </Text>
              <Text style={[styles.interpretationLabel, { color: getScoreColor(overall) }]}>
                {interpretation?.label || 'Calculating...'}
              </Text>
            </View>

            {/* Trend indicator */}
            {trends?.wellness && (
              <View style={styles.trendContainer}>
                <Ionicons
                  name={getTrendIcon(trends.wellness.direction).name}
                  size={16}
                  color={getTrendIcon(trends.wellness.direction).color}
                />
                <Text style={[
                  styles.trendText,
                  { color: getTrendIcon(trends.wellness.direction).color }
                ]}>
                  {trends.wellness.change > 0 ? '+' : ''}{trends.wellness.change} from last period
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.buildingSection}>
            <Ionicons name="bar-chart-outline" size={48} color={TEXT.tertiary} />
            <Text style={styles.buildingText}>Building your wellness profile</Text>
            <Text style={styles.buildingSubtext}>
              Keep logging to unlock your personalized score
            </Text>
          </View>
        )}

        {/* Component Breakdown */}
        {components && Object.keys(components).length > 0 && (
          <View style={styles.componentsSection}>
            <Text style={styles.componentsTitle}>Breakdown</Text>
            <View style={styles.componentsList}>
              {Object.entries(components).map(([key, comp]) => (
                <ComponentItem key={key} name={key} data={comp} />
              ))}
            </View>
          </View>
        )}

        {/* Data gaps warning */}
        {dataQuality?.gaps?.length > 0 && (
          <View style={styles.gapsWarning}>
            <Ionicons name="information-circle" size={16} color={TEXT.secondary} />
            <Text style={styles.gapsText}>
              {dataQuality.gaps[0].message}
            </Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

/**
 * Individual component item in breakdown
 */
const ComponentItem = ({ name, data }) => {
  const icons = {
    nutrition: 'nutrition',
    hydration: 'water',
    mood: 'happy',
    activity: 'fitness',
  };

  const getBarColor = (score) => {
    if (score >= 70) return '#10B981';
    if (score >= 40) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <View style={styles.componentItem}>
      <View style={styles.componentHeader}>
        <Ionicons
          name={icons[name] || 'ellipse'}
          size={16}
          color={TEXT.secondary}
        />
        <Text style={styles.componentName}>
          {name.charAt(0).toUpperCase() + name.slice(1)}
        </Text>
        <Text style={[styles.componentScore, { color: getBarColor(data.score) }]}>
          {data.score}%
        </Text>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${data.score}%`, backgroundColor: getBarColor(data.score) }
          ]}
        />
      </View>
      <Text style={styles.componentLabel}>{data.label}</Text>
    </View>
  );
};

/**
 * View shown when insufficient data
 */
const InsufficientDataView = ({ message }) => (
  <View style={styles.insufficientContainer}>
    <Ionicons name="analytics-outline" size={48} color={TEXT.tertiary} />
    <Text style={styles.insufficientTitle}>Wellness Score</Text>
    <Text style={styles.insufficientMessage}>{message}</Text>
    <View style={styles.actionHint}>
      <Ionicons name="add-circle-outline" size={20} color={BRAND.primary} />
      <Text style={styles.actionText}>Start logging to see your score</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  gradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SURFACES.background.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  qualityText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  scoreSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: 64,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  scoreMax: {
    fontSize: 24,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginLeft: 4,
  },
  interpretation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  interpretationEmoji: {
    fontSize: 24,
    fontFamily: TYPOGRAPHY.family.regular,
  },
  interpretationLabel: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: SURFACES.background.secondary,
    borderRadius: 16,
  },
  trendText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  buildingSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  buildingText: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    marginTop: 12,
  },
  buildingSubtext: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: 4,
  },
  componentsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  componentsTitle: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    marginBottom: 12,
  },
  componentsList: {
    gap: 12,
  },
  componentItem: {
    gap: 4,
  },
  componentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  componentName: {
    flex: 1,
    fontSize: 14,
    color: TEXT.primary,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  componentScore: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  progressBar: {
    height: 6,
    backgroundColor: SURFACES.background.secondary,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  componentLabel: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  gapsWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  gapsText: {
    flex: 1,
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  insufficientContainer: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: SURFACES.card.primary,
  },
  insufficientTitle: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginTop: 16,
  },
  insufficientMessage: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    textAlign: 'center',
    marginTop: 8,
  },
  actionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  actionText: {
    fontSize: 14,
    color: BRAND.primary,
    fontFamily: TYPOGRAPHY.family.medium,
  },
});

export default WellnessScoreCard;
