/**
 * Dev-only floating inspector for locally scheduled notifications —
 * reachable regardless of sign-in state, unlike the equivalent inspector
 * in app/profile/notifications.jsx (behind the auth gate). Exists
 * specifically to verify "did local reminders actually cancel immediately
 * at sign-out" at the one moment that matters: right after signing out,
 * before signing back in, when Settings isn't reachable at all.
 *
 * Mounted once at the root layout (app/_layout.jsx), gated by __DEV__ —
 * absent from any build that isn't a development build.
 */
import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNotification } from '../../providers/NotificationProvider';

export default function ScheduledNotificationsDebugOverlay() {
  const notify = useNotification();
  const [visible, setVisible] = useState(false);
  const [scheduled, setScheduled] = useState(null);
  const [loading, setLoading] = useState(false);

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
