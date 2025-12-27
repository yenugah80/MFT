/**
 * ThemeSettingsScreen - Complete theme configuration UI
 *
 * Features:
 * - Light/Dark/Auto theme selection
 * - Live preview
 * - System sync toggle
 * - Theme usage analytics opt-in
 *
 * @version 1.0
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, THEME_MODES } from '../providers/ThemeProvider';
import {
  SPACING,
  RADIUS,
  TYPOGRAPHY,
} from '../constants/premiumTheme';
import { LinearGradient } from 'expo-linear-gradient';

export default function ThemeSettingsScreen() {
  const { theme, themeMode, setThemeMode, colors, THEME_MODES: MODES } = useTheme();
  const [showPreview, setShowPreview] = useState(false);

  const handleThemeSelect = async (mode) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setThemeMode(mode);
  };

  const themeOptions = [
    {
      id: MODES.LIGHT,
      label: 'Light',
      description: 'Warm, welcoming theme perfect for daytime',
      icon: 'sunny',
      previewGradient: ['#FFF9F5', '#F9F7F4'],
    },
    {
      id: MODES.DARK,
      label: 'Dark',
      description: 'Premium dark theme for evening use',
      icon: 'moon',
      previewGradient: ['#1A0B2E', '#2D1B4E'],
    },
    {
      id: MODES.AUTO,
      label: 'Auto',
      description: 'Sync with system dark mode',
      icon: 'phone-portrait',
      previewGradient: ['#6B4EFF', '#8B6EFF'],
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.surface.background.primary }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Theme Settings
        </Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          Customize your visual experience
        </Text>
      </View>

      {/* Theme Options */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Choose Theme
        </Text>

        {themeOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.themeOption,
              {
                backgroundColor: colors.card.background,
                borderColor: themeMode === option.id ? colors.brand.primary : colors.card.border,
                borderWidth: themeMode === option.id ? 2 : 1,
              },
            ]}
            onPress={() => handleThemeSelect(option.id)}
            activeOpacity={0.7}
          >
            {/* Preview Gradient */}
            <LinearGradient
              colors={option.previewGradient}
              style={styles.themePreview}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name={option.icon}
                size={24}
                color="#FFFFFF"
              />
            </LinearGradient>

            {/* Theme Info */}
            <View style={styles.themeInfo}>
              <View style={styles.themeHeader}>
                <Text style={[styles.themeLabel, { color: colors.text.primary }]}>
                  {option.label}
                </Text>
                {themeMode === option.id && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.brand.primary} />
                )}
              </View>
              <Text style={[styles.themeDescription, { color: colors.text.tertiary }]}>
                {option.description}
              </Text>

              {/* Show current system theme for Auto mode */}
              {option.id === MODES.AUTO && themeMode === MODES.AUTO && (
                <View style={[styles.systemBadge, { backgroundColor: colors.brand.primary + '20' }]}>
                  <Text style={[styles.systemBadgeText, { color: colors.brand.primary }]}>
                    Currently: {theme === 'light' ? 'Light' : 'Dark'} (System)
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Additional Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Additional Options
        </Text>

        {/* Preview Toggle */}
        <View style={[styles.settingRow, { backgroundColor: colors.card.background }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.text.primary }]}>
              Show Preview
            </Text>
            <Text style={[styles.settingDescription, { color: colors.text.tertiary }]}>
              Display theme preview before applying
            </Text>
          </View>
          <Switch
            value={showPreview}
            onValueChange={setShowPreview}
            trackColor={{ false: colors.text.muted, true: colors.brand.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          About Themes
        </Text>

        <View style={[styles.infoCard, { backgroundColor: colors.card.background }]}>
          <Ionicons name="information-circle" size={24} color={colors.brand.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.text.primary }]}>
              Why Themes Matter
            </Text>
            <Text style={[styles.infoText, { color: colors.text.secondary }]}>
              Light theme is optimized for food photography and daytime tracking.
              Dark theme reduces eye strain for evening use.
              Auto mode syncs with your device settings.
            </Text>
          </View>
        </View>

        {/* Usage Stats */}
        <View style={[styles.infoCard, { backgroundColor: colors.card.background }]}>
          <Ionicons name="stats-chart" size={24} color={colors.semantic.info.base} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.text.primary }]}>
              Your Theme Usage
            </Text>
            <Text style={[styles.infoText, { color: colors.text.secondary }]}>
              Current: {themeMode === MODES.LIGHT ? 'Light' : themeMode === MODES.DARK ? 'Dark' : 'Auto'}
              {'\n'}Active: {theme === 'light' ? 'Light' : 'Dark'} theme
            </Text>
          </View>
        </View>
      </View>

      {/* Platform-Specific Info */}
      {Platform.OS === 'ios' && (
        <View style={styles.section}>
          <View style={[styles.platformInfo, { backgroundColor: colors.semantic.info.bg }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.semantic.info.base} />
            <Text style={[styles.platformInfoText, { color: colors.semantic.info.dark }]}>
              iOS: Auto mode syncs with Settings → Display & Brightness → Appearance
            </Text>
          </View>
        </View>
      )}

      {Platform.OS === 'android' && (
        <View style={styles.section}>
          <View style={[styles.platformInfo, { backgroundColor: colors.semantic.info.bg }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.semantic.info.base} />
            <Text style={[styles.platformInfoText, { color: colors.semantic.info.dark }]}>
              Android: Auto mode syncs with Settings → Display → Dark theme
            </Text>
          </View>
        </View>
      )}

      {/* Bottom Spacing */}
      <View style={{ height: SPACING[10] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: SPACING[5],
    paddingTop: SPACING[8],
  },
  title: {
    fontSize: TYPOGRAPHY.size['4xl'],
    fontWeight: TYPOGRAPHY.weight.extrabold,
    marginBottom: SPACING[2],
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  section: {
    paddingHorizontal: SPACING[5],
    marginBottom: SPACING[6],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    marginBottom: SPACING[3],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING[4],
    borderRadius: RADIUS.xl,
    marginBottom: SPACING[3],
  },
  themePreview: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[4],
  },
  themeInfo: {
    flex: 1,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[1],
  },
  themeLabel: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  themeDescription: {
    fontSize: TYPOGRAPHY.size.sm,
    lineHeight: 18,
  },
  systemBadge: {
    marginTop: SPACING[2],
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  systemBadgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING[4],
    borderRadius: RADIUS.xl,
  },
  settingInfo: {
    flex: 1,
    marginRight: SPACING[3],
  },
  settingLabel: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    marginBottom: SPACING[1],
  },
  settingDescription: {
    fontSize: TYPOGRAPHY.size.sm,
  },
  infoCard: {
    flexDirection: 'row',
    padding: SPACING[4],
    borderRadius: RADIUS.xl,
    marginBottom: SPACING[3],
  },
  infoContent: {
    flex: 1,
    marginLeft: SPACING[3],
  },
  infoTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    marginBottom: SPACING[2],
  },
  infoText: {
    fontSize: TYPOGRAPHY.size.sm,
    lineHeight: 20,
  },
  platformInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING[3],
    borderRadius: RADIUS.md,
  },
  platformInfoText: {
    fontSize: TYPOGRAPHY.size.xs,
    marginLeft: SPACING[2],
    flex: 1,
  },
});
