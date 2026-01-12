/**
 * ModernWellnessCard - Glassmorphic wellness metric card
 * For the dashboard redesign with modern color palette
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import GlassCard from '../GlassCard';
import AnimatedProgressRing from '../AnimatedProgressRing';
import FadeInView from '../FadeInView';
import {
  MODERN_TEXT,
  MODERN_SURFACES,
  MODERN_SHADOWS,
  getSemanticGradient,
} from '../../constants/modernColorPalette';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants/premiumTheme';
import { LIGHT_BORDER, getRandomMicrocopy } from '../../constants/modernEffects';

/**
 * ModernWellnessCard Component
 *
 * @param {Object} props
 * @param {string} props.title - Card title
 * @param {number} props.value - Current value
 * @param {number} props.goal - Goal/target value
 * @param {string} props.unit - Unit of measurement
 * @param {string} props.icon - Ionicons icon name
 * @param {'success'|'warning'|'error'|'info'|'neutral'} props.status - Status state
 * @param {string} props.subtitle - Optional subtitle text
 * @param {boolean} props.showProgress - Whether to show progress ring
 * @param {Function} props.onPress - Optional press handler
 * @param {number} props.delay - Animation delay
 */
export default function ModernWellnessCard({
  title,
  value,
  goal,
  unit,
  icon,
  status = 'neutral',
  subtitle,
  showProgress = true,
  onPress,
  delay = 0,
}) {
  // Calculate progress percentage
  const progress = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;

  // Get gradient colors based on status
  const gradientColors = getSemanticGradient(status);

  // Get motivational microcopy based on progress
  const getMicrocopy = () => {
    if (progress >= 100) return getRandomMicrocopy('celebration');
    if (progress >= 80) return getRandomMicrocopy('motivation');
    if (progress >= 50) return getRandomMicrocopy('encouragement');
    return getRandomMicrocopy('gentle');
  };

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <FadeInView animation="slideUp" delay={delay}>
      <GlassCard
        variant="glassLit"
        onPress={onPress ? handlePress : undefined}
        withLightRay
        glowType={progress >= 80 ? 'medium' : 'subtle'}
        containerStyle={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            {icon && (
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconContainer}
              >
                <Ionicons name={icon} size={20} color={MODERN_TEXT.white} />
              </LinearGradient>
            )}

            <View style={styles.titleTextContainer}>
              <Text style={styles.title}>{title}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          </View>

          {onPress && (
            <Ionicons
              name="chevron-forward"
              size={20}
              color={MODERN_TEXT.tertiary}
            />
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {showProgress ? (
            <View style={styles.progressContainer}>
              <AnimatedProgressRing
                progress={progress}
                size="medium"
                gradientColors={gradientColors}
                value={Math.round(value)}
                unit={unit}
                withGlow
              />

              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Current</Text>
                  <Text style={styles.statValue}>
                    {Math.round(value)}
                    <Text style={styles.statUnit}> {unit}</Text>
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Goal</Text>
                  <Text style={styles.statValue}>
                    {Math.round(goal)}
                    <Text style={styles.statUnit}> {unit}</Text>
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.simpleContent}>
              <Text style={styles.largeValue}>
                {Math.round(value)}
                <Text style={styles.largeUnit}> {unit}</Text>
              </Text>
              {goal > 0 && (
                <Text style={styles.goalText}>
                  of {Math.round(goal)} {unit}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Motivational footer */}
        {progress > 0 && progress < 100 && (
          <View style={styles.footer}>
            <LinearGradient
              colors={[...gradientColors].reverse()}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.motivationBar}
            >
              <Text style={styles.motivationText}>{getMicrocopy()}</Text>
            </LinearGradient>
          </View>
        )}

        {/* Celebration banner for completed goals */}
        {progress >= 100 && (
          <View style={styles.celebrationBanner}>
            <LinearGradient
              colors={['#6B4EFF', '#FF6B9D', '#00D9FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.celebrationGradient}
            >
              <Ionicons name="trophy" size={16} color={MODERN_TEXT.white} />
              <Text style={styles.celebrationText}>Goal achieved!</Text>
            </LinearGradient>
          </View>
        )}
      </GlassCard>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING[4],
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[4],
  },

  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
    ...MODERN_SHADOWS.sm,
  },

  titleTextContainer: {
    flex: 1,
  },

  title: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: MODERN_TEXT.primary,
  },

  subtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: MODERN_TEXT.tertiary,
    marginTop: SPACING[1],
  },

  content: {
    marginBottom: SPACING[3],
  },

  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  statsContainer: {
    flex: 1,
    marginLeft: SPACING[4],
  },

  statItem: {
    marginBottom: SPACING[2],
  },

  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: MODERN_TEXT.tertiary,
    marginBottom: SPACING[1],
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  statValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: MODERN_TEXT.primary,
  },

  statUnit: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.regular,
    color: MODERN_TEXT.secondary,
  },

  divider: {
    height: 1,
    backgroundColor: MODERN_SURFACES.card.border,
    marginVertical: SPACING[2],
  },

  simpleContent: {
    alignItems: 'center',
    paddingVertical: SPACING[3],
  },

  largeValue: {
    fontSize: TYPOGRAPHY.size['4xl'],
    fontWeight: TYPOGRAPHY.weight.black,
    color: MODERN_TEXT.primary,
  },

  largeUnit: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.regular,
    color: MODERN_TEXT.secondary,
  },

  goalText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: MODERN_TEXT.tertiary,
    marginTop: SPACING[2],
  },

  footer: {
    marginTop: SPACING[2],
    borderTopWidth: 1,
    borderTopColor: MODERN_SURFACES.card.border,
    paddingTop: SPACING[3],
  },

  motivationBar: {
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },

  motivationText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: MODERN_TEXT.white,
  },

  celebrationBanner: {
    marginTop: SPACING[3],
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...MODERN_SHADOWS.glow.primary,
  },

  celebrationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
  },

  celebrationText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: MODERN_TEXT.white,
    marginLeft: SPACING[2],
  },
});
