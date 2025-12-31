import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Picker } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen({ navigation }) {
  const [goal, setGoal] = useState('2000');
  // 🆕 REGIONAL CONTEXT STATE
  const [cuisinePreference, setCuisinePreference] = useState('');
  const [region, setRegion] = useState('');
  const [cookingStyle, setCookingStyle] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const savedGoal = await AsyncStorage.getItem('user_goal');
      if (savedGoal) setGoal(savedGoal);

      // 🆕 LOAD REGIONAL PREFERENCES
      const savedCuisine = await AsyncStorage.getItem('cuisine_preference');
      if (savedCuisine) setCuisinePreference(savedCuisine);

      const savedRegion = await AsyncStorage.getItem('user_region');
      if (savedRegion) setRegion(savedRegion);

      const savedCookingStyle = await AsyncStorage.getItem('cooking_style');
      if (savedCookingStyle) setCookingStyle(savedCookingStyle);
    } catch (e) {
      console.error("Failed to load profile", e);
    }
  };

  const saveProfile = async () => {
    try {
      await AsyncStorage.setItem('user_goal', goal);
      // 🆕 SAVE REGIONAL PREFERENCES
      if (cuisinePreference) {
        await AsyncStorage.setItem('cuisine_preference', cuisinePreference);
      }
      if (region) {
        await AsyncStorage.setItem('user_region', region);
      }
      if (cookingStyle) {
        await AsyncStorage.setItem('cooking_style', cookingStyle);
      }
      Alert.alert('Success', 'Profile updated! Your food analysis will be tailored to your preferences.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to save profile.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Set Your Goals 🎯</Text>

      {/* Nutrition Goals */}
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

      {/* 🆕 CUISINE PREFERENCE */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>🍛 Primary Cuisine</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={cuisinePreference}
            onValueChange={setCuisinePreference}
            style={styles.picker}
          >
            <Picker.Item label="Select your primary cuisine..." value="" />
            <Picker.Item label="South Indian" value="South Indian" />
            <Picker.Item label="North Indian" value="North Indian" />
            <Picker.Item label="American" value="American" />
            <Picker.Item label="Italian" value="Italian" />
            <Picker.Item label="Mexican" value="Mexican" />
            <Picker.Item label="Chinese" value="Chinese" />
            <Picker.Item label="Mediterranean" value="Mediterranean" />
            <Picker.Item label="Asian Fusion" value="Asian Fusion" />
          </Picker>
        </View>
        <Text style={styles.hint}>
          Helps us provide accurate nutrition for your preferred cuisines
        </Text>
      </View>

      {/* 🆕 REGION */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>📍 Your Region</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={region}
            onValueChange={setRegion}
            style={styles.picker}
          >
            <Picker.Item label="Select your region..." value="" />
            <Picker.Item label="India" value="India" />
            <Picker.Item label="USA" value="USA" />
            <Picker.Item label="UK" value="UK" />
            <Picker.Item label="Canada" value="Canada" />
            <Picker.Item label="Australia" value="Australia" />
            <Picker.Item label="Other" value="Other" />
          </Picker>
        </View>
        <Text style={styles.hint}>
          Enables region-aware portion sizing and ingredient recommendations
        </Text>
      </View>

      {/* 🆕 COOKING STYLE */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>👨‍🍳 Cooking Style</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={cookingStyle}
            onValueChange={setCookingStyle}
            style={styles.picker}
          >
            <Picker.Item label="Select your cooking style..." value="" />
            <Picker.Item label="Home-style" value="home-style" />
            <Picker.Item label="Restaurant-style" value="restaurant-style" />
            <Picker.Item label="Healthy/Light" value="healthy-light" />
            <Picker.Item label="Mixed" value="mixed" />
          </Picker>
        </View>
        <Text style={styles.hint}>
          Affects portion estimation and cooking method detection
        </Text>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
        <Text style={styles.saveButtonText}>Save Profile</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30, color: '#333' },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 16, color: '#666', marginBottom: 10, fontWeight: '600' },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 10, fontSize: 18, borderWidth: 1, borderColor: '#ddd' },

  // 🆕 PICKER STYLES
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
    marginBottom: 8,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  hint: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 6,
  },

  saveButton: { backgroundColor: '#333', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 30, marginBottom: 20 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});