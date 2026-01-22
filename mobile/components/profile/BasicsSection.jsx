import { View, Text, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useDashboard } from "../../hooks/useDashboard";
import { BRAND, SURFACES, TEXT, TYPOGRAPHY, SPACING, RADIUS, ICON_SIZES, SHADOWS } from "../../constants/premiumTheme";

/**
 * BasicsSection - Premium Profile Hero
 *
 * Features:
 * - Gradient avatar with border glow
 * - User stats badges (streak, level, meals logged)
 * - Premium glassmorphism styling
 */
export default function BasicsSection({ basics, user }) {
  // Get gamification data for stats badges
  const { data: dashboardData } = useDashboard();
  const gamification = dashboardData?.gamification;
  const streak = dashboardData?.trends?.currentStreak || 0;
  const level = gamification?.level || 1;
  const mealsLogged = gamification?.totalMealsLogged || 0;

  return (
    <View style={styles.heroContainer}>
      {/* Premium Avatar */}
      <View style={styles.avatarContainer}>
        <LinearGradient
          colors={['#8B5CF6', '#EC4899', '#F97316']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarGradientBorder}
        >
          <View style={styles.avatarInner}>
            {user?.imageUrl ? (
              <Image source={{ uri: user.imageUrl }} style={styles.avatarImage} />
            ) : (
              <LinearGradient
                colors={SURFACES.gradient.primary}
                style={styles.avatarPlaceholder}
              >
                <Text style={styles.avatarInitial}>
                  {(basics?.fullName || user?.fullName || "U")[0].toUpperCase()}
                </Text>
              </LinearGradient>
            )}
          </View>
        </LinearGradient>

        {/* Level Badge */}
        <View style={styles.levelBadge}>
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            style={styles.levelBadgeGradient}
          >
            <Text style={styles.levelBadgeText}>{level}</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Name and Email */}
      <Text style={styles.name}>
        {basics?.fullName || user?.fullName || "User"}
      </Text>
      <Text style={styles.email}>
        {user?.primaryEmailAddress?.emailAddress || ""}
      </Text>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)']}
            style={styles.statCardGradient}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="flame" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </LinearGradient>
        </View>

        <View style={styles.statCard}>
          <LinearGradient
            colors={['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.05)']}
            style={styles.statCardGradient}
          >
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
              <Ionicons name="restaurant" size={20} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{mealsLogged}</Text>
            <Text style={styles.statLabel}>Meals</Text>
          </LinearGradient>
        </View>

        <View style={styles.statCard}>
          <LinearGradient
            colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)']}
            style={styles.statCardGradient}
          >
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
              <Ionicons name="star" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>Lv.{level}</Text>
            <Text style={styles.statLabel}>Level</Text>
          </LinearGradient>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    alignItems: 'center',
    paddingVertical: SPACING[6],
    paddingHorizontal: SPACING[4],
    marginBottom: SPACING[4],
  },
  avatarContainer: {
    marginBottom: SPACING[4],
    position: 'relative',
  },
  avatarGradientBorder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  avatarInner: {
    width: 102,
    height: 102,
    borderRadius: 51,
    overflow: 'hidden',
    backgroundColor: SURFACES.background.primary,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
  levelBadgeGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: SURFACES.background.primary,
  },
  levelBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: TEXT.primary,
    marginBottom: SPACING[1],
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  email: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    textAlign: 'center',
    marginBottom: SPACING[5],
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING[3],
    width: '100%',
  },
  statCard: {
    flex: 1,
    maxWidth: 100,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    ...SHADOWS.sm,
  },
  statCardGradient: {
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[2],
    alignItems: 'center',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
