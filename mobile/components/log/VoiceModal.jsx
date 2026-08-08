/**
 * ============================================================================
 * VoiceModal Component - UNIFIED VERSION
 * ============================================================================
 * Premium voice recording modal with transcription preview and confidence display
 * Supports both standard and elderly accessibility modes.
 *
 * Modes:
 * - "standard": Normal UI with edit capability, two-step flow
 * - "elderly": Large buttons, audio guidance, auto-confirm, simplified flow
 *
 * @example
 * <VoiceModal
 *   visible={showVoiceModal}
 *   onClose={() => setShowVoiceModal(false)}
 *   onComplete={(result) => handleVoiceComplete(result)}
 *   voiceHook={useLiveVoice()}
 *   accessibilityMode="standard" // or "elderly"
 * />
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  TextInput,
  Platform,
  AccessibilityInfo,
  Linking,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

import { BRAND, TEXT, SEMANTIC, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ICON_SIZES, SURFACES, SEMANTIC_ACTIONS } from '../../constants/premiumTheme';
import { useRouter } from 'expo-router';
import apiClient from '../../services/apiClient';
import { useAudioPlayback } from '../../hooks/useAudioPlayback';
import { getTTSCode } from '../../constants/languages';
import {
  trackVoiceRecordingStarted,
  trackVoiceRecordingCompleted,
  trackVoiceRecordingCancelled,
  trackVoiceTranscriptionReceived,
  trackVoiceTranscriptionEdited,
  trackVoiceAnalysisStarted,
  trackVoiceAnalysisCompleted,
  trackVoiceAnalysisFailed,
  trackVoicePlaybackStarted,
  trackVoiceRerecord,
  trackVoiceSessionAbandoned,
  clearVoiceSession,
} from '../../services/voiceAnalytics';

// ============================================================================
// CONSTANTS
// ============================================================================

const SCREEN_WIDTH = Dimensions.get('window').width;
const WAVEFORM_BARS_STANDARD = 30;
const WAVEFORM_BARS_ELDERLY = 15;
const MAX_RECORDING_DURATION_MS = 60000; // 60 seconds

// ============================================================================
// AUDIO GUIDANCE (Elderly Mode)
// ============================================================================

async function speakInstruction(text, enabled, voiceLanguage = 'en') {
  if (!enabled) return;
  try {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const ttsLanguage = getTTSCode(voiceLanguage);
      await Speech.speak(text, {
        language: ttsLanguage,
        pitch: 1.0,
        rate: 0.9, // Slower for elderly
      });
    }
  } catch (err) {
    console.warn('Text-to-speech failed:', err);
  }
}

// ============================================================================
// WAVEFORM VISUALIZER
// ============================================================================

function WaveformVisualizer({ volume, isActive, isElderly }) {
  const barCount = isElderly ? WAVEFORM_BARS_ELDERLY : WAVEFORM_BARS_STANDARD;
  const [bars] = useState(() =>
    Array.from({ length: barCount }, () => new Animated.Value(isElderly ? 0.3 : 0.2))
  );

  useEffect(() => {
    let animationRef = null;
    const baseValue = isElderly ? 0.3 : 0.2;

    if (!isActive) {
      bars.forEach(bar => {
        Animated.timing(bar, {
          toValue: baseValue,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });
      return;
    }

    const animations = bars.map((bar, index) => {
      const baseHeight = baseValue + volume * (isElderly ? 0.7 : 0.8);
      const variation = Math.sin((index / barCount) * Math.PI) * (isElderly ? 0.2 : 0.3);
      const targetHeight = Math.max(0.1, Math.min(1, baseHeight + variation));

      return Animated.timing(bar, {
        toValue: targetHeight,
        duration: isElderly ? 150 : 100,
        useNativeDriver: false,
      });
    });

    animationRef = Animated.parallel(animations);
    animationRef.start();

    return () => {
      if (animationRef) {
        animationRef.stop();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, isActive, bars, isElderly]);

  return (
    <View style={isElderly ? styles.waveformContainerElderly : styles.waveformContainer}>
      {bars.map((bar, index) => (
        <Animated.View
          key={index}
          style={[
            isElderly ? styles.waveformBarElderly : styles.waveformBar,
            {
              height: bar.interpolate({
                inputRange: [0, 1],
                outputRange: [isElderly ? '20%' : '10%', '100%'],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getConfidenceColor(confidence) {
  if (confidence >= 0.8) return SEMANTIC.success.base;
  if (confidence >= 0.6) return SEMANTIC.warning.base;
  return SEMANTIC.danger.base;
}

function getConfidenceLabel(confidence) {
  // Clarify this is food recognition confidence, not nutrition accuracy
  if (confidence >= 0.8) return 'Clear Recognition';
  if (confidence >= 0.6) return 'Partial Recognition';
  return 'Uncertain Recognition';
}

async function triggerHaptic(type = 'light') {
  try {
    if (type === 'success') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (type === 'error') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (type === 'heavy') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // Haptics not available
  }
}

/**
 * Announce state changes for screen readers
 * Helps visually impaired users understand the current state
 */
function announceForAccessibility(message) {
  try {
    AccessibilityInfo.announceForAccessibility(message);
  } catch {
    // Accessibility announcement not available
  }
}

// ============================================================================
// MAIN VOICEMODAL COMPONENT
// ============================================================================

export function VoiceModal({
  visible,
  onClose,
  onComplete,
  onSaveNow,
  voiceHook,
  accessibilityMode = 'standard', // 'standard' | 'elderly'
  voiceLanguage = 'en', // Language for TTS guidance
}) {
  const isElderly = accessibilityMode === 'elderly';
  const router = useRouter();

  const {
    isRecording,
    isProcessing,
    volume,
    duration,
    error,
    transcript: liveTranscript = '', // Live transcript while speaking
    startRecording,
    stopRecording,
    analyzeTranscript,
    cancelRecording,
    clearError = () => {},
    recordingUri,
    clearRecordingUri = () => {},
    transcribeRecording,
    isVoiceUnsupported = false,
  } = voiceHook;

  // Audio playback for reviewing recording before confirm
  const audioPlayback = useAudioPlayback();

  // ─────────────────────────────────────────────
  // State & Refs
  // ─────────────────────────────────────────────
  const [state, setState] = useState('idle');
  const [transcription, setTranscription] = useState('');
  const [originalTranscription, setOriginalTranscription] = useState(''); // Track original for edit detection
  const [confidence, setConfidence] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);
  // Audio held across the consent prompt so agreeing resumes with the original
  // recording instead of asking the user to say it all again.
  const [pendingConsentUri, setPendingConsentUri] = useState(null);
  // Reviewed transcript held across the consent prompt when the *analysis*
  // step (not transcription) is the one that needed consent — agreeing
  // re-runs analysis on this text rather than discarding it and re-recording.
  const [pendingAnalyzeText, setPendingAnalyzeText] = useState(null);
  const [isEnablingConsent, setIsEnablingConsent] = useState(false);
  // The analyzed { transcription, nutrition, items, totals } once analysis
  // succeeds — held here so the 'reviewing' screen can render it and Save can
  // send it straight to the backend without leaving the modal.
  const [reviewResult, setReviewResult] = useState(null);
  const [isSavingResult, setIsSavingResult] = useState(false);

  // Refs for cleanup and guards
  const successTimeoutRef = useRef(null);
  const isCancelledRef = useRef(false);
  const stopCalledRef = useRef(false);
  const spinAnim = useRef(new Animated.Value(0)).current;

  // ─────────────────────────────────────────────
  // Audio Guidance (Elderly Mode)
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (isElderly && state === 'idle' && visible) {
      speakInstruction('Tap the big microphone button to start speaking', true, voiceLanguage);
    }
  }, [state, visible, isElderly, voiceLanguage]);

  useEffect(() => {
    if (isElderly && state === 'listening') {
      speakInstruction('I am listening', true, voiceLanguage);
    }
  }, [state, isElderly, voiceLanguage]);

  // ─────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────


  const handleClose = useCallback(() => {
    isCancelledRef.current = true;

    // Cleanup audio playback - pause FIRST before reset to ensure clean cleanup
    if (audioPlayback.isPlaying) {
      audioPlayback.pause();
    }
    audioPlayback.reset();
    clearRecordingUri();

    // Track abandoned sessions (user closed without completing)
    // Only track if they were in the middle of the flow (not idle or success)
    if (state === 'listening' || state === 'processing' || state === 'transcribed' || state === 'analyzing') {
      trackVoiceSessionAbandoned(state);
    } else {
      // Clear session without tracking (for idle/success/error states)
      clearVoiceSession();
    }

    clearError();
    setLocalError(null);
    setState('idle');
    setTranscription('');
    setOriginalTranscription('');
    setConfidence(null);
    setIsEditing(false);
    setIsSubmitting(false);
    setPendingConsentUri(null);
    setPendingAnalyzeText(null);
    setReviewResult(null);
    setIsSavingResult(false);
    stopCalledRef.current = false;

    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    onClose();
  }, [clearError, onClose, audioPlayback, clearRecordingUri, state]);

  const handleStart = useCallback(async () => {
    isCancelledRef.current = false;
    stopCalledRef.current = false;
    setLocalError(null);

    // If we already know this device can't transcribe on its own, the recording
    // can only be completed server-side — which needs consent. Resolve that
    // BEFORE recording rather than after.
    //
    // Otherwise the user describes a whole meal, taps stop, and only then meets
    // a wall. Having spoken into a void is the single most frustrating version
    // of this feature, and it would hit every user on a device without an
    // on-device recogniser. Asking first costs one tap; asking last costs the
    // recording and, quite reasonably, their trust in the feature.
    if (isVoiceUnsupported) {
      try {
        const status = await apiClient.get('/consent/status');
        if (status?.consent?.hasConsent !== true) {
          setPendingConsentUri(null);
          setState('consent');
          await triggerHaptic('light');
          announceForAccessibility('Voice transcription needs AI to be enabled.');
          return;
        }
      } catch (err) {
        // Can't reach the consent check — let the recording proceed rather than
        // blocking on a network hiccup. The post-recording path still catches a
        // 403 and keeps the audio.
        console.warn('[VoiceModal] Consent pre-check failed, proceeding:', err?.message);
      }
    }

    // Track recording started
    trackVoiceRecordingStarted(isElderly ? 'elderly' : 'standard');

    clearError();
    await triggerHaptic(isElderly ? 'heavy' : 'light');
    announceForAccessibility('Recording started. Speak your meal now.');
    await startRecording();
  }, [clearError, startRecording, isElderly, isVoiceUnsupported]);

  /**
   * Elderly mode's whole design is auto-confirm, minimal interaction — so
   * unlike standard mode (which stops at a review screen for an explicit
   * Save), a successful analysis here saves immediately via onSaveNow and
   * only then announces "logged successfully". Speaking that promise before
   * the save actually happens (the old behavior) meant it could be false.
   * Shared by both places elderly mode can land on a successful result: the
   * direct auto-analyze-after-recording path, and the post-consent retry.
   * Returns whether it actually succeeded, so callers can decide whether to
   * reset their own retry guards.
   */
  const finalizeElderlyLog = useCallback(async (nutritionResult) => {
    try {
      if (onSaveNow) {
        const saved = await onSaveNow(nutritionResult);
        if (saved === false) {
          setLocalError('Could not save this meal. Please try again.');
          setState('error');
          await triggerHaptic('error');
          announceForAccessibility('Could not save this meal.');
          await speakInstruction('Sorry, I could not save that. Please try again.', true, voiceLanguage);
          return false;
        }
      } else {
        // No save wired up by the host screen — fall back to staging the
        // result for review elsewhere, same as before this change.
        onComplete(nutritionResult);
      }

      setState('success');
      await triggerHaptic('success');
      await speakInstruction('Food logged successfully', true, voiceLanguage);

      successTimeoutRef.current = setTimeout(() => {
        if (!isCancelledRef.current) {
          handleClose();
        }
      }, 2000);
      return true;
    } catch (err) {
      console.error('[VoiceModal] Elderly save failed:', err);
      setLocalError('Could not save this meal. Please try again.');
      setState('error');
      await triggerHaptic('error');
      await speakInstruction('Sorry, I could not save that. Please try again.', true, voiceLanguage);
      return false;
    }
  }, [onSaveNow, onComplete, handleClose, voiceLanguage]);

  /**
   * Grants AI consent, then transcribes the audio we already have.
   * One tap, no lost recording, no trip through Settings.
   */
  const handleEnableAIConsent = useCallback(async () => {
    setIsEnablingConsent(true);
    try {
      await apiClient.post('/consent/give-openai-consent', {
        understand: true,
        purpose: 'voice-transcription',
      });

      // Asked at the analysis step (transcript already reviewed/edited): re-run
      // analysis on that text rather than discarding it and re-recording.
      if (pendingAnalyzeText) {
        const nutritionResult = await analyzeTranscript(pendingAnalyzeText);
        const itemCount = nutritionResult?.needsConsent ? 0 : (nutritionResult?.items?.length || 0);
        if (itemCount > 0) {
          setPendingAnalyzeText(null);
          // Elderly mode never shows the review screen — auto-save and speak
          // the result, same as its direct (non-consent-blocked) path.
          if (isElderly) {
            await finalizeElderlyLog(nutritionResult);
            return;
          }
          setReviewResult(nutritionResult);
          setState('reviewing');
          await triggerHaptic('success');
          announceForAccessibility(`Found ${itemCount} item${itemCount === 1 ? '' : 's'}. Review and save.`);
          return;
        }
        setLocalError('Could not analyze your meal. Please try again.');
        setState('error');
        return;
      }

      // Asked BEFORE recording (the common path): there is no audio yet, so
      // start recording now that consent is in place. The user goes straight
      // from agreeing to speaking.
      if (!pendingConsentUri) {
        setState('idle');
        await handleStart();
        return;
      }

      // Asked AFTER recording (first-time discovery only): transcribe the audio
      // we held across the prompt, so nothing they said is lost.
      const retry = await transcribeRecording?.(pendingConsentUri);
      if (retry?.transcript?.trim()) {
        setTranscription(retry.transcript);
        setConfidence(retry.confidence ?? 0.9);
        setState('transcribed');
        await triggerHaptic('success');
        return;
      }

      setLocalError('Transcription came back empty. Please try recording again.');
      setState('error');
    } catch (err) {
      console.error('[VoiceModal] Enabling AI consent failed', err);
      setLocalError('Could not enable AI transcription. Please try again.');
      setState('error');
    } finally {
      setIsEnablingConsent(false);
    }
  }, [pendingConsentUri, pendingAnalyzeText, transcribeRecording, handleStart, analyzeTranscript, isElderly, finalizeElderlyLog]);


  const handleStop = useCallback(async () => {
    if (stopCalledRef.current) {
      console.warn('[VoiceModal] handleStop already called, ignoring');
      return;
    }
    stopCalledRef.current = true;

    try {
      await triggerHaptic();
      const stopTime = Date.now();
      const result = await stopRecording();

      // Track recording completed
      trackVoiceRecordingCompleted(duration);

      if (isCancelledRef.current) {
        return;
      }

      // The recording was fine — server transcription is simply gated behind a
      // consent the user hasn't given yet. Ask for it here, in the flow, with
      // their audio still held. Sending them to Settings to hunt for a toggle
      // would lose the recording and almost certainly the user.
      if (result.needsConsent) {
        setPendingConsentUri(result.recordingUri || null);
        setState('consent');
        await triggerHaptic('light');
        announceForAccessibility('Voice transcription needs AI to be enabled.');
        return;
      }

      // Handle empty transcript (no speech detected)
      if (result.isEmpty) {
        trackVoiceAnalysisFailed('empty_transcript', 'No speech detected');
        setLocalError('No speech detected. Please try again and speak clearly.');
        setState('error');
        await triggerHaptic('error');
        announceForAccessibility('No speech detected. Please try again and speak clearly.');
        if (isElderly) {
          await speakInstruction('I could not hear you. Please try again and speak clearly.', true, voiceLanguage);
        }
        stopCalledRef.current = false;
        return;
      }

      const transcript = result.transcript || 'Unknown food';
      setTranscription(transcript);
      setConfidence(result.confidence ?? 0.9);

      // Track transcription received
      const transcriptionLatency = Date.now() - stopTime;
      trackVoiceTranscriptionReceived(transcript, result.confidence ?? 0.9, transcriptionLatency);

      if (isElderly) {
        // Elderly mode: Auto-analyze immediately
        setState('analyzing');

        // Track analysis started
        trackVoiceAnalysisStarted();

        const nutritionResult = await analyzeTranscript(transcript);

        if (isCancelledRef.current) {
          return;
        }

        // Blocked pending AI consent — same graceful screen as everywhere else,
        // not a dead end (see the standard-mode handleConfirm for the full
        // explanation).
        if (nutritionResult?.needsConsent) {
          setPendingAnalyzeText(transcript);
          setPendingConsentUri(null);
          setState('consent');
          await triggerHaptic('light');
          announceForAccessibility('Voice logging needs AI to be enabled.');
          stopCalledRef.current = false;
          return;
        }

        // Check if analysis failed (returned null)
        if (!nutritionResult) {
          // Track analysis failed
          trackVoiceAnalysisFailed('api_error', error || 'Unknown error');

          // Use error from hook if available, otherwise generic message
          const errorMsg = error || 'Failed to analyze nutrition. Please try again.';
          setLocalError(errorMsg);
          setState('error');
          await triggerHaptic('error');
          announceForAccessibility(`Error: ${errorMsg}`);
          await speakInstruction('Sorry, something went wrong. Please try again.', true, voiceLanguage);
          stopCalledRef.current = false;
          return;
        }

        const itemCount = nutritionResult.items?.length || 0;
        const totalCalories = nutritionResult.totals?.macros?.calories_kcal || 0;

        // Same rule as standard mode: zero items is not success, it's nothing
        // to log, and saying "logged successfully" over TTS would be false.
        if (itemCount === 0) {
          trackVoiceAnalysisFailed('empty_result', 'No food identified in transcript');
          setLocalError("Couldn't identify any food in that. Try recording again with more detail.");
          setState('error');
          await triggerHaptic('error');
          announceForAccessibility("Couldn't identify any food in that.");
          await speakInstruction('I could not identify any food in that. Please try again.', true, voiceLanguage);
          stopCalledRef.current = false;
          return;
        }

        // Track analysis completed
        trackVoiceAnalysisCompleted(itemCount, totalCalories);

        const saved = await finalizeElderlyLog(nutritionResult);
        if (!saved) {
          stopCalledRef.current = false;
        }
      } else {
        // Standard mode: Show transcribed state with playback option
        // User can review recording, edit transcription, then confirm to analyze
        setOriginalTranscription(transcript);

        // Load audio for playback if available
        if (result.recordingUri) {
          try {
            await audioPlayback.loadAudio(result.recordingUri);
          } catch (audioErr) {
            // Audio loading failed - continue without playback (non-critical)
            console.warn('[VoiceModal] Failed to load audio for playback:', audioErr);
          }
        }

        announceForAccessibility(`Transcription ready: ${transcript}. Review and confirm to analyze.`);
        setState('transcribed');
      }
    } catch (err) {
      console.error('[VoiceModal] Stop failed:', err);
      if (!isCancelledRef.current) {
        const errorMsg = err.message || 'Failed to process recording';
        setLocalError(errorMsg);
        setState('error');
        await triggerHaptic('error');
        announceForAccessibility(`Error: ${errorMsg}. Tap Try Again to retry.`);
      }
      stopCalledRef.current = false;
    }
  }, [stopRecording, analyzeTranscript, finalizeElderlyLog, isElderly, error, audioPlayback, duration, voiceLanguage]);

  const handleCancel = useCallback(async () => {
    // Track recording cancelled
    trackVoiceRecordingCancelled(duration, 'user_cancelled');

    await triggerHaptic();
    await cancelRecording();
    handleClose();
  }, [cancelRecording, handleClose, duration]);

  const handleConfirm = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    // Track if transcription was edited
    if (originalTranscription && transcription !== originalTranscription) {
      trackVoiceTranscriptionEdited(originalTranscription, transcription);
    }

    try {
      setIsSubmitting(true);
      setLocalError(null);
      setState('analyzing');
      await triggerHaptic();
      announceForAccessibility('Analyzing nutrition. Please wait.');

      // Track analysis started
      trackVoiceAnalysisStarted();

      const nutritionResult = await analyzeTranscript(transcription);

      if (isCancelledRef.current) {
        return;
      }

      // Blocked pending AI consent — hold the reviewed transcript and route to
      // the same consent screen used elsewhere, instead of a dead-end error
      // whose only action ("Try Again") would just repeat this failure.
      if (nutritionResult?.needsConsent) {
        setPendingAnalyzeText(transcription);
        setPendingConsentUri(null);
        setState('consent');
        await triggerHaptic('light');
        announceForAccessibility('AI analysis needs your consent.');
        setIsSubmitting(false);
        return;
      }

      // Check if analysis failed (returned null)
      if (!nutritionResult) {
        // Track analysis failed
        trackVoiceAnalysisFailed('api_error', error || 'Unknown error');

        // Use error from hook if available, otherwise generic message
        setLocalError(error || 'Failed to analyze nutrition. Please try again.');
        setState('error');
        await triggerHaptic('error');
        setIsSubmitting(false);
        return;
      }

      const itemCount = nutritionResult.items?.length || 0;
      const totalCalories = nutritionResult.totals?.macros?.calories_kcal || 0;

      // A call that resolves with zero items is not success — nothing was
      // identified in the transcript, so there is nothing to log. Closing the
      // modal here (as the code used to) told the user "Food logged
      // successfully" while silently logging nothing, leaving them to
      // discover the untouched transcript sitting in the Text tab with no
      // idea why. Keep them in the voice flow so they can edit or re-record.
      if (itemCount === 0) {
        trackVoiceAnalysisFailed('empty_result', 'No food identified in transcript');
        setLocalError("Couldn't identify any food in that. Try recording again with more detail.");
        setState('error');
        await triggerHaptic('error');
        announceForAccessibility("Couldn't identify any food in that. Try recording again.");
        setIsSubmitting(false);
        return;
      }

      // Track analysis completed
      trackVoiceAnalysisCompleted(itemCount, totalCalories);

      // Show the analyzed items right here instead of closing on a bare
      // "Success!" flash — that told the user the meal was logged while the
      // items were only ever staged into a screen they'd have to go find (see
      // handleSaveReviewed for where the actual save now happens).
      setReviewResult(nutritionResult);
      setState('reviewing');
      await triggerHaptic('success');
      announceForAccessibility(`Found ${itemCount} item${itemCount === 1 ? '' : 's'}. Review and save.`);
      setIsSubmitting(false);
    } catch (err) {
      console.error('[VoiceModal] Analysis failed:', err);
      // Track analysis failed
      trackVoiceAnalysisFailed('exception', err.message);

      if (!isCancelledRef.current) {
        const errorMsg = err.message || 'Failed to analyze nutrition';
        setLocalError(errorMsg);
        setState('error');
        announceForAccessibility(`Error: ${errorMsg}. Tap Try Again to retry.`);
      }
      setIsSubmitting(false);
    }
  }, [analyzeTranscript, transcription, originalTranscription, isSubmitting, error]);

  /**
   * Saves the reviewed result directly from the modal via onSaveNow (the
   * real backend save — see log.js's handleSaveVoiceResult), rather than
   * handing it to onComplete to stage on a screen the user has to go find.
   * Falls back to the old stage-and-close behavior if the host screen hasn't
   * wired up onSaveNow, so this never becomes a dead end.
   */
  const handleSaveReviewed = useCallback(async () => {
    if (!reviewResult || isSavingResult) return;

    if (!onSaveNow) {
      onComplete(reviewResult);
      handleClose();
      return;
    }

    setIsSavingResult(true);
    try {
      const saved = await onSaveNow(reviewResult);
      if (saved === false) {
        // onSaveNow already surfaced its own error (toast) — this just keeps
        // the user on the review screen so Save can be retried, instead of
        // closing on a save that didn't actually happen.
        return;
      }
      handleClose();
    } catch (err) {
      console.error('[VoiceModal] Save failed:', err);
      setLocalError('Could not save this meal. Please try again.');
      setState('error');
    } finally {
      setIsSavingResult(false);
    }
  }, [reviewResult, isSavingResult, onSaveNow, onComplete, handleClose]);

  const handleDiscardReview = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const handleEditTranscription = useCallback(() => {
    setIsEditing(true);
    triggerHaptic();
  }, []);

  const handleSaveEdit = useCallback(() => {
    setIsEditing(false);
    triggerHaptic();
  }, []);

  const handleRerecord = useCallback(async () => {
    // Track re-record
    trackVoiceRerecord();

    // The isRecording->'listening' sync effect below early-returns while
    // state is 'transcribed' (by design, so a stray isRecording flicker
    // doesn't yank the user out of reviewing their transcript). Without this,
    // starting a new recording here would leave the UI frozen on the old
    // transcript screen — recording live in the background with no visible
    // indication — until the 60s max-duration auto-stop kicked in.
    setState('idle');

    // Reset playback and transcription state
    audioPlayback.reset();
    clearRecordingUri();
    setTranscription('');
    setOriginalTranscription('');
    setConfidence(null);
    setIsEditing(false);
    stopCalledRef.current = false;

    // Restart recording
    await triggerHaptic();
    await handleStart();
  }, [audioPlayback, clearRecordingUri, handleStart]);

  const handlePlaybackToggle = useCallback(() => {
    // Track playback started (only on play, not pause)
    if (!audioPlayback.isPlaying) {
      trackVoicePlaybackStarted();
    }
    audioPlayback.togglePlayback();
    triggerHaptic();
  }, [audioPlayback]);

  // ─────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (state === 'transcribed' || state === 'analyzing' || state === 'success' || state === 'reviewing') {
      return;
    }

    if (isRecording) {
      setState('listening');
    } else if (isProcessing) {
      setState('processing');
    } else if (error) {
      setState('error');
      triggerHaptic('error');
    } else if (!visible) {
      setState('idle');
      setTranscription('');
      setConfidence(null);
      setIsEditing(false);
      setLocalError(null);
      isCancelledRef.current = false;
      stopCalledRef.current = false;
    }
  }, [isRecording, isProcessing, error, visible, state]);

  useEffect(() => {
    if (duration >= MAX_RECORDING_DURATION_MS && isRecording) {
      handleStop();
    }
  }, [duration, isRecording, handleStop]);

  useEffect(() => {
    let spinAnimation = null;

    if (state === 'processing' || state === 'analyzing') {
      spinAnim.setValue(0);
      spinAnimation = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: isElderly ? 1200 : 1000,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();
    } else {
      spinAnim.setValue(0);
    }

    return () => {
      if (spinAnimation) {
        spinAnimation.stop();
      }
    };
  }, [state, spinAnim, isElderly]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  // ─────────────────────────────────────────────
  // Computed values
  // ─────────────────────────────────────────────
  const durationColor = duration >= 50000 ? SEMANTIC.danger.base : TEXT.primary;
  const remainingSeconds = Math.ceil((MAX_RECORDING_DURATION_MS - duration) / 1000);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const displayError = localError || error;
  // Matches the specific message useServerVoice sets when expo-audio reports
  // mic permission as permanently denied — "Try Again" alone would just hit
  // the same wall again, since the OS won't re-prompt after an explicit denial.
  const isMicPermissionError = displayError === 'Microphone access is disabled. Enable it in Settings to record.';

  // A recogniser that cannot initialise on this device will not initialise on
  // the next tap either, so offering "Try Again" is a dead end — it was shown
  // directly beneath a message telling the user to switch to text or photo.
  const isUnrecoverable =
    typeof displayError === 'string' && displayError.includes("isn't available on this device");

  // ─────────────────────────────────────────────
  // Dynamic styles based on mode
  // ─────────────────────────────────────────────
  const modalStyle = isElderly ? styles.modalElderly : styles.modal;
  const headerStyle = isElderly ? styles.headerElderly : styles.header;
  const titleStyle = isElderly ? styles.titleElderly : styles.title;
  const contentStyle = isElderly ? styles.contentElderly : styles.content;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={modalStyle}>
          {/* ─────────────────────────────────────────── */}
          {/* IDLE STATE */}
          {/* ─────────────────────────────────────────── */}
          {state === 'idle' && (
            <>
              <View style={headerStyle}>
                {isElderly ? (
                  <>
                    <Text style={titleStyle}>Tell Me What You Ate</Text>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButtonElderly}>
                      <Ionicons name="close" size={40} color={SEMANTIC.danger.base} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Ionicons name="mic" size={ICON_SIZES.md} color={BRAND.primary} />
                    <Text style={titleStyle}>Voice Logging</Text>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                      <Ionicons name="close" size={ICON_SIZES.md} color={TEXT.tertiary} />
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <View style={contentStyle}>
                {isElderly && (
                  <Ionicons name="mic" size={80} color={BRAND.primary} style={styles.largeIcon} />
                )}

                <Text style={isElderly ? styles.instructionElderly : styles.instruction}>
                  {isElderly
                    ? 'Tap the big button below and tell me what you ate'
                    : 'Tap the microphone to start recording your meal description'}
                </Text>

                <TouchableOpacity
                  style={isElderly ? styles.micButtonElderly : styles.micButton}
                  onPress={handleStart}
                >
                  <LinearGradient
                    colors={SURFACES.gradient.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={isElderly ? styles.micButtonGradientElderly : styles.micButtonGradient}
                  >
                    <Ionicons name="mic" size={isElderly ? 60 : ICON_SIZES['4xl']} color={TEXT.white} />
                  </LinearGradient>
                </TouchableOpacity>

                <Text style={isElderly ? styles.exampleTextElderly : styles.hint}>
                  Example: &quot;I had {isElderly ? 'two eggs and toast' : 'a grilled chicken salad with olive oil'}&quot;
                </Text>

                {!isElderly && (
                  <View style={styles.limitBadge}>
                    <Ionicons name="time-outline" size={ICON_SIZES.xs} color={TEXT.muted} />
                    <Text style={styles.limitText}>Max 60 seconds</Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* ─────────────────────────────────────────── */}
          {/* LISTENING STATE */}
          {/* ─────────────────────────────────────────── */}
          {state === 'listening' && (
            <>
              {isElderly ? (
                <View style={headerStyle}>
                  <Text style={titleStyle}>I&apos;m Listening...</Text>
                </View>
              ) : null}

              <View style={contentStyle}>
                <View style={isElderly ? styles.recordingStatusElderly : styles.statusBadge}>
                  <View style={isElderly ? styles.recordingDotElderly : styles.recordingDot} />
                  <Text style={isElderly ? styles.recordingTextElderly : styles.statusText}>Recording{isElderly ? '' : '...'}</Text>
                </View>

                <WaveformVisualizer volume={volume} isActive={true} isElderly={isElderly} />

                <Text style={[isElderly ? styles.durationElderly : styles.durationText, { color: durationColor }]}>
                  {isElderly ? `${Math.floor(duration / 1000)}s` : formatDuration(duration)}
                </Text>

                {/* Live transcript display while speaking */}
                {liveTranscript ? (
                  <View style={isElderly ? styles.liveTranscriptContainerElderly : styles.liveTranscriptContainer}>
                    <Text style={isElderly ? styles.liveTranscriptTextElderly : styles.liveTranscriptText} numberOfLines={3}>
                      {liveTranscript}
                    </Text>
                  </View>
                ) : null}

                {!isElderly && duration >= 50000 && (
                  <Text style={styles.warningText}>{remainingSeconds}s remaining</Text>
                )}

                <View style={isElderly ? styles.buttonGroupElderly : styles.recordingActions}>
                  <TouchableOpacity
                    style={isElderly ? styles.secondaryButtonElderly : styles.cancelRecButton}
                    onPress={handleCancel}
                  >
                    <Ionicons name="close" size={isElderly ? 40 : ICON_SIZES.md} color={isElderly ? SEMANTIC.danger.base : TEXT.tertiary} />
                    <Text style={isElderly ? styles.buttonTextElderly : styles.cancelRecButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={isElderly ? styles.stopButtonElderly : styles.stopButton}
                    onPress={handleStop}
                  >
                    {isElderly ? (
                      <>
                        <Ionicons name="stop" size={50} color={TEXT.white} />
                        <Text style={styles.buttonTextElderly}>Done</Text>
                      </>
                    ) : (
                      <LinearGradient
                        colors={SURFACES.gradient.danger}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.stopButtonGradient}
                      >
                        <Ionicons name="stop" size={ICON_SIZES.xl} color={TEXT.white} />
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* ─────────────────────────────────────────── */}
          {/* PROCESSING STATE */}
          {/* ─────────────────────────────────────────── */}
          {state === 'processing' && (
            <>
              {isElderly && (
                <View style={headerStyle}>
                  <Text style={titleStyle}>Processing...</Text>
                </View>
              )}
              <View style={contentStyle}>
                <View style={styles.processingIndicator}>
                  <Animated.View style={{ transform: [{ rotate: spin }] }}>
                    <Ionicons name="sync" size={isElderly ? 80 : ICON_SIZES['4xl']} color={BRAND.primary} />
                  </Animated.View>
                </View>
                <Text style={isElderly ? styles.messageElderly : styles.statusText}>Processing...</Text>
                <Text style={isElderly ? styles.hintElderly : styles.hint}>
                  Transcribing your meal...
                </Text>
              </View>
            </>
          )}

          {/* ─────────────────────────────────────────── */}
          {/* TRANSCRIBED STATE (Standard mode only) */}
          {/* ─────────────────────────────────────────── */}
          {state === 'transcribed' && !isElderly && (
            <>
              <View style={headerStyle}>
                <Ionicons name="mic" size={ICON_SIZES.md} color={BRAND.primary} />
                <Text style={titleStyle}>Voice Logging</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Ionicons name="close" size={ICON_SIZES.md} color={TEXT.tertiary} />
                </TouchableOpacity>
              </View>

              <View style={contentStyle}>
                <Text style={styles.statusText}>Transcription</Text>

                {/* Audio Playback Controls */}
                {audioPlayback.audioUri && (
                  <View style={styles.playbackContainer}>
                    <TouchableOpacity
                      style={styles.playbackButton}
                      onPress={handlePlaybackToggle}
                    >
                      <Ionicons
                        name={audioPlayback.isPlaying ? 'pause' : 'play'}
                        size={ICON_SIZES.lg}
                        color={BRAND.primary}
                      />
                    </TouchableOpacity>

                    <View style={styles.progressBarContainer}>
                      <View
                        style={[
                          styles.progressBar,
                          { width: `${audioPlayback.progressPercent}%` }
                        ]}
                      />
                    </View>

                    <Text style={styles.playbackTime}>
                      {formatDuration(audioPlayback.playbackProgress * 1000)} / {formatDuration(audioPlayback.duration * 1000)}
                    </Text>
                  </View>
                )}

                {confidence !== null && (
                  <View style={styles.confidenceContainer}>
                    <Ionicons
                      name={confidence >= 0.8 ? 'checkmark-circle' : confidence >= 0.6 ? 'alert-circle' : 'warning'}
                      size={ICON_SIZES.sm}
                      color={getConfidenceColor(confidence)}
                    />
                    <Text style={[styles.confidenceText, { color: getConfidenceColor(confidence) }]}>
                      {getConfidenceLabel(confidence)} ({Math.round(confidence * 100)}%)
                    </Text>
                  </View>
                )}

                {isEditing ? (
                  <TextInput
                    style={styles.transcriptionInput}
                    value={transcription}
                    onChangeText={setTranscription}
                    multiline
                    autoFocus
                    placeholder="Refine transcription (optional)"
                  />
                ) : (
                  <View style={styles.transcriptionContainer}>
                    <Text style={styles.transcriptionText}>{transcription}</Text>
                  </View>
                )}

                <View style={styles.transcriptionActions}>
                  {isEditing ? (
                    <TouchableOpacity style={styles.secondaryButton} onPress={handleSaveEdit}>
                      <Ionicons name="checkmark" size={ICON_SIZES.md} color={BRAND.primary} />
                      <Text style={styles.secondaryButtonText}>Save</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      {/* Re-record Button */}
                      <TouchableOpacity style={styles.reRecordButton} onPress={handleRerecord}>
                        <Ionicons name="refresh" size={ICON_SIZES.md} color={TEXT.tertiary} />
                        <Text style={styles.reRecordButtonText}>Re-record</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.secondaryButton} onPress={handleEditTranscription}>
                        <Ionicons name="create-outline" size={ICON_SIZES.md} color={BRAND.primary} />
                        <Text style={styles.secondaryButtonText}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.primaryButton} onPress={handleConfirm}>
                        <LinearGradient
                          colors={SURFACES.gradient.primary}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.primaryButtonGradient}
                        >
                          <Ionicons name="checkmark-circle" size={ICON_SIZES.md} color={TEXT.white} />
                          <Text style={styles.primaryButtonText}>Confirm</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </>
          )}

          {/* ─────────────────────────────────────────── */}
          {/* ANALYZING STATE */}
          {/* ─────────────────────────────────────────── */}
          {state === 'analyzing' && (
            <>
              {isElderly && (
                <View style={headerStyle}>
                  <Text style={titleStyle}>Processing...</Text>
                </View>
              )}
              <View style={contentStyle}>
                <View style={styles.processingIndicator}>
                  <Animated.View style={{ transform: [{ rotate: spin }] }}>
                    <Ionicons name="nutrition" size={isElderly ? 80 : ICON_SIZES['4xl']} color={BRAND.primary} />
                  </Animated.View>
                </View>
                <Text style={isElderly ? styles.messageElderly : styles.statusText}>Analyzing Nutrition...</Text>
                <Text style={isElderly ? styles.hintElderly : styles.hint}>
                  Calculating calories, protein, carbs, and more...
                </Text>
              </View>
            </>
          )}

          {/* ─────────────────────────────────────────── */}
          {/* REVIEWING STATE — analyzed items, shown right here */}
          {/* ─────────────────────────────────────────── */}
          {state === 'reviewing' && reviewResult && (
            <>
              <View style={headerStyle}>
                <Ionicons name="mic" size={ICON_SIZES.md} color={BRAND.primary} />
                <Text style={titleStyle}>Voice Logging</Text>
                <TouchableOpacity onPress={handleDiscardReview} style={styles.closeButton} accessibilityLabel="Discard and close">
                  <Ionicons name="close" size={ICON_SIZES.md} color={TEXT.tertiary} />
                </TouchableOpacity>
              </View>

              <View style={styles.reviewContent}>
                <Text style={styles.statusText}>
                  Found {reviewResult.items.length} item{reviewResult.items.length === 1 ? '' : 's'}
                </Text>

                <ScrollView style={styles.reviewList} showsVerticalScrollIndicator={false}>
                  {reviewResult.items.map((item, idx) => (
                    <View key={item.itemId || idx} style={styles.reviewItemRow}>
                      <View style={styles.reviewItemCopy}>
                        <Text style={styles.reviewItemName} numberOfLines={1}>{item.name}</Text>
                        {!!(item.portion?.servingText || item.portion?.amount) && (
                          <Text style={styles.reviewItemPortion}>
                            {item.portion?.servingText || `${item.portion.amount} ${item.portion.unit || ''}`}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.reviewItemCalories}>
                        {Math.round(item.nutrition?.calories ?? item.macros?.calories_kcal ?? 0)} kcal
                      </Text>
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.reviewTotalsRow}>
                  {[
                    { label: 'Calories', value: Math.round(reviewResult.totals?.calories || 0), unit: '' },
                    { label: 'Protein', value: Math.round(reviewResult.totals?.protein || 0), unit: 'g' },
                    { label: 'Carbs', value: Math.round(reviewResult.totals?.carbs || 0), unit: 'g' },
                    { label: 'Fat', value: Math.round(reviewResult.totals?.fat || 0), unit: 'g' },
                  ].map((stat) => (
                    <View key={stat.label} style={styles.reviewTotalStat}>
                      <Text style={styles.reviewTotalValue}>{stat.value}{stat.unit}</Text>
                      <Text style={styles.reviewTotalLabel}>{stat.label}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.transcriptionActions}>
                  <TouchableOpacity
                    style={styles.reRecordButton}
                    onPress={handleDiscardReview}
                    disabled={isSavingResult}
                    accessibilityLabel="Discard this result"
                  >
                    <Ionicons name="trash-outline" size={ICON_SIZES.md} color={TEXT.tertiary} />
                    <Text style={styles.reRecordButtonText}>Discard</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleSaveReviewed}
                    disabled={isSavingResult}
                    accessibilityLabel="Save this meal to your log"
                  >
                    <LinearGradient
                      colors={SURFACES.gradient.primary}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.primaryButtonGradient}
                    >
                      {isSavingResult ? (
                        <ActivityIndicator size="small" color={TEXT.white} />
                      ) : (
                        <Ionicons name="checkmark-circle" size={ICON_SIZES.md} color={TEXT.white} />
                      )}
                      <Text style={styles.primaryButtonText}>{isSavingResult ? 'Saving…' : 'Save to Log'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* ─────────────────────────────────────────── */}
          {/* SUCCESS STATE */}
          {/* ─────────────────────────────────────────── */}
          {state === 'success' && (
            <>
              {isElderly && (
                <View style={headerStyle}>
                  <Text style={titleStyle}>Perfect!</Text>
                </View>
              )}
              <View style={contentStyle}>
                <View style={styles.successIndicator}>
                  <Ionicons name="checkmark-circle" size={isElderly ? 100 : ICON_SIZES['5xl']} color={SEMANTIC.success.base} />
                </View>
                <Text style={isElderly ? styles.messageElderly : styles.statusText}>
                  {isElderly ? 'Food logged successfully' : 'Success!'}
                </Text>
                {isElderly && transcription && (
                  <Text style={styles.transcriptionElderly}>&quot;{transcription}&quot;</Text>
                )}
                <Text style={isElderly ? styles.hintElderly : styles.hint}>
                  {isElderly ? 'Closing in a moment...' : 'Food log created successfully'}
                </Text>
              </View>
            </>
          )}

          {/* ─────────────────────────────────────────── */}
          {/* CONSENT STATE — transcription blocked, not broken */}
          {/* ─────────────────────────────────────────── */}
          {state === 'consent' && (
            <>
              <TouchableOpacity
                style={styles.errorCloseButton}
                onPress={handleClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Close voice logging"
              >
                <Ionicons name="close" size={ICON_SIZES.md} color={TEXT.tertiary} />
              </TouchableOpacity>

              <View style={contentStyle}>
                <View style={styles.consentIconWrap}>
                  <Ionicons name="mic" size={isElderly ? 56 : 32} color={BRAND.primary} />
                </View>

                <Text style={[isElderly ? styles.messageElderly : styles.statusText]}>
                  Turn on voice logging
                </Text>

                {/* One line, not a disclosure notice. Explaining that the device
                    lacks a recogniser and naming the processor made a routine
                    feature toggle read like a warning — users decline things
                    that sound like a warning. Detail lives behind "Learn more",
                    which is where informed consent needs it, not on the button. */}
                <Text style={isElderly ? styles.errorMessageElderly : styles.consentNote}>
                  Uses AI to turn speech into text. Your recordings are never used for training.
                </Text>

                <TouchableOpacity
                  style={isElderly ? styles.retryButtonElderly : styles.retryButton}
                  onPress={handleEnableAIConsent}
                  disabled={isEnablingConsent}
                  accessibilityRole="button"
                  accessibilityLabel={
                    pendingAnalyzeText
                      ? 'Enable AI and analyze this meal'
                      : pendingConsentUri
                        ? 'Enable AI transcription and transcribe this recording'
                        : 'Enable AI and start recording'
                  }
                >
                  <LinearGradient
                    colors={SURFACES.gradient.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.retryButtonGradient}
                  >
                    {isEnablingConsent ? (
                      <ActivityIndicator size="small" color={TEXT.white} />
                    ) : (
                      <Ionicons name="sparkles" size={ICON_SIZES.md} color={TEXT.white} />
                    )}
                    <Text style={styles.retryButtonText}>
                      {isEnablingConsent
                        ? 'Enabling…'
                        : pendingAnalyzeText
                          ? 'Enable & Analyze'
                          : pendingConsentUri
                            ? 'Enable & Transcribe'
                            : 'Enable & Record'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* For anyone who wants to read the full policy before deciding.
                    Closes the sheet first so navigation isn't trapped behind a modal. */}
                <TouchableOpacity
                  style={styles.consentLearnMore}
                  onPress={() => { handleClose(); router.push('/profile/privacy'); }}
                  accessibilityRole="link"
                  accessibilityLabel="Read more in Privacy and Data settings"
                >
                  <Text style={styles.consentLearnMoreText}>Learn more in Privacy &amp; Data</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ─────────────────────────────────────────── */}
          {/* ERROR STATE */}
          {/* ─────────────────────────────────────────── */}
          {state === 'error' && (
            <>
              {/* Dismiss. The error state previously offered only "Try Again",
                  so a failure the user could not resolve — an unavailable
                  recogniser, say — left them with no way out of the sheet
                  except retrying it. Routes through handleClose so audio
                  playback, the recording URI and analytics are all cleaned up
                  exactly as they are on a normal close. */}
              <TouchableOpacity
                style={styles.errorCloseButton}
                onPress={handleClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Close voice logging"
              >
                <Ionicons name="close" size={ICON_SIZES.md} color={TEXT.tertiary} />
              </TouchableOpacity>

              {isElderly && (
                <View style={headerStyle}>
                  <Text style={[titleStyle, { color: SEMANTIC.danger.base }]}>Oops!</Text>
                </View>
              )}
              <View style={contentStyle}>
                <View style={styles.errorIndicator}>
                  <Ionicons name="close-circle" size={isElderly ? 100 : ICON_SIZES['5xl']} color={SEMANTIC.danger.base} />
                </View>
                <Text style={[isElderly ? styles.messageElderly : styles.statusText, { color: SEMANTIC.danger.base }]}>
                  {isElderly ? '' : 'Error'}
                </Text>
                <Text style={isElderly ? styles.errorMessageElderly : styles.errorText}>
                  {displayError || 'Something went wrong'}
                </Text>

                <TouchableOpacity
                  style={isElderly ? styles.retryButtonElderly : styles.retryButton}
                  onPress={
                    isUnrecoverable ? handleClose
                    : isMicPermissionError ? () => Linking.openSettings()
                    : handleStart
                  }
                >
                  {isElderly ? (
                    <>
                      <Ionicons
                        name={isUnrecoverable ? 'create-outline' : isMicPermissionError ? 'settings' : 'refresh'}
                        size={40}
                        color={TEXT.white}
                      />
                      <Text style={styles.buttonTextElderly}>
                        {isUnrecoverable ? 'Use Text Instead' : isMicPermissionError ? 'Open Settings' : 'Try Again'}
                      </Text>
                    </>
                  ) : (
                    <LinearGradient
                      colors={SURFACES.gradient.primary}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.retryButtonGradient}
                    >
                      <Ionicons
                        name={isUnrecoverable ? 'create-outline' : isMicPermissionError ? 'settings-outline' : 'refresh'}
                        size={ICON_SIZES.md}
                        color={TEXT.white}
                      />
                      <Text style={styles.retryButtonText}>
                        {isUnrecoverable ? 'Use Text Instead' : isMicPermissionError ? 'Open Settings' : 'Try Again'}
                      </Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>

                {isElderly && (
                  <TouchableOpacity style={styles.secondaryButtonElderly} onPress={handleClose}>
                    <Ionicons name="close" size={40} color={SEMANTIC.danger.base} />
                    <Text style={styles.buttonTextElderly}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // ─────────────────────────────────────────────
  // OVERLAY & MODAL
  // ─────────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING[5],
  },
  modal: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS['2xl'],
    width: Math.min(SCREEN_WIDTH - 40, 400),
    maxHeight: '80%',
    overflow: 'hidden',
    ...SHADOWS.xl,
  },
  modalElderly: {
    backgroundColor: SURFACES.background.primary,
    borderRadius: RADIUS['2xl'],
    width: Math.min(SCREEN_WIDTH - 30, 500),
    maxHeight: '90%',
    overflow: 'hidden',
    ...SHADOWS.xl,
  },

  // ─────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING[5],
    borderBottomWidth: 1,
    borderBottomColor: `${SEMANTIC_ACTIONS.success}1A`,
    gap: SPACING[2],
  },
  headerElderly: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING[6],
    paddingVertical: SPACING[7],
    borderBottomWidth: 3,
    borderBottomColor: BRAND.primary,
    backgroundColor: SURFACES.background.secondary,
  },
  title: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    flex: 1,
    textAlign: 'center',
  },
  titleElderly: {
    fontSize: 32,
    fontWeight: 'bold',
    color: TEXT.primary,
    textAlign: 'center',
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    right: SPACING[5],
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: SURFACES.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonElderly: {
    position: 'absolute',
    right: SPACING[5],
    width: 60,
    height: 60,
    borderRadius: RADIUS.full,
    backgroundColor: SURFACES.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─────────────────────────────────────────────
  // CONTENT
  // ─────────────────────────────────────────────
  content: {
    padding: SPACING[6],
    alignItems: 'center',
    minHeight: 340,
    justifyContent: 'center',
  },
  contentElderly: {
    padding: SPACING[8],
    alignItems: 'center',
    minHeight: 450,
    justifyContent: 'center',
  },

  // ─────────────────────────────────────────────
  // IDLE STATE
  // ─────────────────────────────────────────────
  instruction: {
    fontSize: TYPOGRAPHY.size.md,
    color: TEXT.secondary,
    textAlign: 'center',
    marginBottom: SPACING[8],
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.size.md,
  },
  instructionElderly: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    textAlign: 'center',
    marginBottom: SPACING[8],
    lineHeight: 36,
  },
  largeIcon: {
    marginBottom: SPACING[8],
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: RADIUS.full,
    marginBottom: SPACING[6],
    ...SHADOWS.xl,
  },
  micButtonElderly: {
    width: 160,
    height: 160,
    borderRadius: RADIUS.full,
    marginVertical: SPACING[6],
    ...SHADOWS.xl,
  },
  micButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonGradientElderly: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: SPACING[4],
  },
  hintElderly: {
    fontSize: 18,
    color: TEXT.tertiary,
    textAlign: 'center',
    marginTop: SPACING[4],
  },
  exampleTextElderly: {
    fontSize: 18,
    color: TEXT.tertiary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: SPACING[6],
  },
  limitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    marginTop: SPACING[3],
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.md,
  },
  limitText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
  },

  // ─────────────────────────────────────────────
  // LISTENING STATE
  // ─────────────────────────────────────────────
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[6],
  },
  recordingStatusElderly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[8],
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
    backgroundColor: SEMANTIC.danger.base,
  },
  recordingDotElderly: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.full,
    backgroundColor: SEMANTIC.danger.base,
  },
  statusText: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  recordingTextElderly: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: SEMANTIC.danger.base,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    gap: 3,
    marginVertical: SPACING[6],
  },
  waveformContainerElderly: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    gap: 6,
    marginVertical: SPACING[8],
  },
  waveformBar: {
    width: 4,
    backgroundColor: BRAND.primary,
    borderRadius: RADIUS.sm,
  },
  waveformBarElderly: {
    width: 12,
    backgroundColor: BRAND.primary,
    borderRadius: RADIUS.sm,
  },
  durationText: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[6],
  },
  durationElderly: {
    fontSize: 48,
    fontWeight: 'bold',
    color: TEXT.primary,
    marginVertical: SPACING[6],
  },
  warningText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: SEMANTIC.danger.base,
    marginBottom: SPACING[4],
  },
  liveTranscriptContainer: {
    width: '100%',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING[4],
    minHeight: 44,
    justifyContent: 'center',
  },
  liveTranscriptContainerElderly: {
    width: '100%',
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[4],
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING[6],
    minHeight: 60,
    justifyContent: 'center',
  },
  liveTranscriptText: {
    fontSize: TYPOGRAPHY.size.md,
    color: TEXT.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  liveTranscriptTextElderly: {
    fontSize: 20,
    color: TEXT.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 28,
  },
  recordingActions: {
    flexDirection: 'row',
    gap: SPACING[4],
    alignItems: 'center',
  },
  buttonGroupElderly: {
    flexDirection: 'row',
    gap: SPACING[4],
    marginTop: SPACING[8],
    width: '100%',
  },
  cancelRecButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: SURFACES.background.tertiary,
  },
  cancelRecButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
  },
  stopButton: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    ...SHADOWS.lg,
  },
  stopButtonElderly: {
    flex: 1,
    paddingVertical: SPACING[5],
    paddingHorizontal: SPACING[4],
    backgroundColor: SEMANTIC.danger.base,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING[2],
    ...SHADOWS.lg,
  },
  stopButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonElderly: {
    flex: 1,
    paddingVertical: SPACING[5],
    paddingHorizontal: SPACING[4],
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING[2],
    borderWidth: 2,
    borderColor: TEXT.tertiary,
  },
  buttonTextElderly: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.white,
  },

  // ─────────────────────────────────────────────
  // PROCESSING STATE
  // ─────────────────────────────────────────────
  processingIndicator: {
    marginVertical: SPACING[6],
  },
  messageElderly: {
    fontSize: 28,
    fontWeight: 'bold',
    color: TEXT.primary,
    textAlign: 'center',
    marginBottom: SPACING[4],
  },

  // ─────────────────────────────────────────────
  // TRANSCRIBED STATE (Standard only)
  // ─────────────────────────────────────────────
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginVertical: SPACING[4],
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.md,
  },
  confidenceText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  // Playback controls
  playbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING[3],
    gap: SPACING[3],
  },
  playbackButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: SURFACES.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: BRAND.primary,
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: BRAND.primary,
    borderRadius: RADIUS.full,
  },
  playbackTime: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    minWidth: 70,
    textAlign: 'right',
  },
  reRecordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: SURFACES.background.tertiary,
  },
  reRecordButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
  },
  transcriptionContainer: {
    width: '100%',
    padding: SPACING[4],
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    marginVertical: SPACING[4],
    minHeight: 80,
  },
  transcriptionText: {
    fontSize: TYPOGRAPHY.size.md,
    color: TEXT.primary,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.size.md,
  },
  transcriptionInput: {
    width: '100%',
    padding: SPACING[4],
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    marginVertical: SPACING[4],
    minHeight: 80,
    fontSize: TYPOGRAPHY.size.md,
    color: TEXT.primary,
    borderWidth: 1,
    borderColor: BRAND.primary,
  },
  transcriptionActions: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginTop: SPACING[4],
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: SURFACES.background.tertiary,
    borderWidth: 1,
    borderColor: BRAND.primary,
  },
  secondaryButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },
  primaryButton: {
    flex: 1,
    borderRadius: RADIUS.lg,
    ...SHADOWS.md,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[5],
    borderRadius: RADIUS.lg,
  },
  primaryButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.white,
  },

  // ─────────────────────────────────────────────
  // REVIEWING STATE
  // ─────────────────────────────────────────────
  reviewContent: {
    width: '100%',
    padding: SPACING[6],
  },
  reviewList: {
    maxHeight: 220,
    width: '100%',
    marginTop: SPACING[4],
  },
  reviewItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.background.tertiary,
    gap: SPACING[3],
  },
  reviewItemCopy: {
    flex: 1,
  },
  reviewItemName: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  reviewItemPortion: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  reviewItemCalories: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },
  reviewTotalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING[4],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: SURFACES.background.tertiary,
  },
  reviewTotalStat: {
    alignItems: 'center',
    flex: 1,
  },
  reviewTotalValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  reviewTotalLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // ─────────────────────────────────────────────
  // SUCCESS STATE
  // ─────────────────────────────────────────────
  successIndicator: {
    marginVertical: SPACING[6],
  },
  transcriptionElderly: {
    fontSize: 20,
    color: TEXT.primary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: SPACING[6],
    paddingHorizontal: SPACING[4],
  },

  // ─────────────────────────────────────────────
  // ERROR STATE
  // ─────────────────────────────────────────────
  consentIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(107,78,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[3],
  },
  consentNote: {
    fontSize: TYPOGRAPHY.size.sm,
    lineHeight: 20,
    color: TEXT.secondary,
    textAlign: 'center',
    paddingHorizontal: SPACING[4],
    marginTop: SPACING[2],
    marginBottom: SPACING[4],
  },
  consentLearnMore: {
    marginTop: SPACING[3],
    paddingVertical: SPACING[2],
  },
  consentLearnMoreText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: BRAND.primary,
    textDecorationLine: 'underline',
  },

  errorCloseButton: {
    position: 'absolute',
    top: SPACING[3],
    right: SPACING[3],
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
    zIndex: 10,
  },
  errorIndicator: {
    marginVertical: SPACING[6],
  },
  errorText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: SEMANTIC.danger.base,
    textAlign: 'center',
    marginBottom: SPACING[6],
    marginTop: SPACING[3],
  },
  errorMessageElderly: {
    fontSize: 22,
    color: SEMANTIC.danger.base,
    textAlign: 'center',
    marginVertical: SPACING[6],
    lineHeight: 32,
  },
  retryButton: {
    borderRadius: RADIUS.lg,
    ...SHADOWS.md,
  },
  retryButtonElderly: {
    paddingVertical: SPACING[5],
    paddingHorizontal: SPACING[6],
    backgroundColor: SEMANTIC.success.base,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING[3],
    width: '100%',
    marginVertical: SPACING[4],
    ...SHADOWS.lg,
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[6],
    borderRadius: RADIUS.lg,
  },
  retryButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.white,
  },
});
