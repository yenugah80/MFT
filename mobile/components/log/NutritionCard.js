import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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

export function NutritionCard({ foodLog, onSave, onCancel, dailyValues }) {
  if (!foodLog) {
    return null;
  }

  const {
    foodName,
    servingSize,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    netCarbs,
    micronutrients, // This is an array of { name, amount, unit }
  } = foodLog;

  const renderMicronutrient = (micro) => {
    const dv = dailyValues[micro.name.toLowerCase()]; // Get DV for this micronutrient
    let percentage = null;

    if (dv && dv.value > 0 && micro.amount !== undefined && micro.amount !== null) {
      // Attempt unit conversion if units don't match exactly
      let microAmountInDVUnit = micro.amount;
      if (micro.unit && dv.unit && micro.unit !== dv.unit) {
        // This is a simplified conversion. A robust solution would need a dedicated unit conversion utility.
        if (micro.unit === 'mg' && dv.unit === 'µg') {
          microAmountInDVUnit = micro.amount * 1000;
        } else if (micro.unit === 'µg' && dv.unit === 'mg') {
          microAmountInDVUnit = micro.amount / 1000;
        } else {
          // Fallback or warning if units don't match and no conversion is known
          console.warn(`[NutritionCard] Unit mismatch for ${micro.name}: foodLog unit '${micro.unit}', DV unit '${dv.unit}'. No conversion applied.`);
        }
      }
      percentage = (microAmountInDVUnit / dv.value) * 100;
    }

    return (
      <View key={micro.name} style={styles.microItem}>
        <Text style={styles.microName}>{micro.name}</Text>
        <View style={styles.microValueContainer}>
          <Text style={styles.microValue}>{formatNutrient(micro.amount, micro.unit)}</Text>
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
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="nutrition-outline" size={28} color="#6B4EFF" />
        <View>
          <Text style={styles.foodName}>{foodName}</Text>
          <Text style={styles.servingSize}>{servingSize}</Text>
        </View>
      </View>

      <View style={styles.nutritionGrid}>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Calories</Text>
          <Text style={styles.nutritionValue}>{formatNutrient(calories, 'kcal')}</Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Protein</Text>
          <Text style={styles.nutritionValue}>{formatNutrient(protein, 'g')}</Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Carbs</Text>
          <Text style={styles.nutritionValue}>{formatNutrient(carbs, 'g')}</Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Fat</Text>
          <Text style={styles.nutritionValue}>{formatNutrient(fat, 'g')}</Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Fiber</Text>
          <Text style={styles.nutritionValue}>{formatNutrient(fiber, 'g')}</Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Sugar</Text>
          <Text style={styles.nutritionValue}>{formatNutrient(sugar, 'g')}</Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Net Carbs</Text>
          <Text style={styles.nutritionValue}>{formatNutrient(netCarbs, 'g')}</Text>
        </View>
      </View>

      {micronutrients && micronutrients.length > 0 && (
        <View style={styles.micronutrientsSection}>
          <Text style={styles.micronutrientsTitle}>Micronutrients</Text>
          <View style={styles.micronutrientsGrid}>
            {micronutrients.map(renderMicronutrient)}
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={() => onSave(foodLog)}>
          <LinearGradient
            colors={['#6B4EFF', '#8B6EFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveButtonGradient}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Log Meal</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 16,
  },
  foodName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: fonts.display,
  },
  servingSize: {
    fontSize: 15,
    color: '#6B7280',
    fontFamily: fonts.regular,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  nutritionItem: {
    width: '48%', // Roughly two columns
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  nutritionLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
    fontFamily: fonts.strong,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: fonts.display,
  },
  micronutrientsSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  micronutrientsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 15,
    fontFamily: fonts.strong,
  },
  micronutrientsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  microItem: {
    width: '48%', // Two columns
    marginBottom: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  microName: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
    fontFamily: fonts.strong,
  },
  microValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  microValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: fonts.display,
    marginRight: 4,
  },
  microPercentage: {
    fontSize: 11,
    color: '#4B5563',
    fontFamily: fonts.regular,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    fontFamily: fonts.strong,
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: fonts.display,
  },
});