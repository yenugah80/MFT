/**
 * Paywall Component
 *
 * Beautiful upgrade screen showing subscription options.
 * Designed to maximize conversion with proper UX.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TEXT } from '../../constants/premiumTheme';
import { useSubscription, PRODUCTS, PRICING } from '../../contexts/SubscriptionContext';
import { trackEvent, Events } from '../../services/analytics';

// Feature lists for each tier
const BASIC_FEATURES = [
  { icon: 'camera', text: 'Unlimited AI Photo Logging' },
  { icon: 'mic', text: 'Voice Logging' },
  { icon: 'barcode', text: 'Barcode Scanning' },
  { icon: 'nutrition', text: 'Full Micronutrient Tracking' },
  { icon: 'time', text: '30-Day Food History' },
  { icon: 'water', text: 'Hydration Tracking' },
  { icon: 'trophy', text: 'XP & 15 Achievements' },
  { icon: 'download', text: 'CSV Data Export' },
  { icon: 'eye-off', text: 'Ad-Free Experience' },
];

const PREMIUM_FEATURES = [
  { icon: 'checkmark-circle', text: 'Everything in Basic' },
  { icon: 'happy', text: 'Mood Tracking & Insights' },
  { icon: 'analytics', text: 'Mood-Meal AI Correlation' },
  { icon: 'bar-chart', text: 'Weekly & Monthly Reports' },
  { icon: 'bulb', text: 'Personalized AI Recommendations' },
  { icon: 'shield', text: 'Streak Protection (Freeze)' },
  { icon: 'medal', text: '30+ Achievements' },
  { icon: 'fitness', text: 'Activity Tracking & Insights' },
  { icon: 'git-compare', text: 'Meal Comparison Tools' },
  { icon: 'flash', text: 'Priority AI Processing' },
];

export default function Paywall({ visible, onClose, highlightTier = 'premium' }) {
  const { offerings, purchase, isPurchasing, restorePurchases } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState(
    highlightTier === 'basic' ? PRODUCTS.BASIC_YEARLY : PRODUCTS.PREMIUM_YEARLY
  );
  const [isRestoring, setIsRestoring] = useState(false);

  // Track paywall view
  React.useEffect(() => {
    if (visible) {
      trackEvent(Events.PAYWALL_VIEWED, { highlight_tier: highlightTier });
    }
  }, [visible, highlightTier]);

  const handlePurchase = useCallback(async () => {
    if (!offerings?.current?.availablePackages) {
      return;
    }

    const pkg = offerings.current.availablePackages.find(
      (p) => p.identifier === selectedPlan
    );

    if (!pkg) {
      console.warn('[Paywall] Package not found:', selectedPlan);
      return;
    }

    const result = await purchase(pkg);

    if (result.success) {
      onClose?.();
    }
  }, [offerings, selectedPlan, purchase, onClose]);

  const handleRestore = useCallback(async () => {
    setIsRestoring(true);
    await restorePurchases();
    setIsRestoring(false);
  }, [restorePurchases]);

  const getPackagePrice = useCallback((productId) => {
    if (!offerings?.current?.availablePackages) {
      return PRICING[productId]?.price || '$?.??';
    }

    const pkg = offerings.current.availablePackages.find(
      (p) => p.identifier === productId
    );

    return pkg?.product?.priceString || PRICING[productId]?.price || '$?.??';
  }, [offerings]);

  const isPremiumPlan = selectedPlan.includes('premium');
  const isYearlyPlan = selectedPlan.includes('yearly');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={28} color={TEXT.secondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upgrade Your Experience</Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="sparkles" size={48} color="#8b5cf6" />
            </View>
            <Text style={styles.heroTitle}>
              Unlock Your Full Potential
            </Text>
            <Text style={styles.heroSubtitle}>
              Understand how food affects your mood, energy, and goals
            </Text>
          </View>

          {/* Plan Toggle */}
          <View style={styles.planToggle}>
            <TouchableOpacity
              style={[
                styles.toggleOption,
                !isPremiumPlan && styles.toggleOptionActive,
              ]}
              onPress={() => setSelectedPlan(
                isYearlyPlan ? PRODUCTS.BASIC_YEARLY : PRODUCTS.BASIC_MONTHLY
              )}
            >
              <Text style={[
                styles.toggleText,
                !isPremiumPlan && styles.toggleTextActive,
              ]}>
                Basic
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleOption,
                isPremiumPlan && styles.toggleOptionActive,
                styles.toggleOptionPremium,
              ]}
              onPress={() => setSelectedPlan(
                isYearlyPlan ? PRODUCTS.PREMIUM_YEARLY : PRODUCTS.PREMIUM_MONTHLY
              )}
            >
              <Text style={[
                styles.toggleText,
                isPremiumPlan && styles.toggleTextActive,
              ]}>
                Premium
              </Text>
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>POPULAR</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Price Cards */}
          <View style={styles.priceCards}>
            {/* Monthly */}
            <TouchableOpacity
              style={[
                styles.priceCard,
                !isYearlyPlan && styles.priceCardSelected,
              ]}
              onPress={() => setSelectedPlan(
                isPremiumPlan ? PRODUCTS.PREMIUM_MONTHLY : PRODUCTS.BASIC_MONTHLY
              )}
            >
              <View style={styles.priceCardHeader}>
                <Text style={styles.priceCardTitle}>Monthly</Text>
                {!isYearlyPlan && (
                  <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                )}
              </View>
              <Text style={styles.priceCardPrice}>
                {getPackagePrice(isPremiumPlan ? PRODUCTS.PREMIUM_MONTHLY : PRODUCTS.BASIC_MONTHLY)}
              </Text>
              <Text style={styles.priceCardPeriod}>per month</Text>
            </TouchableOpacity>

            {/* Yearly */}
            <TouchableOpacity
              style={[
                styles.priceCard,
                isYearlyPlan && styles.priceCardSelected,
                styles.priceCardYearly,
              ]}
              onPress={() => setSelectedPlan(
                isPremiumPlan ? PRODUCTS.PREMIUM_YEARLY : PRODUCTS.BASIC_YEARLY
              )}
            >
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>SAVE 32%</Text>
              </View>
              <View style={styles.priceCardHeader}>
                <Text style={styles.priceCardTitle}>Yearly</Text>
                {isYearlyPlan && (
                  <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                )}
              </View>
              <Text style={styles.priceCardPrice}>
                {getPackagePrice(isPremiumPlan ? PRODUCTS.PREMIUM_YEARLY : PRODUCTS.BASIC_YEARLY)}
              </Text>
              <Text style={styles.priceCardPeriod}>per year</Text>
            </TouchableOpacity>
          </View>

          {/* Features */}
          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>
              {isPremiumPlan ? 'Premium Features' : 'Basic Features'}
            </Text>
            {(isPremiumPlan ? PREMIUM_FEATURES : BASIC_FEATURES).map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Ionicons
                    name={feature.icon}
                    size={20}
                    color={isPremiumPlan ? '#8b5cf6' : '#3b82f6'}
                  />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>

          {/* Testimonial */}
          <View style={styles.testimonial}>
            <Ionicons name="star" size={20} color="#fbbf24" />
            <Ionicons name="star" size={20} color="#fbbf24" />
            <Ionicons name="star" size={20} color="#fbbf24" />
            <Ionicons name="star" size={20} color="#fbbf24" />
            <Ionicons name="star" size={20} color="#fbbf24" />
            <Text style={styles.testimonialText}>
              &quot;Finally understand how food affects my energy!&quot;
            </Text>
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomCTA}>
          <TouchableOpacity
            style={[
              styles.purchaseButton,
              isPremiumPlan && styles.purchaseButtonPremium,
              (isPurchasing || isRestoring) && styles.purchaseButtonDisabled,
            ]}
            onPress={handlePurchase}
            disabled={isPurchasing || isRestoring}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.purchaseButtonText}>
                  Start {isPremiumPlan ? 'Premium' : 'Basic'} Plan
                </Text>
                <Text style={styles.purchaseButtonSubtext}>
                  {isYearlyPlan ? 'Billed annually' : 'Cancel anytime'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={isRestoring}
          >
            {isRestoring ? (
              <ActivityIndicator color={TEXT.secondary} size="small" />
            ) : (
              <Text style={styles.restoreText}>Restore Purchases</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.termsText}>
            By subscribing, you agree to our Terms of Service and Privacy Policy.
            Subscription auto-renews unless cancelled.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TEXT.tertiary,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: TEXT.secondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  planToggle: {
    flexDirection: 'row',
    backgroundColor: TEXT.tertiary,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleOptionActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleOptionPremium: {
    position: 'relative',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT.secondary,
  },
  toggleTextActive: {
    color: '#1f2937',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 10,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  popularText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  priceCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  priceCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  priceCardSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  priceCardYearly: {
    position: 'relative',
  },
  priceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.secondary,
  },
  priceCardPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  priceCardPeriod: {
    fontSize: 13,
    color: TEXT.tertiary,
  },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    right: 12,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  featuresSection: {
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: TEXT.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: TEXT.primary,
    flex: 1,
  },
  testimonial: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: '#fefce8',
    padding: 16,
    borderRadius: 12,
    gap: 2,
  },
  testimonialText: {
    fontSize: 14,
    color: '#713f12',
    fontStyle: 'italic',
    marginTop: 8,
    width: '100%',
  },
  bottomCTA: {
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: TEXT.tertiary,
    backgroundColor: '#fff',
  },
  purchaseButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  purchaseButtonPremium: {
    backgroundColor: '#8b5cf6',
  },
  purchaseButtonDisabled: {
    opacity: 0.7,
  },
  purchaseButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  purchaseButtonSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  restoreText: {
    fontSize: 14,
    color: TEXT.secondary,
    textDecorationLine: 'underline',
  },
  termsText: {
    fontSize: 11,
    color: TEXT.tertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
