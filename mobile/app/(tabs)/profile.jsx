/**
 * ProfileScreen - Premium Redesign v2
 *
 * Features:
 * - Inline editable metrics grid (MetricsGridSection)
 * - Collapsible analytics section (MyInsightsSection)
 * - Premium glassmorphism styling
 * - Haptic feedback on all interactions
 */

import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { useState, useCallback } from "react";
import { useUser, useClerk } from "@clerk/clerk-expo";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";

import SafeScreen from "../../components/SafeScreen";
import useProfileForm from "../../hooks/useProfileForm";

// Profile sections
import BasicsSection from "../../components/profile/BasicsSection";
import BodyProfileCard from "../../components/profile/BodyProfileCard";
import DietarySection from "../../components/profile/DietarySection";
import GoalsSection from "../../components/profile/GoalsSection";
import AccountActions from "../../components/profile/AccountActions";

// Premium theme
import { BRAND, SURFACES, TEXT, TYPOGRAPHY, SPACING, ICON_SIZES, ICONS } from "../../constants/premiumTheme";

/**
 * ProfileScreen
 * - Identity & preferences with inline editing
 * - Collapsible analytics section
 * - Daily metrics moved to Dashboard
 */
export default function ProfileScreen() {
  const router = useRouter();

  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const {
    state,
    updateField,
    toggleEdit,
    saveSection,
    saveField,
    cancelEdit,
  } = useProfileForm(user);

  const [isSavingField, setIsSavingField] = useState(false);
  const profile = state?.draft;

  // Handle inline field save for MetricsGridSection
  const handleFieldSave = useCallback(async (field, value) => {
    setIsSavingField(true);
    try {
      const success = await saveField('basics', field, value);
      return success;
    } finally {
      setIsSavingField(false);
    }
  }, [saveField]);

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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace('/(tabs)/dashboard')}
              accessibilityLabel="Go to Dashboard tab"
            >
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
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
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header - Avatar + Name + Email */}
        <BasicsSection
          basics={profile.basics}
          user={user}
        />

        {/* Body Profile - Premium Metrics Visualization */}
        <BodyProfileCard
          basics={profile.basics}
          onFieldSave={handleFieldSave}
          isSaving={isSavingField}
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
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
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
