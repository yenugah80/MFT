/**
 * Subscription Context
 *
 * Manages subscription state across the app.
 * Ready to connect to RevenueCat when Apple/Google accounts are set up.
 *
 * SETUP LATER (when you have $124):
 * 1. npm install react-native-purchases
 * 2. Create products in App Store Connect / Play Console
 * 3. Set up RevenueCat and get API keys
 * 4. Uncomment RevenueCat code below
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackEvent, Events } from '../services/analytics';

// Uncomment when RevenueCat is set up:
// import Purchases from 'react-native-purchases';

const SubscriptionContext = createContext(null);

// Subscription tiers
export const TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium',
};

// Product IDs (configure in App Store Connect / Play Console)
export const PRODUCTS = {
  BASIC_MONTHLY: 'mft_basic_monthly',
  BASIC_YEARLY: 'mft_basic_yearly',
  PREMIUM_MONTHLY: 'mft_premium_monthly',
  PREMIUM_YEARLY: 'mft_premium_yearly',
};

// Pricing (for display - actual prices come from store)
// Core Philosophy: "Users don't pay for tracking. They pay for clarity and confidence."
// BASIC ($4.79): "Now I understand what I ate" - Clarity
// PREMIUM ($7.97): "Now I know what to do next" - Confidence
export const PRICING = {
  [PRODUCTS.BASIC_MONTHLY]: { price: '$4.79', period: 'month', tagline: 'Clarity' },
  [PRODUCTS.BASIC_YEARLY]: { price: '$38.99', period: 'year', savings: '32%', tagline: 'Clarity' },
  [PRODUCTS.PREMIUM_MONTHLY]: { price: '$7.97', period: 'month', tagline: 'Confidence' },
  [PRODUCTS.PREMIUM_YEARLY]: { price: '$63.99', period: 'year', savings: '33%', tagline: 'Confidence' },
};

// Feature definitions by tier
export const TIER_FEATURES = {
  [TIERS.FREE]: {
    name: 'Free',
    description: 'Basic tracking',
    features: [
      'Food logging',
      'Water tracking',
      'Mood check-ins',
      '7 days history',
    ],
  },
  [TIERS.BASIC]: {
    name: 'Basic',
    description: 'Clarity - Understand what happened',
    price: '$4.79/month',
    features: [
      'Everything in Free',
      'Nutri-Score (A-E grading)',
      'Daily summaries',
      'Basic insights (what happened)',
      'Processing level analysis',
      'Macro distribution',
      'Unlimited history',
    ],
  },
  [TIERS.PREMIUM]: {
    name: 'Premium',
    description: 'Confidence - Know what to do next',
    price: '$7.97/month',
    features: [
      'Everything in Basic',
      'Predictive insights',
      'Behavioral correlations',
      'Personalized 5W2H recommendations',
      'Weekly health narrative',
      '"What to change next" guidance',
      'Mood-food correlations',
      'Energy pattern predictions',
      'Micronutrient gap analysis',
      'Outcome tracking',
    ],
  },
};

// RevenueCat API Keys (add when you have them)
const REVENUECAT_API_KEYS = {
  ios: process.env.EXPO_PUBLIC_RC_IOS_KEY || null,
  android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY || null,
};

export function SubscriptionProvider({ children }) {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  // Subscription state
  const [subscription, setSubscription] = useState({
    tier: TIERS.FREE,
    isActive: false,
    expiresAt: null,
    productId: null,
    willRenew: true,
  });

  const [offerings, setOfferings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRevenueCatReady, setIsRevenueCatReady] = useState(false);

  /**
   * Initialize RevenueCat (when API keys are available)
   */
  const initRevenueCat = useCallback(async () => {
    const apiKey = Platform.OS === 'ios'
      ? REVENUECAT_API_KEYS.ios
      : REVENUECAT_API_KEYS.android;

    if (!apiKey) {
      console.log('[Subscription] RevenueCat not configured - using mock mode');
      setIsLoading(false);
      return false;
    }

    try {
      // Uncomment when RevenueCat is installed:
      // Purchases.configure({ apiKey });
      //
      // if (user?.id) {
      //   await Purchases.logIn(user.id);
      // }
      //
      // setIsRevenueCatReady(true);
      // await fetchSubscriptionStatus();
      // await fetchOfferings();

      console.log('[Subscription] RevenueCat would be initialized here');
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('[Subscription] Failed to initialize RevenueCat:', error);
      setIsLoading(false);
      return false;
    }
  }, [user?.id]);

  /**
   * Fetch current subscription status
   */
  const fetchSubscriptionStatus = useCallback(async () => {
    if (!isRevenueCatReady) {
      // Check local storage for dev/mock subscription
      try {
        const stored = await AsyncStorage.getItem('mock_subscription');
        if (stored) {
          const mockSub = JSON.parse(stored);
          if (mockSub.expiresAt && new Date(mockSub.expiresAt) > new Date()) {
            setSubscription(mockSub);
          }
        }
      } catch (e) {
        console.warn('[Subscription] Failed to load mock subscription');
      }
      return;
    }

    try {
      // Uncomment when RevenueCat is set up:
      // const customerInfo = await Purchases.getCustomerInfo();
      // updateSubscriptionFromCustomerInfo(customerInfo);

    } catch (error) {
      console.error('[Subscription] Failed to fetch status:', error);
    }
  }, [isRevenueCatReady]);

  /**
   * Fetch available offerings/products
   */
  const fetchOfferings = useCallback(async () => {
    if (!isRevenueCatReady) {
      // Return mock offerings for development
      setOfferings({
        current: {
          identifier: 'default',
          availablePackages: [
            {
              identifier: PRODUCTS.BASIC_MONTHLY,
              product: {
                identifier: PRODUCTS.BASIC_MONTHLY,
                priceString: '$4.79',
                price: 4.79,
                title: 'Basic Monthly',
                description: 'Clarity - Understand what happened',
              },
              packageType: 'MONTHLY',
            },
            {
              identifier: PRODUCTS.BASIC_YEARLY,
              product: {
                identifier: PRODUCTS.BASIC_YEARLY,
                priceString: '$38.99',
                price: 38.99,
                title: 'Basic Yearly',
                description: 'Save 32% with annual billing',
              },
              packageType: 'ANNUAL',
            },
            {
              identifier: PRODUCTS.PREMIUM_MONTHLY,
              product: {
                identifier: PRODUCTS.PREMIUM_MONTHLY,
                priceString: '$7.97',
                price: 7.97,
                title: 'Premium Monthly',
                description: 'Confidence - Know what to do next',
              },
              packageType: 'MONTHLY',
            },
            {
              identifier: PRODUCTS.PREMIUM_YEARLY,
              product: {
                identifier: PRODUCTS.PREMIUM_YEARLY,
                priceString: '$63.99',
                price: 63.99,
                title: 'Premium Yearly',
                description: 'Save 33% with annual billing',
              },
              packageType: 'ANNUAL',
            },
          ],
        },
      });
      return;
    }

    try {
      // Uncomment when RevenueCat is set up:
      // const offerings = await Purchases.getOfferings();
      // setOfferings(offerings);
    } catch (error) {
      console.error('[Subscription] Failed to fetch offerings:', error);
    }
  }, [isRevenueCatReady]);

  /**
   * Purchase a package
   */
  const purchase = useCallback(async (packageToPurchase) => {
    trackEvent(Events.SUBSCRIPTION_STARTED, {
      product_id: packageToPurchase.identifier,
    });

    setIsPurchasing(true);

    try {
      if (!isRevenueCatReady) {
        // Mock purchase for development
        Alert.alert(
          'Subscription System Not Ready',
          'In-app purchases will be available once the app is published to the App Store.',
          [{ text: 'OK' }]
        );
        trackEvent(Events.SUBSCRIPTION_FAILED, {
          product_id: packageToPurchase.identifier,
          reason: 'revenuecat_not_configured',
        });
        return { success: false, error: 'RevenueCat not configured' };
      }

      // Uncomment when RevenueCat is set up:
      // const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      // updateSubscriptionFromCustomerInfo(customerInfo);
      //
      // trackEvent(Events.SUBSCRIPTION_COMPLETED, {
      //   product_id: packageToPurchase.identifier,
      //   tier: subscription.tier,
      // });
      //
      // return { success: true };

      return { success: false, error: 'Not implemented' };
    } catch (error) {
      if (error.userCancelled) {
        console.log('[Subscription] User cancelled purchase');
        return { success: false, cancelled: true };
      }

      console.error('[Subscription] Purchase failed:', error);
      trackEvent(Events.SUBSCRIPTION_FAILED, {
        product_id: packageToPurchase.identifier,
        error: error.message,
      });

      return { success: false, error: error.message };
    } finally {
      setIsPurchasing(false);
    }
  }, [isRevenueCatReady]);

  /**
   * Restore purchases
   */
  const restorePurchases = useCallback(async () => {
    if (!isRevenueCatReady) {
      Alert.alert(
        'Cannot Restore',
        'Restore purchases will be available once the app is published.',
        [{ text: 'OK' }]
      );
      return { success: false };
    }

    try {
      // Uncomment when RevenueCat is set up:
      // const customerInfo = await Purchases.restorePurchases();
      // updateSubscriptionFromCustomerInfo(customerInfo);
      //
      // if (customerInfo.entitlements.active['premium'] || customerInfo.entitlements.active['basic']) {
      //   Alert.alert('Success', 'Your purchases have been restored!');
      //   return { success: true };
      // } else {
      //   Alert.alert('No Purchases Found', 'We couldn\'t find any previous purchases to restore.');
      //   return { success: false };
      // }

      return { success: false };
    } catch (error) {
      console.error('[Subscription] Restore failed:', error);
      Alert.alert('Restore Failed', 'Please try again later.');
      return { success: false, error: error.message };
    }
  }, [isRevenueCatReady]);

  /**
   * Check if user has access to a specific tier
   */
  const hasTierAccess = useCallback((requiredTier) => {
    const tierHierarchy = {
      [TIERS.FREE]: 0,
      [TIERS.BASIC]: 1,
      [TIERS.PREMIUM]: 2,
    };

    return tierHierarchy[subscription.tier] >= tierHierarchy[requiredTier];
  }, [subscription.tier]);

  /**
   * Development: Set mock subscription (for testing UI)
   */
  const setMockSubscription = useCallback(async (tier, expiresInDays = 30) => {
    if (!__DEV__) return;

    const mockSub = {
      tier,
      isActive: tier !== TIERS.FREE,
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
      productId: tier === TIERS.PREMIUM ? PRODUCTS.PREMIUM_MONTHLY : PRODUCTS.BASIC_MONTHLY,
      willRenew: true,
    };

    setSubscription(mockSub);
    await AsyncStorage.setItem('mock_subscription', JSON.stringify(mockSub));

    console.log(`[Subscription] Mock subscription set to: ${tier}`);
  }, []);

  /**
   * Development: Clear mock subscription
   */
  const clearMockSubscription = useCallback(async () => {
    if (!__DEV__) return;

    setSubscription({
      tier: TIERS.FREE,
      isActive: false,
      expiresAt: null,
      productId: null,
      willRenew: true,
    });

    await AsyncStorage.removeItem('mock_subscription');
    console.log('[Subscription] Mock subscription cleared');
  }, []);

  // Initialize on mount
  useEffect(() => {
    initRevenueCat();
  }, [initRevenueCat]);

  // Fetch status when user signs in
  useEffect(() => {
    if (isSignedIn && user?.id) {
      fetchSubscriptionStatus();
      fetchOfferings();
    }
  }, [isSignedIn, user?.id, fetchSubscriptionStatus, fetchOfferings]);

  const value = {
    // State
    subscription,
    offerings,
    isLoading,
    isPurchasing,
    isRevenueCatReady,

    // Computed
    tier: subscription.tier,
    isBasic: subscription.tier === TIERS.BASIC,
    isPremium: subscription.tier === TIERS.PREMIUM,
    isPaid: subscription.tier !== TIERS.FREE,

    // Methods
    purchase,
    restorePurchases,
    hasTierAccess,
    refreshStatus: fetchSubscriptionStatus,

    // Dev tools (only in development)
    ...__DEV__ && {
      setMockSubscription,
      clearMockSubscription,
    },
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);

  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }

  return context;
}

export default SubscriptionContext;
