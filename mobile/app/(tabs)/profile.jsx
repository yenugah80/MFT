import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { useUser, useClerk } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import SafeScreen from "../../components/SafeScreen";
import { profileStyles } from "../../assets/styles/profile.styles";
import { useProfile } from "../../hooks/useProfile";
import EditProfileModal from "../../components/EditProfileModal";

/**
 * ProfileScreen - Simple account information screen
 * Health metrics, goals, and preferences moved to Dashboard
 */
export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { 
    profile, 
    isLoading, 
    isEditModalVisible, 
    openEditModal, 
    closeEditModal, 
    formData, 
    updateFormField, 
    saveProfile, 
    isUpdating 
  } = useProfile();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  if (isLoading) {
    return (
      <SafeScreen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#6A1B9A" />
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <ScrollView style={profileStyles.container}>
        <Text style={profileStyles.headerText}>Profile</Text>

        {/* USER INFO CARD */}
        <View style={profileStyles.sectionCard}>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            {user?.imageUrl ? (
              <Image
                source={{ uri: user.imageUrl }}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  marginBottom: 12,
                }}
              />
            ) : (
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: "#E0BFB8",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
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
        </View>

        {/* ACCOUNT ACTIONS */}
        <View style={profileStyles.sectionCard}>
          <Text style={profileStyles.sectionTitle}>Account</Text>
          
          <TouchableOpacity 
            style={profileStyles.settingRow} 
            onPress={openEditModal}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={22} color="#6A1B9A" />
            <Text style={profileStyles.settingText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

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

        {/* PREFERENCES */}
        <View style={profileStyles.sectionCard}>
          <Text style={profileStyles.sectionTitle}>Preferences</Text>
          
          <TouchableOpacity style={profileStyles.settingRow} activeOpacity={0.7}>
            <Ionicons name="moon-outline" size={22} color="#6A1B9A" />
            <Text style={profileStyles.settingText}>Theme</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={profileStyles.settingRow} activeOpacity={0.7}>
            <Ionicons name="language-outline" size={22} color="#6A1B9A" />
            <Text style={profileStyles.settingText}>Language</Text>
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
        onSave={() => saveProfile(formData)}
        isUpdating={isUpdating}
      />
    </SafeScreen>
  );
}
