/**
 * MealSummaryScreen Component
 * Main container for meal analysis results
 * Features: Premium glassmorphism design, comprehensive nutrition display
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// BlurView available if needed for glassmorphism effects
import { TYPOGRAPHY, SPACING } from '../../../constants/designTokens';
import { useTheme } from '../../../providers/ThemeProvider';

// Sub-components
import MealScoreDial from './MealScoreDial';
// NutriScoreCard removed - conflicted with MealScoreDial (showed different grades for same meal)
import MacroProgressSection from './MacroProgressSection';
import IngredientsSection from './IngredientsSection';
import MicrosGrid from './MicrosGrid';
import ActionButtons from './ActionButtons';
import MealFeelingPrediction from '../MealFeelingPrediction';

/**
 * Extract sodium from micros object (handles multiple formats)
 * Returns sodium value in mg, or 0 if not found
 */
function extractSodiumFromMicros(micros) {
  if (!micros) return 0;

  // Try various key formats: sodium, sodium_mg, Sodium
  const sodiumKeys = ['sodium', 'sodium_mg', 'Sodium'];
  for (const key of sodiumKeys) {
    const val = micros[key];
    if (val !== undefined && val !== null) {
      // Handle both {sodium: 1700} and {sodium: {value: 1700}}
      if (typeof val === 'object' && val.value !== undefined) {
        return val.value;
      }
      if (typeof val === 'number') {
        return val;
      }
    }
  }
  return 0;
}

/**
 * Aggregate nutrition data from multiple items
 * FIX: Ensures sodium from micros is copied to macros for consistent display
 */
function aggregateNutrition(analysisResult) {
  if (!analysisResult?.items || analysisResult.items.length === 0) {
    return null;
  }

  // Single item - return directly
  if (analysisResult.items.length === 1) {
    const item = analysisResult.items[0];
    const macros = { ...(item.macros || {}) };
    const micros = item.micros || {};

    // FIX: If sodium_mg is missing or 0 in macros, copy from micros
    if (!macros.sodium_mg || macros.sodium_mg === 0) {
      const sodiumFromMicros = extractSodiumFromMicros(micros);
      if (sodiumFromMicros > 0) {
        macros.sodium_mg = sodiumFromMicros;
      }
    }

    return {
      item,
      macros,
      micros,
      ingredients: item.ingredients || [],
      isComplex: item.isComplex || false,
      name: item.name,
      portion: item.portion,
      confidence: item.confidence,
    };
  }

  // Multiple items - use totals
  const totals = analysisResult.totals || {};
  // Names aggregation available if needed for display
  // const names = analysisResult.items.map(i => i.name).join(', ');

  // Aggregate micros - handle both formats: {calcium: 15} and {calcium: {value: 15}}
  const aggregatedMicros = {};
  analysisResult.items.forEach(item => {
    if (item.micros) {
      Object.entries(item.micros).forEach(([key, val]) => {
        // Handle both flat numbers and object format
        const isObject = typeof val === 'object' && val !== null;
        const value = isObject ? (val.value ?? 0) : (typeof val === 'number' ? val : 0);
        const unit = isObject ? (val.unit || 'mg') : 'mg';

        if (!aggregatedMicros[key]) {
          aggregatedMicros[key] = { value: 0, unit };
        }
        aggregatedMicros[key].value += value;
      });
    }
  });

  // FIX: Ensure macros has sodium_mg from micros if missing
  const macros = { ...(totals.macros || {}) };
  if (!macros.sodium_mg || macros.sodium_mg === 0) {
    const sodiumFromMicros = extractSodiumFromMicros(aggregatedMicros);
    if (sodiumFromMicros > 0) {
      macros.sodium_mg = sodiumFromMicros;
    }
  }

  return {
    item: analysisResult.items[0], // First item for confidence
    macros,
    micros: aggregatedMicros,
    ingredients: analysisResult.items, // Use items as "ingredients" for multi-item meals
    isComplex: true,
    name: `Meal (${analysisResult.items.length} items)`,
    portion: { servingText: `${analysisResult.items.length} items` },
    confidence: analysisResult.items[0]?.confidence || 0.7,
  };
}

export default function MealSummaryScreen({
  visible,
  analysisResult,
  dailyValues,
  imageUri,
  onClose,
  onSave,
  onEdit,
  onShare,
  isSaving = false,
}) {
  const { isDark } = useTheme();
  const [isFavorite, setIsFavorite] = useState(false);

  // Aggregate nutrition data
  const nutrition = useMemo(() => {
    return aggregateNutrition(analysisResult);
  }, [analysisResult]);

  // Theme colors
  const cardBg = isDark ? 'rgba(30, 30, 35, 0.95)' : 'rgba(255, 255, 255, 0.98)';

  if (!visible || !nutrition) return null;

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
    // TODO: Implement favorite save logic
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: isDark ? '#0F0F12' : '#F9F9FB' }]}>
        {/* Header with gradient */}
        <LinearGradient
          colors={isDark ? ['#1A1A1F', '#0F0F12'] : ['#6B4EFF', '#8B6EFF']}
          style={styles.headerGradient}
        >
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="Close meal summary"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Title */}
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle} numberOfLines={2}>
              {nutrition.name}
            </Text>
            {nutrition.portion?.servingText && (
              <Text style={styles.headerSubtitle}>
                {nutrition.portion.servingText}
              </Text>
            )}
          </View>

          {/* Food image preview (if available) */}
          {imageUri && (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: imageUri }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
            </View>
          )}
        </LinearGradient>

        {/* Scrollable content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Primary Score Section - ONE score, ONE truth */}
          {/* DESIGN FIX: Removed NutriScoreCard to eliminate conflicting scores */}
          {/* MealScoreDial (0-100) is the single source of meal quality */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <MealScoreDial item={nutrition.item} />
          </View>

          {/* How Will This Make Me Feel - DIFFERENTIATOR */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <MealFeelingPrediction
              mealData={{
                calories: nutrition.macros?.calories,
                protein: nutrition.macros?.protein_g,
                carbs: nutrition.macros?.carbs_g,
                sugar: nutrition.micros?.sugar?.value || nutrition.micros?.sugar,
                fiber: nutrition.micros?.fiber?.value || nutrition.micros?.fiber,
                novaScore: nutrition.item?.novaScore,
                mealType: nutrition.item?.mealType,
              }}
            />
          </View>

          {/* Macro Progress - shows meal composition, not daily goals */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <MacroProgressSection macros={nutrition.macros} />
          </View>

          {/* Ingredients (for complex meals) */}
          {nutrition.ingredients && nutrition.ingredients.length > 0 && (
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <IngredientsSection
                ingredients={nutrition.ingredients}
                isComplex={nutrition.isComplex}
              />
            </View>
          )}

          {/* Micronutrients Grid */}
          {nutrition.micros && Object.keys(nutrition.micros).length > 0 && (
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <MicrosGrid micros={nutrition.micros} />
            </View>
          )}

          {/* Action Buttons */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <ActionButtons
              onEdit={onEdit}
              onFavorite={handleFavorite}
              onShare={onShare}
              isFavorite={isFavorite}
            />
          </View>

          {/* Bottom spacing */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Sticky Confirm Log Button */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: isDark ? 'rgba(15, 15, 18, 0.95)' : 'rgba(255, 255, 255, 0.98)',
              borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.confirmButton, isSaving && styles.confirmButtonDisabled]}
            onPress={onSave}
            disabled={isSaving}
            activeOpacity={0.8}
            accessibilityLabel="Confirm and log this meal"
          >
            <LinearGradient
              colors={['#6B4EFF', '#8B6EFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.confirmGradient}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                  <Text style={styles.confirmText}>Confirm Log</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING[5],
    paddingHorizontal: SPACING[4],
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: SPACING[4],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: SPACING[4],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    maxWidth: '80%',
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: SPACING[1],
  },
  imagePreviewContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    right: SPACING[4],
    width: 50,
    height: 50,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING[4],
    paddingBottom: 100,
  },
  card: {
    borderRadius: 16,
    marginBottom: SPACING[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  // compactGradeContainer removed - NutriScoreCard no longer used
  bottomSpacer: {
    height: SPACING[6],
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[3],
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING[4],
    borderTopWidth: 1,
  },
  confirmButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[4],
    gap: SPACING[2],
  },
  confirmText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
  },
});
