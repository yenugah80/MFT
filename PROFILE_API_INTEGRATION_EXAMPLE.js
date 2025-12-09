// EXAMPLE INTEGRATION - Add these changes to your profile.jsx

// At the top of the file, add import:
import {
  fetchUserProfile,
  saveProfileBasics,
  saveDietaryPreferences,
  saveNutritionGoals,
  saveGamificationStats,
} from "../../services/profileAPI";

// Inside ProfileScreen component, add state for loading:
const [loading, setLoading] = useState(false);

// Add this effect to load profile from database on component mount:
useEffect(() => {
  const loadProfileFromDB = async () => {
    try {
      if (!user?.id) return;
      setLoading(true);
      const profileData = await fetchUserProfile(user.id);
      
      if (profileData.basics) {
        setSavedProfile((prev) => ({
          ...prev,
          basics: profileData.basics,
        }));
      }
      if (profileData.dietary) {
        setSavedProfile((prev) => ({
          ...prev,
          dietary: profileData.dietary,
        }));
      }
      if (profileData.goals) {
        setSavedProfile((prev) => ({
          ...prev,
          goals: profileData.goals,
        }));
      }
      if (profileData.gamification) {
        setSavedProfile((prev) => ({
          ...prev,
          gamification: profileData.gamification,
        }));
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      Alert.alert("Error", "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  loadProfileFromDB();
}, [user?.id]);

// Update the handleSaveSection function to persist to database:
const handleSaveSection = async (section) => {
  if (section === "basics" && (!draft.basics.fullName || !draft.basics.email)) {
    Alert.alert("Missing info", "Please fill in your name and email before saving.");
    return;
  }

  try {
    setLoading(true);
    const userId = user?.id;

    if (section === "basics") {
      await saveProfileBasics(userId, draft.basics);
    } else if (section === "dietary") {
      await saveDietaryPreferences(userId, draft.dietary);
    } else if (section === "goals") {
      await saveNutritionGoals(userId, {
        primaryGoal: draft.goals.primaryGoal,
        dailyCalories: draft.goals.calories,
        proteinG: draft.goals.protein,
        carbsG: draft.goals.carbs,
        fatsG: draft.goals.fats,
        waterLiters: draft.goals.water,
      });
    } else if (section === "gamification") {
      await saveGamificationStats(userId, draft.gamification);
    }

    // Update local saved state
    setSavedProfile((prev) => ({ ...prev, [section]: clone(draft[section]) }));
    setEditing((prev) => ({ ...prev, [section]: false }));
    Alert.alert("Success", `${sectionLabels[section]} updated and saved to database.`);
  } catch (error) {
    console.error("Error saving section:", error);
    Alert.alert("Error", `Failed to save ${sectionLabels[section]}`);
  } finally {
    setLoading(false);
  }
};

// Add loading indicator while saving:
// Wrap the ScrollView with a condition:
{
  loading ? (
    <SafeScreen>
      <LoadingSpinner /> {/* Use your existing LoadingSpinner component */}
    </SafeScreen>
  ) : (
    <SafeScreen>
      <ScrollView style={profileStyles.container} keyboardShouldPersistTaps="handled">
        {/* ... rest of your JSX ... */}
      </ScrollView>
    </SafeScreen>
  )
}
