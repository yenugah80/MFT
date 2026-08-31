/**
 * useInstantVoice — regression test for a real, confirmed native crash.
 *
 * A device crash log (EXC_BAD_ACCESS / SIGSEGV) showed three threads
 * concurrently executing @react-native-voice/voice's native
 * setupAndStartRecognizing: — one attaching a node to the AVAudioEngine
 * while another was mid-dealloc of that same engine. Root cause: nothing
 * in this hook (or its caller, VoiceModal's handleStart) stopped
 * startRecording() from being invoked a second time while the first call
 * was still mid-setup — a fast double-tap on the mic button, before React
 * re-renders it out of the idle view, called Voice.start() twice
 * concurrently. The native module has no re-entrancy guard of its own, so
 * this hook now has to be the one that refuses the second call.
 */
import { renderHook, act } from '@testing-library/react-native';
import Voice from '@react-native-voice/voice';
import { useInstantVoice } from '../hooks/useInstantVoice';

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

jest.mock('../services/apiClient', () => ({
  __esModule: true,
  default: { post: jest.fn().mockResolvedValue({ data: { success: false } }) },
}));

const mockBackendStartRecording = jest.fn();
jest.mock('../hooks/useBackendVoice', () => ({
  useBackendVoice: () => ({
    isRecording: false,
    transcript: '',
    error: null,
    startRecording: mockBackendStartRecording,
    stopRecording: jest.fn(),
    cancelRecording: jest.fn(),
  }),
}));

jest.mock('../constants/languages', () => ({
  getSpeechLocale: () => 'en-US',
}));

describe('useInstantVoice — startRecording re-entrancy guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ignores a second startRecording() call while the first is still mid-setup', async () => {
    let resolveStart;
    Voice.start.mockReturnValue(new Promise((resolve) => { resolveStart = resolve; }));

    const { result } = renderHook(() => useInstantVoice({ voiceLanguage: 'en' }));

    // Fire two calls back-to-back, exactly as a fast double-tap on the mic
    // button would — neither awaited before the second fires.
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

  it('allows a genuinely new recording after the previous one stopped', async () => {
    Voice.start.mockResolvedValue();

    const { result } = renderHook(() => useInstantVoice({ voiceLanguage: 'en' }));

    await act(async () => {
      await result.current.startRecording();
    });
    await act(async () => {
      await result.current.stopRecording();
    });
    await act(async () => {
      await result.current.startRecording();
    });

    expect(Voice.start).toHaveBeenCalledTimes(2);
  });

  it('releases the guard if both native and fallback recording fail, so the next tap is not silently dead', async () => {
    Voice.start.mockRejectedValue(new Error('native unavailable'));
    mockBackendStartRecording.mockRejectedValueOnce(new Error('backend unavailable'));

    const { result } = renderHook(() => useInstantVoice({ voiceLanguage: 'en' }));

    await act(async () => {
      await result.current.startRecording();
    });

    // A second attempt must actually retry Voice.start(), not be silently
    // swallowed by a guard that never released after the double-failure.
    Voice.start.mockResolvedValue();
    await act(async () => {
      await result.current.startRecording();
    });

    expect(Voice.start).toHaveBeenCalledTimes(2);
  });
});
