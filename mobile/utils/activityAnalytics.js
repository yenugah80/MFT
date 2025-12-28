/**
 * Activity Analytics Utilities
 *
 * Calculates insights, trends, and recommendations for activity/workout data
 */

/**
 * Get activities from the current week (Monday - Sunday)
 */
export const getThisWeekActivities = (activities) => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Get to Monday

  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return activities.filter(activity => {
    const timestamp = new Date(activity.timestamp);
    return timestamp >= monday && timestamp <= sunday;
  });
};

/**
 * Calculate weekly goal progress
 */
export const calculateWeeklyGoalProgress = (activities, weeklyGoal = 1500) => {
  const thisWeek = getThisWeekActivities(activities);
  const totalCalories = thisWeek.reduce((sum, a) => sum + (a.calories || 0), 0);
  const workoutCount = thisWeek.length;

  return {
    calories: Math.round(totalCalories),
    goal: weeklyGoal,
    percentage: Math.round((totalCalories / weeklyGoal) * 100),
    remaining: Math.max(0, Math.round(weeklyGoal - totalCalories)),
    workoutCount,
    workoutGoal: 5, // Default: 5 workouts per week
  };
};

/**
 * Get activity breakdown by category
 */
export const getActivityBreakdown = (activities) => {
  const breakdown = {};
  let totalCalories = 0;

  activities.forEach(activity => {
    const category = activity.category || 'Other';
    if (!breakdown[category]) {
      breakdown[category] = {
        calories: 0,
        count: 0,
        duration: 0,
      };
    }
    breakdown[category].calories += activity.calories || 0;
    breakdown[category].count += 1;
    breakdown[category].duration += activity.duration || 0;
    totalCalories += activity.calories || 0;
  });

  // Calculate percentages
  Object.keys(breakdown).forEach(category => {
    breakdown[category].percentage = totalCalories > 0
      ? Math.round((breakdown[category].calories / totalCalories) * 100)
      : 0;
  });

  // Sort by calories (descending)
  return Object.entries(breakdown)
    .sort(([, a], [, b]) => b.calories - a.calories)
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
};

/**
 * Get 7-day activity trend
 */
export const getSevenDayTrend = (activities) => {
  const last7Days = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayStart = new Date(date.setHours(0, 0, 0, 0));
    const dayEnd = new Date(date.setHours(23, 59, 59, 999));

    const dayActivities = activities.filter(a => {
      const timestamp = new Date(a.timestamp);
      return timestamp >= dayStart && timestamp <= dayEnd;
    });

    const totalCalories = dayActivities.reduce((sum, a) => sum + (a.calories || 0), 0);

    last7Days.push({
      date: dayStart,
      dayName: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
      calories: Math.round(totalCalories),
      workouts: dayActivities.length,
      isToday: dayStart.toDateString() === new Date().toDateString(),
    });
  }

  // Calculate comparison with previous week
  const thisWeekTotal = last7Days.reduce((sum, d) => sum + d.calories, 0);

  // Get previous week (days -13 to -7)
  let prevWeekTotal = 0;
  for (let i = 13; i >= 7; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayStart = new Date(date.setHours(0, 0, 0, 0));
    const dayEnd = new Date(date.setHours(23, 59, 59, 999));

    const dayActivities = activities.filter(a => {
      const timestamp = new Date(a.timestamp);
      return timestamp >= dayStart && timestamp <= dayEnd;
    });

    prevWeekTotal += dayActivities.reduce((sum, a) => sum + (a.calories || 0), 0);
  }

  const changePercentage = prevWeekTotal > 0
    ? Math.round(((thisWeekTotal - prevWeekTotal) / prevWeekTotal) * 100)
    : 0;

  return {
    days: last7Days,
    thisWeekTotal: Math.round(thisWeekTotal),
    prevWeekTotal: Math.round(prevWeekTotal),
    changePercentage,
    trend: changePercentage > 0 ? 'up' : changePercentage < 0 ? 'down' : 'stable',
  };
};

/**
 * Get top exercises by frequency
 */
export const getTopExercises = (activities, limit = 5) => {
  const exerciseMap = {};

  activities.forEach(activity => {
    // Extract name properly - handle both new format (name) and old format (exercise object)
    let name = 'Unknown';
    if (activity.name && typeof activity.name === 'string') {
      name = activity.name;
    } else if (activity.exercise && typeof activity.exercise === 'object' && activity.exercise.name) {
      name = activity.exercise.name;
    } else if (activity.exercise && typeof activity.exercise === 'string') {
      name = activity.exercise;
    }

    // Extract icon properly
    let icon = 'fitness';
    if (activity.exercise && typeof activity.exercise === 'object' && activity.exercise.icon) {
      icon = activity.exercise.icon;
    } else {
      icon = getCategoryIcon(activity.category);
    }

    if (!exerciseMap[name]) {
      exerciseMap[name] = {
        name,
        count: 0,
        totalDuration: 0,
        totalCalories: 0,
        category: activity.category || 'Other',
        icon,
      };
    }
    exerciseMap[name].count += 1;
    exerciseMap[name].totalDuration += activity.duration || 0;
    exerciseMap[name].totalCalories += activity.calories || 0;
  });

  return Object.values(exerciseMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

/**
 * Get icon for exercise category
 */
const getCategoryIcon = (category) => {
  const iconMap = {
    'Cardio': 'bicycle',
    'Strength': 'barbell',
    'Yoga': 'body',
    'Sports': 'basketball',
    'Flexibility': 'flower',
    'Other': 'fitness',
  };
  return iconMap[category] || 'fitness';
};

/**
 * Calculate activity streak
 */
export const calculateActivityStreak = (activities) => {
  if (!activities || activities.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Sort activities by date (most recent first)
  const sortedActivities = [...activities].sort((a, b) =>
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  // Get unique activity dates
  const activityDates = [...new Set(
    sortedActivities.map(a => new Date(a.timestamp).toDateString())
  )].sort((a, b) => new Date(b) - new Date(a));

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const today = new Date().toDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  // Check if today or yesterday has activity
  if (activityDates[0] === today || activityDates[0] === yesterdayStr) {
    currentStreak = 1;
    tempStreak = 1;

    // Count consecutive days
    for (let i = 1; i < activityDates.length; i++) {
      const currentDate = new Date(activityDates[i]);
      const prevDate = new Date(activityDates[i - 1]);
      const diffDays = Math.round((prevDate - currentDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
        tempStreak++;
      } else {
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        tempStreak = 1;
      }
    }
  }

  // Check if temp streak is longest
  if (tempStreak > longestStreak) {
    longestStreak = tempStreak;
  }

  return {
    current: currentStreak,
    longest: Math.max(currentStreak, longestStreak),
  };
};

/**
 * Generate smart activity recommendations
 */
export const generateActivityRecommendations = (activities, moodData = []) => {
  const recommendations = [];

  // 1. Weekly Goal Progress
  const weeklyProgress = calculateWeeklyGoalProgress(activities);
  if (weeklyProgress.percentage < 50) {
    recommendations.push({
      type: 'goal',
      icon: 'target',
      color: '#F59E0B',
      title: 'Boost Your Week',
      message: `You're ${weeklyProgress.percentage}% to your goal. Try a ${Math.round(weeklyProgress.remaining / 2)} kcal workout!`,
      action: 'Log Workout',
      priority: 1,
    });
  } else if (weeklyProgress.percentage >= 80 && weeklyProgress.percentage < 100) {
    recommendations.push({
      type: 'goal',
      icon: 'flame',
      color: '#F59E0B',
      title: 'Almost There!',
      message: `Just ${weeklyProgress.remaining} kcal to hit your weekly goal!`,
      action: 'Log Workout',
      priority: 2,
    });
  } else if (weeklyProgress.percentage >= 100) {
    recommendations.push({
      type: 'goal',
      icon: 'trophy',
      color: '#10B981',
      title: 'Goal Achieved!',
      message: 'Amazing! You hit your weekly target. Keep the momentum going!',
      action: null,
      priority: 3,
    });
  }

  // 2. Consistency Streak
  const streak = calculateActivityStreak(activities);
  if (streak.current >= 3) {
    recommendations.push({
      type: 'streak',
      icon: 'flame-outline',
      color: '#EF4444',
      title: `${streak.current}-Day Streak!`,
      message: streak.current === 7
        ? 'Perfect week! You\'re crushing it! 🎉'
        : `${7 - streak.current} more day${7 - streak.current === 1 ? '' : 's'} for a perfect week!`,
      action: null,
      priority: 2,
    });
  } else if (streak.current === 0) {
    recommendations.push({
      type: 'streak',
      icon: 'timer',
      color: '#6B7280',
      title: 'Start a Streak',
      message: 'Log a workout today to begin building momentum!',
      action: 'Log Workout',
      priority: 1,
    });
  }

  // 3. Exercise Variety
  const breakdown = getActivityBreakdown(getThisWeekActivities(activities));
  const categories = Object.keys(breakdown);

  if (categories.length === 1 && activities.length > 2) {
    const dominantCategory = categories[0];
    const suggestions = {
      'Cardio': 'strength training',
      'Strength': 'cardio or yoga',
      'Yoga': 'cardio or strength',
      'Sports': 'yoga or stretching',
    };

    recommendations.push({
      type: 'variety',
      icon: 'shuffle',
      color: '#8B5CF6',
      title: 'Mix It Up',
      message: `You're focusing on ${dominantCategory}. Try adding ${suggestions[dominantCategory] || 'variety'}!`,
      action: 'Browse Exercises',
      priority: 2,
    });
  }

  // 4. Mood-Activity Correlation
  if (moodData && moodData.length > 5) {
    const activeDayMoods = moodData.filter(m => {
      const sameDay = activities.some(a =>
        new Date(a.timestamp).toDateString() === new Date(m.loggedDate || m.timestamp).toDateString()
      );
      return sameDay;
    });

    const restDayMoods = moodData.filter(m => {
      const sameDay = activities.some(a =>
        new Date(a.timestamp).toDateString() === new Date(m.loggedDate || m.timestamp).toDateString()
      );
      return !sameDay;
    });

    if (activeDayMoods.length >= 3 && restDayMoods.length >= 2) {
      const avgActiveMood = activeDayMoods.reduce((sum, m) => sum + (m.intensity || 5), 0) / activeDayMoods.length;
      const avgRestMood = restDayMoods.reduce((sum, m) => sum + (m.intensity || 5), 0) / restDayMoods.length;

      if (avgActiveMood > avgRestMood * 1.15) {
        recommendations.push({
          type: 'mood',
          icon: 'happy',
          color: '#10B981',
          title: 'Exercise Boosts Your Mood',
          message: `Your mood is ${Math.round(((avgActiveMood / avgRestMood) - 1) * 100)}% higher on active days!`,
          action: null,
          priority: 3,
        });
      }
    }
  }

  // 5. Rest Day Recommendation
  const last7Days = getSevenDayTrend(activities);
  const activeDaysCount = last7Days.days.filter(d => d.workouts > 0).length;

  if (activeDaysCount === 7 && activities.length > 10) {
    recommendations.push({
      type: 'rest',
      icon: 'moon',
      color: '#6366F1',
      title: 'Consider a Rest Day',
      message: 'You\'ve been active all week! Recovery is important for progress.',
      action: null,
      priority: 2,
    });
  }

  // Sort by priority (lower number = higher priority)
  return recommendations.sort((a, b) => a.priority - b.priority);
};

/**
 * Get monthly calendar data (for heatmap)
 */
export const getMonthlyCalendarData = (activities) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Get first and last day of month
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const calendarData = {};

  // Generate all days in month
  for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
    const dateStr = date.toDateString();
    const dayActivities = activities.filter(a =>
      new Date(a.timestamp).toDateString() === dateStr
    );

    const totalCalories = dayActivities.reduce((sum, a) => sum + (a.calories || 0), 0);

    calendarData[dateStr] = {
      date: new Date(date),
      calories: Math.round(totalCalories),
      workouts: dayActivities.length,
      isActive: totalCalories >= 200, // 200+ kcal = active day
      isRestDay: totalCalories === 0,
      isToday: dateStr === now.toDateString(),
    };
  }

  return calendarData;
};
