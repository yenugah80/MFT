import { useState, useCallback } from 'react';
import {
  useAudioRecorder,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
} from 'expo-audio';
import apiClient from '../services/apiClient';

/**
 * Hook for Backend Voice Transcription (OpenAI Whisper)
 * Records audio file -> Uploads to /transcribe -> Returns analysis
 * Migrated from expo-av to expo-audio
 */
export const useBackendVoice = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState(''); // Only available after processing
  const [error, setError] = useState(null);

  // Use the expo-audio recorder hook
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setTranscript('');

      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Microphone permission denied');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();

      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      setError('Could not start recording');
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    if (!recorder.isRecording) return null;

    try {
      await recorder.stop();
      const uri = recorder.uri;
      setIsRecording(false);

      if (!uri) {
        setError('No recording URI available');
        return null;
      }

      // Prepare FormData for upload
      const formData = new FormData();
      formData.append('audio', {
        uri: uri,
        type: 'audio/m4a', // Matches HIGH_QUALITY preset (.m4a)
        name: 'recording.m4a',
      });

      // Send to /transcribe endpoint
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
  }, [recorder]);

  const cancelRecording = useCallback(async () => {
    if (!recorder.isRecording) return;

    try {
      await recorder.stop();
    } catch (err) {
      console.warn('Error cancelling recording:', err);
    } finally {
      setIsRecording(false);
    }
  }, [recorder]);

  return { isRecording, transcript, error, startRecording, stopRecording, cancelRecording };
};