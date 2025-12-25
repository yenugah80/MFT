import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import {
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SURFACES,
  BRAND,
  SEMANTIC
} from '../../constants/premiumTheme';

const TrendBar = ({ label, value, goal, unit, color, icon }) => {
  const percentage = Math.min((value / goal) * 100, 100);
  
  return (
    <View style={styles.trendRow}>
      <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      
      <View style={styles.trendContent}>
        <View style={styles.trendHeader}>
          <Text style={styles.trendLabel}>{label}</Text>
          <Text style={styles.trendValue}>
            {Math.round(value)}
            <Text style={styles.trendUnit}>{unit}</Text>
            <Text style={styles.trendGoal}> / {goal}</Text>
          </Text>
        </View>
        
        <View style={styles.progressBarBg}>
          <LinearGradient
            colors={[color, color]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: color }]}
          />
        </View>
      </View>
    </View>
  );
};

export default function PremiumWeeklyTrends({ trends, goals }) {
  const avgCalories = trends?.weeklyAverages?.avgCalories || 0;
  const avgProtein = trends?.weeklyAverages?.avgProtein || 0;
  
  // Fallback goals if not provided
  const calorieGoal = goals?.dailyCalories || 2000;
  const proteinGoal = goals?.proteinG || 150;

  return (
    <GlassCard padding="lg">
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Weekly Insights</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Last 7 Days</Text>
        </View>
      </View>

      <View style={styles.content}>
        <TrendBar 
          label="Avg Calories" 
          value={avgCalories} 
          goal={calorieGoal} 
          unit=" kcal" 
          color={BRAND.primary}
          icon="flame"
        />
        
        <View style={styles.divider} />
        
        <TrendBar 
          label="Avg Protein" 
          value={avgProtein} 
          goal={proteinGoal} 
          unit="g" 
          color={SEMANTIC.info.base}
          icon="barbell"
        />
      </View>
      
      <View style={styles.footer}>
        <Ionicons name="trending-up" size={14} color={SEMANTIC.success.base} />
        <Text style={styles.footerText}>
          Consistency is key to long-term results.
        </Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  badge: {
    backgroundColor: SURFACES.background.tertiary,
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: TEXT.secondary,
  },
  content: {
    gap: SPACING[3],
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendContent: {
    flex: 1,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  trendLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
  },
  trendValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  trendUnit: {
    fontSize: 10,
    color: TEXT.tertiary,
    fontWeight: 'normal',
  },
  trendGoal: {
    fontSize: 10,
    color: TEXT.muted,
    fontWeight: 'normal',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginTop: SPACING[4],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  footerText: {
    fontSize: 11,
    color: TEXT.tertiary,
    fontStyle: 'italic',
  },
});