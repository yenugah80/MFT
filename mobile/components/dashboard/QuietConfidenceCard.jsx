import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TEXT, SURFACES, BRAND } from '../../constants/premiumTheme';

/**
 * QuietConfidenceCard
 *
 * Displays when orchestrator decides SILENT (no new patterns to show).
 * Instead of empty space, shows calm confirmation that habits are aligned.
 *
 * Props: None - static confirmation message
 *
 * @returns {JSX.Element}
 */
export function QuietConfidenceCard() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#ECFDF5', '#D1FAE5']}  // Subtle light green gradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Checkmark Icon */}
          <Text style={styles.icon}>✓</Text>

          {/* Headline */}
          <Text style={styles.headline}>You're On Track Today</Text>

          {/* Subtitle - explains what this means */}
          <Text style={styles.subtitle}>
            Your habits align with your goals. No changes needed right now.
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',

    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,

    // Shadow for Android
    elevation: 2,
  },
  gradient: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
    color: BRAND.emerald,
    lineHeight: 48,
  },
  headline: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: TEXT.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
