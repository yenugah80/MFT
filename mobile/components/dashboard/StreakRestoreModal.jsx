import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SURFACES } from '../../constants/premiumTheme';
import apiClient from '../../services/apiClient';

/**
 * Modal shown when user's streak has been lost but can be restored
 * using a streak freeze (within 24 hours of losing it)
 */
export default function StreakRestoreModal({
  visible,
  onClose,
  onRestored,
  previousStreak,
  freezesAvailable,
  styles,
}) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState(null);

  if (!visible) return null;

  const handleRestore = async () => {
    setIsRestoring(true);
    setError(null);

    try {
      const response = await apiClient.post('/gamification/restore-streak');

      if (response.data.success) {
        // Successfully restored
        onRestored?.(response.data);
        onClose();
      } else {
        setError(response.data.message || 'Failed to restore streak');
      }
    } catch (err) {
      console.error('[StreakRestore] Error:', err);
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.streakSavedCard}>
          <LinearGradient
            colors={['#FEF2F2', '#FEE2E2']}
            style={styles.streakSavedGradient}
          >
            {/* Close button */}
            <TouchableOpacity
              onPress={onClose}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                padding: 4,
              }}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>

            {/* Flame icon with break indicator */}
            <View style={styles.freezeIconContainer}>
              <View style={{ position: 'relative' }}>
                <Ionicons name="flame" size={48} color="#EF4444" />
                <View
                  style={{
                    position: 'absolute',
                    bottom: -4,
                    right: -4,
                    backgroundColor: '#FEF2F2',
                    borderRadius: 12,
                    padding: 2,
                  }}
                >
                  <Ionicons name="alert-circle" size={20} color="#F59E0B" />
                </View>
              </View>
            </View>

            <Text style={[styles.streakSavedTitle, { color: '#DC2626' }]}>
              Streak Lost!
            </Text>
            <Text style={styles.streakSavedDesc}>
              You lost your {previousStreak}-day streak, but you can restore it using a Streak Freeze.
            </Text>

            {/* Error message */}
            {error && (
              <View
                style={{
                  backgroundColor: '#FEE2E2',
                  padding: 12,
                  borderRadius: 8,
                  marginTop: 12,
                  width: '100%',
                }}
              >
                <Text style={{ color: '#DC2626', fontSize: 13, textAlign: 'center' }}>
                  {error}
                </Text>
              </View>
            )}

            {/* Freeze count badge */}
            <View style={[styles.freezeCountBadge, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="snow" size={14} color="#2563EB" />
              <Text style={styles.freezeCountText}>
                {freezesAvailable} {freezesAvailable === 1 ? 'freeze' : 'freezes'} available
              </Text>
            </View>

            {/* Restore button */}
            <TouchableOpacity
              onPress={handleRestore}
              disabled={isRestoring || freezesAvailable <= 0}
              style={[styles.savedButton, { marginTop: 16 }]}
            >
              <LinearGradient
                colors={freezesAvailable > 0 ? SURFACES.gradient.success : ['#9CA3AF', '#6B7280']}
                style={styles.savedButtonGradient}
              >
                {isRestoring ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="snow" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.savedButtonText}>
                      Restore My Streak
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Skip button */}
            <TouchableOpacity
              onPress={onClose}
              style={{ marginTop: 12, padding: 8 }}
            >
              <Text style={{ color: '#6B7280', fontSize: 14 }}>
                Start fresh instead
              </Text>
            </TouchableOpacity>

            {/* Info text */}
            <Text
              style={{
                color: '#9CA3AF',
                fontSize: 11,
                textAlign: 'center',
                marginTop: 16,
              }}
            >
              Restoration available for 24 hours after losing streak
            </Text>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}
