/**
 * RecommendationDetailModal - Comprehensive Nutrition & Recipe View
 *
 * Features:
 * - Full macro and micronutrient breakdown
 * - Recipe instructions with prep time
 * - Portion size customization with real-time nutrition scaling
 * - Quick-add to food log
 * - Save to favorites
 * - Reject with detailed reasons
 * - Smooth animations
 *
 * Props:
 * - visible: boolean
 * - recommendation: object (food data with nutrition)
 * - onClose: () => void
 * - onAccept: (rec) => Promise<void>
 * - onReject: (rec, reason) => Promise<void>
 * - onSaveForLater: (rec) => void
 */

import React, { useState, useRef, useEffect } from 'react';
import { TEXT, SURFACES, TYPOGRAPHY } from '../../constants/premiumTheme';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  useWindowDimensions,
  Pressable
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MultipleWarnings } from '../recommendations/WarningBadge';

// Daily values for micronutrient calculations (FDA standards)
const DAILY_VALUES = {
  vitaminA: 900,
  vitaminC: 90,
  vitaminD: 20,
  vitaminE: 15,
  vitaminK: 120,
  vitaminB6: 1.7,
  vitaminB12: 2.4,
  folate: 400,
  calcium: 1300,
  iron: 18,
  magnesium: 420,
  potassium: 4700,
  sodium: 2300,
  zinc: 11,
  copper: 0.9,
  manganese: 2.3,
  iodine: 150,
  selenium: 55,
};

// Color theme
const COLORS = {
  primary: '#10B981',
  secondary: '#3B82F6',
  success: '#06B6D4',
  warning: '#F59E0B',
  danger: '#EF4444',
  neutral100: '#F3F4F6',
  neutral200: SURFACES.divider,
  neutral600: TEXT.secondary,
  neutral900: TEXT.primary,
  white: '#FFFFFF',
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
};

export default function RecommendationDetailModal({
  visible,
  recommendation,
  onClose,
  onAccept,
  onReject,
  onSaveForLater
}) {
  const [portionMultiplier, setPortionMultiplier] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [showRejectOptions, setShowRejectOptions] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sheetSlideAnim = useRef(new Animated.Value(1000)).current;

  useWindowDimensions();

  // Animate in when modal opens
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 10
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
    } else {
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
      sheetSlideAnim.setValue(1000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Animate reject sheet in
  useEffect(() => {
    if (showRejectOptions) {
      Animated.spring(sheetSlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 10
      }).start();
    } else {
      Animated.timing(sheetSlideAnim, {
        toValue: 1000,
        duration: 200,
        useNativeDriver: true
      }).start();
    }
  }, [showRejectOptions, sheetSlideAnim]);

  if (!recommendation) return null;

  // Calculate scaled nutrition based on portion multiplier
  const scaledNutrition = {
    calories: Math.round(recommendation.calories * portionMultiplier),
    protein: Math.round(recommendation.protein * portionMultiplier),
    carbs: Math.round(recommendation.carbs * portionMultiplier),
    fats: Math.round(recommendation.fats * portionMultiplier),
    fiber: Math.round((recommendation.fiber || 0) * portionMultiplier),
    sugar: Math.round((recommendation.sugar || 0) * portionMultiplier)
  };

  // Handle portion adjustment
  const adjustPortion = (multiplier) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPortionMultiplier(multiplier);
  };

  // Handle accept
  const handleAccept = async () => {
    try {
      setLoading(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await onAccept({
        ...recommendation,
        portionMultiplier,
        scaledNutrition
      });

      setLoading(false);
      onClose();
    } catch (error) {
      console.error('[RecommendationDetailModal] Accept error:', error);
      setLoading(false);
    }
  };

  // Handle reject
  const handleReject = async (reason) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await onReject(recommendation, reason);
      setShowRejectOptions(false);
      onClose();
    } catch (error) {
      console.error('[RecommendationDetailModal] Reject error:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      {/* Overlay */}
      <Animated.View
        style={[
          styles.overlay,
          { opacity: fadeAnim }
        ]}
      >
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* Modal Container */}
      <Animated.View
        style={[
          styles.modalContainer,
          {
            opacity: fadeAnim,
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              })
            }]
          }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.emoji, { backgroundColor: `${getRecommendationColor(recommendation.title)}20` }]}>
              <Text style={styles.emojiText}>
                {recommendation.title?.split(' ')[0] || '🥗'}
              </Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.foodName}>{recommendation.foodName}</Text>
              <Text style={styles.recommendation}>{recommendation.title || 'Recommended'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.neutral600} />
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          {/* Reason Badge */}
          {recommendation.reason && (
            <View style={styles.reasonBadge}>
              <MaterialIcons name="lightbulb" size={16} color={COLORS.primary} />
              <Text style={styles.reasonText}>{recommendation.reason}</Text>
            </View>
          )}

          {/* Phase 5: Warning Badges for Dietary Issues */}
          {recommendation.warnings && recommendation.warnings.length > 0 && (
            <View style={styles.warningSection}>
              <MultipleWarnings warnings={recommendation.warnings} maxDisplay={3} />
            </View>
          )}

          {/* Portion Control Section */}
          <View style={styles.portionSection}>
            <Text style={styles.sectionTitle}>Portion Size</Text>
            <Text style={styles.portionValue}>
              {portionMultiplier}x serving ({recommendation.portion})
            </Text>
            <View style={styles.portionControls}>
              {[0.5, 1.0, 1.5, 2.0].map(multiplier => (
                <TouchableOpacity
                  key={multiplier}
                  style={[
                    styles.portionButton,
                    portionMultiplier === multiplier && styles.portionButtonActive
                  ]}
                  onPress={() => adjustPortion(multiplier)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.portionButtonText,
                      portionMultiplier === multiplier && styles.portionButtonTextActive
                    ]}
                  >
                    {multiplier}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Macronutrients Section */}
          <View style={styles.macroSection}>
            <Text style={styles.sectionTitle}>Nutrition Facts</Text>
            <View style={styles.macroGrid}>
              <MacroCard
                label="Calories"
                value={scaledNutrition.calories}
                unit="kcal"
                color={COLORS.warning}
                icon="flame"
              />
              <MacroCard
                label="Protein"
                value={scaledNutrition.protein}
                unit="g"
                color={COLORS.primary}
                icon="dumbbell"
              />
              <MacroCard
                label="Carbs"
                value={scaledNutrition.carbs}
                unit="g"
                color={COLORS.secondary}
                icon="leaf"
              />
              <MacroCard
                label="Fat"
                value={scaledNutrition.fats}
                unit="g"
                color={COLORS.danger}
                icon="droplet"
              />
            </View>

            {/* Fiber and Sugar */}
            {(scaledNutrition.fiber > 0 || scaledNutrition.sugar > 0) && (
              <View style={styles.secondaryMacros}>
                {scaledNutrition.fiber > 0 && (
                  <Text style={styles.secondaryMacroText}>
                    Fiber: <Text style={styles.bold}>{scaledNutrition.fiber}g</Text>
                  </Text>
                )}
                {scaledNutrition.sugar > 0 && (
                  <Text style={styles.secondaryMacroText}>
                    Sugar: <Text style={styles.bold}>{scaledNutrition.sugar}g</Text>
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Micronutrients Section */}
          {recommendation.micros && Object.keys(recommendation.micros).length > 0 && (
            <View style={styles.microSection}>
              <Text style={styles.sectionTitle}>Key Nutrients</Text>
              <View style={styles.microList}>
                {Object.entries(recommendation.micros).slice(0, 8).map(([key, value]) => (
                  <MicronutrientRow
                    key={key}
                    name={formatMicroName(key)}
                    value={value}
                    dailyValue={DAILY_VALUES[key]}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Recipe Instructions Section */}
          {recommendation.recipeInstructions && (
            <View style={styles.recipeSection}>
              <View style={styles.recipeSectionHeader}>
                <Text style={styles.sectionTitle}>How to Prepare</Text>
                {recommendation.prepTimeMinutes && (
                  <View style={styles.prepTimeBadge}>
                    <Ionicons name="time-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.prepTimeText}>
                      {recommendation.prepTimeMinutes} min
                    </Text>
                  </View>
                )}
              </View>

              {typeof recommendation.recipeInstructions === 'string' ? (
                <Text style={styles.recipeText}>
                  {recommendation.recipeInstructions}
                </Text>
              ) : Array.isArray(recommendation.recipeInstructions) ? (
                <View>
                  {recommendation.recipeInstructions.map((step, idx) => (
                    <Text key={idx} style={styles.recipeStep}>
                      <Text style={styles.recipeStepNumber}>{idx + 1}. </Text>
                      {step}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          )}

          {/* Tips Section */}
          {recommendation.tips && (
            <View style={styles.tipsSection}>
              <Ionicons name="information-circle" size={20} color={COLORS.secondary} />
              <Text style={styles.tipsText}>{recommendation.tips}</Text>
            </View>
          )}

          {/* Spacing */}
          <View style={{ height: SPACING.xl }} />
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {/* Reject Button */}
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={() => setShowRejectOptions(true)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={20} color={COLORS.neutral600} />
            <Text style={styles.rejectButtonText}>Not Interested</Text>
          </TouchableOpacity>

          {/* Save for Later */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => {
              onSaveForLater(recommendation);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="bookmark-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>

          {/* Add Button */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAccept}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.primary, '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <MaterialIcons name="add-circle" size={20} color={COLORS.white} />
                  <Text style={styles.addButtonText}>Add to Log</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Reject Options Sheet */}
        <RejectOptionsSheet
          visible={showRejectOptions}
          sheetSlideAnim={sheetSlideAnim}
          onSelect={handleReject}
          onClose={() => setShowRejectOptions(false)}
        />
      </Animated.View>
    </Modal>
  );
}

// Sub-component: MacroCard
function MacroCard({ label, value, unit, color, icon }) {
  return (
    <View style={[styles.macroCard, { borderLeftColor: color }]}>
      <View style={[styles.macroIcon, { backgroundColor: `${color}15` }]}>
        <MaterialIcons name={icon} size={22} color={color} />
      </View>
      <View style={styles.macroContent}>
        <Text style={styles.macroValue}>
          {value}<Text style={styles.macroUnit}>{unit}</Text>
        </Text>
        <Text style={styles.macroLabel}>{label}</Text>
      </View>
    </View>
  );
}

// Sub-component: MicronutrientRow
function MicronutrientRow({ name, value, dailyValue }) {
  const percentage = dailyValue ? Math.round((value / dailyValue) * 100) : null;
  const isSignificant = percentage && percentage >= 10;

  return (
    <View style={[styles.microRow, isSignificant && styles.microRowSignificant]}>
      <Text style={styles.microName}>{name}</Text>
      <View style={styles.microRight}>
        <Text style={styles.microValue}>{value}</Text>
        {percentage && (
          <Text style={[
            styles.microPercent,
            isSignificant && styles.microPercentSignificant
          ]}>
            {percentage}% DV
          </Text>
        )}
      </View>
    </View>
  );
}

// Sub-component: RejectOptionsSheet
function RejectOptionsSheet({ visible, sheetSlideAnim, onSelect, onClose }) {
  const rejectReasons = [
    { id: 'dont_like', label: "Don't like this food", icon: 'close-circle' },
    { id: 'allergic', label: "Allergic/intolerant", icon: 'warning' },
    { id: 'too_complex', label: "Too complex to make", icon: 'access-time' },
    { id: 'not_available', label: "Ingredients not available", icon: 'shopping-cart' },
    { id: 'other', label: "Other reason", icon: 'more-horiz' }
  ];

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.rejectSheet,
        { transform: [{ translateY: sheetSlideAnim }] }
      ]}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
      />

      <View style={styles.rejectSheetContent}>
        <View style={styles.rejectSheetHeader}>
          <Text style={styles.rejectSheetTitle}>Why not interested?</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.neutral600} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.rejectOptions} showsVerticalScrollIndicator={false}>
          {rejectReasons.map(reason => (
            <TouchableOpacity
              key={reason.id}
              style={styles.rejectOption}
              onPress={() => onSelect(reason.id)}
              activeOpacity={0.6}
            >
              <View style={styles.rejectOptionLeft}>
                <MaterialIcons
                  name={reason.icon}
                  size={20}
                  color={COLORS.neutral600}
                />
                <Text style={styles.rejectOptionText}>{reason.label}</Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={COLORS.neutral200}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Animated.View>
  );
}

// Helper function: Format micronutrient name
function formatMicroName(key) {
  const names = {
    vitaminA: 'Vitamin A',
    vitaminC: 'Vitamin C',
    vitaminD: 'Vitamin D',
    vitaminE: 'Vitamin E',
    vitaminK: 'Vitamin K',
    vitaminB6: 'Vitamin B6',
    vitaminB12: 'Vitamin B12',
    folate: 'Folate',
    calcium: 'Calcium',
    iron: 'Iron',
    magnesium: 'Magnesium',
    potassium: 'Potassium',
    sodium: 'Sodium',
    zinc: 'Zinc',
    copper: 'Copper',
    manganese: 'Manganese',
    iodine: 'Iodine',
    selenium: 'Selenium',
  };
  return names[key] || key;
}

// Helper function: Get recommendation color
function getRecommendationColor(title) {
  const titleStr = String(title || '').toLowerCase();
  if (titleStr.includes('protein')) return COLORS.warning;
  if (titleStr.includes('snack')) return COLORS.primary;
  if (titleStr.includes('hydration')) return COLORS.secondary;
  if (titleStr.includes('regional')) return '#8B5CF6';
  return COLORS.primary;
}

// Styles
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    maxHeight: '85%',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral100,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  emoji: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 24,
    fontFamily: TYPOGRAPHY.family.regular,
  },
  headerText: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: COLORS.neutral900,
    marginBottom: 2,
  },
  recommendation: {
    fontSize: 13,
    color: COLORS.neutral600,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.bold,
    color: COLORS.neutral900,
    marginBottom: SPACING.md,
  },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  reasonText: {
    fontSize: 13,
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.family.medium,
    flex: 1,
  },
  warningSection: {
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  portionSection: {
    marginBottom: SPACING.xl,
  },
  portionValue: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: COLORS.neutral600,
    marginBottom: SPACING.md,
  },
  portionControls: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  portionButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.neutral200,
    alignItems: 'center',
    backgroundColor: COLORS.neutral100,
  },
  portionButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  portionButtonText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: COLORS.neutral600,
  },
  portionButtonTextActive: {
    color: COLORS.white,
  },
  macroSection: {
    marginBottom: SPACING.xl,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  macroCard: {
    flex: 1,
    minWidth: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderLeftWidth: 4,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.neutral100,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  macroIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  macroContent: {
    flex: 1,
  },
  macroValue: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: COLORS.neutral900,
  },
  macroUnit: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  macroLabel: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: COLORS.neutral600,
    marginTop: 2,
  },
  secondaryMacros: {
    flexDirection: 'row',
    gap: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral200,
  },
  secondaryMacroText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: COLORS.neutral600,
  },
  bold: {
    fontFamily: TYPOGRAPHY.family.bold,
    color: COLORS.neutral900,
  },
  microSection: {
    marginBottom: SPACING.xl,
  },
  microList: {
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.neutral100,
    overflow: 'hidden',
  },
  microRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral200,
  },
  microRowSignificant: {
    backgroundColor: `${COLORS.primary}05`,
  },
  microName: {
    fontSize: 13,
    color: COLORS.neutral900,
    fontFamily: TYPOGRAPHY.family.medium,
    flex: 1,
  },
  microRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  microValue: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: COLORS.neutral900,
  },
  microPercent: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: COLORS.neutral600,
    minWidth: 50,
    textAlign: 'right',
  },
  microPercentSignificant: {
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  recipeSection: {
    marginBottom: SPACING.xl,
  },
  recipeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  prepTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    gap: SPACING.xs,
  },
  prepTimeText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: COLORS.primary,
  },
  recipeText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    lineHeight: 20,
    color: COLORS.neutral600,
    backgroundColor: COLORS.neutral100,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  recipeStep: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    lineHeight: 20,
    color: COLORS.neutral600,
    marginBottom: SPACING.sm,
  },
  recipeStepNumber: {
    fontFamily: TYPOGRAPHY.family.bold,
    color: COLORS.primary,
  },
  tipsSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    backgroundColor: `${COLORS.secondary}10`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xl,
  },
  tipsText: {
    flex: 1,
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    lineHeight: 20,
    color: COLORS.neutral600,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral100,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.neutral200,
    backgroundColor: COLORS.neutral100,
  },
  rejectButtonText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: COLORS.neutral600,
  },
  saveButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}10`,
  },
  addButton: {
    flex: 1.2,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.bold,
    color: COLORS.white,
  },
  rejectSheet: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  rejectSheetContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingTop: SPACING.lg,
    maxHeight: '60%',
  },
  rejectSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral100,
  },
  rejectSheetTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: COLORS.neutral900,
  },
  rejectOptions: {
    paddingHorizontal: SPACING.lg,
  },
  rejectOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral100,
  },
  rejectOptionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  rejectOptionText: {
    fontSize: 14,
    color: COLORS.neutral900,
    fontFamily: TYPOGRAPHY.family.medium,
  },
});
