import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SURFACES } from '../../constants/premiumTheme';

export default function StreakSavedModal({ visible, onClose, freezesLeft, styles }) {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.streakSavedCard}>
          <LinearGradient
            colors={['#EFF6FF', '#DBEAFE']}
            style={styles.streakSavedGradient}
          >
            <View style={styles.freezeIconContainer}>
              <Ionicons name="snow" size={48} color="#3B82F6" />
            </View>

            <Text style={styles.streakSavedTitle}>Streak Saved!</Text>
            <Text style={styles.streakSavedDesc}>
              You missed a day, but your Streak Freeze kicked in to save your progress.
            </Text>

            <View style={styles.freezeCountBadge}>
              <Ionicons name="snow" size={14} color="#2563EB" />
              <Text style={styles.freezeCountText}>
                {freezesLeft} {freezesLeft === 1 ? 'freeze' : 'freezes'} remaining
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.savedButton}>
              <LinearGradient
                colors={SURFACES.gradient.blue}
                style={styles.savedButtonGradient}
              >
                <Text style={styles.savedButtonText}>Keep Going</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}
