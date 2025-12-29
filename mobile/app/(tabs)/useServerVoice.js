import { useState, useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import apiClient from '../../services/apiClient';

export const useServerVoice = (options = {}) => {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [processingState, setProcessingState] = useState({ step: 0, label: '' });
  
  // Refs for liveness and timer management
  const isActiveRef = useRef(false);
  const timersRef = useRef([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        setError('Permission denied');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setError('Failed to start recording');
    }
  }, []);

  const stopAndUpload = useCallback(async () => {
    if (!recording) return;

    setIsRecording(false);
    setIsProcessing(true);
    setError(null);
    
    // 1. Liveness Guard & Timer Setup
    isActiveRef.current = true;
    
    // Clear any stale timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    // Start Fake Progress (ONCE)
    setProcessingState({ step: 0, label: 'Uploading...' });
    const startTime = Date.now();
    
    const scheduleTimer = (ms, step, label) => {
      const id = setTimeout(() => {
        if (isActiveRef.current) {
          setProcessingState({ step, label });
        }
      }, ms);
      timersRef.current.push(id);
    };
    
    scheduleTimer(1500, 1, 'Transcribing speech...');
    scheduleTimer(3500, 2, 'Identifying foods...');
    scheduleTimer(5500, 3, 'Calculating nutrition...');

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      // 2. Dynamic Audio Format Handling
      const uriParts = uri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      
      const uploadWithRetry = async (fileUri, attempt = 1) => {
        // Guard: Stop if component unmounted or cancelled
        if (!isActiveRef.current) return null;

        try {
          const formData = new FormData();
          formData.append('file', {
            uri: fileUri,
            // Fix: Explicitly use audio/m4a or audio/mp4 for m4a files to ensure backend compatibility
            type: fileType === 'm4a' ? 'audio/mp4' : `audio/${fileType}`, 
            name: `voice_log.${fileType || 'm4a'}`,
          });
          
          // Send meal context if available
          if (options.mealType) formData.append('mealType', options.mealType);

          // Use standard apiClient instead of fragile XHR streaming
          const response = await apiClient.post('/log-voice', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            transformRequest: (data) => data,
          });
          
          // Return the full response body which contains { success: true, data: analysisResult, text: ... }
          return response; 
        } catch (e) {
          if (attempt <= 3 && isActiveRef.current) {
            // Update label to show retry status, but don't reset the progress timeline
            setProcessingState(prev => ({ 
              ...prev, 
              label: `Connection poor. Retrying (${attempt}/3)...` 
            }));
            await new Promise(r => setTimeout(r, 1000 * attempt));
            return uploadWithRetry(fileUri, attempt + 1);
          }
          throw e;
        }
      };

      const result = await uploadWithRetry(uri);
      
      if (isActiveRef.current) {
        console.log(`[VoiceLog] Completed in ${Date.now() - startTime}ms`);
        setRecording(null);
        return result;
      }
      return null;

    } catch (err) {
      if (isActiveRef.current) {
        console.error(err);
        setError('Failed to process audio after retries');
      }
      return null;
    } finally {
      // 3. Cleanup
      isActiveRef.current = false;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      setIsProcessing(false);

      // Polish: Reset audio mode to allow background audio (e.g. Spotify) to resume/mix properly
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
      } catch (e) {
        console.warn('[VoiceLog] Failed to reset audio mode', e);
      }
    }
  }, [recording]);

  const cancelRecording = useCallback(async () => {
    // 1. Kill liveness to prevent any pending uploads from updating state
    isActiveRef.current = false;
    
    // 2. Clear fake progress timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    
    // 3. Stop recording if active
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (e) {
        console.log('Error stopping recording on cancel', e);
      }
    }
    
    // 4. Reset state
    setRecording(null);
    setIsRecording(false);
    setIsProcessing(false);
    setProcessingState({ step: 0, label: '' });
    setError(null);
    
    // 5. Reset audio mode
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch (e) {}
  }, [recording]);

  return {
    startRecording,
    stopAndUpload,
    cancelRecording,
    isRecording,
    isProcessing,
    processingState, // Exposed for UI
    error
  };
};