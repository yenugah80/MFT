import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useFoodLog } from '../../hooks/useFoodLog';
import { ComparisonModal, HistoryItem } from '../../components/log/HistoryDrawer';

export default function HistoryScreen() {
  const router = useRouter();
  const foodLog = useFoodLog();

  const [selectedLogs, setSelectedLogs] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [detailLog, setDetailLog] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const logKey = (log) => log?.id || log?.clientEventId || log?.timestamp;

  const handleSelectLog = (log) => {
    if (compareMode) {
      const key = logKey(log);
      const alreadySelected = selectedLogs.some(item => logKey(item) === key);
      if (alreadySelected) {
        setSelectedLogs(selectedLogs.filter(item => logKey(item) !== key));
        return;
      }

      if (selectedLogs.length === 0) {
        setSelectedLogs([log]);
      } else if (selectedLogs.length === 1) {
        setSelectedLogs([selectedLogs[0], log]);
        setShowComparison(true);
      } else {
        setSelectedLogs([log]);
      }
    } else {
      setDetailLog(log);
    }
  };

  const handleCloseComparison = () => {
    setShowComparison(false);
    setSelectedLogs([]);
    setCompareMode(false);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await foodLog.fetchHistory();
    } finally {
      setRefreshing(false);
    }
  }, [foodLog]);

  useEffect(() => {
    foodLog.fetchHistory().catch(() => {});
  }, [foodLog]);

  useFocusEffect(
    useCallback(() => {
      foodLog.fetchHistory().catch(() => {});
    }, [foodLog])
  );

  const isSelected = (log) => {
    const key = logKey(log);
    return selectedLogs.some(selected => logKey(selected) === key);
  };

  const renderItem = ({ item }) => (
    <HistoryItem
      log={item}
      isSelected={isSelected(item)}
      onPress={handleSelectLog}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Food Log History</Text>
        <TouchableOpacity
          style={[styles.compareToggle, compareMode && styles.compareToggleActive]}
          onPress={() => {
            setCompareMode(!compareMode);
            setSelectedLogs([]);
          }}
        >
          <Ionicons name="git-compare-outline" size={18} color={compareMode ? '#FFFFFF' : '#6B7280'} />
          <Text style={[styles.compareToggleText, compareMode && styles.compareToggleTextActive]}>
            Compare
          </Text>
        </TouchableOpacity>
      </View>

      {compareMode && (
        <View style={styles.selectionHint}>
          <Text style={styles.selectionHintText}>
            {selectedLogs.length === 0
              ? 'Select up to 2 items to compare'
              : selectedLogs.length === 1
                ? 'Select one more item'
                : 'Comparing 2 items'}
          </Text>
        </View>
      )}

      <FlatList
        data={foodLog.logs}
        keyExtractor={(item, index) => logKey(item)?.toString() || String(index)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing || foodLog.isLoading} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No logs yet</Text>
            <Text style={styles.emptySubtitle}>Start logging your meals to see them here</Text>
          </View>
        }
      />

      <ComparisonModal
        visible={showComparison}
        onClose={handleCloseComparison}
        logs={selectedLogs}
      />

      {/* Detail Sheet */}
      <Modal
        visible={!!detailLog}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailLog(null)}
      >
        <TouchableWithoutFeedback onPress={() => setDetailLog(null)}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
        <View style={styles.detailSheet}>
          <View style={styles.detailHeader}>
            <View>
              <Text style={styles.detailTitle}>{detailLog?.foodName || 'Food log'}</Text>
              <Text style={styles.detailMeta}>
                {detailLog?.timestamp ? new Date(detailLog.timestamp).toLocaleString() : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setDetailLog(null)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.detailBody}>
            <Text style={styles.detailStat}>Calories: {Math.round(detailLog?.calories || 0)}</Text>
            <Text style={styles.detailStat}>
              P:{Math.round(detailLog?.protein || 0)} C:{Math.round(detailLog?.carbs || 0)} F:{Math.round(detailLog?.fat || 0)}
            </Text>
            <Text style={styles.detailStat}>
              Health score: {typeof detailLog?.healthScore === 'number' ? detailLog.healthScore : '—'}
            </Text>
          </View>

          <View style={styles.detailActions}>
            <TouchableOpacity
              style={styles.primaryAction}
              onPress={() => {
                setDetailLog(null);
                router.back();
                setTimeout(() => {
                  // Relay log back via onSelect if needed; current flow keeps this as view-only
                }, 0);
              }}
            >
              <Text style={styles.primaryActionText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={() => {
                setCompareMode(true);
                setSelectedLogs([detailLog]);
                setDetailLog(null);
              }}
            >
              <Text style={styles.secondaryActionText}>Compare</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginLeft: -40,
  },
  compareToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  compareToggleActive: {
    backgroundColor: '#6B4EFF',
    borderColor: '#6B4EFF',
  },
  compareToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  compareToggleTextActive: {
    color: '#FFFFFF',
  },
  selectionHint: {
    backgroundColor: '#EEF2FF',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectionHintText: {
    textAlign: 'center',
    color: '#4F46E5',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  detailSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '60%',
    marginTop: 'auto',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  detailMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  detailBody: {
    gap: 8,
    marginBottom: 20,
  },
  detailStat: {
    fontSize: 14,
    color: '#111827',
  },
  detailActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: '#6B4EFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryAction: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryActionText: {
    color: '#1F2937',
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
  },
});
