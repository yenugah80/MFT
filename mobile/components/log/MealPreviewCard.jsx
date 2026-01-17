/**
 * MealPreviewCard - Compact inline preview for photo/barcode analysis
 *
 * Premium UI component that shows a quick summary after analysis,
 * allowing users to tap to see full details or quickly save.
 *
 * Flow: Photo/Barcode scan → MealPreviewCard → Tap for MealSummaryScreen
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, SURFACES, BRAND, SEMANTIC } from '../../constants/premiumTheme';

export default function MealPreviewCard({
  analysisResult,
  imageUri,
  onTapDetails,
  onQuickSave,
  onEdit,
  isSaving = false,
}) {
  if (!analysisResult || !analysisResult.items || analysisResult.items.length === 0) {
    return null;
  }

  // Calculate totals from items
  const items = analysisResult.items;
  const totals = analysisResult.totals?.macros || items.reduce(
    (acc, item) => ({
      calories_kcal: acc.calories_kcal + (item.macros?.calories_kcal || 0),
      protein_g: acc.protein_g + (item.macros?.protein_g || 0),
      carbs_g: acc.carbs_g + (item.macros?.carbs_g || 0),
      fat_g: acc.fat_g + (item.macros?.fat_g || 0),
    }),
    { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  // Get primary food name
  const primaryName = items.length === 1
    ? items[0].name
    : `${items[0].name} + ${items.length - 1} more`;

  // Count total ingredients across all items
  const totalIngredients = items.reduce((count, item) => {
    const ingredientCount = item.components?.length || item.ingredients?.length || 0;
    return count + ingredientCount;
  }, 0);

  // Get confidence
  const avgConfidence = items.reduce((sum, item) => sum + (item.confidence || 0.75), 0) / items.length;
  const confidencePercent = Math.round(avgConfidence * 100);

  // Confidence color
  const getConfidenceColor = () => {
    if (avgConfidence >= 0.8) return SEMANTIC.success.base;
    if (avgConfidence >= 0.6) return SEMANTIC.warning.base;
    return SEMANTIC.danger?.base || '#EF4444';
  };

  return (
    <View style={styles.container}>
      {/* Main Card */}
      <TouchableOpacity
        style={styles.card}
        onPress={onTapDetails}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[SURFACES.card.primary, SURFACES.background.tertiary]}
          style={styles.cardGradient}
        >
          {/* Top Section: Image + Info */}
          <View style={styles.topSection}>
            {/* Photo Thumbnail */}
            {imageUri ? (
              <View style={styles.thumbnailContainer}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
                {/* Confidence Badge - clarifies this is food ID confidence, not nutrition accuracy */}
                <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor() }]}>
                  <Text style={styles.confidenceText}>ID {confidencePercent}%</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.thumbnailContainer, styles.placeholderThumbnail]}>
                <Ionicons name="restaurant" size={32} color={TEXT.tertiary} />
              </View>
            )}

            {/* Food Info */}
            <View style={styles.infoSection}>
              <Text style={styles.foodName} numberOfLines={2}>
                {primaryName}
              </Text>

              {/* Macro Summary */}
              <View style={styles.macroRow}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{Math.round(totals.calories_kcal)}</Text>
                  <Text style={styles.macroLabel}>cal</Text>
                </View>
                <View style={styles.macroDivider} />
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, styles.proteinColor]}>
                    {Math.round(totals.protein_g)}g
                  </Text>
                  <Text style={styles.macroLabel}>protein</Text>
                </View>
                <View style={styles.macroDivider} />
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, styles.carbsColor]}>
                    {Math.round(totals.carbs_g)}g
                  </Text>
                  <Text style={styles.macroLabel}>carbs</Text>
                </View>
                <View style={styles.macroDivider} />
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, styles.fatColor]}>
                    {Math.round(totals.fat_g)}g
                  </Text>
                  <Text style={styles.macroLabel}>fat</Text>
                </View>
              </View>

              {/* Ingredient Count Hint */}
              {totalIngredients > 0 && (
                <View style={styles.ingredientHint}>
                  <Ionicons name="layers-outline" size={14} color={TEXT.tertiary} />
                  <Text style={styles.ingredientHintText}>
                    {totalIngredients} ingredients detected
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Bottom Section: Actions */}
          <View style={styles.actionsRow}>
            {/* View Details Button */}
            <TouchableOpacity
              style={styles.detailsButton}
              onPress={onTapDetails}
              activeOpacity={0.8}
            >
              <Text style={styles.detailsButtonText}>View Full Analysis</Text>
              <Ionicons name="chevron-forward" size={16} color={BRAND.primary} />
            </TouchableOpacity>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              {onEdit && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={onEdit}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={18} color={TEXT.secondary} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={onQuickSave}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isSaving ? ['#9CA3AF', '#9CA3AF'] : SURFACES.gradient.success}
                  style={styles.saveButtonGradient}
                >
                  {isSaving ? (
                    <Text style={styles.saveButtonText}>Saving...</Text>
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={16} color="#FFF" />
                      <Text style={styles.saveButtonText}>Log</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Items List Preview (if multiple items) */}
      {items.length > 1 && (
        <View style={styles.itemsPreview}>
          {items.slice(0, 3).map((item, index) => (
            <View key={item.itemId || index} style={styles.itemPreviewRow}>
              <View style={styles.itemDot} />
              <Text style={styles.itemPreviewName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.itemPreviewCal}>
                {Math.round(item.macros?.calories_kcal || 0)} cal
              </Text>
            </View>
          ))}
          {items.length > 3 && (
            <Text style={styles.moreItemsText}>
              +{items.length - 3} more items
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: SURFACES.card.primary, // Required for shadow efficiency
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardGradient: {
    padding: 16,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbnailContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: SURFACES.background.tertiary,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  confidenceBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  infoSection: {
    flex: 1,
    marginLeft: 14,
  },
  foodName: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT.primary,
    marginBottom: 8,
    lineHeight: 22,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  macroItem: {
    alignItems: 'center',
    minWidth: 45,
  },
  macroValue: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT.primary,
  },
  macroLabel: {
    fontSize: 10,
    color: TEXT.tertiary,
    marginTop: 1,
  },
  proteinColor: {
    color: '#3B82F6',
  },
  carbsColor: {
    color: '#10B981',
  },
  fatColor: {
    color: '#F59E0B',
  },
  macroDivider: {
    width: 1,
    height: 20,
    backgroundColor: SURFACES.card.border,
    marginHorizontal: 8,
  },
  ingredientHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ingredientHintText: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginLeft: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: SURFACES.card.border,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.primary,
    marginRight: 4,
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SURFACES.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  itemsPreview: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: SURFACES.card.primary,
    borderRadius: 12,
  },
  itemPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.primary,
    marginRight: 8,
  },
  itemPreviewName: {
    flex: 1,
    fontSize: 13,
    color: TEXT.secondary,
  },
  itemPreviewCal: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT.tertiary,
  },
  moreItemsText: {
    fontSize: 12,
    color: TEXT.muted,
    marginTop: 4,
    marginLeft: 14,
    fontStyle: 'italic',
  },
});
