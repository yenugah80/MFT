import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, TextInput } from "react-native";
import { useState } from "react";
import { useUser, useClerk } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import SafeScreen from "../../components/SafeScreen";
import { profileStyles } from "../../assets/styles/profile.styles";
import useProfileForm from "../../hooks/useProfileForm";
import EditProfileModal from "../../components/EditProfileModal";
import EditableSection from "../../components/EditableSection";
import TagInput from "../../components/TagInput";
import { DIETARY_PRESETS, PRIMARY_GOAL_OPTIONS } from "../../constants/profileConfig";
import { COLORS } from "../../constants/colors";

/**
 * ProfileScreen - Simple account information screen
 * Health metrics, goals, and preferences moved to Dashboard
 */
export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { state, updateField, toggleEdit, saveSection, cancelEdit } = useProfileForm(user);

  const profile = state.draft;
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const formData = profile.basics;

  const openEditModal = () => setIsEditModalVisible(true);
  const closeEditModal = () => setIsEditModalVisible(false);

  const updateFormField = (field, value) => updateField("basics", field, value);

  const handleSaveProfile = async () => {
    setIsUpdating(true);
    const ok = await saveSection("basics");
    if (ok) closeEditModal();
    setIsUpdating(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  // Helper for Dietary Preferences
  const togglePreference = (pref) => {
    const current = profile.dietary.preferences || [];
    const updated = current.includes(pref)
      ? current.filter(p => p !== pref)
      : [...current, pref];
    updateField("dietary", "preferences", updated);
  };

  const addAllergy = (tag) => {
    const current = profile.dietary.allergies || [];
    if (!current.includes(tag)) {
      updateField("dietary", "allergies", [...current, tag]);
    }
  };

  const removeAllergy = (tag) => {
    const current = profile.dietary.allergies || [];
    updateField("dietary", "allergies", current.filter(t => t !== tag));
  };

  return (
    <SafeScreen>
      <ScrollView style={profileStyles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={profileStyles.headerText}>Profile</Text>

        {/* USER INFO CARD */}
        <View style={profileStyles.sectionCard}>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            {user?.imageUrl ? (
              <Image
                source={{ uri: user.imageUrl }}
                style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 12 }}
              />
            ) : (
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#E0BFB8", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Ionicons name="person" size={40} color="#FFFFFF" />
              </View>
            )}
            <Text style={[profileStyles.sectionTitle, { textAlign: "center" }]}>
              {profile?.basics?.fullName || user?.fullName || "User"}
            </Text>
            <Text style={[profileStyles.metaText, { textAlign: "center" }]}>
              {user?.primaryEmailAddress?.emailAddress || ""}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[profileStyles.primaryButton, { alignSelf: 'center', paddingHorizontal: 24 }]} 
            onPress={openEditModal}
          >
            <Text style={profileStyles.primaryButtonText}>Edit Personal Info</Text>
          </TouchableOpacity>
        </View>

        {/* DIETARY PREFERENCES SECTION */}
        <EditableSection
          title="Dietary Preferences"
          isEditing={state.editing.dietary}
          onToggleEdit={() => toggleEdit("dietary")}
          onSave={() => saveSection("dietary")}
          onCancel={() => cancelEdit("dietary")}
          isSaving={state.status === 'saving'}
        >
          {state.editing.dietary ? (
            <View>
              <Text style={profileStyles.inputLabel}>Diet Type</Text>
              <View style={profileStyles.chipRow}>
                {DIETARY_PRESETS.map((pref) => {
                  const isSelected = profile.dietary.preferences?.includes(pref);
                  return (
                    <TouchableOpacity
                      key={pref}
                      style={[profileStyles.chip, isSelected && profileStyles.chipSelected]}
                      onPress={() => togglePreference(pref)}
                    >
                      <Text style={[profileStyles.chipText, isSelected && profileStyles.chipTextSelected]}>
                        {pref}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[profileStyles.inputLabel, { marginTop: 12 }]}>Allergies & Restrictions</Text>
              <TagInput
                tags={profile.dietary.allergies || []}
                onAdd={addAllergy}
                onRemove={removeAllergy}
                placeholder="Add allergy (e.g. Peanuts)"
                variant="danger"
              />
            </View>
          ) : (
            <View>
              <Text style={profileStyles.inputLabel}>Diet Type</Text>
              <View style={profileStyles.chipRow}>
                {profile.dietary.preferences?.length > 0 ? (
                  profile.dietary.preferences.map((pref) => (
                    <View key={pref} style={profileStyles.chip}>
                      <Text style={profileStyles.chipText}>{pref}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={profileStyles.mutedText}>No preferences set</Text>
                )}
              </View>

              <Text style={[profileStyles.inputLabel, { marginTop: 12 }]}>Allergies</Text>
              <View style={profileStyles.chipRow}>
                {profile.dietary.allergies?.length > 0 ? (
                  profile.dietary.allergies.map((tag) => (
                    <View key={tag} style={[profileStyles.chip, { borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' }]}>
                      <Text style={[profileStyles.chipText, { color: '#D32F2F' }]}>{tag}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={profileStyles.mutedText}>No allergies listed</Text>
                )}
              </View>
            </View>
          )}
        </EditableSection>

        {/* NUTRITION GOALS SECTION */}
        <EditableSection
          title="Nutrition Goals"
          isEditing={state.editing.goals}
          onToggleEdit={() => toggleEdit("goals")}
          onSave={() => saveSection("goals")}
          onCancel={() => cancelEdit("goals")}
          isSaving={state.status === 'saving'}
        >
          {state.editing.goals ? (
            <View>
              <Text style={profileStyles.inputLabel}>Primary Goal</Text>
              <View style={profileStyles.chipRow}>
                {PRIMARY_GOAL_OPTIONS.map((option) => {
                  const isSelected = profile.goals.primaryGoal === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[profileStyles.chip, isSelected && profileStyles.chipSelected]}
                      onPress={() => updateField("goals", "primaryGoal", option.key)}
                    >
                      <Text style={[profileStyles.chipText, isSelected && profileStyles.chipTextSelected]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[profileStyles.inputLabel, { marginTop: 12 }]}>Daily Calories (kcal)</Text>
              <TextInput
                style={profileStyles.inputBox}
                value={profile.goals.dailyCalories?.toString() || ""}
                onChangeText={(t) => updateField("goals", "dailyCalories", t)}
                keyboardType="numeric"
                placeholder="e.g. 2000"
              />

              <View style={profileStyles.rowGap16}>
                <View style={profileStyles.rowItem}>
                  <Text style={profileStyles.inputLabel}>Protein (g)</Text>
                  <TextInput
                    style={profileStyles.inputBox}
                    value={profile.goals.proteinG?.toString() || ""}
                    onChangeText={(t) => updateField("goals", "proteinG", t)}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={profileStyles.rowItem}>
                  <Text style={profileStyles.inputLabel}>Carbs (g)</Text>
                  <TextInput
                    style={profileStyles.inputBox}
                    value={profile.goals.carbsG?.toString() || ""}
                    onChangeText={(t) => updateField("goals", "carbsG", t)}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={profileStyles.rowItem}>
                  <Text style={profileStyles.inputLabel}>Fats (g)</Text>
                  <TextInput
                    style={profileStyles.inputBox}
                    value={profile.goals.fatsG?.toString() || ""}
                    onChangeText={(t) => updateField("goals", "fatsG", t)}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
              </View>
            </View>
          ) : (
            <View>
              <Text style={profileStyles.inputLabel}>Primary Goal</Text>
              <Text style={[profileStyles.text, { marginBottom: 12, fontWeight: '600' }]}>
                {PRIMARY_GOAL_OPTIONS.find(o => o.key === profile.goals.primaryGoal)?.label || "Not set"}
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={profileStyles.inputLabel}>Calories</Text>
                  <Text style={profileStyles.text}>{profile.goals.dailyCalories || "—"} kcal</Text>
                </View>
                <View>
                  <Text style={profileStyles.inputLabel}>Protein</Text>
                  <Text style={profileStyles.text}>{profile.goals.proteinG || "—"} g</Text>
                </View>
                <View>
                  <Text style={profileStyles.inputLabel}>Carbs</Text>
                  <Text style={profileStyles.text}>{profile.goals.carbsG || "—"} g</Text>
                </View>
                <View>
                  <Text style={profileStyles.inputLabel}>Fats</Text>
                  <Text style={profileStyles.text}>{profile.goals.fatsG || "—"} g</Text>
                </View>
              </View>
            </View>
          )}
        </EditableSection>

        {/* ACCOUNT ACTIONS */}
        <View style={profileStyles.sectionCard}>
          <Text style={profileStyles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={profileStyles.settingRow} activeOpacity={0.7}>
            <Ionicons name="lock-closed-outline" size={22} color="#6A1B9A" />
            <Text style={profileStyles.settingText}>Privacy & Security</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={profileStyles.settingRow} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={22} color="#6A1B9A" />
            <Text style={profileStyles.settingText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* SIGN OUT */}
        <TouchableOpacity
          style={[profileStyles.sectionCard, { backgroundColor: "#FFF3F0", borderColor: "#FFD5CC" }]}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="log-out-outline" size={22} color="#FF7E67" />
            <Text style={[profileStyles.sectionTitle, { color: "#FF7E67", marginLeft: 8 }]}>
              Sign Out
            </Text>
          </View>
        </TouchableOpacity>

        <View style={profileStyles.footerNote}>
          <Text style={profileStyles.mutedText}>
            Manage your account settings and preferences here.
          </Text>
        </View>
      </ScrollView>

      <EditProfileModal
        visible={isEditModalVisible}
        onClose={closeEditModal}
        formData={formData}
        updateFormField={updateFormField}
        onSave={handleSaveProfile}
        isUpdating={isUpdating}
      />
    </SafeScreen>
  );
}
