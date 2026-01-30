import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { TYPOGRAPHY } from '../../constants/premiumTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useFoodLog } from '../../hooks/useFoodLog';
import { HistoryItem } from '../../components/log/HistoryDrawer';

/**
 * Format date for section headers
 */
function formatSectionDate(timestamp) {
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
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get date key for grouping
 */
function getDateKey(timestamp) {
  const date = new Date(timestamp);
  return date.toDateString();
}

export default function HistoryScreen() {
  const router = useRouter();
  const { days, scanned } = useLocalSearchParams();
  const foodLog = useFoodLog();

  const [selectedLogs, setSelectedLogs] = useState([]);
  const [compareMode, setCompareMode] = useState(false);
  const [detailLog, setDetailLog] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterDays, setFilterDays] = useState(30);
  const [scannedOnly, setScannedOnly] = useState(false);
  const hasFocusedRef = useRef(false);
  const lastFetchAtRef = useRef(0);

  const getCompareId = useCallback((log) => {
    if (log?.id) return `id:${log.id}`;
    if (log?.clientEventId) return `cid:${log.clientEventId}`;
    if (log?.timestamp) return `ts:${log.timestamp}`;
    return null;
  }, []);

  const openComparison = useCallback((first, second) => {
    const ids = [getCompareId(first), getCompareId(second)].filter(Boolean);
    if (ids.length < 2) return;

    router.push({
      pathname: '/history/compare',
      params: { ids: ids.join(',') },
    });
  }, [getCompareId, router]);

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
        openComparison(selectedLogs[0], log);
        setSelectedLogs([]);
        setCompareMode(false);
      } else {
        setSelectedLogs([log]);
      }
    } else {
      // Navigate to meal detail screen with full log data
      const mealId = log.clientEventId || log.mealId || log.id || log.local_id || log.timestamp;
      router.push({
        pathname: `/meal/${mealId}`,
        params: { logData: JSON.stringify(log) },
      });
    }
  };

  const resolveFilterDays = useCallback((value) => {
    const parsed = Number(value);
    if ([1, 7, 30, 90].includes(parsed)) return parsed;
    return 30;
  }, []);

  const getDateRange = useCallback((rangeDays) => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(end.getDate() - rangeDays + 1);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }, []);

  const handleRefresh = useCallback(async (showSpinner = true) => {
    const now = Date.now();
    if (now - lastFetchAtRef.current < 5000) return;
    lastFetchAtRef.current = now;

    if (showSpinner) setRefreshing(true);
    try {
      const { start, end } = getDateRange(filterDays);
      await foodLog.fetchHistory({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        limit: 200,
      });
    } finally {
      if (showSpinner) setRefreshing(false);
    }
  }, [foodLog, filterDays, getDateRange]);

  useFocusEffect(
    useCallback(() => {
      if (hasFocusedRef.current) {
        handleRefresh(false);
      } else {
        hasFocusedRef.current = true;
      }
    }, [handleRefresh])
  );

  useEffect(() => {
    handleRefresh(false);
  }, [handleRefresh, filterDays]);

  useEffect(() => {
    if (days) {
      setFilterDays(resolveFilterDays(days));
    }
    if (scanned !== undefined) {
      setScannedOnly(scanned === 'true' || scanned === '1');
    }
  }, [days, scanned, resolveFilterDays]);

  const filteredLogs = useMemo(() => {
    const { start, end } = getDateRange(filterDays);
    return (foodLog.logs || []).filter((log) => {
      const timestamp = Number(log?.timestamp || 0);
      if (timestamp < start.getTime() || timestamp > end.getTime()) return false;

      if (scannedOnly) {
        return log?.source === 'photo' || log?.source === 'barcode';
      }

      return true;
    });
  }, [foodLog.logs, filterDays, scannedOnly, getDateRange]);

  // Group logs by date for SectionList
  const groupedLogs = useMemo(() => {
    const groups = {};
    filteredLogs.forEach((log) => {
      const dateKey = getDateKey(log.timestamp);
      if (!groups[dateKey]) {
        groups[dateKey] = {
          title: formatSectionDate(log.timestamp),
          timestamp: log.timestamp,
          data: [],
        };
      }
      groups[dateKey].data.push(log);
    });

    // Sort sections by date (most recent first)
    return Object.values(groups).sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredLogs]);

  const canCompare = filteredLogs.length >= 2;

  const isSelected = (log) => {
    const key = logKey(log);
    return selectedLogs.some(selected => logKey(selected) === key);
  };

  const keyExtractor = useCallback((item, index) => {
    const key = logKey(item);
    if (key) return key.toString();
    return `${item?.foodName || 'item'}-${item?.timestamp || 0}-${item?.calories || 0}-${index}`;
  }, []);

  const renderItem = useCallback(({ item }) => (
    <HistoryItem
      log={item}
      isSelected={isSelected(item)}
      onPress={handleSelectLog}
    />
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [handleSelectLog, selectedLogs]);

  // Render section header
  const renderSectionHeader = useCallback(({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>{section.data.length} meals</Text>
    </View>
  ), []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Clean Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(tabs)/dashboard')}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>Food History</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{filteredLogs.length} meals</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.iconButton,
            compareMode && styles.iconButtonActive,
            !canCompare && styles.iconButtonDisabled,
          ]}
          onPress={() => {
            if (!canCompare) return;
            setCompareMode(!compareMode);
            setSelectedLogs([]);
          }}
          disabled={!canCompare}
        >
          <Ionicons
            name="git-compare-outline"
            size={20}
            color={compareMode ? '#FFFFFF' : '#6B7280'}
          />
        </TouchableOpacity>
      </View>

      {/* Compact Filter Row */}
      <View style={styles.filterBar}>
        <View style={styles.filterRow}>
          {[1, 7, 30, 90].map((value) => {
            const isActive = filterDays === value;
            const label = value === 1 ? 'Today' : `${value}d`;
            return (
              <TouchableOpacity
                key={value}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => {
                  setFilterDays(value);
                  router.setParams({ days: String(value) });
                }}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          style={[styles.scanChip, scannedOnly && styles.scanChipActive]}
          onPress={() => {
            const next = !scannedOnly;
            setScannedOnly(next);
            router.setParams({ scanned: next ? '1' : undefined });
          }}
        >
          <Ionicons
            name="camera-outline"
            size={14}
            color={scannedOnly ? '#FFFFFF' : '#6B7280'}
          />
          {scannedOnly && <Text style={styles.scanChipText}>Scanned</Text>}
        </TouchableOpacity>
      </View>

      {/* Compare mode hint */}
      {compareMode && (
        <View style={styles.selectionHint}>
          <View style={styles.hintLeft}>
            <Ionicons name="git-compare-outline" size={16} color="#6B4EFF" />
            <Text style={styles.selectionHintText}>
              {selectedLogs.length === 0
                ? 'Select 2 meals to compare'
                : `${selectedLogs.length}/2 selected`}
            </Text>
          </View>
          <TouchableOpacity onPress={() => { setCompareMode(false); setSelectedLogs([]); }}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      <SectionList
        sections={groupedLogs}
        keyExtractor={keyExtractor}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        removeClippedSubviews={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="restaurant-outline" size={40} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>No meals logged</Text>
            <Text style={styles.emptySubtitle}>
              {filterDays === 1 ? 'Nothing logged today' : `No meals in the last ${filterDays} days`}
            </Text>
          </View>
        }
        stickySectionHeadersEnabled={false}
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
              }}
            >
              <Text style={styles.primaryActionText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={() => {
                setDetailLog(null);
                setCompareMode(true);
                setSelectedLogs([detailLog]);
              }}
            >
              <Text style={styles.secondaryActionText}>Compare</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#111827',
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#6B7280',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonActive: {
    backgroundColor: '#6B4EFF',
  },
  iconButtonDisabled: {
    opacity: 0.4,
  },
  selectionHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#C7D2FE',
  },
  hintLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectionHintText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    fontSize: 13,
  },
  cancelText: {
    color: '#EF4444',
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    fontSize: 13,
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  filterChipActive: {
    backgroundColor: '#6B4EFF',
    borderColor: '#6B4EFF',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  scanChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  scanChipActive: {
    backgroundColor: '#374151',
    borderColor: '#374151',
  },
  scanChipText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#FFFFFF',
  },
  // Section list styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#374151',
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.family.medium,
    color: '#9CA3AF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#374151',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
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
    fontFamily: TYPOGRAPHY.family.bold,
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
    fontFamily: TYPOGRAPHY.family.bold,
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
    fontFamily: TYPOGRAPHY.family.bold,
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
