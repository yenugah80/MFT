/**
 * MetricInput — "The Organic Editorial" Design System
 *
 * Input spec (DESIGN.md):
 *   - surface-container-lowest (#ffffff) background — inner-glow against green surfaces
 *   - No explicit border; ghost border at 15% opacity for focus/error
 *   - Label sits ABOVE the field, never inside as a placeholder
 *   - Error: #aa371c text + 5% error-container tint on background
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
  surfLow:       '#ffffff',
  surfHigh:      '#beeec8',
  primary:       '#1c6d25',
  onSurface:     '#0e3a20',
  onSurfaceVar:  'rgba(14, 58, 32, 0.50)',
  outlineFocus:  'rgba(28, 109, 37, 0.30)',
  error:         '#aa371c',
  errorTint:     'rgba(170, 55, 28, 0.05)',
  ambientShadow: 'rgba(14, 58, 32, 0.06)',
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
  /* White inner-glow surface */
  fieldSurface: {
    flex: 1,
    backgroundColor: DS.surfLow,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: DS.ambientShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
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
  /* Unit group — contained pill, no borders */
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
    color: '#ffffff',
  },
  errorMsg: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.medium,
    color: DS.error,
  },
});

export default MetricInput;
