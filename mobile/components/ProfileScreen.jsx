import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen({ navigation }) {
  const [goal, setGoal] = useState('2000');

  useEffect(() => {
    loadGoal();
  }, []);

  const loadGoal = async () => {
    try {
      const savedGoal = await AsyncStorage.getItem('user_goal');
      if (savedGoal) setGoal(savedGoal);
    } catch (e) {
      console.error("Failed to load goal", e);
    }
  };

  const saveGoal = async () => {
    try {
      await AsyncStorage.setItem('user_goal', goal);
      Alert.alert('Success', 'Daily calorie goal updated!');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to save goal.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set Your Goals 🎯</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Daily Calorie Goal (kcal)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={goal}
          onChangeText={setGoal}
          placeholder="e.g. 2000"
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveGoal}>
        <Text style={styles.saveButtonText}>Save Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30, color: '#333' },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 16, color: '#666', marginBottom: 10 },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 10, fontSize: 18, borderWidth: 1, borderColor: '#ddd' },
  saveButton: { backgroundColor: '#333', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});