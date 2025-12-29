import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { QuickActionsBar } from './QuickActionsBar';

export default function LogHeader({
  styles,
  onBackPress,
  onHistoryPress,
  onMoodPress,
  onWaterPress,
  logCount,
}) {
  return (
    <LinearGradient
      colors={['#6B4EFF', '#8B6EFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerGradient}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackPress}
            accessibilityLabel="Go to Recipes tab"
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Ionicons name="restaurant" size={28} color="#FFFFFF" />
          <View style={styles.headerText}>
            <Text style={styles.title}>LOG Meal</Text>
            <Text style={styles.subtitle}>At your convenient way</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={onHistoryPress}
          accessibilityLabel="Open food history"
        >
          <Ionicons name="time-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <QuickActionsBar
        onMoodPress={onMoodPress}
        onWaterPress={onWaterPress}
        onHistoryPress={onHistoryPress}
        logCount={logCount}
      />
    </LinearGradient>
  );
}
