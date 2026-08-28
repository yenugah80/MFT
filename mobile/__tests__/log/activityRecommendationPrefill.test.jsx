import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ActivityScreen } from '../../app/(tabs)/activity';
import { setMockSearchParams } from '../auth/__mocks__/expoRouter';

jest.mock('expo-router', () => require('../auth/__mocks__/expoRouter'));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
});
jest.mock('@expo/vector-icons', () => require('../auth/__mocks__/vectorIcons'));
jest.mock('expo-linear-gradient', () => require('../auth/__mocks__/expoLinearGradient'));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));
jest.mock('@clerk/clerk-expo', () => ({ useUser: () => ({ user: { id: 'user-1' } }) }));
jest.mock('../../components/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }) => children,
}));
jest.mock('../../hooks/useProfileForm', () => ({
  __esModule: true,
  default: () => ({ state: { savedProfile: { basics: { weightKg: 70 } } } }),
}));
jest.mock('../../hooks/useActivityLog', () => ({
  useActivityLog: () => ({
    activities: [],
    weeklyProgress: { weeklyMinutes: 90, target: 150 },
    isLoading: false,
    refetch: jest.fn(() => Promise.resolve()),
    logActivity: jest.fn(() => Promise.resolve()),
    isLogging: false,
  }),
}));

describe('Activity recommendation prefill', () => {
  beforeEach(() => setMockSearchParams({}));

  test('opens an exact catalogue match with API duration and intensity prefilled', async () => {
    setMockSearchParams({
      recommended: '1',
      requestId: 'exact-1',
      activity: 'HIIT',
      type: 'hiit',
      minutes: '25',
      intensity: 'vigorous',
    });

    render(<ActivityScreen />);

    expect(await screen.findByText('LOG WORKOUT')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('25')).toBeOnTheScreen();
    expect(screen.getByLabelText('Vigorous intensity').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByText('Save workout')).toBeEnabled();
  });

  test('filters broad API recommendations and waits for a specific exercise choice', async () => {
    setMockSearchParams({
      recommended: '1',
      requestId: 'broad-1',
      activity: 'Walking',
      type: 'walking',
      minutes: '30',
      intensity: 'moderate',
    });

    const rendered = render(<ActivityScreen />);

    await waitFor(() => expect(screen.getByDisplayValue('Walking')).toBeOnTheScreen());
    expect(screen.queryByText('LOG WORKOUT')).not.toBeOnTheScreen();

    fireEvent.press(screen.getByText('Treadmill Walking'));

    expect(await screen.findByText('LOG WORKOUT')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('30')).toBeOnTheScreen();
    expect(screen.getByLabelText('Moderate intensity').props.accessibilityState).toEqual({ selected: true });

    setMockSearchParams({ source: 'activity-insights', recommended: '0', requestId: 'generic-1' });
    rendered.rerender(<ActivityScreen />);

    await waitFor(() => expect(screen.queryByText('LOG WORKOUT')).not.toBeOnTheScreen());
    expect(screen.getByPlaceholderText('Search exercises...').props.value).toBe('');
  });
});
