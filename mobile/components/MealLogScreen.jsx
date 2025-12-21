import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import NutritionCard from '../components/NutritionCard';
import { Swipeable } from 'react-native-gesture-handler';

export default function MealLogScreen() {
  const [logs, setLogs] = useState([]);

  const loadLogs = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('meal_logs');
      const data = jsonValue != null ? JSON.parse(jsonValue) : [];
      setLogs(data.reverse()); // Show newest first
    } catch (e) {
      console.error("Failed to load logs", e);
    }
  };

  // Reload logs every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [])
  );

  const clearLogs = async () => {
    try {
      await AsyncStorage.removeItem('meal_logs');
      setLogs([]);
    } catch(e) {
      console.error("Failed to clear logs", e);
    }
  };

  const deleteLog = async (index) => {
    // 1. Create a copy of current logs
    const newLogs = [...logs];
    // 2. Remove the item at the specific index
    newLogs.splice(index, 1);
    // 3. Update state
    setLogs(newLogs);
    
    // 4. Update AsyncStorage (Note: logs state is reversed, so we reverse back for storage)
    try {
      const storageLogs = [...newLogs].reverse();
      await AsyncStorage.setItem('meal_logs', JSON.stringify(storageLogs));
    } catch (e) {
      console.error("Failed to delete log", e);
    }
  };

  const renderRightActions = (index) => {
    return (
      <TouchableOpacity style={styles.deleteButton} onPress={() => deleteLog(index)}>
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item, index }) => (
    <Swipeable renderRightActions={() => renderRightActions(index)}>
      <View style={styles.logItemContainer}>
        <Text style={styles.dateHeader}>
          {new Date(item.date).toLocaleDateString()} • {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {/* Reusing NutritionCard in read-only mode (no onSave prop passed) */}
        <NutritionCard data={item} />
      </View>
    </Swipeable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Meal History</Text>
        <TouchableOpacity onPress={clearLogs}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={logs}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No meals logged yet.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  clearText: {
    color: '#FF6B6B',
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  logItemContainer: {
    marginBottom: 10,
  },
  dateHeader: {
    fontSize: 14,
    color: '#666',
    marginLeft: 20,
    marginTop: 15,
    marginBottom: 5,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#999',
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '80%', // Approximate height to match card
    marginTop: 40, // Offset for date header
    borderRadius: 12,
    marginRight: 20,
  },
  deleteButtonText: { color: '#fff', fontWeight: 'bold' }
});