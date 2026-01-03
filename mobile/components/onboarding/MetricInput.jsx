/**
 * MetricInput
 * Input field with optional unit toggle and validation
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { TEXT, SURFACES, BRAND } from '../../constants/premiumTheme';

const MetricInput = ({
  label,
  hint,
  value,
  onChangeValue,
  placeholder,
  keyboardType = 'decimal-pad',
  units,
  selectedUnit,
  onUnitChange,
  error,
  min,
  max,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleChangeText = (text) => {
    // Only allow numbers and decimal point
    const cleanText = text.replace(/[^0-9.]/g, '');

    // Prevent multiple decimal points
    const parts = cleanText.split('.');
    if (parts.length > 2) return;

    onChangeValue(cleanText);
  };

  const isValid = () => {
    if (!value) return false;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return false;
    if (min !== undefined && numValue < min) return false;
    if (max !== undefined && numValue > max) return false;
    return true;
  };

  const showError = error && !isValid();

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      {hint && <Text style={styles.hint}>{hint}</Text>}

      <View style={styles.inputRow}>
        <View
          style={[
            styles.inputContainer,
            isFocused && styles.inputContainerFocused,
            showError && styles.inputContainerError,
          ]}
        >
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={handleChangeText}
            placeholder={placeholder}
            placeholderTextColor={TEXT.muted}
            keyboardType={keyboardType}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            maxLength={10}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="done"
            selectTextOnFocus
          />
        </View>

        {units && selectedUnit && (
          <View style={styles.unitContainer}>
            {units.map((unit) => (
              <Pressable
                key={unit}
                onPress={() => onUnitChange?.(unit)}
                style={[
                  styles.unitButton,
                  selectedUnit === unit && styles.unitButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.unitText,
                    selectedUnit === unit && styles.unitTextActive,
                  ]}
                >
                  {unit}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {showError && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
    marginBottom: 6,
  },
  hint: {
    fontSize: 12,
    fontWeight: '400',
    color: TEXT.tertiary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.background.secondary,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: SURFACES.card.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputContainerFocused: {
    borderColor: BRAND.primary,
    backgroundColor: 'rgba(107, 78, 255, 0.02)',
  },
  inputContainerError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.02)',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: TEXT.primary,
    paddingVertical: 4,
    minHeight: 28,
  },
  unitContainer: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: 8,
    padding: 4,
  },
  unitButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  unitButtonActive: {
    backgroundColor: SURFACES.background.secondary,
  },
  unitText: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT.tertiary,
  },
  unitTextActive: {
    color: BRAND.primary,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#EF4444',
    marginTop: 6,
  },
});

export default MetricInput;
