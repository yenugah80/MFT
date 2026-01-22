/**
 * useSmartReminders Hook
 *
 * React Query hooks for smart notification management
 * with preference controls, snooze persistence, and analytics.
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
  snoozes: ['reminders', 'snoozes'],
  history: ['reminders', 'history'],
  analytics: ['reminders', 'analytics'],
  types: ['reminders', 'types'],
};

// ============================================================================
// CORE REMINDER HOOKS
// ============================================================================

/**
 * Hook to get current reminders that should be shown now
 * Automatically filters out snoozed reminders
 */
export function useCurrentReminders() {
  return useQuery({
    queryKey: REMINDER_KEYS.now,
    queryFn: async () => {
      const response = await apiClient.get('/reminders/now');
      return response;
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
      const response = await apiClient.get('/reminders/schedule');
      return response;
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
      const response = await apiClient.get('/reminders/patterns');
      return response;
    },
    staleTime: 60 * 60 * 1000, // 1 hour - patterns don't change often
  });
}

// ============================================================================
// PREFERENCE HOOKS
// ============================================================================

/**
 * Hook to get notification preferences
 */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: REMINDER_KEYS.preferences,
    queryFn: async () => {
      const response = await apiClient.get('/reminders/preferences');
      return response;
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
      const response = await apiClient.put('/reminders/preferences', updates);
      return response;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(REMINDER_KEYS.preferences, (old) => ({
        ...old,
        preferences: data.preferences,
      }));
      // Also invalidate schedule since it may change
      queryClient.invalidateQueries({ queryKey: REMINDER_KEYS.schedule });
    },
  });
}

// ============================================================================
// SNOOZE HOOKS (WITH PERSISTENCE)
// ============================================================================

/**
 * Hook to get active snoozes
 */
export function useActiveSnoozes() {
  return useQuery({
    queryKey: REMINDER_KEYS.snoozes,
    queryFn: async () => {
      const response = await apiClient.get('/reminders/snoozes');
      return response;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to snooze a reminder (persisted to backend)
 */
export function useSnoozeReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reminderType, snoozeDuration = 30 }) => {
      const response = await apiClient.post('/reminders/snooze', {
        reminderType,
        snoozeDuration,
      });
      return response;
    },
    onSuccess: () => {
      // Invalidate both current reminders and snoozes list
      queryClient.invalidateQueries({ queryKey: REMINDER_KEYS.now });
      queryClient.invalidateQueries({ queryKey: REMINDER_KEYS.snoozes });
      queryClient.invalidateQueries({ queryKey: REMINDER_KEYS.schedule });
    },
  });
}

/**
 * Hook to clear a snooze
 */
export function useClearSnooze() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderType) => {
      const response = await apiClient.delete(`/reminders/snooze/${reminderType}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REMINDER_KEYS.now });
      queryClient.invalidateQueries({ queryKey: REMINDER_KEYS.snoozes });
      queryClient.invalidateQueries({ queryKey: REMINDER_KEYS.schedule });
    },
  });
}

// ============================================================================
// DISMISS HOOKS (WITH PERSISTENCE)
// ============================================================================

/**
 * Hook to dismiss a reminder (persisted for ML learning)
 */
export function useDismissReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reminderType, reason }) => {
      const response = await apiClient.post('/reminders/dismiss', {
        reminderType,
        reason,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REMINDER_KEYS.now });
    },
  });
}

// ============================================================================
// ANALYTICS & HISTORY HOOKS
// ============================================================================

/**
 * Hook to get notification delivery history
 */
export function useNotificationHistory(options = {}) {
  const { limit = 50, offset = 0 } = options;

  return useQuery({
    queryKey: [...REMINDER_KEYS.history, { limit, offset }],
    queryFn: async () => {
      const response = await apiClient.get('/reminders/history', {
        params: { limit, offset },
      });
      return response;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get notification analytics
 */
export function useNotificationAnalytics(days = 30) {
  return useQuery({
    queryKey: [...REMINDER_KEYS.analytics, { days }],
    queryFn: async () => {
      const response = await apiClient.get('/reminders/analytics', {
        params: { days },
      });
      return response;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to track notification click
 */
export function useTrackNotificationClick() {
  return useMutation({
    mutationFn: async ({ notificationId, notificationType, screenNavigated }) => {
      const response = await apiClient.post('/reminders/clicked', {
        notificationId,
        notificationType,
        screenNavigated,
      });
      return response;
    },
  });
}

// ============================================================================
// METADATA HOOKS
// ============================================================================

/**
 * Hook to get all reminder types and metadata
 */
export function useReminderTypes() {
  return useQuery({
    queryKey: REMINDER_KEYS.types,
    queryFn: async () => {
      const response = await apiClient.get('/reminders/types');
      return response;
    },
    staleTime: Infinity, // Types don't change
  });
}

// ============================================================================
// UNIFIED HOOK
// ============================================================================

/**
 * Unified hook for reminder management
 * Provides all data and actions in one convenient hook
 */
export function useSmartReminders() {
  const queryClient = useQueryClient();

  // Queries
  const currentQuery = useCurrentReminders();
  const preferencesQuery = useNotificationPreferences();
  const snoozesQuery = useActiveSnoozes();

  // Mutations
  const updatePreferences = useUpdatePreferences();
  const dismissReminder = useDismissReminder();
  const snoozeReminder = useSnoozeReminder();
  const clearSnooze = useClearSnooze();

  return {
    // Data
    reminders: currentQuery.data?.reminders || [],
    reminderCount: currentQuery.data?.count || 0,
    snoozedCount: currentQuery.data?.snoozedCount || 0,
    activeSnoozes: currentQuery.data?.activeSnoozes || snoozesQuery.data?.snoozes || [],
    preferences: preferencesQuery.data?.preferences,

    // Loading states
    isLoading: currentQuery.isLoading,
    isLoadingPreferences: preferencesQuery.isLoading,

    // Actions
    updatePreferences: updatePreferences.mutate,
    updatePreferencesAsync: updatePreferences.mutateAsync,
    dismissReminder: dismissReminder.mutate,
    snoozeReminder: snoozeReminder.mutate,
    snoozeReminderAsync: snoozeReminder.mutateAsync,
    clearSnooze: clearSnooze.mutate,

    // Mutation states
    isUpdating: updatePreferences.isPending,
    isDismissing: dismissReminder.isPending,
    isSnoozing: snoozeReminder.isPending,

    // Refetch
    refetch: currentQuery.refetch,
    refetchAll: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Core
  useCurrentReminders,
  useScheduledReminders,
  useUserPatterns,
  // Preferences
  useNotificationPreferences,
  useUpdatePreferences,
  // Snooze
  useActiveSnoozes,
  useSnoozeReminder,
  useClearSnooze,
  // Dismiss
  useDismissReminder,
  // Analytics
  useNotificationHistory,
  useNotificationAnalytics,
  useTrackNotificationClick,
  // Metadata
  useReminderTypes,
  // Unified
  useSmartReminders,
  // Keys
  REMINDER_KEYS,
};
