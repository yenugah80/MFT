import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Dimensions,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, G, Text as SvgText } from "react-native-svg";
import SafeScreen from "../../components/SafeScreen";
import {
  BRAND,
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from "../../constants/premiumTheme";
import apiClient from "../../services/apiClient";
import {
  ACTIVITY_LEVELS as ONBOARDING_ACTIVITY_LEVELS,
  GENDERS,
  GOALS as ONBOARDING_GOALS,
} from "../../constants/onboardingConfig";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ============================================================================
// CONSTANTS - Extended from onboarding config
// ============================================================================

const ACTIVITY_ICONS = {
  sedentary: "bed-outline",
  lightly_active: "walk-outline",
  moderate: "bicycle-outline",
  very_active: "fitness-outline",
  extremely_active: "trophy-outline",
};

const ACTIVITY_LEVELS = ONBOARDING_ACTIVITY_LEVELS.map((level) => ({
  ...level,
  icon: ACTIVITY_ICONS[level.id] || "body-outline",
}));

const GENDER_ICONS = { male: "male", female: "female", other: "person" };
const GENDER_OPTIONS = GENDERS.map((g) => ({ ...g, icon: GENDER_ICONS[g.id] || "person" }));

const GOAL_CONFIG = {
  lose: { icon: "trending-down", color: "#3B82F6", label: "Lose Weight" },
  maintain: { icon: "remove", color: "#10B981", label: "Maintain" },
  gain: { icon: "trending-up", color: "#F59E0B", label: "Gain Weight" },
};

// BMI Categories with ranges and colors
const BMI_ZONES = [
  { min: 0, max: 18.5, label: "Underweight", color: "#3B82F6", advice: "Consider gaining some healthy weight" },
  { min: 18.5, max: 25, label: "Normal", color: "#10B981", advice: "Great job! Maintain your healthy weight" },
  { min: 25, max: 30, label: "Overweight", color: "#F59E0B", advice: "Small changes can make a big difference" },
  { min: 30, max: 100, label: "Obese", color: "#EF4444", advice: "Focus on gradual, sustainable changes" },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const calculateBMI = (weightKg, heightCm) => {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  return parseFloat((weightKg / (heightM * heightM)).toFixed(1));
};

const getBMIZone = (bmi) => {
  if (!bmi) return BMI_ZONES[1]; // Default to normal
  return BMI_ZONES.find(z => bmi >= z.min && bmi < z.max) || BMI_ZONES[3];
};

const calculateTDEE = (weightKg, heightCm, age, gender, activityLevel) => {
  if (!weightKg || !heightCm || !age) return null;
  let bmr = gender === "female"
    ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
    : 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const factor = ACTIVITY_LEVELS.find(a => a.id === activityLevel)?.factor || 1.2;
  return Math.round(bmr * factor);
};

const getIdealWeightRange = (heightCm, gender) => {
  if (!heightCm) return null;
  const heightM = heightCm / 100;
  // BMI 18.5-25 range
  const minWeight = Math.round(18.5 * heightM * heightM);
  const maxWeight = Math.round(24.9 * heightM * heightM);
  return { min: minWeight, max: maxWeight };
};

const getLifecycleStage = (profile, gamification) => {
  // profile is the full API response: { basics, goals, gamification, onboardingCompletedAt }
  if (!profile?.onboardingCompletedAt) return { stage: "new", label: "Getting Started", color: "#8B5CF6", icon: "sparkles" };
  const daysSinceJoin = Math.floor((Date.now() - new Date(profile.onboardingCompletedAt).getTime()) / (1000 * 60 * 60 * 24));
  const totalMeals = gamification?.totalMealsLogged || 0;
  const streak = gamification?.streak || 0;
  const level = gamification?.level || 1;

  if (level >= 25 && totalMeals >= 500) return { stage: "legend", label: "Legend", color: "#EF4444", icon: "star" };
  if (streak >= 30 || level >= 10) return { stage: "power_user", label: "Power User", color: "#F59E0B", icon: "flash" };
  if (streak >= 7 && totalMeals >= 50) return { stage: "Committed", label: "Committed", color: "#10B981", icon: "heart" };
  if (daysSinceJoin < 30) return { stage: "exploring", label: "Explorer", color: "#3B82F6", icon: "compass" };
  return { stage: "active", label: "Active", color: "#10B981", icon: "checkmark-circle" };
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// BMI Gauge Component
const BMIGauge = ({ bmi, size = 160 }) => {
  const zone = getBMIZone(bmi);
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // BMI ranges from ~15 to ~40 for visual purposes
  const minBMI = 15;
  const maxBMI = 40;
  const normalizedBMI = bmi ? Math.min(Math.max(bmi, minBMI), maxBMI) : 22;
  const progress = (normalizedBMI - minBMI) / (maxBMI - minBMI);
  const strokeDashoffset = circumference * (1 - progress * 0.75); // 75% arc

  return (
    <View style={styles.gaugeContainer}>
      <Svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.7}`}>
        <G rotation="-225" origin={`${size/2}, ${size/2}`}>
          {/* Background arc */}
          <Circle
            cx={size/2}
            cy={size/2}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference * 0.75} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <Circle
            cx={size/2}
            cy={size/2}
            r={radius}
            stroke={zone.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference * 0.75} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={styles.gaugeCenter}>
        <Text style={[styles.gaugeValue, { color: zone.color }]}>{bmi || "—"}</Text>
        <Text style={styles.gaugeLabel}>BMI</Text>
      </View>
    </View>
  );
};

// Stat Card
const StatCard = ({ icon, label, value, unit, color = TEXT.secondary, small = false }) => (
  <View style={[styles.statCard, small && styles.statCardSmall]}>
    <Ionicons name={icon} size={small ? 18 : 22} color={color} />
    <Text style={[styles.statValue, small && styles.statValueSmall]}>{value || "—"}</Text>
    {unit && <Text style={styles.statUnit}>{unit}</Text>}
    <Text style={[styles.statLabel, small && styles.statLabelSmall]}>{label}</Text>
  </View>
);

// Editable Metric Row
const EditableMetric = ({ icon, label, value, unit, onSave, keyboardType = "numeric" }) => {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value?.toString() || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTempValue(value?.toString() || "");
  }, [value]);

  const handleSave = async () => {
    setEditing(false);
    const newValue = tempValue ? parseFloat(tempValue) : null;
    if (newValue !== value && newValue !== null) {
      setIsSaving(true);
      try {
        await onSave(newValue);
        console.log(`[EditableMetric] Saved ${label}: ${newValue}`);
      } catch (error) {
        console.error(`[EditableMetric] Failed to save ${label}:`, error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const displayValue = value != null ? value : null;
  const hasValue = displayValue != null;

  return (
    <TouchableOpacity
      style={styles.metricRow}
      onPress={() => setEditing(true)}
      activeOpacity={0.7}
    >
      <View style={styles.metricLeft}>
        <View style={styles.metricIconBg}>
          <Ionicons name={icon} size={18} color={BRAND.primary} />
        </View>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      {editing ? (
        <View style={styles.metricEditContainer}>
          <TextInput
            style={styles.metricInput}
            value={tempValue}
            onChangeText={setTempValue}
            keyboardType={keyboardType}
            autoFocus
            onBlur={handleSave}
            onSubmitEditing={handleSave}
            selectTextOnFocus
            placeholder="Enter value"
          />
          {unit && <Text style={styles.metricUnit}>{unit}</Text>}
        </View>
      ) : (
        <View style={styles.metricRight}>
          {isSaving ? (
            <ActivityIndicator size="small" color={BRAND.primary} />
          ) : (
            <>
              <Text style={[styles.metricValue, !hasValue && styles.metricValueEmpty]}>
                {hasValue ? displayValue : "Tap to set"}
              </Text>
              {unit && hasValue && <Text style={styles.metricUnit}>{unit}</Text>}
              <Ionicons name="chevron-forward" size={16} color={TEXT.muted} />
            </>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// Selection Chip
const SelectionChip = ({ label, selected, onPress, icon, color }) => (
  <TouchableOpacity
    style={[styles.chip, selected && { backgroundColor: `${color || BRAND.primary}15`, borderColor: color || BRAND.primary }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {icon && <Ionicons name={icon} size={16} color={selected ? (color || BRAND.primary) : TEXT.tertiary} />}
    <Text style={[styles.chipText, selected && { color: color || BRAND.primary, fontWeight: "600" }]}>{label}</Text>
  </TouchableOpacity>
);

// Section Header
const SectionHeader = ({ title, icon, action }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionHeaderLeft}>
      {icon && <Ionicons name={icon} size={20} color={BRAND.primary} style={{ marginRight: 8 }} />}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {action}
  </View>
);

// Insight Card
const InsightCard = ({ icon, title, message, color }) => (
  <View style={[styles.insightCard, { borderLeftColor: color }]}>
    <Ionicons name={icon} size={20} color={color} />
    <View style={styles.insightContent}>
      <Text style={styles.insightTitle}>{title}</Text>
      <Text style={styles.insightMessage}>{message}</Text>
    </View>
  </View>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BodyMetricsScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("");
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-20)).current;

  const [profile, setProfile] = useState(null);
  const [gamification, setGamification] = useState(null);

  const [weight, setWeight] = useState(null);
  const [height, setHeight] = useState(null);
  const [age, setAge] = useState(null);
  const [gender, setGender] = useState(null);
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [primaryGoal, setPrimaryGoal] = useState("maintain");

  // Weight history
  const [weightHistory, setWeightHistory] = useState([]);
  const [weightTrend, setWeightTrend] = useState('stable');
  const [weightChangeKg, setWeightChangeKg] = useState(0);
  const [weightHistoryLoading, setWeightHistoryLoading] = useState(false);
  const [newWeightInput, setNewWeightInput] = useState('');
  const [loggingWeight, setLoggingWeight] = useState(false);

  // Computed values
  const bmi = useMemo(() => calculateBMI(weight, height), [weight, height]);
  const bmiZone = useMemo(() => getBMIZone(bmi), [bmi]);
  const tdee = useMemo(() => calculateTDEE(weight, height, age, gender, activityLevel), [weight, height, age, gender, activityLevel]);
  const idealWeight = useMemo(() => getIdealWeightRange(height, gender), [height, gender]);
  const lifecycle = useMemo(() => getLifecycleStage(profile, gamification), [profile, gamification]);

  // Smart insights based on user data
  const insights = useMemo(() => {
    const list = [];

    if (bmi && idealWeight && weight) {
      if (weight < idealWeight.min) {
        list.push({ icon: "arrow-up-circle", title: "Weight Goal", message: `Gain ${idealWeight.min - weight}kg to reach healthy range`, color: "#3B82F6" });
      } else if (weight > idealWeight.max) {
        list.push({ icon: "arrow-down-circle", title: "Weight Goal", message: `Lose ${weight - idealWeight.max}kg to reach healthy range`, color: "#F59E0B" });
      } else {
        list.push({ icon: "checkmark-circle", title: "Healthy Weight", message: "You are within the healthy weight range!", color: "#10B981" });
      }
    }

    if (tdee) {
      const goalCalories = primaryGoal === "lose" ? tdee - 500 : primaryGoal === "gain" ? tdee + 300 : tdee;
      list.push({ icon: "flame", title: "Daily Calories", message: `Target ~${goalCalories} kcal/day for your ${primaryGoal === "lose" ? "weight loss" : primaryGoal === "gain" ? "muscle gain" : "maintenance"} goal`, color: "#F97316" });
    }

    return list;
  }, [bmi, idealWeight, weight, tdee, primaryGoal]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [data, wh] = await Promise.all([
        apiClient.get("/profile/me"),
        apiClient.get("/nutrition/weight-history").catch(() => null),
      ]);

      setProfile(data);
      setGamification(data.gamification);
      setWeight(data.basics?.weightKg != null ? parseFloat(data.basics.weightKg) : null);
      setHeight(data.basics?.heightCm != null ? parseInt(data.basics.heightCm, 10) : null);
      setAge(data.basics?.age != null ? parseInt(data.basics.age, 10) : null);
      setGender(data.basics?.gender || null);
      setActivityLevel(data.basics?.activityLevel || "moderate");
      setPrimaryGoal(data.goals?.primaryGoal || "maintain");

      if (wh) {
        setWeightHistory(wh.entries || []);
        setWeightTrend(wh.trend || 'stable');
        setWeightChangeKg(wh.changeKg || 0);
      }
    } catch (error) {
      console.error("[BodyMetrics] Failed to load", error);
      setLoadError("Failed to load your data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logWeight = useCallback(async () => {
    const kg = parseFloat(newWeightInput);
    if (isNaN(kg) || kg < 20 || kg > 499) {
      Alert.alert('Invalid weight', 'Please enter a weight between 20 and 499 kg.');
      return;
    }
    setLoggingWeight(true);
    try {
      const clientEventId = `w-${Date.now()}`;
      await apiClient.post('/nutrition/weight', { weightKg: kg, clientEventId });
      setNewWeightInput('');
      setWeight(kg);
      // Refresh weight history
      setWeightHistoryLoading(true);
      const wh = await apiClient.get('/nutrition/weight-history');
      setWeightHistory(wh.entries || []);
      setWeightTrend(wh.trend || 'stable');
      setWeightChangeKg(wh.changeKg || 0);
      setWeightHistoryLoading(false);
      showSuccessToast('Weight logged!');
    } catch (err) {
      setWeightHistoryLoading(false);
      Alert.alert('Error', err?.message || 'Failed to log weight.');
    } finally {
      setLoggingWeight(false);
    }
  }, [newWeightInput]);

  useEffect(() => { loadData(); }, [loadData]);

  const showSuccessToast = (message) => {
    setSaveSuccessMessage(message);
    setShowSaveSuccess(true);

    // Animate in
    Animated.parallel([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(toastTranslateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    // Animate out after delay
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(toastTranslateY, { toValue: -20, duration: 200, useNativeDriver: true }),
      ]).start(() => setShowSaveSuccess(false));
    }, 2000);
  };

  const saveBasics = async (updates) => {
    setIsSaving(true);
    try {
      console.log("[BodyMetrics] Saving basics:", updates);
      const response = await apiClient.post("/profile/basics", updates);
      console.log("[BodyMetrics] Save response:", response);

      // Update local state on success
      if (updates.weightKg !== undefined) setWeight(updates.weightKg);
      if (updates.heightCm !== undefined) setHeight(updates.heightCm);
      if (updates.age !== undefined) setAge(updates.age);
      if (updates.gender !== undefined) setGender(updates.gender);
      if (updates.activityLevel !== undefined) setActivityLevel(updates.activityLevel);

      // Show success toast
      const fieldName = updates.weightKg !== undefined ? "Weight" :
                        updates.heightCm !== undefined ? "Height" :
                        updates.age !== undefined ? "Age" :
                        updates.gender !== undefined ? "Gender" :
                        updates.activityLevel !== undefined ? "Activity level" : "Profile";
      showSuccessToast(`${fieldName} saved`);

      return response;
    } catch (error) {
      console.error("[BodyMetrics] Save error:", error);
      Alert.alert("Save Failed", "Could not save changes. Please try again.");
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const saveGoal = async (goal) => {
    setIsSaving(true);
    try {
      await apiClient.post("/profile/goals", { primaryGoal: goal });
      setPrimaryGoal(goal);
      showSuccessToast("Goal saved");
    } catch (error) {
      Alert.alert("Save Failed", "Could not save goal.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeScreen>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeScreen>
    );
  }

  if (loadError) {
    return (
      <SafeScreen>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={TEXT.tertiary} />
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={["#8B5CF6", "#7C3AED"]} style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={[styles.lifecycleBadge, { backgroundColor: `${lifecycle.color}30` }]}>
              <Ionicons name={lifecycle.icon} size={14} color="#FFF" />
              <Text style={styles.lifecycleText}>{lifecycle.label}</Text>
            </View>
          </View>
          <Text style={styles.headerTitle}>Body Metrics</Text>
          <Text style={styles.headerSubtitle}>Track your health journey</Text>
        </LinearGradient>

        {/* BMI Hero Section */}
        <View style={styles.heroCard}>
          <BMIGauge bmi={bmi} size={180} />
          <View style={[styles.bmiStatusBadge, { backgroundColor: `${bmiZone.color}15` }]}>
            <Text style={[styles.bmiStatusText, { color: bmiZone.color }]}>{bmiZone.label}</Text>
          </View>
          <Text style={styles.bmiAdvice}>{bmiZone.advice}</Text>

          {/* Quick Stats Row */}
          <View style={styles.quickStats}>
            <StatCard icon="scale-outline" label="Weight" value={weight} unit="kg" small />
            <View style={styles.statDivider} />
            <StatCard icon="resize-outline" label="Height" value={height} unit="cm" small />
            <View style={styles.statDivider} />
            <StatCard icon="flame-outline" label="TDEE" value={tdee} unit="kcal" color="#F97316" small />
          </View>
        </View>

        {/* Smart Insights */}
        {insights.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Insights" icon="bulb-outline" />
            {insights.map((insight, i) => (
              <InsightCard key={i} {...insight} />
            ))}
          </View>
        )}

        {/* Body Measurements */}
        <View style={styles.section}>
          <SectionHeader title="Measurements" icon="body-outline" />
          <View style={styles.card}>
            <EditableMetric icon="scale-outline" label="Weight" value={weight} unit="kg" onSave={(v) => saveBasics({ weightKg: v })} />
            <EditableMetric icon="resize-outline" label="Height" value={height} unit="cm" onSave={(v) => saveBasics({ heightCm: v })} />
            <EditableMetric icon="calendar-outline" label="Age" value={age} unit="years" onSave={(v) => saveBasics({ age: v })} />
          </View>
        </View>

        {/* Gender */}
        <View style={styles.section}>
          <SectionHeader title="Gender" icon="person-outline" />
          <View style={styles.chipsRow}>
            {GENDER_OPTIONS.map((g) => (
              <SelectionChip
                key={g.id}
                label={g.label}
                icon={g.icon}
                selected={gender === g.id}
                onPress={() => saveBasics({ gender: g.id })}
              />
            ))}
          </View>
        </View>

        {/* Activity Level */}
        <View style={styles.section}>
          <SectionHeader title="Activity Level" icon="fitness-outline" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activityScroll}>
            {ACTIVITY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.id}
                style={[styles.activityCard, activityLevel === level.id && styles.activityCardSelected]}
                onPress={() => saveBasics({ activityLevel: level.id })}
              >
                <View style={[styles.activityIconBg, activityLevel === level.id && { backgroundColor: `${BRAND.primary}20` }]}>
                  <Ionicons name={level.icon} size={24} color={activityLevel === level.id ? BRAND.primary : TEXT.tertiary} />
                </View>
                <Text style={[styles.activityLabel, activityLevel === level.id && { color: BRAND.primary }]}>{level.shortLabel}</Text>
                <Text style={styles.activityDesc}>{level.description}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Goal */}
        <View style={styles.section}>
          <SectionHeader title="Your Goal" icon="flag-outline" />
          <View style={styles.goalsRow}>
            {Object.entries(GOAL_CONFIG).map(([id, config]) => (
              <TouchableOpacity
                key={id}
                style={[styles.goalCard, primaryGoal === id && { borderColor: config.color, backgroundColor: `${config.color}10` }]}
                onPress={() => saveGoal(id)}
              >
                <Ionicons name={config.icon} size={28} color={primaryGoal === id ? config.color : TEXT.tertiary} />
                <Text style={[styles.goalLabel, primaryGoal === id && { color: config.color }]}>{config.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Weight History */}
        <View style={styles.section}>
          <SectionHeader title="Weight History" icon="scale-outline" />
          <View style={styles.card}>
            {/* Quick log row */}
            <View style={styles.weightLogRow}>
              <TextInput
                style={styles.weightLogInput}
                placeholder="Log today's weight (kg)"
                placeholderTextColor={TEXT.tertiary}
                keyboardType="decimal-pad"
                value={newWeightInput}
                onChangeText={setNewWeightInput}
                returnKeyType="done"
                onSubmitEditing={logWeight}
              />
              <TouchableOpacity
                style={[styles.weightLogBtn, loggingWeight && { opacity: 0.6 }]}
                onPress={logWeight}
                disabled={loggingWeight}
              >
                {loggingWeight
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Ionicons name="add" size={20} color="#FFF" />}
              </TouchableOpacity>
            </View>

            {/* Trend indicator */}
            {weightHistory.length > 1 && (
              <View style={styles.weightTrendRow}>
                <Ionicons
                  name={weightTrend === 'gaining' ? 'trending-up' : weightTrend === 'losing' ? 'trending-down' : 'remove'}
                  size={16}
                  color={weightTrend === 'gaining' ? '#F59E0B' : weightTrend === 'losing' ? '#3B82F6' : '#10B981'}
                />
                <Text style={styles.weightTrendText}>
                  {weightTrend === 'stable'
                    ? 'Stable'
                    : `${weightChangeKg > 0 ? '+' : ''}${(weightChangeKg || 0).toFixed(1)} kg trend`}
                </Text>
              </View>
            )}

            {/* Last 7 entries */}
            {weightHistoryLoading ? (
              <ActivityIndicator style={{ margin: 16 }} color={BRAND.primary} />
            ) : weightHistory.length === 0 ? (
              <View style={styles.weightEmptyState}>
                <Ionicons name="scale-outline" size={32} color={TEXT.tertiary} />
                <Text style={styles.weightEmptyText}>No entries yet. Log your weight above.</Text>
              </View>
            ) : (
              // Show newest 7 entries; backend returns oldest-first so we reverse
              [...weightHistory].reverse().slice(0, 7).map((entry, i, arr) => {
                const prev = arr[i + 1]; // prev in display order = older
                const delta = prev ? parseFloat(entry.weightKg) - parseFloat(prev.weightKg) : 0;
                const date = new Date(entry.recordedDate || entry.createdAt);
                const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return (
                  <View key={entry.id || i} style={[styles.weightEntryRow, i > 0 && styles.weightEntryBorder]}>
                    <Text style={styles.weightEntryDate}>{label}</Text>
                    <Text style={styles.weightEntryKg}>{parseFloat(entry.weightKg).toFixed(1)} kg</Text>
                    {delta !== 0 && (
                      <Text style={[styles.weightEntryDelta, { color: delta > 0 ? '#F59E0B' : '#3B82F6' }]}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                      </Text>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Journey Stats */}
        <View style={styles.section}>
          <SectionHeader title="Your Journey" icon="trophy-outline" />
          <View style={styles.journeyCard}>
            <View style={styles.journeyStat}>
              <Text style={styles.journeyValue}>{gamification?.totalMealsLogged || 0}</Text>
              <Text style={styles.journeyLabel}>Meals</Text>
            </View>
            <View style={styles.journeyDivider} />
            <View style={styles.journeyStat}>
              <Text style={styles.journeyValue}>{gamification?.streak || 0}</Text>
              <Text style={styles.journeyLabel}>Day Streak</Text>
            </View>
            <View style={styles.journeyDivider} />
            <View style={styles.journeyStat}>
              <Text style={styles.journeyValue}>Lv.{gamification?.level || 1}</Text>
              <Text style={styles.journeyLabel}>Level</Text>
            </View>
          </View>
        </View>

        {/* Saving Indicator */}
        {isSaving && (
          <View style={styles.savingBanner}>
            <ActivityIndicator size="small" color={BRAND.primary} />
            <Text style={styles.savingText}>Saving...</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Success Toast */}
      {showSaveSuccess && (
        <Animated.View
          style={[
            styles.successToast,
            { opacity: toastOpacity, transform: [{ translateY: toastTranslateY }] },
          ]}
        >
          <View style={styles.successToastContent}>
            <View style={styles.successIconBg}>
              <Ionicons name="checkmark" size={16} color="#FFF" />
            </View>
            <Text style={styles.successToastText}>{saveSuccessMessage}</Text>
          </View>
        </Animated.View>
      )}
    </SafeScreen>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: TYPOGRAPHY.family.regular, color: TEXT.secondary },
  errorText: { fontSize: 14, fontFamily: TYPOGRAPHY.family.regular, color: TEXT.secondary, textAlign: "center" },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: BRAND.primary, borderRadius: 8 },
  retryText: { color: "#FFF", fontFamily: TYPOGRAPHY.family.semibold },

  // Header
  header: { paddingTop: 8, paddingBottom: 24, paddingHorizontal: 20 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  lifecycleBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  lifecycleText: { fontSize: 12, fontFamily: TYPOGRAPHY.family.semibold, color: "#FFF" },
  headerTitle: { fontSize: 28, fontFamily: TYPOGRAPHY.family.bold, color: "#FFF" },
  headerSubtitle: { fontSize: 14, fontFamily: TYPOGRAPHY.family.regular, color: "rgba(255,255,255,0.8)", marginTop: 4 },

  // Hero Card
  heroCard: { backgroundColor: "#FFF", marginHorizontal: 16, marginTop: -12, borderRadius: 20, padding: 20, alignItems: "center", ...SHADOWS.md },
  gaugeContainer: { alignItems: "center", justifyContent: "center", marginBottom: 8 },
  gaugeCenter: { position: "absolute", alignItems: "center", top: 50 },
  gaugeValue: { fontSize: 36, fontFamily: TYPOGRAPHY.family.bold },
  gaugeLabel: { fontSize: 12, fontFamily: TYPOGRAPHY.family.regular, color: TEXT.tertiary, marginTop: -4 },
  bmiStatusBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 8 },
  bmiStatusText: { fontSize: 14, fontFamily: TYPOGRAPHY.family.semibold },
  bmiAdvice: { fontSize: 13, fontFamily: TYPOGRAPHY.family.regular, color: TEXT.secondary, textAlign: "center", marginTop: 8 },
  quickStats: { flexDirection: "row", alignItems: "center", marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#F1F5F9", width: "100%" },
  statCard: { flex: 1, alignItems: "center" },
  statCardSmall: {},
  statValue: { fontSize: 20, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary, marginTop: 4 },
  statValueSmall: { fontSize: 18, fontFamily: TYPOGRAPHY.family.bold },
  statUnit: { fontSize: 10, fontFamily: TYPOGRAPHY.family.regular, color: TEXT.tertiary },
  statLabel: { fontSize: 11, fontFamily: TYPOGRAPHY.family.regular, color: TEXT.secondary, marginTop: 2 },
  statLabelSmall: { fontSize: 10 },
  statDivider: { width: 1, height: 40, backgroundColor: "#E5E7EB" },

  // Section
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: TEXT.primary },

  // Card
  card: { backgroundColor: "#FFF", borderRadius: 16, overflow: "hidden", ...SHADOWS.sm },

  // Metric Row
  metricRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  metricLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  metricIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: `${BRAND.primary}10`, alignItems: "center", justifyContent: "center" },
  metricLabel: { fontSize: 15, color: TEXT.primary, fontWeight: "500" },
  metricRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  metricValue: { fontSize: 15, fontWeight: "600", color: TEXT.primary },
  metricValueEmpty: { color: TEXT.tertiary, fontStyle: "italic" },
  metricUnit: { fontSize: 13, color: TEXT.tertiary },
  metricEditContainer: { flexDirection: "row", alignItems: "center" },
  metricInput: { fontSize: 15, fontWeight: "600", color: TEXT.primary, borderBottomWidth: 2, borderBottomColor: BRAND.primary, paddingVertical: 4, minWidth: 50, textAlign: "right" },

  // Weight history
  weightLogRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  weightLogInput: { flex: 1, fontSize: 15, fontFamily: TYPOGRAPHY.family.regular, color: TEXT.primary, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  weightLogBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: BRAND.primary, alignItems: 'center', justifyContent: 'center' },
  weightTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  weightTrendText: { fontSize: 13, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.secondary },
  weightEmptyState: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  weightEmptyText: { fontSize: 13, color: TEXT.tertiary, textAlign: 'center' },
  weightEntryRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  weightEntryBorder: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  weightEntryDate: { flex: 1, fontSize: 14, color: TEXT.secondary },
  weightEntryKg: { fontSize: 15, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.primary },
  weightEntryDelta: { fontSize: 13, fontFamily: TYPOGRAPHY.family.semibold, marginLeft: 8, minWidth: 36, textAlign: 'right' },

  // Chips
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: "#FFF", borderWidth: 1.5, borderColor: "#E5E7EB" },
  chipText: { fontSize: 14, color: TEXT.secondary },

  // Activity Cards
  activityScroll: { marginHorizontal: -16, paddingHorizontal: 16 },
  activityCard: { width: 100, padding: 12, borderRadius: 16, backgroundColor: "#FFF", marginRight: 10, alignItems: "center", borderWidth: 2, borderColor: "transparent", ...SHADOWS.sm },
  activityCardSelected: { borderColor: BRAND.primary, backgroundColor: `${BRAND.primary}05` },
  activityIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  activityLabel: { fontSize: 13, fontWeight: "600", color: TEXT.primary, textAlign: "center" },
  activityDesc: { fontSize: 10, color: TEXT.tertiary, textAlign: "center", marginTop: 2 },

  // Goals
  goalsRow: { flexDirection: "row", gap: 10 },
  goalCard: { flex: 1, padding: 16, borderRadius: 16, backgroundColor: "#FFF", alignItems: "center", borderWidth: 2, borderColor: "transparent", ...SHADOWS.sm },
  goalLabel: { fontSize: 12, fontWeight: "600", color: TEXT.secondary, marginTop: 8, textAlign: "center" },

  // Insights
  insightCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, backgroundColor: "#FFF", borderRadius: 12, marginBottom: 10, borderLeftWidth: 4, ...SHADOWS.sm },
  insightContent: { flex: 1 },
  insightTitle: { fontSize: 14, fontWeight: "600", color: TEXT.primary },
  insightMessage: { fontSize: 13, color: TEXT.secondary, marginTop: 2 },

  // Journey
  journeyCard: { flexDirection: "row", backgroundColor: "#FFF", borderRadius: 16, padding: 20, ...SHADOWS.sm },
  journeyStat: { flex: 1, alignItems: "center" },
  journeyValue: { fontSize: 24, fontWeight: "700", color: TEXT.primary },
  journeyLabel: { fontSize: 12, color: TEXT.tertiary, marginTop: 4 },
  journeyDivider: { width: 1, backgroundColor: "#E5E7EB" },

  // Saving
  savingBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, backgroundColor: `${BRAND.primary}10`, marginHorizontal: 16, borderRadius: 12, marginTop: 16 },
  savingText: { fontSize: 14, color: BRAND.primary, fontWeight: "500" },

  // Success Toast
  successToast: { position: "absolute", top: 60, left: 16, right: 16, zIndex: 1000 },
  successToastContent: { flexDirection: "row", alignItems: "center", gap: 10, ...SHADOWS.md, backgroundColor: "#10B981", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  successIconBg: { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  successToastText: { fontSize: 14, fontWeight: "600", color: "#FFF" },
});
