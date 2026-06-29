import React, { useMemo, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, Image, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import BackButton from './BackButton';
import { TYPOGRAPHY } from '../../constants/premiumTheme';

// Per-step gradient backgrounds
const STEP_GRADIENTS = [
  ['#0F9B5E', '#1DB97A', '#E8F8F0'],   // Step 1 – deep green → mint → cream
  ['#6366F1', '#818CF8', '#EEF2FF'],   // Step 2 – indigo → soft lavender → white
  ['#F59E0B', '#FBBF24', '#FFFBEB'],   // Step 3 – amber → gold → cream
  ['#0F9B5E', '#34D399', '#ECFDF5'],   // Step 4 – green → mint → pale
];

const OnboardingLayout = ({
  step = 1, totalSteps = 4, title, subtitle, children,
  onBack, canGoBack = true, scrollEnabled = true, keyboardAvoidingEnabled = true,
}) => {
  const idx = Math.min(step - 1, STEP_GRADIENTS.length - 1);
  const [topColor, midColor, bgColor] = STEP_GRADIENTS[idx];

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, stiffness: 200, damping: 22 }),
    ]).start();
  }, [step]);

  const inner = (
    <Animated.View style={[styles.flex, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Gradient hero band */}
      <LinearGradient
        colors={[topColor, midColor, bgColor]}
        style={styles.heroBand}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
      >
        {/* Decorative circles */}
        <View style={[styles.circle, styles.circleTopRight, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />
        <View style={[styles.circle, styles.circleBottomLeft, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />

        {/* Nav row */}
        <View style={styles.navRow}>
          {canGoBack
            ? <BackButton onPress={() => canGoBack && onBack?.()} enabled={canGoBack} light />
            : <View style={styles.navGhost} />}
          <View style={styles.stepPill}>
            <Text style={styles.stepPillText}>{step} / {totalSteps}</Text>
          </View>
        </View>

        {/* Brand — step 1 only */}
        {step === 1 && (
          <View style={styles.brandHero}>
            <View style={styles.logoWrapper}>
              <Image source={require('../../assets/images/app-logo.png')} style={styles.logo} />
            </View>
            <Text style={styles.brandName}>MFT</Text>
            <Text style={styles.brandTagline}>Your personal nutrition companion</Text>
          </View>
        )}

        {/* Title */}
        {title && (
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        )}

        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <View key={i} style={[styles.dot, i < step ? styles.dotActive : styles.dotInactive]} />
          ))}
        </View>
      </LinearGradient>

      {/* Content area */}
      <View style={[styles.contentArea, { backgroundColor: bgColor }]}>
        {scrollEnabled ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.scrollContent, styles.flex]}>{children}</View>
        )}
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: topColor }]}>
      {keyboardAvoidingEnabled ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 100}
        >
          {inner}
        </KeyboardAvoidingView>
      ) : inner}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root:  { flex: 1 },
  flex:  { flex: 1 },

  heroBand: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    position: 'relative',
    overflow: 'hidden',
  },

  // Decorative circles
  circle: { position: 'absolute', borderRadius: 999 },
  circleTopRight: { width: 200, height: 200, top: -60, right: -60 },
  circleBottomLeft: { width: 140, height: 140, bottom: -40, left: -30 },

  // Nav
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navGhost: { width: 44, height: 44 },
  stepPill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  stepPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.semibold,
    letterSpacing: 0.3,
  },

  // Brand (step 1)
  brandHero: { alignItems: 'center', marginBottom: 24 },
  logoWrapper: {
    width: 100, height: 100, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  logo: { width: 80, height: 80, borderRadius: 20 },
  brandName: {
    fontSize: 36, fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF', letterSpacing: -1, marginBottom: 4,
  },
  brandTagline: {
    fontSize: 15, fontFamily: TYPOGRAPHY.family.regular,
    color: 'rgba(255,255,255,0.85)', letterSpacing: 0.1,
  },

  // Title
  titleBlock: { marginBottom: 16, gap: 6 },
  title: {
    fontSize: 32, fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF', letterSpacing: -0.8, lineHeight: 38,
  },
  subtitle: {
    fontSize: 15, fontFamily: TYPOGRAPHY.family.regular,
    color: 'rgba(255,255,255,0.80)', lineHeight: 22,
  },

  // Progress dots
  dotsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  dot: { height: 6, borderRadius: 999 },
  dotActive: { flex: 2, backgroundColor: '#FFFFFF' },
  dotInactive: { flex: 1, backgroundColor: 'rgba(255,255,255,0.30)' },

  // Content
  contentArea: { flex: 1, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48, gap: 16,
  },
});

export default OnboardingLayout;
