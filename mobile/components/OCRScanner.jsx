import React, { useState, useEffect } from 'react';
import { View, Button, Image, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import ExpoMlkitOcr from 'expo-mlkit-ocr';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NutritionCard from './NutritionCard';
import { API_URL } from '../constants/api';

export default function OCRScanner({ navigation }) {
  const [image, setImage] = useState(null);
  const [textBlocks, setTextBlocks] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false); // Added loading state
  const [editableText, setEditableText] = useState('');
  const [imageLayout, setImageLayout] = useState({ width: 1, height: 1 }); // Original image dims
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [nutritionData, setNutritionData] = useState(null);

  const pickImage = async () => {
    setError(null);
    setEditableText('');
    setTextBlocks([]);
    setNutritionData(null);
    setSelectedIndices(new Set());
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, // Enable cropping
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
      setImageLayout({ width: result.assets[0].width, height: result.assets[0].height });
      runOcr(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    setError(null);
    setEditableText('');
    setTextBlocks([]);
    setNutritionData(null);
    setSelectedIndices(new Set());

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You've refused to allow this app to access your camera!");
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
      setImageLayout({ width: result.assets[0].width, height: result.assets[0].height });
      runOcr(result.assets[0].uri);
    }
  };

  const runOcr = async (uri) => {
    setLoading(true);
    try {
      const ocrResult = await ExpoMlkitOcr.recognizeText(uri);

      // Transform expo-mlkit-ocr response to expected format
      // API returns: { text, blocks: [{ text, lines, cornerPoints }] }
      // We need blocks with calculated bounding boxes
      const transformedBlocks = (ocrResult.blocks || []).map(block => {
        // Calculate bounding box from cornerPoints
        const cornerPoints = block.cornerPoints || [];
        let boundingBox = { x: 0, y: 0, width: 0, height: 0 };

        if (cornerPoints.length === 4) {
          const xCoords = cornerPoints.map(p => p.x);
          const yCoords = cornerPoints.map(p => p.y);
          const minX = Math.min(...xCoords);
          const minY = Math.min(...yCoords);
          const maxX = Math.max(...xCoords);
          const maxY = Math.max(...yCoords);

          boundingBox = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
          };
        }

        return {
          text: block.text || '',
          frame: boundingBox, // Provide as 'frame' for compatibility
          boundingBox: boundingBox,
          cornerPoints: cornerPoints,
        };
      });

      setTextBlocks(transformedBlocks);
      // Default: Select all detected text
      const allIndices = new Set(transformedBlocks.map((_, i) => i));
      setSelectedIndices(allIndices);
    } catch (e) {
      setError(e.message || 'OCR failed');
    } finally {
      setLoading(false);
    }
  };

  // Update editable text whenever selection changes
  useEffect(() => {
    const selectedText = textBlocks
      .filter((_, index) => selectedIndices.has(index))
      .map(block => block.text)
      .join('\n');
    setEditableText(selectedText);
  }, [selectedIndices, textBlocks]);

  const toggleSelection = (index) => {
    const newSelection = new Set(selectedIndices);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedIndices(newSelection);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/analyze-ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: editableText,
          userContext: 'nutrition_label',
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch analysis');
      
      const data = await response.json();
      setNutritionData(data);
    } catch (err) {
      console.error(err);
      setError('Failed to analyze nutrition data. Please check your server connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLog = async () => {
    if (!nutritionData) return;
    try {
      const existingLogs = await AsyncStorage.getItem('meal_logs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      const newLog = { ...nutritionData, date: new Date().toISOString(), imageUri: image };
      logs.push(newLog);
      await AsyncStorage.setItem('meal_logs', JSON.stringify(logs));
      Alert.alert(
        "Success", 
        "Meal saved to your log!",
        [
          { text: "Keep Scanning", style: "cancel" },
          { text: "View Log", onPress: () => navigation.navigate('History') }
        ]
      );
    } catch (e) {
      Alert.alert("Error", "Failed to save meal.");
    }
  };

  // Calculate scaling for overlay
  const displayWidth = 300;
  const scaleFactor = displayWidth / imageLayout.width;
  const displayHeight = imageLayout.height * scaleFactor;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.actionButtons}>
        <Button title="📷 Camera" onPress={takePhoto} />
        <View style={{ width: 20 }} /> 
        <Button title="🖼️ Gallery" onPress={pickImage} />
      </View>
      
      {image && (
        <View style={[styles.imageContainer, { width: displayWidth, height: displayHeight }]}>
          <Image source={{ uri: image }} style={[styles.image, { width: displayWidth, height: displayHeight }]} />
          {textBlocks.map((block, index) => {
            // MLKit frame: { x, y, width, height } (or boundingBox depending on version)
            const frame = block.frame || block.boundingBox; 
            if (!frame) return null;
            
            return (
              <TouchableOpacity
                key={index}
                onPress={() => toggleSelection(index)}
                style={[
                  styles.boundingBox,
                  {
                    left: frame.x * scaleFactor,
                    top: frame.y * scaleFactor,
                    width: frame.width * scaleFactor,
                    height: frame.height * scaleFactor,
                    borderColor: selectedIndices.has(index) ? '#00ff00' : 'rgba(255, 0, 0, 0.5)',
                    backgroundColor: selectedIndices.has(index) ? 'rgba(0, 255, 0, 0.2)' : 'transparent',
                  }
                ]}
              />
            );
          })}
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      
      {!loading && !nutritionData && editableText.length > 0 && (
        <View style={styles.textBlockContainer}>
          <Text style={styles.heading}>Review & Correct Text:</Text>
          <TextInput
            style={styles.editableInput}
            multiline
            value={editableText}
            onChangeText={setEditableText}
          />
          <Button title="Analyze Nutrition" onPress={handleAnalyze} />
        </View>
      )}

      {(loading || nutritionData) && (
        <NutritionCard data={nutritionData} onSave={handleSaveLog} loading={loading} />
      )}

      <View style={styles.footerNav}>
        <Button title="View Meal History" onPress={() => navigation.navigate('History')} color="#666" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 20,
    backgroundColor: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  imageContainer: {
    marginVertical: 20,
    position: 'relative', // Needed for absolute positioning of boxes
  },
  image: {
    resizeMode: 'contain',
    borderRadius: 12,
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 4,
  },
  textBlockContainer: {
    marginTop: 20,
    width: '100%',
  },
  heading: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 10,
  },
  editableInput: {
    fontSize: 16,
    color: '#222',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 20,
    borderRadius: 8,
    minHeight: 100,
  },
  error: {
    color: 'red',
    marginTop: 10,
  },
  loadingIndicator: {
    marginTop: 20,
    marginBottom: 10,
  },
  footerNav: {
    marginTop: 30,
  },
});
