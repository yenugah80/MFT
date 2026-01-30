/**
 * ThemeSettingsModal - Lightweight modal for theme selection
 *
 * Simple modal allowing users to choose between Light, Dark, and Auto themes
 * Designed for quick access from Dashboard
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, THEME_MODES } from '../providers/ThemeProvider';
import { SPACING, RADIUS, TYPOGRAPHY } from '../constants/premiumTheme';

export default function ThemeSettingsModal({ visible, onClose }) {
  const { theme, themeMode, setThemeMode, colors } = useTheme();

  const handleThemeSelect = async (mode) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setThemeMode(mode);

    // Close modal after short delay
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const themeOptions = [
    {
      id: THEME_MODES.LIGHT,
      label: 'Light',
      description: 'Perfect for daytime use',
      icon: 'sunny',
    },
    {
      id: THEME_MODES.DARK,
      label: 'Dark',
      description: 'Easier on the eyes at night',
      icon: 'moon',
    },
    {
      id: THEME_MODES.AUTO,
      label: 'Auto',
      description: 'Follows system settings',
      icon: 'phone-portrait',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.card.background },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Choose Theme
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Theme Options */}
          <View style={styles.optionsContainer}>
            {themeOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: colors.surface.background.primary,
                    borderColor:
                      themeMode === option.id
                        ? colors.brand.primary
                        : colors.card.border,
                    borderWidth: themeMode === option.id ? 2 : 1,
                  },
                ]}
                onPress={() => handleThemeSelect(option.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor:
                        themeMode === option.id
                          ? colors.brand.primary + '20'
                          : colors.button.background,
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={24}
                    color={
                      themeMode === option.id
                        ? colors.brand.primary
                        : colors.text.tertiary
                    }
                  />
                </View>

                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionLabel, { color: colors.text.primary }]}>
                    {option.label}
                    {themeMode === option.id && ' ✓'}
                  </Text>
                  <Text style={[styles.optionDescription, { color: colors.text.tertiary }]}>
                    {option.description}
                  </Text>
                  {option.id === THEME_MODES.AUTO && themeMode === THEME_MODES.AUTO && (
                    <Text style={[styles.currentTheme, { color: colors.text.secondary }]}>
                      Currently: {theme === 'light' ? 'Light' : 'Dark'}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING[5],
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: RADIUS['2xl'],
    padding: SPACING[5],
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  title: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  optionsContainer: {
    gap: SPACING[3],
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING[4],
    borderRadius: RADIUS.xl,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    marginBottom: SPACING[1],
  },
  optionDescription: {
    fontSize: TYPOGRAPHY.size.sm,
  },
  currentTheme: {
    fontSize: TYPOGRAPHY.size.xs,
    marginTop: SPACING[1],
    fontStyle: 'italic',
  },
});
