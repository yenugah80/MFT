/**
 * Onboarding Index Route
 *
 * Entry point for the onboarding flow.
 *
 * Routing rules:
 *   step == 1 (no saved progress)  → step-1 immediately
 *   step > 1  (partial progress)   → Resume screen (Continue Setup / Start Over)
 *
 * The parent onboarding/_layout.jsx already guarantees:
 *   - user is authenticated
 *   - onboardingComplete === false
 * so those checks are not repeated here.
 */

import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackdrop } from '../../components/auth/canvas';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { AUTH_COLORS } from '../../components/auth/constants';

const TOTAL_STEPS = 4;

const STEP_META = [
  { id: 1, label: 'Your Goal', icon: 'flame-outline' },
  { id: 2, label: 'Your Basics', icon: 'body-outline' },
  { id: 3, label: 'Your Preferences', icon: 'restaurant-outline' },
  { id: 4, label: 'Your Targets', icon: 'stats-chart-outline' },
];

export default function OnboardingIndex() {
  const { step, isLoading, resetOnboarding } = useOnboarding();
  const [showResume, setShowResume] = useState(false);
  const fallbackTimerRef = useRef(null);

  useEffect(() => {
    if (isLoading) {
      fallbackTimerRef.current = setTimeout(() => {
        console.warn('[OnboardingIndex] Load timeout — forcing step-1');
        router.replace('/onboarding/step-1');
      }, 3000);
      return () => clearTimeout(fallbackTimerRef.current);
    }

    clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = null;

    if (step > 1 && step <= TOTAL_STEPS) {
      setShowResume(true);
    } else {
      router.replace(`/onboarding/step-${step}`);
    }
  }, [step, isLoading]);

  const handleContinue = () => {
    router.replace(`/onboarding/step-${step}`);
  };

  const handleStartOver = () => {
    Alert.alert(
      'Start over?',
      "Your onboarding answers will be deleted.\nThis won't affect your account or sign you out.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Over',
          style: 'destructive',
          onPress: async () => {
            await resetOnboarding();
            router.replace('/onboarding/step-1');
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (!isLoading && showResume) {
    return (
      <ScreenBackdrop style={styles.root}>
        <SafeAreaView style={styles.flex}>
          <View style={styles.container}>
            {/* Progress segments — same language as the step screens */}
            <View style={styles.progressTrack}>
              {Array.from({ length: TOTAL_STEPS }, (_, i) => {
                const isCompleted = i < step - 1;
                const isCurrent = i === step - 1;
                return (
                  <View
                    key={i}
                    style={[
                      styles.progressSegment,
                      (isCurrent || isCompleted) ? styles.progressSegmentActive : styles.progressSegmentInactive,
                      isCompleted && styles.progressSegmentCompleted,
                    ]}
                  />
                );
              })}
            </View>

            <Text style={styles.title}>
              Pick up right{'\n'}
              <Text style={styles.titleAccent}>where you left off</Text>
            </Text>
            <Text style={styles.subtitle}>
              You're on step {step} of {TOTAL_STEPS} — this'll only take a minute to finish.
            </Text>

            {/* Step checklist */}
            <View style={styles.stepList}>
              {STEP_META.map((meta, index) => {
                const stepNum = index + 1;
                const isDone = stepNum < step;
                const isCurrent = stepNum === step;
                return (
                  <View
                    key={meta.id}
                    style={[
                      styles.stepRow,
                      isCurrent && styles.stepRowCurrent,
                      index < STEP_META.length - 1 && styles.stepRowDivider,
                    ]}
                  >
                    <View style={[
                      styles.stepIconBg,
                      isDone && styles.stepIconBgDone,
                      isCurrent && styles.stepIconBgCurrent,
                    ]}>
                      {isDone
                        ? <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        : <Ionicons name={meta.icon} size={16} color={isCurrent ? AUTH_COLORS.primary : AUTH_COLORS.muted} />}
                    </View>
                    <Text style={[
                      styles.stepLabel,
                      isDone && styles.stepLabelDone,
                      isCurrent && styles.stepLabelCurrent,
                    ]}>
                      {meta.label}
                    </Text>
                    {isCurrent && <Text style={styles.stepNowBadge}>Up next</Text>}
                  </View>
                );
              })}
            </View>

            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [styles.continueBtnWrap, pressed && styles.continueBtnPressed]}
                onPress={handleContinue}
                accessibilityRole="button"
                accessibilityLabel="Continue setup"
              >
                <LinearGradient
                  colors={[AUTH_COLORS.primaryLight, AUTH_COLORS.primary, AUTH_COLORS.primaryDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.continueBtn}
                >
                  <Text style={styles.continueBtnText}>Continue Setup</Text>
                  <Ionicons name="arrow-forward" size={18} color={AUTH_COLORS.white} />
                </LinearGradient>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.startOverBtn, pressed && { opacity: 0.6 }]}
                onPress={handleStartOver}
                accessibilityRole="button"
                accessibilityLabel="Start over"
              >
                <Ionicons name="refresh-outline" size={14} color={AUTH_COLORS.muted} />
                <Text style={styles.startOverBtnText}>Start Over</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </ScreenBackdrop>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={AUTH_COLORS.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AUTH_COLORS.canvas },
  flex: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: AUTH_COLORS.canvas,
    padding: 28,
  },

  /* Progress */
  progressTrack: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 28,
  },
  progressSegment: { flex: 1, height: 4, borderRadius: 999 },
  progressSegmentActive: { backgroundColor: AUTH_COLORS.primary },
  progressSegmentInactive: { backgroundColor: 'rgba(107, 78, 255, 0.14)' },
  progressSegmentCompleted: { opacity: 0.55 },

  /* Headline */
  title: {
    fontSize: 30,
    fontFamily: 'DMSans_700Bold',
    color: AUTH_COLORS.ink,
    lineHeight: 36,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  titleAccent: { color: AUTH_COLORS.primary },
  subtitle: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: AUTH_COLORS.muted,
    lineHeight: 21,
    marginBottom: 24,
  },

  /* Step checklist */
  stepList: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(15, 36, 31, 0.08)',
    marginBottom: 28,
    shadowColor: 'rgba(7, 19, 30, 0.16)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  stepRowCurrent: {
    backgroundColor: 'rgba(107, 78, 255, 0.05)',
  },
  stepRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 36, 31, 0.07)',
  },
  stepIconBg: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 36, 31, 0.06)',
    flexShrink: 0,
  },
  stepIconBgDone: {
    backgroundColor: AUTH_COLORS.primary,
  },
  stepIconBgCurrent: {
    backgroundColor: 'rgba(107, 78, 255, 0.12)',
  },
  stepLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: AUTH_COLORS.muted,
  },
  stepLabelDone: {
    color: AUTH_COLORS.ink,
    fontFamily: 'DMSans_700Bold',
  },
  stepLabelCurrent: {
    color: AUTH_COLORS.ink,
    fontFamily: 'DMSans_700Bold',
  },
  stepNowBadge: {
    fontSize: 10,
    fontFamily: 'DMSans_700Bold',
    color: AUTH_COLORS.primary,
    backgroundColor: 'rgba(107, 78, 255, 0.10)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  /* Actions */
  actions: {
    width: '100%',
    alignItems: 'center',
    gap: 4,
  },
  continueBtnWrap: {
    alignSelf: 'center',
  },
  continueBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 999,
    shadowColor: AUTH_COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.34,
    shadowRadius: 18,
    elevation: 6,
  },
  continueBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  continueBtnText: {
    color: AUTH_COLORS.white,
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 0.2,
  },
  startOverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  startOverBtnText: {
    fontSize: 13.5,
    fontFamily: 'DMSans_500Medium',
    color: AUTH_COLORS.muted,
    textDecorationLine: 'underline',
  },
});
