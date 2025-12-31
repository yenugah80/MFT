import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Voice from '@react-native-voice/voice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../services/apiClient';

// Cache for recent transcription requests (in-memory + persisted)
const TRANSCRIPTION_CACHE_KEY = 'voice_transcription_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export const useServerVoice = (options = {}) => {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [liveItems, setLiveItems] = useState([]);
  const [processingState, setProcessingState] = useState({ step: 0, label: '' });

  // Refs for liveness and timer management
  const isActiveRef = useRef(false);
  const timersRef = useRef([]);

  // Request deduplication and caching
  const pendingRequestsRef = useRef(new Map()); // Prevent duplicate concurrent requests
  const inMemoryCacheRef = useRef(new Map()); // Fast in-memory cache
  const apiStartTimeRef = useRef(null); // Track real API timing

  // Cleanup on unmount
  useEffect(() => {
    // Setup Voice listeners
    Voice.onSpeechStart = () => setIsRecording(true);
    Voice.onSpeechEnd = () => setIsRecording(false);
    Voice.onSpeechError = (e) => {
      // Ignore "No speech detected" error (code 7) to avoid UI noise
      if (e.error?.message?.includes('7') || e.error?.code === '7') return;
      setError(e.error?.message);
      setIsRecording(false);
    };
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechResults;

    return () => {
      isActiveRef.current = false;
      timersRef.current.forEach(clearTimeout);
      if (parseDebounceTimerRef.current) {
        clearTimeout(parseDebounceTimerRef.current);
      }
      Voice.destroy().then(Voice.removeAllListeners);
    };
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
      setError(null);
      setTranscript('');
      setLiveItems([]);
      await Voice.start('en-US');
    } catch (err) {
      console.error(err);
      setError('Failed to start recording');
    }
  }, []);

  const stopAndUpload = useCallback(async () => {
    try {
      await Voice.stop();
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
      if (pendingRequestsRef.current.has(cacheKey)) {
        console.log('[VoiceLog] Duplicate request detected - waiting for existing request');
        setProcessingState({ step: 1, label: 'Waiting for duplicate request...' });
        const result = await pendingRequestsRef.current.get(cacheKey);
        if (isActiveRef.current) {
          return result;
        }
        return null;
      }

      // Create a promise for this request that other duplicates can wait on
      let resolveRequest, rejectRequest;
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
            mealType: options.mealType
          };

          const response = await apiClient.post('/voice/process', payload);

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
      rejectRequest(err);
      return null;
    } finally {
      // 3. Cleanup
      isActiveRef.current = false;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      pendingRequestsRef.current.delete(cacheKey); // Remove from pending queue
      setIsProcessing(false);
    }
  }, [transcript, options.mealType]);

  const cancelRecording = useCallback(async () => {
    // 1. Kill liveness to prevent any pending uploads from updating state
    isActiveRef.current = false;
    
    // 2. Clear fake progress timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    
    // 3. Stop recording if active
    try {
      await Voice.stop();
      await Voice.destroy();
    } catch (e) {}
    
    // 4. Reset state
    setIsRecording(false);
    setIsProcessing(false);
    setProcessingState({ step: 0, label: '' });
    setTranscript('');
    setLiveItems([]);
    setError(null);
  }, []);

  return {
    startRecording,
    stopAndUpload,
    cancelRecording,
    isRecording,
    isProcessing,
    transcript, // Exposed for UI
    liveItems,  // Exposed for UI Pills
    processingState,
    error
  };
};