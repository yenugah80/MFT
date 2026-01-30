/**
 * Account Details Screen
 * Shows user account information and management options
 */

import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import SafeScreen from "../../components/SafeScreen";
import { TEXT, BRAND, TYPOGRAPHY } from "../../constants/premiumTheme";

// Info Row Component
const InfoRow = ({ icon, label, value, isLast }) => (
  <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon} size={18} color={TEXT.tertiary} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "Not set"}</Text>
    </View>
  </View>
);

export default function AccountScreen() {
  const router = useRouter();
  const { user } = useUser();

  const userName = user?.fullName || "User";
  const userEmail = user?.primaryEmailAddress?.emailAddress || "";
  const userInitial = userName[0]?.toUpperCase() || "U";
  const createdAt = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Unknown";

  return (
    <SafeScreen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={TEXT.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={["#7C3AED", "#8B5CF6", "#A78BFA"]}
            style={styles.avatarGradient}
          >
            {user?.imageUrl ? (
              <Image source={{ uri: user.imageUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{userInitial}</Text>
              </View>
            )}
          </LinearGradient>
          <Text style={styles.profileName}>{userName}</Text>
          <Text style={styles.profileEmail}>{userEmail}</Text>
        </View>

        {/* Account Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Information</Text>
          <InfoRow icon="person-outline" label="Full Name" value={userName} />
          <InfoRow icon="mail-outline" label="Email" value={userEmail} />
          <InfoRow icon="calendar-outline" label="Member Since" value={createdAt} isLast />
        </View>

        {/* Account Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Management</Text>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // Open Clerk user profile management
              // This would typically open a web view or external link
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: "rgba(59,130,246,0.1)" }]}>
              <Ionicons name="create-outline" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.actionText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={18} color={TEXT.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionRow, styles.actionRowLast]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // Open password change flow
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: "rgba(16,185,129,0.1)" }]}>
              <Ionicons name="key-outline" size={20} color="#10B981" />
            </View>
            <Text style={styles.actionText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={18} color={TEXT.muted} />
          </TouchableOpacity>
        </View>

        {/* Data & Privacy */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data & Privacy</Text>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/profile/privacy");
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: "rgba(139,92,246,0.1)" }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.actionText}>Privacy Settings</Text>
            <Ionicons name="chevron-forward" size={18} color={TEXT.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionRow, styles.actionRowLast]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // Export data functionality
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: "rgba(245,158,11,0.1)" }]}>
              <Ionicons name="download-outline" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.actionText}>Export My Data</Text>
            <Ionicons name="chevron-forward" size={18} color={TEXT.muted} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={[styles.card, styles.dangerCard]}>
          <Text style={[styles.cardTitle, styles.dangerTitle]}>Danger Zone</Text>
          <TouchableOpacity
            style={[styles.actionRow, styles.actionRowLast]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              // Delete account flow with confirmation
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: "rgba(239,68,68,0.1)" }]}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </View>
            <Text style={[styles.actionText, styles.dangerText]}>Delete Account</Text>
            <Ionicons name="chevron-forward" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 40,
  },

  // Profile Card
  profileCard: {
    alignItems: "center",
    paddingVertical: 24,
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "#FFF",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarImage: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  avatarPlaceholder: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 28,
    fontFamily: TYPOGRAPHY.family.bold,
    color: "#7C3AED",
  },
  profileName: {
    fontSize: 20,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },

  // Cards
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: 16,
    letterSpacing: -0.3,
  },

  // Info Row
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.03)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },

  // Action Row
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  actionRowLast: {
    borderBottomWidth: 0,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },

  // Danger Zone
  dangerCard: {
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  dangerTitle: {
    color: "#EF4444",
  },
  dangerText: {
    color: "#EF4444",
  },
});
