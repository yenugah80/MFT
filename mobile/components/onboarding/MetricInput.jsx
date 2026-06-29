/**
 * MetricInput — "The Organic Editorial" Design System
 *
 * Input spec (DESIGN.md):
 *   - surface-container-lowest (#ffffff) background — inner-glow against green surfaces
 *   - No explicit border; ghost border at 15% opacity for focus/error
 *   - Label sits ABOVE the field, never inside as a placeholder
 *   - Error: #DC2626 text + 6% red tint on background
 *   - Unit toggle: pill group, background-only switching, zero borders
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Animated,
  StyleSheet,
} from 'react-native';
import { TYPOGRAPHY } from '../../constants/premiumTheme';

const DS = {
  surfLow:       '#FFFFFF',
  surfHigh:      '#F0F5F2',
  primary:       '#0F9B5E',
  onSurface:     '#111827',
  onSurfaceVar:  'rgba(17, 24, 39, 0.45)',
  outlineFocus:  'rgba(15, 155, 94, 0.30)',
  error:         '#DC2626',
  errorTint:     'rgba(220, 38, 38, 0.06)',
  ambientShadow: 'rgba(0, 0, 0, 0.06)',
};

const MetricInput = ({
  label,
  hint,
  value,
  onChangeValue,
  placeholder,
  keyboardType = 'numeric',
  units,
  selectedUnit,
  onUnitChange,
  error,
  min,
  max,
}) => {
  const [focused, setFocused] = useState(false);
  const borderOpacity = useRef(new Animated.Value(0)).current;

  const animateBorder = (to) =>
    Animated.spring(borderOpacity, {
      toValue: to,
      useNativeDriver: false,
      stiffness: 300,
      damping: 20,
    }).start();

  const handleChangeText = (text) => {
    const cleaned = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    onChangeValue(cleaned);
  };

  const isValid = () => {
    if (!value) return true;
    const n = parseFloat(value);
    if (min !== undefined && n < min) return false;
    if (max !== undefined && n > max) return false;
    return true;
  };

  const hasError = !!error && !isValid();

  const borderColor = borderOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', hasError ? DS.error : DS.outlineFocus],
  });

  return (
    <View style={styles.wrapper}>
      {/* Label — always above */}
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <View style={styles.row}>
        {/* White inner-glow input surface */}
        <Animated.View
          style={[
            styles.fieldSurface,
            hasError && styles.fieldSurfaceError,
            { borderColor },
          ]}
        >
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={handleChangeText}
            onFocus={() => { animateBorder(1); }}
            onBlur={() => { animateBorder(0); }}
            placeholder={placeholder}
            placeholderTextColor={DS.onSurfaceVar}
            keyboardType={keyboardType}
            returnKeyType="done"
            selectTextOnFocus
          />
        </Animated.View>

        {/* Unit pill — no borders, background-only switching */}
        {units && units.length > 0 && (
          <View style={styles.unitGroup}>
            {units.map((unit, idx) => {
              const isActive = selectedUnit === unit;
              return (
                <Pressable
                  key={unit}
                  onPress={() => onUnitChange?.(unit)}
                  style={[
                    styles.unitBtn,
                    isActive && styles.unitBtnActive,
                    idx === 0 && styles.unitBtnLeft,
                    idx === units.length - 1 && styles.unitBtnRight,
                  ]}
                >
                  <Text style={[styles.unitLabel, isActive && styles.unitLabelActive]}>
                    {unit}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {hasError && <Text style={styles.errorMsg}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: DS.onSurface,
    letterSpacing: -0.1,
  },
  hint: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: DS.onSurfaceVar,
    lineHeight: 17,
    marginTop: -2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  /* Light gray-green input surface — premium feel */
  fieldSurface: {
    flex: 1,
    backgroundColor: DS.surfHigh,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  fieldSurfaceError: {
    backgroundColor: DS.errorTint,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 22,
    fontFamily: TYPOGRAPHY.family.bold,
    color: DS.onSurface,
    minHeight: 54,
  },
  /* Unit group — segmented control pill */
  unitGroup: {
    flexDirection: 'row',
    backgroundColor: DS.surfHigh,
    borderRadius: 14,
    overflow: 'hidden',
  },
  unitBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitBtnActive: {
    backgroundColor: DS.primary,
  },
  unitBtnLeft: {
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  unitBtnRight: {
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
  },
  unitLabel: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: DS.onSurface,
  },
  unitLabelActive: {
    color: '#FFFFFF',
  },
  errorMsg: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.medium,
    color: DS.error,
  },
});

export default MetricInput;
