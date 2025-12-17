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
} from 'react-native';

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
function HistoryItem({ log, isSelected, onPress, onLongPress }) {
  return (
    <TouchableOpacity
      style={[styles.historyItem, isSelected && styles.historyItemSelected]}
      onPress={() => onPress(log)}
      onLongPress={() => onLongPress(log)}
      accessible
      accessibilityLabel={`${log.foodName}, ${log.calories} calories`}
    >
      <View style={styles.historyItemHeader}>
        <Text style={styles.historyItemName} numberOfLines={1}>
          {log.foodName}
        </Text>
        {isSelected && <Text style={styles.checkmark}>✓</Text>}
      </View>

      <View style={styles.historyItemDetails}>
        <Text style={styles.historyItemCalories}>{Math.round(log.calories)} cal</Text>
        <Text style={styles.historyItemMacros}>
          P:{Math.round(log.protein)} C:{Math.round(log.carbs)} F:{Math.round(log.fat)}
        </Text>
      </View>

      <View style={styles.historyItemMeta}>
        <Text style={styles.historyItemDate}>{formatDate(log.timestamp)}</Text>
        <Text style={styles.historyItemTime}>{formatTime(log.timestamp)}</Text>
        {log.source && (
          <Text style={styles.historyItemSource}>
            {log.source === 'voice' ? '🎤' : log.source === 'photo' ? '📷' : '📝'}
          </Text>
        )}
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

  const healthier = log1.healthScore >= log2.healthScore ? log1 : log2;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.comparisonOverlay}>
        <View style={styles.comparisonModal}>
          <View style={styles.comparisonHeader}>
            <Text style={styles.comparisonTitle}>Food Comparison</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.comparisonContent}>
            {/* Healthier Choice Banner */}
            <View style={styles.healthierBanner}>
              <Text style={styles.healthierText}>
                🏆 Healthier Choice: {healthier.foodName}
              </Text>
            </View>

            {/* Side-by-side comparison */}
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonCol}>
                <Text style={styles.comparisonFoodName}>{log1.foodName}</Text>
              </View>
              <View style={styles.comparisonCol}>
                <Text style={styles.comparisonFoodName}>{log2.foodName}</Text>
              </View>
            </View>

            {/* Health Score */}
            <ComparisonRow
              label="Health Score"
              value1={`${log1.healthScore}/100`}
              value2={`${log2.healthScore}/100`}
              highlight={log1.healthScore !== log2.healthScore}
            />

            {/* Calories */}
            <ComparisonRow
              label="Calories"
              value1={Math.round(log1.calories)}
              value2={Math.round(log2.calories)}
              highlight={Math.abs(log1.calories - log2.calories) > 50}
            />

            {/* Macros */}
            <ComparisonRow
              label="Protein (g)"
              value1={Math.round(log1.protein)}
              value2={Math.round(log2.protein)}
              highlight={Math.abs(log1.protein - log2.protein) > 5}
            />

            <ComparisonRow
              label="Carbs (g)"
              value1={Math.round(log1.carbs)}
              value2={Math.round(log2.carbs)}
              highlight={Math.abs(log1.carbs - log2.carbs) > 10}
            />

            <ComparisonRow
              label="Fat (g)"
              value1={Math.round(log1.fat)}
              value2={Math.round(log2.fat)}
              highlight={Math.abs(log1.fat - log2.fat) > 5}
            />

            {/* Fiber */}
            {(log1.fiber || log2.fiber) && (
              <ComparisonRow
                label="Fiber (g)"
                value1={log1.fiber ? Math.round(log1.fiber) : '-'}
                value2={log2.fiber ? Math.round(log2.fiber) : '-'}
              />
            )}

            {/* Sugar */}
            {(log1.sugar || log2.sugar) && (
              <ComparisonRow
                label="Sugar (g)"
                value1={log1.sugar ? Math.round(log1.sugar) : '-'}
                value2={log2.sugar ? Math.round(log2.sugar) : '-'}
              />
            )}
          </ScrollView>
        </View>
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
export function HistoryDrawer({ visible, onClose, logs, onSelectLog }) {
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  const handleSelectLog = (log) => {
    if (selectedLogs.length === 0) {
      // First selection
      setSelectedLogs([log]);
    } else if (selectedLogs.length === 1) {
      // Second selection - show comparison
      if (selectedLogs[0].timestamp === log.timestamp) {
        // Deselect if same log
        setSelectedLogs([]);
      } else {
        setSelectedLogs([selectedLogs[0], log]);
        setShowComparison(true);
      }
    } else {
      // Reset and start new selection
      setSelectedLogs([log]);
    }
  };

  const handleLongPress = (log) => {
    if (onSelectLog) {
      onSelectLog(log);
    }
  };

  const handleCloseComparison = () => {
    setShowComparison(false);
    setSelectedLogs([]);
  };

  const isSelected = (log) => {
    return selectedLogs.some(selected => selected.timestamp === log.timestamp);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.drawerOverlay}>
          <View style={styles.drawer}>
            {/* Header */}
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Food Log History</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Selection hint */}
            {selectedLogs.length > 0 && (
              <View style={styles.selectionHint}>
                <Text style={styles.selectionHintText}>
                  {selectedLogs.length === 1
                    ? 'Select another item to compare'
                    : `Comparing ${selectedLogs.length} items`}
                </Text>
              </View>
            )}

            {/* History list */}
            <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
              {logs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No logs yet</Text>
                  <Text style={styles.emptyStateHint}>
                    Start logging your meals to see them here
                  </Text>
                </View>
              ) : (
                logs.map((log, index) => (
                  <HistoryItem
                    key={log.id || log.timestamp || index}
                    log={log}
                    isSelected={isSelected(log)}
                    onPress={handleSelectLog}
                    onLongPress={handleLongPress}
                  />
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Comparison Modal */}
      <ComparisonModal
        visible={showComparison}
        onClose={handleCloseComparison}
        logs={selectedLogs}
      />
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
    maxHeight: '90%',
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
  },
  healthierText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
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
});
