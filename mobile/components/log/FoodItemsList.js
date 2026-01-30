import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FoodItemCard } from './FoodItemCard';
import { SURFACES, TEXT, TYPOGRAPHY } from '../../constants/premiumTheme';

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
    fontSize: TYPOGRAPHY.size.xl,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: 15,
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
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    flex: 1,
    marginRight: 10,
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
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginRight: 8,
  },
  portionInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    paddingVertical: 0,
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
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginRight: 4,
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
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.primary,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  nutritionItem: {
    width: '48%',
    marginBottom: 10,
    backgroundColor: SURFACES.background.secondary,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: SURFACES.divider,
  },
  nutritionLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginBottom: 4,
  },
  nutritionValue: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
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
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  micronutrientsNote: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  micronutrientsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  microItem: {
    width: '48%',
    marginBottom: 8,
    backgroundColor: SURFACES.background.secondary,
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: SURFACES.divider,
  },
  microName: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginBottom: 2,
  },
  microValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  microValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginRight: 4,
  },
  microPercentage: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },

  // INGREDIENTS SECTION
  ingredientsSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
});
