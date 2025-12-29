import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SEMANTIC, SURFACES, TEXT } from '../../constants/premiumTheme';

export function UndoToast({ visible, message, onUndo, onDismiss, styles }) {
  if (!visible) return null;

  return (
    <View style={styles.undoToast}>
      <View style={styles.undoToastContent}>
        <Text style={styles.undoToastText}>{message}</Text>
        <TouchableOpacity
          style={styles.undoButton}
          onPress={onUndo}
          accessibilityRole="button"
          accessibilityLabel="Undo last hydration log"
        >
          <Text style={styles.undoButtonText}>Undo</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        onPress={onDismiss}
        style={styles.undoDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss hydration toast"
      >
        <Ionicons name="close" size={16} color={TEXT.white} />
      </TouchableOpacity>
    </View>
  );
}

export function MilestoneToast({
  milestone,
  visible,
  onDismiss,
  message,
  isFirstLog,
  isTip,
  styles,
}) {
  if (!visible) return null;

  const isSuccess = milestone === 100 && !isTip;
  const gradientColors = isTip
    ? SURFACES.gradient.softPurple
    : isSuccess
      ? SURFACES.gradient.green
      : SURFACES.gradient.blue;

  return (
    <View style={styles.milestoneToast}>
      <LinearGradient
        colors={gradientColors}
        style={styles.milestoneToastGradient}
      >
        <View style={styles.milestoneIcon}>
          <Ionicons
            name={isTip ? 'bulb' : isFirstLog ? 'star' : 'trophy'}
            size={24}
            color={SEMANTIC.warning.base}
          />
        </View>
        <View style={styles.milestoneTextContainer}>
          <Text style={styles.milestoneTitle}>
            {isTip
              ? 'Hydration Tip'
              : isFirstLog
                ? 'Great Start!'
                : `Milestone ${milestone}%`}
          </Text>
          <Text style={styles.milestoneMessage}>{message}</Text>
        </View>
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.milestoneDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss milestone message"
        >
          <Ionicons name="close" size={18} color={TEXT.white} />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}
