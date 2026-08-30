import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import HydrationTracker, { UndoToast } from '../../components/HydrationTracker';

jest.mock('@expo/vector-icons', () => require('../auth/__mocks__/vectorIcons'));
jest.mock('expo-linear-gradient', () => require('../auth/__mocks__/expoLinearGradient'));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 34, left: 0 }),
}));
jest.mock('../../services/audioFeedback', () => ({
  announceWaterLogged: jest.fn(),
  announceHydrationGoalReached: jest.fn(),
}));
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const stub = (name) => function MockSvgElement(props) {
    return React.createElement(View, { testID: `svg-${name}`, ...props }, props.children);
  };
  return {
    __esModule: true,
    default: stub('Svg'),
    Defs: stub('Defs'),
    LinearGradient: stub('LinearGradient'),
    Stop: stub('Stop'),
    Circle: stub('Circle'),
  };
});

describe('Hydration transaction confirmation', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('uses a compact, explicit and accessible Undo confirmation', () => {
    const onDismiss = jest.fn();
    const { unmount } = render(
      <UndoToast
        visible
        message="150 ml Juice added"
        onUndo={jest.fn()}
        onDismiss={onDismiss}
        reduceMotion
      />
    );

    expect(screen.getByText('Hydration updated')).toBeTruthy();
    expect(screen.getByText('150 ml Juice added')).toBeTruthy();
    expect(screen.getByText('Undo')).toBeTruthy();
    expect(screen.getByLabelText('150 ml Juice added. Undo available.')).toBeTruthy();
    const undo = screen.getByLabelText('Undo hydration log');
    expect(undo).toBeTruthy();
    expect(screen.getByLabelText('150 ml Juice added. Undo available.').props.style)
      .toEqual(expect.objectContaining({ bottom: 98 }));
    unmount();
  });

  it('acknowledges immediately, then enables Undo for the exact server entry', async () => {
    let resolveLog;
    const onLogWater = jest.fn(() => new Promise((resolve) => { resolveLog = resolve; }));
    const onRemoveWater = jest.fn(() => Promise.resolve());

    const { unmount } = render(
      <HydrationTracker
        currentIntake={0.7}
        dailyGoal={2.5}
        onLogWater={onLogWater}
        onRemoveWater={onRemoveWater}
        beverageHistory={[]}
      />
    );

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Add 150 milliliters of Water'));
      await Promise.resolve();
    });
    expect(screen.getByText('Adding hydration')).toBeTruthy();
    expect(screen.getByText('150 ml Water selected')).toBeTruthy();
    expect(screen.getByLabelText('Saving hydration')).toBeTruthy();
    expect(screen.queryByLabelText('Undo hydration log')).toBeNull();

    await act(async () => {
      resolveLog({
        entry: {
          id: 412,
          amountLiters: '0.150',
          hydrationLiters: '0.150',
          beverageType: 'water',
        },
      });
    });

    await waitFor(() => expect(screen.getByText('Hydration updated')).toBeTruthy());
    expect(screen.getByText('150 ml Water added')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Undo hydration log'));

    await waitFor(() => {
      expect(onRemoveWater).toHaveBeenCalledWith(412, 0.15, 0.15);
      expect(screen.queryByText('Hydration updated')).toBeNull();
    });
    unmount();
  });

  it('keeps Undo available when the persisted delete fails', async () => {
    const onLogWater = jest.fn(() => Promise.resolve({
      entry: {
        id: 413,
        amountLiters: '0.150',
        hydrationLiters: '0.150',
        beverageType: 'water',
      },
    }));
    const onRemoveWater = jest.fn(() => Promise.reject(new Error('Delete unavailable')));

    const { unmount } = render(
      <HydrationTracker
        currentIntake={0}
        dailyGoal={2.5}
        onLogWater={onLogWater}
        onRemoveWater={onRemoveWater}
        beverageHistory={[]}
      />
    );

    fireEvent.press(screen.getByLabelText('Add 150 milliliters of Water'));
    await waitFor(() => expect(screen.getByLabelText('Undo hydration log')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Undo hydration log'));

    await waitFor(() => expect(onRemoveWater).toHaveBeenCalledWith(413, 0.15, 0.15));
    expect(screen.getByLabelText('Undo hydration log')).toBeTruthy();
    unmount();
  });

  it('keeps analytics and editable entries out of the logger and routes to history', () => {
    const onViewHistory = jest.fn();
    const { unmount } = render(
      <HydrationTracker
        currentIntake={0.7}
        dailyGoal={2.5}
        onLogWater={jest.fn()}
        onRemoveWater={jest.fn()}
        beverageHistory={[{
          id: 1,
          amount: 150,
          amountLiters: 0.15,
          hydrationLiters: 0.15,
          type: 'water',
          timestamp: Date.now(),
        }]}
        onViewHistory={onViewHistory}
      />
    );

    expect(screen.queryByText('Your Hydration Intel')).toBeNull();
    expect(screen.queryByText('Your Hydration Story')).toBeNull();
    fireEvent.press(screen.getByLabelText('View hydration history'));
    expect(onViewHistory).toHaveBeenCalledTimes(1);
    unmount();
  });
});
