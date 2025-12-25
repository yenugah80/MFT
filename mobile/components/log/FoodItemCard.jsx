/**
 * FoodItemCard Component
 * Individual food item with editable quantity for multi-item breakdowns
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';

/**
 * Unit picker options
 */
const UNITS = ['g', 'kg', 'oz', 'lb', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'serving'];

/**
 * FoodItemCard Component
 */
export function FoodItemCard({ item, onUpdateQuantity, onRemove }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingQuantity, setEditingQuantity] = useState(false);
  const [amount, setAmount] = useState(item.portion?.amount?.toString() || '1');
  const [unit, setUnit] = useState(item.portion?.unit || 'g');
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);

  if (!item) return null;

  const handleApplyQuantity = () => {
    const numAmount = parseFloat(amount) || 1;
    onUpdateQuantity(item.itemId, numAmount, unit);
    setEditingQuantity(false);
  };

  const handleCancelEdit = () => {
    setAmount(item.portion?.amount?.toString() || '1');
    setUnit(item.portion?.unit || 'g');
    setEditingQuantity(false);
  };

  // Get confidence color
  const confidence = item.sourceEvidence?.[0]?.confidence || 0.5;
  const confidenceColor = confidence >= 0.7 ? '#10B981' : confidence >= 0.5 ? '#F59E0B' : '#EF4444';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.foodName} numberOfLines={2}>
          {item.name}
        </Text>
        <TouchableOpacity
          onPress={onRemove}
          style={styles.removeButton}
          accessible
          accessibilityLabel="Remove item"
        >
          <Text style={styles.removeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Portion Editor */}
      <View style={styles.portionRow}>
        {editingQuantity ? (
          <View style={styles.editingRow}>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              style={styles.quantityInput}
              placeholder="Amount (e.g., 150)"
              accessible
              accessibilityLabel="Quantity amount"
            />
            <TouchableOpacity
              style={styles.unitButton}
              onPress={() => setUnitPickerVisible(!unitPickerVisible)}
            >
              <Text style={styles.unitButtonText}>{unit}</Text>
              <Text style={styles.unitButtonArrow}>▼</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApplyQuantity}
            >
              <Text style={styles.applyButtonText}>✓</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelEdit}
            >
              <Text style={styles.cancelButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.portionButton}
            onPress={() => setEditingQuantity(true)}
            accessible
            accessibilityLabel="Edit portion size"
          >
            <Text style={styles.portionText}>
              {item.portion?.amount}{item.portion?.unit} • Tap to edit
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Unit Picker */}
      {editingQuantity && unitPickerVisible && (
        <View style={styles.unitPicker}>
          {UNITS.map(u => (
            <TouchableOpacity
              key={u}
              style={[styles.unitOption, unit === u && styles.unitOptionSelected]}
              onPress={() => {
                setUnit(u);
                setUnitPickerVisible(false);
              }}
            >
              <Text style={[styles.unitOptionText, unit === u && styles.unitOptionTextSelected]}>
                {u}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Quick Macros Summary */}
      <View style={styles.macrosRow}>
        <View style={styles.caloriesBadge}>
          <Text style={styles.caloriesText}>{Math.round(item.macros?.calories_kcal || 0)}</Text>
          <Text style={styles.caloriesLabel}>cal</Text>
        </View>
        <View style={styles.macrosGrid}>
          <Text style={styles.macroText}>P: {Math.round(item.macros?.protein_g || 0)}g</Text>
          <Text style={styles.macroText}>C: {Math.round(item.macros?.carbs_g || 0)}g</Text>
          <Text style={styles.macroText}>F: {Math.round(item.macros?.fat_g || 0)}g</Text>
        </View>
      </View>

      {/* Confidence Badge */}
      {item.sourceEvidence?.[0] && (
        <View style={[styles.badge, { borderColor: confidenceColor }]}>
          <View style={[styles.badgeDot, { backgroundColor: confidenceColor }]} />
          <Text style={styles.badgeText}>
            {item.sourceEvidence[0].source === 'USDA' ? 'USDA' : 'AI'} • {Math.round(confidence * 100)}% match
          </Text>
        </View>
      )}

      {/* Expandable Details */}
      <TouchableOpacity
        style={styles.expandButton}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.expandButtonText}>
          {isExpanded ? '▼ Hide details' : '▶ Show details'}
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.details}>
          {/* Detailed macros */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Macronutrients</Text>
            <View style={styles.detailGrid}>
              <DetailRow label="Fiber" value={`${(item.macros?.fiber_g || 0).toFixed(1)}g`} />
              <DetailRow label="Sugar" value={`${(item.macros?.sugar_g || 0).toFixed(1)}g`} />
              {item.macros?.sodium_mg !== undefined && (
                <DetailRow label="Sodium" value={`${Math.round(item.macros.sodium_mg)}mg`} />
              )}
            </View>
          </View>

          {/* Micronutrients */}
          {item.micros && Object.keys(item.micros).length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Micronutrients</Text>
              <View style={styles.detailGrid}>
                {Object.entries(item.micros).map(([key, value]) => (
                  <DetailRow
                    key={key}
                    label={key.charAt(0).toUpperCase() + key.slice(1)}
                    value={value}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Low Confidence Warning */}
      {confidence < 0.6 && (
        <View style={styles.warning}>
          <Text style={styles.warningIcon}>⚠</Text>
          <Text style={styles.warningText}>Low confidence - please verify accuracy</Text>
        </View>
      )}
    </View>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  foodName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
  },
  portionRow: {
    marginBottom: 12,
  },
  portionButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  portionText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  editingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#6B4EFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  unitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#6B4EFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  unitButtonText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  unitButtonArrow: {
    fontSize: 10,
    color: '#6B7280',
  },
  applyButton: {
    backgroundColor: '#10B981',
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  unitPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  unitOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  unitOptionSelected: {
    backgroundColor: '#6B4EFF',
    borderColor: '#6B4EFF',
  },
  unitOptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  unitOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  macrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  caloriesBadge: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  caloriesText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6B4EFF',
  },
  caloriesLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  macrosGrid: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 12,
    gap: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  expandButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  expandButtonText: {
    fontSize: 14,
    color: '#6B4EFF',
    fontWeight: '500',
  },
  details: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  detailSection: {
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  detailGrid: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  warningIcon: {
    fontSize: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
  },
});
