/**
 * ChipSelector — "The Organic Editorial" Design System
 *
 * Chip spec (DESIGN.md):
 *   - surface-container-highest (#beeec8) background — unselected
 *   - tertiary-container (#feb64c) background — selected (warm sun-kissed)
 *   - Zero borders — tonal background shift is the only selection signal
 *   - Spring animation: stiffness 300, damping 20
 *   - Ambient shadow on selected: 6% on-surface opacity
 */

import React from 'react';
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { TYPOGRAPHY } from '../../constants/premiumTheme';

const DS = {
  surfContainerHi: '#beeec8',    // unselected chip background
  tertiary:        '#feb64c',    // selected chip background (tertiary-container)
  onSurface:       '#0e3a20',    // unselected text
  onTertiary:      '#3d2200',    // selected text (warm dark amber)
  ambientShadow:   'rgba(14, 58, 32, 0.06)',
};

const ChipSelector = ({
  title,
  items,
  selectedItems = [],
  onSelectionChange,
  multiSelect = true,
  renderLabel,
}) => {
  const getItemId = (item) => {
    if (!item) return '';
    return typeof item === 'string' ? item : (item.id || '');
  };

  const isItemSelected = (itemId) =>
    selectedItems.some(s => getItemId(s) === itemId);

  const [animScales] = React.useState(() =>
    items.reduce((acc, item) => {
      acc[item.id] = new Animated.Value(1);
      return acc;
    }, {}),
  );

  React.useEffect(() => {
    items.forEach((item) => {
      if (!animScales[item.id]) {
        animScales[item.id] = new Animated.Value(1);
      }
    });
  }, [items, animScales]);

  const toggleItem = (itemId) => {
    let newSelection;
    if (multiSelect) {
      newSelection = isItemSelected(itemId)
        ? selectedItems.filter(item => getItemId(item) !== itemId)
        : [...selectedItems, itemId];
    } else {
      newSelection = isItemSelected(itemId) ? [] : [itemId];
    }
    onSelectionChange(newSelection);
  };

  const handlePressIn = (itemId) => {
    Animated.spring(animScales[itemId], {
      toValue: 0.93,
      useNativeDriver: true,
      stiffness: 300,
      damping: 20,
    }).start();
  };

  const handlePressOut = (itemId) => {
    Animated.spring(animScales[itemId], {
      toValue: 1,
      useNativeDriver: true,
      stiffness: 300,
      damping: 20,
    }).start();
  };

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}

      <View style={styles.grid}>
        {items.map((item) => {
          const isSelected = isItemSelected(item.id);
          const scale = animScales[item.id] || new Animated.Value(1);

          return (
            <Animated.View
              key={item.id}
              style={[styles.chipWrap, { transform: [{ scale }] }]}
            >
              <Pressable
                onPress={() => toggleItem(item.id)}
                onPressIn={() => handlePressIn(item.id)}
                onPressOut={() => handlePressOut(item.id)}
                style={[
                  styles.chip,
                  isSelected ? styles.chipSelected : styles.chipUnselected,
                ]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={item.label}
              >
                {item.emoji ? (
                  <Text style={styles.emoji}>{item.emoji}</Text>
                ) : null}
                <Text style={[
                  styles.label,
                  isSelected ? styles.labelSelected : styles.labelUnselected,
                ]}>
                  {renderLabel ? renderLabel(item) : item.label}
                </Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: DS.onSurface,
    letterSpacing: -0.1,
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chipWrap: {
    /* sizing managed by chip itself */
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  chipUnselected: {
    backgroundColor: DS.surfContainerHi,
    shadowColor: DS.ambientShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 1,
  },
  chipSelected: {
    backgroundColor: DS.tertiary,
    shadowColor: DS.onSurface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  labelUnselected: {
    color: DS.onSurface,
  },
  labelSelected: {
    color: DS.onTertiary,
    fontFamily: TYPOGRAPHY.family.bold,
  },
});

export default ChipSelector;
