/**
 * ProfileScreen - Premium Redesign
 * Glossy, trendy UI matching Dashboard and Log
 * - Ionicons throughout
 * - LinearGradient header
 * - Premium card styling
 */

import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { useState, useMemo } from "react";
import { useUser, useClerk } from "@clerk/clerk-expo";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import SafeScreen from "../../components/SafeScreen";
import useProfileForm from "../../hooks/useProfileForm";

import EditProfileModal from "../../components/EditProfileModal";
import BasicsSection from "../../components/profile/BasicsSection";
import DietarySection from "../../components/profile/DietarySection";
import GoalsSection from "../../components/profile/GoalsSection";
import AccountActions from "../../components/profile/AccountActions";

// Premium theme
import { BRAND, SURFACES, TEXT, TYPOGRAPHY, SPACING, RADIUS, ICON_SIZES, ICONS } from "../../constants/premiumTheme";

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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.loadingText}>
            Loading profile…
          </Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      {/* Premium Header with Gradient */}
      <LinearGradient
        colors={SURFACES.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name={ICONS.profile} size={ICON_SIZES.lg} color="#FFFFFF" />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Profile</Text>
              <Text style={styles.headerSubtitle}>Your nutrition preferences & goals</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  content: {
    padding: SPACING[5],
    paddingBottom: SPACING[10],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SURFACES.background.primary,
  },
  loadingText: {
    marginTop: SPACING[3],
    fontSize: TYPOGRAPHY.size.base,
    color: TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // Premium Header
  headerGradient: {
    paddingTop: SPACING[3],
    paddingBottom: SPACING[4],
    paddingHorizontal: SPACING[5],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: SPACING[3],
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: '#FFFFFF',
    marginBottom: SPACING[1],
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: TYPOGRAPHY.weight.medium,
  },
});
