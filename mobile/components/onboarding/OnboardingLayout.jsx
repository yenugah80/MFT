/**
 * OnboardingLayout
 * Wrapper component for onboarding screens with progress bar and navigation
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
import { BRAND, TEXT, SURFACES, SHADOWS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants/premiumTheme';

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
  // Progress bar animation
  const progressValue = useMemo(() => (step / totalSteps) * 100, [step, totalSteps]);

  const handleBack = () => {
    if (canGoBack && onBack) {
      onBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {keyboardAvoidingEnabled ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 100}
        >
          <OnboardingContent
            step={step}
            totalSteps={totalSteps}
            title={title}
            subtitle={subtitle}
            onBack={handleBack}
            canGoBack={canGoBack}
            scrollEnabled={scrollEnabled}
            progressValue={progressValue}
          >
            {children}
          </OnboardingContent>
        </KeyboardAvoidingView>
      ) : (
        <OnboardingContent
          step={step}
          totalSteps={totalSteps}
          title={title}
          subtitle={subtitle}
          onBack={handleBack}
          canGoBack={canGoBack}
          scrollEnabled={scrollEnabled}
          progressValue={progressValue}
        >
          {children}
        </OnboardingContent>
      )}
    </SafeAreaView>
  );
};

const OnboardingContent = ({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  onBack,
  canGoBack,
  scrollEnabled,
  progressValue,
}) => {
  return (
    <View style={styles.flex}>
      {/* Header with back button and progress */}
      <View style={styles.header}>
        {/* Logo and Brand - shown on first step */}
        {step === 1 && (
          <View style={styles.brandSection}>
            <Image
              source={require('../../assets/images/app-logo.png')}
              style={styles.logoImage}
            />
            <Text style={styles.brandName}>MyFoodTracker</Text>
          </View>
        )}

        <View style={styles.headerTop}>
          {canGoBack ? (
            <BackButton onPress={onBack} enabled={canGoBack} />
          ) : (
            <View style={styles.backButtonPlaceholder} />
          )}

          <Text style={styles.stepIndicator}>
            {step}
            {' '}
            of
            {' '}
            {totalSteps}
          </Text>
        </View>

        {/* Premium Progress Bar */}
        <View style={styles.progressBarSection}>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${progressValue}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progressValue)}% complete</Text>
        </View>

        {/* Title and subtitle */}
        {title && (
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        )}
      </View>

      {/* Content */}
      {scrollEnabled ? (
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.contentContainer, styles.flex]}>
          {children}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[3],
    paddingBottom: SPACING[4],
    backgroundColor: SURFACES.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.card.border,
    ...SHADOWS.sm,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: SPACING[2],
  },
  brandName: {
    fontSize: 24,
    fontFamily: TYPOGRAPHY.family.bold,
    color: BRAND.primary,
    letterSpacing: -0.5,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  backButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  stepIndicator: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
  },
  progressBarSection: {
    marginBottom: SPACING[4],
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#EDEAFF', // Solid color for shadow efficiency
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING[2],
  },
  progressBar: {
    height: '100%',
    backgroundColor: BRAND.primary,
    borderRadius: RADIUS.full,
  },
  progressText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
    textAlign: 'right',
    writingDirection: 'ltr', // Ensure progress text always displays LTR
  },
  titleContainer: {
    gap: SPACING[1],
  },
  title: {
    fontSize: 24,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    lineHeight: 20,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[6],
    gap: SPACING[4],
  },
});

export default OnboardingLayout;
