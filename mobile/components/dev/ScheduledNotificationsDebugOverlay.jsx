/**
 * Dev-only floating overlay, two unrelated tools sharing one entry point
 * since both are __DEV__-only and reachable regardless of sign-in state:
 *
 * 1. Scheduled-notification inspector — verifies "did local reminders
 *    actually cancel immediately at sign-out" at the one moment that
 *    matters (right after signing out, before signing back in, when
 *    Settings isn't reachable at all).
 * 2. "Replay opening sequence" — resets HAS_SIGNED_IN_KEY (so the auth
 *    screen shows its first-time hero copy again) and onboardingCompletedAt
 *    (so the account replays onboarding steps 1-4) without deleting and
 *    recreating the account, for recording the app's opening sequence
 *    repeatedly. Calls a dev-only backend endpoint that refuses outright
 *    unless the backend's NODE_ENV is explicitly 'development' — there is
 *    no path to this against the real production backend.
 *
 * Mounted once at the root layout (app/_layout.jsx), gated by __DEV__ —
 * absent from any build that isn't a development build.
 */
import { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useClerk } from '@clerk/clerk-expo';
import { useNotification } from '../../providers/NotificationProvider';
import apiClient from '../../services/apiClient';
import { HAS_SIGNED_IN_KEY } from '../../app/(auth)/sign-in';

export default function ScheduledNotificationsDebugOverlay() {
  const notify = useNotification();
  const { signOut } = useClerk();
  const [visible, setVisible] = useState(false);
  const [scheduled, setScheduled] = useState(null);
  const [loading, setLoading] = useState(false);
  const [replaying, setReplaying] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await notify?.push?.getScheduled?.();
      setScheduled(result || []);
    } finally {
      setLoading(false);
    }
  };

  const open = () => {
    setVisible(true);
    refresh();
  };

  const replayOpeningSequence = async () => {
    setReplaying(true);
    try {
      // Best-effort — if the backend refuses (not NODE_ENV=development) or
      // the request fails, still proceed to sign out so the auth hero at
      // least resets, rather than leaving the user stuck mid-action.
      const response = await apiClient.post('/profile/dev/reset-onboarding', {}).catch((error) => {
        console.warn('[DevTools] reset-onboarding failed (continuing anyway):', error?.message || error);
        return null;
      });
      await AsyncStorage.removeItem(HAS_SIGNED_IN_KEY);
      setVisible(false);
      await signOut();
      if (response && !response.success) {
        Alert.alert('Note', 'Onboarding reset was refused by the backend (not running in development mode) — sign-in hero was still reset.');
      }
    } catch (error) {
      Alert.alert('Replay failed', error?.message || String(error));
    } finally {
      setReplaying(false);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.fab} onPress={open} accessibilityLabel="Debug: view scheduled notifications">
        <Text style={styles.fabText}>🔔</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Scheduled Notifications (Debug)</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Text style={styles.close}>Close</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            Reachable whether signed in or out — for verifying local reminders cancel immediately at sign-out.
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={refresh} disabled={loading}>
            <Text style={styles.refreshText}>{loading ? 'Loading…' : 'Refresh'}</Text>
          </TouchableOpacity>
          <ScrollView style={styles.list}>
            {scheduled === null ? (
              <Text style={styles.empty}>Tap Refresh to load.</Text>
            ) : scheduled.length === 0 ? (
              <Text style={styles.empty}>No notifications currently scheduled.</Text>
            ) : (
              scheduled.map((n) => (
                <View key={n.id} style={styles.row}>
                  <Text style={styles.rowTitle}>
                    {n.category || '(no category)'}
                    {n.dateKey ? ` — ${n.dateKey}` : ' — permanent repeating'}
                  </Text>
                  <Text style={styles.rowDetail}>id: {n.id}</Text>
                  <Text style={styles.rowDetail}>
                    screen: {n.screen || '—'}{n.hour !== undefined ? `  hour: ${n.hour}` : ''}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.divider} />
          <Text style={styles.title}>Replay Opening Sequence</Text>
          <Text style={styles.subtitle}>
            Resets the first-time sign-in hero and onboarding completion for this account, then signs
            out — for recording the app's opening sequence without deleting and recreating the account.
          </Text>
          <TouchableOpacity
            style={[styles.refreshButton, styles.replayButton]}
            onPress={() => Alert.alert(
              'Replay opening sequence?',
              'Signs out and resets onboarding for this account.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Replay', style: 'destructive', onPress: replayOpeningSequence },
              ]
            )}
            disabled={replaying}
          >
            <Text style={styles.refreshText}>{replaying ? 'Resetting…' : 'Replay Opening Sequence'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 40,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.85,
    zIndex: 9999,
    elevation: 9999,
  },
  fabText: {
    fontSize: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  close: {
    fontSize: 15,
    color: '#6B4EFF',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  refreshButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  replayButton: {
    backgroundColor: '#FEE2E2',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  list: {
    flex: 1,
  },
  empty: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  row: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  rowDetail: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
});
