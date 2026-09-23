import { act, renderHook } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';

import useModalNavigation from '../../hooks/useModalNavigation';

describe('useModalNavigation', () => {
  let interactionSpy;

  beforeEach(() => {
    jest.useFakeTimers();
    interactionSpy = jest
      .spyOn(InteractionManager, 'runAfterInteractions')
      .mockImplementation((callback) => {
        callback();
        return { cancel: jest.fn() };
      });
  });

  afterEach(() => {
    interactionSpy.mockRestore();
    jest.useRealTimers();
  });

  it('closes first and navigates when the native modal reports dismissal', () => {
    const router = { push: jest.fn() };
    const closeModal = jest.fn();
    const { result } = renderHook(() => useModalNavigation(router));

    act(() => {
      result.current.navigateAfterModalClose(closeModal, '/history/mood');
    });

    expect(closeModal).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();

    act(() => {
      result.current.handleModalDismiss();
    });

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/history/mood');

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('uses the guarded fallback when a platform does not report dismissal', () => {
    const router = { push: jest.fn() };
    const { result } = renderHook(() => useModalNavigation(router));

    act(() => {
      result.current.navigateAfterModalClose(
        jest.fn(),
        '/analytics/hydration',
      );
      jest.advanceTimersByTime(449);
    });
    expect(router.push).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/analytics/hydration');
  });

  it('keeps only the latest pending route across repeated taps', () => {
    const router = { push: jest.fn() };
    const { result } = renderHook(() => useModalNavigation(router));

    act(() => {
      result.current.navigateAfterModalClose(jest.fn(), '/history/mood');
      result.current.navigateAfterModalClose(jest.fn(), '/analytics/hydration');
      jest.advanceTimersByTime(450);
    });

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/analytics/hydration');
  });
});

