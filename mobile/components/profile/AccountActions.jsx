import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { BRAND, SURFACES, TEXT, SEMANTIC, TYPOGRAPHY, SPACING, RADIUS, ICON_SIZES, SHADOWS } from "../../constants/premiumTheme";

export default function AccountActions({ onSignOut }) {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity
          style={styles.settingRow}
          activeOpacity={0.7}
          onPress={() => router.push("/profile/privacy")}
        >
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
            <Ionicons name="lock-closed-outline" size={ICON_SIZES.sm} color={SEMANTIC.info.base} />
          </View>
          <Text style={styles.settingText}>Privacy & Security</Text>
          <Ionicons name="chevron-forward" size={ICON_SIZES.sm} color={TEXT.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingRow}
          activeOpacity={0.7}
          onPress={() => router.push("/profile/notifications")}
        >
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
            <Ionicons name="notifications-outline" size={ICON_SIZES.sm} color={SEMANTIC.warning.base} />
          </View>
          <Text style={styles.settingText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={ICON_SIZES.sm} color={TEXT.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingRow}
          activeOpacity={0.7}
          onPress={() => router.push("/profile/preferences")}
        >
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(107, 78, 255, 0.1)' }]}>
            <Ionicons name="settings-outline" size={ICON_SIZES.sm} color={BRAND.primary} />
          </View>
          <Text style={styles.settingText}>App Preferences</Text>
          <Ionicons name="chevron-forward" size={ICON_SIZES.sm} color={TEXT.muted} />
        </TouchableOpacity>
      </View>

      {/* Legal Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Legal</Text>

        <TouchableOpacity
          style={styles.settingRow}
          activeOpacity={0.7}
          onPress={() => router.push("/privacy")}
        >
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
            <Ionicons name="shield-checkmark-outline" size={ICON_SIZES.sm} color={SEMANTIC.success.base} />
          </View>
          <Text style={styles.settingText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={ICON_SIZES.sm} color={TEXT.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingRow, { borderBottomWidth: 0 }]}
          activeOpacity={0.7}
          onPress={() => router.push("/terms")}
        >
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
            <Ionicons name="document-text-outline" size={ICON_SIZES.sm} color={SEMANTIC.success.base} />
          </View>
          <Text style={styles.settingText}>Terms of Service</Text>
          <Ionicons name="chevron-forward" size={ICON_SIZES.sm} color={TEXT.muted} />
        </TouchableOpacity>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={onSignOut}
        activeOpacity={0.8}
      >
        <View style={styles.signOutContent}>
          <Ionicons name="log-out-outline" size={ICON_SIZES.md} color={SEMANTIC.danger.base} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </View>
      </TouchableOpacity>

      {/* Footer */}
      <Text style={styles.footerText}>Manage your account settings and preferences here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING[4],
  },
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(107, 78, 255, 0.1)',
    ...SHADOWS.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: SPACING[4],
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(107, 78, 255, 0.05)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  settingText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  signOutButton: {
    backgroundColor: SEMANTIC.danger.bg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOWS.sm,
  },
  signOutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
  },
  signOutText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: SEMANTIC.danger.base,
  },
  footerText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.muted,
    textAlign: 'center',
    paddingHorizontal: SPACING[4],
  },
});
