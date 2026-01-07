import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from './GlassCard';
import NutriScoreDial from './NutriScoreDial';
import { SURFACES } from '../../constants/premiumTheme';
import { useTheme } from '../../providers/ThemeProvider';

export default function DashboardPrimaryCard({
  styles,
  today,
  data,
}) {
  const { colors, isDark } = useTheme();
  const textSecondary = colors.text.secondary;
  const gradientColors = isDark
    ? ['rgba(107, 78, 255, 0.15)', 'rgba(139, 92, 246, 0.1)']
    : [SURFACES.gradient.accent[0], SURFACES.gradient.accent[1]];
  const hasFoodLogs = today?.foodLogs && today.foodLogs.length > 0;

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 16, marginBottom: 12 }}
    >
      <GlassCard style={[styles.primaryCard, { margin: 2, marginVertical: 2 }]} padding="lg">
      {hasFoodLogs ? (
        <View style={styles.primaryContent}>
          <NutriScoreDial data={data} size={180} />
          <Text style={styles.primaryHint}>
            Based on calories, protein, hydration, and consistency
          </Text>
        </View>
      ) : (
        <View style={styles.primaryContent}>
          <Ionicons name="sparkles-outline" size={26} color={textSecondary} />
          <Text style={styles.primaryHint}>No pressure today. Log your first meal when you&apos;re ready.</Text>
        </View>
      )}
      </GlassCard>
    </LinearGradient>
  );
}
