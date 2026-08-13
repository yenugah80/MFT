import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useAudioRecorder,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import apiClient from '../services/apiClient';
import { SPEECH_RECORDING_PRESET, MIN_RECORDING_MS } from '../constants/voiceRecording';
import { getSpeechLocale } from '../constants/languages';

// Stub Voice module for Expo Go compatibility
// Voice recognition requires a development build
let Voice = null;
try {
  Voice = require('@react-native-voice/voice').default;
} catch (e) {
  console.warn('[useServerVoice] Voice module not available (native module requires development build)');
}

/**
 * Turns a Voice.start() failure into something the user can act on.
 *
 * iOS surfaces genuinely different problems — permission denied, no recogniser
 * for the chosen locale, speech recognition restricted by the device — and they
 * need different responses from the user. Collapsing them all into "Failed to
 * start recording" left people with no idea whether to open Settings, change
 * language, or simply try again.
 */
/**
 * True once this device has proven it cannot do speech recognition.
 *
 * Capability cannot be queried up front: `Voice.isAvailable()` on iOS only
 * reports the *authorization* status, so it answers "yes" on a simulator whose
 * recogniser then fails to initialise. The only reliable signal is an actual
 * attempt, so we remember the outcome and let the UI stop offering voice.
 *
 * Module scope, not state: the answer is a property of the device, identical
 * for every hook instance and stable for the whole session.
 */
let _voiceUnsupported = false;

/** Failures that mean "this device will never do speech recognition". */
function isPermanentVoiceFailure(code, detail) {
  const text = String(detail || '').toLowerCase();
  return (
    String(code) === '300' ||
    text.includes('failed to initialize recognizer') ||
    text.includes('not supported') ||
    text.includes('restricted')
  );
}

function describeVoiceStartFailure(code, detail, locale) {
  const text = String(detail || '').toLowerCase();

  // kAFAssistantErrorDomain 300 — SFSpeechRecognizer could not be created.
  // In practice this means the device has no on-device speech model for the
  // locale, which is the permanent state of the iOS Simulator (it ships no
  // speech assets). Retrying cannot fix it, so don't imply that it can.
  if (String(code) === '300' || text.includes('failed to initialize recognizer')) {
    return "Speech recognition isn't available on this device. Use text or photo logging instead.";
  }

  if (code === 'permissions' || text.includes('permission') || text.includes('denied')) {
    return 'Microphone or speech access is off. Enable both in Settings to use voice logging.';
  }
  if (text.includes('not authorized') || text.includes('restricted')) {
    return 'Speech recognition is restricted on this device.';
  }
  // SFSpeechRecognizer returns nil for locales it has no model for.
  if (text.includes('locale') || text.includes('not supported') || text.includes('unavailable')) {
    return `Voice input isn't available for ${locale} on this device. Try switching the voice language.`;
  }
  if (text.includes('recognizer') || text.includes('unavailable')) {
    return 'Speech recognition is unavailable right now. Please try again in a moment.';
  }
  // Unknown: keep the underlying text visible rather than hiding it.
  return `Couldn't start voice recording${detail ? ` — ${detail}` : ''}. Try text or photo logging instead.`;
}

// Cache for recent transcription requests (in-memory + persisted)
const TRANSCRIPTION_CACHE_KEY = 'voice_transcription_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// apiClient's default budget is 10s, which is fine for ordinary CRUD but far too
// short for these two calls — and it applies to the whole round trip, not just
// the server's own work.
//
// /voice/transcribe has to upload the audio over a mobile connection, run it
// through OpenAI transcription, then usually make a second model call to
// identify the foods, then write to the database. /voice/process skips the
// upload but still makes the model call. Either can pass 10s on a slow network
// or a cold backend, at which point the client gave up on a request the server
// went on to complete successfully — the user saw a bare error after speaking a
// whole meal, on every device, while the backend logs showed nothing wrong.
//
// Timeouts are deliberately not retried (see isRetryableError in apiClient), so
// a longer budget cannot multiply into repeated model calls.
const TRANSCRIBE_TIMEOUT_MS = 60000;
const ANALYZE_TIMEOUT_MS = 30000;

export const useServerVoice = (options = {}) => {
  const { voiceLanguage = 'en' } = options;
  const speechLocale = getSpeechLocale(voiceLanguage);

  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [liveItems, setLiveItems] = useState([]);
  const [processingState, setProcessingState] = useState({ step: 0, label: '' });

  // Mirrors the module-level `_voiceUnsupported` into component state.
  // Mutating a module variable cannot trigger a re-render on its own, so
  // without this the UI would only notice the change if some *other* state
  // update happened to follow it — which is exactly the kind of implicit
  // coupling that breaks silently later.
  const [voiceUnsupported, setVoiceUnsupported] = useState(_voiceUnsupported);
  const markVoiceUnsupported = useCallback(() => {
    _voiceUnsupported = true;   // device-level, shared by every hook instance
    setVoiceUnsupported(true);  // instance-level, drives the re-render
  }, []);

  // Audio file recording for playback (parallel with live transcription)
  const [recordingUri, setRecordingUri] = useState(null);
  const audioRecorder = useAudioRecorder(SPEECH_RECORDING_PRESET);

  // Track volume for waveform visualization (simulated from speech activity)
  const [volume, setVolume] = useState(0);
  const [duration, setDuration] = useState(0);
  const durationIntervalRef = useRef(null);
  const volumeIntervalRef = useRef(null);

  // Refs for liveness and timer management
  const isActiveRef = useRef(false);
  const timersRef = useRef([]);

  // Request deduplication and caching
  const pendingRequestsRef = useRef(new Map()); // Prevent duplicate concurrent requests
  const inMemoryCacheRef = useRef(new Map()); // Fast in-memory cache
  const apiStartTimeRef = useRef(null); // Track real API timing

  // Cleanup on unmount
  useEffect(() => {
    // Setup Voice listeners (only if Voice module is available)
    attachVoiceListeners();

    return () => {
      isActiveRef.current = false;
      timersRef.current.forEach(clearTimeout);
      if (parseDebounceTimerRef.current) {
        clearTimeout(parseDebounceTimerRef.current);
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
      }
      if (Voice) {
        Voice.destroy().then(() => Voice.removeAllListeners());
      }
    };
    // attachVoiceListeners is a plain (unmemoized) function recreated every
    // render — intentionally omitted so this effect only runs once for this
    // hook instance's lifetime, matching its "mount setup / unmount teardown"
    // purpose. Adding it would re-run this on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce live items parsing (avoid regex on every partial result)
  const parseDebounceTimerRef = useRef(null);
  const lastParsedTextRef = useRef('');

  // Handle live speech results
  const onSpeechResults = (e) => {
    if (e.value && e.value[0]) {
      const text = e.value[0];
      setTranscript(text);

      // Debounce parsing to reduce regex overhead (only parse when text changes significantly)
      if (parseDebounceTimerRef.current) {
        clearTimeout(parseDebounceTimerRef.current);
      }

      parseDebounceTimerRef.current = setTimeout(() => {
        // Only parse if text actually changed (avoid duplicate parsing)
        if (text !== lastParsedTextRef.current) {
          lastParsedTextRef.current = text;
          parseLiveItems(text);
        }
      }, 300); // Debounce 300ms (waits for user to pause speaking briefly)
    }
  };

  // Wires up the Voice module's event handlers. Called on mount, and again
  // from cancelRecording after Voice.destroy() — destroy() tears down the
  // native recognizer session, and re-attaching immediately guarantees a
  // subsequent startRecording() in this same modal session (cancel, then try
  // again) keeps working, since this hook instance's mount effect only runs
  // once for the whole screen's lifetime (voiceHook is created once in the
  // parent and VoiceModal is kept mounted, only `visible` toggles).
  const attachVoiceListeners = () => {
    if (!Voice) return;
    Voice.onSpeechStart = () => setIsRecording(true);
    Voice.onSpeechEnd = () => setIsRecording(false);
    Voice.onSpeechError = (e) => {
      const rawMessage = e?.error?.message ?? '';
      // iOS reports "<code>/<description>", e.g. "300/Failed to initialize recognizer".
      const code = e?.error?.code ?? rawMessage.split('/')[0];

      // Ignore "no speech detected" (code 7) — it fires whenever a user pauses,
      // and surfacing it makes normal use look broken. Matched on the parsed
      // code rather than `message.includes('7')`, which also swallowed every
      // other error whose text happened to contain a 7 (1007, 700, …).
      if (String(code) === '7') return;

      const permanent = isPermanentVoiceFailure(code, rawMessage);
      if (permanent) markVoiceUnsupported();
      console.warn(`[useServerVoice] Speech error (code=${code}):`, rawMessage);

      // iOS delivers "300/Failed to initialize recognizer" through THIS callback
      // rather than as a throw from Voice.start(), so the equivalent guard in
      // start()'s catch never ran and the UI errored out while expo-audio was
      // still happily recording.
      //
      // The recogniser being unavailable is not a recording failure. Stay in the
      // recording state and let the user speak; stopRecording() finds an empty
      // on-device transcript and uploads the captured audio instead.
      if (permanent && audioRecorder.isRecording) {
        console.log('[useServerVoice] Recogniser unavailable mid-session; continuing to record for server transcription');
        setIsRecording(true);
        return;
      }

      // Same classifier as Voice.start failures, so a given cause reads
      // identically wherever it surfaces.
      setError(describeVoiceStartFailure(code, rawMessage, speechLocale));
      setIsRecording(false);
    };
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechResults;
  };

  // Simple client-side parser for immediate UI feedback (Pills)
  const parseLiveItems = (text) => {
    // Regex to find patterns like "2 eggs", "1.5 cups milk"
    const regex = /(\d+(?:\.\d+)?)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/g;
    const items = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Filter out common false positives if needed
      if (match[2].length > 2) {
        items.push({
          quantity: parseFloat(match[1]),
          name: match[2],
          unit: 'qty', // Placeholder unit for UI
          confidence: 0.9
        });
      }
    }
    setLiveItems(items);
  };

  const startRecording = useCallback(async () => {
    try {
      if (!Voice) {
        setError('Voice recording not available (requires development build)');
        return;
      }
      setError(null);
      setTranscript('');
      setLiveItems([]);
      setDuration(0);
      setVolume(0);
      setRecordingUri(null); // Clear previous recording URI

      // Start duration timer
      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setDuration(Date.now() - startTime);
      }, 100);

      // Simulate volume for waveform (based on speech activity)
      volumeIntervalRef.current = setInterval(() => {
        // Random volume simulation when recording
        setVolume(Math.random() * 0.5 + 0.3);
      }, 150);

      // Start audio file recording in parallel (for playback feature)
      try {
        const permission = await requestRecordingPermissionsAsync();
        if (permission.granted) {
          await setAudioModeAsync({
            allowsRecording: true,
            playsInSilentMode: true,
          });
          await audioRecorder.prepareToRecordAsync();
          audioRecorder.record();
          console.log('[useServerVoice] Audio file recording started');
        } else if (!permission.canAskAgain) {
          // Mic permission is a single OS-level grant shared by expo-audio's
          // recorder AND Voice's native speech recognizer — if expo-audio
          // reports it's permanently denied, Voice.start() below would fail
          // too (with a less specific error). Stop here with an actionable
          // message instead of a confusing native failure.
          console.warn('[useServerVoice] Microphone permission permanently denied');
          setError('Microphone access is disabled. Enable it in Settings to record.');
          if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
          if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
          return;
        }
      } catch (audioErr) {
        // Audio file recording is optional - continue with voice recognition
        console.warn('[useServerVoice] Audio file recording failed to start:', audioErr);
      }

      await Voice.start(speechLocale);
      console.log(`[useServerVoice] Started voice recognition with locale: ${speechLocale}`);
    } catch (err) {
      // The previous handler logged the raw error and showed a flat "Failed to
      // start recording", which made every distinct cause — a denied
      // permission, an unsupported locale, no recogniser on this device —
      // indistinguishable to both the user and anyone reading the logs.
      const code = err?.code ?? err?.error?.code;
      const detail = err?.message || err?.error?.message || String(err);
      console.error(
        `[useServerVoice] Voice.start failed (locale=${speechLocale}, code=${code ?? 'n/a'}):`,
        detail
      );

      const permanent = isPermanentVoiceFailure(code, detail);
      if (permanent) markVoiceUnsupported();

      // The recogniser failing does NOT mean recording failed. expo-audio is
      // already capturing to a file (started above, independently), and that
      // file is exactly what the server transcription path needs.
      //
      // So when the on-device recogniser is simply absent, keep recording and
      // let the user speak. stopRecording() finds an empty on-device transcript,
      // uploads the audio instead, and the user never learns that the fast path
      // was unavailable. Tearing the recorder down here — as this did before —
      // guaranteed there was nothing to fall back to.
      if (permanent && audioRecorder.isRecording) {
        console.log('[useServerVoice] Recogniser unavailable; continuing to record for server transcription');
        setIsRecording(true);
        return;
      }

      setError(describeVoiceStartFailure(code, detail, speechLocale));
      // Clean up intervals on error
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
      // Stop audio recording if it was started
      if (audioRecorder.isRecording) {
        try { await audioRecorder.stop(); } catch {}
      }
    }
  }, [audioRecorder, speechLocale]);

  /**
   * stopRecording - Step 1 of two-step flow
   * Stops recording and returns transcript with confidence
   * Does NOT analyze nutrition - use analyzeTranscript for that
   */
  /**
   * Uploads a finished recording to the server for transcription.
   *
   * The endpoint transcribes AND identifies foods in a single request, so this
   * returns both — the caller does not need a second analysis round trip.
   *
   * Never throws: every failure resolves to a shape the caller can branch on,
   * because this runs on the path where something has *already* gone wrong and
   * a second error would just replace one dead end with another.
   */
  const transcribeViaServer = useCallback(async (uri) => {
    if (!uri) return null;

    try {
      const durationMs = (audioRecorder.currentTime ?? 0) * 1000;
      if (durationMs && durationMs < MIN_RECORDING_MS) {
        console.log(`[useServerVoice] Skipping server transcription: ${Math.round(durationMs)}ms is below ${MIN_RECORDING_MS}ms`);
        return null;
      }

      console.log('[useServerVoice] On-device transcript empty — falling back to server transcription');
      setIsProcessing(true);

      const formData = new FormData();
      formData.append('audio', { uri, type: 'audio/m4a', name: 'recording.m4a' });
      formData.append('language', voiceLanguage);
      formData.append('mealType', options.mealType || 'general');

      // upload(), not post() — post() JSON.stringifies the body, which turns
      // FormData into "{}" and silently drops the audio.
      const response = await apiClient.upload('/voice/transcribe', formData, {
        _timeout: TRANSCRIBE_TIMEOUT_MS,
      });

      // response.data is the unifiedResponse object ({ items, totals, ... }),
      // not an item array — `items: response?.data` previously stored the
      // whole object under that name, which meant nothing downstream could
      // actually use it (an object isn't a usable "items" list), silently
      // forcing a second, redundant analysis call for every server-fallback
      // transcription despite this endpoint already returning analysed items.
      return {
        transcript: response?.text || '',
        items: response?.data?.items || [],
        totals: response?.data?.totals || {},
      };
    } catch (err) {
      const body = err?.response?.data;

      if (body?.code === 'openai_consent_required') {
        console.log('[useServerVoice] Server transcription blocked pending AI consent');
        return {
          needsConsent: true,
          error: body.error || 'Voice transcription needs your AI consent. Enable it in Privacy & Data.',
        };
      }

      console.error('[useServerVoice] Server transcription failed:', err?.message);
      // Distinguishable from returning null for "nothing to send" (no uri,
      // recording too short) — without this, stopRecording's caller couldn't
      // tell a genuine network/server failure apart from silence, and told
      // the user "No speech detected" for a problem retrying speech clearer
      // cannot fix.
      return {
        serverError: true,
        error: 'Could not reach the transcription service. Please check your connection and try again.',
      };
    } finally {
      setIsProcessing(false);
    }
  }, [audioRecorder, voiceLanguage, options.mealType]);

  const stopRecording = useCallback(async () => {
    // Stop intervals
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
    setVolume(0);

    try {
      if (Voice) {
        await Voice.stop();
      }
    } catch (e) {
      console.warn('[useServerVoice] Voice.stop error:', e);
    }

    // Stop audio file recording and capture URI for playback
    let capturedUri = null;
    if (audioRecorder.isRecording) {
      try {
        await audioRecorder.stop();
        capturedUri = audioRecorder.uri;
        if (capturedUri) {
          setRecordingUri(capturedUri);
          console.log('[useServerVoice] Audio file saved:', capturedUri);
        }
      } catch (audioErr) {
        console.warn('[useServerVoice] Audio file recording stop failed:', audioErr);
      }
    }

    setIsRecording(false);

    // Return transcript with confidence for VoiceModal to display
    const finalTranscript = transcript || '';

    // On-device produced nothing — either the recogniser never initialised on
    // this device, or it heard nothing it could decode. Before giving up, send
    // the audio we captured in parallel to the server for transcription.
    //
    // This is what makes voice work on hardware the on-device recogniser cannot
    // serve (simulators, unsupported locales, restricted devices): the model is
    // device-independent. It runs only when the free path has already failed, so
    // the common case still costs nothing.
    if (!finalTranscript.trim() && capturedUri) {
      const remote = await transcribeViaServer(capturedUri);

      if (remote?.transcript?.trim()) {
        setTranscript(remote.transcript);
        return {
          transcript: remote.transcript,
          confidence: 0.9, // server transcription is materially more accurate
          recordingUri: capturedUri,
          isEmpty: false,
          source: 'server',
          // The endpoint returns analysed foods alongside the text, so the
          // caller can skip the separate analysis round trip entirely.
          items: remote.items,
          totals: remote.totals,
        };
      }

      if (remote?.needsConsent) {
        setError(remote.error);
        return { transcript: '', confidence: 0, recordingUri: capturedUri, isEmpty: true, needsConsent: true };
      }

      if (remote?.serverError) {
        setError(remote.error);
        return { transcript: '', confidence: 0, recordingUri: capturedUri, isEmpty: true };
      }
    }

    // Handle empty transcript case
    if (!finalTranscript.trim()) {
      setError('No speech detected. Please try again.');
      return {
        transcript: '',
        confidence: 0,
        recordingUri: capturedUri,
        isEmpty: true,
      };
    }

    // Calculate confidence based on transcript quality
    const wordCount = finalTranscript.trim().split(/\s+/).length;
    const confidence = wordCount > 3 ? 0.9 : wordCount > 1 ? 0.75 : 0.6;

    return {
      transcript: finalTranscript,
      confidence,
      recordingUri: capturedUri,
      isEmpty: false,
    };
  }, [transcript, audioRecorder, transcribeViaServer]);

  /**
   * analyzeTranscript - Step 2 of two-step flow
   * Sends transcript to backend for nutrition analysis
   * @param {string} text - The transcript to analyze
   * @returns {object} - Nutrition analysis result
   */
  const analyzeTranscript = useCallback(async (text) => {
    if (!text || !text.trim()) {
      setError('No text to analyze');
      return null;
    }

    setIsProcessing(true);
    setError(null);
    isActiveRef.current = true;

    try {
      setProcessingState({ step: 1, label: 'Analyzing nutrition...' });

      const payload = {
        text: text.trim(),
        isPartial: false,
        mealType: options.mealType,
        language: voiceLanguage, // Pass language for multi-language nutrition analysis
      };

      const response = await apiClient.post('/voice/process', payload, { _timeout: ANALYZE_TIMEOUT_MS });

      if (!isActiveRef.current) return null;

      setProcessingState({ step: 2, label: 'Complete!' });

      // Backend returns: { success: true, data: { items: [...], totals: {...} } }
      // The analysisResult is nested inside response.data.data
      const analysisData = response.data?.data || response.data;

      console.log('[useServerVoice] API response items count:', analysisData?.items?.length);

      // Return the nutrition result with correct nesting
      return {
        transcription: text,
        nutrition: response.data,
        items: analysisData?.items || [],
        totals: analysisData?.totals || {},
        // True when zero items came back specifically because AI was
        // available but skipped for lack of consent, not because AI (or
        // local matching) genuinely found nothing — see VoiceModal's
        // zero-items handling for why that distinction matters.
        aiSkippedForConsent: response.data?.aiSkippedForConsent === true,
      };
    } catch (err) {
      console.error('[useServerVoice] Analysis error:', err);
      let msg = 'Failed to analyze nutrition';

      // Provide specific error messages based on status
      if (err.response?.data?.code === 'openai_consent_required') {
        msg = err.response.data.error || 'AI analysis needs your consent. Enable it in Privacy & Data.';
        if (isActiveRef.current) {
          setError(msg);
        }
        // Truthy and distinguishable from other failures (which return null),
        // so the caller can route to the consent screen instead of a dead-end
        // error with no path forward.
        return { needsConsent: true, error: msg };
      } else if (err.response?.status === 404) {
        msg = 'Voice analysis service unavailable. Please try again later.';
      } else if (err.response?.status === 401) {
        msg = 'Session expired. Please sign in again.';
      } else if (err.response?.status >= 500) {
        msg = 'Server error. Please try again later.';
      } else if (err.response?.data?.error) {
        msg = err.response.data.error;
      }

      if (isActiveRef.current) {
        setError(msg);
      }
      return null;
    } finally {
      isActiveRef.current = false;
      setIsProcessing(false);
    }
  }, [options.mealType, voiceLanguage]);

  /**
   * clearError - Clears the error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Legacy: stopAndUpload for backwards compatibility (combines both steps)
  const stopAndUpload = useCallback(async () => {
    // Stop intervals
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
    setVolume(0);

    try {
      if (Voice) {
        await Voice.stop();
      }
    } catch (e) {}

    setIsRecording(false);
    setIsProcessing(true);
    setError(null);

    // 1. Liveness Guard & Timer Setup
    isActiveRef.current = true;

    // Clear any stale timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    setProcessingState({ step: 0, label: 'Analyzing text...' });
    const startTime = Date.now();

    // Use the final transcript state
    if (!transcript) {
      if (isActiveRef.current) setError('No speech detected');
      return null;
    }

    // Generate normalized cache key (lowercase, no extra spaces)
    const cacheKey = transcript.toLowerCase().trim();

    // Declared here (not inside the try block below) so both are still in
    // scope in the catch block — try{} and catch{} are separate block
    // scopes, a `let` declared inside try is invisible inside catch. Was
    // previously declared at the old line 425 inside the try, which meant
    // rejectRequest(err) in the catch block threw its own ReferenceError on
    // any real failure — masking the original error and leaving the pending
    // request promise other concurrent callers await on unresolved forever.
    let resolveRequest, rejectRequest;

    try {
      // OPTIMIZATION 1: Check in-memory cache first (instant)
      if (inMemoryCacheRef.current.has(cacheKey)) {
        const cached = inMemoryCacheRef.current.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
          console.log('[VoiceLog] Cache hit - using cached result');
          // Show progress quickly since we have cached result
          setProcessingState({ step: 1, label: 'Using cached result...' });
          await new Promise(r => setTimeout(r, 200)); // Brief UI feedback
          if (isActiveRef.current) {
            return cached.result;
          }
          return null;
        }
      }

      // OPTIMIZATION 2: Check for pending identical request (deduplication)
      // Use single .get() call for atomic check-and-retrieve (cleaner than has+get)
      const existingRequest = pendingRequestsRef.current.get(cacheKey);
      if (existingRequest) {
        console.log('[VoiceLog] Duplicate request detected - waiting for existing request');
        setProcessingState({ step: 1, label: 'Waiting for duplicate request...' });
        try {
          const result = await existingRequest;
          if (isActiveRef.current) {
            return result;
          }
          return null;
        } catch (pendingErr) {
          // The original request failed - let this duplicate also fail gracefully
          console.warn('[VoiceLog] Original request failed, duplicate also failing:', pendingErr.message);
          if (isActiveRef.current) {
            setError(pendingErr.response?.data?.error || 'Failed to process audio');
          }
          return null;
        }
      }

      // Create a promise for THIS request that other duplicates can wait on
      // IMPORTANT: Only create AFTER checking cache and duplicates
      // (resolveRequest/rejectRequest declared above the try block)
      const requestPromise = new Promise((resolve, reject) => {
        resolveRequest = resolve;
        rejectRequest = reject;
      });
      pendingRequestsRef.current.set(cacheKey, requestPromise);

      const submitTextWithRetry = async (textToProcess, attempt = 1) => {
        if (!isActiveRef.current) return null;

        try {
          // Track real API timing
          apiStartTimeRef.current = Date.now();
          setProcessingState({ step: 1, label: 'Identifying foods...' });

          // Send text directly to backend process endpoint
          const payload = {
            text: textToProcess,
            isPartial: false,
            mealType: options.mealType,
            language: voiceLanguage, // Pass language for multi-language nutrition analysis
          };

          const response = await apiClient.post('/voice/process', payload, { _timeout: ANALYZE_TIMEOUT_MS });

          // OPTIMIZATION 3: Calculate real progress based on actual API timing
          const apiDuration = Date.now() - apiStartTimeRef.current;
          console.log(`[VoiceLog] API call took ${apiDuration}ms`);

          // Show next progress step
          if (isActiveRef.current) {
            setProcessingState({ step: 2, label: 'Calculating nutrition...' });
          }

          // Return the full response body which contains { success: true, data: analysisResult }
          return response.data;
        } catch (e) {
          if (attempt <= 3 && isActiveRef.current) {
            const retryDelay = 1000 * attempt;
            setProcessingState(prev => ({
              ...prev,
              label: `Connection poor. Retrying (${attempt}/3) in ${retryDelay}ms...`
            }));
            await new Promise(r => setTimeout(r, retryDelay));
            return submitTextWithRetry(textToProcess, attempt + 1);
          }
          throw e;
        }
      };

      const result = await submitTextWithRetry(transcript);

      // OPTIMIZATION 4: Cache the successful result
      if (result && isActiveRef.current) {
        inMemoryCacheRef.current.set(cacheKey, {
          result,
          timestamp: Date.now()
        });

        // Limit cache size to prevent memory bloat
        if (inMemoryCacheRef.current.size > 50) {
          const firstKey = inMemoryCacheRef.current.keys().next().value;
          inMemoryCacheRef.current.delete(firstKey);
        }

        console.log(`[VoiceLog] Completed in ${Date.now() - startTime}ms (from API)`);
        resolveRequest(result);
        return result;
      }

      resolveRequest(null);
      return null;

    } catch (err) {
      if (isActiveRef.current) {
        console.error('[VoiceLog] Error:', err);
        // Extract error message from response if available
        const msg = err.response?.data?.error || 'Failed to process audio';
        setError(msg);
      }
      if (rejectRequest) {
        rejectRequest(err);
      }
      return null;
    } finally {
      // 3. Cleanup
      isActiveRef.current = false;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      pendingRequestsRef.current.delete(cacheKey); // Remove from pending queue
      setIsProcessing(false);
    }
  }, [transcript, options.mealType, voiceLanguage]);

  const cancelRecording = useCallback(async () => {
    // 1. Kill liveness to prevent any pending uploads from updating state
    isActiveRef.current = false;

    // 2. Clear all timers and intervals
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }

    // 3. Stop recording if active
    if (Voice) {
      try {
        await Voice.stop();
        await Voice.destroy();
        // Re-attach listeners immediately — see attachVoiceListeners' comment.
        attachVoiceListeners();
      } catch (e) {}
    }

    // 3b. Stop audio file recording if active
    if (audioRecorder.isRecording) {
      try {
        await audioRecorder.stop();
      } catch (e) {}
    }

    // 4. Reset state
    setIsRecording(false);
    setIsProcessing(false);
    setProcessingState({ step: 0, label: '' });
    setTranscript('');
    setLiveItems([]);
    setError(null);
    setVolume(0);
    setDuration(0);
    setRecordingUri(null);
    // attachVoiceListeners is a plain (unmemoized) function recreated every
    // render — including it here would make cancelRecording itself unstable
    // across renders, cascading instability into every consumer that depends
    // on it (VoiceModal's handleCancel, etc.).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioRecorder]);

  /**
   * clearRecordingUri - Clears the recording URI (for cleanup after playback)
   */
  const clearRecordingUri = useCallback(() => {
    setRecordingUri(null);
  }, []);

  return {
    // Two-step flow (for VoiceModal)
    startRecording,
    stopRecording,      // Step 1: Stop and return transcript
    analyzeTranscript,  // Step 2: Analyze nutrition
    cancelRecording,
    clearError,
    clearRecordingUri,  // Cleanup recording URI after playback

    // Legacy (one-step flow)
    stopAndUpload,

    // State
    isRecording,
    isProcessing,
    volume,             // For waveform visualization
    duration,           // Recording duration in ms
    transcript,         // Live transcript for UI
    liveItems,          // Live parsed items for UI Pills
    processingState,
    error,
    recordingUri,       // Audio file URI for playback

    // True once this device has proven it cannot do speech recognition (see
    // _voiceUnsupported). Lets the UI stop offering a control that can only
    // fail, instead of showing a mic that errors on every tap.
    isVoiceUnsupported: voiceUnsupported || _voiceUnsupported,

    // No native module at all (Expo Go, or a build predating the package).
    isVoiceModuleMissing: !Voice,

    // Exposed so the modal can re-run transcription after the user grants
    // consent, reusing the audio it already captured.
    transcribeRecording: transcribeViaServer,
  };
};