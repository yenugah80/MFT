/**
 * useSmartReminders Hook
 *
 * React Query hooks for smart notification management
 * with preference controls and pattern learning.
 *
 * @module useSmartReminders
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

// Query keys
export const REMINDER_KEYS = {
  now: ['reminders', 'now'],
  schedule: ['reminders', 'schedule'],
  patterns: ['reminders', 'patterns'],
  preferences: ['reminders', 'preferences'],
  types: ['reminders', 'types'],
};

/**
 * Hook to get current reminders that should be shown now
 */
export function useCurrentReminders() {
  return useQuery({
    queryKey: REMINDER_KEYS.now,
    queryFn: async () => {
      const { data } = await apiClient.get('/reminders/now');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 15 * 60 * 1000, // Auto-refetch every 15 minutes
  });
}

/**
 * Hook to get scheduled reminders for the next 24 hours
 */
export function useScheduledReminders() {
  return useQuery({
    queryKey: REMINDER_KEYS.schedule,
    queryFn: async () => {
      const { data } = await apiClient.get('/reminders/schedule');
      return data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to get user's learned patterns
 */
export function useUserPatterns() {
  return useQuery({
    queryKey: REMINDER_KEYS.patterns,
    queryFn: async () => {
      const { data } = await apiClient.get('/reminders/patterns');
      return data;
    },
    staleTime: 60 * 60 * 1000, // 1 hour - patterns don't change often
  });
}

/**
 * Hook to get notification preferences
 */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: REMINDER_KEYS.preferences,
    queryFn: async () => {
      const { data } = await apiClient.get('/reminders/preferences');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to update notification preferences
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates) => {
      const { data } = await apiClient.put('/reminders/preferences', updates);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(REMINDER_KEYS.preferences, (old) => ({
        ...old,
        preferences: data.preferences,
      }));
    },
  });
}

/**
 * Hook to dismiss a reminder
 */
export function useDismissReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reminderType, reason }) => {
      const { data } = await apiClient.post('/reminders/dismiss', {
        reminderType,
        reason,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(REMINDER_KEYS.now);
    },
  });
}

/**
 * Hook to snooze a reminder
 */
export function useSnoozeReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reminderType, snoozeDuration = 30 }) => {
      const { data } = await apiClient.post('/reminders/snooze', {
        reminderType,
        snoozeDuration,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(REMINDER_KEYS.now);
    },
  });
}

/**
 * Hook to get all reminder types
 */
export function useReminderTypes() {
  return useQuery({
    queryKey: REMINDER_KEYS.types,
    queryFn: async () => {
      const { data } = await apiClient.get('/reminders/types');
      return data;
    },
    staleTime: Infinity, // Types don't change
  });
}

/**
 * Unified hook for reminder management
 */
export function useSmartReminders() {
  const currentQuery = useCurrentReminders();
  const preferencesQuery = useNotificationPreferences();
  const updatePreferences = useUpdatePreferences();
  const dismissReminder = useDismissReminder();
  const snoozeReminder = useSnoozeReminder();

  return {
    // Data
    reminders: currentQuery.data?.reminders || [],
    reminderCount: currentQuery.data?.count || 0,
    preferences: preferencesQuery.data?.preferences,

    // Loading states
    isLoading: currentQuery.isLoading,
    isLoadingPreferences: preferencesQuery.isLoading,

    // Actions
    updatePreferences: updatePreferences.mutate,
    dismissReminder: dismissReminder.mutate,
    snoozeReminder: snoozeReminder.mutate,

    // Mutation states
    isUpdating: updatePreferences.isPending,
    isDismissing: dismissReminder.isPending,

    // Refetch
    refetch: currentQuery.refetch,
  };
}

export default {
  useCurrentReminders,
  useScheduledReminders,
  useUserPatterns,
  useNotificationPreferences,
  useUpdatePreferences,
  useDismissReminder,
  useSnoozeReminder,
  useReminderTypes,
  useSmartReminders,
  REMINDER_KEYS,
};
