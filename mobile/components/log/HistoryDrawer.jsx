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
import { TEXT, SURFACES } from '../../constants/premiumTheme';

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
 * Get meal icon based on source
 */
function getMealIcon(source) {
  switch (source) {
    case 'voice': return { icon: 'mic', color: '#8B5CF6', bg: '#EDE9FE' };
    case 'photo': return { icon: 'camera', color: '#EC4899', bg: '#FCE7F3' };
    case 'barcode': return { icon: 'barcode', color: '#F59E0B', bg: '#FEF3C7' };
    default: return { icon: 'restaurant', color: '#10B981', bg: '#D1FAE5' };
  }
}

/**
 * Get score color
 */
function getScoreColor(score) {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#3B82F6';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
}

/**
 * History item component - Modern card design
 */
function HistoryItem({ log, isSelected, onPress }) {
  const mealIcon = getMealIcon(log.source);
  const calories = Math.round(log.calories || 0);
  const protein = Math.round(log.protein || 0);
  const carbs = Math.round(log.carbs || 0);
  const fat = Math.round(log.fat || log.fats || 0); // Handle both 'fat' and 'fats' keys
  const score = typeof log.healthScore === 'number' ? log.healthScore : null;

  return (
    <TouchableOpacity
      style={[styles.historyCard, isSelected && styles.historyCardSelected]}
      onPress={() => onPress(log)}
      activeOpacity={0.7}
      accessible
      accessibilityLabel={`${log.foodName || 'Food log'}, ${calories} calories`}
    >
      {/* Left: Icon */}
      <View style={[styles.mealIconWrapper, { backgroundColor: mealIcon.bg }]}>
        <Ionicons name={mealIcon.icon} size={20} color={mealIcon.color} />
      </View>

      {/* Center: Food info */}
      <View style={styles.foodInfo}>
        <Text style={styles.foodName} numberOfLines={1}>
          {log.foodName || 'Unknown item'}
        </Text>

        <View style={styles.macroRow}>
          <View style={styles.caloriesBadge}>
            <Text style={styles.caloriesText}>{calories}</Text>
            <Text style={styles.caloriesUnit}>cal</Text>
          </View>
          <View style={styles.macroDots}>
            <View style={styles.macroDot}>
              <View style={[styles.macroIndicator, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.macroValue}>{protein}g</Text>
            </View>
            <View style={styles.macroDot}>
              <View style={[styles.macroIndicator, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.macroValue}>{carbs}g</Text>
            </View>
            <View style={styles.macroDot}>
              <View style={[styles.macroIndicator, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.macroValue}>{fat}g</Text>
            </View>
          </View>
        </View>

        <Text style={styles.timeStamp}>
          {formatDate(log.timestamp)} · {formatTime(log.timestamp)}
        </Text>
      </View>

      {/* Right: Score or Selection indicator */}
      <View style={styles.rightSection}>
        {isSelected ? (
          <View style={styles.selectedBadge}>
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          </View>
        ) : score && score > 0 ? (
          <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(score) + '15' }]}>
            <Text style={[styles.scoreText, { color: getScoreColor(score) }]}>{score}</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
        )}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Calculate meal score for comparison
 */
function calculateMealScore(meal) {
  const protein = meal.protein || 0;
  const carbs = meal.carbs || 0;
  const fat = meal.fat || meal.fats || 0;
  const fiber = meal.fiber || 0;
  const sugar = meal.sugar || 0;
  const calories = meal.calories || 0;

  if (calories <= 0) return 50;

  // Protein ratio score (higher protein per calorie is better)
  const proteinPerCal = (protein * 4) / calories;
  const proteinScore = Math.min(100, proteinPerCal * 250);

  // Fiber bonus
  const fiberScore = Math.min(100, (fiber / 8) * 100);

  // Sugar penalty
  const sugarPenalty = Math.min(40, (sugar / 25) * 40);

  // Macro balance
  const totalMacroCal = (protein * 4) + (carbs * 4) + (fat * 9) || 1;
  const proteinPct = (protein * 4) / totalMacroCal * 100;
  let balanceScore = 100;
  if (proteinPct < 15) balanceScore -= 30;
  else if (proteinPct < 20) balanceScore -= 15;

  return Math.round((proteinScore * 0.35 + fiberScore * 0.2 + balanceScore * 0.3 + (40 - sugarPenalty)) * 0.9);
}

/**
 * Generate recommendations based on comparison
 */
function generateRecommendations(log1, log2) {
  const recommendations = [];
  const score1 = calculateMealScore(log1);
  const score2 = calculateMealScore(log2);

  const winner = score1 >= score2 ? log1 : log2;
  const loser = score1 >= score2 ? log2 : log1;
  const winnerName = winner.foodName || 'First option';
  const loserName = loser.foodName || 'Second option';

  // Protein comparison
  const protein1 = log1.protein || 0;
  const protein2 = log2.protein || 0;
  if (Math.abs(protein1 - protein2) > 5) {
    const higherProtein = protein1 > protein2 ? log1 : log2;
    recommendations.push({
      icon: 'fitness',
      color: '#3B82F6',
      title: 'Better for muscle',
      text: `${higherProtein.foodName || 'This meal'} has ${Math.round(Math.max(protein1, protein2))}g protein vs ${Math.round(Math.min(protein1, protein2))}g`,
      winner: higherProtein === winner,
    });
  }

  // Calorie comparison
  const cal1 = log1.calories || 0;
  const cal2 = log2.calories || 0;
  if (Math.abs(cal1 - cal2) > 100) {
    const lowerCal = cal1 < cal2 ? log1 : log2;
    recommendations.push({
      icon: 'flame',
      color: '#F59E0B',
      title: 'Lower calorie',
      text: `${lowerCal.foodName || 'This meal'} saves you ${Math.round(Math.abs(cal1 - cal2))} calories`,
      winner: lowerCal === winner,
    });
  }

  // Protein per calorie (protein density)
  const proteinDensity1 = cal1 > 0 ? protein1 / cal1 * 100 : 0;
  const proteinDensity2 = cal2 > 0 ? protein2 / cal2 * 100 : 0;
  if (Math.abs(proteinDensity1 - proteinDensity2) > 2) {
    const denser = proteinDensity1 > proteinDensity2 ? log1 : log2;
    recommendations.push({
      icon: 'trending-up',
      color: '#10B981',
      title: 'More protein per calorie',
      text: `${denser.foodName || 'This meal'} is more protein-dense (${Math.round(Math.max(proteinDensity1, proteinDensity2))}g per 100cal)`,
      winner: denser === winner,
    });
  }

  // Carbs comparison (for low-carb diets)
  const carbs1 = log1.carbs || 0;
  const carbs2 = log2.carbs || 0;
  if (Math.abs(carbs1 - carbs2) > 20) {
    const lowerCarb = carbs1 < carbs2 ? log1 : log2;
    recommendations.push({
      icon: 'leaf',
      color: '#8B5CF6',
      title: 'Lower carbs',
      text: `${lowerCarb.foodName || 'This meal'} has ${Math.round(Math.abs(carbs1 - carbs2))}g fewer carbs`,
      winner: lowerCarb === winner,
    });
  }

  return { recommendations, winner, loser, score1, score2 };
}

/**
 * Comparison Modal with Recommendations
 */
function ComparisonModal({ visible, onClose, logs }) {
  if (logs.length !== 2) return null;

  const [log1, log2] = logs;
  const { recommendations, winner, score1, score2 } = generateRecommendations(log1, log2);
  const scoreDiff = Math.abs(score1 - score2);
  const hasWinner = scoreDiff >= 8;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.comparisonModalContainer}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.comparisonOverlay} />
        </TouchableWithoutFeedback>

        <View style={styles.comparisonModal}>
          <View style={styles.comparisonHeader}>
            <Text style={styles.comparisonTitle}>Smart Comparison</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.comparisonContent} showsVerticalScrollIndicator={false}>
            {/* Winner Banner */}
            {hasWinner ? (
              <View style={styles.winnerBanner}>
                <View style={styles.winnerIconWrap}>
                  <Ionicons name="trophy" size={24} color="#F59E0B" />
                </View>
                <View style={styles.winnerTextWrap}>
                  <Text style={styles.winnerTitle}>Recommended Choice</Text>
                  <Text style={styles.winnerName}>{winner.foodName || 'Better option'}</Text>
                  <Text style={styles.winnerReason}>
                    {scoreDiff >= 20 ? 'Significantly healthier' : 'Slightly better overall'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.tieBanner}>
                <Ionicons name="swap-horizontal" size={20} color="#6B7280" />
                <Text style={styles.tieText}>Both meals are nutritionally similar</Text>
              </View>
            )}

            {/* Score Cards */}
            <View style={styles.scoreCardsWrap}>
              <View style={[styles.scoreCardCompare, winner === log1 && hasWinner && styles.scoreCardWinner]}>
                <Text style={styles.scoreCardName} numberOfLines={1}>{log1.foodName || 'Meal 1'}</Text>
                <Text style={[styles.scoreCardScore, winner === log1 && hasWinner && styles.scoreCardScoreWinner]}>{score1}</Text>
                <Text style={styles.scoreCardLabel}>score</Text>
              </View>
              <View style={styles.vsCircle}>
                <Text style={styles.vsText}>VS</Text>
              </View>
              <View style={[styles.scoreCardCompare, winner === log2 && hasWinner && styles.scoreCardWinner]}>
                <Text style={styles.scoreCardName} numberOfLines={1}>{log2.foodName || 'Meal 2'}</Text>
                <Text style={[styles.scoreCardScore, winner === log2 && hasWinner && styles.scoreCardScoreWinner]}>{score2}</Text>
                <Text style={styles.scoreCardLabel}>score</Text>
              </View>
            </View>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <View style={styles.recsSection}>
                <Text style={styles.recsSectionTitle}>Key Differences</Text>
                {recommendations.map((rec, index) => (
                  <View key={index} style={styles.recCard}>
                    <View style={[styles.recIconWrap, { backgroundColor: rec.color + '15' }]}>
                      <Ionicons name={rec.icon} size={18} color={rec.color} />
                    </View>
                    <View style={styles.recContent}>
                      <Text style={styles.recTitle}>{rec.title}</Text>
                      <Text style={styles.recText}>{rec.text}</Text>
                    </View>
                    {rec.winner && (
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Quick Stats Comparison */}
            <View style={styles.quickStatsSection}>
              <Text style={styles.recsSectionTitle}>Nutrition Breakdown</Text>
              <View style={styles.quickStatsGrid}>
                <QuickStatRow label="Calories" val1={log1.calories} val2={log2.calories} unit="kcal" lowerIsBetter />
                <QuickStatRow label="Protein" val1={log1.protein} val2={log2.protein} unit="g" />
                <QuickStatRow label="Carbs" val1={log1.carbs} val2={log2.carbs} unit="g" lowerIsBetter />
                <QuickStatRow label="Fat" val1={log1.fat || log1.fats} val2={log2.fat || log2.fats} unit="g" />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function QuickStatRow({ label, val1, val2, unit, lowerIsBetter = false }) {
  const v1 = Math.round(val1 || 0);
  const v2 = Math.round(val2 || 0);
  const better1 = lowerIsBetter ? v1 < v2 : v1 > v2;
  const better2 = lowerIsBetter ? v2 < v1 : v2 > v1;
  const hasDiff = Math.abs(v1 - v2) > (label === 'Calories' ? 50 : 5);

  return (
    <View style={styles.quickStatRow}>
      <Text style={[styles.quickStatVal, hasDiff && better1 && styles.quickStatValBetter]}>{v1}{unit}</Text>
      <Text style={styles.quickStatLabel}>{label}</Text>
      <Text style={[styles.quickStatVal, hasDiff && better2 && styles.quickStatValBetter]}>{v2}{unit}</Text>
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
    borderBottomColor: SURFACES.divider,
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
    borderColor: SURFACES.divider,
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
    borderBottomColor: SURFACES.divider,
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
  // Modern card-style history item
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  historyCardSelected: {
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#6B4EFF',
  },
  mealIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  foodInfo: {
    flex: 1,
    marginRight: 8,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  caloriesBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  caloriesText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  caloriesUnit: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 2,
  },
  macroDots: {
    flexDirection: 'row',
    gap: 8,
  },
  macroDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  macroIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroValue: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  timeStamp: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  rightSection: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
  },
  selectedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6B4EFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '700',
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
    borderBottomColor: SURFACES.divider,
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
    borderColor: SURFACES.divider,
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
    color: TEXT.secondary,
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
    borderTopColor: SURFACES.divider,
    paddingVertical: 12,
  },
  comparisonDataRowHighlight: {
    backgroundColor: '#FEF3C7',
  },
  comparisonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
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
    color: TEXT.primary,
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
    borderColor: SURFACES.divider,
  },
  secondaryActionText: {
    color: '#1F2937',
    fontWeight: '700',
  },

  // ===== New Comparison Modal Styles =====

  // Winner Banner
  winnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  winnerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  winnerTextWrap: {
    flex: 1,
  },
  winnerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  winnerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  winnerReason: {
    fontSize: 13,
    color: '#B45309',
  },

  // Tie Banner
  tieBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tieText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },

  // Score Cards
  scoreCardsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  scoreCardCompare: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  scoreCardWinner: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  scoreCardName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  scoreCardScore: {
    fontSize: 36,
    fontWeight: '800',
    color: '#374151',
  },
  scoreCardScoreWinner: {
    color: '#059669',
  },
  scoreCardLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // VS Circle
  vsCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  vsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },

  // Recommendations Section
  recsSection: {
    marginBottom: 24,
  },
  recsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  recIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recContent: {
    flex: 1,
    marginRight: 8,
  },
  recTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  recText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },

  // Quick Stats Section
  quickStatsSection: {
    marginBottom: 20,
  },
  quickStatsGrid: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  quickStatVal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    minWidth: 70,
  },
  quickStatValBetter: {
    color: '#059669',
    fontWeight: '700',
  },
  quickStatLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    flex: 1,
    textAlign: 'center',
  },
});

// Shareable components for screens
export { ComparisonModal, HistoryItem };
