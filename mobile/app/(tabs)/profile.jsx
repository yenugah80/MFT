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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HealthSyncBanner from "../../components/HealthSyncBanner";
import BadgeCard from "../../components/achievements/BadgeCard";
import useProfileForm from "../../hooks/useProfileForm";
import { useDashboard } from "../../hooks/useDashboard";
import { useBadges } from "../../hooks/useGamification";

// Premium theme
import { BRAND, SURFACES, TEXT, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../../constants/premiumTheme";
import { DIETARY_PREFERENCES, ALLERGIES } from "../../constants/onboardingConfig";
import { useResponsiveLayout } from "../../utils/responsiveLayout";

// The API stores dietary preferences and allergies by id ("low_carb"), which was
// being rendered straight to screen. Resolve against the same catalogue the
// onboarding flow uses so the profile shows the human label and matching emoji.
const buildLookup = (items) =>
  items.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

const DIETARY_BY_ID = buildLookup(DIETARY_PREFERENCES);
const ALLERGY_BY_ID = buildLookup(ALLERGIES);

// WHO adult BMI bands. Used only to colour and label a value the user can
// already compute from the weight and height they entered — the app shows it,
// it does not diagnose. Medical disclaimers live in Terms and the insights screen.
const BMI_BANDS = [
  { max: 18.5, label: 'Underweight', color: '#3B82F6' },
  { max: 25, label: 'Healthy', color: '#10B981' },
  { max: 30, label: 'Overweight', color: '#F59E0B' },
  { max: Infinity, label: 'High', color: '#EF4444' },
];

// Range the meter spans. Values outside clamp to the ends rather than
// overflowing the track.
const BMI_SCALE_MIN = 15;
const BMI_SCALE_MAX = 35;

/** Returns null unless both inputs are usable, so the tile can hide cleanly. */
function computeBmi(weightKg, heightCm) {
  const w = Number(weightKg);
  const h = Number(heightCm);
  if (!w || !h || w <= 0 || h <= 0) return null;

  const bmi = w / (h / 100) ** 2;
  if (!Number.isFinite(bmi)) return null;

  const band = BMI_BANDS.find((b) => bmi < b.max) ?? BMI_BANDS[BMI_BANDS.length - 1];
  const position = (bmi - BMI_SCALE_MIN) / (BMI_SCALE_MAX - BMI_SCALE_MIN);

  return {
    value: bmi.toFixed(1),
    label: band.label,
    color: band.color,
    percent: Math.min(100, Math.max(0, position * 100)),
  };
}

/** Accepts "low_carb" or { id: "low_carb", strength: 3 } and returns display parts. */
const resolveTag = (entry, lookup) => {
  const id = typeof entry === 'string' ? entry : entry?.id;
  const match = lookup[id];
  if (match) return { key: id, label: match.label, emoji: match.emoji };
  // Unknown id: title-case it rather than showing raw snake_case.
  const label = String(id ?? '')
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return { key: id || label, label, emoji: null };
};

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
      {/* White, not a purple gradient. Stacked directly under the purple hero,
          a second purple block flattened the hierarchy — the header and this
          card competed instead of reading as chrome then content. */}
      <View style={styles.achievementsInner}>
        <View style={styles.achievementsContent}>
          <View style={styles.achievementsLeft}>
            <View style={styles.achievementsIcon}>
              <Ionicons name="trophy" size={22} color={BRAND.primary} />
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
            <Ionicons name="chevron-forward" size={18} color={TEXT.tertiary} />
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
      </View>
    </TouchableOpacity>
  );
};

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Tracks live window size, so iPad Split View / Slide Over re-lays out
  // instead of using a width captured once at import.
  const { isTablet, contentWidth } = useResponsiveLayout();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { data: dashboardData } = useDashboard();
  // Same query key the Achievements screen uses, so this shares its cache and
  // adds no extra request. Backed by GET /gamification/achievements.
  const { data: badgesData } = useBadges();
  const {
    state,
    toggleEdit,
    saveSection,
    cancelEdit,
    updateField,
    reload,
  } = useProfileForm(user);

  const profile = state?.draft;
  // Only block on the very first load. Once anything is on screen — cached or
  // fresh — a background revalidation ('refreshing') must not swap it for a
  // spinner, and a failed one must not swap it for an error page.
  const isProfileLoading = state?.status === 'loading' && !state?.hasData;
  const profileLoadError = state?.status === 'error' && !state?.hasData ? state.error : null;
  const scrollY = useRef(new Animated.Value(0)).current;

  // Get stats from dashboard
  const gamification = dashboardData?.gamification;
  const userLifecycle = dashboardData?.userLifecycle;
  const level = gamification?.level || 1;
  const totalMeals = gamification?.totalMealsLogged || 0;
  const streak = gamification?.streak || 0;
  const daysLogged = userLifecycle?.totalDaysWithLogs || Math.floor(totalMeals / 3) || 0;
  // Keyed on meals alone, deliberately. `daysLogged` falls back to a derived
  // value and can read non-zero while nothing has actually been logged, which
  // produced the contradictory "3 Days · 0 Meals · 0 Streak". Until a meal
  // exists there is nothing meaningful to count, so show the prompt.
  const hasActivity = totalMeals > 0;

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  if (!isLoaded || !profile || isProfileLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      </View>
    );
  }

  // A failed fetch used to fall back to DEFAULT_PROFILE, which rendered a full
  // page of blank fields — indistinguishable from a genuinely empty account and
  // impossible to recover from without restarting the app. Say what happened and
  // offer a retry instead.
  if (profileLoadError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={styles.loadingContainer}>
          <Ionicons name="cloud-offline-outline" size={44} color={TEXT.tertiary} />
          <Text style={styles.errorTitle}>Couldn&apos;t load your profile</Text>
          <Text style={styles.errorMessage}>{profileLoadError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              reload({ userInitiated: true });
            }}
            accessibilityRole="button"
            accessibilityLabel="Retry loading profile"
          >
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
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

  const bmi = computeBmi(weight, height);

  // Earned badges only. Showing locked ones here would just be a wall of grey
  // tiles duplicating the Achievements screen, which is where browsing belongs.
  const earnedBadges = (badgesData?.achievements || []).filter((b) => b?.isUnlocked);

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView
        style={styles.container}
        // On iPad the content is capped at a readable measure and centred;
        // unconstrained, every card stretched across a 1024pt window and the
        // app read as an upscaled phone app.
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && { width: contentWidth, alignSelf: 'center' },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section
            A soft tint rather than the previous saturated three-stop purple.
            The header is chrome, not content — at full saturation it out-shouted
            the Body/Goals cards, which is where the user actually looks. */}
        <LinearGradient
          colors={['#F5F3FF', '#EDE9FE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          // Runs edge-to-edge under the status bar, so the avatar needs the
          // device's top inset or it collides with the notch.
          style={[styles.heroSection, { paddingTop: insets.top + 12 }]}
        >
          <View style={styles.identityRow}>
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

            <View style={styles.identityText}>
              <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
              <Text style={styles.userEmail} numberOfLines={1}>{userEmail}</Text>
              {memberSince && (
                <View style={styles.memberSinceRow}>
                  <Ionicons name="calendar-outline" size={12} color={TEXT.tertiary} />
                  <Text style={styles.memberSince}>Member since {memberSince}</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* Content */}
        <View style={styles.content}>
          {/* Stats card, pulled up to straddle the gradient edge. Sits outside
              the LinearGradient so it can cast a shadow onto the page. */}
          {hasActivity ? (
            <View style={styles.statsCard}>
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
          ) : (
            /* Three zeros read as a score of nothing. Point a brand-new user at
               the one action that changes it instead. */
            <TouchableOpacity
              style={styles.statsCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/log');
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Log your first meal"
            >
              <View style={styles.emptyStatsIcon}>
                <Ionicons name="restaurant-outline" size={20} color={BRAND.primary} />
              </View>
              <View style={styles.emptyStatsCopy}>
                <Text style={styles.emptyStatsTitle}>Log your first meal</Text>
                <Text style={styles.emptyStatsSubtitle}>Start your streak and unlock insights</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={TEXT.tertiary} />
            </TouchableOpacity>
          )}
          {/* Achievements Card - Links to full achievements screen */}
          <AchievementsCard
            level={level}
            streak={streak}
            daysLogged={daysLogged}
            onPress={() => router.push('/achievements?from=profile')}
          />

          {/* Earned badges — hidden entirely until at least one is unlocked, so
              a new account sees no empty shelf. Reuses BadgeCard and the
              Achievements screen's query, so there is one source of truth. */}
          {earnedBadges.length > 0 && (
            <View style={styles.card}>
              <SectionHeader
                title="Badges"
                actionText="View All"
                onAction={() => router.push('/achievements?from=profile')}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.badgeStrip}
              >
                {earnedBadges.map((badge) => (
                  <BadgeCard key={badge.id || badge.name} achievement={badge} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Body Metrics */}
          <View style={styles.card}>
            <SectionHeader title="My Body" actionText="Edit" onAction={() => router.push('/profile/body')} />
            <View style={styles.chipRow}>
              <Chip icon="calendar-outline" value={age ? `${age} yrs` : '—'} label="Age" />
              <Chip icon="scale-outline" value={weight ? `${weight} kg` : '—'} label="Weight" />
              <Chip icon="resize-outline" value={height ? `${height} cm` : '—'} label="Height" />
            </View>

            {/* BMI meter — the one place on this screen that shows a value in
                context rather than in isolation. Derived entirely from the
                weight and height above, so it needs no new data. */}
            {bmi && (
              <View style={styles.bmiBlock}>
                <View style={styles.bmiHeader}>
                  <Text style={styles.bmiLabel}>Body Mass Index</Text>
                  <View style={styles.bmiValueRow}>
                    <Text style={styles.bmiValue}>{bmi.value}</Text>
                    <View style={[styles.bmiBadge, { backgroundColor: `${bmi.color}1A` }]}>
                      <Text style={[styles.bmiBadgeText, { color: bmi.color }]}>{bmi.label}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.bmiTrack}>
                  {/* Band segments, widths proportional to the 15–35 scale */}
                  <View style={[styles.bmiSegment, { flex: 3.5, backgroundColor: '#3B82F633' }]} />
                  <View style={[styles.bmiSegment, { flex: 6.5, backgroundColor: '#10B98133' }]} />
                  <View style={[styles.bmiSegment, { flex: 5, backgroundColor: '#F59E0B33' }]} />
                  <View style={[styles.bmiSegment, { flex: 5, backgroundColor: '#EF444433' }]} />
                  <View style={[styles.bmiMarker, { left: `${bmi.percent}%`, borderColor: bmi.color }]} />
                </View>

                <View style={styles.bmiScale}>
                  <Text style={styles.bmiScaleText}>{BMI_SCALE_MIN}</Text>
                  <Text style={styles.bmiScaleText}>{BMI_SCALE_MAX}</Text>
                </View>
              </View>
            )}
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
                {dietaryPreferences.slice(0, 4).map((pref, index) => {
                  const tag = resolveTag(pref, DIETARY_BY_ID);
                  return (
                    <TagChip
                      key={tag.key || index}
                      icon={tag.emoji}
                      label={tag.label}
                      color="#10B981"
                    />
                  );
                })}
              </View>
            )}

            {allergies.length > 0 && (
              <>
                <Text style={styles.tagSectionLabel}>Allergies</Text>
                <View style={styles.tagRow}>
                  {allergies.map((allergy, index) => {
                    const tag = resolveTag(allergy, ALLERGY_BY_ID);
                    return (
                      <TagChip
                        key={tag.key || index}
                        icon={tag.emoji}
                        label={tag.label}
                        color="#EF4444"
                      />
                    );
                  })}
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
            {/* Labelled for what the screen actually contains — Experience,
                Units, Voice and Accessibility. It has no theme control, and
                "Appearance / Theme & display" sent people looking for one. */}
            <SettingsRow
              icon="options"
              iconColor="#EC4899"
              title="Preferences"
              subtitle="Units, voice & accessibility"
              onPress={() => router.push('/profile/preferences')}
            />
            <SettingsRow
              icon="shield-checkmark"
              iconColor="#10B981"
              title="Privacy & Data"
              subtitle="Export or delete your data"
              onPress={() => router.push('/profile/privacy')}
              isLast
            />
          </View>

          {/* Second group: help and legal. Split from the settings above so the
              list reads as "things that change the app" then "things that
              explain it", rather than one undifferentiated run of seven rows. */}
          <View style={styles.card}>
            <SettingsRow
              icon="help-buoy"
              iconColor="#0EA5E9"
              title="Help & Support"
              subtitle="FAQ, contact us"
              onPress={() => Linking.openURL('https://my-food-tracker.com/support')}
            />
            <SettingsRow
              icon="information-circle"
              iconColor="#8B5CF6"
              title="About"
              subtitle="App version & policies"
              onPress={() => router.push('/profile/terms')}
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
  errorTitle: {
    marginTop: 16,
    fontSize: 18,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    textAlign: 'center',
  },
  errorMessage: {
    marginTop: 6,
    paddingHorizontal: 40,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: RADIUS.full,
    backgroundColor: BRAND.primary,
  },
  retryButtonText: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#FFFFFF',
  },

  // Hero Section
  heroSection: {
    paddingTop: 12,
    // Extra bottom padding leaves room for the stats card that overlaps up
    // into this area (see statsCard.marginTop).
    paddingBottom: 44,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  identityText: {
    flex: 1,
    minWidth: 0,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  avatarPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 24,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#7C3AED',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  levelText: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFF',
  },
  userName: {
    fontSize: 20,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  userEmail: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginTop: 2,
  },
  memberSinceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  memberSince: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },

  badgeStrip: {
    gap: 12,
    paddingRight: 4,
    paddingTop: 4,
    paddingBottom: 4,
  },

  // BMI meter
  bmiBlock: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  bmiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  bmiLabel: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
  },
  bmiValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bmiValue: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  bmiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  bmiBadgeText: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  bmiTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'visible',
    position: 'relative',
  },
  bmiSegment: {
    height: 8,
  },
  bmiMarker: {
    position: 'absolute',
    top: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
  },
  bmiScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  bmiScaleText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },

  // Stats card — white, overlapping the gradient's bottom edge. The negative
  // margin is why heroSection carries extra paddingBottom.
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: -32,
    marginBottom: 16,
    ...SHADOWS.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  emptyStatsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(107,78,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emptyStatsCopy: {
    flex: 1,
  },
  emptyStatsTitle: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  emptyStatsSubtitle: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginTop: 2,
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
  achievementsInner: {
    backgroundColor: '#FFFFFF',
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
    backgroundColor: 'rgba(107,78,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementsTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  achievementsSubtitle: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginTop: 2,
  },
  achievementsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  achievementsBadge: {
    backgroundColor: 'rgba(107,78,255,0.10)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  achievementsBadgeText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.bold,
    color: BRAND.primary,
  },
  achievementsDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  achievementsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.10)',
  },
  achievementsDotCompleted: {
    backgroundColor: '#10B981',
  },
  achievementsDotCurrent: {
    backgroundColor: BRAND.primary,
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
