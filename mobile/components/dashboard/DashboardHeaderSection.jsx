import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TEXT } from '../../constants/premiumTheme';

export default function DashboardHeaderSection({
  styles,
  headerTitle,
  theme,
  focusMode,
  refreshing,
  onOpenTheme,
  onToggleFocusMode,
}) {
  const handleOpenTheme = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOpenTheme();
  };

  const handleToggleFocus = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleFocusMode();
  };

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
            <Text style={styles.headerSubtitle}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} · Today
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.focusModeButton}
            onPress={handleOpenTheme}
            accessibilityRole="button"
            accessibilityLabel="Open theme settings"
            accessibilityHint="Choose between light, dark, and auto themes"
          >
            <Ionicons
              name={theme === 'light' ? 'moon' : 'sunny'}
              size={18}
              color={TEXT.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.focusModeButton, focusMode && styles.focusModeButtonActive]}
            onPress={handleToggleFocus}
            accessibilityRole="button"
            accessibilityLabel={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
            accessibilityHint="Toggles simplified view to reduce information overload"
          >
            <Ionicons
              name={focusMode ? 'eye-off' : 'eye'}
              size={18}
              color={focusMode ? TEXT.primary : TEXT.secondary}
            />
          </TouchableOpacity>

          <View style={styles.syncStatus}>
            <View style={[styles.syncDot, refreshing && styles.syncDotActive]} />
            <Text style={styles.syncText}>
              {refreshing ? 'Syncing...' : 'Synced'}
            </Text>
          </View>
        </View>
      </View>

      {focusMode && (
        <View style={styles.focusModeIndicator}>
          <Ionicons name="eye-off" size={16} color="#3B82F6" />
          <Text style={styles.focusModeText}>Focus Mode Active</Text>
          <Text style={styles.focusModeSubtext}>Showing essentials only</Text>
        </View>
      )}
    </>
  );
}
