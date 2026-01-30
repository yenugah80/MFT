/**
 * ActionButtons Component
 * Row of action buttons: Edit, Favorite, Share
 * Features: Glassmorphism styling, icon buttons
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY, SPACING } from '../../../constants/designTokens';
import { useTheme } from '../../../providers/ThemeProvider';

/**
 * Action button configurations
 */
const ACTIONS = {
  edit: {
    icon: 'create-outline',
    label: 'Edit',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
  },
  favorite: {
    icon: 'heart-outline',
    iconActive: 'heart',
    label: 'Favorite',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
  },
  share: {
    icon: 'share-outline',
    label: 'Share',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
  },
};

/**
 * Single action button
 */
function ActionButton({ type, onPress, isActive = false, disabled = false }) {
  const { isDark } = useTheme();
  const config = ACTIONS[type];

  if (!config) return null;

  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        {
          backgroundColor: isDark
            ? 'rgba(255,255,255,0.08)'
            : config.bgColor,
        },
        disabled && styles.actionButtonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={config.label}
    >
      <Ionicons
        name={isActive && config.iconActive ? config.iconActive : config.icon}
        size={22}
        color={disabled ? '#9CA3AF' : config.color}
      />
      <Text
        style={[
          styles.actionLabel,
          { color: disabled ? '#9CA3AF' : config.color },
        ]}
      >
        {config.label}
      </Text>
    </TouchableOpacity>
  );
}

export default function ActionButtons({
  onEdit,
  onFavorite,
  onShare,
  isFavorite = false,
  editDisabled = false,
}) {
  const { isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' },
      ]}
    >
      <ActionButton
        type="edit"
        onPress={onEdit}
        disabled={editDisabled}
      />
      <ActionButton
        type="favorite"
        onPress={onFavorite}
        isActive={isFavorite}
      />
      <ActionButton
        type="share"
        onPress={onShare}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 16,
    padding: SPACING[3],
    marginVertical: SPACING[2],
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[3],
    borderRadius: 12,
    marginHorizontal: SPACING[1],
    gap: SPACING[1],
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
});
