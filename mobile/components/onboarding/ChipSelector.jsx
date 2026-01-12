/**
 * ChipSelector
 * Multi-select chip component with emoji icons and semantic colors
 */

import React from 'react';
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  FlatList,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, BRAND, SURFACES, RADIUS, SPACING, SHADOWS , SEMANTIC_ACTIONS } from '../../constants/premiumTheme';

const ChipSelector = ({
  title,
  items,
  selectedItems = [],
  onSelectionChange,
  multiSelect = true,
  renderLabel,
, SEMANTIC_ACTIONS }) => {
  // Helper to extract ID from string or object format
  const getItemId = (item) => {
    if (!item) return '';
    return typeof item === 'string' ? item : (item.id || '');
  };

  // Helper to check if an item is selected (handles both string and object formats)
  const isItemSelected = (itemId) => {
    return selectedItems.some(selected => getItemId(selected) === itemId);
  };

  // Use useState to ensure animScales updates when items change
  const [animScales] = React.useState(() =>
    items.reduce((acc, item) => {
      acc[item.id] = new Animated.Value(1);
      return acc;
    }, {}),
  );

  // Sync animScales with items when they change
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
      // Multi-select mode - filter by ID comparison
      if (isItemSelected(itemId)) {
        newSelection = selectedItems.filter((item) => getItemId(item) !== itemId);
      } else {
        newSelection = [...selectedItems, itemId];
      }
    } else {
      // Single-select mode
      newSelection = isItemSelected(itemId) ? [] : [itemId];
    }

    onSelectionChange(newSelection);
  };

  const handlePressIn = (itemId) => {
    Animated.spring(animScales[itemId], {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 15,
    }).start();
  };

  const handlePressOut = (itemId) => {
    Animated.spring(animScales[itemId], {
      toValue: 1,
      useNativeDriver: true,
      speed: 15,
    }).start();
  };

  const renderChip = ({ item }) => {
    const isSelected = isItemSelected(item.id);
    const scale = animScales[item.id] || new Animated.Value(1);
    const itemColor = item.color || BRAND.primary;

    return (
      <Animated.View
        style={{
          transform: [{ scale }],
        }}
      >
        <Pressable
          onPress={() => toggleItem(item.id)}
          onPressIn={() => handlePressIn(item.id)}
          onPressOut={() => handlePressOut(item.id)}
          style={[
            styles.chip,
            isSelected && [
              styles.chipSelected,
              {
                borderColor: itemColor,
                backgroundColor: itemColor,
              },
            ],
          ]}
        >
          <View style={styles.chipContent}>
            {item.emoji && (
              <Text style={styles.chipEmoji}>{item.emoji}</Text>
            )}
            <Text
              style={[
                styles.chipLabel,
                isSelected && [styles.chipLabelSelected, { color: '#FFFFFF' }],
              ]}
            >
              {renderLabel ? renderLabel(item) : item.label}
            </Text>
            {isSelected && (
              <View style={styles.checkmarkBadge}>
                <Ionicons name="checkmark" size={14} color="white" />
              </View>
            )}
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <FlatList
        data={items}
        renderItem={renderChip}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING[5],
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.primary,
    marginBottom: SPACING[4],
  },
  row: {
    gap: SPACING[2],
  },
  listContent: {
    gap: SPACING[2],
  },
  chip: {
    flex: 1,
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderColor: `${SEMANTIC_ACTIONS.success}33`,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[4],
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  chipSelected: {
    borderWidth: 2,
    ...SHADOWS.md,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    justifyContent: 'center',
  },
  chipEmoji: {
    fontSize: 18,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
    textAlign: 'center',
    flexShrink: 1,
  },
  chipLabelSelected: {
    fontWeight: '700',
  },
  checkmarkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChipSelector;
