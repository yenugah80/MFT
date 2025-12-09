import { View, ScrollView, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import SafeScreen from "../../components/SafeScreen";
import MetricCard from "../../components/MetricCard";
import useProfileForm from "../../hooks/useProfileForm";
import useHealthMetrics from "../../hooks/useHealthMetrics";
import useActivityLevels from "../../hooks/useActivityLevels";
import { dashboardStyles } from "../../assets/styles/dashboard.styles";

export default function DashboardScreen() {
  const { user } = useUser();
  const router = useRouter();
  const { state } = useProfileForm(user);
  const { levels } = useActivityLevels();
  const { bmi, bmr, tdee } = useHealthMetrics(state.draft.basics, levels || []);

  const profile = state.draft;

  return (
    <SafeScreen>
      <ScrollView 
        style={dashboardStyles.container}
        contentContainerStyle={dashboardStyles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={dashboardStyles.header}>Dashboard</Text>

        {/* WELCOME CARD */}
        <View style={dashboardStyles.card}>
          <Text style={dashboardStyles.cardTitle}>Welcome back!</Text>
          <Text style={dashboardStyles.text}>{profile.basics.fullName || "User"}</Text>
          <Text style={dashboardStyles.subText}>
            {profile.basics.age && profile.basics.gender 
              ? `${profile.basics.age} years · ${profile.basics.gender}` 
              : "Complete your profile to see personalized insights"}
          </Text>
        </View>

        {/* HEALTH METRICS */}
        <Text style={[dashboardStyles.cardTitle, { marginBottom: 12 }]}>Health Metrics</Text>
        <View style={dashboardStyles.row}>
          <MetricCard label="BMI" value={bmi?.toFixed(1)} />
          <MetricCard label="BMR" value={bmr} unit="kcal" />
          <MetricCard label="TDEE" value={tdee} unit="kcal" />
        </View>

        {/* BODY STATS */}
        <View style={dashboardStyles.card}>
          <Text style={dashboardStyles.cardTitle}>Body Stats</Text>
          <Text style={dashboardStyles.text}>
            Weight: {profile.basics.weightKg || "—"} kg · Height: {profile.basics.heightCm || "—"} cm
          </Text>
          <Text style={dashboardStyles.subText}>
            Activity: {levels?.find(l => l.key === profile.basics.activityLevel)?.label || "Not set"}
          </Text>
        </View>

        {/* DIETARY PREFERENCES */}
        <View style={dashboardStyles.card}>
          <Text style={dashboardStyles.cardTitle}>Dietary Preferences</Text>
          {profile.dietary.preferences.length > 0 ? (
            <View style={dashboardStyles.tagRow}>
              {profile.dietary.preferences.slice(0, 5).map((item) => (
                <View key={item} style={dashboardStyles.tag}>
                  <Text style={dashboardStyles.tagText}>{item}</Text>
                </View>
              ))}
              {profile.dietary.preferences.length > 5 && (
                <View style={dashboardStyles.tag}>
                  <Text style={dashboardStyles.tagText}>+{profile.dietary.preferences.length - 5}</Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={dashboardStyles.emptyText}>No preferences set</Text>
          )}
          {profile.dietary.allergies.length > 0 && (
            <>
              <Text style={[dashboardStyles.subText, { marginTop: 8 }]}>
                Allergies: {profile.dietary.allergies.join(", ")}
              </Text>
            </>
          )}
        </View>

        {/* NUTRITION GOALS */}
        <View style={dashboardStyles.card}>
          <Text style={dashboardStyles.cardTitle}>Nutrition Goals</Text>
          <Text style={dashboardStyles.text}>
            Goal: {profile.goals.primaryGoal === "lose" ? "Lose Weight" : 
                   profile.goals.primaryGoal === "gain" ? "Gain Muscle" : "Maintain"}
          </Text>
          {profile.goals.calories && (
            <Text style={dashboardStyles.text}>{profile.goals.calories} kcal/day</Text>
          )}
          {(profile.goals.protein || profile.goals.carbs || profile.goals.fats) && (
            <Text style={dashboardStyles.subText}>
              P: {profile.goals.protein || 0}g · C: {profile.goals.carbs || 0}g · F: {profile.goals.fats || 0}g
            </Text>
          )}
        </View>

        {/* GAMIFICATION */}
        <View style={dashboardStyles.card}>
          <Text style={dashboardStyles.cardTitle}>Progress & Achievements</Text>
          <Text style={dashboardStyles.text}>Level {profile.gamification.level}</Text>
          <Text style={dashboardStyles.subText}>
            {profile.gamification.xp} XP · {profile.gamification.streak} day streak
          </Text>
          <View style={dashboardStyles.progressBar}>
            <View
              style={[
                dashboardStyles.progressFill,
                { width: `${Math.min(100, ((profile.gamification.xp % 1000) / 1000) * 100)}%` },
              ]}
            />
          </View>
          <Text style={[dashboardStyles.subText, { marginTop: 4 }]}>
            {profile.gamification.xp % 1000} / 1000 XP to next level
          </Text>
          {profile.gamification.badges.length > 0 && (
            <View style={dashboardStyles.tagRow}>
              {profile.gamification.badges.slice(0, 3).map((badge) => (
                <View key={badge} style={dashboardStyles.tag}>
                  <Text style={dashboardStyles.tagText}>{badge}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeScreen>
  );
}
