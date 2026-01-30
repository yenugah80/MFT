/**
 * GoalEditSheet
 * Premium bottom sheet for editing nutrition goals with elegant slider
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Animated,
  Dimensions,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  TEXT,
  BRAND,
  SURFACES,
  RADIUS,
  SPACING,
  SHADOWS,
  TYPOGRAPHY,
} from '../../constants/premiumTheme';

// Pure JS Slider Component (no native module required)
const JSSlider = ({ value, onValueChange, min, max, step, color, trackColor }) => {
  const [sliderWidth, setSliderWidth] = useState(0);
  const animatedValue = useRef(new Animated.Value(0)).current;

  const percentage = sliderWidth > 0 ? ((value - min) / (max - min)) : 0;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: percentage,
      duration: 50,
      useNativeDriver: false,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percentage]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX;
        updateValue(x);
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        updateValue(x);
      },
      onPanResponderRelease: () => {
        Haptics.selectionAsync();
      },
    })
  ).current;

  const updateValue = (x) => {
    if (sliderWidth === 0) return;

    const ratio = Math.max(0, Math.min(1, x / sliderWidth));
    const rawValue = min + ratio * (max - min);
    const steppedValue = Math.round(rawValue / step) * step;
    const clampedValue = Math.max(min, Math.min(max, steppedValue));

    // Round to appropriate decimal places based on step
    const decimalPlaces = step < 1 ? 1 : 0;
    const finalValue = Number(clampedValue.toFixed(decimalPlaces));

    onValueChange(finalValue);
  };

  const thumbPosition = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, sliderWidth - 24], // 24 = thumb width
  });

  const fillWidth = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={sliderStyles.container}
      onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
      {...panResponder.panHandlers}
    >
      {/* Track */}
      <View style={[sliderStyles.track, { backgroundColor: trackColor }]}>
        <Animated.View
          style={[
            sliderStyles.fill,
            { backgroundColor: color, width: fillWidth },
          ]}
        />
      </View>

      {/* Thumb */}
      <Animated.View
        style={[
          sliderStyles.thumb,
          { backgroundColor: color, left: thumbPosition },
        ]}
      >
        <View style={sliderStyles.thumbInner} />
      </Animated.View>
    </View>
  );
};

const sliderStyles = StyleSheet.create({
  container: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  thumbInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
});

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const GoalEditSheet = ({
  visible = false,
  onClose,
  onSave,
  label,
  currentValue,
  min = 0,
  max = 100,
  step = 1,
  unit,
  context,
  color = BRAND.primary,
}) => {
  // Ensure we have a valid number for the value
  const safeCurrentValue = typeof currentValue === 'number' && !isNaN(currentValue)
    ? currentValue
    : min;

  const [value, setValue] = useState(safeCurrentValue);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      setValue(safeCurrentValue);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, safeCurrentValue]);

  const handleValueChange = (newValue) => {
    setValue(newValue);
    Haptics.selectionAsync();
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const finalValue = step < 1 ? Math.round(value * 10) / 10 : Math.round(value);
    onSave?.(finalValue);
    onClose?.();
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose?.();
  };

  // Safe calculations with fallbacks
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : min;
  const displayValue = step < 1 ? safeValue.toFixed(1) : Math.round(safeValue);
  const range = max - min;
  const percentOfRange = range > 0 ? ((safeValue - min) / range) * 100 : 0;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Overlay */}
      <Animated.View
        style={[
          styles.overlay,
          { opacity: overlayAnim },
        ]}
      >
        <Pressable style={styles.overlayPressable} onPress={handleClose} />
      </Animated.View>

      {/* Bottom sheet */}
      <Animated.View
        style={[
          styles.sheetContainer,
          {
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
                <Ionicons name="create-outline" size={20} color={color} />
              </View>
              <View>
                <Text style={styles.headerTitle}>{label}</Text>
                {context && <Text style={styles.headerContext}>{context}</Text>}
              </View>
            </View>
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed,
              ]}
            >
              <Ionicons name="close" size={20} color={TEXT.tertiary} />
            </Pressable>
          </View>

          {/* Value Display */}
          <View style={styles.valueDisplay}>
            <LinearGradient
              colors={[`${color}10`, `${color}05`]}
              style={styles.valueGradient}
            >
              <Text style={[styles.displayValue, { color }]}>
                {displayValue}
              </Text>
              <Text style={[styles.displayUnit, { color: `${color}99` }]}>{unit}</Text>
            </LinearGradient>
          </View>

          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${percentOfRange}%`, backgroundColor: color },
                ]}
              />
            </View>
          </View>

          {/* Slider */}
          <View style={styles.sliderContainer}>
            <JSSlider
              value={safeValue}
              onValueChange={handleValueChange}
              min={min}
              max={max}
              step={step}
              color={color}
              trackColor={SURFACES.card.border}
            />

            {/* Min/Max labels */}
            <View style={styles.rangeLabels}>
              <Text style={styles.rangeLabel}>{min} {unit}</Text>
              <Text style={styles.rangeLabel}>{max} {unit}</Text>
            </View>
          </View>

          {/* Quick adjust buttons */}
          <View style={styles.quickAdjust}>
            <Text style={styles.quickAdjustLabel}>Quick adjust:</Text>
            <View style={styles.quickButtons}>
              {[-10, -5, 5, 10].map((delta) => {
                const newVal = value + delta * step;
                const isDisabled = newVal < min || newVal > max;
                return (
                  <Pressable
                    key={delta}
                    onPress={() => {
                      if (!isDisabled) {
                        const clamped = Math.max(min, Math.min(max, newVal));
                        setValue(clamped);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                    disabled={isDisabled}
                    style={({ pressed }) => [
                      styles.quickButton,
                      isDisabled && styles.quickButtonDisabled,
                      pressed && !isDisabled && styles.quickButtonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickButtonText,
                        isDisabled && styles.quickButtonTextDisabled,
                      ]}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.cancelButtonPressed,
              ]}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
              onPress={handleSave}
            >
              <LinearGradient
                colors={[color, color]}
                style={styles.saveButton}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Safe area spacing */}
          <View style={styles.bottomSpacer} />
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayPressable: {
    flex: 1,
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: SURFACES.background.secondary,
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    paddingHorizontal: SPACING[5],
    paddingTop: SPACING[2],
    ...SHADOWS.xl,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: SPACING[2],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: SURFACES.card.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING[4],
    paddingTop: SPACING[2],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: 2,
  },
  headerContext: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    maxWidth: 200,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SURFACES.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonPressed: {
    opacity: 0.7,
  },
  valueDisplay: {
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  valueGradient: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING[2],
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[6],
    borderRadius: RADIUS.xl,
  },
  displayValue: {
    fontSize: 56,
    fontFamily: TYPOGRAPHY.family.bold,
    letterSpacing: -2,
  },
  displayUnit: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  progressContainer: {
    marginBottom: SPACING[3],
  },
  progressTrack: {
    height: 6,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  sliderContainer: {
    marginBottom: SPACING[4],
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING[1],
  },
  rangeLabel: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.muted,
  },
  quickAdjust: {
    marginBottom: SPACING[5],
  },
  quickAdjustLabel: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
    marginBottom: SPACING[2],
  },
  quickButtons: {
    flexDirection: 'row',
    gap: SPACING[2],
  },
  quickButton: {
    flex: 1,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.md,
    backgroundColor: SURFACES.background.tertiary,
    alignItems: 'center',
  },
  quickButtonPressed: {
    backgroundColor: SURFACES.card.border,
  },
  quickButtonDisabled: {
    opacity: 0.4,
  },
  quickButtonText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },
  quickButtonTextDisabled: {
    color: TEXT.muted,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING[3] + 2,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: SURFACES.card.border,
    backgroundColor: SURFACES.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonPressed: {
    backgroundColor: SURFACES.background.tertiary,
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: SPACING[3] + 2,
    paddingHorizontal: SPACING[6],
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    minWidth: 140,
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
  },
  bottomSpacer: {
    height: SPACING[6],
  },
});

export default GoalEditSheet;
