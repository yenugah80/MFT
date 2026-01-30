/**
 * MyInsightsSection - Collapsible Analytics Section for Profile
 *
 * Features:
 * - Collapsible with smooth height animation
 * - Gradient header when expanded
 * - Chevron rotation animation (180°)
 * - Persist expanded state to AsyncStorage
 * - Contains analytics moved from Dashboard:
 *   - CuisinePreferencesSection
 *   - DietaryComplianceCard
 *   - CuisineDiversityCard
 *   - ComplianceHistoryChart
 *   - RecommendationStatsCard
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Analytics components (moved from Dashboard)
import CuisinePreferencesSection from './CuisinePreferencesSection';
import ComplianceHistoryChart from './ComplianceHistoryChart';
import RecommendationStatsCard from './RecommendationStatsCard';

// Dashboard components to import
import DietaryComplianceCard from '../dashboard/DietaryComplianceCard';
import CuisineDiversityCard from '../dashboard/CuisineDiversityCard';

import { BRAND, SURFACES, TEXT, TYPOGRAPHY, SPACING, RADIUS, SEMANTIC_ACTIONS } from '../../constants/premiumTheme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STORAGE_KEY = '@profile_insights_expanded';

// Premium shadow
const PREMIUM_SHADOW = {
  shadowColor: '#8B5CF6',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 12,
  elevation: 4,
};

export default function MyInsightsSection({
  cuisinePreferences = [],
  complianceScore = null,
  todaysMeals = [],
  cuisineDiversity = null,
  userPreferences = {},
}) {
  const [expanded, setExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // Load persisted state
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === 'true') {
        setExpanded(true);
        rotateAnim.setValue(1);
        contentOpacity.setValue(1);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle expanded state
  const toggleExpanded = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newExpanded = !expanded;
    setExpanded(newExpanded);
    AsyncStorage.setItem(STORAGE_KEY, String(newExpanded));

    // Configure layout animation
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        300,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );

    // Animate chevron rotation
    Animated.spring(rotateAnim, {
      toValue: newExpanded ? 1 : 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Animate content fade
    Animated.timing(contentOpacity, {
      toValue: newExpanded ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [expanded, rotateAnim, contentOpacity]);

  // Interpolate rotation
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Check if there's any data to show
  const hasData =
    cuisinePreferences.length > 0 ||
    complianceScore !== null ||
    cuisineDiversity !== null;

  return (
    <View style={styles.container}>
      {/* Collapsible Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="My Insights section"
        accessibilityHint={`${expanded ? 'Collapse' : 'Expand'} to ${expanded ? 'hide' : 'show'} analytics`}
        accessibilityState={{ expanded }}
      >
        <LinearGradient
          colors={expanded ? SURFACES.gradient.primary : ['#FFFFFF', '#FAFAFA']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={[
                styles.iconContainer,
                expanded && styles.iconContainerExpanded
              ]}>
                <Ionicons
                  name="analytics"
                  size={20}
                  color={expanded ? '#FFFFFF' : BRAND.primary}
                />
              </View>
              <View>
                <Text style={[
                  styles.headerTitle,
                  expanded && styles.headerTitleExpanded
                ]}>
                  My Insights
                </Text>
                <Text style={[
                  styles.headerSubtitle,
                  expanded && styles.headerSubtitleExpanded
                ]}>
                  {expanded ? 'Tap to collapse' : 'Analytics & Trends'}
                </Text>
              </View>
            </View>

            <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
              <Ionicons
                name="chevron-down"
                size={24}
                color={expanded ? '#FFFFFF' : TEXT.secondary}
              />
            </Animated.View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Collapsible Content */}
      {expanded && (
        <Animated.View
          style={[
            styles.content,
            { opacity: contentOpacity },
          ]}
        >
          {/* Cuisine Preferences */}
          {cuisinePreferences && cuisinePreferences.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="restaurant" size={18} color="#8B5CF6" />
                <Text style={styles.sectionTitle}>Cuisine Preferences</Text>
              </View>
              <CuisinePreferencesSection
                preferences={cuisinePreferences}
                isEditing={false}
              />
            </View>
          )}

          {/* Dietary Compliance */}
          {complianceScore !== null && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.sectionTitle}>Today&apos;s Compliance</Text>
              </View>
              <DietaryComplianceCard
                score={complianceScore}
                todaysMeals={todaysMeals}
              />
            </View>
          )}

          {/* Cuisine Diversity */}
          {cuisineDiversity && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="globe" size={18} color="#F59E0B" />
                <Text style={styles.sectionTitle}>Cuisine Diversity</Text>
              </View>
              <CuisineDiversityCard
                diversity={cuisineDiversity}
                userPreferences={userPreferences}
              />
            </View>
          )}

          {/* Compliance History Chart */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trending-up" size={18} color="#3B82F6" />
              <Text style={styles.sectionTitle}>30-Day Compliance</Text>
            </View>
            <ComplianceHistoryChart />
          </View>

          {/* Recommendation Stats */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb" size={18} color="#EC4899" />
              <Text style={styles.sectionTitle}>Recommendation Stats</Text>
            </View>
            <RecommendationStatsCard />
          </View>

          {/* Empty State */}
          {!hasData && (
            <View style={styles.emptyState}>
              <Ionicons name="bar-chart-outline" size={48} color={TEXT.muted} />
              <Text style={styles.emptyTitle}>No Insights Yet</Text>
              <Text style={styles.emptyText}>
                Start logging meals to see your dietary insights and trends here.
              </Text>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING[5],
  },
  header: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...PREMIUM_SHADOW,
  },
  headerGradient: {
    borderRadius: RADIUS.xl,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: `${SEMANTIC_ACTIONS.success}1A`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerExpanded: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  headerTitleExpanded: {
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  headerSubtitleExpanded: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    marginTop: SPACING[3],
    gap: SPACING[4],
  },
  section: {
    gap: SPACING[2],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingHorizontal: SPACING[1],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[8],
    paddingHorizontal: SPACING[4],
    backgroundColor: `${SEMANTIC_ACTIONS.success}08`,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: `${SEMANTIC_ACTIONS.success}1A`,
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    marginTop: SPACING[3],
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    textAlign: 'center',
    marginTop: SPACING[2],
    maxWidth: 280,
  },
});
