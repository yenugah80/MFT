import { View, Text, ScrollView } from "react-native";
import { useState } from "react";
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

  return (
    <SafeScreen>
      <ScrollView style={profileStyles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={profileStyles.headerText}>Profile</Text>
        <BasicsSection basics={profile.basics} user={user} onEdit={openEditModal} />
        <DietarySection
          dietary={profile.dietary}
          isEditing={state.editing.dietary}
          toggleEdit={() => toggleEdit("dietary")}
          saveSection={() => saveSection("dietary")}
          cancelEdit={() => cancelEdit("dietary")}
          updateField={updateField}
          status={state.status}
        />
        <GoalsSection
          goals={profile.goals}
          isEditing={state.editing.goals}
          toggleEdit={() => toggleEdit("goals")}
          saveSection={() => saveSection("goals")}
          cancelEdit={() => cancelEdit("goals")}
          updateField={updateField}
          status={state.status}
        />
        <AccountActions onSignOut={handleSignOut} />
      </ScrollView>
      <EditProfileModal
        visible={isEditModalVisible}
        onClose={closeEditModal}
        formData={formData}
        updateFormField={(field, value) => updateField("basics", field, value)}
        onSave={handleSaveProfile}
        isUpdating={isUpdating}
      />
    </SafeScreen>
  );
}
