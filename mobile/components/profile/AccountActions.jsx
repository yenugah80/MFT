import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import apiClient from "../../services/apiClient";
import { BRAND, SURFACES, TEXT, SEMANTIC, TYPOGRAPHY, SPACING, RADIUS, ICON_SIZES, SHADOWS } from '../../constants/premiumTheme';

// Animated menu item component
const MenuItem = ({ icon, iconColor, iconBg, title, subtitle, onPress, isLast, rightElement }) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      tension: 400,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 400,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  }, [onPress]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.menuItem, !isLast && styles.menuItemBorder]}
        activeOpacity={0.7}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <LinearGradient
          colors={iconBg}
          style={styles.menuIconContainer}
        >
          <Ionicons name={icon} size={20} color={iconColor} />
        </LinearGradient>
        <View style={styles.menuItemContent}>
          <Text style={styles.menuItemTitle}>{title}</Text>
          {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
        </View>
        {rightElement || (
          <View style={styles.menuItemArrow}>
            <Ionicons name="chevron-forward" size={18} color={TEXT.muted} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Section card component
const SectionCard = ({ title, icon, iconColor, iconBg, children }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <LinearGradient colors={iconBg} style={styles.sectionIconContainer}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </LinearGradient>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.sectionContent}>
      {children}
    </View>
  </View>
);

export default function AccountActions({ onSignOut }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSyncingXP, setIsSyncingXP] = useState(false);

  const handleSyncXP = async () => {
    setIsSyncingXP(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const response = await apiClient.post('/nutrition/backfill-xp');
      const data = response.data;

      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      Alert.alert(
        'XP Synced!',
        `You earned ${data.totalXP} XP from your history!\n\n` +
        `Food logs: ${data.breakdown.food.xp} XP\n` +
        `Water logs: ${data.breakdown.water.xp} XP\n` +
        `Mood logs: ${data.breakdown.mood.xp} XP\n` +
        `Activity: ${data.breakdown.activity.xp} XP\n\n` +
        `You are now Level ${data.level}!`,
        [{ text: 'Awesome!' }]
      );
    } catch (error) {
      console.error('XP sync error:', error);
      Alert.alert('Sync Failed', 'Could not sync your XP. Please try again later.', [{ text: 'OK' }]);
    } finally {
      setIsSyncingXP(false);
    }
  };

  const handleSignOut = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: onSignOut },
      ]
    );
  }, [onSignOut]);

  return (
    <View style={styles.container}>
      {/* Account Section */}
      <SectionCard
        title="Account"
        icon="person-circle"
        iconColor="#8B5CF6"
        iconBg={['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.1)']}
      >
        <MenuItem
          icon="sparkles"
          iconColor="#A855F7"
          iconBg={['rgba(168, 85, 247, 0.2)', 'rgba(168, 85, 247, 0.1)']}
          title="Sync XP from History"
          subtitle="Credit XP for past logs"
          onPress={handleSyncXP}
          rightElement={
            isSyncingXP ? (
              <ActivityIndicator size="small" color="#A855F7" />
            ) : (
              <View style={styles.syncBadge}>
                <Ionicons name="refresh" size={14} color="#A855F7" />
              </View>
            )
          }
        />
        <MenuItem
          icon="shield-checkmark"
          iconColor="#3B82F6"
          iconBg={['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.1)']}
          title="Privacy & Security"
          subtitle="Manage your data"
          onPress={() => router.push("/profile/privacy")}
        />
        <MenuItem
          icon="notifications"
          iconColor="#F59E0B"
          iconBg={['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.1)']}
          title="Notifications"
          subtitle="Reminders & alerts"
          onPress={() => router.push("/profile/notifications")}
        />
        <MenuItem
          icon="color-palette"
          iconColor="#EC4899"
          iconBg={['rgba(236, 72, 153, 0.2)', 'rgba(236, 72, 153, 0.1)']}
          title="App Preferences"
          subtitle="Theme & display"
          onPress={() => router.push("/profile/preferences")}
          isLast
        />
      </SectionCard>

      {/* Legal Section */}
      <SectionCard
        title="Legal"
        icon="document-text"
        iconColor="#10B981"
        iconBg={['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.1)']}
      >
        <MenuItem
          icon="shield-checkmark-outline"
          iconColor="#10B981"
          iconBg={['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.05)']}
          title="Privacy Policy"
          subtitle="How we protect your data"
          onPress={() => router.push("/profile/privacy")}
        />
        <MenuItem
          icon="document-text-outline"
          iconColor="#10B981"
          iconBg={['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.05)']}
          title="Terms of Service"
          subtitle="Usage terms & conditions"
          onPress={() => router.push("/profile/terms")}
          isLast
        />
      </SectionCard>

      {/* Sign Out Button */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['rgba(239, 68, 68, 0.1)', 'rgba(239, 68, 68, 0.05)']}
          style={styles.signOutGradient}
        >
          <View style={styles.signOutIconContainer}>
            <Ionicons name="log-out-outline" size={22} color={SEMANTIC.danger.base} />
          </View>
          <Text style={styles.signOutText}>Sign Out</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* App Version */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>MyFoodTracker v1.0.0</Text>
        <Text style={styles.footerSubtext}>Made with care for your health</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING[2],
    gap: SPACING[4],
  },
  sectionCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    ...SHADOWS.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[4],
    paddingBottom: SPACING[2],
  },
  sectionIconContainer: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: '700',
    color: TEXT.primary,
    letterSpacing: -0.3,
  },
  sectionContent: {
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[2],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    gap: SPACING[3],
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
  },
  menuIconContainer: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: '600',
    color: TEXT.primary,
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  menuItemArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutButton: {
    borderRadius: RADIUS['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  signOutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[4],
    gap: SPACING[3],
  },
  signOutIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: '700',
    color: SEMANTIC.danger.base,
    letterSpacing: -0.3,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING[4],
    gap: SPACING[1],
  },
  footerText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    color: TEXT.tertiary,
  },
  footerSubtext: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
  },
});
