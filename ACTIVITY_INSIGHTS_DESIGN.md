# 💪 Activity Tab Redesign: Insights + Analytics

## 🎯 Goal
Create a dedicated Activity insights screen with the same premium feel as Mood and Water trackers, showing trends, recommendations, and beautiful visualizations.

---

## 📐 Design Philosophy

**Current State:**
- Activity tab = Basic logging screen (input only)
- No insights, trends, or recommendations
- Static calorie counter

**New Design:**
- Activity tab = Input + Output (comprehensive)
- Beautiful insights screen (like mood/water trackers)
- Actionable recommendations
- Premium visualizations

---

## 🎨 Proposed Layout

### Mode Selector Pills (Top)

```
┌──────────────────────────────────────┐
│ [●Log Workout] [ Insights]           │ ← Pills (like Text/Photo/Voice)
└──────────────────────────────────────┘
```

**Two modes:**
1. **Log Workout** - Current input screen (default)
2. **Insights** - New dedicated analytics screen

---

## 📊 Mode 1: Log Workout (Current - Keep as is)

```
┌──────────────────────────────────────┐
│ 🏋️ Log Your Activity                 │
│                                      │
│ Search exercises...                  │
│ [Strength] [Cardio] [Yoga] [Sports] │
│                                      │
│ Today's Summary                      │
│ ┌──────────────────────────────────┐ │
│ │ 🔥 320 kcal burned                │ │
│ │ ⏱️ 45 min active                   │ │
│ └──────────────────────────────────┘ │
│                                      │
│ [Exercise list...]                   │
└──────────────────────────────────────┘
```

**Keep existing functionality:**
- Exercise search
- Category filters
- Duration/intensity input
- Today's activities list

---

## 🌟 Mode 2: Insights (NEW - Premium feel)

### Header Section
```
┌──────────────────────────────────────┐
│ 💪 Activity Insights                 │
│ Week of Dec 18 - Dec 24             │
└──────────────────────────────────────┘
```

### Section 1: Weekly Summary Card (Hero)
```
┌──────────────────────────────────────┐
│  This Week's Performance             │
│                                      │
│  [Animated Ring - 85% of goal]       │ ← Like NutriScore ring
│                                      │
│  1,240 kcal / 1,500 kcal (83%)      │
│  4 workouts / 5 target              │
│                                      │
│  ⭐ Great consistency!               │
└──────────────────────────────────────┘
```

**Features:**
- Animated progress ring (reuse from Dashboard)
- Weekly goal tracking
- Motivational message

---

### Section 2: Activity Breakdown
```
┌──────────────────────────────────────┐
│  Calories Burned by Type             │
│                                      │
│  [Horizontal Stacked Bar Chart]      │
│  ███████ Cardio (540 kcal)          │
│  ████ Strength (320 kcal)           │
│  ██ Yoga (180 kcal)                 │
│  █ Sports (200 kcal)                │
│                                      │
│  Most active: Cardio (43%)          │
└──────────────────────────────────────┘
```

**Visualization:**
- Stacked bar chart (colored by category)
- Category breakdown with percentages
- Highlight dominant category

---

### Section 3: Trends Graph
```
┌──────────────────────────────────────┐
│  7-Day Calorie Trend                 │
│                                      │
│  [Line/Bar Chart]                    │
│  400 ┤     ╭─╮                       │
│      │    ╭╯ ╰╮  ╭╮                  │
│  200 │  ╭─╯    ╰─╯╰─╮                │
│      │ ╭╯           ╰╮               │
│    0 └─────────────────               │
│      M  T  W  T  F  S  S             │
│                                      │
│  📈 +15% vs last week                │
└──────────────────────────────────────┘
```

**Features:**
- Animated line chart
- Weekly comparison
- Trend indicator (up/down)

---

### Section 4: Exercise Frequency
```
┌──────────────────────────────────────┐
│  Top Exercises This Week             │
│                                      │
│  1. 🏃 Running       3x  (180 min)   │
│  2. 🏋️ Weight Training 2x  (90 min)  │
│  3. 🧘 Yoga          2x  (60 min)   │
│  4. 🚴 Cycling       1x  (45 min)   │
│                                      │
│  [View All Exercises →]              │
└──────────────────────────────────────┘
```

**Features:**
- Ranked list by frequency
- Time spent per exercise
- Link to detailed history

---

### Section 5: Smart Recommendations (AI)
```
┌──────────────────────────────────────┐
│  💡 Personalized Insights            │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 🎯 Goal Progress                │  │
│  │ You're 83% to your weekly goal. │  │
│  │ One more 300 kcal workout!      │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 📅 Consistency Streak            │  │
│  │ 4 days active this week!        │  │
│  │ Keep it up for 7-day streak 🔥  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 🏃 Recommended Next Activity     │  │
│  │ Try: Strength training (haven't │  │
│  │ done in 3 days)                 │  │
│  │ [Log It Now →]                  │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

**Smart Recommendations:**
1. **Goal Progress** - How close to weekly target
2. **Consistency Streak** - Gamification
3. **Recommended Activity** - Based on patterns (suggest what's missing)
4. **Recovery Suggestion** - Rest day if overtraining detected
5. **Variety Tip** - Suggest new exercise types

---

### Section 6: Mood-Activity Correlation
```
┌──────────────────────────────────────┐
│  🧠 Activity & Mood Connection       │
│                                      │
│  Your mood is 20% higher on days    │
│  with 300+ kcal burned.             │
│                                      │
│  Best mood days: After cardio 🏃    │
│                                      │
│  [View Detailed Analysis →]          │
└──────────────────────────────────────┘
```

**Cross-insights:**
- Link activity data with mood logs
- Show correlations
- Actionable insights

---

### Section 7: Monthly Calendar View
```
┌──────────────────────────────────────┐
│  December Activity Calendar          │
│                                      │
│  Mo Tu We Th Fr Sa Su               │
│      1🔥 2🔥 3⚪ 4🔥 5🔥 6⚪ 7🔥     │
│   8🔥 9🔥 10⚪11🔥12🔥13⚪14🔥     │
│  15🔥16🔥17⚪18🔥19🔥20⚪21🔥     │
│  22🔥23🔥24⚪25  26  27  28        │
│                                      │
│  🔥 Active day (300+ kcal)           │
│  ⚪ Rest day                         │
│                                      │
│  Current streak: 4 days 🔥           │
└──────────────────────────────────────┘
```

**Features:**
- Visual calendar heatmap
- Streak tracking
- Rest day identification

---

## 🎨 Visual Design Specifications

### Color Scheme (Activity Theme)
```javascript
primary: '#10B981'      // Green (energy, fitness)
secondary: '#059669'    // Dark green
accent: '#34D399'       // Light green
warning: '#F59E0B'      // Orange (rest needed)
background: '#F9F7F4'   // Warm off-white
cardBg: '#FFFFFF'       // White cards
```

### Components to Create

1. **ActivityInsightsHeader.jsx**
   - Weekly summary ring
   - Goal progress
   - Motivational message

2. **ActivityBreakdownChart.jsx**
   - Stacked bar chart by category
   - Animated segments
   - Category labels

3. **ActivityTrendGraph.jsx**
   - Line/bar chart for 7-day trend
   - Comparison with previous week
   - Animated rendering

4. **TopExercisesList.jsx**
   - Ranked exercise list
   - Frequency + duration
   - Icons for each category

5. **ActivityRecommendationCard.jsx**
   - Smart AI suggestions
   - Actionable CTAs
   - Dynamic content

6. **ActivityMoodCorrelation.jsx**
   - Cross-data insights
   - Mood-activity charts
   - Recommendations

7. **ActivityCalendarHeatmap.jsx**
   - Monthly view
   - Streak visualization
   - Interactive dates

---

## 🔧 Implementation Plan

### Phase 1: Add Mode Selector Pills
```javascript
// activity.jsx
const [viewMode, setViewMode] = useState('log'); // 'log' or 'insights'

<View style={styles.modeSelector}>
  <TouchableOpacity
    style={[styles.pill, viewMode === 'log' && styles.pillActive]}
    onPress={() => setViewMode('log')}
  >
    <Text>Log Workout</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.pill, viewMode === 'insights' && styles.pillActive]}
    onPress={() => setViewMode('insights')}
  >
    <Text>Insights</Text>
  </TouchableOpacity>
</View>

{viewMode === 'log' ? <LogWorkoutView /> : <ActivityInsightsView />}
```

### Phase 2: Create ActivityInsightsView Component
```javascript
// components/ActivityInsightsView.jsx
export default function ActivityInsightsView({ activities }) {
  return (
    <ScrollView>
      <ActivityInsightsHeader />
      <ActivityBreakdownChart />
      <ActivityTrendGraph />
      <TopExercisesList />
      <ActivityRecommendationCard />
      <ActivityMoodCorrelation />
      <ActivityCalendarHeatmap />
    </ScrollView>
  );
}
```

### Phase 3: Fetch Historical Data
```javascript
// Need to load more than just today's activities
const [allActivities, setAllActivities] = useState([]);

const loadHistoricalActivities = async () => {
  // Load last 30 days for trends
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) {
    const data = JSON.parse(stored);
    // Filter to last 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recent = data.filter(
      (activity) => activity.timestamp >= thirtyDaysAgo
    );
    setAllActivities(recent);
  }
};
```

### Phase 4: Add Analytics Utilities
```javascript
// utils/activityAnalytics.js

export const calculateWeeklyGoalProgress = (activities, weeklyGoal = 1500) => {
  const thisWeek = getThisWeekActivities(activities);
  const totalCalories = thisWeek.reduce((sum, a) => sum + a.calories, 0);
  return {
    calories: totalCalories,
    goal: weeklyGoal,
    percentage: (totalCalories / weeklyGoal) * 100,
    remaining: Math.max(0, weeklyGoal - totalCalories)
  };
};

export const getActivityBreakdown = (activities) => {
  const breakdown = {};
  activities.forEach(activity => {
    const category = activity.category || 'Other';
    if (!breakdown[category]) {
      breakdown[category] = { calories: 0, count: 0 };
    }
    breakdown[category].calories += activity.calories;
    breakdown[category].count += 1;
  });
  return breakdown;
};

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

    const totalCalories = dayActivities.reduce((sum, a) => sum + a.calories, 0);
    last7Days.push({
      date: dayStart,
      calories: totalCalories,
      workouts: dayActivities.length
    });
  }
  return last7Days;
};

export const getTopExercises = (activities, limit = 5) => {
  const exerciseMap = {};
  activities.forEach(activity => {
    const name = activity.name;
    if (!exerciseMap[name]) {
      exerciseMap[name] = {
        name,
        count: 0,
        totalDuration: 0,
        totalCalories: 0,
        category: activity.category
      };
    }
    exerciseMap[name].count += 1;
    exerciseMap[name].totalDuration += activity.duration;
    exerciseMap[name].totalCalories += activity.calories;
  });

  return Object.values(exerciseMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

export const generateActivityRecommendations = (activities, moodData) => {
  const recommendations = [];

  // Goal progress recommendation
  const weeklyProgress = calculateWeeklyGoalProgress(activities);
  if (weeklyProgress.percentage < 50) {
    recommendations.push({
      type: 'goal',
      icon: 'target',
      title: 'Boost Your Week',
      message: `You're ${Math.round(weeklyProgress.percentage)}% to your goal. Try a ${Math.round(weeklyProgress.remaining / 2)} kcal workout!`,
      action: 'Log Workout'
    });
  } else if (weeklyProgress.percentage >= 100) {
    recommendations.push({
      type: 'goal',
      icon: 'trophy',
      title: 'Goal Achieved!',
      message: 'Amazing! You hit your weekly target. Keep the momentum!',
      action: null
    });
  }

  // Consistency recommendation
  const last7Days = getSevenDayTrend(activities);
  const activeDays = last7Days.filter(d => d.calories > 0).length;
  if (activeDays >= 5) {
    recommendations.push({
      type: 'streak',
      icon: 'flame',
      title: `${activeDays}-Day Streak!`,
      message: activeDays === 7 ? 'Perfect week! 🎉' : `${7 - activeDays} more day${7 - activeDays === 1 ? '' : 's'} for a perfect week!`,
      action: null
    });
  }

  // Variety recommendation
  const breakdown = getActivityBreakdown(activities);
  const categories = Object.keys(breakdown);
  if (categories.length === 1) {
    recommendations.push({
      type: 'variety',
      icon: 'shuffle',
      title: 'Mix It Up',
      message: 'Try adding variety! Consider yoga or strength training.',
      action: 'Browse Exercises'
    });
  }

  // Mood correlation
  if (moodData && moodData.length > 0) {
    // Calculate average mood on active days vs rest days
    const activeDayMoods = moodData.filter(m => {
      const sameDay = activities.some(a =>
        new Date(a.timestamp).toDateString() === new Date(m.timestamp).toDateString()
      );
      return sameDay;
    });

    if (activeDayMoods.length > 0) {
      const avgActiveMood = activeDayMoods.reduce((sum, m) => sum + m.intensity, 0) / activeDayMoods.length;
      const avgRestMood = moodData.length > 0
        ? moodData.reduce((sum, m) => sum + m.intensity, 0) / moodData.length
        : 0;

      if (avgActiveMood > avgRestMood * 1.1) {
        recommendations.push({
          type: 'mood',
          icon: 'happy',
          title: 'Exercise Boosts Your Mood',
          message: `Your mood is ${Math.round(((avgActiveMood / avgRestMood) - 1) * 100)}% higher on active days!`,
          action: null
        });
      }
    }
  }

  return recommendations;
};
```

---

## 📱 Example Implementation

```javascript
// components/ActivityInsightsView.jsx
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  calculateWeeklyGoalProgress,
  getActivityBreakdown,
  getSevenDayTrend,
  getTopExercises,
  generateActivityRecommendations
} from '../utils/activityAnalytics';

export default function ActivityInsightsView({ activities, moodData }) {
  const weeklyProgress = calculateWeeklyGoalProgress(activities);
  const breakdown = getActivityBreakdown(activities);
  const trend = getSevenDayTrend(activities);
  const topExercises = getTopExercises(activities);
  const recommendations = generateActivityRecommendations(activities, moodData);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Text style={styles.title}>💪 Activity Insights</Text>
      <Text style={styles.subtitle}>
        Week of {new Date().toLocaleDateString()}
      </Text>

      {/* Weekly Summary */}
      <LinearGradient
        colors={['#10B981', '#059669']}
        style={styles.summaryCard}
      >
        <Text style={styles.summaryTitle}>This Week's Performance</Text>
        <Text style={styles.summaryValue}>
          {weeklyProgress.calories} / {weeklyProgress.goal} kcal
        </Text>
        <Text style={styles.summaryPercentage}>
          {Math.round(weeklyProgress.percentage)}% Complete
        </Text>
      </LinearGradient>

      {/* Breakdown Chart */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Calories by Type</Text>
        {Object.entries(breakdown).map(([category, data]) => (
          <View key={category} style={styles.breakdownRow}>
            <Text style={styles.categoryName}>{category}</Text>
            <Text style={styles.categoryCalories}>{data.calories} kcal</Text>
          </View>
        ))}
      </View>

      {/* Top Exercises */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Top Exercises</Text>
        {topExercises.map((exercise, index) => (
          <View key={exercise.name} style={styles.exerciseRow}>
            <Text style={styles.exerciseRank}>{index + 1}.</Text>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <Text style={styles.exerciseCount}>{exercise.count}x</Text>
          </View>
        ))}
      </View>

      {/* Recommendations */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💡 Smart Insights</Text>
        {recommendations.map((rec, index) => (
          <View key={index} style={styles.recommendationCard}>
            <Ionicons name={rec.icon} size={24} color="#10B981" />
            <View style={styles.recommendationText}>
              <Text style={styles.recommendationTitle}>{rec.title}</Text>
              <Text style={styles.recommendationMessage}>{rec.message}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
```

---

## 🎯 Success Metrics

**User Engagement:**
- Time spent on Insights tab
- Insights view frequency
- Recommendation click-through rate

**Motivation:**
- Workout frequency increase
- Weekly goal achievement rate
- Streak maintenance

**Cross-feature:**
- Mood-activity correlation awareness
- Users checking insights before/after workouts

---

## 🚀 Next Steps

1. **Create analytics utilities** (utils/activityAnalytics.js)
2. **Build insight components** (one component at a time)
3. **Add mode selector pills** to activity.jsx
4. **Integrate with mood data** for cross-insights
5. **Test with real user data**
6. **Polish animations and transitions**

---

**Ready to implement?** This will transform Activity from a simple input screen to a comprehensive fitness tracking + insights experience!
