import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Simple Skeleton Component
const Skeleton = ({ width, height, style }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true })
      ])
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Animated.View style={[{ opacity, width, height, backgroundColor: '#E1E9EE', borderRadius: 4 }, style]} />;
};

export default function NutritionCard({ data, history, onSave, loading }) {
  const [activeTab, setActiveTab] = useState('details'); // 'details' or 'history'

  // Fallback data if props are missing
  const {
    foodName = 'Unknown Food',
    calories = 0,
    macros = { protein: 0, fat: 0, carbs: 0 },
    micros = [],
    ingredients = 'No ingredients detected.',
    healthScore = 0,
  } = data || {};

  const renderMacro = (label, value, color) => (
    <View style={styles.macroItem}>
      <Text style={[styles.macroValue, { color }]}>{value}g</Text>
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { backgroundColor: color, width: `${Math.min(value, 100)}%` }]} />
      </View>
    </View>
  );

  const renderHistoryChart = () => {
    if (!history || history.length === 0) return <Text style={styles.noDataText}>No history available.</Text>;
    
    const maxCal = Math.max(...history.map(h => h.calories)) || 2000;

    return (
      <View style={styles.chartContainer}>
        {history.map((item, index) => (
          <View key={index} style={styles.chartBarContainer}>
            <View style={[styles.chartBar, { height: (item.calories / maxCal) * 100, backgroundColor: item.calories > 500 ? '#FF6B6B' : '#4ECDC4' }]} />
            <Text style={styles.chartLabel}>{item.day}</Text>
            <Text style={styles.chartValue}>{item.calories}</Text>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View>
            <Skeleton width={150} height={24} style={{ marginBottom: 8 }} />
            <Skeleton width={100} height={32} />
          </View>
          <Skeleton width={60} height={30} style={{ borderRadius: 12 }} />
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 20 }}>
          <Skeleton width={80} height={30} style={{ marginRight: 20 }} />
          <Skeleton width={80} height={30} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          <Skeleton width={80} height={60} /><Skeleton width={80} height={60} /><Skeleton width={80} height={60} />
        </View>
        <Skeleton width={'100%'} height={100} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.foodName}>{foodName}</Text>
          <Text style={styles.calories}>{calories} <Text style={styles.calLabel}>kcal</Text></Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: healthScore > 7 ? '#4ECDC4' : '#FFE66D' }]}>
          <Text style={styles.scoreText}>{healthScore}/10</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity onPress={() => setActiveTab('details')} style={[styles.tab, activeTab === 'details' && styles.activeTab]}>
          <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>Nutrition</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('history')} style={[styles.tab, activeTab === 'history' && styles.activeTab]}>
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'details' ? (
          <>
            <View style={styles.macrosContainer}>
              {renderMacro('Protein', macros.protein, '#FF6B6B')}
              {renderMacro('Carbs', macros.carbs, '#4ECDC4')}
              {renderMacro('Fat', macros.fat, '#FFE66D')}
            </View>

            <Text style={styles.sectionTitle}>Micronutrients</Text>
            <View style={styles.microsContainer}>
              {micros.length > 0 ? micros.map((m, i) => (
                <View key={i} style={styles.microChip}>
                  <Text style={styles.microText}>{m}</Text>
                </View>
              )) : <Text style={styles.subText}>No micronutrient data.</Text>}
            </View>

            <Text style={styles.sectionTitle}>Ingredients</Text>
            <Text style={styles.ingredientsText}>{ingredients}</Text>
          </>
        ) : (
          <View style={styles.historyContainer}>
            <Text style={styles.sectionTitle}>Calorie Trend (Last 7 Entries)</Text>
            {renderHistoryChart()}
          </View>
        )}
      </View>

      {/* Save Button */}
      {onSave && (
        <TouchableOpacity style={styles.saveButton} onPress={onSave}>
          <Text style={styles.saveButtonText}>Save to Log</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: SCREEN_WIDTH - 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    alignSelf: 'center',
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  foodName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  calories: {
    fontSize: 28,
    fontWeight: '800',
    color: '#333',
  },
  calLabel: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#666',
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scoreText: {
    fontWeight: 'bold',
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    marginRight: 20,
    paddingBottom: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#333',
  },
  tabText: {
    fontSize: 16,
    color: '#999',
  },
  activeTabText: {
    color: '#333',
    fontWeight: '600',
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  macroItem: {
    width: '30%',
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    marginTop: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  microsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  microChip: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
    paddingTop: 20,
  },
  chartBarContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  chartBar: {
    width: 12,
    borderRadius: 6,
    marginBottom: 5,
  },
  chartLabel: {
    fontSize: 12,
    color: '#999',
  },
  chartValue: {
    fontSize: 10,
    color: '#333',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#333',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});