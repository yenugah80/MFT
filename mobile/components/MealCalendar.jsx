import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from './dashboard/GlassCard';
import {
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SURFACES,
  BRAND,
  SEMANTIC
} from '../constants/premiumTheme';
import { formatDateLocal } from '../utils/dateHelpers';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function MealCalendar({ data = {}, calorieGoal = 2000, onDayPress }) {
  // Generate last 14 days for the heatmap
  const generateDays = () => {
    const days = [];
    const today = new Date();

    // Go back 13 days + today = 14 days (2 weeks)
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);

      // Use local timezone format to avoid off-by-one errors
      const key = formatDateLocal(d);
      const dayData = data[key] || { calories: 0, meals: 0, goalReached: false };

      days.push({
        date: d,
        key,
        dayName: DAYS[d.getDay()],
        dayNumber: d.getDate(),
        ...dayData
      });
    }
    return days;
  };

  const days = generateDays();

  const getStatusInfo = (day) => {
    if (day.meals === 0) {
      return { color: SURFACES.background.tertiary, icon: null, label: 'Empty' };
    }
    
    const percentage = day.calories / calorieGoal;
    
    if (percentage >= 0.9 && percentage <= 1.1) {
      return { color: SEMANTIC.success.base, icon: 'checkmark-circle', label: 'On Target' };
    }
    if (percentage > 1.1) return { color: SEMANTIC.warning.base, icon: 'arrow-up-circle', label: 'Over' };
    if (percentage > 0.5) return { color: SEMANTIC.info.light, icon: 'arrow-down-circle', label: 'Under' };
    return { color: SURFACES.background.tertiary, icon: 'remove-circle', label: 'Low' };
  };

  return (
    <GlassCard padding="lg">
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="calendar" size={20} color={BRAND.primary} />
          <Text style={styles.title}>Consistency Map</Text>
        </View>
        <Text style={styles.subtitle}>Last 14 Days</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.grid}>
          {days.map((day, index) => {
            const isToday = index === days.length - 1;            
            const { color, icon } = getStatusInfo(day);

            return (
              <TouchableOpacity
                key={day.key}
                style={styles.dayColumn}
                onPress={() => onDayPress && onDayPress(day.key, day)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayName, isToday && styles.todayText]}>
                  {day.dayName}
                </Text>
                
                <View style={[
                  styles.heatBox, 
                  { backgroundColor: color },
                  isToday && styles.todayBox
                ]}>
                  {icon && (
                    <Ionicons 
                      name={icon}
                      size={14} 
                      color="#FFF" 
                    />
                  )}
                </View>
                
                <Text style={styles.dayNumber}>{day.dayNumber}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: SEMANTIC.success.base }]} />
          <Text style={styles.legendText}>On Target</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: SEMANTIC.warning.base }]} />
          <Text style={styles.legendText}>Over</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: SEMANTIC.info.light }]} />
          <Text style={styles.legendText}>Under</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: SURFACES.background.tertiary }]} />
          <Text style={styles.legendText}>Low/Empty</Text>
        </View>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  title: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  scrollContent: {
    paddingBottom: SPACING[2],
  },
  grid: {
    flexDirection: 'row',
    gap: SPACING[2],
  },
  dayColumn: {
    alignItems: 'center',
    gap: SPACING[1],
  },
  dayName: {
    fontSize: 10,
    color: TEXT.tertiary,
    fontWeight: '600',
  },
  todayText: {
    color: BRAND.primary,
    fontWeight: 'bold',
  },
  heatBox: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayBox: {
    borderWidth: 2,
    borderColor: BRAND.primary,
  },
  dayNumber: {
    fontSize: 10,
    color: TEXT.secondary,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING[4],
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
    color: TEXT.secondary,
  },
});