/**
 * Activity Analytics Utilities
 *
 * Calculates insights, trends, and recommendations for activity/workout data
 */

/**
 * Start of the current week, Sunday 00:00 local.
 *
 * This MUST match the backend, which anchors weekly progress to Sunday
 * (backend/src/routes/activity.js: `weekStart.setDate(date - date.getDay())`).
 * This used to anchor to Monday, so on a Monday the two disagreed by a full
 * day: the Activity tab header (backend) counted Sunday's workout while this
 * screen (client) did not, and the same screen showed "0 / 1500 kcal" above
 * "Cardio 35 kcal" from the very same rows.
 */
export const getWeekStart = (reference = new Date()) => {
  const weekStart = new Date(reference);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

/**
 * Get activities from the current week (Sunday - Saturday)
 */
export const getThisWeekActivities = (activities) => {
  if (!Array.isArray(activities)) return [];

  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return activities.filter(activity => {
    const timestamp = new Date(activity?.timestamp);
    if (Number.isNaN(timestamp.getTime())) return false;
    return timestamp >= weekStart && timestamp <= weekEnd;
  });
};

/** CDC recommendation, and the target the backend tracks against */
export const DEFAULT_WEEKLY_MINUTES_TARGET = 150;

/**
 * Calculate weekly progress against the ONLY target this product actually has:
 * minutes of activity per week.
 *
 * The previous version scored progress against 1500 kcal/week and 5
 * workouts/week — neither of which the user set, the backend tracks, or any
 * guideline specifies. Those invented denominators drove the ring, the
 * headline and the recommendations, so a real 35 kcal session read as "2% of
 * your goal" and produced advice to "try a 733 kcal workout" (half the
 * remaining fiction).
 *
 * Calories and session count are still reported, as facts rather than as
 * progress toward a number nobody chose.
 *
 * @param {Array} activities - adapted rows ({ timestamp, duration, calories })
 * @param {{ targetMinutes?: number }} [options] - pass the backend's target
 */
export const calculateWeeklyGoalProgress = (activities, options = {}) => {
  const targetMinutes = Number(options.targetMinutes) > 0
    ? Math.round(Number(options.targetMinutes))
    : DEFAULT_WEEKLY_MINUTES_TARGET;

  const thisWeek = getThisWeekActivities(activities);
  const minutes = Math.round(thisWeek.reduce((sum, a) => sum + (a.duration || 0), 0));
  const calories = Math.round(thisWeek.reduce((sum, a) => sum + (a.calories || 0), 0));
  const workoutCount = thisWeek.length;

  const percentage = targetMinutes > 0
    ? Math.min(Math.round((minutes / targetMinutes) * 100), 100)
    : 0;

  return {
    // Primary: minutes against the real target
    minutes,
    targetMinutes,
    percentage,
    remainingMinutes: Math.max(0, targetMinutes - minutes),
    // Secondary facts, no invented denominator
    calories,
    workoutCount,
    activeDays: new Set(thisWeek.map((a) => new Date(a.timestamp).toDateString())).size,
  };
};

/**
 * Where the user should be by now to finish the week on target, and how far
 * off that pace they are. Sunday counts as one elapsed day, not zero.
 */
export const getWeeklyPace = (activities, options = {}) => {
  const progress = calculateWeeklyGoalProgress(activities, options);
  const elapsedDays = Math.min(7, new Date().getDay() + 1);
  const expectedByNow = Math.round((progress.targetMinutes / 7) * elapsedDays);

  return {
    ...progress,
    elapsedDays,
    expectedByNow,
    deltaMinutes: progress.minutes - expectedByNow,
    onPace: progress.minutes >= expectedByNow,
    daysLeft: 7 - elapsedDays,
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
 * Get 7-day activity trend, with the previous 7 days as the comparison.
 *
 * `changePercentage` is null — never 0 — when the previous week is empty.
 * Reporting 0% there claimed "no change" and rendered a neutral badge reading
 * "0%" directly above the caption "35 kcal this week vs 0 kcal last week".
 */
export const getSevenDayTrend = (activities) => {
  const rows = Array.isArray(activities) ? activities : [];

  const bucketFor = (daysAgo) => {
    const dayStart = new Date();
    dayStart.setDate(dayStart.getDate() - daysAgo);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const dayActivities = rows.filter((a) => {
      const timestamp = new Date(a?.timestamp);
      if (Number.isNaN(timestamp.getTime())) return false;
      return timestamp >= dayStart && timestamp <= dayEnd;
    });

    return {
      date: dayStart,
      dayName: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
      calories: Math.round(dayActivities.reduce((sum, a) => sum + (a.calories || 0), 0)),
      minutes: Math.round(dayActivities.reduce((sum, a) => sum + (a.duration || 0), 0)),
      workouts: dayActivities.length,
      isToday: daysAgo === 0,
    };
  };

  const last7Days = [];
  for (let i = 6; i >= 0; i -= 1) last7Days.push(bucketFor(i));

  const previous7Days = [];
  for (let i = 13; i >= 7; i -= 1) previous7Days.push(bucketFor(i));

  const sum = (days, key) => days.reduce((total, d) => total + d[key], 0);
  const thisWeekTotal = sum(last7Days, 'calories');
  const prevWeekTotal = sum(previous7Days, 'calories');
  const thisWeekMinutes = sum(last7Days, 'minutes');
  const prevWeekMinutes = sum(previous7Days, 'minutes');

  const pctChange = (current, previous) =>
    previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

  const changePercentage = pctChange(thisWeekTotal, prevWeekTotal);
  const minutesChangePercentage = pctChange(thisWeekMinutes, prevWeekMinutes);

  return {
    days: last7Days,
    previousDays: previous7Days,
    thisWeekTotal,
    prevWeekTotal,
    thisWeekMinutes,
    prevWeekMinutes,
    changePercentage,
    minutesChangePercentage,
    // Explicit so callers do not have to infer intent from a null
    hasComparison: prevWeekTotal > 0 || prevWeekMinutes > 0,
    trend:
      changePercentage === null
        ? 'insufficient'
        : changePercentage > 0
        ? 'up'
        : changePercentage < 0
        ? 'down'
        : 'stable',
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
export const generateActivityRecommendations = (activities, moodData = [], options = {}) => {
  const recommendations = [];

  // 1. Weekly pace — against minutes, the only target that exists
  const pace = getWeeklyPace(activities, options);

  if (pace.percentage >= 100) {
    recommendations.push({
      type: 'goal',
      icon: 'trophy',
      color: '#10B981',
      title: 'Weekly target hit',
      message: `${pace.minutes} of ${pace.targetMinutes} minutes done. Anything more is a bonus.`,
      action: null,
      priority: 3,
    });
  } else if (pace.daysLeft === 0) {
    recommendations.push({
      type: 'goal',
      icon: 'flag',
      color: '#F59E0B',
      title: 'Last day of the week',
      message: `${pace.remainingMinutes} min short of ${pace.targetMinutes}. Even a walk closes part of it.`,
      action: 'Log Workout',
      priority: 1,
    });
  } else if (!pace.onPace) {
    // Concrete and checkable: how many sessions of what length, in the days
    // that are actually left. No invented calorie figure.
    const sessions = Math.min(pace.daysLeft, Math.max(1, Math.ceil(pace.remainingMinutes / 30)));
    const perSession = Math.ceil(pace.remainingMinutes / sessions);
    recommendations.push({
      type: 'goal',
      icon: 'trending-up',
      color: '#F59E0B',
      title: 'Behind pace',
      message: `${pace.remainingMinutes} min left with ${pace.daysLeft} day${pace.daysLeft === 1 ? '' : 's'} to go — ${sessions} x ${perSession} min gets you there.`,
      action: 'Log Workout',
      priority: 1,
    });
  } else if (pace.percentage >= 80) {
    recommendations.push({
      type: 'goal',
      icon: 'flame',
      color: '#F59E0B',
      title: 'Almost there',
      message: `${pace.remainingMinutes} min to hit ${pace.targetMinutes} for the week.`,
      action: 'Log Workout',
      priority: 2,
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
