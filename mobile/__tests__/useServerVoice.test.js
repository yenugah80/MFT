/**
 * useServerVoice — regression test for the SAME class of bug fixed in
 * useInstantVoice (see useInstantVoice.test.js), but here it matters more:
 * this is the hook log.js actually wires into VoiceModal for the real Voice
 * tab (useInstantVoice is not imported by log.js at all). startRecording()
 * had no re-entrancy guard whatsoever — a second call while the first was
 * still awaiting Voice.start() could race the same way that produced a
 * real EXC_BAD_ACCESS crash caught on a device running this exact code path.
 */
import { renderHook, act } from '@testing-library/react-native';
import Voice from '@react-native-voice/voice';
import { useServerVoice } from '../hooks/useServerVoice';

jest.mock('@react-native-voice/voice', () => ({
  __esModule: true,
  default: {
    onSpeechStart: null,
    onSpeechEnd: null,
    onSpeechError: null,
    onSpeechResults: null,
    onSpeechPartialResults: null,
    start: jest.fn(),
    stop: jest.fn().mockResolvedValue(),
    cancel: jest.fn().mockResolvedValue(),
    destroy: jest.fn().mockResolvedValue(),
    removeAllListeners: jest.fn(),
  },
}));

const mockRecorder = {
  record: jest.fn(),
  prepareToRecordAsync: jest.fn().mockResolvedValue(),
  stop: jest.fn().mockResolvedValue(),
  isRecording: false,
  currentTime: 0,
};

jest.mock('expo-audio', () => ({
  useAudioRecorder: () => mockRecorder,
  requestRecordingPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
  setAudioModeAsync: jest.fn().mockResolvedValue(),
  IOSOutputFormat: { MPEG4AAC: 'aac' },
  AudioQuality: { MIN: 0, LOW: 1, MEDIUM: 2, MAX: 3, HIGH: 4 },
}));

jest.mock('../services/apiClient', () => ({
  __esModule: true,
  default: { post: jest.fn().mockResolvedValue({ data: { success: false } }) },
}));

jest.mock('../constants/languages', () => ({
  getSpeechLocale: () => 'en-US',
}));

describe('useServerVoice — startRecording re-entrancy guard', () => {
  // startRecording() sets two real setInterval timers (duration/volume
  // simulation) that only stopRecording()/cancelRecording() clear — never
  // on unmount. Without cleanup here, they keep firing after each test
  // ends and Jest's process never exits.
  let activeResult = null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRecorder.isRecording = false;
    activeResult = null;
  });

  afterEach(async () => {
    if (activeResult) {
      await act(async () => {
        await activeResult.current.cancelRecording();
      });
    }
  });

  it('ignores a second startRecording() call while the first is still mid-setup', async () => {
    let resolveStart;
    Voice.start.mockReturnValue(new Promise((resolve) => { resolveStart = resolve; }));

    const { result } = renderHook(() => useServerVoice({ voiceLanguage: 'en' }));
    activeResult = result;

    let firstCall;
    let secondCall;
    await act(async () => {
      firstCall = result.current.startRecording();
      secondCall = result.current.startRecording();
      resolveStart();
      await firstCall;
      await secondCall;
    });

    expect(Voice.start).toHaveBeenCalledTimes(1);
  });

  it('releases the guard after a successful start, so a real subsequent recording works', async () => {
    Voice.start.mockResolvedValue();

    const { result } = renderHook(() => useServerVoice({ voiceLanguage: 'en' }));
    activeResult = result;

    await act(async () => {
      await result.current.startRecording();
    });
    // Realistic usage: stop before starting again — startRecording()
    // overwrites the duration/volume interval refs unconditionally, so
    // calling it a second time without stopping first leaks the previous
    // pair of real timers. Not what this test is checking; stop first so
    // it isolates the guard-release behavior specifically.
    await act(async () => {
      await result.current.stopRecording();
    });
    await act(async () => {
      await result.current.startRecording();
    });

    expect(Voice.start).toHaveBeenCalledTimes(2);
  });

  it('releases the guard after Voice.start() fails, so a retry actually retries', async () => {
    Voice.start.mockRejectedValueOnce(new Error('300/Failed to initialize recognizer'));

    const { result } = renderHook(() => useServerVoice({ voiceLanguage: 'en' }));
    activeResult = result;

    await act(async () => {
      await result.current.startRecording();
    });

    Voice.start.mockResolvedValue();
    await act(async () => {
      await result.current.startRecording();
    });

    expect(Voice.start).toHaveBeenCalledTimes(2);
  });
});
