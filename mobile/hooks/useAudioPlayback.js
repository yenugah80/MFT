import { useState, useCallback, useRef, useEffect } from 'react';
import { useAudioPlayer } from 'expo-audio';

/**
 * useAudioPlayback Hook
 * Handles audio playback for recorded voice messages using expo-audio
 *
 * @example
 * const { loadAudio, togglePlayback, isPlaying, progress } = useAudioPlayback();
 * await loadAudio(recordingUri);
 * togglePlayback(); // Play or pause
 */
export const useAudioPlayback = () => {
  const [audioUri, setAudioUri] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  const progressIntervalRef = useRef(null);
  const playerRef = useRef(null);

  // Create audio player when URI changes
  const player = useAudioPlayer(audioUri);

  // Store player ref for cleanup
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  // Track playback progress
  useEffect(() => {
    if (isPlaying && player) {
      progressIntervalRef.current = setInterval(() => {
        if (player.currentTime !== undefined) {
          setPlaybackProgress(player.currentTime);
        }
        if (player.duration !== undefined && player.duration > 0) {
          setDuration(player.duration);
        }
      }, 100);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, player]);

  // Handle playback completion
  useEffect(() => {
    if (player && duration > 0 && playbackProgress >= duration - 0.1) {
      setIsPlaying(false);
      setPlaybackProgress(0);
      if (player.seekTo) {
        player.seekTo(0);
      }
    }
  }, [player, playbackProgress, duration]);

  // Update loaded state and duration when player changes
  useEffect(() => {
    if (player && audioUri) {
      setIsLoaded(true);
      // Get duration once loaded
      const checkDuration = setInterval(() => {
        if (player.duration && player.duration > 0) {
          setDuration(player.duration);
          clearInterval(checkDuration);
        }
      }, 100);

      // Cleanup after 5 seconds if duration never loads
      setTimeout(() => clearInterval(checkDuration), 5000);

      return () => clearInterval(checkDuration);
    }
  }, [player, audioUri]);

  /**
   * Load an audio file for playback
   * @param {string} uri - File URI of the audio to play
   */
  const loadAudio = useCallback(async (uri) => {
    try {
      setError(null);
      setIsPlaying(false);
      setPlaybackProgress(0);
      setDuration(0);
      setIsLoaded(false);
      setAudioUri(uri);
      // Player will be created automatically by useAudioPlayer hook
    } catch (err) {
      console.error('[useAudioPlayback] Load error:', err);
      setError('Failed to load audio');
      setIsLoaded(false);
    }
  }, []);

  /**
   * Start playback
   */
  const play = useCallback(async () => {
    if (!player || !audioUri) {
      console.warn('[useAudioPlayback] No audio loaded');
      return;
    }

    try {
      setError(null);
      player.play();
      setIsPlaying(true);
    } catch (err) {
      console.error('[useAudioPlayback] Play error:', err);
      setError('Failed to play audio');
      setIsPlaying(false);
    }
  }, [player, audioUri]);

  /**
   * Pause playback
   */
  const pause = useCallback(() => {
    if (!player) return;

    try {
      player.pause();
      setIsPlaying(false);
    } catch (err) {
      console.error('[useAudioPlayback] Pause error:', err);
    }
  }, [player]);

  /**
   * Toggle between play and pause
   */
  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  /**
   * Seek to a specific position
   * @param {number} position - Position in seconds
   */
  const seekTo = useCallback((position) => {
    if (!player) return;

    try {
      player.seekTo(position);
      setPlaybackProgress(position);
    } catch (err) {
      console.error('[useAudioPlayback] Seek error:', err);
    }
  }, [player]);

  /**
   * Reset playback state and clear audio
   */
  const reset = useCallback(() => {
    if (playerRef.current) {
      try {
        playerRef.current.pause();
      } catch {
        // Ignore errors during cleanup
      }
    }

    setAudioUri(null);
    setIsPlaying(false);
    setPlaybackProgress(0);
    setDuration(0);
    setIsLoaded(false);
    setError(null);
  }, []);

  return {
    // State
    audioUri,
    isPlaying,
    isLoaded,
    playbackProgress,
    duration,
    error,

    // Computed
    progressPercent: duration > 0 ? (playbackProgress / duration) * 100 : 0,

    // Actions
    loadAudio,
    play,
    pause,
    togglePlayback,
    seekTo,
    reset,
  };
};

export default useAudioPlayback;
