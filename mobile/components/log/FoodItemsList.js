import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { FoodItemCard } from './FoodItemCard'; // 🆕 Use rich item card
import { SURFACES, TEXT } from '../../constants/premiumTheme';

// Assuming fonts are defined globally or passed as props
const fonts = {
  display: Platform.select({ ios: 'HelveticaNeue-Bold', android: 'Roboto-Bold', default: 'System' }),
  strong: Platform.select({ ios: 'HelveticaNeue-Medium', android: 'Roboto-Medium', default: 'System' }),
  regular: Platform.select({ ios: 'Helvetica Neue', android: 'Roboto', default: 'System' }),
};

export function FoodItemsList({ items, onUpdateQuantity, onRemove, onRemoveIngredient }) {

  // 🔍 Debug: Log items to detect duplicates
  console.log('[FoodItemsList] Rendering', items?.length, 'items');

  if (!items || items.length === 0) {
    return null;
  }

  // 🆕 DEDUPLICATION: Remove duplicate items by itemId or similar name
  const deduplicatedItems = items.reduce((acc, item, idx) => {
    // Check if item with same ID already exists
    const existingById = acc.find(i => i.itemId && i.itemId === item.itemId);
    if (existingById) {
      console.warn(`[FoodItemsList] Removing duplicate by ID: ${item.itemId}`);
      return acc;
    }

    // Check if item with very similar name already exists (case-insensitive)
    const itemNameLower = (item.name || '').toLowerCase().trim();
    const existingByName = acc.find(i => {
      const existingNameLower = (i.name || '').toLowerCase().trim();
      return existingNameLower === itemNameLower;
    });
    if (existingByName) {
      console.warn(`[FoodItemsList] Removing duplicate by name: "${item.name}"`);
      return acc;
    }

    // Ensure unique itemId
    const uniqueItem = {
      ...item,
      itemId: item.itemId || `item-${idx}-${Date.now()}`,
    };

    return [...acc, uniqueItem];
  }, []);

  console.log('[FoodItemsList] After deduplication:', deduplicatedItems.length, 'items');
  deduplicatedItems.forEach((item, idx) => {
    console.log(`[FoodItemsList] Item ${idx}: id=${item.itemId}, name="${item.name}", cal=${item.macros?.calories_kcal}`);
  });

  // 🆕 Use FoodItemCard for rich display with all features
  return (
    <View style={styles.listContainer}>
      <Text style={styles.listTitle}>Meal Breakdown</Text>
      {deduplicatedItems.map((item) => (
        <FoodItemCard
          key={item.itemId}
          item={item}
          onUpdateQuantity={(itemId, amount, unit) => onUpdateQuantity(itemId, amount, unit)}
          onRemove={() => onRemove(item.itemId)}
          onRemoveIngredient={onRemoveIngredient}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    marginBottom: 20,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT.primary,
    marginBottom: 15,
    fontFamily: fonts.display,
  },
  itemCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: TEXT.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.divider,
    paddingBottom: 10,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT.primary,
    flex: 1,
    marginRight: 10,
    fontFamily: fonts.strong,
  },
  sourceIcon: {
    marginLeft: 8,
    marginRight: 4,
  },
  removeButton: {
    padding: 5,
  },
  itemPortion: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: SURFACES.background.secondary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: SURFACES.divider,
  },
  portionLabel: {
    fontSize: 14,
    color: TEXT.secondary,
    marginRight: 8,
    fontFamily: fonts.regular,
  },
  portionInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: TEXT.primary,
    paddingVertical: 0, // Override default TextInput padding
    fontFamily: fonts.display,
  },
  portionUnitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: SURFACES.divider,
    marginLeft: 8,
  },
  portionUnitText: {
    fontSize: 14,
    color: TEXT.secondary,
    marginRight: 4,
    fontFamily: fonts.regular,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitPickerContainer: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: 10,
    maxHeight: 200,
    width: 150,
    shadowColor: TEXT.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  unitPickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.divider,
  },
  unitPickerItemText: {
    fontSize: 16,
    color: TEXT.primary,
    fontFamily: fonts.regular,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  nutritionItem: {
    width: '48%', // Two columns
    marginBottom: 10,
    backgroundColor: SURFACES.background.secondary,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: SURFACES.divider,
  },
  nutritionLabel: {
    fontSize: 12,
    color: TEXT.secondary,
    marginBottom: 4,
    fontFamily: fonts.regular,
  },
  nutritionValue: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT.primary,
    fontFamily: fonts.strong,
  },
  micronutrientsSection: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
    paddingTop: 15,
  },
  micronutrientsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  micronutrientsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.primary,
    fontFamily: fonts.strong,
  },
  micronutrientsNote: {
    fontSize: 12,
    color: TEXT.tertiary,
    fontFamily: fonts.regular,
  },
  micronutrientsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  microItem: {
    width: '48%', // Two columns
    marginBottom: 8,
    backgroundColor: SURFACES.background.secondary,
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: SURFACES.divider,
  },
  microName: {
    fontSize: 11,
    color: TEXT.secondary,
    marginBottom: 2,
    fontFamily: fonts.regular,
  },
  microValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  microValue: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT.primary,
    fontFamily: fonts.strong,
    marginRight: 4,
  },
  microPercentage: {
    fontSize: 10,
    color: TEXT.secondary,
    fontFamily: fonts.regular,
  },

  // 🆕 INGREDIENTS SECTION
  ingredientsSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
});
