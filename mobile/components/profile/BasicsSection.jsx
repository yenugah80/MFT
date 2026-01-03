import { View, Text, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { SURFACES, TEXT, TYPOGRAPHY, SPACING, RADIUS, ICON_SIZES, SHADOWS } from "../../constants/premiumTheme";

/**
 * BasicsSection - Premium Profile Header
 *
 * Displays avatar, name, and email only.
 * Personal metrics (age, weight, height, etc.) are now in MetricsGridSection
 * with inline editing support.
 */
export default function BasicsSection({ basics, user }) {
  return (
    <View style={styles.card}>
      <View style={styles.profileSection}>
        {/* Avatar with gradient border */}
        <View style={styles.avatarContainer}>
          {user?.imageUrl ? (
            <View style={styles.avatarWrapper}>
              <LinearGradient
                colors={SURFACES.gradient.primary}
                style={styles.avatarGradientBorder}
              >
                <View style={styles.avatarInner}>
                  <Image
                    source={{ uri: user.imageUrl }}
                    style={styles.avatarImage}
                  />
                </View>
              </LinearGradient>
            </View>
          ) : (
            <LinearGradient
              colors={SURFACES.gradient.primary}
              style={styles.avatarGradientBorder}
            >
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={ICON_SIZES['3xl']} color="#FFFFFF" />
              </View>
            </LinearGradient>
          )}
        </View>

        {/* Name and Email */}
        <Text style={styles.name}>
          {basics?.fullName || user?.fullName || "User"}
        </Text>
        <Text style={styles.email}>
          {user?.primaryEmailAddress?.emailAddress || ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[6],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(107, 78, 255, 0.1)',
    ...SHADOWS.md,
  },
  profileSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: SPACING[4],
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarGradientBorder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
    backgroundColor: SURFACES.background.primary,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(107, 78, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: TEXT.primary,
    marginBottom: SPACING[1],
    textAlign: 'center',
  },
  email: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    textAlign: 'center',
  },
});
