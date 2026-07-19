/**
 * MetricInput — warm-cream / deep-green editorial input
 * (matches the brand established in components/auth)
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Animated,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AUTH_COLORS } from '../auth/constants';

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
  icon,
  iconColor = AUTH_COLORS.primary,
  iconBg,
}) => {
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
    outputRange: ['transparent', hasError ? AUTH_COLORS.danger : 'rgba(107, 78, 255, 0.30)'],
  });

  return (
    <View style={styles.wrapper}>
      {/* Label — always above */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>

      <View style={styles.row}>
        {!!icon && (
          <View style={[styles.iconBubble, { backgroundColor: iconBg || `${iconColor}16` }]}>
            <Ionicons name={icon} size={15} color={iconColor} />
          </View>
        )}

        {/* Input surface */}
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
            placeholderTextColor={AUTH_COLORS.muted}
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  label: {
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
    color: AUTH_COLORS.ink,
    letterSpacing: -0.1,
  },
  hint: {
    fontSize: 10,
    fontFamily: 'DMSans_400Regular',
    color: AUTH_COLORS.muted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  fieldSurface: {
    flex: 1,
    backgroundColor: 'rgba(107, 78, 255, 0.05)',
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  fieldSurfaceError: {
    backgroundColor: AUTH_COLORS.dangerBg,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: AUTH_COLORS.ink,
    minHeight: 38,
  },
  /* Unit group — segmented control pill */
  unitGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(107, 78, 255, 0.05)',
    borderRadius: 11,
    overflow: 'hidden',
  },
  unitBtn: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitBtnActive: {
    backgroundColor: AUTH_COLORS.primary,
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
    fontSize: 11,
    fontFamily: 'DMSans_700Bold',
    color: AUTH_COLORS.ink,
  },
  unitLabelActive: {
    color: '#FFFFFF',
  },
  errorMsg: {
    fontSize: 10,
    fontFamily: 'DMSans_500Medium',
    color: AUTH_COLORS.danger,
    marginLeft: 42,
  },
});

export default MetricInput;
