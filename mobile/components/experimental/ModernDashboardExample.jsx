/**
 * ModernDashboardExample - Example implementation
 * Shows how to use the new glassmorphic components with modern color palette
 * Replace sections in your DashboardContent.jsx with these patterns
 */

import React from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ModernWellnessCard from './ModernWellnessCard';
import ModernStatCard from './ModernStatCard';
import GlassCard from '../GlassCard';
import GlowingButton from '../GlowingButton';
import AnimatedProgressRing from '../AnimatedProgressRing';
import FadeInView from '../FadeInView';
import {
  MODERN_TEXT,
  MODERN_GRADIENTS,
  MODERN_SURFACES,
  WELLNESS_COLORS,
  MODERN_MACROS,
} from '../../constants/modernColorPalette';
import { SPACING, TYPOGRAPHY, RADIUS } from '../../constants/premiumTheme';

/**
 * Example Dashboard Section
 * Copy these patterns into your DashboardContent.jsx
 */
export default function ModernDashboardExample() {
  // Example data
  const dashboardData = {
    calories: { current: 1450, goal: 2000 },
    protein: { current: 68, goal: 120 },
    water: { current: 6, goal: 8 },
    steps: { current: 7542, goal: 10000 },
    mood: { average: 7.5 },
    streak: { current: 12 },
  };

  return (
    <LinearGradient
      colors={MODERN_GRADIENTS.wellness.colors}
      start={MODERN_GRADIENTS.wellness.start}
      end={MODERN_GRADIENTS.wellness.end}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with greeting */}
        <FadeInView animation="fadeIn">
          <View style={styles.header}>
            <Text style={styles.greeting}>Good morning! ☀️</Text>
            <Text style={styles.subtitle}>Here's your wellness overview</Text>
          </View>
        </FadeInView>

        {/* Main wellness cards */}
        <View style={styles.section}>
          <ModernWellnessCard
            title="Calories"
            value={dashboardData.calories.current}
            goal={dashboardData.calories.goal}
            unit="kcal"
            icon="flame"
            status="success"
            subtitle="Daily nutrition"
            showProgress
            onPress={() => console.log('Navigate to nutrition details')}
            delay={100}
          />

          <ModernWellnessCard
            title="Hydration"
            value={dashboardData.water.current}
            goal={dashboardData.water.goal}
            unit="cups"
            icon="water"
            status="warning"
            subtitle="Stay hydrated"
            showProgress
            onPress={() => console.log('Navigate to hydration')}
            delay={200}
          />

          <ModernWellnessCard
            title="Protein"
            value={dashboardData.protein.current}
            goal={dashboardData.protein.goal}
            unit="g"
            icon="barbell"
            status="info"
            subtitle="Muscle building"
            showProgress
            delay={300}
          />
        </View>

        {/* Quick stats grid */}
        <FadeInView animation="slideUp" delay={400}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Stats</Text>
          </View>

          <View style={styles.statsGrid}>
            <ModernStatCard
              icon="walk"
              label="Steps"
              value={dashboardData.steps.current.toLocaleString()}
              trend="up"
              trendValue="+245"
              color={WELLNESS_COLORS.fitness.base}
              delay={450}
            />

            <ModernStatCard
              icon="happy"
              label="Mood"
              value={dashboardData.mood.average}
              unit="/10"
              color={WELLNESS_COLORS.mood.base}
              delay={500}
            />

            <ModernStatCard
              icon="flame"
              label="Streak"
              value={dashboardData.streak.current}
              unit="days"
              trend="up"
              color="#F59E0B"
              delay={550}
            />
          </View>
        </FadeInView>

        {/* Macro breakdown card */}
        <FadeInView animation="slideUp" delay={600}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Macros Breakdown</Text>
          </View>

          <GlassCard
            variant="glassLit"
            withLightRay
            glowType="subtle"
          >
            <View style={styles.macrosContainer}>
              <View style={styles.macroItem}>
                <LinearGradient
                  colors={MODERN_MACROS.protein.gradient}
                  style={styles.macroIndicator}
                />
                <View style={styles.macroInfo}>
                  <Text style={styles.macroLabel}>Protein</Text>
                  <Text style={styles.macroValue}>68g / 120g</Text>
                </View>
              </View>

              <View style={styles.macroItem}>
                <LinearGradient
                  colors={MODERN_MACROS.carbs.gradient}
                  style={styles.macroIndicator}
                />
                <View style={styles.macroInfo}>
                  <Text style={styles.macroLabel}>Carbs</Text>
                  <Text style={styles.macroValue}>175g / 250g</Text>
                </View>
              </View>

              <View style={styles.macroItem}>
                <LinearGradient
                  colors={MODERN_MACROS.fat.gradient}
                  style={styles.macroIndicator}
                />
                <View style={styles.macroInfo}>
                  <Text style={styles.macroLabel}>Fat</Text>
                  <Text style={styles.macroValue}>45g / 67g</Text>
                </View>
              </View>
            </View>
          </GlassCard>
        </FadeInView>

        {/* CTA Button */}
        <FadeInView animation="scaleIn" delay={700}>
          <View style={styles.ctaContainer}>
            <GlowingButton
              title="Log Your Meal"
              icon="restaurant"
              variant="primary"
              size="large"
              withGlow
              onPress={() => console.log('Navigate to food log')}
            />
          </View>
        </FadeInView>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  contentContainer: {
    padding: SPACING[4],
  },

  header: {
    marginBottom: SPACING[6],
  },

  greeting: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontWeight: TYPOGRAPHY.weight.black,
    color: MODERN_TEXT.primary,
    marginBottom: SPACING[2],
  },

  subtitle: {
    fontSize: TYPOGRAPHY.size.base,
    color: MODERN_TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  section: {
    marginBottom: SPACING[4],
  },

  sectionHeader: {
    marginBottom: SPACING[3],
  },

  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: MODERN_TEXT.primary,
  },

  statsGrid: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },

  macrosContainer: {
    gap: SPACING[3],
  },

  macroItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  macroIndicator: {
    width: 8,
    height: 40,
    borderRadius: RADIUS.sm,
    marginRight: SPACING[3],
  },

  macroInfo: {
    flex: 1,
  },

  macroLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: MODERN_TEXT.tertiary,
    marginBottom: SPACING[1],
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  macroValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: MODERN_TEXT.primary,
  },

  ctaContainer: {
    marginTop: SPACING[6],
  },

  bottomSpacing: {
    height: SPACING[8],
  },
});
