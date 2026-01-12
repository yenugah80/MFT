/**
 * WaterLogger Modal
 * Beautiful, animated modal for logging water intake with wave visualization
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Animated,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useWaterLog } from '../hooks/useWaterLog';
import { useQueryClient } from '@tanstack/react-query';

const { width } = Dimensions.get('window');

/**
 * Animated water wave component - Premium version with volume display
 */
const WaterWave = ({ progress, todayTotal, dailyGoal }) => {
  const waveAnim1 = useRef(new Animated.Value(0)).current;
  const waveAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous wave animation
    const animation1 = Animated.loop(
      Animated.timing(waveAnim1, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    const animation2 = Animated.loop(
      Animated.timing(waveAnim2, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
      })
    );

    animation1.start();
    animation2.start();

    return () => {
      animation1.stop();
      animation2.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wave1TranslateX = waveAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -width],
  });

  const wave2TranslateX = waveAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width],
  });

  // Calculate water level based on progress - cap at 100% visually
  const waterLevel = Math.min(100, progress);
  const waterHeight = `${waterLevel}%`;

  return (
    <View style={styles.waveContainer}>
      {/* Water fill */}
      <View style={[styles.waterFill, { height: waterHeight }]}>
        {/* Wave 1 */}
        <Animated.View
          style={[
            styles.wave,
            {
              transform: [{ translateX: wave1TranslateX }],
              backgroundColor: 'rgba(59, 130, 246, 0.5)',
            },
          ]}
        />
        {/* Wave 2 */}
        <Animated.View
          style={[
            styles.wave,
            {
              transform: [{ translateX: wave2TranslateX }],
              backgroundColor: 'rgba(14, 165, 233, 0.3)',
            },
          ]}
        />
      </View>

      {/* Progress text - Volume based, not just % */}
      <View style={styles.progressTextContainer}>
        <Text style={styles.progressVolume}>
          {(todayTotal * 1000).toFixed(0)}ml
        </Text>
        <Text style={styles.progressGoal}>
          of {(dailyGoal * 1000).toFixed(0)}ml
        </Text>
        <Text style={styles.progressPercent}>{waterLevel}%</Text>
      </View>
    </View>
  );
};

/**
 * Quick add button component
 */
const QuickAddButton = ({ preset, onPress, isLoading }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPress(preset);
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], flex: 1 }}>
      <TouchableOpacity
        style={[styles.presetButton, { backgroundColor: preset.color }]}
        onPress={handlePress}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Text style={styles.presetIcon}>{preset.icon}</Text>
            <Text style={styles.presetLabel}>{preset.label}</Text>
            <Text style={styles.presetAmount}>{preset.amount * 1000}ml</Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * Main WaterLogger Modal Component
 */
export default function WaterLogger({ visible, onClose, onSuccess }) { // Removed error from here
  const { logWater, quickAdd, isLogging, presets, getProgress, error: hookError } = useWaterLog();
  const queryClient = useQueryClient();
  const [customAmount, setCustomAmount] = useState('');
  const [progress, setProgress] = useState(0);
  const [localError, setLocalError] = useState(null); // Use localError for input validation

  // Animations
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Update progress
      setProgress(getProgress());
      setLocalError(null); // Clear any previous local errors when modal opens

      // Slide up and fade in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset
      slideAnim.setValue(300);
      fadeAnim.setValue(0);
      successAnim.setValue(0);
      setCustomAmount('');
      setLocalError(null); // Clear local error when modal closes
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleQuickAdd = async (preset) => {
    setLocalError(null); // Clear any previous local error before attempting to log
    try {
      await quickAdd(preset);
      setProgress(getProgress());

      // Success ripple animation
      Animated.sequence([
        Animated.spring(successAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(successAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Execute onSuccess and close modal only after success animation completes
        onSuccess?.();
        onClose();
      });
    } catch (err) {
      console.error('Failed to log water:', err);
      // Set a user-friendly error message
      setLocalError('Failed to log water. Please try again.'); // Use localError for API errors
      // Do not call onSuccess or onClose on error
    }
  };

  const handleCustomAdd = async () => {
    const amountMl = parseFloat(customAmount);
    if (!amountMl || amountMl <= 0) {
      setLocalError('Please enter a valid amount greater than 0.');
      return;
    }
    setLocalError(null); // Clear any previous local error before attempting to log

    try {
      await logWater(amountMl / 1000, 'water'); // Convert ml to liters
      setProgress(getProgress());
      setCustomAmount('');

      // Success ripple animation
      Animated.sequence([
        Animated.spring(successAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(successAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Execute onSuccess and close modal only after success animation completes
        onSuccess?.();
        onClose();
      });
    } catch (err) {
      console.error('Failed to log water:', err);
      // Set a user-friendly error message
      setLocalError('Failed to log water. Please try again.'); // Use localError for API errors
      // Do not call onSuccess or onClose on error
    }
  };

  const dashboardData = queryClient.getQueryData(['dashboard']);
  const todayTotal = dashboardData?.today?.waterIntakeLiters || 0;
  const dailyGoal = parseFloat(dashboardData?.goals?.waterLiters || 2.0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        />
      </Pressable>

      {/* Modal Content */}
      <Animated.View
        style={[
          styles.modalContent,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>💧 Log Water Intake</Text>
          <Text style={styles.headerSubtitle}>
            {(todayTotal * 1000).toFixed(0)}ml / {(dailyGoal * 1000).toFixed(0)}ml today
          </Text>
        </View>

        {/* Water Wave Visualization */}
        <WaterWave progress={progress} todayTotal={todayTotal} dailyGoal={dailyGoal} />

        {/* Quick Add Buttons */}
        <View style={styles.presetsSection}>
          <Text style={styles.sectionTitle}>Quick Add</Text>
          <View style={styles.presetsRow}>
            {presets.map((preset) => (
              <QuickAddButton
                key={preset.label}
                preset={preset}
                onPress={handleQuickAdd}
                isLoading={isLogging}
              />
            ))}
          </View>
        </View>

        {/* Custom Amount */}
        <View style={styles.customSection}>
          <Text style={styles.sectionTitle}>Custom Amount</Text>

          {/* Quick increment buttons for fast logging */}
          <View style={styles.quickIncrementRow}>
            <Text style={styles.quickIncrementLabel}>Quick add:</Text>
            {[50, 100, 250].map((ml) => (
              <TouchableOpacity
                key={ml}
                style={styles.quickIncrementButton}
                onPress={() => {
                  const current = parseFloat(customAmount) || 0;
                  setCustomAmount(String(current + ml));
                }}
                disabled={isLogging}
              >
                <Text style={styles.quickIncrementText}>+{ml}ml</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.customInputRow}>
            <TextInput
              style={styles.customInput}
              placeholder="Enter ml"
              placeholderTextColor=TEXT.tertiary
              keyboardType="numeric"
              value={customAmount}
              onChangeText={setCustomAmount}
              editable={!isLogging}
            />
            <TouchableOpacity
              style={[
                styles.addButton,
                (!customAmount || isLogging) && styles.addButtonDisabled,
              ]}
              onPress={handleCustomAdd}
              disabled={!customAmount || isLogging}
            >
              {isLogging ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.addButtonText}>Add</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Error Display */}
        {(localError || hookError) && ( // Display local or hook error
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{localError || hookError?.message || 'An unexpected error occurred.'}</Text>
          </View>
        )}

        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>

        {/* Success overlay - shows on successful log */}
        <Animated.View
          style={[
            styles.successOverlay,
            {
              opacity: successAnim,
              transform: [
                {
                  scale: successAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.2],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.successIcon}>💧</Text>
          <Text style={styles.successText}>Logged!</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: TEXT.secondary,
  },
  waveContainer: {
    height: 200,
    backgroundColor: '#f0f9ff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    position: 'relative',
    borderWidth: 3,
    borderColor: '#bfdbfe',
  },
  waterFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#3b82f6',
    overflow: 'hidden',
  },
  wave: {
    position: 'absolute',
    top: -20,
    left: 0,
    width: width * 2,
    height: 40,
    borderRadius: 1000,
  },
  progressTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Premium volume display - concrete numbers, not just %
  progressVolume: {
    fontSize: 40,
    fontWeight: '800',
    color: '#1e40af',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  progressGoal: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  progressPercent: {
    fontSize: 18,
    color: '#0ea5e9',
    fontWeight: '700',
    marginTop: 4,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  presetsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.primary,
    marginBottom: 12,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  presetButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  presetIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  presetLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  presetAmount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  customSection: {
    marginBottom: 20,
  },
  // Quick increment buttons - no typing needed
  quickIncrementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  quickIncrementLabel: {
    fontSize: 13,
    color: TEXT.secondary,
    fontWeight: '600',
  },
  quickIncrementButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  quickIncrementText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '700',
  },
  customInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  customInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  addButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT.secondary,
  },
  // Success overlay - celebration moment
  successOverlay: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 20,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  successText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0ea5e9',
  },
  errorContainer: {
    backgroundColor: '#fee2e2', // Light red background
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444', // Darker red text
    fontWeight: '600',
    fontSize: 14,
  },
});
