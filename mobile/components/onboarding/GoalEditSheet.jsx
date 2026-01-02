/**
 * GoalEditSheet
 * Bottom sheet for editing nutrition goals with sliders
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Slider,
  Modal,
  Animated,
} from 'react-native';
import { TEXT, BRAND, SURFACES } from '../../constants/premiumTheme';

const GoalEditSheet = ({
  visible = false,
  onClose,
  onSave,
  label,
  currentValue,
  min,
  max,
  step = 1,
  unit,
  context,
}) => {
  const [value, setValue] = useState(currentValue);
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: false,
        speed: 15,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: false,
        speed: 15,
      }).start();
    }
  }, [visible]);

  const handleSave = () => {
    onSave?.(Math.round(value));
    onClose?.();
  };

  const slideY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Overlay */}
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        activeOpacity={0.5}
      />

      {/* Bottom sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY: slideY }],
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{label}</Text>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.closePressed}
          >
            <Text style={styles.closeIcon}>×</Text>
          </Pressable>
        </View>

        {context && <Text style={styles.context}>{context}</Text>}

        {/* Current value display */}
        <View style={styles.valueDisplay}>
          <Text style={styles.displayValue}>
            {Math.round(value)}
          </Text>
          {unit && <Text style={styles.displayUnit}>{unit}</Text>}
        </View>

        {/* Slider */}
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={min}
            maximumValue={max}
            step={step}
            value={value}
            onValueChange={setValue}
            minimumTrackTintColor={BRAND.primary}
            maximumTrackTintColor={SURFACES.card.border}
            thumbTintColor={BRAND.primary}
          />

          {/* Min/Max labels */}
          <View style={styles.rangeLabels}>
            <Text style={styles.rangeLabel}>{min}</Text>
            <Text style={styles.rangeLabel}>{max}</Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.cancelButtonPressed,
            ]}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
            ]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </Pressable>
        </View>

        {/* Safe area spacing */}
        <View style={styles.bottomSpacer} />
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    backgroundColor: SURFACES.background.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    minHeight: 360,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT.primary,
  },
  closeIcon: {
    fontSize: 32,
    fontWeight: '400',
    color: TEXT.tertiary,
  },
  closePressed: {
    opacity: 0.6,
  },
  context: {
    fontSize: 13,
    fontWeight: '400',
    color: TEXT.tertiary,
    marginBottom: 16,
    lineHeight: 18,
  },
  valueDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: 8,
    paddingVertical: 20,
    marginBottom: 12,
  },
  displayValue: {
    fontSize: 48,
    fontWeight: '700',
    color: BRAND.primary,
    lineHeight: 56,
  },
  displayUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT.tertiary,
  },
  sliderContainer: {
    marginBottom: 28,
  },
  slider: {
    height: 40,
    marginBottom: 8,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT.tertiary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: SURFACES.card.border,
    backgroundColor: SURFACES.background.primary,
    alignItems: 'center',
  },
  cancelButtonPressed: {
    backgroundColor: SURFACES.card.border,
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: BRAND.primary,
    alignItems: 'center',
  },
  saveButtonPressed: {
    backgroundColor: BRAND.primaryDark,
    opacity: 0.9,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomSpacer: {
    height: 20,
  },
});

export default GoalEditSheet;
