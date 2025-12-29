import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CollapsibleSection from './CollapsibleSection';
import GlassCard from './GlassCard';
import PremiumWeeklyTrends from './PremiumWeeklyTrends';
import PremiumAchievementsCard from './PremiumAchievementsCard';
import MealMoodCalendar from '../MealMoodCalendar';
import { BRAND, ICONS, ICON_SIZES } from '../../constants/premiumTheme';

export default function DashboardProgressSection({
  styles,
  expanded,
  onToggle,
  trends,
  goals,
  gamification,
  calendarData,
  recentWeight,
}) {
  return (
    <CollapsibleSection
      styles={styles}
      title="Progress & Tracking"
      icon="analytics"
      expanded={expanded}
      onToggle={onToggle}
    >
      {trends.weeklyAverages && (
        <View style={styles.sectionCard}>
          <PremiumWeeklyTrends trends={trends} goals={goals} />
        </View>
      )}

      <PremiumAchievementsCard
        level={gamification?.level || 1}
        xp={gamification?.xp || 0}
        nextLevelXp={gamification?.nextLevelXp}
        streak={gamification?.streak || 0}
        streakFreezes={gamification?.streakFreezes || 0}
      />

      <MealMoodCalendar
        data={calendarData}
        currentStreak={gamification?.streak || 0}
      />

      {recentWeight.length > 0 && (
        <GlassCard style={styles.sectionCard} padding="md">
          <Text style={styles.sectionTitle}>Weight Tracking</Text>
          <View style={styles.weightContainer}>
            <View style={styles.weightIconContainer}>
              <Ionicons name={ICONS.weight} size={ICON_SIZES['2xl']} color={BRAND.primary} />
            </View>
            <View style={styles.weightInfo}>
              <Text style={styles.weightValue}>{recentWeight[0].weightKg} kg</Text>
              <Text style={styles.weightDate}>
                {new Date(recentWeight[0].recordedDate).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </GlassCard>
      )}
    </CollapsibleSection>
  );
}
