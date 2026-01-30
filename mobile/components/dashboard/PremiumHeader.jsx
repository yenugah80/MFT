/**
 * Premium Header - Clean, Minimal
 * Greeting + Date selector + Settings
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants/designSystem';

const getDayOfWeek = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const date = new Date();
  return days[date.getDay()];
};

const getFormattedDate = () => {
  const date = new Date();
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
};

export default function PremiumHeader({ userName = 'User', onSettingsPress }) {
  return (
    <View style={styles.container}>
      {/* Left: Greeting */}
      <View style={styles.left}>
        <Text style={styles.greeting}>Good Morning</Text>
        <Text style={styles.name}>{userName}</Text>
      </View>

      {/* Center: Date */}
      <View style={styles.center}>
        <Text style={styles.dayOfWeek}>{getDayOfWeek()}</Text>
        <Text style={styles.date}>{getFormattedDate()}</Text>
      </View>

      {/* Right: Settings */}
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={onSettingsPress}
        activeOpacity={0.6}
      >
        <Ionicons name="settings-outline" size={24} color={COLORS.text.inverse} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  left: {
    flex: 1,
  },
  greeting: {
    fontSize: TYPOGRAPHY.size.body,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: SPACING.xs,
  },
  name: {
    fontSize: TYPOGRAPHY.size.title3,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: COLORS.text.inverse,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  dayOfWeek: {
    fontSize: TYPOGRAPHY.size.callout,
    color: COLORS.text.inverse,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    marginBottom: SPACING.xs,
  },
  date: {
    fontSize: TYPOGRAPHY.size.body,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
});
