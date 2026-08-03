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

/**
 * Build a calendar grid of trained / rest days, newest week last.
 *
 * Rows are weeks running Sunday-Saturday (matching getWeekStart and the
 * backend), so the final row is the current week with any days after today
 * flagged `isFuture` rather than drawn as rest days.
 *
 * @param {Array} activities - adapted rows ({ timestamp, duration, calories })
 * @param {{ weeks?: number }} [options]
 */
export const getConsistencyGrid = (activities, options = {}) => {
  // A zero or nonsensical width falls back to the default rather than
  // collapsing the grid to a single row
  const requested = Number(options.weeks);
  const weeks = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 5;
  const rows = Array.isArray(activities) ? activities : [];

  // Minutes and session count per calendar day
  const byDay = new Map();
  rows.forEach((activity) => {
    const stamp = new Date(activity?.timestamp);
    if (Number.isNaN(stamp.getTime())) return;
    const key = stamp.toDateString();
    const entry = byDay.get(key) || { minutes: 0, sessions: 0 };
    entry.minutes += activity.duration || 0;
    entry.sessions += 1;
    byDay.set(key, entry);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start at the Sunday of the week that is `weeks - 1` weeks back
  const gridStart = getWeekStart(today);
  gridStart.setDate(gridStart.getDate() - (weeks - 1) * 7);

  const grid = [];
  let trainedDays = 0;
  let totalMinutes = 0;

  for (let week = 0; week < weeks; week += 1) {
    const days = [];
    for (let dow = 0; dow < 7; dow += 1) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + week * 7 + dow);

      const entry = byDay.get(date.toDateString());
      const isFuture = date > today;
      const trained = !isFuture && !!entry && entry.minutes > 0;

      if (trained) {
        trainedDays += 1;
        totalMinutes += entry.minutes;
      }

      days.push({
        date,
        dayKey: date.toDateString(),
        minutes: entry?.minutes || 0,
        sessions: entry?.sessions || 0,
        trained,
        isToday: date.getTime() === today.getTime(),
        isFuture,
        monthLabel: date.getDate() <= 7 ? date.toLocaleDateString('en-US', { month: 'short' }) : null,
      });
    }
    grid.push(days);
  }

  // Elapsed days only — an unreached day is neither trained nor rest
  const elapsed = grid.flat().filter((d) => !d.isFuture);

  // Longest run of consecutive rest days inside the window
  let longestGap = 0;
  let gapStart = null;
  let gapEnd = null;
  let currentGap = 0;
  let currentStart = null;

  elapsed.forEach((day) => {
    if (day.trained) {
      currentGap = 0;
      currentStart = null;
      return;
    }
    currentGap += 1;
    if (!currentStart) currentStart = day.date;
    if (currentGap > longestGap) {
      longestGap = currentGap;
      gapStart = currentStart;
      gapEnd = day.date;
    }
  });

  return {
    grid,
    weeks,
    trainedDays,
    elapsedDays: elapsed.length,
    totalMinutes,
    longestGap,
    longestGapStart: gapStart,
    longestGapEnd: gapEnd,
  };
};

/**
 * Normalise any stored intensity to the backend's three buckets.
 *
 * Rows logged before the picker matched the API still hold low / high /
 * very_high, and lumping those into "moderate" would misreport the mix.
 */
const INTENSITY_ALIASES = {
  low: 'light',
  light: 'light',
  moderate: 'moderate',
  medium: 'moderate',
  high: 'vigorous',
  very_high: 'vigorous',
  vigorous: 'vigorous',
};

export const normaliseIntensity = (value) =>
  INTENSITY_ALIASES[String(value || '').toLowerCase()] || 'moderate';

/**
 * How hard the training was, by share of minutes.
 *
 * CDC counts a vigorous minute as two moderate minutes, which is why the
 * split is worth showing rather than a single average.
 */
export const getIntensityMix = (activities) => {
  const rows = Array.isArray(activities) ? activities : [];
  const minutes = { light: 0, moderate: 0, vigorous: 0 };
  let total = 0;

  rows.forEach((activity) => {
    const bucket = normaliseIntensity(activity?.intensity);
    const value = Number(activity?.duration) || 0;
    if (value <= 0) return;
    minutes[bucket] += value;
    total += value;
  });

  const share = (value) => (total > 0 ? Math.round((value / total) * 100) : 0);
  const dominant = total > 0
    ? Object.entries(minutes).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  return {
    minutes,
    total,
    shares: {
      light: share(minutes.light),
      moderate: share(minutes.moderate),
      vigorous: share(minutes.vigorous),
    },
    dominant,
    // Vigorous minutes count double toward the guideline
    guidelineMinutes: minutes.light + minutes.moderate + minutes.vigorous * 2,
    hasData: total > 0,
  };
};

const TIME_BUCKETS = [
  { key: 'early', label: 'Early', from: 4, to: 8 },
  { key: 'morning', label: 'Morning', from: 8, to: 12 },
  { key: 'midday', label: 'Midday', from: 12, to: 17 },
  { key: 'evening', label: 'Evening', from: 17, to: 21 },
  { key: 'night', label: 'Night', from: 21, to: 4 },
];

/**
 * When training actually happens, by session count and minutes.
 */
export const getTimeOfDayPattern = (activities) => {
  const rows = Array.isArray(activities) ? activities : [];

  const buckets = TIME_BUCKETS.map((bucket) => ({
    ...bucket,
    sessions: 0,
    minutes: 0,
  }));

  let totalSessions = 0;

  rows.forEach((activity) => {
    const stamp = new Date(activity?.timestamp);
    if (Number.isNaN(stamp.getTime())) return;
    const hour = stamp.getHours();

    const bucket = buckets.find(({ from, to }) =>
      from < to ? hour >= from && hour < to : hour >= from || hour < to
    );
    if (!bucket) return;

    bucket.sessions += 1;
    bucket.minutes += Number(activity?.duration) || 0;
    totalSessions += 1;
  });

  const withShares = buckets.map((bucket) => ({
    ...bucket,
    share: totalSessions > 0 ? Math.round((bucket.sessions / totalSessions) * 100) : 0,
    averageMinutes: bucket.sessions > 0 ? Math.round(bucket.minutes / bucket.sessions) : 0,
  }));

  const ranked = [...withShares].sort((a, b) => b.sessions - a.sessions);
  const dominant = totalSessions > 0 && ranked[0].sessions > 0 ? ranked[0] : null;

  return {
    buckets: withShares,
    totalSessions,
    dominant,
    // Only claim a pattern once there is enough to claim it with
    hasPattern: totalSessions >= 5 && dominant !== null,
  };
};

/**
 * Personal bests. Degrades honestly: with a single session it reports that
 * session rather than inventing a record.
 */
export const getPersonalBests = (activities) => {
  const rows = (Array.isArray(activities) ? activities : []).filter((activity) => {
    const stamp = new Date(activity?.timestamp);
    return !Number.isNaN(stamp.getTime());
  });

  if (rows.length === 0) {
    return { longestSession: null, biggestBurn: null, bestWeek: null, totalSessions: 0 };
  }

  const longestSession = rows.reduce((best, activity) =>
    (Number(activity.duration) || 0) > (Number(best.duration) || 0) ? activity : best
  );

  const biggestBurn = rows.reduce((best, activity) =>
    (Number(activity.calories) || 0) > (Number(best.calories) || 0) ? activity : best
  );

  // Group by the Sunday that starts each week
  const weekTotals = new Map();
  rows.forEach((activity) => {
    const weekStart = getWeekStart(new Date(activity.timestamp));
    const key = weekStart.toDateString();
    const entry = weekTotals.get(key) || { weekStart, minutes: 0, sessions: 0 };
    entry.minutes += Number(activity.duration) || 0;
    entry.sessions += 1;
    weekTotals.set(key, entry);
  });

  const bestWeek = [...weekTotals.values()].sort((a, b) => b.minutes - a.minutes)[0] || null;

  return {
    longestSession: (Number(longestSession.duration) || 0) > 0 ? longestSession : null,
    biggestBurn: (Number(biggestBurn.calories) || 0) > 0 ? biggestBurn : null,
    bestWeek,
    totalSessions: rows.length,
  };
};

/**
 * Volume per muscle group, and how stale each one is.
 *
 * Requires exercise identity on the row (migration 0041). Rows logged before
 * that carry no exerciseId, so they are counted as `unattributed` rather than
 * guessed at — a cardio session says nothing about which muscles were worked.
 *
 * @param {Array} activities - adapted rows carrying exerciseId
 * @param {(id: string) => ({ muscleGroup?: string })} resolveExercise
 */
export const getMuscleBalance = (activities, resolveExercise) => {
  const rows = Array.isArray(activities) ? activities : [];
  const groups = new Map();
  let attributedMinutes = 0;
  let unattributedMinutes = 0;

  rows.forEach((activity) => {
    const minutes = Number(activity?.duration) || 0;
    if (minutes <= 0) return;

    const exercise = activity?.exerciseId && typeof resolveExercise === 'function'
      ? resolveExercise(activity.exerciseId)
      : null;
    const group = exercise?.muscleGroup;

    if (!group) {
      unattributedMinutes += minutes;
      return;
    }

    const stamp = new Date(activity.timestamp);
    const entry = groups.get(group) || { group, minutes: 0, sessions: 0, lastTrained: null };
    entry.minutes += minutes;
    entry.sessions += 1;
    if (!Number.isNaN(stamp.getTime()) && (!entry.lastTrained || stamp > entry.lastTrained)) {
      entry.lastTrained = stamp;
    }
    groups.set(group, entry);
    attributedMinutes += minutes;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ranked = [...groups.values()]
    .map((entry) => {
      const last = entry.lastTrained ? new Date(entry.lastTrained) : null;
      if (last) last.setHours(0, 0, 0, 0);
      return {
        ...entry,
        share: attributedMinutes > 0 ? Math.round((entry.minutes / attributedMinutes) * 100) : 0,
        daysSince: last ? Math.round((today - last) / 86400000) : null,
      };
    })
    .sort((a, b) => b.minutes - a.minutes);

  // The group trained least recently, among those trained at all
  const stalest = ranked
    .filter((entry) => Number.isFinite(entry.daysSince))
    .sort((a, b) => b.daysSince - a.daysSince)[0] || null;

  return {
    groups: ranked,
    attributedMinutes,
    unattributedMinutes,
    stalest,
    // Nothing to show until at least one identified exercise is logged
    hasData: ranked.length > 0,
  };
};

/**
 * Does moving change how the day feels?
 *
 * Joins per-day mood ratings to per-day activity minutes and compares rated
 * days that had movement against rated days that did not. Correlation is not
 * causation and the sample is tiny, so the result carries its own n and the
 * card is expected to say so.
 *
 * @param {Array} activities - adapted rows
 * @param {Array} moodTrend - moodAggregation trendData ({ dayKey, intensity, hasData })
 */
export const getMoodActivityLink = (activities, moodTrend) => {
  const rows = Array.isArray(activities) ? activities : [];
  const trend = Array.isArray(moodTrend) ? moodTrend : [];

  // Minutes per day, keyed in UTC to match moodAggregation's toDayKey(date, 0).
  // Both sides of this join MUST use the same convention — switching this to a
  // local date would silently produce zero matches on either side of midnight.
  const minutesByDay = new Map();
  rows.forEach((activity) => {
    const stamp = new Date(activity?.timestamp);
    if (Number.isNaN(stamp.getTime())) return;
    const key = stamp.toISOString().slice(0, 10);
    minutesByDay.set(key, (minutesByDay.get(key) || 0) + (Number(activity.duration) || 0));
  });

  const points = [];
  trend.forEach((day) => {
    if (!day || day.hasData === false) return;
    const intensity = Number(day.intensity);
    if (!Number.isFinite(intensity)) return;
    const key = String(day.dayKey || '').slice(0, 10);
    points.push({ dayKey: key, mood: intensity, minutes: minutesByDay.get(key) || 0 });
  });

  const active = points.filter((p) => p.minutes > 0);
  const rest = points.filter((p) => p.minutes === 0);
  const mean = (list) => (list.length ? list.reduce((sum, p) => sum + p.mood, 0) / list.length : null);

  const activeMean = mean(active);
  const restMean = mean(rest);

  return {
    points,
    activeDays: active.length,
    restDays: rest.length,
    activeMean: activeMean !== null ? Number(activeMean.toFixed(1)) : null,
    restMean: restMean !== null ? Number(restMean.toFixed(1)) : null,
    difference:
      activeMean !== null && restMean !== null ? Number((activeMean - restMean).toFixed(1)) : null,
    // Both sides need enough days before a comparison means anything
    hasComparison: active.length >= 3 && rest.length >= 3,
    sampleSize: points.length,
  };
};

/**
 * What to do next, derived only from gaps that actually exist: minutes left
 * against the weekly target, and which muscle group has gone longest untrained.
 */
export const getNextSessionSuggestion = (pace, balance, backendRecommendation) => {
  const reasons = [];

  const remaining = Number(pace?.remainingMinutes) || 0;
  const daysLeft = Number(pace?.daysLeft) || 0;
  const targetMet = (pace?.percentage || 0) >= 100;

  let suggestedMinutes = null;

  if (!targetMet && remaining > 0) {
    // Spread what is left over the days that remain, clamped to a session
    // length someone will actually do
    const sessions = Math.min(Math.max(daysLeft, 1), Math.max(1, Math.ceil(remaining / 30)));
    suggestedMinutes = Math.min(60, Math.max(15, Math.ceil(remaining / sessions)));
    reasons.push(
      `${remaining} min from your weekly target${daysLeft > 0 ? ` with ${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : ''}`
    );
  }

  const stale = balance?.stalest;
  if (stale && Number.isFinite(stale.daysSince) && stale.daysSince >= 4) {
    reasons.push(`${stale.group.toLowerCase()} last trained ${stale.daysSince} days ago`);
  }

  const focus = stale && stale.daysSince >= 4 ? stale.group : null;

  // The backend engine sees things this rule cannot — recovery score, strain
  // target, time of day, fitness level. Prefer its pick for WHAT to do, and
  // keep the local reasoning for WHY and HOW LONG. Two engines answering the
  // same question separately is how the Recovery and Activity screens ended up
  // recommending different sessions.
  const suggested = backendRecommendation || null;
  if (suggested?.reasons?.length) {
    const text = suggested.reasons[0]?.text ?? suggested.reasons[0];
    if (typeof text === 'string' && text.trim()) reasons.push(text.trim());
  }

  const backendMinutes = Number(suggested?.duration?.minutes ?? suggested?.duration);

  return {
    focus,
    activity: typeof suggested?.name === 'string' ? suggested.name : null,
    exerciseType: suggested?.type || null,
    minutes: Number.isFinite(suggestedMinutes)
      ? suggestedMinutes
      : Number.isFinite(backendMinutes)
      ? backendMinutes
      : 30,
    reasons,
    hasSuggestion: reasons.length > 0,
  };
};

/**
 * Group sessions into day buckets, newest first, for the session timeline.
 *
 * Labels are relative near today ("Today", "Yesterday", weekday inside the
 * last week) and absolute beyond that, so recent entries read naturally
 * without dates crowding the list.
 *
 * @param {Array} activities - adapted rows
 * @param {{ limit?: number }} [options] - max sessions to include
 */
export const groupSessionsByDay = (activities, options = {}) => {
  const limit = Number.isFinite(options.limit) && options.limit > 0 ? options.limit : 20;
  const rows = (Array.isArray(activities) ? activities : [])
    .filter((activity) => !Number.isNaN(new Date(activity?.timestamp).getTime()))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = new Map();

  rows.forEach((activity) => {
    const date = new Date(activity.timestamp);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const key = dayStart.toDateString();

    if (!buckets.has(key)) {
      const daysAgo = Math.round((today - dayStart) / 86400000);
      let label;
      if (daysAgo <= 0) label = 'Today';
      else if (daysAgo === 1) label = 'Yesterday';
      else if (daysAgo < 7) label = dayStart.toLocaleDateString('en-US', { weekday: 'long' });
      else {
        label = dayStart.toLocaleDateString('en-US', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });
      }

      buckets.set(key, { dayKey: key, date: dayStart, daysAgo, label, sessions: [], minutes: 0 });
    }

    const bucket = buckets.get(key);
    bucket.sessions.push(activity);
    bucket.minutes += Number(activity.duration) || 0;
  });

  const ordered = [...buckets.values()].sort((a, b) => a.daysAgo - b.daysAgo);

  // Rest days between sessions are the shape of the habit. A flat list hides
  // them: two entries look identical whether they were consecutive days or
  // three weeks apart.
  ordered.forEach((bucket, index) => {
    const newer = ordered[index - 1];
    bucket.gapAfter = newer ? bucket.daysAgo - newer.daysAgo - 1 : 0;
  });

  return ordered;
};

/**
 * Notable moments across the history, keyed by activity id.
 *
 * Only facts that are true of the whole record — a personal best, the first
 * time a movement appears — so a quiet week produces no badges rather than
 * manufactured ones.
 */
export const getSessionHighlights = (activities) => {
  const rows = (Array.isArray(activities) ? activities : []).filter(
    (a) => a && !Number.isNaN(new Date(a.timestamp).getTime())
  );
  const highlights = new Map();
  if (rows.length === 0) return highlights;

  const add = (id, label) => {
    if (id === undefined || id === null) return;
    if (!highlights.has(id)) highlights.set(id, label);
  };

  const longest = rows.reduce((best, a) =>
    (Number(a.duration) || 0) > (Number(best.duration) || 0) ? a : best
  );
  if ((Number(longest.duration) || 0) > 0 && rows.length > 1) {
    add(longest.id, 'Longest session');
  }

  const hardest = rows.reduce((best, a) =>
    (Number(a.calories) || 0) > (Number(best.calories) || 0) ? a : best
  );
  if ((Number(hardest.calories) || 0) > 0 && rows.length > 1) {
    add(hardest.id, 'Biggest burn');
  }

  // First appearance of a movement, oldest first so the badge lands on the
  // session that actually was the first
  const seen = new Set();
  [...rows]
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .forEach((activity) => {
      const key = activity.exerciseId || activity.exerciseName;
      if (!key || seen.has(key)) return;
      seen.add(key);
      // Only interesting once there is a history to be new against
      if (rows.length > 2) add(activity.id, `First ${activity.exerciseName || key}`);
    });

  return highlights;
};

/**
 * How a session compares to the user's own typical effort for that movement.
 * Needs three prior sessions of the same kind before it will say anything.
 */
export const getSessionComparison = (activity, activities) => {
  const key = activity?.exerciseId || activity?.exerciseName || activity?.type;
  if (!key) return null;

  const peers = (Array.isArray(activities) ? activities : []).filter((other) => {
    if (other === activity) return false;
    const otherKey = other?.exerciseId || other?.exerciseName || other?.type;
    return otherKey === key && (Number(other.duration) || 0) > 0;
  });

  if (peers.length < 3) return null;

  const mean = peers.reduce((sum, p) => sum + (Number(p.duration) || 0), 0) / peers.length;
  if (mean <= 0) return null;

  const delta = ((Number(activity.duration) || 0) - mean) / mean;
  if (Math.abs(delta) < 0.15) return null;

  const percent = Math.round(Math.abs(delta) * 100);
  return `${percent}% ${delta > 0 ? 'longer' : 'shorter'} than usual`;
};

/**
 * Group adapted rows by the specific exercise they recorded.
 *
 * Only rows carrying exercise identity (migration 0041) appear — a row that
 * only knows it was "cardio" cannot be attributed to a movement, and guessing
 * would be worse than omitting it. Callers fall back to the coarse type
 * breakdown when this comes back empty.
 */
export const getExerciseBreakdown = (activities, limit = 5) => {
  const rows = Array.isArray(activities) ? activities : [];
  const totals = new Map();

  rows.forEach((activity) => {
    const key = activity?.exerciseId || activity?.exerciseName;
    if (!key) return;

    const entry = totals.get(key) || {
      exerciseId: activity.exerciseId || null,
      name: activity.exerciseName || activity.exerciseId,
      minutes: 0,
      calories: 0,
      count: 0,
    };
    entry.minutes += Number(activity.duration) || 0;
    entry.calories += Number(activity.calories) || 0;
    entry.count += 1;
    totals.set(key, entry);
  });

  return [...totals.values()]
    .map((entry) => ({
      ...entry,
      minutes: Math.round(entry.minutes),
      calories: Math.round(entry.calories),
    }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, Math.max(1, limit));
};

/**
 * A calendar month of training, one entry per day, Sunday-first rows.
 *
 * Each day carries its minutes so a cell can show volume rather than a binary
 * trained/rest mark, and the sessions themselves so tapping a day needs no
 * second lookup. Days outside the month are included as padding so the grid
 * stays rectangular, and days in the future are flagged rather than drawn as
 * rest.
 *
 * @param {Array} activities - adapted rows
 * @param {{ monthsAgo?: number, dailyTargetMinutes?: number }} [options]
 */
export const getMonthGrid = (activities, options = {}) => {
  const monthsAgo = Number.isFinite(options.monthsAgo) ? options.monthsAgo : 0;
  const dailyTarget =
    Number(options.dailyTargetMinutes) > 0
      ? Number(options.dailyTargetMinutes)
      : DEFAULT_WEEKLY_MINUTES_TARGET / 7;

  const rows = Array.isArray(activities) ? activities : [];

  const byDay = new Map();
  rows.forEach((activity) => {
    const stamp = new Date(activity?.timestamp);
    if (Number.isNaN(stamp.getTime())) return;
    const key = stamp.toDateString();
    const entry = byDay.get(key) || { minutes: 0, calories: 0, sessions: [] };
    entry.minutes += Number(activity.duration) || 0;
    entry.calories += Number(activity.calories) || 0;
    entry.sessions.push(activity);
    byDay.set(key, entry);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const anchor = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
  const monthIndex = anchor.getMonth();
  const daysInMonth = new Date(anchor.getFullYear(), monthIndex + 1, 0).getDate();

  // Pad back to the Sunday that starts the first week
  const gridStart = new Date(anchor);
  gridStart.setDate(1 - anchor.getDay());

  const cells = [];
  const totalCells = Math.ceil((anchor.getDay() + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);

    const entry = byDay.get(date.toDateString());
    const inMonth = date.getMonth() === monthIndex;
    const isFuture = date > today;

    cells.push({
      date,
      dayKey: date.toDateString(),
      dayOfMonth: date.getDate(),
      inMonth,
      isFuture,
      isToday: date.getTime() === today.getTime(),
      minutes: entry?.minutes || 0,
      calories: entry?.calories || 0,
      sessions: entry?.sessions || [],
      trained: !isFuture && (entry?.minutes || 0) > 0,
      // 0-1 of a day's share of the weekly target, for a ring's fill
      progress: Math.min((entry?.minutes || 0) / dailyTarget, 1),
    });
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const monthCells = cells.filter((c) => c.inMonth && !c.isFuture);

  return {
    weeks,
    monthLabel: anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    monthsAgo,
    trainedDays: monthCells.filter((c) => c.trained).length,
    elapsedDays: monthCells.length,
    totalMinutes: monthCells.reduce((sum, c) => sum + c.minutes, 0),
    dailyTarget: Math.round(dailyTarget),
    // Cannot look into a month that has not started
    canGoForward: monthsAgo > 0,
  };
};
