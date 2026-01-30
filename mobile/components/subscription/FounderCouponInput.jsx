/**
 * FounderCouponInput - Premium Coupon Redemption Component
 *
 * Allows users to redeem founder's coupon codes for discounts.
 * Designed to be elegant and trustworthy.
 *
 * Features:
 * - Real-time validation feedback
 * - Animated success state
 * - Clear discount display
 * - Error handling with helpful messages
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  PREMIUM_COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../../constants/premiumDesignSystem';
import { Card } from '../premium/PressableCard';
import PressableCard from '../premium/PressableCard';
import { usePressAnimation, SPRING, EASING, shake } from '../../utils/animations';

// ============================================================================
// VALIDATION STATES
// ============================================================================

const STATES = {
  IDLE: 'idle',
  VALIDATING: 'validating',
  VALID: 'valid',
  INVALID: 'invalid',
  REDEEMED: 'redeemed',
};

// ============================================================================
// MOCK COUPON VALIDATION (Replace with real API call)
// ============================================================================

const MOCK_COUPONS = {
  FOUNDER50: { discount: 50, type: 'percentage', duration: 'forever', tier: 'any' },
  LAUNCH30: { discount: 30, type: 'percentage', duration: 'firstYear', tier: 'any' },
  BETA100: { discount: 100, type: 'percentage', duration: '3months', tier: 'premium' },
  FRIEND20: { discount: 20, type: 'percentage', duration: '6months', tier: 'any' },
};

async function validateCoupon(code) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const normalizedCode = code.toUpperCase().trim();

  if (MOCK_COUPONS[normalizedCode]) {
    return {
      valid: true,
      code: normalizedCode,
      ...MOCK_COUPONS[normalizedCode],
    };
  }

  return { valid: false, error: 'Invalid coupon code' };
}

// ============================================================================
// DISCOUNT BADGE
// ============================================================================

function DiscountBadge({ discount, type, duration }) {
  const getDiscountText = () => {
    if (type === 'percentage') {
      return `${discount}% OFF`;
    }
    return `$${discount} OFF`;
  };

  const getDurationText = () => {
    switch (duration) {
      case 'forever':
        return 'Forever';
      case 'firstYear':
        return 'First year';
      case '3months':
        return '3 months';
      case '6months':
        return '6 months';
      default:
        return duration;
    }
  };

  return (
    <View style={styles.discountBadge}>
      <Text style={styles.discountValue}>{getDiscountText()}</Text>
      <Text style={styles.discountDuration}>{getDurationText()}</Text>
    </View>
  );
}

// ============================================================================
// APPLY BUTTON
// ============================================================================

function ApplyButton({ onPress, disabled, loading }) {
  const { scale, onPressIn, onPressOut } = usePressAnimation();

  return (
    <PressableCard
      onPress={onPress}
      disabled={disabled || loading}
      hapticFeedback
      variant="compact"
      style={styles.applyButtonContainer}
    >
      <Animated.View
        style={[
          styles.applyButton,
          disabled && styles.applyButtonDisabled,
          { transform: [{ scale }] },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.applyButtonText}>Apply</Text>
        )}
      </Animated.View>
    </PressableCard>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FounderCouponInput({
  onCouponValidated,
  onCouponRedeemed,
  style,
}) {
  const [code, setCode] = useState('');
  const [state, setState] = useState(STATES.IDLE);
  const [validationResult, setValidationResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const inputRef = useRef(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  // Handle code change
  const handleCodeChange = useCallback((text) => {
    // Only allow alphanumeric characters
    const sanitized = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    setCode(sanitized);

    // Reset state when typing
    if (state === STATES.INVALID) {
      setState(STATES.IDLE);
      setErrorMessage('');
    }
  }, [state]);

  // Handle validation
  const handleValidate = useCallback(async () => {
    if (!code.trim()) {
      setErrorMessage('Please enter a coupon code');
      shake(shakeAnim, 10).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Keyboard.dismiss();
    setState(STATES.VALIDATING);
    setErrorMessage('');

    try {
      const result = await validateCoupon(code);

      if (result.valid) {
        setState(STATES.VALID);
        setValidationResult(result);

        // Success animation
        Animated.spring(successAnim, {
          toValue: 1,
          ...SPRING.bouncy,
        }).start();

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onCouponValidated?.(result);
      } else {
        setState(STATES.INVALID);
        setErrorMessage(result.error || 'Invalid coupon code');
        shake(shakeAnim, 10).start();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      setState(STATES.INVALID);
      setErrorMessage('Failed to validate. Please try again.');
      shake(shakeAnim, 10).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [code, shakeAnim, successAnim, onCouponValidated]);

  // Handle redeem
  const handleRedeem = useCallback(() => {
    setState(STATES.REDEEMED);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCouponRedeemed?.(validationResult);
  }, [validationResult, onCouponRedeemed]);

  // Get input border color based on state
  const getInputBorderColor = () => {
    switch (state) {
      case STATES.VALID:
        return PREMIUM_COLORS.semantic.success.primary;
      case STATES.INVALID:
        return PREMIUM_COLORS.semantic.error.primary;
      default:
        return PREMIUM_COLORS.border.medium;
    }
  };

  // Get status icon
  const renderStatusIcon = () => {
    switch (state) {
      case STATES.VALID:
        return (
          <Animated.View
            style={[
              styles.statusIcon,
              { transform: [{ scale: successAnim }] },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={PREMIUM_COLORS.semantic.success.primary}
            />
          </Animated.View>
        );
      case STATES.INVALID:
        return (
          <View style={styles.statusIcon}>
            <Ionicons
              name="close-circle"
              size={24}
              color={PREMIUM_COLORS.semantic.error.primary}
            />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Card variant="standard" style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons
            name="gift"
            size={20}
            color={PREMIUM_COLORS.brand.primary}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Founder's Coupon</Text>
          <Text style={styles.headerSubtitle}>
            Enter your exclusive discount code
          </Text>
        </View>
      </View>

      {/* Input Row */}
      <Animated.View
        style={[
          styles.inputRow,
          { transform: [{ translateX: shakeAnim }] },
        ]}
      >
        <View
          style={[
            styles.inputContainer,
            { borderColor: getInputBorderColor() },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={code}
            onChangeText={handleCodeChange}
            placeholder="Enter code"
            placeholderTextColor={PREMIUM_COLORS.text.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
            editable={state !== STATES.VALID && state !== STATES.REDEEMED}
          />
          {renderStatusIcon()}
        </View>

        {state !== STATES.VALID && state !== STATES.REDEEMED && (
          <ApplyButton
            onPress={handleValidate}
            disabled={!code.trim()}
            loading={state === STATES.VALIDATING}
          />
        )}
      </Animated.View>

      {/* Error Message */}
      {errorMessage && (
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle"
            size={16}
            color={PREMIUM_COLORS.semantic.error.primary}
          />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Valid Coupon Details */}
      {state === STATES.VALID && validationResult && (
        <View style={styles.validContainer}>
          <DiscountBadge
            discount={validationResult.discount}
            type={validationResult.type}
            duration={validationResult.duration}
          />

          <Text style={styles.validMessage}>
            Code "{validationResult.code}" is valid!
          </Text>

          <PressableCard
            onPress={handleRedeem}
            variant="compact"
            gradient="insights"
            style={styles.redeemButton}
          >
            <View style={styles.redeemButtonContent}>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              <Text style={styles.redeemButtonText}>Apply to Subscription</Text>
            </View>
          </PressableCard>
        </View>
      )}

      {/* Redeemed State */}
      {state === STATES.REDEEMED && (
        <View style={styles.redeemedContainer}>
          <View style={styles.redeemedIcon}>
            <Ionicons
              name="checkmark-circle"
              size={48}
              color={PREMIUM_COLORS.semantic.success.primary}
            />
          </View>
          <Text style={styles.redeemedTitle}>Coupon Applied!</Text>
          <Text style={styles.redeemedMessage}>
            Your discount will be applied at checkout.
          </Text>
        </View>
      )}
    </Card>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    padding: SPACING[5],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    backgroundColor: `${PREMIUM_COLORS.brand.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.headline,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: PREMIUM_COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.tertiary,
    marginTop: SPACING[0.5],
  },

  // Input Row
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PREMIUM_COLORS.surface.tertiary,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    paddingHorizontal: SPACING[4],
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.callout,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: PREMIUM_COLORS.text.primary,
    letterSpacing: 1,
  },
  statusIcon: {
    marginLeft: SPACING[2],
  },

  // Apply Button
  applyButtonContainer: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  applyButton: {
    backgroundColor: PREMIUM_COLORS.brand.primary,
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[3.5],
    borderRadius: RADIUS.lg,
  },
  applyButtonDisabled: {
    backgroundColor: PREMIUM_COLORS.text.muted,
  },
  applyButtonText: {
    fontSize: TYPOGRAPHY.size.subhead,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#FFFFFF',
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING[3],
    gap: SPACING[2],
  },
  errorText: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.semantic.error.primary,
  },

  // Valid State
  validContainer: {
    marginTop: SPACING[4],
    alignItems: 'center',
  },
  discountBadge: {
    backgroundColor: PREMIUM_COLORS.semantic.success.light,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  discountValue: {
    fontSize: TYPOGRAPHY.size.title2,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: PREMIUM_COLORS.semantic.success.dark,
  },
  discountDuration: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.semantic.success.dark,
    marginTop: SPACING[0.5],
  },
  validMessage: {
    fontSize: TYPOGRAPHY.size.body,
    color: PREMIUM_COLORS.text.secondary,
    marginBottom: SPACING[4],
  },
  redeemButton: {
    width: '100%',
    borderRadius: RADIUS.lg,
  },
  redeemButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[4],
    gap: SPACING[2],
  },
  redeemButtonText: {
    fontSize: TYPOGRAPHY.size.callout,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#FFFFFF',
  },

  // Redeemed State
  redeemedContainer: {
    alignItems: 'center',
    paddingVertical: SPACING[4],
  },
  redeemedIcon: {
    marginBottom: SPACING[3],
  },
  redeemedTitle: {
    fontSize: TYPOGRAPHY.size.title3,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: PREMIUM_COLORS.text.primary,
    marginBottom: SPACING[1],
  },
  redeemedMessage: {
    fontSize: TYPOGRAPHY.size.body,
    color: PREMIUM_COLORS.text.tertiary,
    textAlign: 'center',
  },
});
