import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker'; // 🆕 PHOTO UPLOAD
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useFoodAnalysis } from '../hooks/useFoodAnalysis';
import { useNotification } from '../providers/NotificationProvider';
import { SURFACES } from '../constants/premiumTheme';

export default function BarcodeScannerModal({ visible, onClose }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const foodAnalysis = useFoodAnalysis();
  const notify = useNotification();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const canUseCamera = useMemo(() => !!CameraView, []);

  useEffect(() => {
    if (visible && permission && !permission.granted) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  useEffect(() => {
    if (visible && !scanned && !foodAnalysis.isAnalyzing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
    }
  }, [visible, scanned, foodAnalysis.isAnalyzing, pulseAnim]);

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    notify.info(`Barcode scanned: ${data}`);

    try {
      await foodAnalysis.analyzeBarcode(data);
      onClose();
    } catch (error) {
      console.error('[BarcodeScannerModal] Barcode analysis error:', error);
      notify.error(`Failed to analyze barcode: ${error.message}`);
      setScanned(false);
    }
  };

  const handlePhotoUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        notify.info('Photo selected. Processing...');
      }
    } catch (error) {
      console.error('[BarcodeScannerModal] Photo picker error:', error);
      notify.error('Failed to open photo library');
    }
  };

  const handlePhotoScanned = async () => {
    if (!photoUri) return;
    setIsProcessingPhoto(true);

    try {
      // Try to extract barcode from photo using analyzePhoto
      // The backend will attempt barcode detection in the image
      await foodAnalysis.analyzePhoto(photoUri, null, null);
      notify.success('Photo analyzed successfully');
      onClose();
    } catch (error) {
      console.error('[BarcodeScannerModal] Photo analysis error:', error);
      notify.error(`Failed to analyze photo: ${error.message}`);
      setPhotoUri(null);
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleClearPhoto = () => {
    setPhotoUri(null);
  };

  if (!canUseCamera) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.centered}>
          <Ionicons name="camera-off" size={64} color="#DC2626" />
          <Text style={styles.permissionText}>Camera not available on this device.</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  if (!permission || permission.status === 'undetermined') {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6B4EFF" />
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.centered}>
          <Ionicons name="camera-off" size={64} color="#DC2626" />
          <Text style={styles.permissionText}>No access to camera. Please enable it in settings.</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  // Show photo preview if photo selected
  if (photoUri) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={30} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Barcode/Product Photo</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.photoPreviewContainer}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          </View>

          <Text style={styles.photoHint}>
            Photo selected. Tap &quot;Analyze&quot; to extract barcode or analyze product details.
          </Text>

          <View style={styles.photoActionContainer}>
            <TouchableOpacity
              style={[styles.photoButton, styles.analyzeButton]}
              onPress={handlePhotoScanned}
              disabled={isProcessingPhoto}
            >
              {isProcessingPhoto ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.photoButtonText}>
                {isProcessingPhoto ? 'Analyzing...' : 'Analyze Photo'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.photoButton, styles.clearButton]}
              onPress={handleClearPhoto}
              disabled={isProcessingPhoto}
            >
              <Ionicons name="close-circle-outline" size={20} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={[styles.photoButtonText, { color: '#DC2626' }]}>Change Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <CameraView
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e'],
          }}
        >
          <View style={styles.overlay}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={30} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Scan Barcode</Text>
            </View>

            <Animated.View
              style={[
                styles.scannerFrame,
                !scanned && !foodAnalysis.isAnalyzing && {
                  opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
                },
              ]}
            >
              {foodAnalysis.isAnalyzing ? (
                <View style={styles.analysisOverlay}>
                  <ActivityIndicator size="large" color="#FFFFFF" style={{ marginBottom: 10 }} />
                  <Text style={styles.analysisText}>Analyzing product...</Text>
                </View>
              ) : (
                <View>
                  <View style={styles.corner} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                </View>
              )}
            </Animated.View>

            <Text style={styles.scanInstruction}>Align the barcode within the frame</Text>
            <Text style={styles.scanInstruction}>
              <Ionicons name="scan-outline" size={20} color="#FFFFFF" />
              Scanning for barcodes...
            </Text>

            {scanned && !foodAnalysis.isAnalyzing && (
              <TouchableOpacity style={styles.rescanButton} onPress={() => setScanned(false)}>
                <LinearGradient
                  colors={['#6B4EFF', '#8B6EFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.rescanButtonGradient}
                >
                  <Ionicons name="scan-circle-outline" size={24} color="#FFFFFF" />
                  <Text style={styles.rescanButtonText}>Tap to Rescan</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {!scanned && (
              <TouchableOpacity style={styles.photoUploadButton} onPress={handlePhotoUpload}>
                <LinearGradient
                  colors={['#8B6EFF', '#A08FFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.photoUploadGradient}
                >
                  <Ionicons name="image-outline" size={24} color="#FFFFFF" />
                  <Text style={styles.photoUploadText}>Or Upload Photo</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </CameraView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 20 },
  permissionText: { marginTop: 20, fontSize: 16, textAlign: 'center', color: TEXT.primary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 40 },
  header: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  closeButton: { position: 'absolute', left: 20, padding: 5 },
  closeButtonText: { color: '#6B4EFF', fontSize: 16, fontWeight: 'bold' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  scannerFrame: {
    width: 260,
    height: 260,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  analysisOverlay: { alignItems: 'center', justifyContent: 'center' },
  analysisText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#FFFFFF',
    borderWidth: 4,
  },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
  scanInstruction: { color: SURFACES.divider, marginTop: 20, fontSize: 16, textAlign: 'center' },
  rescanButton: { marginTop: 20, borderRadius: 12, overflow: 'hidden' },
  rescanButtonGradient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
  rescanButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  // 🆕 PHOTO UPLOAD STYLES
  photoUploadButton: { marginTop: 12, borderRadius: 12, overflow: 'hidden' },
  photoUploadGradient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
  photoUploadText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  // 🆕 PHOTO PREVIEW STYLES
  photoPreviewContainer: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000', marginVertical: 20 },
  photoPreview: { width: '90%', height: '90%', borderRadius: 12, resizeMode: 'contain' },
  photoHint: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', paddingHorizontal: 20, marginBottom: 20 },
  photoActionContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 40 },
  photoButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  analyzeButton: { backgroundColor: '#6B4EFF' },
  clearButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DC2626' },
  photoButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
