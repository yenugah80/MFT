/**
 * NutritionCard Component
 * Nutrition display for estimated analysis
 * Features: Estimate strength, macro consistency, and transparent assumptions
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

/**
 * Confidence badge color and text (0.0-1.0)
 */
function getConfidenceBadge(confidence) {
  const score = confidence || 0.7;
  if (score >= 0.95) return { color: '#10B981', bg: '#D1FAE5', text: 'Strong estimate', icon: '✓✓' };
  if (score >= 0.85) return { color: '#3B82F6', bg: '#DBEAFE', text: 'Typical estimate', icon: '✓' };
  if (score >= 0.70) return { color: '#F59E0B', bg: '#FEF3C7', text: 'Reasonable estimate', icon: '~' };
  if (score >= 0.50) return { color: '#F97316', bg: '#FFEDD5', text: 'Rough estimate', icon: '?' };
  return { color: '#EF4444', bg: '#FEE2E2', text: 'Needs adjustment', icon: '!' };
}

/**
 * Health score color gradient (0-100)
 */
function getHealthScoreColor(score) {
  if (score >= 80) return '#10B981'; // Green
  if (score >= 60) return '#F59E0B'; // Amber
  if (score >= 40) return '#F97316'; // Orange
  return '#EF4444'; // Red
}

/**
 * Validate macro-calorie consistency
 * Formula: Calories = (Protein × 4) + (Carbs × 4) + (Fat × 9)
 */
function validateMacros(calories, protein, carbs, fat) {
  if (!calories) {
    return { level: null, message: null };
  }

  const calculatedCalories = (protein * 4) + (carbs * 4) + (fat * 9);
  const difference = Math.abs(calories - calculatedCalories);
  const percentageOff = (difference / calories) * 100;

  if (percentageOff > 30) {
    return {
      level: 'warn',
      message: 'Macros and calories look inconsistent. Consider adjusting portions.',
    };
  }

  return {
    level: 'info',
    message: 'Calories are estimated from macros and typical preparation.',
  };
}

function toText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '';
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * Macro pie chart (simplified visual)
 */
function MacroPieChart({ protein, carbs, fat }) {
  // Guard against undefined/null values
  const p = Number(protein) || 0;
  const c = Number(carbs) || 0;
  const f = Number(fat) || 0;

  const total = p + c + f || 1;
  const proteinPct = (p / total) * 100;
  const carbsPct = (c / total) * 100;
  const fatPct = (f / total) * 100;

  return (
    <View style={styles.pieContainer}>
      <View style={styles.pieRow}>
        <View style={[styles.pieSegment, { backgroundColor: '#3B82F6', flex: proteinPct || 0.1 }]} />
        <View style={[styles.pieSegment, { backgroundColor: '#10B981', flex: carbsPct || 0.1 }]} />
        <View style={[styles.pieSegment, { backgroundColor: '#F59E0B', flex: fatPct || 0.1 }]} />
      </View>
      <View style={styles.pieLegend}>
        <LegendItem color="#3B82F6" label="Protein" value={`${Math.round(proteinPct)}%`} />
        <LegendItem color="#10B981" label="Carbs" value={`${Math.round(carbsPct)}%`} />
        <LegendItem color="#F59E0B" label="Fat" value={`${Math.round(fatPct)}%`} />
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
 * Micronutrient bar chart
 */
function MicroBar({ name, amount, unit, percentage }) {
  const width = Math.min(percentage || 0, 100);

  return (
    <View style={styles.microRow}>
      <Text style={styles.microName}>{name || 'Unknown'}</Text>
      <View style={styles.microBarContainer}>
        <View style={[styles.microBarFill, { width: `${width}%` }]} />
      </View>
      <Text style={styles.microValue}>
        {amount || '0'}{unit || ''}
      </Text>
    </View>
  );
}

/**
 * Ingredient item
 */
function IngredientItem({ ingredient, onPress }) {
  const [expanded, setExpanded] = useState(false);

  const handlePress = () => {
    setExpanded(!expanded);
    if (onPress) onPress(ingredient);
  };

  return (
    <TouchableOpacity
      style={styles.ingredientItem}
      onPress={handlePress}
      accessible
      accessibilityLabel={`Ingredient: ${ingredient.name}`}
      accessibilityHint="Tap to see nutrition details"
    >
      <View style={styles.ingredientHeader}>
        <Text style={styles.ingredientName}>{ingredient.name}</Text>
        {ingredient.calories ? (
          <Text style={styles.ingredientCalories}>{ingredient.calories} cal</Text>
        ) : null}
      </View>

      {expanded && (
        <View style={styles.ingredientDetails}>
          {ingredient.description && (
            <Text style={styles.ingredientDescription}>{ingredient.description}</Text>
          )}
          {(ingredient.protein || ingredient.carbs || ingredient.fat) ? (
            <View style={styles.ingredientMacros}>
              {ingredient.protein ? (
                <Text style={styles.ingredientMacro}>P: {ingredient.protein}g</Text>
              ) : null}
              {ingredient.carbs ? (
                <Text style={styles.ingredientMacro}>C: {ingredient.carbs}g</Text>
              ) : null}
              {ingredient.fat ? (
                <Text style={styles.ingredientMacro}>F: {ingredient.fat}g</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * Main NutritionCard Component
 * PHASE 1 - TRUST FIX: Added button lock to prevent double-saves
 */
export function NutritionCard({ foodLog, onSave, onCancel }) {
  const [showMicros, setShowMicros] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    foodName,
    cookingMethod,
    healthScore,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    netCarbs,
    micronutrients = [],
    ingredients = [],
    hydration,
    confidence,
    analysisNotes,
    portionGrams,
    servingSize,
  } = foodLog || {};

  // Macro validation with useMemo for performance
  const macroValidation = useMemo(() => {
    return validateMacros(calories || 0, protein || 0, carbs || 0, fat || 0);
  }, [calories, protein, carbs, fat]);

  if (!foodLog) return null;

  // Handle save with lock to prevent double-taps
  const handleSave = async () => {
    if (isSaving || !onSave) return;

    setIsSaving(true);
    try {
      await onSave(foodLog);
    } catch (error) {
      console.error('[NutritionCard] Save error:', error);
      // Error will be handled by parent component
    } finally {
      setIsSaving(false);
    }
  };

  const confidenceBadge = getConfidenceBadge(confidence);

  return (
    <View style={styles.card}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header with Confidence Badge */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.foodName}>{toText(foodName)}</Text>
            <View style={[styles.confidenceBadge, { backgroundColor: confidenceBadge.bg }]}>
              <Text style={[styles.confidenceBadgeText, { color: confidenceBadge.color }]}>
                {confidenceBadge.icon} {Math.round((confidence || 0.7) * 100)}%
              </Text>
            </View>
          </View>
          {cookingMethod && (
            <Text style={styles.cookingMethod}>{toText(cookingMethod)}</Text>
          )}
          {(portionGrams || servingSize) ? (
            <Text style={styles.servingSize}>
              {servingSize ? toText(servingSize) : `Approx. ${portionGrams}g`}
            </Text>
          ) : null}
        </View>

        {/* Confidence Explanation */}
        {confidence != null && confidence < 0.85 ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              Estimate quality: <Text style={styles.infoBold}>{confidenceBadge.text}</Text>
              {'\n'}Based on typical preparation, common portions, and public nutrition data.
            </Text>
          </View>
        ) : null}

        {/* Nutrition Balance */}
        <View style={styles.healthScoreContainer}>
          <Text style={styles.sectionTitle}>Nutrition Balance (experimental)</Text>
          <Text style={styles.healthScoreCaption}>
            A rough indicator based on macros and guidelines.
          </Text>
          <View style={styles.healthScoreBar}>
            <View
              style={[
                styles.healthScoreFill,
                {
                  width: `${healthScore}%`,
                  backgroundColor: getHealthScoreColor(healthScore),
                },
              ]}
            />
          </View>
          <Text style={[styles.healthScoreValue, { color: getHealthScoreColor(healthScore) }]}>
            {toNumber(healthScore, 0)}/100
          </Text>
        </View>

        {/* Calories */}
        <View style={styles.caloriesContainer}>
          <Text style={styles.caloriesValue}>{Math.round(toNumber(calories, 0))}</Text>
          <Text style={styles.caloriesLabel}>calories</Text>
        </View>

        {/* Macro Consistency */}
        {macroValidation.level === 'warn' && typeof macroValidation.message === 'string' && (
          <View style={styles.warningBox}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>{toText(macroValidation.message)}</Text>
          </View>
        )}
        {macroValidation.level === 'info' && typeof macroValidation.message === 'string' && (
          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>{toText(macroValidation.message)}</Text>
          </View>
        )}

        {/* Macros */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Macronutrients</Text>
          <MacroPieChart protein={protein} carbs={carbs} fat={fat} />

          <View style={styles.macroGrid}>
            <MacroItem label="Protein" value={protein} unit="g" />
            <MacroItem label="Carbs" value={carbs} unit="g" />
            <MacroItem label="Fat" value={fat} unit="g" />
          </View>

          {/* Detailed carbs */}
          {(fiber || sugar || netCarbs) ? (
            <View style={styles.detailedCarbs}>
              {fiber ? <DetailItem label="Fiber" value={fiber} unit="g" /> : null}
              {netCarbs ? <DetailItem label="Net Carbs" value={netCarbs} unit="g" /> : null}
              {sugar ? <DetailItem label="Sugar" value={sugar} unit="g" /> : null}
            </View>
          ) : null}
        </View>

        {/* Micronutrients */}
        {micronutrients.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setShowMicros(!showMicros)}
            >
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionTitle}>Micronutrients</Text>
                <Text style={styles.estimatedLabel}>Estimated</Text>
              </View>
              <Text style={styles.toggleIcon}>{showMicros ? '▼' : '▶'}</Text>
            </TouchableOpacity>

            {showMicros && (
              <View style={styles.microsContainer}>
                {micronutrients.map((micro, idx) => (
                  <MicroBar
                    key={idx}
                    name={micro.name}
                    amount={micro.amount}
                    unit={micro.unit}
                    percentage={micro.percentageOfDailyNeeds}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Hydration */}
        {hydration ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hydration</Text>
            {hydration.waterContent ? (
              <Text style={styles.hydrationText}>
                💧 Water: {hydration.waterContent}ml
              </Text>
            ) : null}
            {hydration.electrolytes && hydration.electrolytes.length > 0 ? (
              <Text style={styles.hydrationText}>
                ⚡ Electrolytes: {toText(hydration.electrolytes.join(', '))}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Ingredients */}
        {ingredients.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setShowIngredients(!showIngredients)}
            >
              <Text style={styles.sectionTitle}>
                Ingredients ({ingredients.length})
              </Text>
              <Text style={styles.toggleIcon}>{showIngredients ? '▼' : '▶'}</Text>
            </TouchableOpacity>

            {showIngredients && (
              <View style={styles.ingredientsContainer}>
                <Text style={styles.ingredientsNote}>
                  Ingredients shown are representative, not exact.
                </Text>
                {ingredients.map((ingredient, idx) => (
                  <IngredientItem key={idx} ingredient={ingredient} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* How We Estimated */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setShowAnalysis(!showAnalysis)}
          >
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionTitle}>How We Estimated This</Text>
              <Text style={styles.estimatedLabel}>Summary</Text>
            </View>
            <Text style={styles.toggleIcon}>{showAnalysis ? '▼' : '▶'}</Text>
          </TouchableOpacity>
          {showAnalysis && (
            <View style={styles.analysisNotesBox}>
              <Text style={styles.analysisNotesText}>• Typical preparation</Text>
              <Text style={styles.analysisNotesText}>• Common portions</Text>
              <Text style={styles.analysisNotesText}>• Public nutrition databases</Text>
              {analysisNotes ? (
                <Text style={[styles.analysisNotesText, styles.analysisNotesDetail]}>
                  {toText(analysisNotes)}
                </Text>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        {onCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={isSaving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
        {onSave && (
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save to Log</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function MacroItem({ label, value, unit }) {
  return (
    <View style={styles.macroItem}>
      <Text style={styles.macroValue}>{Math.round(value)}{unit}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

function DetailItem({ label, value, unit }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailValue}>{Math.round(value)}{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  scrollContent: {
    flex: 1,
  },
  header: {
    marginBottom: 16,
  },
  foodName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  cookingMethod: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  healthScoreContainer: {
    marginBottom: 16,
  },
  healthScoreCaption: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  healthScoreBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  healthScoreFill: {
    height: '100%',
    borderRadius: 4,
  },
  healthScoreValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  caloriesContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  caloriesValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#6B4EFF',
  },
  caloriesLabel: {
    fontSize: 14,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  estimatedLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  toggleIcon: {
    fontSize: 12,
    color: '#6B7280',
  },
  pieContainer: {
    marginBottom: 12,
  },
  pieRow: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  pieSegment: {
    height: '100%',
  },
  pieLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  macroLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  detailedCarbs: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  detailItem: {
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
    fontWeight: '600',
    color: '#1F2937',
  },
  microsContainer: {
    gap: 8,
  },
  microRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  microName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  microBarContainer: {
    flex: 2,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  microBarFill: {
    height: '100%',
    backgroundColor: '#6B4EFF',
    borderRadius: 4,
  },
  microValue: {
    fontSize: 12,
    color: '#6B7280',
    minWidth: 60,
    textAlign: 'right',
  },
  hydrationText: {
    fontSize: 14,
    color: '#374151',
    paddingVertical: 4,
  },
  ingredientsContainer: {
    gap: 8,
  },
  ingredientsNote: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  ingredientItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  ingredientCalories: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  ingredientDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  ingredientDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  ingredientMacros: {
    flexDirection: 'row',
    gap: 12,
  },
  ingredientMacro: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    flex: 2,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#6B4EFF',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Enhanced UI Styles
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  confidenceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  servingSize: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  infoBold: {
    fontWeight: '700',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  warningBoxHigh: {
    backgroundColor: '#FEE2E2',
    borderLeftColor: '#EF4444',
  },
  warningIcon: {
    fontSize: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  analysisNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  analysisNotesIcon: {
    fontSize: 18,
  },
  analysisNotesBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#6B4EFF',
  },
  analysisNotesText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 19,
    fontStyle: 'normal',
  },
  analysisNotesDetail: {
    marginTop: 8,
    fontStyle: 'normal',
  },
});
