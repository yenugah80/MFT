import React, { useState, useCallback } from 'react';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, Button, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Import your screens
import OCRScanner from './components/OCRScanner';
import MealLogScreen from './components/MealLogScreen';
import ProfileScreen from './components/ProfileScreen';

const Stack = createNativeStackNavigator();

function DashboardScreen({ navigation }) {
  const [dailyCalories, setDailyCalories] = useState(0);
  const [calorieGoal, setCalorieGoal] = useState(2000);

  useFocusEffect(
    useCallback(() => {
      const fetchDailyCalories = async () => {
        try {
          const jsonValue = await AsyncStorage.getItem('meal_logs');
          const logs = jsonValue != null ? JSON.parse(jsonValue) : [];
          const today = new Date().toDateString();
          const total = logs
            .filter(log => new Date(log.date).toDateString() === today)
            .reduce((sum, log) => sum + (log.calories || 0), 0);
          setDailyCalories(total);

          // Fetch Goal
          const savedGoal = await AsyncStorage.getItem('user_goal');
          if (savedGoal) setCalorieGoal(parseInt(savedGoal, 10));
        } catch (e) {
          console.error(e);
        }
      };
      fetchDailyCalories();
    }, [])
  );

  const progressPercent = Math.min((dailyCalories / calorieGoal) * 100, 100);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MFT 🍎</Text>
      
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Today's Calories</Text>
        <Text style={styles.summaryValue}>{dailyCalories} <Text style={styles.summaryUnit}>/ {calorieGoal} kcal</Text></Text>
        
        {/* Progress Bar */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: progressPercent > 100 ? '#FF6B6B' : '#4ECDC4' }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(progressPercent)}% of daily goal</Text>
      </View>

      <Text style={styles.subtitle}>What would you like to do?</Text>
      
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => navigation.navigate('Scanner')}
      >
        <Text style={styles.cardTitle}>📸 Log Meal (AI Scanner)</Text>
        <Text style={styles.cardDesc}>Scan food labels or take photos to log meals instantly.</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.card} 
        onPress={() => navigation.navigate('History')}
      >
        <Text style={styles.cardTitle}>📅 View History</Text>
        <Text style={styles.cardDesc}>Check your daily nutrition stats and past meals.</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.card} 
        onPress={() => navigation.navigate('Profile')}
      >
        <Text style={styles.cardTitle}>👤 User Profile</Text>
        <Text style={styles.cardDesc}>Set your daily calorie goals and preferences.</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Dashboard">
          <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Overview' }} />
          <Stack.Screen name="Scanner" component={OCRScanner} options={{ title: 'AI Food Scanner' }} />
          <Stack.Screen name="History" component={MealLogScreen} options={{ title: 'Meal Logs' }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#f8f9fa' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 40, textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    width: '100%',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5, color: '#222' },
  cardDesc: { fontSize: 14, color: '#666' },
  summaryCard: {
    backgroundColor: '#333',
    width: '100%',
    padding: 25,
    borderRadius: 20,
    marginBottom: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  summaryLabel: { color: '#ccc', fontSize: 16, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 },
  summaryValue: { color: '#fff', fontSize: 48, fontWeight: '800' },
  summaryUnit: { fontSize: 18, fontWeight: 'normal', color: '#4ECDC4' },
  progressBarBg: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 5,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressText: {
    color: '#ccc', fontSize: 12, marginTop: 8
  }
});