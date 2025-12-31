import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, TextInput, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { convertUnit } from '../../constants/dailyValues'; // Import the unit conversion helper
import { IngredientsBreakdown } from './IngredientsBreakdown'; // 🆕 INGREDIENTS DISPLAY

// Assuming fonts are defined globally or passed as props
const fonts = {
  display: Platform.select({ ios: 'HelveticaNeue-Bold', android: 'Roboto-Bold', default: 'System' }),
  strong: Platform.select({ ios: 'HelveticaNeue-Medium', android: 'Roboto-Medium', default: 'System' }),
  regular: Platform.select({ ios: 'Helvetica Neue', android: 'Roboto', default: 'System' }),
};

// Helper to format nutrient values
const formatNutrient = (value, unit = '') => {
  if (value === undefined || value === null) return 'N/A';
  return `${value.toFixed(0)}${unit}`;
};

// Common units for selection
const COMMON_UNITS = [
  'g', 'kg', 'mg', 'µg', // Mass
  'ml', 'l', // Volume
  'cup', 'tbsp', 'tsp', // Common household volume
  'serving', 'unit', 'slice', 'piece', 'item', // Generic
];

// Helper to get source icon
const getSourceIcon = (source) => {
  if (source === 'Open Food Facts') {
    return { name: 'barcode-outline', color: '#22C55E' }; // Green for verified product
  }
  return { name: 'sparkles-outline', color: '#6B4EFF' }; // Purple for AI analysis
};


export function FoodItemsList({ items, onUpdateQuantity, onRemove, dailyValues }) {
  // Hooks must be called at the top level before any conditional returns
  const [editingUnitId, setEditingUnitId] = useState(null);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState('');

  if (!items || items.length === 0) {
    return null;
  }

  const renderMicronutrient = (microName, microData) => {
    // Ensure microData is an object with value and unit
    if (!microData || typeof microData.value !== 'number') return null;

    if (!microData || microData.value === 0) return null;

    const dv = dailyValues[microName.toLowerCase()]; // Get DV for this micronutrient
    let percentage = null;

    if (dv && dv.value > 0 && microData.value !== undefined && microData.value !== null) {
      // Attempt unit conversion if units don't match exactly
      const microAmountInDVUnit = convertUnit(microData.value, microData.unit, dv.unit);
      percentage = (microAmountInDVUnit / dv.value) * 100;
    }

    return (
      <View key={microName} style={styles.microItem}>
        <Text style={styles.microName}>{microName.charAt(0).toUpperCase() + microName.slice(1)}</Text>
        <View style={styles.microValueContainer}>
          <Text style={styles.microValue}>{formatNutrient(microData.value, microData.unit)}</Text>
          {percentage !== null && (
            <Text style={styles.microPercentage}>
              ({percentage.toFixed(0)}% DV)
            </Text>
          )}
        </View>
      </View>
    );
  };
  return (
    <View style={styles.listContainer}>
      <Text style={styles.listTitle}>Meal Breakdown</Text>
      {items.map((item, index) => (
        <View key={item.itemId || index} style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Ionicons
              name={getSourceIcon(item.sourceEvidence?.[0]?.source).name}
              size={20}
              color={getSourceIcon(item.sourceEvidence?.[0]?.source).color}
              style={styles.sourceIcon}
            />
            <TouchableOpacity onPress={() => onRemove(item.itemId)} style={styles.removeButton}>
              <Ionicons name="close-circle" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>

          <View style={styles.itemPortion}>
            <Text style={styles.portionLabel}>Portion:</Text>
            <TextInput
              style={styles.portionInput}
              keyboardType="numeric"
              value={String(item.portion?.amount || 1)}
              onChangeText={(text) => onUpdateQuantity(item.itemId, parseFloat(text || '0'), item.portion?.unit || 'serving')}
            />
            <TouchableOpacity
              style={styles.portionUnitButton}
              onPress={() => {
                setEditingUnitId(item.itemId);
                setSelectedUnit(item.portion?.unit || 'serving');
                setShowUnitPicker(true);
              }}
            >
              <Text style={styles.portionUnitText}>{item.portion?.unit || 'serving'}</Text>
              <Ionicons name="chevron-down-outline" size={14} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Unit Picker Modal */}
          <Modal visible={showUnitPicker && editingUnitId === item.itemId} transparent animationType="fade">
            <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowUnitPicker(false)}>
              <View style={styles.unitPickerContainer}>
                <FlatList
                  data={COMMON_UNITS}
                  keyExtractor={(unit) => unit}
                  renderItem={({ item: unit }) => (
                    <TouchableOpacity
                      style={styles.unitPickerItem}
                      onPress={() => {
                        onUpdateQuantity(editingUnitId, item.portion?.amount || 1, unit);
                        setShowUnitPicker(false);
                        setEditingUnitId(null);
                      }}
                    >
                      <Text style={styles.unitPickerItemText}>{unit}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </Modal>

          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Calories</Text>
              <Text style={styles.nutritionValue}>{formatNutrient(item.macros?.calories_kcal, 'kcal')}</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Protein</Text>
              <Text style={styles.nutritionValue}>{formatNutrient(item.macros?.protein_g, 'g')}</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Carbs</Text>
              <Text style={styles.nutritionValue}>{formatNutrient(item.macros?.carbs_g, 'g')}</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Fat</Text>
              <Text style={styles.nutritionValue}>{formatNutrient(item.macros?.fat_g, 'g')}</Text>
            </View>
          </View>

          {item.micros && Object.keys(item.micros).length > 0 && (
            <View style={styles.micronutrientsSection}>
              <View style={styles.micronutrientsHeader}>
                <Text style={styles.micronutrientsTitle}>Micronutrients</Text>
                <Text style={styles.micronutrientsNote}>Estimated</Text>
              </View>
              <View style={styles.micronutrientsGrid}>
                {Object.entries(item.micros).map(([key, value]) => renderMicronutrient(key, value))}
              </View>
            </View>
          )}

          {/* 🆕 INGREDIENTS BREAKDOWN - Shows individual ingredient nutrition from AI analysis */}
          {item.ingredients && item.ingredients.length > 0 && (
            <View style={styles.ingredientsSection}>
              <IngredientsBreakdown ingredients={item.ingredients} />
            </View>
          )}
        </View>
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
    color: '#1F2937',
    marginBottom: 15,
    fontFamily: fonts.display,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
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
    borderBottomColor: '#F3F4F6',
    paddingBottom: 10,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
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
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  portionLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
    fontFamily: fonts.regular,
  },
  portionInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    paddingVertical: 0, // Override default TextInput padding
    fontFamily: fonts.display,
  },
  portionUnitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    marginLeft: 8,
  },
  portionUnitText: {
    fontSize: 14,
    color: '#6B7280',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    maxHeight: 200,
    width: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  unitPickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  unitPickerItemText: {
    fontSize: 16,
    color: '#1F2937',
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
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontFamily: fonts.regular,
  },
  nutritionValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: fonts.strong,
  },
  micronutrientsSection: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
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
    color: '#1F2937',
    fontFamily: fonts.strong,
  },
  micronutrientsNote: {
    fontSize: 12,
    color: '#9CA3AF',
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
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  microName: {
    fontSize: 11,
    color: '#6B7280',
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
    color: '#1F2937',
    fontFamily: fonts.strong,
    marginRight: 4,
  },
  microPercentage: {
    fontSize: 10,
    color: '#4B5563',
    fontFamily: fonts.regular,
  },

  // 🆕 INGREDIENTS SECTION
  ingredientsSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
});
