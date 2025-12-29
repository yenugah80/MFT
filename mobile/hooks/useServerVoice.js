import { useState, useCallback, useRef, useEffect } from 'react';
import Voice from '@react-native-voice/voice';
import apiClient from '../services/apiClient';

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
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  // Handle live speech results
  const onSpeechResults = (e) => {
    if (e.value && e.value[0]) {
      const text = e.value[0];
      setTranscript(text);
      parseLiveItems(text);
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

    // Start Fake Progress (ONCE)
    // Adjusted steps since we skip upload/transcribe
    setProcessingState({ step: 0, label: 'Analyzing text...' });
    const startTime = Date.now();
    
    const scheduleTimer = (ms, step, label) => {
      const id = setTimeout(() => {
        if (isActiveRef.current) {
          setProcessingState({ step, label });
        }
      }, ms);
      timersRef.current.push(id);
    };
    
    // Faster timeline since we have text already
    scheduleTimer(1000, 1, 'Identifying foods...');
    scheduleTimer(2500, 2, 'Calculating nutrition...');

    try {
      const submitTextWithRetry = async (textToProcess, attempt = 1) => {
        if (!isActiveRef.current) return null;

        try {
          // Send text directly to backend process endpoint
          const payload = {
            text: textToProcess,
            isPartial: false,
            mealType: options.mealType
          };

          const response = await apiClient.post('/voice/process', payload);
          
          // Return the full response body which contains { success: true, data: analysisResult }
          return response.data; 
        } catch (e) {
          if (attempt <= 3 && isActiveRef.current) {
            setProcessingState(prev => ({ 
              ...prev, 
              label: `Connection poor. Retrying (${attempt}/3)...` 
            }));
            await new Promise(r => setTimeout(r, 1000 * attempt));
            return submitTextWithRetry(textToProcess, attempt + 1);
          }
          throw e;
        }
      };

      // Use the final transcript state
      if (!transcript) {
        if (isActiveRef.current) setError('No speech detected');
        return null;
      }

      const result = await submitTextWithRetry(transcript);
      
      if (isActiveRef.current) {
        console.log(`[VoiceLog] Completed in ${Date.now() - startTime}ms`);
        return result;
      }
      return null;

    } catch (err) {
      if (isActiveRef.current) {
        console.error(err);
        // Extract error message from response if available
        const msg = err.response?.data?.error || 'Failed to process audio';
        setError(msg);
      }
      return null;
    } finally {
      // 3. Cleanup
      isActiveRef.current = false;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
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