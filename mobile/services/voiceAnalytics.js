/**
 * Voice Analytics Service
 * Centralized tracking for all voice-related events
 *
 * Features:
 * - Session tracking across recording lifecycle
 * - Privacy-conscious (no transcript content logged)
 * - Metrics: duration, confidence, edit rate, success rate
 */

import { trackEvent, Events } from './analytics';

// Current voice recording session
let currentVoiceSession = null;

/**
 * Start a new voice recording session
 * @param {string} mode - 'standard' or 'elderly'
 * @param {string} mealType - breakfast/lunch/dinner/snack
 * @returns {string} Session ID
 */
export const trackVoiceRecordingStarted = (mode = 'standard', mealType = 'unknown') => {
  currentVoiceSession = {
    sessionId: `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    startTime: Date.now(),
    mode,
    mealType,
  };

  trackEvent(Events.VOICE_RECORDING_STARTED, {
    voice_session_id: currentVoiceSession.sessionId,
    mode,
    meal_type: mealType,
  });

  return currentVoiceSession.sessionId;
};

/**
 * Track recording completion
 * @param {number} durationMs - Recording duration in milliseconds
 */
export const trackVoiceRecordingCompleted = (durationMs) => {
  if (!currentVoiceSession) return;

  trackEvent(Events.VOICE_RECORDING_COMPLETED, {
    voice_session_id: currentVoiceSession.sessionId,
    duration_ms: durationMs,
    duration_seconds: Math.round(durationMs / 1000),
  });
};

/**
 * Track recording cancellation
 * @param {number} durationMs - How long user recorded before cancelling
 * @param {string} reason - 'user_cancelled' | 'timeout' | 'error'
 */
export const trackVoiceRecordingCancelled = (durationMs, reason = 'user_cancelled') => {
  trackEvent(Events.VOICE_RECORDING_CANCELLED, {
    voice_session_id: currentVoiceSession?.sessionId,
    duration_ms: durationMs,
    reason,
  });

  currentVoiceSession = null;
};

/**
 * Track transcription received
 * @param {string} transcript - The transcribed text (content not logged for privacy)
 * @param {number} confidence - Confidence score (0-1)
 * @param {number} latencyMs - Time from stop to transcription
 */
export const trackVoiceTranscriptionReceived = (transcript, confidence, latencyMs) => {
  if (!currentVoiceSession) return;

  // Store original transcript for edit comparison (not sent to analytics)
  currentVoiceSession.originalTranscript = transcript;
  currentVoiceSession.transcriptionTime = Date.now();

  trackEvent(Events.VOICE_TRANSCRIPTION_RECEIVED, {
    voice_session_id: currentVoiceSession.sessionId,
    transcript_length: transcript?.length || 0,
    word_count: transcript?.split(/\s+/).filter(Boolean).length || 0,
    confidence_score: confidence,
    latency_ms: latencyMs,
    // Privacy: Don't log actual transcript content
  });
};

/**
 * Track when user edits the transcription
 * @param {string} originalTranscript - Original transcription
 * @param {string} editedTranscript - Edited transcription
 */
export const trackVoiceTranscriptionEdited = (originalTranscript, editedTranscript) => {
  if (!currentVoiceSession) return;

  // Calculate edit metrics without logging actual content
  const originalWords = originalTranscript?.split(/\s+/).filter(Boolean) || [];
  const editedWords = editedTranscript?.split(/\s+/).filter(Boolean) || [];

  trackEvent(Events.VOICE_TRANSCRIPTION_EDITED, {
    voice_session_id: currentVoiceSession.sessionId,
    original_word_count: originalWords.length,
    edited_word_count: editedWords.length,
    word_count_change: editedWords.length - originalWords.length,
    original_length: originalTranscript?.length || 0,
    edited_length: editedTranscript?.length || 0,
  });
};

/**
 * Track analysis started
 */
export const trackVoiceAnalysisStarted = () => {
  if (!currentVoiceSession) return;

  currentVoiceSession.analysisStartTime = Date.now();

  trackEvent(Events.VOICE_ANALYSIS_STARTED, {
    voice_session_id: currentVoiceSession.sessionId,
  });
};

/**
 * Track analysis completed
 * @param {number} itemCount - Number of food items detected
 * @param {number} totalCalories - Total calories in the analysis
 */
export const trackVoiceAnalysisCompleted = (itemCount, totalCalories) => {
  if (!currentVoiceSession) return;

  const analysisLatency = currentVoiceSession.analysisStartTime
    ? Date.now() - currentVoiceSession.analysisStartTime
    : null;

  const totalDuration = Date.now() - currentVoiceSession.startTime;

  trackEvent(Events.VOICE_ANALYSIS_COMPLETED, {
    voice_session_id: currentVoiceSession.sessionId,
    item_count: itemCount,
    total_calories: totalCalories,
    analysis_latency_ms: analysisLatency,
    total_duration_ms: totalDuration,
    mode: currentVoiceSession.mode,
    meal_type: currentVoiceSession.mealType,
  });

  // Also track the existing FOOD_LOGGED_VOICE for backwards compatibility
  trackEvent(Events.FOOD_LOGGED_VOICE, {
    voice_session_id: currentVoiceSession.sessionId,
    item_count: itemCount,
  });

  currentVoiceSession = null;
};

/**
 * Track analysis failure
 * @param {string} errorType - Type of error
 * @param {string} errorMessage - Error message (sanitized)
 */
export const trackVoiceAnalysisFailed = (errorType, errorMessage) => {
  trackEvent(Events.VOICE_ANALYSIS_FAILED, {
    voice_session_id: currentVoiceSession?.sessionId,
    error_type: errorType,
    // Sanitize error message to avoid PII (max 100 chars)
    error_message: errorMessage?.substring(0, 100),
    mode: currentVoiceSession?.mode,
  });

  currentVoiceSession = null;
};

/**
 * Track audio playback started
 */
export const trackVoicePlaybackStarted = () => {
  trackEvent(Events.VOICE_PLAYBACK_STARTED, {
    voice_session_id: currentVoiceSession?.sessionId,
  });
};

/**
 * Track re-recording
 * @returns {string|null} New session ID if session was active
 */
export const trackVoiceRerecord = () => {
  const prevMode = currentVoiceSession?.mode;
  const prevMealType = currentVoiceSession?.mealType;

  trackEvent(Events.VOICE_RERECORD, {
    voice_session_id: currentVoiceSession?.sessionId,
  });

  // Start new session if we had an active one
  if (prevMode) {
    return trackVoiceRecordingStarted(prevMode, prevMealType);
  }

  return null;
};

/**
 * Get current voice session info (for debugging)
 * @returns {object|null} Current session or null
 */
export const getVoiceSessionInfo = () => currentVoiceSession;

/**
 * Track session abandoned (user closes modal without completing)
 * Different from cancelled - abandoned means they left mid-flow
 * @param {string} lastState - The state when user abandoned ('recording', 'transcribed', 'analyzing')
 */
export const trackVoiceSessionAbandoned = (lastState) => {
  if (!currentVoiceSession) return;

  const sessionDuration = Date.now() - currentVoiceSession.startTime;

  trackEvent(Events.VOICE_SESSION_ABANDONED, {
    voice_session_id: currentVoiceSession.sessionId,
    last_state: lastState,
    session_duration_ms: sessionDuration,
    mode: currentVoiceSession.mode,
    had_transcription: !!currentVoiceSession.originalTranscript,
  });

  currentVoiceSession = null;
};

/**
 * Clear session without tracking (for cleanup on close)
 */
export const clearVoiceSession = () => {
  currentVoiceSession = null;
};

export default {
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
  getVoiceSessionInfo,
  clearVoiceSession,
};
