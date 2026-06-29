/**
 * OnboardingLayout — Premium Wellness Design
 *
 * - Warm cream (#F8FBF9) canvas with white (#FFFFFF) header band
 * - Refined mint-green primary (#0F9B5E)
 * - Progress: 5px pill segments, green fill
 * - Title: large bold heading, clear hierarchy
 * - Gentle shadow on logo card
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from './BackButton';
import { SPACING, TYPOGRAPHY } from '../../constants/premiumTheme';

const DS = {
  surface:          '#F8FBF9',
  surfaceContainer: '#FFFFFF',
  surfContainerHi:  '#F0F5F2',
  primary:          '#0F9B5E',
  primaryLight:     '#34D399',
  onSurface:        '#111827',
  onSurfaceVar:     'rgba(17, 24, 39, 0.45)',
  ambientShadow:    'rgba(0, 0, 0, 0.06)',
};

const OnboardingLayout = ({
  step = 1,
  totalSteps = 4,
  title,
  subtitle,
  children,
  onBack,
  canGoBack = true,
  scrollEnabled = true,
  keyboardAvoidingEnabled = true,
}) => {
  const handleBack = () => { if (canGoBack && onBack) onBack(); };

  const inner = (
    <OnboardingContent
      step={step}
      totalSteps={totalSteps}
      title={title}
      subtitle={subtitle}
      onBack={handleBack}
      canGoBack={canGoBack}
      scrollEnabled={scrollEnabled}
    >
      {children}
    </OnboardingContent>
  );

  return (
    <SafeAreaView style={styles.root}>
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

const OnboardingContent = ({
  step, totalSteps, title, subtitle, children, onBack, canGoBack, scrollEnabled,
}) => {
  const progressPct = useMemo(() => step / totalSteps, [step, totalSteps]);

  return (
    <View style={styles.flex}>
      {/* ── Header band: surface-container tonal lift, zero borders ── */}
      <View style={styles.header}>

        {/* Brand — step 1 only, asymmetric hero */}
        {step === 1 && (
          <View style={styles.brandHero}>
            <Image
              source={require('../../assets/images/app-logo.png')}
              style={styles.logo}
            />
            <Text style={styles.brandName}>MFT</Text>
            <Text style={styles.brandTagline}>Your personal nutrition companion</Text>
          </View>
        )}

        {/* Nav row */}
        <View style={styles.navRow}>
          {canGoBack
            ? <BackButton onPress={onBack} enabled={canGoBack} />
            : <View style={styles.navGhost} />
          }
          <Text style={styles.stepCounter}>{step} of {totalSteps}</Text>
        </View>

        {/* Progress track — 5px pill segments, gap via row */}
        <View style={styles.progressRow}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <View
              key={i}
              style={[
                styles.progressSeg,
                { backgroundColor: i < step ? DS.primary : DS.surfContainerHi },
              ]}
            />
          ))}
        </View>

        {/* Editorial title block */}
        {title && (
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        )}
      </View>

      {/* ── Content canvas: base surface ── */}
      {scrollEnabled ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.scrollContent, styles.flex]}>{children}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: DS.surface },
  flex:  { flex: 1 },

  /* Header — white card with subtle bottom shadow */
  header: {
    backgroundColor: DS.surfaceContainer,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 26,
    shadowColor: 'rgba(0,0,0,1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  /* Brand hero — step 1: centered logo + app name */
  brandHero: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 4,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    marginBottom: 14,
    shadowColor: 'rgba(0,0,0,1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 6,
  },
  brandName: {
    fontSize: 28,
    fontFamily: TYPOGRAPHY.family.bold,
    color: DS.primary,
    letterSpacing: -1,
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.regular,
    color: DS.onSurfaceVar,
    letterSpacing: 0.1,
  },

  /* Nav */
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navGhost: { width: 40, height: 40 },
  stepCounter: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: DS.onSurfaceVar,
    letterSpacing: 0.2,
  },

  /* Progress — sleek 5px pill segments */
  progressRow: {
    flexDirection: 'row',
    marginBottom: 22,
    gap: 6,
  },
  progressSeg: {
    flex: 1,
    height: 5,
    borderRadius: 999,
  },

  /* Title */
  titleBlock: { gap: 6 },
  title: {
    fontSize: 30,
    fontFamily: TYPOGRAPHY.family.bold,
    color: DS.onSurface,
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.regular,
    color: DS.onSurfaceVar,
    lineHeight: 22,
  },

  /* Content */
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 52,
    gap: 20,
  },
});

export default OnboardingLayout;
