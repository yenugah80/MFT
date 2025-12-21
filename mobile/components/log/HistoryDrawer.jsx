/**
 * HistoryDrawer Component
 * Displays food log history with selection and comparison features
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Format timestamp to readable date
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Format time
 */
function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * History item component
 */
function HistoryItem({ log, isSelected, onPress }) {
  const sourceIcon = log.source === 'voice'
    ? 'mic-outline'
    : log.source === 'photo'
      ? 'camera-outline'
      : 'document-text-outline';

  return (
    <TouchableOpacity
      style={[styles.historyItem, isSelected && styles.historyItemSelected]}
      onPress={() => onPress(log)}
      accessible
      accessibilityLabel={`${log.foodName || 'Food log'}, ${Math.round(log.calories || 0)} calories`}
    >
      <View style={styles.historyItemHeader}>
        <Text style={styles.historyItemName} numberOfLines={1}>
          {log.foodName || 'Unknown item'}
        </Text>
        {isSelected && <Text style={styles.checkmark}>1/2</Text>}
      </View>

      <View style={styles.historyItemDetails}>
        <Text style={styles.historyItemCalories}>{Math.round(log.calories || 0)} cal</Text>
        <Text style={styles.historyItemMacros}>
          P:{Math.round(log.protein || 0)} C:{Math.round(log.carbs || 0)} F:{Math.round(log.fat || 0)}
        </Text>
      </View>

      <View style={styles.historyItemMeta}>
        <Text style={styles.historyItemDate}>{formatDate(log.timestamp)}</Text>
        <Text style={styles.historyItemTime}>{formatTime(log.timestamp)}</Text>
        <Ionicons name={sourceIcon} size={16} color="#6B7280" />
      </View>
    </TouchableOpacity>
  );
}

/**
 * Comparison Modal
 */
function ComparisonModal({ visible, onClose, logs }) {
  if (logs.length !== 2) return null;

  const [log1, log2] = logs;

  const score1 = typeof log1.healthScore === 'number' ? log1.healthScore : null;
  const score2 = typeof log2.healthScore === 'number' ? log2.healthScore : null;
  const delta = score1 !== null && score2 !== null ? Math.abs(score1 - score2) : null;
  const showWinner = delta !== null && delta >= 10;
  const winner = showWinner ? (score1 >= score2 ? log1 : log2) : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.comparisonOverlay} />
      </TouchableWithoutFeedback>

      <View style={styles.comparisonModal}>
        <View style={styles.comparisonHeader}>
          <Text style={styles.comparisonTitle}>Food Comparison</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.comparisonContent}>
          {/* Healthier Choice Banner */}
          {showWinner ? (
            <View style={styles.healthierBanner}>
              <View style={styles.healthierBadge}>
                <Ionicons name="trophy-outline" size={18} color="#059669" />
              </View>
              <Text style={styles.healthierText}>
                Higher health score: {winner.foodName || 'This item'}
              </Text>
            </View>
          ) : (
            <View style={styles.neutralBanner}>
              <Text style={styles.neutralText}>Similar overall health impact</Text>
            </View>
          )}

          {/* Side-by-side comparison */}
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonCol}>
              <Text style={styles.comparisonFoodName}>{log1.foodName || 'Item 1'}</Text>
            </View>
            <View style={styles.comparisonCol}>
              <Text style={styles.comparisonFoodName}>{log2.foodName || 'Item 2'}</Text>
            </View>
          </View>

          {/* Health Score */}
          <ComparisonRow
            label="Health Score"
            value1={score1 !== null ? `${score1}/100` : '—'}
            value2={score2 !== null ? `${score2}/100` : '—'}
            highlight={showWinner}
          />

          {/* Calories */}
          <ComparisonRow
            label="Calories"
            value1={Math.round(log1.calories || 0)}
            value2={Math.round(log2.calories || 0)}
            highlight={Math.abs((log1.calories || 0) - (log2.calories || 0)) > 50}
          />

          {/* Macros */}
          <ComparisonRow
            label="Protein (g)"
            value1={Math.round(log1.protein || 0)}
            value2={Math.round(log2.protein || 0)}
            highlight={Math.abs((log1.protein || 0) - (log2.protein || 0)) > 5}
          />

          <ComparisonRow
            label="Carbs (g)"
            value1={Math.round(log1.carbs || 0)}
            value2={Math.round(log2.carbs || 0)}
            highlight={Math.abs((log1.carbs || 0) - (log2.carbs || 0)) > 10}
          />

          <ComparisonRow
            label="Fat (g)"
            value1={Math.round(log1.fat || 0)}
            value2={Math.round(log2.fat || 0)}
            highlight={Math.abs((log1.fat || 0) - (log2.fat || 0)) > 5}
          />

          {/* Fiber */}
          {(log1.fiber || log2.fiber) && (
            <ComparisonRow
              label="Fiber (g)"
              value1={log1.fiber ? Math.round(log1.fiber) : '—'}
              value2={log2.fiber ? Math.round(log2.fiber) : '—'}
            />
          )}

          {/* Sugar */}
          {(log1.sugar || log2.sugar) && (
            <ComparisonRow
              label="Sugar (g)"
              value1={log1.sugar ? Math.round(log1.sugar) : '—'}
              value2={log2.sugar ? Math.round(log2.sugar) : '—'}
            />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function ComparisonRow({ label, value1, value2, highlight }) {
  return (
    <View style={[styles.comparisonDataRow, highlight && styles.comparisonDataRowHighlight]}>
      <Text style={styles.comparisonLabel}>{label}</Text>
      <View style={styles.comparisonValues}>
        <Text style={styles.comparisonValue}>{value1}</Text>
        <Text style={styles.comparisonValue}>{value2}</Text>
      </View>
    </View>
  );
}

/**
 * Main HistoryDrawer Component
 */
export function HistoryDrawer({ visible, onClose, logs, onSelectLog, isLoading = false }) {
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [detailLog, setDetailLog] = useState(null);

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

  const isSelected = (log) => {
    const key = logKey(log);
    return selectedLogs.some(selected => logKey(selected) === key);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.drawerOverlay} />
        </TouchableWithoutFeedback>

        <View style={styles.drawer}>
          {/* Header */}
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Food Log History</Text>
            <View style={styles.headerActions}>
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
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Selection hint */}
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

          {/* History list */}
          <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color="#6B4EFF" />
                <Text style={styles.loadingText}>Loading history...</Text>
              </View>
            ) : logs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No logs yet</Text>
                <Text style={styles.emptyStateHint}>
                  Start logging your meals to see them here
                </Text>
              </View>
            ) : (
              logs.map((log, index) => (
                <HistoryItem
                  key={logKey(log) || index}
                  log={log}
                  isSelected={isSelected(log)}
                  onPress={handleSelectLog}
                />
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Comparison Modal */}
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
          <View style={styles.comparisonOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.detailSheet}>
          <View style={styles.detailHeader}>
            <View>
              <Text style={styles.detailTitle}>{detailLog?.foodName || 'Food log'}</Text>
              <Text style={styles.detailMeta}>
                {formatDate(detailLog?.timestamp)} · {formatTime(detailLog?.timestamp)}
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
            <Text style={styles.detailStat}>Health score: {typeof detailLog?.healthScore === 'number' ? detailLog.healthScore : '—'}</Text>
          </View>

          <View style={styles.detailActions}>
            <TouchableOpacity
              style={styles.primaryAction}
              onPress={() => {
                onSelectLog?.(detailLog);
                setDetailLog(null);
              }}
            >
              <Text style={styles.primaryActionText}>Insert into log</Text>
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
    </>
  );
}

const styles = StyleSheet.create({
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  drawer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
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
    fontSize: 20,
    color: '#6B7280',
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
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectionHintText: {
    fontSize: 14,
    color: '#6B4EFF',
    textAlign: 'center',
    fontWeight: '600',
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  historyList: {
    flex: 1,
    padding: 16,
  },
  historyItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyItemSelected: {
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#6B4EFF',
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  checkmark: {
    fontSize: 20,
    color: '#6B4EFF',
  },
  historyItemDetails: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  historyItemCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B4EFF',
  },
  historyItemMacros: {
    fontSize: 14,
    color: '#6B7280',
  },
  historyItemMeta: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  historyItemDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  historyItemTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  historyItemSource: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptyStateHint: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  comparisonOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  comparisonModal: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    maxHeight: '90%',
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  comparisonTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  comparisonContent: {
    flex: 1,
    padding: 20,
  },
  healthierBanner: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  healthierBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  neutralBanner: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  healthierText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    textAlign: 'center',
  },
  neutralText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  comparisonCol: {
    flex: 1,
  },
  comparisonFoodName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  comparisonDataRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 12,
  },
  comparisonDataRowHighlight: {
    backgroundColor: '#FEF3C7',
  },
  comparisonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  comparisonValues: {
    flexDirection: 'row',
    gap: 12,
  },
  comparisonValue: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    textAlign: 'center',
    fontWeight: '500',
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
});

// Shareable components for screens
export { ComparisonModal, HistoryItem };
