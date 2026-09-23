import { useState, useCallback } from 'react';
import {
  useAudioRecorder,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import apiClient from '../services/apiClient';
import { SPEECH_RECORDING_PRESET, MIN_RECORDING_MS } from '../constants/voiceRecording';

/**
 * Hook for Backend Voice Transcription (OpenAI Whisper)
 * Records audio file -> Uploads to /transcribe -> Returns analysis
 * Migrated from expo-av to expo-audio
 */
export const useBackendVoice = ({ language = 'en', mealType = 'general' } = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState(''); // Only available after processing
  const [error, setError] = useState(null);
  // Distinguishes "you haven't opted in" from "something broke", so the screen
  // can show a consent prompt rather than a generic error.
  const [needsConsent, setNeedsConsent] = useState(false);

  // Use the expo-audio recorder hook
  const recorder = useAudioRecorder(SPEECH_RECORDING_PRESET);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setNeedsConsent(false);
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

      // Discard mis-taps before they cost anything. Transcription is billed per
      // minute of audio, so a quarter-second of silence still costs a request,
      // a round trip, and the user waiting to be told nothing was heard.
      const durationMs = (recorder.currentTime ?? 0) * 1000;
      if (durationMs && durationMs < MIN_RECORDING_MS) {
        console.log(`[BackendVoice] Discarded ${Math.round(durationMs)}ms recording (min ${MIN_RECORDING_MS}ms)`);
        setError('That was too short — hold the button and describe your meal.');
        return null;
      }

      // Prepare FormData for upload
      const formData = new FormData();
      formData.append('audio', {
        uri: uri,
        type: 'audio/m4a', // Matches HIGH_QUALITY preset (.m4a)
        name: 'recording.m4a',
      });
      // The endpoint reads both from the body and falls back to 'en'/'general'.
      // Omitting them meant every recording was transcribed as English, which
      // silently broke voice logging for the app's other supported languages.
      formData.append('language', language);
      formData.append('mealType', mealType);

      // Must be upload(), not post(). post() does `body: JSON.stringify(data)`,
      // and JSON.stringify(FormData) yields "{}" — so the audio was silently
      // dropped and the server always received an empty body. upload() passes
      // the FormData through and clears Content-Type so fetch can generate the
      // multipart boundary. (The old `transformRequest` option was an axios
      // API; this client is fetch-based and ignored it entirely.)
      // 60s, not apiClient's 10s default. That budget covers the whole round
      // trip — audio upload, OpenAI transcription, the follow-up model call that
      // identifies the foods, and the database writes — and 10s is not enough
      // for it on a mobile connection or a cold backend. The client was
      // abandoning requests the server then completed, surfacing as a plain
      // error with nothing wrong in the backend logs.
      const response = await apiClient.upload('/voice/transcribe', formData, {
        _timeout: 60000,
      });

      // apiClient returns the parsed body directly, so `response` IS
      // { success, data: [...ingredients], text }. Reading `response.data.text`
      // looked for `.text` on the ingredients array and always got undefined.
      if (response?.text) setTranscript(response.text);
      return response?.data || [];

    } catch (err) {
      // The server returns 403 + code 'openai_consent_required' when the user
      // has not agreed to AI processing. That is a choice to resolve, not a
      // failure — surface it as such so the UI can offer the consent prompt
      // instead of a dead "processing failed".
      const body = err?.response?.data;
      if (body?.code === 'openai_consent_required') {
        console.log('[BackendVoice] Blocked pending AI consent');
        setNeedsConsent(true);
        setError(body.error || 'AI processing needs your consent.');
        return null;
      }

      console.error('Transcription failed', err);
      setError(body?.error || 'Audio processing failed');
      return null;
    }
  }, [recorder, language, mealType]);

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

  return { isRecording, transcript, error, needsConsent, startRecording, stopRecording, cancelRecording };
};