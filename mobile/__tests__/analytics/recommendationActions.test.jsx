import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import RecommendationCard from '../../components/analytics/RecommendationCard';

jest.mock('@expo/vector-icons', () => require('../auth/__mocks__/vectorIcons'));
jest.mock('expo-router', () => require('../auth/__mocks__/expoRouter'));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

const recommendation = {
  id: 'wellness:first_action',
  type: 'action',
  title: 'Take a short walk',
  message: 'A small movement break may support your routine.',
};

describe('RecommendationCard action persistence', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps Done and Later visible in compact Progress cards and awaits completion', async () => {
    const onComplete = jest.fn(() => Promise.resolve({ trackingId: 'track-1' }));
    render(<RecommendationCard recommendation={recommendation} compact onComplete={onComplete} />);

    fireEvent.press(screen.getByLabelText('Mark "Take a short walk" as done'));

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('wellness:first_action', { recommendation }));
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    expect(screen.getByLabelText('Dismiss "Take a short walk" for later')).toBeTruthy();
  });

  it('persists a Later dismissal through the supplied mutation handler', async () => {
    const onDismiss = jest.fn(() => Promise.resolve());
    render(<RecommendationCard recommendation={recommendation} compact onDismiss={onDismiss} />);

    fireEvent.press(screen.getByLabelText('Dismiss "Take a short walk" for later'));

    await waitFor(() => expect(onDismiss).toHaveBeenCalledWith('wellness:first_action', { recommendation }));
  });

  it('shows a recoverable error when persistence fails', async () => {
    const onComplete = jest.fn(() => Promise.reject(new Error('offline')));
    render(<RecommendationCard recommendation={recommendation} compact onComplete={onComplete} />);

    fireEvent.press(screen.getByLabelText('Mark "Take a short walk" as done'));

    expect(await screen.findByText('Could not save. Try again.')).toBeTruthy();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('error');
  });
});
