/**
 * OnboardingLayout
 * Wrapper component for onboarding screens with progress bar and navigation
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import BackButton from './BackButton';
import { BRAND, TEXT, SURFACES, SHADOWS, RADIUS, SPACING } from '../../constants/premiumTheme';

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
            children={children}
            onBack={handleBack}
            canGoBack={canGoBack}
            scrollEnabled={scrollEnabled}
            progressValue={progressValue}
          />
        </KeyboardAvoidingView>
      ) : (
        <OnboardingContent
          step={step}
          totalSteps={totalSteps}
          title={title}
          subtitle={subtitle}
          children={children}
          onBack={handleBack}
          canGoBack={canGoBack}
          scrollEnabled={scrollEnabled}
          progressValue={progressValue}
        />
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
    fontWeight: '600',
    color: TEXT.tertiary,
  },
  progressBarSection: {
    marginBottom: SPACING[4],
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(107, 78, 255, 0.1)',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING[2],
    ...SHADOWS.sm,
  },
  progressBar: {
    height: '100%',
    backgroundColor: BRAND.primary,
    borderRadius: RADIUS.full,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT.tertiary,
    textAlign: 'right',
    writingDirection: 'ltr', // Ensure progress text always displays LTR
  },
  titleContainer: {
    gap: SPACING[1],
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
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
