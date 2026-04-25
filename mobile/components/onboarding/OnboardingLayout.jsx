/**
 * OnboardingLayout — "The Organic Editorial" Design System
 *
 * Surface hierarchy: surface (#eaffeb) canvas → surface-container (#d2f7d8) header band
 * Rules enforced:
 *   - Zero 1px borders — separation via tonal shift only
 *   - Progress: 6px thick pill track
 *   - Title: editorial 28px with tight tracking
 *   - Ambient shadow on logo (6% on-surface, not black)
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
  surface:          '#eaffeb',
  surfaceContainer: '#d2f7d8',
  surfContainerHi:  '#beeec8',
  primary:          '#1c6d25',
  onSurface:        '#0e3a20',
  onSurfaceVar:     'rgba(14, 58, 32, 0.52)',
  ambientShadow:    'rgba(14, 58, 32, 0.06)',
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
            <Text style={styles.brandName}>MyFoodTracker</Text>
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

        {/* Progress track — 6px thick, pill caps, tonal fill */}
        <View style={styles.progressRow}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <View
              key={i}
              style={[
                styles.progressSeg,
                { backgroundColor: i < step ? DS.primary : DS.surfContainerHi },
                i < totalSteps - 1 && { marginRight: 6 },
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

  /* Header */
  header: {
    backgroundColor: DS.surfaceContainer,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },

  /* Brand hero — step 1 asymmetric block */
  brandHero: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 24,
    marginBottom: 12,
    /* Ambient shadow — 6% on-surface, diffused */
    shadowColor: DS.onSurface,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 6,
  },
  brandName: {
    fontSize: 26,
    fontFamily: TYPOGRAPHY.family.bold,
    color: DS.primary,
    letterSpacing: -0.8,
    marginBottom: 2,
  },
  brandTagline: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: DS.onSurfaceVar,
  },

  /* Nav */
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  navGhost: { width: 40, height: 40 },
  stepCounter: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: DS.onSurfaceVar,
  },

  /* Progress */
  progressRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  progressSeg: {
    flex: 1,
    height: 6,
    borderRadius: 999,
  },

  /* Title */
  titleBlock: { gap: 5 },
  title: {
    fontSize: 28,
    fontFamily: TYPOGRAPHY.family.bold,
    color: DS.onSurface,
    letterSpacing: -0.8,
    lineHeight: 34,
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
    paddingBottom: 48,
    gap: 20,
  },
});

export default OnboardingLayout;
