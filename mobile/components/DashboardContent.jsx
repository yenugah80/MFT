import { View, ScrollView, Text, ActivityIndicator, RefreshControl, StyleSheet, TouchableOpacity } from "react-native";
import { useDashboard } from "../hooks/useDashboard";
import CircularProgress from "./CircularProgress";
import MacroRing from "./MacroRing";
import StatCard from "./StatCard";
import MicrosCoverageSection from "./MicrosCoverageSection";
import MoodChip from "./MoodChip";
import MoodLogger from "./MoodLogger";
import WaterLogger from "./WaterLogger";
import { useState, useMemo } from "react";
import { useNotification } from "../providers/NotificationProvider";

// Health-focused color palette
const COLORS = {
  calories: '#10b981', // Green for energy
  protein: '#8b5cf6', // Purple for protein
  carbs: '#f59e0b',   // Amber for carbs
  fat: '#ef4444',     // Red for fats
  water: '#3b82f6',   // Blue for water
  xp: '#6366f1',      // Indigo for XP
  streak: '#f97316',  // Orange for streak
};

export default function DashboardContent() {
  const { data, isLoading, error, refetch } = useDashboard();
  const [refreshing, setRefreshing] = useState(false);
  const [moodModalVisible, setMoodModalVisible] = useState(false);
  const [waterModalVisible, setWaterModalVisible] = useState(false);
  const notify = useNotification();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Aggregate micros from today's food logs
  const aggregatedMicros = useMemo(() => {
    if (!data?.today?.foodLogs) return {};

    const micros = {};
    data.today.foodLogs.forEach((log) => {
      if (log.micros && typeof log.micros === 'object') {
        Object.entries(log.micros).forEach(([key, value]) => {
          // Micros are now stored as numbers (normalized at ingestion)
          const numValue = typeof value === 'number' ? value : (parseFloat(value) || 0);
          micros[key] = (micros[key] || 0) + numValue;
        });
      }
    });

    return micros;
  }, [data]);

  // View all micros handler
  const handleViewAllMicros = () => {
    notify.info('Detailed micros view - Coming soon');
    // TODO: Navigate to micros detail screen or open bottom sheet
  };

  // Mood logging handler
  const handleLogMood = () => {
    setMoodModalVisible(true);
  };

  // Water logging handler (for water section quick add)
  const handleLogWater = () => {
    setWaterModalVisible(true);
  };

  // Success handlers
  const handleMoodSuccess = () => {
    notify.success('Mood logged successfully! 😊');
    refetch(); // Refresh dashboard data
  };

  const handleWaterSuccess = () => {
    notify.success('Water intake logged! 💧');
    refetch(); // Refresh dashboard data
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.calories} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Unable to load dashboard</Text>
        <Text style={styles.errorText}>Please try again later</Text>
      </View>
    );
  }

  if (!data) {
    return null;
  }

  const { today, goals, gamification, trends, recentWeight } = data;

  // Calculate remaining calories
  const caloriesEaten = today.nutrition.totalCalories;
  const caloriesTarget = goals?.dailyCalories || 2000;
  const caloriesRemaining = Math.max(0, caloriesTarget - caloriesEaten);
  const caloriesOver = caloriesEaten > caloriesTarget;

  // Calculate XP progress to next level
  const xpCurrent = gamification.xp % 1000;
  const xpTarget = 1000;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today's Progress</Text>
        <Text style={styles.headerSubtitle}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </Text>
      </View>

      {/* MAIN CALORIE RING */}
      <View style={styles.heroSection}>
        <CircularProgress
          value={caloriesEaten}
          maxValue={caloriesTarget}
          size={180}
          strokeWidth={14}
          color={caloriesOver ? COLORS.fat : COLORS.calories}
          backgroundColor="rgba(206, 229, 246, 1)"
        >
          <View style={styles.calorieCenter}>
            <Text style={styles.calorieValue}>
              {caloriesOver ? '+' : ''}{caloriesOver ? caloriesEaten - caloriesTarget : caloriesRemaining}
            </Text>
            <Text style={styles.calorieUnit}>
              {caloriesOver ? 'over' : 'left'}
            </Text>
            <Text style={styles.calorieTarget}>
              {caloriesEaten} / {caloriesTarget}
            </Text>
          </View>
        </CircularProgress>
        {trends.weeklyAverages && (
          <Text style={styles.weeklyContext}>
            Weekly avg: {Math.round(trends.weeklyAverages.avgCalories)} kcal/day
          </Text>
        )}
      </View>

      {/* MACRO RINGS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Macronutrients</Text>
        <View style={styles.macroRow}>
          <MacroRing
            label="Protein"
            value={today.nutrition.totalProtein}
            target={goals?.proteinG || 100}
            unit="g"
            color={COLORS.protein}
            size={90}
          />
          <MacroRing
            label="Carbs"
            value={today.nutrition.totalCarbs}
            target={goals?.carbsG || 200}
            unit="g"
            color={COLORS.carbs}
            size={90}
          />
          <MacroRing
            label="Fat"
            value={today.nutrition.totalFats}
            target={goals?.fatsG || 60}
            unit="g"
            color={COLORS.fat}
            size={90}
          />
        </View>
      </View>

      {/* MICROS COVERAGE */}
      <View style={styles.section}>
        <MicrosCoverageSection
          micros={aggregatedMicros}
          onViewAll={handleViewAllMicros}
        />
      </View>

      {/* WATER INTAKE */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.waterContainer} onPress={handleLogWater} activeOpacity={0.7}>
          <CircularProgress
            value={today.waterIntakeLiters}
            maxValue={parseFloat(goals?.waterLiters || 2.0)}
            size={100}
            strokeWidth={10}
            color={COLORS.water}
            backgroundColor="#f3f4f6"
          >
            <View style={styles.waterCenter}>
              <Text style={styles.waterValue}>
                {today.waterIntakeLiters.toFixed(1)}
              </Text>
              <Text style={styles.waterUnit}>L</Text>
            </View>
          </CircularProgress>
          <View style={styles.waterInfo}>
            <Text style={styles.waterTitle}>Water Intake</Text>
            <Text style={styles.waterTarget}>
              Goal: {goals?.waterLiters || '2.0'}L
            </Text>
            <Text style={styles.waterPercentage}>
              {Math.round((today.waterIntakeLiters / parseFloat(goals?.waterLiters || 2.0)) * 100)}% complete
            </Text>
            <Text style={styles.waterCta}>💧 Tap to log water</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* MOOD */}
      <View style={styles.section}>
        <MoodChip mood={today.moodLogs} onLogMood={handleLogMood} />
      </View>

      {/* GAMIFICATION */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress & Achievements</Text>
        <View style={styles.gamificationRow}>
          <View style={styles.gamificationItem}>
            <CircularProgress
              value={xpCurrent}
              maxValue={xpTarget}
              size={90}
              strokeWidth={10}
              color={COLORS.xp}
              backgroundColor="#f3f4f6"
            >
              <View style={styles.gamificationCenter}>
                <Text style={styles.gamificationValue}>{gamification.level}</Text>
                <Text style={styles.gamificationUnit}>LVL</Text>
              </View>
            </CircularProgress>
            <Text style={styles.gamificationLabel}>Level {gamification.level}</Text>
            <Text style={styles.gamificationSub}>{xpCurrent} / {xpTarget} XP</Text>
          </View>

          <View style={styles.gamificationItem}>
            <View style={styles.streakBadge}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakValue}>{gamification.streak}</Text>
            </View>
            <Text style={styles.gamificationLabel}>Day Streak</Text>
            <Text style={styles.gamificationSub}>
              {gamification.streak > 0 ? 'Keep it up!' : 'Start today!'}
            </Text>
          </View>
        </View>
      </View>

      {/* WEEKLY TRENDS */}
      {trends.weeklyAverages && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Trends</Text>
          <StatCard
            label="Average Calories"
            value={`${Math.round(trends.weeklyAverages.avgCalories)} kcal/day`}
            subtitle={`P: ${Math.round(trends.weeklyAverages.avgProtein)}g · C: ${Math.round(trends.weeklyAverages.avgCarbs)}g · F: ${Math.round(trends.weeklyAverages.avgFats)}g`}
            icon="📊"
            color={COLORS.calories}
          />
          {trends.currentStreak > 0 && (
            <StatCard
              label="Consistency Streak"
              value={`${trends.currentStreak} days`}
              subtitle="Great job staying consistent!"
              icon="🔥"
              color={COLORS.streak}
            />
          )}
        </View>
      )}

      {/* RECENT WEIGHT */}
      {recentWeight.length > 0 && (
        <View style={styles.section}>
          <StatCard
            label="Recent Weight"
            value={`${recentWeight[0].weightKg} kg`}
            subtitle={`Recorded ${new Date(recentWeight[0].recordedDate).toLocaleDateString()}`}
            icon="⚖️"
            color="#6b7280"
          />
        </View>
      )}

      {/* RECENT MEALS */}
      {today.foodLogs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Meals</Text>
          {today.foodLogs.slice(0, 3).map((log) => (
            <View key={log.id} style={styles.mealItem}>
              <View style={styles.mealDot} />
              <View style={styles.mealContent}>
                <Text style={styles.mealName}>{log.foodName}</Text>
                <Text style={styles.mealMeta}>
                  {log.mealType} · {log.calories} kcal
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>

      {/* Modals */}
      <MoodLogger
        visible={moodModalVisible}
        onClose={() => setMoodModalVisible(false)}
        onSuccess={handleMoodSuccess}
      />

      <WaterLogger
        visible={waterModalVisible}
        onClose={() => setWaterModalVisible(false)}
        onSuccess={handleWaterSuccess}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
    paddingVertical: 12,
  },
  calorieCenter: {
    alignItems: 'center',
  },
  calorieValue: {
    fontSize: 42,
    fontWeight: '700',
    color: '#1f2937',
  },
  calorieUnit: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: -4,
  },
  calorieTarget: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },
  weeklyContext: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 12,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  waterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  waterCenter: {
    alignItems: 'center',
  },
  waterValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  waterUnit: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  waterInfo: {
    flex: 1,
    marginLeft: 20,
  },
  waterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  waterTarget: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  waterPercentage: {
    fontSize: 12,
    color: '#9ca3af',
  },
  waterCta: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
    marginTop: 8,
  },
  gamificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  gamificationItem: {
    alignItems: 'center',
  },
  gamificationCenter: {
    alignItems: 'center',
  },
  gamificationValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  gamificationUnit: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  gamificationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  gamificationSub: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  streakBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#fff3e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#f97316',
  },
  streakIcon: {
    fontSize: 32,
  },
  streakValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f97316',
    marginTop: 4,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  mealDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 12,
  },
  mealContent: {
    flex: 1,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  mealMeta: {
    fontSize: 13,
    color: '#6b7280',
  },
});
