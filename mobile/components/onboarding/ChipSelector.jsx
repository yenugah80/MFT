/**
 * ChipSelector — warm-cream / deep-green editorial chip
 * (matches the brand established in components/auth)
 */

import React from 'react';
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { AUTH_COLORS } from '../auth/constants';

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
    fontFamily: 'DMSans_700Bold',
    color: AUTH_COLORS.ink,
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
    backgroundColor: 'rgba(107, 78, 255, 0.05)',
  },
  chipSelected: {
    backgroundColor: AUTH_COLORS.primary,
    shadowColor: AUTH_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
  },
  labelUnselected: {
    color: AUTH_COLORS.ink,
  },
  labelSelected: {
    color: AUTH_COLORS.white,
  },
});

export default ChipSelector;
