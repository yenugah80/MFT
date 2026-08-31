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
import { useTheme } from '../../../providers/ThemeProvider';
import { TYPOGRAPHY, SPACING, BRAND, SURFACES } from '../../../constants/premiumTheme';

// Sub-components
import MealScoreDial from './MealScoreDial';
// NutriScoreCard removed - conflicted with MealScoreDial (showed different grades for same meal)
import MacroProgressSection, { CaloriesDisplay } from './MacroProgressSection';
import IngredientsSection from './IngredientsSection';
import MicrosGrid from './MicrosGrid';
import ActionButtons from './ActionButtons';
import MealFeelingPrediction from '../MealFeelingPrediction';
import QuantityAdjuster from '../QuantityAdjuster';
import EditableIngredientsSection from '../EditableIngredientsSection';
import { aggregateNutrition, buildMealFeelingPayload } from './aggregateNutrition';

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
  // Stage 8e: backed by useFoodAnalysis.js's updateItemQuantity, threaded
  // down from log.js. Mutates the one shared analysisResult both this
  // screen and UnifiedMealAnalysis.jsx read from, instead of the previous
  // local-only `modifiedNutrition` state — which fixed nothing beyond this
  // screen's own display and, critically, was NEVER read by onSave, so a
  // quantity edit here was silently lost at save time (confirmed: "2
  // rotis" edited to "4 rotis" showed doubled calories on screen but saved
  // the original 2-roti values).
  onUpdateItemQuantity,
  // Backs handleNutritionChange below — same shared-state fix, for
  // ingredient-editing edits instead of quantity edits.
  onUpdateItemMacros,
}) {
  const { isDark } = useTheme();
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentQuantity, setCurrentQuantity] = useState(1);

  // Aggregate nutrition data
  const nutrition = useMemo(() => {
    return aggregateNutrition(analysisResult);
  }, [analysisResult]);

  // Check if this is a countable food (roti, idli, egg, etc.)
  const portionInfo = nutrition?.item?.portion || {};
  const isCountable = portionInfo.isCountable || false;
  const adjustmentOptions = portionInfo.adjustmentOptions || null;

  // Get ingredient breakdown from the first item (for single-item meals)
  const ingredientBreakdown = nutrition?.item?.ingredientBreakdown || null;

  // QuantityAdjuster only ever renders for a single-item meal (a
  // multi-item meal's synthetic aggregate has no portion of its own, so
  // portionInfo is always {} there) — safe to target items[0] directly.
  const handleQuantityChange = (quantityData) => {
    setCurrentQuantity(quantityData.quantity);
    if (quantityData.quantity && onUpdateItemQuantity && analysisResult?.items?.[0]) {
      onUpdateItemQuantity(analysisResult.items[0].itemId, quantityData.quantity, portionInfo.unit);
    }
  };

  // Handle nutrition change from ingredient editing. Same fix as
  // handleQuantityChange above, same root bug: this used to only write to
  // local `modifiedNutrition` — which changed the display but was never
  // read by onSave, so an ingredient edit here (unlike a quantity edit)
  // silently reverted at save time. Now writes through to the shared
  // analysisResult via updateItemMacros, same as quantity edits, so both
  // this screen's own re-render AND save pick up the edit from one place.
  // EditableIngredientsSection only ever renders for a single-item meal
  // (ingredientBreakdown is null for the multi-item synthetic aggregate),
  // same as QuantityAdjuster above — items[0] is the safe target.
  const handleNutritionChange = (nutritionData) => {
    if (onUpdateItemMacros && analysisResult?.items?.[0]) {
      onUpdateItemMacros(analysisResult.items[0].itemId, nutritionData.macros, nutritionData.micros);
    }
  };

  // Get display values straight from the (possibly just-edited) nutrition —
  // no separate local `modifiedNutrition` overlay needed now that both
  // quantity and ingredient edits write through to the shared
  // analysisResult and flow back down as a fresh prop.
  const displayCalories = nutrition?.macros?.calories_kcal ?? nutrition?.macros?.calories;
  const displayMacros = nutrition?.macros;
  const displayMicros = nutrition?.micros;
  const displayItem = nutrition?.item;

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
      <View style={[styles.container, { backgroundColor: isDark ? '#0F0F12' : SURFACES.background.primary }]}>
        {/* Header with gradient */}
        <LinearGradient
          colors={isDark ? ['#1A1A1F', '#0F0F12'] : [BRAND.primary, BRAND.primaryLight]}
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
          {/* HERO CARD — the three things a user checks first, in one card
              instead of three: is this meal good (score), how much is it
              (calories), and how will it make me feel. Previously each had
              its own card with identical borderRadius/shadow, giving the
              whole screen a flat "wall of cards" with no visual hierarchy
              — nothing signaled these three belonged together as the
              headline, ahead of the drill-down detail below. */}
          <View style={[styles.card, styles.heroCard, { backgroundColor: cardBg }]}>
            {/* DESIGN FIX: Removed NutriScoreCard to eliminate conflicting
                scores — MealScoreDial (0-100) is the single source of
                meal quality. */}
            <MealScoreDial item={displayItem} />
            <CaloriesDisplay calories={displayCalories} />
            <View style={[styles.heroDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
            <MealFeelingPrediction
              mealData={buildMealFeelingPayload({ displayCalories, displayMacros, item: displayItem })}
            />
          </View>

          {/* Quantity Adjuster - countable foods (roti, idli, egg) get the
              stepper; non-countable foods (curry, dal, rice) get the
              serving-fraction "Quick select" picker instead, when the
              backend provided suggestedOptions. Previously gated on
              `isCountable` alone (so non-countable foods never got any
              edit UI at all) and hardcoded `isCountable={true}`
              regardless of the food's real type. */}
          {(isCountable || adjustmentOptions?.suggestedOptions?.length > 0) && (
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <QuantityAdjuster
                foodName={nutrition.name}
                initialQuantity={portionInfo.amount || 1}
                caloriesPerUnit={adjustmentOptions?.caloriesPerUnit}
                macrosPerUnit={adjustmentOptions?.macrosPerUnit}
                unitLabel={adjustmentOptions?.unitLabel || portionInfo.unit}
                onQuantityChange={handleQuantityChange}
                isCountable={isCountable}
                adjustmentOptions={adjustmentOptions}
              />
            </View>
          )}

          {/* Editable Ingredients Section — compact/drill-down tier: quieter
              shadow than the hero/standard tiers above, so the visual
              hierarchy reads at a glance (headline vs. detail you tap into),
              not nine identically-weighted cards in a row. */}
          {ingredientBreakdown && (
            <View style={[styles.card, styles.compactCard, { backgroundColor: cardBg }]}>
              <EditableIngredientsSection
                ingredientBreakdown={ingredientBreakdown}
                totalCalories={displayCalories}
                onNutritionChange={handleNutritionChange}
                isEditable={true}
              />
            </View>
          )}

          {/* Macro Progress - shows meal composition, not daily goals */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <MacroProgressSection macros={displayMacros} />
          </View>

          {/* Ingredients (for complex meals) — compact/drill-down tier */}
          {nutrition.ingredients && nutrition.ingredients.length > 0 && (
            <View style={[styles.card, styles.compactCard, { backgroundColor: cardBg }]}>
              <IngredientsSection
                ingredients={nutrition.ingredients}
                isComplex={nutrition.isComplex}
              />
            </View>
          )}

          {/* Micronutrients Grid — compact/drill-down tier (already
              collapsed by default internally) */}
          {displayMicros && Object.keys(displayMicros).length > 0 && (
            <View style={[styles.card, styles.compactCard, { backgroundColor: cardBg }]}>
              <MicrosGrid micros={displayMicros} />
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
              colors={[BRAND.primary, BRAND.primaryLight]}
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
    fontFamily: TYPOGRAPHY.family.bold,
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
  // Slightly heavier shadow than a standard card — the hero card is the
  // one thing on this screen meant to read as "the headline," not a peer
  // of the drill-down cards below it.
  heroCard: {
    padding: SPACING[4],
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  heroDivider: {
    height: 1,
    marginVertical: SPACING[3],
  },
  // Drill-down tier (ingredients, micronutrients) — quieter than the hero/
  // standard tiers, signaling "detail you tap into" rather than headline.
  compactCard: {
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
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
    shadowColor: BRAND.primary,
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
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
  },
});
