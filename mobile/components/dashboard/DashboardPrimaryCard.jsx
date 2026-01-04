import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import GlassCard from './GlassCard';
import PremiumRing from './PremiumRing';
import NutriScoreDial from './NutriScoreDial';
import { TEXT, SURFACES } from '../../constants/premiumTheme';
import { parseCalories, parseGoal } from '../../utils/safeNumbers';

export default function DashboardPrimaryCard({
  styles,
  today,
  goals,
  trends,
  data,
  onLogMeal,
}) {
  return (
    <LinearGradient
      colors={[SURFACES.gradient.accent[0], SURFACES.gradient.accent[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 16, marginBottom: 12 }}
    >
      <GlassCard style={[styles.primaryCard, { margin: 2, marginVertical: 2 }]} padding="lg">
      {today.foodLogs && today.foodLogs.length > 0 ? (
        <View style={styles.primaryContent}>
          <NutriScoreDial data={data} size={180} />
          <Text style={styles.primaryHint}>
            Based on calories, protein, hydration, and consistency
          </Text>
        </View>
      ) : (
        <View style={styles.primaryContent}>
          <PremiumRing
            value={parseCalories(today.nutrition.totalCalories)}
            goal={parseGoal(goals?.dailyCalories, 2000, 800, 10000)}
            label="Calories"
            unit="kcal"
            size={180}
            strokeWidth={16}
          />
          {trends.weeklyAverages ? (
            <Text style={styles.primaryHint}>
              {`Weekly avg: ${Math.round(parseCalories(trends.weeklyAverages.avgCalories))} kcal/day`}
            </Text>
          ) : (
            <TouchableOpacity
              style={styles.primaryHintCta}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onLogMeal();
              }}
              accessibilityLabel="Log your first meal"
              accessibilityRole="button"
            >
              <Ionicons name="add-circle-outline" size={14} color={TEXT.secondary} />
              <Text style={styles.primaryHintCtaText}>Log your first meal to unlock your score</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      </GlassCard>
    </LinearGradient>
  );
}
