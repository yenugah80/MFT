/**
 * Voice recording configuration
 *
 * Single source of truth for how meal audio is captured, shared by every voice
 * hook so the client and the transcription endpoint can never drift apart.
 *
 * Why not `RecordingPresets.HIGH_QUALITY` (the previous setting):
 *
 *   HIGH_QUALITY records 44.1 kHz stereo at 128 kbps. Speech-to-text models
 *   resample to 16 kHz mono before doing anything, so the extra sample rate and
 *   the entire second channel are discarded on arrival — a single speaker does
 *   not need two channels. The only effect was a ~4x larger upload and a
 *   correspondingly slower round trip.
 *
 *   30 seconds of audio:
 *     HIGH_QUALITY   ~480 KB   ≈ 1.9 s to upload on a 2 Mbps link
 *     this preset     ~90 KB   ≈ 0.36 s
 *
 * Quality: 16 kHz mono is exactly what the model consumes, and 48 kbps AAC is
 * transparent for speech, so transcription accuracy is unchanged. This trades
 * away only fidelity the model never sees.
 */

import { IOSOutputFormat, AudioQuality } from 'expo-audio';

export const SPEECH_RECORDING_PRESET = {
  extension: '.m4a',
  // Matches the model's own input rate — no resampling loss either direction.
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 48000,
  android: {
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    // MEDIUM, not MIN: MIN can introduce artefacts that cost transcription
    // accuracy, which is the one thing this change must not do.
    audioQuality: AudioQuality.MEDIUM,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 48000,
  },
};

/**
 * Recordings shorter than this are discarded without being uploaded.
 *
 * A mis-tap produces a fraction of a second of silence. Transcription is billed
 * per minute of audio, so uploading those costs money and round-trip latency to
 * be told there is no speech.
 */
export const MIN_RECORDING_MS = 800;

/** Hard cap on a single recording, matching the modal's own timeout. */
export const MAX_RECORDING_MS = 60000;

export default { SPEECH_RECORDING_PRESET, MIN_RECORDING_MS, MAX_RECORDING_MS };
