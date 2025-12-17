import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useState, useMemo } from "react";
import { useUser, useClerk } from "@clerk/clerk-expo";

import SafeScreen from "../../components/SafeScreen";
import { profileStyles } from "../../assets/styles/profile.styles";
import useProfileForm from "../../hooks/useProfileForm";

import EditProfileModal from "../../components/EditProfileModal";
import BasicsSection from "../../components/profile/BasicsSection";
import DietarySection from "../../components/profile/DietarySection";
import GoalsSection from "../../components/profile/GoalsSection";
import AccountActions from "../../components/profile/AccountActions";

/**
 * ProfileScreen
 * - Identity & preferences only
 * - Daily metrics live in Dashboard
 */
export default function ProfileScreen() {

  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const {
    state,
    updateField,
    toggleEdit,
    saveSection,
    cancelEdit,
  } = useProfileForm(user);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const profile = state?.draft;
  const formData = useMemo(() => profile?.basics ?? {}, [profile]);

  const openEditModal = () => {
    if (isUpdating) return;
    setIsEditModalVisible(true);
  };

  const closeEditModal = () => {
    if (isUpdating) return;
    setIsEditModalVisible(false);
  };

  const handleSaveProfile = async () => {
    if (isUpdating) return;
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

  /* ---------------- Loading guard ---------------- */
  if (!isLoaded || !profile) {
    return (
      <SafeScreen>
        <View style={profileStyles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={profileStyles.loadingText}>
            Loading profile…
          </Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <ScrollView
        style={profileStyles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Text style={profileStyles.headerText}>Profile</Text>

        {/* Basics */}
        <BasicsSection
          basics={profile.basics}
          user={user}
          onEdit={openEditModal}
        />

        {/* Dietary Preferences */}
        <DietarySection
          dietary={profile.dietary}
          isEditing={state.editing.dietary}
          toggleEdit={() => toggleEdit("dietary")}
          saveSection={() => saveSection("dietary")}
          cancelEdit={() => cancelEdit("dietary")}
          updateField={updateField}
          status={state.status}
        />

        {/* Nutrition Goals */}
        <GoalsSection
          goals={profile.goals}
          isEditing={state.editing.goals}
          toggleEdit={() => toggleEdit("goals")}
          saveSection={() => saveSection("goals")}
          cancelEdit={() => cancelEdit("goals")}
          updateField={updateField}
          status={state.status}
        />

        {/* Account */}
        <AccountActions onSignOut={handleSignOut} />
      </ScrollView>

      {/* Edit Basics Modal */}
      <EditProfileModal
        visible={isEditModalVisible}
        onClose={closeEditModal}
        formData={formData}
        updateFormField={(field, value) =>
          updateField("basics", field, value)
        }
        onSave={handleSaveProfile}
        isUpdating={isUpdating}
      />
    </SafeScreen>
  );
}
