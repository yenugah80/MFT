import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import apiClient from "../../services/apiClient";
import { BRAND, SURFACES, TEXT, SEMANTIC, TYPOGRAPHY, SPACING, RADIUS, ICON_SIZES, SHADOWS, SEMANTIC_ACTIONS } from '../../constants/premiumTheme';

export default function AccountActions({ onSignOut }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSyncingXP, setIsSyncingXP] = useState(false);

  const handleSyncXP = async () => {
    setIsSyncingXP(true);
    try {
      const response = await apiClient.post('/nutrition/backfill-xp');
      const data = response.data;

      // Invalidate dashboard to show updated XP
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      Alert.alert(
        '🎉 XP Synced!',
        `You earned ${data.totalXP} XP from your history!\n\n` +
        `📝 Food logs: ${data.breakdown.food.xp} XP\n` +
        `💧 Water logs: ${data.breakdown.water.xp} XP\n` +
        `😊 Mood logs: ${data.breakdown.mood.xp} XP\n` +
        `🏃 Activity: ${data.breakdown.activity.xp} XP\n\n` +
        `You are now Level ${data.level}!`,
        [{ text: 'Awesome!' }]
      );
    } catch (error) {
      console.error('XP sync error:', error);
      Alert.alert(
        'Sync Failed',
        'Could not sync your XP. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSyncingXP(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>

        {/* Sync XP from History */}
        <TouchableOpacity
          style={styles.settingRow}
          activeOpacity={0.7}
          onPress={handleSyncXP}
          disabled={isSyncingXP}
        >
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
            {isSyncingXP ? (
              <ActivityIndicator size="small" color="#A855F7" />
            ) : (
              <Ionicons name="sparkles" size={ICON_SIZES.sm} color="#A855F7" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingText}>Sync XP from History</Text>
            <Text style={styles.settingSubtext}>Credit XP for past logs</Text>
          </View>
          <Ionicons name="refresh" size={ICON_SIZES.sm} color={TEXT.muted} />
        </TouchableOpacity>

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
          <View style={[styles.iconContainer, { backgroundColor: `${SEMANTIC_ACTIONS.success}1A` }]}>
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
          onPress={() => router.push("/profile/privacy")}
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
          onPress={() => router.push("/profile/terms")}
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
    borderColor: `${SEMANTIC_ACTIONS.success}1A`,
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
    borderBottomColor: `${SEMANTIC_ACTIONS.success}0D`,
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
  settingSubtext: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    marginTop: 2,
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
