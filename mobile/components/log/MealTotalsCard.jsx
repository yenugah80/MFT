/**
 * MealTotalsCard Component
 * Shows aggregated nutrition for entire meal + save button
 */

import React, { useState } from 'react';
import { TEXT, SURFACES } from '../../constants/premiumTheme';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

/**
 * Macro bar chart component
 * FIXED: Now calculates percentages by CALORIES (not grams)
 * Industry standard: Protein 4cal/g, Carbs 4cal/g, Fat 9cal/g
 */
function MacroBar({ protein, carbs, fat }) {
  const p = Number(protein) || 0;
  const c = Number(carbs) || 0;
  const f = Number(fat) || 0;

  // Convert grams to calories using Atwater factors
  const proteinCal = p * 4;
  const carbsCal = c * 4;
  const fatCal = f * 9;
  const totalCal = proteinCal + carbsCal + fatCal || 1;

  // Calculate percentages by calories (industry standard)
  const proteinPct = (proteinCal / totalCal) * 100;
  const carbsPct = (carbsCal / totalCal) * 100;
  const fatPct = (fatCal / totalCal) * 100;

  return (
    <View style={styles.macroBarContainer}>
      <View style={styles.macroBar}>
        <View style={[styles.macroSegment, styles.proteinSegment, { flex: proteinPct || 0.1 }]} />
        <View style={[styles.macroSegment, styles.carbsSegment, { flex: carbsPct || 0.1 }]} />
        <View style={[styles.macroSegment, styles.fatSegment, { flex: fatPct || 0.1 }]} />
      </View>
      <View style={styles.macroLegend}>
        <LegendItem color="#3B82F6" label="P" value={`${Math.round(proteinPct)}%`} />
        <LegendItem color="#10B981" label="C" value={`${Math.round(carbsPct)}%`} />
        <LegendItem color="#F59E0B" label="F" value={`${Math.round(fatPct)}%`} />
      </View>
    </View>
  );
}

function LegendItem({ color, label, value }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

/**
 * MealTotalsCard Component
 */
export function MealTotalsCard({ totals, itemCount, onSave }) {
  const [isSaving, setIsSaving] = useState(false);

  if (!totals) return null;

  const handleSave = async () => {
    if (isSaving || !onSave) return;

    setIsSaving(true);
    try {
      await onSave();
    } catch (error) {
      console.error('[MealTotalsCard] Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const macros = totals.macros || {};
  const calories = Math.round(macros.calories_kcal || 0);
  const protein = Math.round(macros.protein_g || 0);
  const carbs = Math.round(macros.carbs_g || 0);
  const fat = Math.round(macros.fat_g || 0);
  const fiber = Math.round(macros.fiber_g || 0);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Meal Total</Text>
        <View style={styles.itemCountBadge}>
          <Text style={styles.itemCountText}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</Text>
        </View>
      </View>

      {/* Large Calorie Display */}
      <View style={styles.caloriesContainer}>
        <Text style={styles.totalCalories}>{calories}</Text>
        <Text style={styles.caloriesLabel}>calories</Text>
      </View>

      {/* Macro Bar Chart */}
      <MacroBar protein={protein} carbs={carbs} fat={fat} />

      {/* Macro Grid */}
      <View style={styles.macroGrid}>
        <MacroBox label="Protein" value={protein} unit="g" color="#3B82F6" />
        <MacroBox label="Carbs" value={carbs} unit="g" color="#10B981" />
        <MacroBox label="Fat" value={fat} unit="g" color="#F59E0B" />
        <MacroBox label="Fiber" value={fiber} unit="g" color="#8B5CF6" />
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={isSaving}
        accessible
        accessibilityLabel="Save meal"
        accessibilityHint={`Save ${itemCount} items to food log`}
      >
        {isSaving ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.saveButtonText}>Save Meal</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function MacroBox({ label, value, unit, color }) {
  return (
    <View style={styles.macroBox}>
      <Text style={styles.macroBoxLabel}>{label}</Text>
      <View style={styles.macroBoxValueRow}>
        <Text style={[styles.macroBoxValue, { color }]}>{value}</Text>
        <Text style={styles.macroBoxUnit}>{unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginVertical: 16,
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#6B4EFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  itemCountBadge: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  itemCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B4EFF',
  },
  caloriesContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  totalCalories: {
    fontSize: 56,
    fontWeight: '800',
    color: '#6B4EFF',
    lineHeight: 64,
  },
  caloriesLabel: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  macroBarContainer: {
    marginBottom: 20,
  },
  macroBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  macroSegment: {
    height: '100%',
  },
  proteinSegment: {
    backgroundColor: '#3B82F6',
  },
  carbsSegment: {
    backgroundColor: '#10B981',
  },
  fatSegment: {
    backgroundColor: '#F59E0B',
  },
  macroLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 13,
    color: TEXT.primary,
    fontWeight: '600',
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  macroBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: SURFACES.divider,
  },
  macroBoxLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  macroBoxValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  macroBoxValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  macroBoxUnit: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  saveButton: {
    backgroundColor: '#6B4EFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0.1,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
