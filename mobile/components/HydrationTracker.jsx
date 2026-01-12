/**
 * ============================================================================
 * HydrationTracker - Ultra-Premium Interactive Water Logging Experience
 * ============================================================================
 * World-class UX with:
 * - Haptic feedback on all interactions
 * - Celebration confetti & animations
 * - Swipe-to-delete gestures
 * - Progress glow effects
 * - Achievement milestones
 * - Smart quick-add suggestions
 * - Smooth liquid wave animations
 * - Empty state with onboarding
 * - Micro-interactions everywhere
 *
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  AccessibilityInfo,
  TextInput,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import HydrationProgressRing from './hydration/HydrationProgressRing';
import HydrationHistorySection from './hydration/HydrationHistorySection';
import Confetti from './hydration/HydrationConfetti';
import { BeverageChip, PremiumQuickAddButton } from './hydration/HydrationInputs';
import { UndoToast, MilestoneToast } from './hydration/HydrationToasts';

import { TEXT, SEMANTIC, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ICON_SIZES, SURFACES, SEMANTIC_ACTIONS } from '../constants/premiumTheme';

// ============================================================================
// CONSTANTS & CONFIG - Using single source of truth
// ============================================================================
import {
  BEVERAGE_TYPES,
  QUICK_ADD_SIZES,
  HYDRATION_MILESTONES as MILESTONES,
  getBeverageWarning,
  getPairingRecommendation,
  shouldAvoidBeverage,
} from '../constants/beverageConstants';

// Gamified tips and motivational messages
const HYDRATION_TIPS = [
  { emoji: '💡', message: 'Drink water before meals to aid digestion!' },
  { emoji: '🧠', message: 'Your brain is 75% water - stay sharp!' },
  { emoji: '⚡', message: 'Hydration boosts energy levels naturally!' },
  { emoji: '✨', message: 'Water helps maintain healthy skin glow!' },
  { emoji: '🏃', message: 'Drink water 30 mins before exercise!' },
  { emoji: '🌙', message: 'Hydrate early, sleep better tonight!' },
  { emoji: '💪', message: 'Water aids muscle recovery!' },
  { emoji: '🎯', message: 'Consistency is key - you are doing great!' },
  { emoji: '🔥', message: 'Water helps regulate body temperature!' },
  { emoji: '🌟', message: 'Small sips throughout the day work best!' },
  { emoji: '🎪', message: 'Thirsty? You are already slightly dehydrated!' },
  { emoji: '🚀', message: 'Water carries nutrients to your cells!' },
  { emoji: '💎', message: 'Clear urine = well hydrated!' },
  { emoji: '🌊', message: 'Every sip counts toward your goal!' },
  { emoji: '🎨', message: 'Mix it up - add lemon or cucumber!' },
];

// ============================================================================
// CONFETTI PARTICLE - For celebration
// ============================================================================

// MAIN COMPONENT
// ============================================================================

export default function HydrationTracker({
  currentIntake = 0,
  dailyGoal = 2.0,
  onLogWater,
  onRemoveWater,
  beverageHistory = [],
}) {
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [lastEntry, setLastEntry] = useState(null);
  const [selectedBeverage, setSelectedBeverage] = useState('water');
  const [showMilestone, setShowMilestone] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [previousPercentage, setPreviousPercentage] = useState(0);
  const [milestoneMessage, setMilestoneMessage] = useState(null);
  const [isTipMessage, setIsTipMessage] = useState(false);
  const [logCount, setLogCount] = useState(0);
  const [shownFirstLogToast, setShownFirstLogToast] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustomInputFocused, setIsCustomInputFocused] = useState(false);
  const [loadingButton, setLoadingButton] = useState(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Ref to prevent concurrent operations
  const syncInFlightRef = useRef(false);

  // Check for reduced motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const percentage = Math.min((currentIntake / dailyGoal) * 100, 100);
  const remainingLiters = Math.max(dailyGoal - currentIntake, 0);
  const remainingMl = Math.round(remainingLiters * 1000);
  const goalReached = percentage >= 100;

  // Check for milestone achievements
  useEffect(() => {
    const currentMilestone = MILESTONES.find(m =>
      percentage >= m && previousPercentage < m
    );

    if (currentMilestone) {
      setMilestoneMessage(null);
      setIsTipMessage(false);
      setShowMilestone(currentMilestone);

      if (currentMilestone === 100) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    }

    setPreviousPercentage(percentage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percentage]);

  // Show random tips periodically (every 3 logs, not at milestones)
  useEffect(() => {
    // Show tip every 3 logs, but not if we just hit a milestone
    const shouldShowTip = logCount > 0 && logCount % 3 === 0 && !showMilestone;

    if (shouldShowTip) {
      const randomTip = HYDRATION_TIPS[Math.floor(Math.random() * HYDRATION_TIPS.length)];
      setMilestoneMessage(`${randomTip.emoji} ${randomTip.message}`);
      setIsTipMessage(true);
      setShowMilestone('tip'); // Use a special key for tips

      // Reset after showing
      setTimeout(() => {
        setMilestoneMessage(null);
        setIsTipMessage(false);
      }, 4500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logCount]);

  const handleQuickAdd = useCallback(async (ml) => {
    // Prevent double-clicks with debouncing
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    setLoadingButton(ml); // Show loading state for this button

    try {
      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const bevType = BEVERAGE_TYPES[selectedBeverage];
      const effectiveMl = ml * bevType.hydrationFactor;

      // Generate strong clientEventId for idempotency (prevents duplicates from network retries)
      const timestamp = Date.now();
      const random1 = Math.random().toString(36).substring(2, 15);
      const random2 = Math.random().toString(36).substring(2, 15);
      const clientEventId = `hydration-${timestamp}-${random1}-${random2}`;

      const entry = {
        amount: ml,
        type: selectedBeverage,
        effectiveAmount: effectiveMl,
        timestamp,
        clientEventId,
      };

      setLastEntry(entry);
      setShowUndoToast(true);

      // Increment log count for tip tracking
      setLogCount(prev => prev + 1);

      // Show "Great Start" only on first log of the day
      if (beverageHistory.length === 0 && !shownFirstLogToast) {
        setMilestoneMessage('Great start! 🌟');
        setIsTipMessage(false);
        setShowMilestone('firstLog');
        setShownFirstLogToast(true);

        setTimeout(() => {
          setMilestoneMessage(null);
          setShowMilestone(null);
        }, 3500);
      }

      if (onLogWater) {
        await onLogWater(entry);
      }

      // Success haptic
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[HydrationTracker] Error logging water:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoadingButton(null);
      // Release lock after a short delay to prevent rapid clicks
      setTimeout(() => {
        syncInFlightRef.current = false;
      }, 500);
    }
  }, [selectedBeverage, beverageHistory.length, shownFirstLogToast, onLogWater]);

  const handleUndo = useCallback(async () => {
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      if (lastEntry && onRemoveWater && beverageHistory.length > 0) {
        const lastLoggedEntry = beverageHistory[0];
        if (Number.isFinite(lastLoggedEntry?.id)) {
          await onRemoveWater(
            lastLoggedEntry.id,
            lastLoggedEntry.amountLiters,
            lastLoggedEntry.hydrationLiters
          );
        }
      }
      setShowUndoToast(false);
    } finally {
      setTimeout(() => {
        syncInFlightRef.current = false;
      }, 500);
    }
  }, [lastEntry, onRemoveWater, beverageHistory]);

  const handleSwipeDelete = useCallback(async (entry) => {
    if (syncInFlightRef.current) {
      console.log('[HydrationTracker] Delete blocked - sync in flight');
      return;
    }
    syncInFlightRef.current = true;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (!entry) {
        console.error('[HydrationTracker] Delete failed - entry is null/undefined');
        return;
      }

      // Validate entry has required fields
      const entryId = entry.id;
      if (!Number.isFinite(entryId) && typeof entryId !== 'number') {
        console.error('[HydrationTracker] Delete failed - invalid entry id:', entryId, 'entry:', entry);
        return;
      }

      if (onRemoveWater) {
        console.log('[HydrationTracker] Deleting entry:', entryId, 'amount:', entry.amountLiters);
        await onRemoveWater(entryId, entry.amountLiters, entry.hydrationLiters);
      } else {
        console.error('[HydrationTracker] Delete failed - onRemoveWater not provided');
      }
    } catch (error) {
      console.error('[HydrationTracker] Delete error:', error);
    } finally {
      setTimeout(() => {
        syncInFlightRef.current = false;
      }, 500);
    }
  }, [onRemoveWater]);

  // Handle custom amount submission
  const handleCustomAmountSubmit = useCallback(async () => {
    const amount = parseInt(customAmount, 10);
    if (!amount || amount <= 0 || amount > 5000) {
      return; // Invalid amount
    }

    Keyboard.dismiss();
    await handleQuickAdd(amount);
    setCustomAmount('');
  }, [customAmount, handleQuickAdd]);

  // Quick adjust buttons for custom input
  const adjustCustomAmount = useCallback((delta) => {
    Haptics.selectionAsync();
    setCustomAmount(prev => {
      const current = parseInt(prev, 10) || 0;
      const newAmount = Math.max(0, Math.min(5000, current + delta));
      return newAmount > 0 ? String(newAmount) : '';
    });
  }, []);

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <LinearGradient
          colors={SURFACES.gradient.blue}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="water" size={ICON_SIZES.xl} color={TEXT.white} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Hydration Tracker</Text>
                <Text style={styles.headerSubtitle}>Stay hydrated, stay healthy</Text>
              </View>
            </View>
            {goalReached && (
              <View style={styles.goalBadge}>
                <Ionicons name="trophy" size={20} color={SEMANTIC.warning.base} />
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Main Visualization */}
        <View style={styles.visualizationCard}>
          <View style={styles.progressContainer}>
            <HydrationProgressRing
              percentage={percentage}
              size={200}
              strokeWidth={14}
              reduceMotion={reduceMotion}
              milestones={MILESTONES}
              styles={styles}
            />

            {/* Stats overlay inside ring */}
            <View style={styles.progressCenter}>
              <Text style={styles.progressPercentage}>{Math.round(percentage)}%</Text>
              <Text style={styles.progressLabel}>Hydrated</Text>

              {/* Next milestone indicator */}
              {percentage >= 25 && percentage < 100 && (
                <View style={styles.nextMilestoneChip}>
                  <Ionicons name="flag-outline" size={ICON_SIZES.xs} color={SEMANTIC.info.base} />
                  <Text style={styles.nextMilestoneText}>
                    {MILESTONES.find(m => m > percentage)}% next
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.mainStat}>
              <Text style={styles.mainStatValue}>
                {(currentIntake * 1000).toFixed(0)}ml
              </Text>
              <Text style={styles.mainStatLabel}>Consumed</Text>
            </View>
            <View style={styles.mainStatDivider} />
            <View style={styles.mainStat}>
              <Text style={styles.mainStatValue}>{remainingMl}ml</Text>
              <Text style={styles.mainStatLabel}>Remaining</Text>
            </View>
          </View>

          {goalReached && (
            <View style={styles.goalReachedBanner}>
              <Ionicons name="sparkles" size={20} color="#10B981" />
              <Text style={styles.goalReachedText}>Amazing! Goal achieved! 🎉</Text>
            </View>
          )}
        </View>

        {/* Beverage Selector */}
        <View style={styles.beverageSelectorCard}>
          <Text style={styles.sectionLabel}>Select Beverage</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.beverageScroll}
          >
            {Object.entries(BEVERAGE_TYPES).map(([key, bev]) => (
              <BeverageChip
                key={key}
                bevKey={key}
                bev={bev}
                selected={selectedBeverage === key}
                onSelect={setSelectedBeverage}
                styles={styles}
              />
            ))}
          </ScrollView>

          {/* Beverage Warning/Tip */}
          {(() => {
            const warning = getBeverageWarning(selectedBeverage);
            const shouldAvoid = shouldAvoidBeverage(selectedBeverage);
            const pairing = getPairingRecommendation(selectedBeverage);
            const bevInfo = BEVERAGE_TYPES[selectedBeverage];

            if (shouldAvoid) {
              return (
                <View style={styles.beverageWarning}>
                  <Ionicons name="warning" size={16} color="#F59E0B" />
                  <Text style={styles.beverageWarningText}>
                    {bevInfo?.label || selectedBeverage} is not recommended at this time
                  </Text>
                </View>
              );
            }
            if (warning) {
              return (
                <View style={styles.beverageWarning}>
                  <Ionicons name="information-circle" size={16} color="#3B82F6" />
                  <Text style={styles.beverageWarningText}>{warning}</Text>
                </View>
              );
            }
            if (pairing) {
              return (
                <View style={styles.beverageTip}>
                  <Ionicons name="bulb-outline" size={16} color="#10B981" />
                  <Text style={styles.beverageTipText}>
                    Tip: {pairing.reason}
                  </Text>
                </View>
              );
            }
            if (bevInfo?.tip && selectedBeverage !== 'water') {
              return (
                <View style={styles.beverageTip}>
                  <Ionicons name="leaf-outline" size={16} color="#10B981" />
                  <Text style={styles.beverageTipText}>{bevInfo.tip}</Text>
                </View>
              );
            }
            return null;
          })()}
        </View>

        {/* Quick Add Buttons - Clean 3-button layout */}
        <View style={styles.quickAddCard}>
          <Text style={styles.sectionLabel}>Quick Add</Text>
          <View style={styles.quickAddGrid}>
            {QUICK_ADD_SIZES.filter(s => [250, 500, 750].includes(s.ml)).map((size) => (
              <PremiumQuickAddButton
                key={size.ml}
                size={size}
                onPress={() => handleQuickAdd(size.ml)}
                isLoading={loadingButton === size.ml}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Add ${size.ml} milliliters of ${BEVERAGE_TYPES[selectedBeverage].label}`}
                accessibilityHint="Double tap to log this amount"
                styles={styles}
              />
            ))}
          </View>

          {/* Custom Amount Input */}
          <View style={styles.customAmountSection}>
            <Text style={styles.customAmountLabel}>Custom Amount</Text>
            <View style={styles.customAmountRow}>
              {/* Decrease buttons */}
              <View style={styles.adjustButtonGroup}>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => adjustCustomAmount(-100)}
                  accessibilityLabel="Decrease by 100ml"
                >
                  <Text style={styles.adjustButtonText}>-100</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => adjustCustomAmount(-50)}
                  accessibilityLabel="Decrease by 50ml"
                >
                  <Text style={styles.adjustButtonText}>-50</Text>
                </TouchableOpacity>
              </View>

              {/* Input field */}
              <View style={[
                styles.customInputContainer,
                isCustomInputFocused && styles.customInputContainerFocused
              ]}>
                <TextInput
                  style={styles.customInput}
                  value={customAmount}
                  onChangeText={(text) => setCustomAmount(text.replace(/[^0-9]/g, ''))}
                  onFocus={() => setIsCustomInputFocused(true)}
                  onBlur={() => setIsCustomInputFocused(false)}
                  placeholder="ml"
                  placeholderTextColor={TEXT.muted}
                  keyboardType="number-pad"
                  maxLength={4}
                  returnKeyType="done"
                  onSubmitEditing={handleCustomAmountSubmit}
                  accessibilityLabel="Enter custom amount in milliliters"
                />
                <Text style={styles.customInputUnit}>ml</Text>
              </View>

              {/* Increase buttons */}
              <View style={styles.adjustButtonGroup}>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => adjustCustomAmount(50)}
                  accessibilityLabel="Increase by 50ml"
                >
                  <Text style={styles.adjustButtonText}>+50</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => adjustCustomAmount(100)}
                  accessibilityLabel="Increase by 100ml"
                >
                  <Text style={styles.adjustButtonText}>+100</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Add Custom Button */}
            <TouchableOpacity
              style={[
                styles.addCustomButton,
                (!customAmount || parseInt(customAmount, 10) <= 0) && styles.addCustomButtonDisabled
              ]}
              onPress={handleCustomAmountSubmit}
              disabled={!customAmount || parseInt(customAmount, 10) <= 0}
              accessibilityLabel={`Add ${customAmount || 0} milliliters`}
            >
              <LinearGradient
                colors={customAmount && parseInt(customAmount, 10) > 0
                  ? SURFACES.gradient.blue
                  : [SURFACES.divider, '#D1D5DB']}
                style={styles.addCustomButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons
                  name="add-circle"
                  size={20}
                  color={customAmount && parseInt(customAmount, 10) > 0 ? TEXT.white : TEXT.muted}
                />
                <Text style={[
                  styles.addCustomButtonText,
                  (!customAmount || parseInt(customAmount, 10) <= 0) && styles.addCustomButtonTextDisabled
                ]}>
                  Add {customAmount || '0'}ml
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        <HydrationHistorySection
          beverageHistory={beverageHistory}
          dailyGoal={dailyGoal}
          onDelete={handleSwipeDelete}
          beverageTypes={BEVERAGE_TYPES}
          styles={styles}
        />
      </ScrollView>

      {/* Undo Toast */}
      <UndoToast
        visible={showUndoToast}
        message={`Added ${lastEntry?.amount}ml ${BEVERAGE_TYPES[lastEntry?.type]?.emoji || '💧'}`}
        onUndo={handleUndo}
        onDismiss={() => setShowUndoToast(false)}
        styles={styles}
      />

      {/* Milestone Toast */}
      <MilestoneToast
        milestone={showMilestone}
        visible={!!showMilestone}
        message={milestoneMessage}
        isTip={isTipMessage}
        isFirstLog={showMilestone === 'firstLog'}
        onDismiss={() => {
          setShowMilestone(null);
          setMilestoneMessage(null);
          setIsTipMessage(false);
        }}
        styles={styles}
      />

      {/* Confetti */}
      <Confetti visible={showConfetti} styles={styles} />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING[4],
    paddingBottom: SPACING[8],
  },

  // Header
  headerCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING[5],
    marginBottom: SPACING[4],
    ...SHADOWS.info,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: TEXT.white,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: SPACING[1],
  },
  goalBadge: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.full,
    backgroundColor: SEMANTIC.warning.bg,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.warning,
  },

  // Visualization
  visualizationCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[6],
    marginBottom: SPACING[4],
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  progressContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[6],
    width: 220,
    height: 220,
  },
  ringWrapper: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 0,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCenter: {
    position: 'absolute',
    alignItems: 'center',
    gap: SPACING[2],
  },
  progressPercentage: {
    fontSize: TYPOGRAPHY.size['4xl'],
    fontWeight: TYPOGRAPHY.weight.black,
    color: SEMANTIC.info.base,
    letterSpacing: -1,
  },
  progressLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nextMilestoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    backgroundColor: SEMANTIC.info.bg,
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[2],
    borderRadius: RADIUS.full,
    marginTop: SPACING[2],
  },
  nextMilestoneText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: SEMANTIC.info.base,
  },
  liquidInner: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -60,
    marginLeft: -60,
    zIndex: 1,
  },
  liquidContainer: {
    position: 'relative',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  liquidTextOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liquidPercentage: {
    fontSize: 36,
    fontWeight: TYPOGRAPHY.weight.black,
    color: TEXT.white,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  liquidLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.white,
    fontWeight: TYPOGRAPHY.weight.semibold,
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
    marginBottom: SPACING[4],
  },
  mainStat: {
    alignItems: 'center',
  },
  mainStatValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: SEMANTIC.info.base,
  },
  mainStatLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: 4,
  },
  mainStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: `${SEMANTIC_ACTIONS.success}1A`,
  },
  goalReachedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: '#D1FAE5',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.full,
  },
  goalReachedText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#059669',
  },

  // Beverage Selector
  beverageSelectorCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOWS.sm,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
    marginBottom: SPACING[3],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  beverageScroll: {
    gap: SPACING[2],
    paddingRight: SPACING[4],
  },
  beverageWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginTop: SPACING[3],
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    backgroundColor: '#FEF3C7',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#F59E0B30',
  },
  beverageWarningText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs,
    color: '#92400E',
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  beverageTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginTop: SPACING[3],
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    backgroundColor: '#ECFDF5',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#10B98130',
  },
  beverageTipText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs,
    color: '#065F46',
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  beverageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    minHeight: 44,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.full,
    backgroundColor: SURFACES.background.secondary,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  beverageChipActive: {
    borderColor: SEMANTIC.info.base,
    ...SHADOWS.sm,
  },
  beverageChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    zIndex: 1,
  },
  beverageEmoji: {
    fontSize: 20,
  },
  beverageChipLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.primary,
  },
  beverageMultiplier: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
  },
  multiplierBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: SPACING[1],
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },

  // Quick Add - Clean horizontal pills (WaterMinder/Waterllama inspired)
  quickAddCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOWS.sm,
  },
  quickAddGrid: {
    flexDirection: 'row',
    gap: SPACING[2],
  },
  quickAddTile: {
    flex: 1,
    height: 72,
  },
  quickAddTileWrapper: {
    flex: 1,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  quickAddTileGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING[3],
    gap: SPACING[2],
  },
  quickAddTileLabel: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },
  quickAddTileSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: 'rgba(255, 255, 255, 0.7)',
  },

  // Custom Amount Input
  customAmountSection: {
    marginTop: SPACING[4],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  customAmountLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.tertiary,
    marginBottom: SPACING[3],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
  },
  adjustButtonGroup: {
    flexDirection: 'row',
    gap: SPACING[1],
  },
  adjustButton: {
    backgroundColor: SURFACES.background.secondary,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[2],
    borderRadius: RADIUS.md,
    minWidth: 44,
    alignItems: 'center',
  },
  adjustButtonText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 100,
  },
  customInputContainerFocused: {
    borderColor: SEMANTIC.info.base,
    backgroundColor: TEXT.white,
  },
  customInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    textAlign: 'center',
    minWidth: 60,
    paddingVertical: SPACING[1],
  },
  customInputUnit: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.muted,
    marginLeft: SPACING[1],
  },
  addCustomButton: {
    marginTop: SPACING[3],
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  addCustomButtonDisabled: {
    opacity: 0.6,
  },
  addCustomButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
  },
  addCustomButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.white,
  },
  addCustomButtonTextDisabled: {
    color: TEXT.muted,
  },

  // Stats Card
  statsCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOWS.sm,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[4],
  },
  statsTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: SEMANTIC.info.base,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: `${SEMANTIC_ACTIONS.success}1A`,
  },

  // Timeline
  timelineContainer: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOWS.sm,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[4],
  },
  timelineTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    flex: 1,
  },
  timelineHint: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    fontStyle: 'italic',
  },
  timelinePeriod: {
    marginBottom: SPACING[4],
  },
  timelinePeriodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
    paddingBottom: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: `${SEMANTIC_ACTIONS.success}0D`,
  },
  timelinePeriodName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
    textTransform: 'capitalize',
    flex: 1,
  },
  timelinePeriodTotal: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: SEMANTIC.info.base,
  },
  timelinePeriodEntries: {
    gap: SPACING[2],
    paddingLeft: SPACING[4],
  },

  // Swipeable Entry
  swipeableContainer: {
    position: 'relative',
    marginBottom: SPACING[2],
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: SPACING[4],
    borderRadius: RADIUS.md,
    gap: SPACING[2],
  },
  deleteText: {
    color: '#FFF',
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  timelineEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.md,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
    backgroundColor: SEMANTIC.info.base,
  },
  timelineEmoji: {
    fontSize: 16,
  },
  timelineAmount: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    minWidth: 50,
  },
  timelineTime: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    flex: 1,
  },
  timelineDeleteButton: {
    padding: 8,
    minWidth: 44, // Accessibility: minimum touch target
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineContent: {
    flex: 1,
    gap: 2,
  },
  timelineAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  hydrationFactorBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hydrationBar: {
    height: 4,
    borderRadius: 2,
    flex: 1,
    maxWidth: 60,
  },
  hydrationFactorText: {
    fontSize: 13, // Increased from 10px for better readability
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary, // Improved contrast
  },

  // Empty State
  emptyState: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[6],
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.full,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: SPACING[2],
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.size.md,
    color: TEXT.secondary,
    textAlign: 'center',
    marginBottom: SPACING[4],
    lineHeight: 22,
  },
  emptyTips: {
    alignSelf: 'stretch',
    gap: SPACING[2],
  },
  emptyTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  emptyTipText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },

  // Undo Toast
  undoToastContainer: {
    position: 'absolute',
    bottom: SPACING[6],
    left: SPACING[4],
    right: SPACING[4],
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.xl,
  },
  undoToastGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
  },
  undoToastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    flex: 1,
  },
  undoToastMessage: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.white,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[3],
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: RADIUS.md,
  },
  undoButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },

  // Milestone Toast
  milestoneToast: {
    position: 'absolute',
    top: SPACING[6],
    left: SPACING[4],
    right: SPACING[4],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.xl,
  },
  milestoneText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },

  // Confetti
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  confettiParticle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
