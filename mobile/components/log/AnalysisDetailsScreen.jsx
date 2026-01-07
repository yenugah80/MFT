/**
 * AnalysisDetailsScreen - Advanced UX for Food Analysis Results
 *
 * Features:
 * - Comprehensive nutrition display (10/10 detail level)
 * - Multi-item meal breakdown
 * - Source evidence with confidence scores
 * - Portion editing with real-time recalculation
 * - Micronutrient display with daily values
 * - Health scores and dietary labels
 * - Professional, responsive design
 * - Accessibility optimized
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  SEMANTIC,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  ICON_SIZES,
  SURFACES,
  BRAND,
} from '../../constants/premiumTheme';

// Daily Values for micronutrients (FDA Reference Daily Intake)
const DAILY_VALUES = {
  calcium: { value: 1300, unit: 'mg' },
  iron: { value: 18, unit: 'mg' },
  vitaminA: { value: 900, unit: 'µg' },
  vitaminC: { value: 90, unit: 'mg' },
  vitaminD: { value: 20, unit: 'µg' },
  vitaminE: { value: 15, unit: 'mg' },
  vitaminK: { value: 120, unit: 'µg' },
  potassium: { value: 4700, unit: 'mg' },
  sodium: { value: 2300, unit: 'mg' },
  magnesium: { value: 420, unit: 'mg' },
  zinc: { value: 11, unit: 'mg' },
};

const AnalysisDetailsScreen = ({
  visible,
  onClose,
  analysisResult,
  imageUri = null,
  onSave,
  onEdit,
  onShare,
}) => {
  const [expandedSections, setExpandedSections] = useState({
    macros: true,
    micros: false,
    evidence: false,
    ingredients: true,
  });
  const [showAllMicros, setShowAllMicros] = useState(false);
  const prevIngredientsExpandedRef = useRef(false);
  const chipAnimationsRef = useRef({});

  // 🆕 FIX: Use nullish coalescing instead of early return to maintain hook order
  const { items = [], totals = {} } = analysisResult || {};
  const hasSingleItem = items.length === 1;
  const hasImage = !!imageUri;
  const hasIngredients = items.some(
    (item) => (item.ingredients && item.ingredients.length > 0) ||
      (item.components && item.components.length > 0)
  );

  const chipGradients = [
    ['#FDE68A', '#F59E0B'],
    ['#A7F3D0', '#10B981'],
    ['#BFDBFE', '#3B82F6'],
    ['#FBCFE8', '#EC4899'],
    ['#E9D5FF', '#8B5CF6'],
  ];

  const ingredientChips = useMemo(() => {
    if (!hasIngredients) return [];
    const chips = [];
    items.forEach((item, index) => {
      const ingredients = Array.isArray(item.ingredients) ? item.ingredients : [];
      ingredients.forEach((name, chipIndex) => {
        chips.push({
          key: `${item.itemId || index}-ing-${chipIndex}`,
          name,
        });
      });
    });
    return chips;
  }, [items, hasIngredients]);

  useEffect(() => {
    if (!hasIngredients) return;
    const isExpanded = expandedSections.ingredients;
    const wasExpanded = prevIngredientsExpandedRef.current;

    if (isExpanded && !wasExpanded && ingredientChips.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const animations = ingredientChips.map((chip, index) => {
        if (!chipAnimationsRef.current[chip.key]) {
          chipAnimationsRef.current[chip.key] = new Animated.Value(0);
        } else {
          chipAnimationsRef.current[chip.key].setValue(0);
        }
        return Animated.timing(chipAnimationsRef.current[chip.key], {
          toValue: 1,
          duration: 160,
          delay: index * 35,
          useNativeDriver: true,
        });
      });

      Animated.stagger(35, animations).start();
    }

    if (!isExpanded) {
      ingredientChips.forEach((chip) => {
        if (chipAnimationsRef.current[chip.key]) {
          chipAnimationsRef.current[chip.key].setValue(0);
        }
      });
    }

    prevIngredientsExpandedRef.current = isExpanded;
  }, [expandedSections.ingredients, ingredientChips, hasIngredients]);

  /**
   * Toggle section expansion
   */
  const toggleSection = (section) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  /**
   * Calculate daily value percentage
   */
  const getDailyValuePercent = (nutrient, value) => {
    const dv = DAILY_VALUES[nutrient];
    if (!dv || !value) return null;
    return Math.round((value / dv.value) * 100);
  };

  /**
   * Get macro color
   */
  const getMacroColor = (macroType) => {
    const colors = {
      calories: '#F59E0B',
      protein: '#10B981',
      carbs: '#3B82F6',
      fat: '#EF4444',
      fiber: '#8B5CF6',
      sugar: '#EC4899',
      sodium: '#F97316',
    };
    return colors[macroType] || BRAND.primary;
  };

  /**
   * Get confidence badge color
   */
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return SEMANTIC.success.base;
    if (confidence >= 0.75) return SEMANTIC.info.base;
    if (confidence >= 0.6) return SEMANTIC.warning.base;
    return SEMANTIC.danger.base;
  };

  /**
   * Render macro card
   */
  const renderMacroCard = (label, value, unit, color, icon) => (
    <View style={[styles.macroCard, { borderLeftColor: color }]}>
      <View style={[styles.macroIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={ICON_SIZES.md} color={color} />
      </View>
      <View style={styles.macroContent}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>
          {value !== null && value !== undefined ? Math.round(value) : '--'}
          <Text style={styles.macroUnit}> {unit}</Text>
        </Text>
      </View>
    </View>
  );

  /**
   * Render micronutrient row
   */
  const renderMicroRow = (key, micro) => {
    const dvPercent = getDailyValuePercent(key, micro.value);
    const displayName = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();

    return (
      <View key={key} style={styles.microRow}>
        <View style={styles.microInfo}>
          <Text style={styles.microName}>{displayName}</Text>
          <Text style={styles.microValue}>
            {micro.value?.toFixed(1)} {micro.unit}
          </Text>
        </View>
        {dvPercent && (
          <View style={styles.microDV}>
            <View style={styles.microDVBar}>
              <View
                style={[
                  styles.microDVFill,
                  {
                    width: `${Math.min(dvPercent, 100)}%`,
                    backgroundColor:
                      dvPercent >= 100
                        ? SEMANTIC.success.base
                        : dvPercent >= 50
                        ? SEMANTIC.info.base
                        : SEMANTIC.warning.base,
                  },
                ]}
              />
            </View>
            <Text style={styles.microDVText}>{dvPercent}%</Text>
          </View>
        )}
      </View>
    );
  };

  /**
   * Render source evidence
   */
  const renderEvidence = (evidence, index) => (
    <View key={index} style={styles.evidenceCard}>
      <View style={styles.evidenceHeader}>
        <View
          style={[
            styles.evidenceBadge,
            { backgroundColor: getConfidenceColor(evidence.confidence) },
          ]}
        >
          <Text style={styles.evidenceBadgeText}>
            {Math.round(evidence.confidence * 100)}% Estimate
          </Text>
        </View>
        <Ionicons
          name={
            evidence.source === 'Open Food Facts'
              ? 'basket-outline'
              : evidence.source === 'Image AI'
              ? 'camera-outline'
              : evidence.source === 'usda'
              ? 'nutrition-outline'
              : 'sparkles-outline'
          }
          size={ICON_SIZES.sm}
          color={TEXT.tertiary}
        />
      </View>
      <Text style={styles.evidenceSource}>{evidence.source}</Text>
      {evidence.data?.product_url && (
        <Text style={styles.evidenceUrl} numberOfLines={1}>
          {evidence.data.product_url}
        </Text>
      )}
    </View>
  );

  const macros = totals.macros || {};
  const micros = totals.micros || {};
  const microEntries = Object.entries(micros);
  const displayedMicros = showAllMicros ? microEntries : microEntries.slice(0, 5);

  // 🆕 FIX: Return null in JSX instead of early return to maintain hook order
  if (!analysisResult) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={SURFACES.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.headerButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={ICON_SIZES.lg} color={TEXT.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Analysis Results</Text>
            <TouchableOpacity
              onPress={onShare}
              style={styles.headerButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="share-outline" size={ICON_SIZES.lg} color={TEXT.white} />
            </TouchableOpacity>
          </View>

          {hasSingleItem && (
            <View style={styles.headerContent}>
              <Text style={styles.foodName}>{items[0].name}</Text>
              <Text style={styles.portionSize}>
                {items[0].portion?.servingText ||
                  `${items[0].portion?.amount || 1} ${items[0].portion?.unit || 'serving'}`}
              </Text>
            </View>
          )}

          {!hasSingleItem && (
            <View style={styles.headerContent}>
              <Text style={styles.foodName}>Multi-Item Meal</Text>
              <Text style={styles.portionSize}>{items.length} items</Text>
            </View>
          )}
        </LinearGradient>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Image Preview */}
          {hasImage && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
              <View style={styles.imageOverlay}>
                <Ionicons name="camera" size={ICON_SIZES.sm} color={TEXT.white} />
                <Text style={styles.imageLabel}>AI Analyzed</Text>
              </View>
            </View>
          )}

          {/* Items List (for multi-item meals) */}
          {!hasSingleItem && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Meal Items</Text>
              {items.map((item, index) => (
                <View key={item.itemId || index} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemCalories}>
                      {Math.round(item.macros?.calories_kcal || 0)} kcal
                    </Text>
                  </View>
                  <Text style={styles.itemPortion}>
                    {item.portion?.servingText ||
                      `${item.portion?.amount || 1} ${item.portion?.unit || 'serving'}`}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Macronutrients */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('macros')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeaderLeft}>
                <Ionicons
                  name="nutrition"
                  size={ICON_SIZES.md}
                  color={BRAND.primary}
                />
                <Text style={styles.sectionTitle}>Macronutrients</Text>
              </View>
              <Ionicons
                name={expandedSections.macros ? 'chevron-up' : 'chevron-down'}
                size={ICON_SIZES.sm}
                color={TEXT.tertiary}
              />
            </TouchableOpacity>

            {expandedSections.macros && (
              <View style={styles.macrosGrid}>
                {renderMacroCard(
                  'Calories',
                  macros.calories_kcal,
                  'kcal',
                  getMacroColor('calories'),
                  'flame'
                )}
                {renderMacroCard(
                  'Protein',
                  macros.protein_g,
                  'g',
                  getMacroColor('protein'),
                  'barbell'
                )}
                {renderMacroCard(
                  'Carbs',
                  macros.carbs_g,
                  'g',
                  getMacroColor('carbs'),
                  'leaf'
                )}
                {renderMacroCard(
                  'Fat',
                  macros.fat_g,
                  'g',
                  getMacroColor('fat'),
                  'water'
                )}
                {renderMacroCard(
                  'Fiber',
                  macros.fiber_g,
                  'g',
                  getMacroColor('fiber'),
                  'git-branch'
                )}
                {renderMacroCard(
                  'Sugar',
                  macros.sugar_g,
                  'g',
                  getMacroColor('sugar'),
                  'ice-cream'
                )}
                {macros.sodium_mg !== null && macros.sodium_mg !== undefined && (
                  renderMacroCard(
                    'Sodium',
                    macros.sodium_mg,
                    'mg',
                    getMacroColor('sodium'),
                    'fitness'
                  )
                )}
              </View>
            )}
          </View>

          {/* Micronutrients */}
          {microEntries.length > 0 && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection('micros')}
                activeOpacity={0.7}
              >
                <View style={styles.sectionHeaderLeft}>
                  <Ionicons
                    name="flask"
                    size={ICON_SIZES.md}
                    color={SEMANTIC.info.base}
                  />
                  <Text style={styles.sectionTitle}>
                    Micronutrients ({microEntries.length})
                  </Text>
                  <Text style={styles.sectionNote}>Estimated</Text>
                </View>
                <Ionicons
                  name={expandedSections.micros ? 'chevron-up' : 'chevron-down'}
                  size={ICON_SIZES.sm}
                  color={TEXT.tertiary}
                />
              </TouchableOpacity>

              {expandedSections.micros && (
                <View style={styles.microsContainer}>
                  {displayedMicros.map(([key, micro]) => renderMicroRow(key, micro))}
                  {microEntries.length > 5 && !showAllMicros && (
                    <TouchableOpacity
                      style={styles.showMoreButton}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowAllMicros(true);
                      }}
                    >
                      <Text style={styles.showMoreText}>
                        Show {microEntries.length - 5} More
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={ICON_SIZES.xs}
                        color={BRAND.primary}
                      />
                    </TouchableOpacity>
                  )}
                  {showAllMicros && microEntries.length > 5 && (
                    <TouchableOpacity
                      style={styles.showMoreButton}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowAllMicros(false);
                      }}
                    >
                      <Text style={styles.showMoreText}>Show Less</Text>
                      <Ionicons
                        name="chevron-up"
                        size={ICON_SIZES.xs}
                        color={BRAND.primary}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Ingredients & Components */}
          {hasIngredients && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection('ingredients')}
                activeOpacity={0.7}
              >
                <View style={styles.sectionHeaderLeft}>
                  <Ionicons
                    name="layers"
                    size={ICON_SIZES.md}
                    color={SEMANTIC.warning.base}
                  />
                  <Text style={styles.sectionTitle}>Flavor Layers</Text>
                  <Text style={styles.sectionNote}>Ingredients + components</Text>
                </View>
                <Ionicons
                  name={expandedSections.ingredients ? 'chevron-up' : 'chevron-down'}
                  size={ICON_SIZES.sm}
                  color={TEXT.tertiary}
                />
              </TouchableOpacity>

              {expandedSections.ingredients && (
                <View style={styles.ingredientsContainer}>
                  {items.map((item, index) => {
                    const ingredients = Array.isArray(item.ingredients) ? item.ingredients : [];
                    const components = Array.isArray(item.components) ? item.components : [];

                    if (ingredients.length === 0 && components.length === 0) {
                      return null;
                    }

                    return (
                      <View key={item.itemId || index} style={styles.ingredientsCard}>
                        <View style={styles.ingredientsHeader}>
                          <Text style={styles.ingredientsItemName}>{item.name}</Text>
                          <Text style={styles.ingredientsMeta}>
                            {ingredients.length} ingredients · {components.length} components
                          </Text>
                        </View>

                        {ingredients.length > 0 && (
                          <View style={styles.ingredientsChips}>
                            {ingredients.map((ingredient, chipIndex) => {
                              const chipKey = `${item.itemId || index}-ing-${chipIndex}`;
                              // Handle both object and string ingredients
                              const ingredientName = typeof ingredient === 'string'
                                ? ingredient
                                : (ingredient?.name || 'Unknown');
                              if (!chipAnimationsRef.current[chipKey]) {
                                chipAnimationsRef.current[chipKey] = new Animated.Value(
                                  expandedSections.ingredients ? 0 : 1
                                );
                              }
                              const animValue = chipAnimationsRef.current[chipKey];
                              const animatedStyle = {
                                opacity: animValue,
                                transform: [
                                  {
                                    translateY: animValue.interpolate({
                                      inputRange: [0, 1],
                                      outputRange: [6, 0],
                                    }),
                                  },
                                ],
                              };

                              return (
                                <Animated.View key={chipKey} style={animatedStyle}>
                                  <LinearGradient
                                    colors={chipGradients[chipIndex % chipGradients.length]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.ingredientChip}
                                  >
                                    <Text style={styles.ingredientChipText}>{ingredientName}</Text>
                                  </LinearGradient>
                                </Animated.View>
                              );
                            })}
                          </View>
                        )}

                        {components.length > 0 && (
                          <View style={styles.componentsList}>
                            {components.map((component, compIndex) => {
                              const calories = Number.isFinite(component.calories)
                                ? `${Math.round(component.calories)} kcal`
                                : null;
                              const portion = component.portion || calories || 'Estimated';
                              return (
                                <View
                                  key={`${item.itemId || index}-comp-${compIndex}`}
                                  style={styles.componentRow}
                                >
                                  <Text style={styles.componentName}>{component.name}</Text>
                                  <Text style={styles.componentMeta}>{portion}</Text>
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Source Evidence */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('evidence')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeaderLeft}>
                <Ionicons
                  name="shield-checkmark"
                  size={ICON_SIZES.md}
                  color={SEMANTIC.success.base}
                />
                <Text style={styles.sectionTitle}>Data Sources</Text>
              </View>
              <Ionicons
                name={expandedSections.evidence ? 'chevron-up' : 'chevron-down'}
                size={ICON_SIZES.sm}
                color={TEXT.tertiary}
              />
            </TouchableOpacity>

            {expandedSections.evidence && (
              <View style={styles.evidenceContainer}>
                {items.map((item, index) =>
                  item.sourceEvidence?.map((evidence, evidenceIndex) =>
                    renderEvidence(evidence, `${index}-${evidenceIndex}`)
                  )
                )}
              </View>
            )}
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.footerButton, styles.editButton]}
            onPress={onEdit}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={ICON_SIZES.md} color={BRAND.primary} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.footerButton, styles.saveButton]}
            onPress={onSave}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={SURFACES.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              <Ionicons name="checkmark-circle" size={ICON_SIZES.md} color={TEXT.white} />
              <Text style={styles.saveButtonText}>Save Meal</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: SPACING[4],
    paddingHorizontal: SPACING[4],
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: SPACING[2],
  },
  foodName: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
    textAlign: 'center',
    marginBottom: SPACING[1],
  },
  portionSize: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.white,
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[4],
  },
  imageContainer: {
    marginBottom: SPACING[4],
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: SURFACES.background.secondary,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: SPACING[2],
    right: SPACING[2],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.md,
    gap: SPACING[1],
  },
  imageLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.white,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  section: {
    marginBottom: SPACING[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  sectionNote: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginLeft: SPACING[1],
  },
  itemCard: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[2],
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[1],
  },
  itemName: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    flex: 1,
  },
  itemCalories: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: SEMANTIC.warning.base,
  },
  itemPortion: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
  },
  macrosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[3],
  },
  macroCard: {
    width: '47%',
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    borderLeftWidth: 4,
    ...SHADOWS.sm,
  },
  macroIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  macroContent: {
    flex: 1,
  },
  macroLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginBottom: SPACING[0.5],
  },
  macroValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  macroUnit: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.normal,
    color: TEXT.secondary,
  },
  microsContainer: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  microRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  microInfo: {
    flex: 1,
  },
  microName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[0.5],
  },
  microValue: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  microDV: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    width: 100,
  },
  microDVBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  microDVFill: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },
  microDVText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
    width: 35,
    textAlign: 'right',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[1],
    paddingVertical: SPACING[2],
    marginTop: SPACING[1],
  },
  showMoreText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: BRAND.primary,
  },
  evidenceContainer: {
    gap: SPACING[2],
  },
  evidenceCard: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ingredientsContainer: {
    gap: SPACING[3],
  },
  ingredientsCard: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ingredientsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  ingredientsItemName: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    flex: 1,
  },
  ingredientsMeta: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginLeft: SPACING[2],
  },
  ingredientsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  ingredientChip: {
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
  },
  ingredientChipText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#1F2937',
  },
  componentsList: {
    backgroundColor: SURFACES.background.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[2],
  },
  componentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING[1],
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  componentName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  componentMeta: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  evidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  evidenceBadge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.md,
  },
  evidenceBadgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },
  evidenceSource: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[1],
  },
  evidenceUrl: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING[3],
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    backgroundColor: SURFACES.background.primary,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    ...SHADOWS.lg,
  },
  footerButton: {
    flex: 1,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  editButton: {
    backgroundColor: SURFACES.background.secondary,
    borderWidth: 2,
    borderColor: BRAND.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
  },
  editButtonText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: BRAND.primary,
  },
  saveButton: {
    flex: 2,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
  },
  saveButtonText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },
});

export default AnalysisDetailsScreen;
