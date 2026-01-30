import { useState, useEffect, useCallback, useRef } from 'react';
import Voice from '@react-native-voice/voice';
import apiClient from '../services/apiClient';
import { useBackendVoice } from './useBackendVoice';
import { getSpeechLocale } from '../constants/languages';

/**
 * Hook for Instant On-Device Voice Transcription
 * Uses native speech recognition for zero-latency text feedback.
 * Sends final text to backend for nutrition analysis.
 */
export const useInstantVoice = (options = {}) => {
  const { voiceLanguage = 'en' } = options;
  const speechLocale = getSpeechLocale(voiceLanguage);
  const [isNativeRecording, setIsNativeRecording] = useState(false);
  const [nativeTranscript, setNativeTranscript] = useState('');
  const [nativeError, setNativeError] = useState(null);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const isRecordingRef = useRef(false); // Ref to track state inside listeners
  
  // Live Analysis State
  const lastProcessedText = useRef('');
  const cachedResult = useRef(null);
  const debounceTimer = useRef(null);
  const [liveItems, setLiveItems] = useState([]);
  const manualOverridesRef = useRef({});

  // Initialize fallback hook
  const backendVoice = useBackendVoice();

  useEffect(() => {
    // Setup Voice listeners
    Voice.onSpeechStart = () => setIsNativeRecording(true);
    Voice.onSpeechEnd = () => setIsNativeRecording(false);
    Voice.onSpeechError = (e) => {
      if (!isRecordingRef.current) return; // Ignore errors if we already stopped
      console.error('Voice Error:', e);
      setNativeError(e.error?.message || 'Speech recognition failed');
      setIsNativeRecording(false);
    };
    Voice.onSpeechResults = (e) => {
      if (!isRecordingRef.current) return; // Ignore results if stopped
      if (e.value && e.value[0]) {
        setNativeTranscript(e.value[0]);
        debouncedAnalyze(e.value[0]); // Trigger live analysis
      }
    };
    Voice.onSpeechPartialResults = (e) => {
      if (!isRecordingRef.current) return; // Ignore results if stopped
      if (e.value && e.value[0]) {
        setNativeTranscript(e.value[0]);
        debouncedAnalyze(e.value[0]); // Trigger live analysis
      }
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  // Debounced Analysis: Pre-fetch data while user speaks
  const debouncedAnalyze = useCallback((text) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      if (!text || text.length < 2 || text === lastProcessedText.current) return;
      
      try {
        // Silent background fetch
        const response = await apiClient.post('/voice/process', { text, isPartial: true });
        if (response.data?.success) {
          // Cache the result for when user hits Stop
          cachedResult.current = response.data.data;
          lastProcessedText.current = text;
          
          // Apply any manual overrides (e.g. user edited quantity)
          const items = (response.data.data || [])
            .map(item => {
              if (manualOverridesRef.current[item.name]) {
                return { ...item, ...manualOverridesRef.current[item.name] };
              }
              return item;
            })
            .filter(item => !item.deleted);
          
          setLiveItems(items);
          console.log('[InstantVoice] Pre-fetched results for:', text);
        }
      } catch (err) {
        // Ignore background errors
      }
    }, 600); // Wait 600ms after last word
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setNativeError(null);
      setNativeTranscript('');
      lastProcessedText.current = '';
      cachedResult.current = null;
      setLiveItems([]);
      setIsFallbackMode(false);
      manualOverridesRef.current = {}; // Reset overrides on new recording
      isRecordingRef.current = true;
      
      // Try starting native voice with configured language
      await Voice.start(speechLocale);
      console.log(`[useInstantVoice] Started voice recognition with locale: ${speechLocale}`);
    } catch (e) {
      console.warn('On-device voice failed, switching to backend fallback:', e);

      // Fallback to backend voice
      setIsFallbackMode(true);
      try {
        isRecordingRef.current = true;
        await backendVoice.startRecording();
      } catch (backendErr) {
        console.error('Fallback also failed:', backendErr);
        setNativeError('Could not start recording (both modes failed)');
      }
    }
  }, [backendVoice, speechLocale]);

  const stopRecording = useCallback(async () => {
    isRecordingRef.current = false;

    if (isFallbackMode) {
      // Handle fallback stop
      return await backendVoice.stopRecording();
    } else {
      // Handle native stop
      try {
        await Voice.stop();
        setIsNativeRecording(false);

        if (!nativeTranscript) return null;

        // INSTANT RETURN: If we already have the result for this text, return it immediately
        if (cachedResult.current && nativeTranscript === lastProcessedText.current) {
          console.log('[InstantVoice] Using cached result (Zero Latency)');
          return cachedResult.current;
        }

        // If we have overrides but no cached result (rare), we should apply them after final fetch
        // But typically cachedResult is populated.
        
        // Send TEXT to backend (Fast processing)
        const response = await apiClient.post('/voice/process', { text: nativeTranscript });
        
        if (response.data?.success) {
          // Apply overrides to final result
          return (response.data.data || [])
            .map(item => {
              if (manualOverridesRef.current[item.name]) {
                return { ...item, ...manualOverridesRef.current[item.name] };
              }
              return item;
            })
            .filter(item => !item.deleted);
        }
        return [];
      } catch (e) {
        console.error(e);
        setNativeError('Failed to process text');
        return null;
      }
    }
  }, [isFallbackMode, nativeTranscript, backendVoice]);

  const cancelRecording = useCallback(async () => {
    isRecordingRef.current = false;

    if (isFallbackMode) {
      await backendVoice.cancelRecording();
    } else {
      try {
        await Voice.cancel();
        setIsNativeRecording(false);
        setNativeTranscript('');
      } catch (e) {
        console.error(e);
      }
    }
  }, [isFallbackMode, backendVoice]);

  const updateItem = useCallback((item, updates) => {
    // Store override
    manualOverridesRef.current[item.name] = { 
      ...manualOverridesRef.current[item.name], 
      ...updates 
    };
    
    // Update current state immediately
    setLiveItems(prev => prev.map(i => {
      if (i.name === item.name) {
        return { ...i, ...updates };
      }
      return i;
    }));
  }, []);

  const removeItem = useCallback((item) => {
    // Store override as deleted
    manualOverridesRef.current[item.name] = { 
      ...manualOverridesRef.current[item.name], 
      deleted: true 
    };
    
    // Update current state immediately
    setLiveItems(prev => prev.filter(i => i.name !== item.name));
  }, []);

  return { 
    isRecording: isFallbackMode ? backendVoice.isRecording : isNativeRecording, 
    transcript: isFallbackMode ? backendVoice.transcript : nativeTranscript, 
    error: isFallbackMode ? backendVoice.error : nativeError, 
    liveItems: isFallbackMode ? [] : liveItems,
    updateItem,
    removeItem,
    startRecording, 
    stopRecording, 
    cancelRecording 
  };
};