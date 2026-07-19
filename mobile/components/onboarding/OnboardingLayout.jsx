import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, Animated, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import BackButton from './BackButton';
import { AUTH_COLORS } from '../auth/constants';
import { ScreenBackdrop } from '../auth/canvas';
import { useOnboarding } from '../../contexts/OnboardingContext';

const OnboardingLayout = ({
  step = 1, totalSteps = 4, title, subtitle, children, footer,
  onBack, canGoBack = true, scrollEnabled = true, keyboardAvoidingEnabled = true,
  onSkip,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const router = useRouter();
  const { setStep } = useOnboarding();

  const navigateToStep = (targetStep) => {
    if (targetStep === step || targetStep < 1 || targetStep > totalSteps) return;
    setStep(targetStep);
    router.replace(`/onboarding/step-${targetStep}`);
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
      return;
    }
    navigateToStep(step + 1);
  };

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(24);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, stiffness: 200, damping: 22 }),
    ]).start();
  }, [step]);

  const titleLines = typeof title === 'string' ? title.split('\n') : [];

  const inner = (
    <Animated.View style={[styles.flex, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Nav row */}
      <View style={styles.navRow}>
        <View style={styles.navLeft}>
          {canGoBack
            ? <BackButton onPress={() => canGoBack && onBack?.()} enabled={canGoBack} />
            : null}
          <Text style={styles.stepLabel}>Step {step} of {totalSteps}</Text>
        </View>

        <View style={styles.progressTrack}>
          {Array.from({ length: totalSteps }, (_, i) => {
            const isCompleted = i < step - 1;
            const isCurrent = i === step - 1;
            const isFuture = i > step - 1;
            return (
              <Pressable
                key={i}
                onPress={() => navigateToStep(i + 1)}
                disabled={isCurrent}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.progressSegment,
                  isCurrent || isCompleted
                    ? styles.progressSegmentActive
                    : styles.progressSegmentInactive,
                  isCompleted && styles.progressSegmentCompleted,
                  isFuture && pressed && styles.progressSegmentPressed,
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* Title */}
      {titleLines.length > 0 && (
        <View style={styles.titleBlock}>
          <Text style={styles.title}>
            {titleLines.map((line, i) => (
              <Text key={i} style={i === titleLines.length - 1 && titleLines.length > 1 ? styles.titleAccent : null}>
                {line}
                {i < titleLines.length - 1 ? '\n' : ''}
              </Text>
            ))}
          </Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}

      {/* Content area */}
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

      {footer && <View style={styles.footer}>{footer}</View>}

      {/* Skip this step — hidden on the final step */}
      {step < totalSteps && (
        <Pressable onPress={handleSkip} style={styles.skipRow}>
          <Text style={styles.skipText}>Skip this step</Text>
          <Text style={styles.skipNote}> · You can adjust this in your profile later</Text>
        </Pressable>
      )}
    </Animated.View>
  );

  return (
    <ScreenBackdrop style={styles.root}>
      <SafeAreaView style={styles.flex}>
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
    </ScreenBackdrop>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },

  // Nav
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    marginBottom: 14,
  },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepLabel: {
    fontSize: 12.5,
    fontFamily: 'DMSans_500Medium',
    color: AUTH_COLORS.muted,
  },
  progressTrack: { flexDirection: 'row', gap: 4, width: 96 },
  progressSegment: { flex: 1, height: 4, borderRadius: 999 },
  progressSegmentActive: { backgroundColor: AUTH_COLORS.primary },
  progressSegmentInactive: { backgroundColor: 'rgba(107, 78, 255, 0.14)' },
  progressSegmentCompleted: { opacity: 0.55 },
  progressSegmentPressed: { backgroundColor: 'rgba(107, 78, 255, 0.28)' },

  // Title
  titleBlock: { paddingHorizontal: 20, marginBottom: 16, gap: 6 },
  title: {
    fontSize: 28, fontFamily: 'DMSans_700Bold',
    color: AUTH_COLORS.ink, letterSpacing: -0.4, lineHeight: 32,
  },
  titleAccent: { color: AUTH_COLORS.primary },
  subtitle: {
    fontSize: 14, fontFamily: 'DMSans_500Medium',
    color: AUTH_COLORS.muted, lineHeight: 20,
  },

  // Content
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20, paddingBottom: 16, paddingTop: 2, gap: 14,
  },

  // Footer (fixed CTA area, outside scroll)
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },

  // Skip row
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingBottom: 4,
  },
  skipText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: AUTH_COLORS.primary,
    textDecorationLine: 'underline',
  },
  skipNote: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: AUTH_COLORS.muted,
  },
});

export default OnboardingLayout;
