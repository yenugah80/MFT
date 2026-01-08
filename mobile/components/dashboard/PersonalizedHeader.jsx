import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, TYPOGRAPHY, SPACING, RADIUS, SURFACES } from '../../constants/premiumTheme';

// Insight generation engine
const generateFoodMoodInsight = (data) => {
  const { nutrition, mood, hydration } = data;

  // Calculate scores
  const nutritionScore = (nutrition.calories / nutrition.calorieGoal) * 100;
  const hydrationScore = (hydration.current / hydration.goal) * 100;
  const moodScore = mood?.score || 0; // Assume 0-100 scale

  // Time-based insights
  const hour = new Date().getHours();
  const isMorning = hour >= 5 && hour < 12;
  const isAfternoon = hour >= 12 && hour < 17;
  const isEvening = hour >= 17 && hour < 22;
  const isNight = hour >= 22 || hour < 5;

  // Insight generation logic

  // 1. HIGH MOOD + GOOD NUTRITION
  if (moodScore >= 70 && nutritionScore >= 60 && nutritionScore <= 110) {
    return {
      headline: "Your food is lifting your mood ✨",
      subtext: "Balanced meals, stable energy",
      emoji: "🌟",
      gradient: SURFACES.gradient.primary,
    };
  }

  // 2. HIGH HYDRATION + GOOD MOOD
  if (hydrationScore >= 75 && moodScore >= 65) {
    return {
      headline: "Hydration powering your clarity 💧",
      subtext: "Well-hydrated, focused mind",
      emoji: "🧠",
      gradient: ['#3B82F6', '#2563EB'],
    };
  }

  // 3. LOW MOOD + LOW NUTRITION (Morning)
  if (moodScore < 50 && nutritionScore < 30 && isMorning) {
    return {
      headline: "Fuel your morning, lift your mood",
      subtext: "Breakfast can turn this around",
      emoji: "☀️",
      gradient: ['#F59E0B', '#D97706'],
    };
  }

  // 4. EVENING + BALANCED NUTRITION
  if (isEvening && nutritionScore >= 70 && nutritionScore <= 105) {
    return {
      headline: "Balanced day, calm evening 🌙",
      subtext: "Your food choices paid off",
      emoji: "😌",
      gradient: ['#8B5CF6', '#7C3AED'],
    };
  }

  // 5. HIGH CALORIES + LOWER MOOD
  if (nutritionScore > 120 && moodScore < 60) {
    return {
      headline: "Energy spike, mood dip",
      subtext: "Try smaller, frequent meals",
      emoji: "🎯",
      gradient: ['#EC4899', '#DB2777'],
    };
  }

  // 6. STREAK CELEBRATION
  if (data.streak >= 3) {
    return {
      headline: `${data.streak}-day streak! Consistency = clarity`,
      subtext: "Your habits are building momentum",
      emoji: "🔥",
      gradient: ['#10B981', '#059669'],
    };
  }

  // 7. LATE DINNER
  if (isNight && nutrition.lastMealTime && nutrition.lastMealTime > 21) {
    return {
      headline: "Late dinner may affect tomorrow's calm",
      subtext: "Earlier meals = better mood patterns",
      emoji: "🌙",
      gradient: ['#6366F1', '#4F46E5'],
    };
  }

  // 8. LOW HYDRATION
  if (hydrationScore < 40) {
    return {
      headline: "Dehydration impacts your mood",
      subtext: "Water = mental clarity",
      emoji: "💧",
      gradient: ['#06B6D4', '#0891B2'],
    };
  }

  // 9. FIRST LOG OF DAY
  if (nutrition.logCount === 1 && isMorning) {
    return {
      headline: "Great start! Your food shapes your day",
      subtext: "First meal sets the mood tone",
      emoji: "🌅",
      gradient: SURFACES.gradient.primary,
    };
  }

  // 10. DEFAULT - PERSONALIZED GREETING
  const greetings = [
    { time: isMorning, text: "Morning! Feed your body, fuel your mood" },
    { time: isAfternoon, text: "Afternoon! Balanced meals = balanced mind" },
    { time: isEvening, text: "Evening! Reflect on your Food × Mood day" },
    { time: isNight, text: "Winding down? Tomorrow's mood starts now" },
  ];

  const activeGreeting = greetings.find(g => g.time)?.text || "Your food × mood journey";

  return {
    headline: activeGreeting,
    subtext: "Every meal is a mood opportunity",
    emoji: "💫",
    gradient: SURFACES.gradient.primary,
  };
};

export default function PersonalizedHeader({ data, streak }) {
  const insight = useMemo(() => {
    if (!data) return null;

    return generateFoodMoodInsight({
      nutrition: {
        calories: data.today?.nutrition?.totalCalories || 0,
        calorieGoal: data.goals?.dailyCalories || 2000,
        logCount: data.today?.foodLogs?.length || 0,
        lastMealTime: data.today?.foodLogs?.[data.today.foodLogs.length - 1]?.timestamp
          ? new Date(data.today.foodLogs[data.today.foodLogs.length - 1].timestamp).getHours()
          : null,
      },
      mood: {
        score: data.today?.moodLogs?.[0]?.score || 0,
      },
      hydration: {
        current: data.today?.waterIntakeLiters || 0,
        goal: data.goals?.waterLiters || 2.0,
      },
      streak: streak || 0,
      timeOfDay: new Date().getHours(),
    });
  }, [data, streak]);

  if (!insight) return null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={insight.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Glow effect */}
        <View style={styles.glowOverlay} />

        {/* Content */}
        <View style={styles.content}>
          {/* Emoji indicator */}
          <View style={styles.emojiContainer}>
            <Text style={styles.emoji}>{insight.emoji}</Text>
          </View>

          {/* Text content */}
          <View style={styles.textContent}>
            <Text style={styles.headline}>{insight.headline}</Text>
            <Text style={styles.subtext}>{insight.subtext}</Text>
          </View>

          {/* Food × Mood badge */}
          <View style={styles.badge}>
            <Ionicons name="pulse" size={12} color="#FFF" />
            <Text style={styles.badgeText}>Food × Mood</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Today's date - subtle, not primary */}
      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING[4],
  },
  gradient: {
    borderRadius: RADIUS.xl,
    padding: SPACING[5],
    position: 'relative',
    overflow: 'hidden',
    minHeight: 120,
  },
  glowOverlay: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  content: {
    zIndex: 1,
  },
  emojiContainer: {
    marginBottom: SPACING[2],
  },
  emoji: {
    fontSize: 32,
  },
  textContent: {
    marginBottom: SPACING[3],
  },
  headline: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
    marginBottom: SPACING[1],
    letterSpacing: -0.5,
  },
  subtext: {
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  dateContainer: {
    marginTop: SPACING[2],
    paddingHorizontal: SPACING[1],
  },
  dateText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
});
