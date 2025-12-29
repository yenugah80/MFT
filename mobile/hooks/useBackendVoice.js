import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import apiClient from '../services/apiClient';

/**
 * Hook for Backend Voice Transcription (OpenAI Whisper)
 * Records audio file -> Uploads to /transcribe -> Returns analysis
 */
export const useBackendVoice = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState(''); // Only available after processing
  const [error, setError] = useState(null);
  const recordingRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setTranscript('');
      
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        setError('Microphone permission denied');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      setError('Could not start recording');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return null;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      setIsRecording(false);
      recordingRef.current = null;

      // Prepare FormData for upload
      const formData = new FormData();
      formData.append('audio', {
        uri: uri,
        type: 'audio/m4a', // Ensure this matches your recording preset
        name: 'recording.m4a',
      });

      // Send to new /transcribe endpoint
      // NOTE: We let the browser/client set the Content-Type header to include boundary
      const response = await apiClient.post('/voice/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: (data, headers) => {
          // Hack: Remove Content-Type so axios/fetch lets the browser generate the boundary
          delete headers['Content-Type'];
          return data;
        },
      });

      if (response.data?.text) setTranscript(response.data.text);
      return response.data?.data || [];

    } catch (err) {
      console.error('Transcription failed', err);
      setError(err.response?.data?.error || 'Audio processing failed');
      return null;
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.stopAndUnloadAsync();
    } catch (err) {
      console.warn('Error cancelling recording:', err);
    } finally {
      setIsRecording(false);
      recordingRef.current = null;
    }
  }, []);

  return { isRecording, transcript, error, startRecording, stopRecording, cancelRecording };
};