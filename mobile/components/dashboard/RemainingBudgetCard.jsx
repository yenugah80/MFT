/**
 * RemainingBudgetCard - Compact, actionable daily nutrition budget
 * Fixes:
 * - Shows actual remaining (negative for overage, not hidden with 0)
 * - Time context (hours remaining in day)
 * - Smart severity-based insights
 * - Inline goal editing
 * - Compact layout to reduce redundancy with other cards
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BRAND, SURFACES, TEXT, SPACING, SHADOWS } from '../../constants/premiumTheme';

export default function RemainingBudgetCard({ today = {}, goals = {}, onGoalsUpdate = () => {} }) {
  const nutrition = today?.nutrition || {};
  const waterIntake = today?.waterIntakeLiters || 0;
  const [editingGoal, setEditingGoal] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Get hours remaining in day
  const getHoursRemaining = () => {
    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const hours = Math.ceil((endOfDay - now) / (1000 * 60 * 60));
    return Math.max(0, hours);
  };

  // Calculate remaining budget - NOW SHOWS NEGATIVE FOR OVERAGE
  const budgets = useMemo(() => {
    const dailyCalories = goals?.dailyCalories || 2000;
    const proteinG = goals?.proteinG || 150;
    const carbsG = goals?.carbsG || 225;
    const fatsG = goals?.fatsG || 65;
    const waterLiters = goals?.waterLiters || 2.0;

    const consumedCalories = nutrition?.totalCalories || 0;
    const consumedProtein = nutrition?.totalProtein || 0;
    const consumedCarbs = nutrition?.totalCarbs || 0;
    const consumedFats = nutrition?.totalFats || 0;

    const caloriesRemaining = dailyCalories - consumedCalories;
    const proteinRemaining = proteinG - consumedProtein;
    const carbsRemaining = carbsG - consumedCarbs;
    const fatsRemaining = fatsG - consumedFats;
    const waterRemaining = waterLiters - waterIntake;

    return {
      calories: {
        remaining: caloriesRemaining,
        total: dailyCalories,
        consumed: consumedCalories,
        percent: Math.min(100, Math.max(0, (consumedCalories / dailyCalories) * 100)),
        isOver: caloriesRemaining < 0,
        overage: Math.abs(Math.min(0, caloriesRemaining)),
      },
      protein: {
        remaining: proteinRemaining,
        total: proteinG,
        consumed: consumedProtein,
        percent: Math.min(100, Math.max(0, (consumedProtein / proteinG) * 100)),
        isOver: proteinRemaining < 0,
      },
      carbs: {
        remaining: carbsRemaining,
        total: carbsG,
        consumed: consumedCarbs,
        percent: Math.min(100, Math.max(0, (consumedCarbs / carbsG) * 100)),
        isOver: carbsRemaining < 0,
      },
      fats: {
        remaining: fatsRemaining,
        total: fatsG,
        consumed: consumedFats,
        percent: Math.min(100, Math.max(0, (consumedFats / fatsG) * 100)),
        isOver: fatsRemaining < 0,
      },
      water: {
        remaining: waterRemaining,
        total: waterLiters,
        consumed: waterIntake,
        percent: Math.min(100, Math.max(0, (waterIntake / waterLiters) * 100)),
        isOver: waterRemaining < 0,
      },
    };
  }, [nutrition, goals]);

  // Determine status with time awareness
  const getStatus = () => {
    const hours = getHoursRemaining();
    const caloriesRemaining = budgets.calories.remaining;
    const caloriesNeeded = budgets.calories.total;

    if (caloriesRemaining < 0) {
      const overage = Math.abs(caloriesRemaining);
      if (overage > caloriesNeeded * 0.25) return { level: 'critical', label: '🔴 Over Budget', color: '#EF4444' };
      return { level: 'warning', label: '🟡 Slightly Over', color: '#F59E0B' };
    }

    const avgPerHour = caloriesNeeded / 24;
    const expectedRemaining = caloriesNeeded - (avgPerHour * (24 - hours));

    if (caloriesRemaining < expectedRemaining - 200) {
      return { level: 'warning', label: '🟡 Behind Pace', color: '#F59E0B' };
    }
    if (caloriesRemaining < 300) {
      return { level: 'caution', label: '🟢 Getting Close', color: '#10B981' };
    }
    return { level: 'good', label: '🟢 On Track', color: '#10B981' };
  };

  // Generate smart insights based on actual patterns
  const generateInsights = () => {
    const insights = [];
    const hours = getHoursRemaining();

    // Calorie pacing insight
    if (budgets.calories.isOver && hours < 12) {
      insights.push({
        type: 'critical',
        icon: 'alert-circle',
        text: `Over by ${Math.round(budgets.calories.overage)} kcal - reduce intake for rest of day`,
      });
    } else if (budgets.calories.remaining < 300 && hours > 4) {
      insights.push({
        type: 'warning',
        icon: 'warning',
        text: `Only ${Math.round(budgets.calories.remaining)} kcal left - eat small portions`,
      });
    } else if (budgets.calories.remaining > budgets.calories.total * 0.4 && hours < 6) {
      insights.push({
        type: 'info',
        icon: 'bulb',
        text: `${Math.round(budgets.calories.remaining)} kcal to use - eat regularly`,
      });
    }

    // Macro feasibility check
    if (budgets.calories.remaining > 0 && budgets.protein.remaining > 50) {
      const proteinPerCalorie = budgets.protein.remaining / budgets.calories.remaining;
      if (proteinPerCalorie > 0.5) { // More than 0.5g protein per calorie is hard
        insights.push({
          type: 'warning',
          icon: 'barbell',
          text: `Need ${Math.round(budgets.protein.remaining)}g protein in ${Math.round(budgets.calories.remaining)} kcal - difficult goal`,
        });
      }
    }

    // Under-eating warning
    if (budgets.calories.consumed < budgets.calories.total * 0.4 && hours < 12) {
      insights.push({
        type: 'warning',
        icon: 'alert-circle',
        text: `Only ${Math.round(budgets.calories.consumed)} kcal eaten - eat more regularly`,
      });
    }

    // Water intake reminder
    if (budgets.water.remaining > 1 && hours < 4) {
      insights.push({
        type: 'info',
        icon: 'water',
        text: `${Math.round(budgets.water.remaining * 10) / 10}L of water needed in next few hours`,
      });
    }

    return insights;
  };

  const insights = generateInsights();
  const status = getStatus();
  const hoursRemaining = getHoursRemaining();

  const handleEditGoal = (goalName) => {
    setEditingGoal(goalName);
    setEditValue(String(Math.round(goals[goalName] || 0)));
  };

  const saveGoalEdit = () => {
    if (!editingGoal || !editValue) return;
    const newValue = parseInt(editValue, 10);
    if (isNaN(newValue) || newValue <= 0) {
      Alert.alert('Invalid', 'Please enter a valid number');
      return;
    }
    onGoalsUpdate({ [editingGoal]: newValue });
    setEditingGoal(null);
  };

  const MacroSummary = ({ label, macro, unit, icon }) => (
    <TouchableOpacity
      style={styles.macroItem}
      onPress={() => handleEditGoal(macro)}
      activeOpacity={0.7}
    >
      <View style={styles.macroContent}>
        <Ionicons name={icon} size={14} color={TEXT.secondary} />
        <View style={styles.macroText}>
          <Text style={styles.macroLabel}>{label}</Text>
          <Text style={[styles.macroValue, { color: budgets[macro]?.isOver ? '#EF4444' : TEXT.primary }]}>
            {Math.round(budgets[macro]?.consumed || 0)}{unit}
          </Text>
        </View>
      </View>
      <Text style={styles.macroGoal}>
        {Math.round(Math.abs(budgets[macro]?.remaining || 0))}{unit}
      </Text>
      <Ionicons name="pencil" size={12} color={TEXT.secondary} style={{ marginLeft: SPACING.xs }} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[SURFACES.gradient.secondary[0], SURFACES.gradient.secondary[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Compact Header with Status */}
        <View style={styles.headerSection}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Daily Budget</Text>
            <Text style={[styles.statusBadge, { color: status.color }]}>
              {status.label}
            </Text>
          </View>

          {/* Primary Metric: Calories with Time Context */}
          <View style={styles.primaryMetric}>
            <Text style={styles.calorieValue}>
              {Math.round(budgets.calories.consumed)}
              <Text style={styles.calorieMax}>/{Math.round(budgets.calories.total)}</Text>
            </Text>
            <Text style={styles.caloriePercent}>
              {Math.round(budgets.calories.percent)}% · {hoursRemaining}h left
            </Text>
          </View>

          {/* Calorie Progress Bar */}
          <View style={styles.progressContainer}>
            <LinearGradient
              colors={budgets.calories.isOver ? ['#FCA5A5', '#EF4444'] : [BRAND.primary, BRAND.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressBar,
                { width: `${budgets.calories.percent}%` },
              ]}
            />
          </View>
        </View>

        {/* Macro Summary Grid */}
        <View style={styles.macroGrid}>
          <MacroSummary label="Protein" macro="protein" unit="g" icon="barbell-outline" />
          <MacroSummary label="Carbs" macro="carbs" unit="g" icon="nutrition-outline" />
          <MacroSummary label="Fats" macro="fats" unit="g" icon="flame-outline" />
          <MacroSummary label="Water" macro="water" unit="L" icon="water" />
        </View>

        {/* Smart Insights */}
        {insights.length > 0 && (
          <View style={styles.insightsSection}>
            {insights.map((insight, idx) => (
              <View key={idx} style={[styles.insight, { borderLeftColor: insight.type === 'critical' ? '#EF4444' : insight.type === 'warning' ? '#F59E0B' : '#3B82F6' }]}>
                <Ionicons
                  name={`${insight.icon}-outline`}
                  size={16}
                  color={insight.type === 'critical' ? '#EF4444' : insight.type === 'warning' ? '#F59E0B' : '#3B82F6'}
                />
                <Text style={styles.insightText}>{insight.text}</Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>

      {/* Goal Edit Modal */}
      <Modal visible={!!editingGoal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit {editingGoal === 'dailyCalories' ? 'Calorie' : editingGoal} Goal</Text>
            <TextInput
              style={styles.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              keyboardType="number-pad"
              placeholder="Enter value"
              placeholderTextColor={TEXT.secondary}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: BRAND.primary }]}
                onPress={() => setEditingGoal(null)}
              >
                <Text style={{ color: BRAND.primary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: BRAND.primary }]}
                onPress={saveGoalEdit}
              >
                <Text style={{ color: TEXT.white, fontWeight: '600' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    marginVertical: SPACING.md,
  },
  card: {
    borderRadius: 16,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  // Header Section
  headerSection: {
    marginBottom: SPACING.lg,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.white,
  },
  statusBadge: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Primary Metric (Calories)
  primaryMetric: {
    marginBottom: SPACING.md,
  },
  calorieValue: {
    fontSize: 32,
    fontWeight: '700',
    color: TEXT.white,
  },
  calorieMax: {
    fontSize: 18,
    fontWeight: '500',
    color: TEXT.onPurpleSecondary,  // Better contrast than TEXT.secondary on purple
  },
  caloriePercent: {
    fontSize: 13,
    color: TEXT.onPurpleSecondary,  // Better contrast on purple background
    marginTop: SPACING.xs,
  },
  // Progress Bar
  progressContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  // Macro Grid
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  macroItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
  macroContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  macroText: {
    flex: 1,
  },
  macroLabel: {
    fontSize: 11,
    color: TEXT.onPurpleSecondary,  // Better contrast on purple background
    fontWeight: '500',
  },
  macroValue: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT.white,
  },
  macroGoal: {
    fontSize: 11,
    color: TEXT.onPurpleSecondary,  // Better contrast on purple background
    fontWeight: '600',
    minWidth: 30,
  },
  // Insights Section
  insightsSection: {
    gap: SPACING.sm,
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: SPACING.sm,
    gap: SPACING.sm,
    borderLeftWidth: 3,
  },
  insightText: {
    fontSize: 12,
    color: TEXT.onPurpleSecondary,  // Better contrast on purple background
    flex: 1,
    lineHeight: 16,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: SURFACES.card,
    borderRadius: 16,
    padding: SPACING.lg,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.primary,
    marginBottom: SPACING.md,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: BRAND.primary,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: 16,
    color: TEXT.primary,
    marginBottom: SPACING.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
});
