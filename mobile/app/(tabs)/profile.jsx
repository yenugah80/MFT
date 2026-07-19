/**
 * ProfileScreen - Clean Chip-Based Design
 *
 * Features:
 * - Hero section with avatar and key stats
 * - Stage progression indicator
 * - Body metrics as chips
 * - Goals as chips (no progress bars)
 * - Dietary preferences as chips
 * - GDPR-compliant Privacy & Data section
 * - Compact footer with legal links
 */

import { View, Text, ScrollView, Image, ActivityIndicator, StyleSheet, TouchableOpacity, Animated, Linking } from "react-native";
import { useState, useCallback, useRef } from "react";
import { useUser, useClerk } from "@clerk/clerk-expo";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import * as Haptics from 'expo-haptics';

import HealthSyncBanner from "../../components/HealthSyncBanner";
import useProfileForm from "../../hooks/useProfileForm";
import { useDashboard } from "../../hooks/useDashboard";

// Premium theme
import { BRAND, SURFACES, TEXT, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../../constants/premiumTheme";

// Stage configuration
const STAGES = [
  { key: 'start', label: 'Start', minDays: 0 },
  { key: 'build', label: 'Build', minDays: 3 },
  { key: 'patterns', label: 'Patterns', minDays: 8 },
  { key: 'custom', label: 'Custom', minDays: 31 },
  { key: 'expert', label: 'Expert', minDays: 91 },
];

const getStageIndex = (daysLogged) => {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (daysLogged >= STAGES[i].minDays) return i;
  }
  return 0;
};

// Chip Component
const Chip = ({ icon, value, label, color = TEXT.primary }) => (
  <View style={styles.chip}>
    {icon && <Ionicons name={icon} size={16} color={color} style={styles.chipIcon} />}
    <Text style={[styles.chipValue, { color }]}>{value}</Text>
    {label && <Text style={styles.chipLabel}>{label}</Text>}
  </View>
);

// Goal Chip Component
const GoalChip = ({ icon, value, label, color = '#6B7280' }) => (
  <View style={styles.goalChip}>
    <View style={[styles.goalChipIconBg, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <View>
      <Text style={styles.goalChipValue}>{value}</Text>
      <Text style={styles.goalChipLabel}>{label}</Text>
    </View>
  </View>
);

// Tag Chip (for dietary preferences)
const TagChip = ({ icon, label, color = BRAND.primary }) => (
  <View style={[styles.tagChip, { backgroundColor: `${color}10`, borderColor: `${color}30` }]}>
    {icon && <Text style={styles.tagChipIcon}>{icon}</Text>}
    <Text style={[styles.tagChipLabel, { color }]}>{label}</Text>
  </View>
);

// Section Header Component
const SectionHeader = ({ title, actionText, onAction }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {actionText && (
      <TouchableOpacity onPress={onAction} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.sectionAction}>{actionText}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// Settings Row Component
const SettingsRow = ({ icon, iconColor, title, subtitle, onPress, isLast, isDanger }) => (
  <TouchableOpacity
    style={[styles.settingsRow, isLast && styles.settingsRowLast]}
    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress?.(); }}
    activeOpacity={0.7}
  >
    <View style={[styles.settingsIconBg, { backgroundColor: `${iconColor}15` }]}>
      <Ionicons name={icon} size={20} color={iconColor} />
    </View>
    <View style={styles.settingsContent}>
      <Text style={[styles.settingsTitle, isDanger && { color: '#EF4444' }]}>{title}</Text>
      {subtitle && <Text style={styles.settingsSubtitle}>{subtitle}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={18} color={TEXT.muted} />
  </TouchableOpacity>
);

// Achievements Card Component - Links to full achievements screen
const AchievementsCard = ({ level, streak, daysLogged, onPress }) => {
  const stageIndex = getStageIndex(daysLogged);
  const currentStage = STAGES[stageIndex];

  return (
    <TouchableOpacity
      style={styles.achievementsCard}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress?.(); }}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#7C3AED', '#A78BFA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.achievementsGradient}
      >
        <View style={styles.achievementsContent}>
          <View style={styles.achievementsLeft}>
            <View style={styles.achievementsIcon}>
              <Ionicons name="trophy" size={24} color="#FFF" />
            </View>
            <View>
              <Text style={styles.achievementsTitle}>Achievements</Text>
              <Text style={styles.achievementsSubtitle}>
                {currentStage?.label || 'Start'} Stage
              </Text>
            </View>
          </View>
          <View style={styles.achievementsRight}>
            <View style={styles.achievementsBadge}>
              <Text style={styles.achievementsBadgeText}>Lv.{level}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
          </View>
        </View>

        {/* Progress dots */}
        <View style={styles.achievementsDots}>
          {STAGES.map((stage, index) => (
            <View
              key={stage.key}
              style={[
                styles.achievementsDot,
                index < stageIndex && styles.achievementsDotCompleted,
                index === stageIndex && styles.achievementsDotCurrent,
              ]}
            />
          ))}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { data: dashboardData } = useDashboard();
  const {
    state,
    toggleEdit,
    saveSection,
    cancelEdit,
    updateField,
  } = useProfileForm(user);

  const profile = state?.draft;
  const scrollY = useRef(new Animated.Value(0)).current;

  // Get stats from dashboard
  const gamification = dashboardData?.gamification;
  const userLifecycle = dashboardData?.userLifecycle;
  const level = gamification?.level || 1;
  const totalMeals = gamification?.totalMealsLogged || 0;
  const streak = gamification?.streak || 0;
  const daysLogged = userLifecycle?.totalDaysWithLogs || Math.floor(totalMeals / 3) || 0;

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  if (!isLoaded || !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      </View>
    );
  }

  const userName = profile.basics?.fullName || user?.fullName || "User";
  const userEmail = user?.primaryEmailAddress?.emailAddress || "";
  const userInitial = userName[0]?.toUpperCase() || "U";

  // Body metrics
  const age = profile.basics?.age;
  const weight = profile.basics?.weightKg;
  const height = profile.basics?.heightCm;

  // Goals
  const calories = profile.goals?.dailyCalories;
  const protein = profile.goals?.proteinG;
  const water = profile.goals?.waterLiters;
  const primaryGoal = profile.goals?.primaryGoal;

  // Dietary
  const dietaryPreferences = profile.dietary?.preferences || [];
  const allergies = profile.dietary?.allergies || [];

  // Goal type label
  const goalLabels = {
    lose: 'Lose Weight',
    maintain: 'Maintain',
    gain: 'Gain Weight',
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <LinearGradient
          colors={['#7C3AED', '#8B5CF6', '#A78BFA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.replace('/(tabs)/dashboard'); }}
          >
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>

          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={['#EC4899', '#F97316', '#FBBF24']}
              style={styles.avatarRing}
            >
              {user?.imageUrl ? (
                <Image source={{ uri: user.imageUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{userInitial}</Text>
                </View>
              )}
            </LinearGradient>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{level}</Text>
            </View>
          </View>

          {/* User Info */}
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{daysLogged}</Text>
              <Text style={styles.statLabel}>Days</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalMeals}</Text>
              <Text style={styles.statLabel}>Meals</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{streak}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Content */}
        <View style={styles.content}>
          {/* Achievements Card - Links to full achievements screen */}
          <AchievementsCard
            level={level}
            streak={streak}
            daysLogged={daysLogged}
            onPress={() => router.push('/achievements?from=profile')}
          />

          {/* Body Metrics */}
          <View style={styles.card}>
            <SectionHeader title="Body" actionText="Edit" onAction={() => router.push('/profile/body')} />
            <View style={styles.chipRow}>
              <Chip icon="calendar-outline" value={age ? `${age} yrs` : '—'} label="Age" />
              <Chip icon="scale-outline" value={weight ? `${weight} kg` : '—'} label="Weight" />
              <Chip icon="resize-outline" value={height ? `${height} cm` : '—'} label="Height" />
            </View>
          </View>

          {/* My Goals */}
          <View style={styles.card}>
            <SectionHeader title="My Goals" actionText="Edit" onAction={() => router.push('/profile/body')} />
            <View style={styles.goalChipGrid}>
              <GoalChip icon="flame" value={calories || '—'} label="calories" color="#F97316" />
              <GoalChip icon="barbell" value={protein ? `${protein}g` : '—'} label="protein" color="#3B82F6" />
              <GoalChip icon="water" value={water ? `${water}L` : '—'} label="water" color="#10B981" />
              <GoalChip icon="flag" value={goalLabels[primaryGoal] || '—'} label="goal" color="#8B5CF6" />
            </View>
          </View>

          {/* Diet */}
          <View style={styles.card}>
            <SectionHeader title="Diet" actionText="Edit" onAction={() => toggleEdit('dietary')} />

            {dietaryPreferences.length > 0 && (
              <View style={styles.tagRow}>
                {dietaryPreferences.slice(0, 4).map((pref, index) => (
                  <TagChip
                    key={pref.id || pref || index}
                    icon="🥗"
                    label={typeof pref === 'string' ? pref : pref.id}
                    color="#10B981"
                  />
                ))}
              </View>
            )}

            {allergies.length > 0 && (
              <>
                <Text style={styles.tagSectionLabel}>Allergies</Text>
                <View style={styles.tagRow}>
                  {allergies.map((allergy, index) => (
                    <TagChip
                      key={allergy || index}
                      icon="🚫"
                      label={allergy}
                      color="#EF4444"
                    />
                  ))}
                </View>
              </>
            )}

            {dietaryPreferences.length === 0 && allergies.length === 0 && (
              <Text style={styles.emptyText}>No dietary preferences set</Text>
            )}
          </View>

          {/* Health Platform Sync (activates when native SDK installed) */}
          <HealthSyncBanner />

          {/* Settings */}
          <View style={styles.card}>
            <SettingsRow
              icon="calendar-outline"
              iconColor="#8B5CF6"
              title="Meal Plan"
              subtitle="AI-generated weekly plan"
              onPress={() => router.push('/meal-plan')}
            />
            <SettingsRow
              icon="notifications"
              iconColor="#F59E0B"
              title="Notifications"
              subtitle="Reminders & alerts"
              onPress={() => router.push('/profile/notifications')}
            />
            <SettingsRow
              icon="color-palette"
              iconColor="#EC4899"
              title="Appearance"
              subtitle="Theme & display"
              onPress={() => router.push('/profile/preferences')}
            />
            <SettingsRow
              icon="shield-checkmark"
              iconColor="#10B981"
              title="Privacy & Data"
              subtitle="Manage your data"
              onPress={() => router.push('/profile/privacy')}
              isLast
            />
          </View>

          {/* Sign Out */}
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerBrand}>MFT</Text>
            <Text style={styles.footerVersion}>Version 1.0.0</Text>
            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={() => Linking.openURL('https://my-food-tracker.com/privacy')}>
                <Text style={styles.footerLink}>Privacy</Text>
              </TouchableOpacity>
              <Text style={styles.footerDot}>·</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://my-food-tracker.com/terms')}>
                <Text style={styles.footerLink}>Terms</Text>
              </TouchableOpacity>
              <Text style={styles.footerDot}>·</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://my-food-tracker.com/cookies')}>
                <Text style={styles.footerLink}>Cookies</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },

  // Hero Section
  heroSection: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    marginTop: 24,
    marginBottom: 12,
    position: 'relative',
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  avatarPlaceholder: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#7C3AED',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#7C3AED',
  },
  levelText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFF',
  },
  userName: {
    fontSize: 22,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFF',
  },
  userEmail: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFF',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.regular,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Content
  content: {
    padding: 16,
    marginTop: -8,
  },

  // Achievements Card
  achievementsCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  achievementsGradient: {
    padding: 16,
  },
  achievementsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  achievementsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  achievementsIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementsTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFF',
  },
  achievementsSubtitle: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  achievementsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  achievementsBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  achievementsBadgeText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFF',
  },
  achievementsDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  achievementsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  achievementsDotCompleted: {
    backgroundColor: '#10B981',
  },
  achievementsDotCurrent: {
    backgroundColor: '#FFF',
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Legacy stage styles (kept for compatibility)
  stageLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },
  stageLineCompleted: {
    backgroundColor: '#10B981',
  },

  // Card
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  sectionAction: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  chipIcon: {
    marginBottom: 4,
  },
  chipValue: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  chipLabel: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Goal Chips
  goalChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  goalChip: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  goalChipIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalChipValue: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  goalChipLabel: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },

  // Tag Chips
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  tagChipIcon: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
  },
  tagChipLabel: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  tagSectionLabel: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    fontStyle: 'italic',
  },

  // Settings
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingsRowLast: {
    borderBottomWidth: 0,
  },
  settingsIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingsContent: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  settingsSubtitle: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: 1,
  },

  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 12,
    marginTop: 4,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#EF4444',
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 24,
    paddingBottom: 20,
  },
  footerBrand: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  footerVersion: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.muted,
    marginTop: 2,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  footerLink: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  footerDot: {
    color: TEXT.muted,
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
  },
});
