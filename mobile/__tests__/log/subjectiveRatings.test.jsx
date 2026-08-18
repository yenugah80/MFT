/**
 * Subjective ratings must be chosen, not defaulted.
 *
 * These render the real loggers rather than asserting on source text, because
 * the defect being guarded is a runtime one: opening Log Sleep and tapping Save
 * used to store "quality 7/10", and Log Stress "level 5" — precise-looking
 * health data nobody entered. The static guard in uiContractGuards catches the
 * `useState` default coming back; this catches the behaviour actually breaking.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import SleepLogger from '../../components/SleepLogger';
import StressLogger from '../../components/StressLogger';
import { __mocks as sleepMocks } from '../../hooks/useSleepLog';
import { __mocks as stressMocks } from '../../hooks/useStressLog';

jest.mock('@expo/vector-icons', () => require('../auth/__mocks__/vectorIcons'));
jest.mock('expo-linear-gradient', () => require('../auth/__mocks__/expoLinearGradient'));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

// Keep the real label/tag constants — the components map over them — and stub
// only the network call.
jest.mock('../../hooks/useSleepLog', () => {
  const actual = jest.requireActual('../../hooks/useSleepLog');
  const logSleep = jest.fn().mockResolvedValue({});
  return {
    ...actual,
    __mocks: { logSleep },
    useSleepLog: () => ({ logSleep, isLogging: false }),
  };
});

jest.mock('../../hooks/useStressLog', () => {
  const actual = jest.requireActual('../../hooks/useStressLog');
  const logStress = jest.fn().mockResolvedValue({});
  return {
    ...actual,
    __mocks: { logStress },
    useStressLog: () => ({ logStress, isLogging: false }),
  };
});

describe('SleepLogger', () => {
  const open = () => render(<SleepLogger visible onClose={jest.fn()} />);

  test('opens unrated — prompt shown, no 7/10 invented', () => {
    open();
    expect(screen.getByText('Tap to rate your sleep')).toBeOnTheScreen();
    // The old default surfaced as the number 7 and the label "Good".
    expect(screen.queryByText('7')).not.toBeOnTheScreen();
    expect(screen.queryByText('Good')).not.toBeOnTheScreen();
  });

  test('Save is disabled until a quality is chosen', () => {
    open();
    expect(screen.getByText('Save Sleep')).toBeDisabled();

    fireEvent.press(screen.getByLabelText('Sleep quality 8 out of 10, Very Good'));

    expect(screen.getByText('Save Sleep')).toBeEnabled();
  });

  test('pressing Save while unrated records nothing', () => {
    open();
    fireEvent.press(screen.getByText('Save Sleep'));
    expect(sleepMocks.logSleep).not.toHaveBeenCalled();
  });

  test('saves the quality the user actually picked', () => {
    open();
    fireEvent.press(screen.getByLabelText('Sleep quality 3 out of 10, Poor'));
    fireEvent.press(screen.getByText('Save Sleep'));

    expect(sleepMocks.logSleep).toHaveBeenCalledTimes(1);
    expect(sleepMocks.logSleep.mock.calls[0][0]).toMatchObject({ quality: 3 });
  });

  test('choosing a quality replaces the prompt with that rating', () => {
    open();
    fireEvent.press(screen.getByLabelText('Sleep quality 10 out of 10, Excellent'));

    expect(screen.queryByText('Tap to rate your sleep')).not.toBeOnTheScreen();
    expect(screen.getByText('10')).toBeOnTheScreen();
    expect(screen.getByText('Excellent')).toBeOnTheScreen();
  });
});

describe('StressLogger', () => {
  const open = () => render(<StressLogger visible onClose={jest.fn()} />);
  // Label is 'Save' until a coping strategy is picked, then 'Save Check-in'.
  const saveButton = () => screen.getByText('Save');

  test('opens unrated — prompt shown, no level 5 invented', () => {
    open();
    expect(screen.getByText('Tap a number to rate your stress')).toBeOnTheScreen();
    expect(screen.queryByText('5')).not.toBeOnTheScreen();
  });

  test('Save is disabled until a level is chosen', () => {
    open();
    expect(saveButton()).toBeDisabled();

    fireEvent.press(screen.getByLabelText('Stress level 7 out of 10'));

    expect(saveButton()).toBeEnabled();
  });

  test('pressing Save while unrated records nothing', () => {
    open();
    fireEvent.press(saveButton());
    expect(stressMocks.logStress).not.toHaveBeenCalled();
  });

  test('saves the level the user actually picked', () => {
    open();
    fireEvent.press(screen.getByLabelText('Stress level 2 out of 10'));
    fireEvent.press(saveButton());

    expect(stressMocks.logStress).toHaveBeenCalledTimes(1);
    expect(stressMocks.logStress.mock.calls[0][0]).toMatchObject({ level: 2 });
  });
});
