import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, SURFACES, TYPOGRAPHY } from '../../constants/premiumTheme';

export const NutrientTrendsModal = ({ visible, onClose, nutrient, trends, goals }) => {
  if (!visible || !nutrient) return null;

  const getNutrientLabel = (n) => {
    switch(n) {
      case 'calories': return 'Calories';
      case 'protein': return 'Protein';
      case 'carbs': return 'Carbs';
      case 'fat': return 'Fat';
      default: return n;
    }
  };

  const getNutrientUnit = (n) => {
    return n === 'calories' ? 'kcal' : 'g';
  };

  const getNutrientColor = (n) => {
    switch(n) {
      case 'calories': return '#3B82F6';
      case 'protein': return '#10B981';
      case 'carbs': return '#F59E0B';
      case 'fat': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getKey = (n) => {
    switch(n) {
      case 'calories': return 'totalCalories';
      case 'protein': return 'totalProtein';
      case 'carbs': return 'totalCarbs';
      case 'fat': return 'totalFats';
      default: return n;
    }
  };

  const getGoal = (n) => {
    if (!goals) return 0;
    switch(n) {
      case 'calories': return goals.dailyCalories || 2000;
      case 'protein': return goals.proteinG || 150;
      case 'carbs': return goals.carbsG || 250;
      case 'fat': return goals.fatG || 65;
      default: return 0;
    }
  };

  const dataKey = getKey(nutrient);
  const goalValue = getGoal(nutrient);
  const color = getNutrientColor(nutrient);
  const label = getNutrientLabel(nutrient);
  const unit = getNutrientUnit(nutrient);

  // Process last 7 days
  const chartData = (trends || []).slice(-7).map(day => ({
    date: new Date(day.date),
    value: parseFloat(day[dataKey] || 0),
    label: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })
  }));

  const maxValue = Math.max(...chartData.map(d => d.value), goalValue) * 1.1 || 100;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{label} Trends</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={TEXT.tertiary} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.subtitle}>Last 7 Days</Text>
            
            <View style={styles.chartContainer}>
              {/* Goal Line */}
              <View style={[styles.goalLine, { bottom: (goalValue / maxValue) * 200 }]} />
              <Text style={[styles.goalLabel, { bottom: (goalValue / maxValue) * 200 + 4 }]}>
                Goal: {Math.round(goalValue)}{unit}
              </Text>

              <View style={styles.barsContainer}>
                {chartData.map((day, index) => (
                  <View key={index} style={styles.barGroup}>
                    <View style={styles.barTrack}>
                      <View 
                        style={[
                          styles.bar, 
                          { 
                            height: (day.value / maxValue) * 200,
                            backgroundColor: color 
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.dayLabel}>{day.label}</Text>
                    <Text style={styles.valueLabel}>{Math.round(day.value)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: SURFACES.card.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: SURFACES.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 450,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: TYPOGRAPHY.size.xl,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginBottom: 32,
  },
  chartContainer: {
    height: 240,
    position: 'relative',
    marginBottom: 20,
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: TEXT.tertiary,
    opacity: 0.5,
    zIndex: 1,
  },
  goalLabel: {
    position: 'absolute',
    right: 0,
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    zIndex: 1,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 200,
  },
  barGroup: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    height: 200,
    justifyContent: 'flex-end',
    width: '100%',
    alignItems: 'center',
  },
  bar: {
    width: 12,
    borderRadius: 6,
    minHeight: 4,
  },
  dayLabel: {
    marginTop: 8,
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },
  valueLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: 2,
  },
});