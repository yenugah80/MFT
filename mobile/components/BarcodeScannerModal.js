import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated, Image, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useNotification } from '../providers/NotificationProvider';
import { SURFACES, TEXT, SEMANTIC_ACTIONS, BRAND, TYPOGRAPHY } from '../constants/premiumTheme';

/**
 * BarcodeScannerModal - Scans barcodes and analyzes products
 *
 * IMPORTANT: foodAnalysis must be passed as a prop from the parent screen
 * to ensure the analysis result is stored in the same hook instance.
 *
 * @param {boolean} visible - Whether the modal is visible
 * @param {function} onClose - Callback when modal closes
 * @param {object} foodAnalysis - The useFoodAnalysis hook instance from parent
 * @param {function} onScanSuccess - Optional callback after successful scan (to set analysisSource)
 */
export default function BarcodeScannerModal({ visible, onClose, foodAnalysis, onScanSuccess }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  // Fallback states for when barcode is not found
  const [notFoundBarcode, setNotFoundBarcode] = useState(null);
  const [productName, setProductName] = useState('');
  const [isFallbackAnalyzing, setIsFallbackAnalyzing] = useState(false);
  // Error state for on-screen display
  const [errorMessage, setErrorMessage] = useState(null);
  const notify = useNotification();
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulseAnimRef = useRef(null); // Store animation reference to prevent memory leaks

  // Barcode validation: must be 8-14 digits
  const isValidBarcode = useMemo(() => /^[0-9]{8,14}$/.test(manualBarcode.trim()), [manualBarcode]);

  // Product name validation: at least 2 characters
  const isValidProductName = useMemo(() => productName.trim().length >= 2, [productName]);

  useEffect(() => {
    if (visible && permission && !permission.granted) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  // Pulse animation with proper cleanup to prevent memory leaks
  useEffect(() => {
    if (visible && !scanned && !foodAnalysis?.isAnalyzing) {
      pulseAnimRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulseAnimRef.current.start();
    } else if (pulseAnimRef.current) {
      pulseAnimRef.current.stop();
      pulseAnim.setValue(0);
    }

    // Cleanup on unmount
    return () => {
      if (pulseAnimRef.current) {
        pulseAnimRef.current.stop();
      }
    };
  }, [visible, scanned, foodAnalysis?.isAnalyzing, pulseAnim]);

  // Helper to detect "not found" errors from various sources
  const isNotFoundError = (error) => {
    const msg = (error?.message || error?.toString() || '').toLowerCase();
    return (
      msg.includes('no product found') ||
      msg.includes('product not found') ||
      msg.includes('not found for this barcode') ||
      msg.includes('404')
    );
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned || !foodAnalysis) return;
    setScanned(true);
    notify.info(`Barcode scanned: ${data}`);

    try {
      await foodAnalysis.analyzeBarcode(data);
      // Notify parent of successful scan (to set analysisSource)
      if (onScanSuccess) {
        onScanSuccess('barcode');
      }
      onClose();
    } catch (error) {
      console.error('[BarcodeScannerModal] Barcode analysis error:', error);
      // Check if it's a "not found" error - show fallback UI instead of just error
      if (isNotFoundError(error)) {
        setNotFoundBarcode(data);
        notify.info('Product not in database. Enter the name to analyze.');
      } else {
        const errMsg = error.message || 'Unknown error analyzing barcode';
        setErrorMessage(errMsg);
        notify.error(errMsg);
      }
    }
  };

  const handlePhotoUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
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

  // Handle manual barcode entry
  const handleManualBarcodeSubmit = async () => {
    const code = manualBarcode.trim();
    if (!code || !foodAnalysis) return;

    setIsProcessingPhoto(true);
    try {
      await foodAnalysis.analyzeBarcode(code);
      if (onScanSuccess) {
        onScanSuccess('barcode');
      }
      notify.success('Product found!');
      onClose();
    } catch (error) {
      console.error('[BarcodeScannerModal] Manual barcode error:', error);
      // Check if it's a "not found" error - show fallback UI
      if (isNotFoundError(error)) {
        setNotFoundBarcode(code);
        setPhotoUri(null); // Clear photo to show fallback UI
        notify.info('Product not in database. Enter the name to analyze.');
      } else {
        const errMsg = error.message || 'Unknown error finding product';
        setErrorMessage(errMsg);
        notify.error(errMsg);
      }
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  // Handle AI fallback analysis using product name
  const handleFallbackAnalysis = async () => {
    const name = productName.trim();
    if (!name || !foodAnalysis) return;

    setIsFallbackAnalyzing(true);
    try {
      // Use the AI text analysis as fallback
      await foodAnalysis.analyzeText(name);
      if (onScanSuccess) {
        onScanSuccess('text'); // Mark as text analysis since we're using AI
      }
      notify.success('Product analyzed!');
      onClose();
    } catch (error) {
      console.error('[BarcodeScannerModal] Fallback analysis error:', error);
      const errMsg = error.message || 'Unknown error during analysis';
      setErrorMessage(errMsg);
      notify.error(errMsg);
    } finally {
      setIsFallbackAnalyzing(false);
    }
  };

  // Go back to scanner from fallback screen
  const handleBackToScanner = () => {
    setNotFoundBarcode(null);
    setProductName('');
    setScanned(false);
  };

  const handleClearPhoto = () => {
    setPhotoUri(null);
    setManualBarcode('');
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setScanned(false);
      setPhotoUri(null);
      setManualBarcode('');
      setIsProcessingPhoto(false);
      setNotFoundBarcode(null);
      setProductName('');
      setIsFallbackAnalyzing(false);
      setErrorMessage(null);
    }
  }, [visible]);

  // Clear error and allow retry
  const handleDismissError = () => {
    setErrorMessage(null);
    setScanned(false);
  };

  // Guard: foodAnalysis prop is required
  if (!foodAnalysis) {
    console.error('[BarcodeScannerModal] foodAnalysis prop is required!');
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.centered}>
          <Ionicons name="warning" size={64} color={SEMANTIC_ACTIONS.danger} />
          <Text style={styles.permissionText}>Scanner not configured properly.</Text>
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
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.centered}>
          <Ionicons name="camera-off" size={64} color={SEMANTIC_ACTIONS.danger} />
          <Text style={styles.permissionText}>No access to camera. Please enable it in settings.</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  // ============================================================================
  // ERROR UI: Display error on screen with retry option
  // ============================================================================
  if (errorMessage) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.fallbackContainer}>
          {/* Header */}
          <View style={styles.fallbackHeader}>
            <TouchableOpacity style={styles.photoCloseButton} onPress={onClose}>
              <Ionicons name="close" size={28} color={TEXT.primary} />
            </TouchableOpacity>
            <Text style={styles.photoHeaderTitle}>Error</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Error Icon & Message */}
          <View style={styles.fallbackIconContainer}>
            <View style={[styles.fallbackIconCircle, styles.errorIconCircle]}>
              <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            </View>
            <Text style={styles.fallbackTitle}>Something Went Wrong</Text>
            <Text style={[styles.fallbackSubtitle, styles.errorMessageText]}>
              {errorMessage}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.fallbackActions}>
            <TouchableOpacity
              style={styles.fallbackPrimaryButton}
              onPress={handleDismissError}
            >
              <Ionicons name="refresh" size={20} color={TEXT.white} style={{ marginRight: 8 }} />
              <Text style={styles.fallbackPrimaryButtonText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fallbackSecondaryButton}
              onPress={onClose}
            >
              <Ionicons name="close-outline" size={20} color={BRAND.primary} style={{ marginRight: 8 }} />
              <Text style={styles.fallbackSecondaryButtonText}>Close</Text>
            </TouchableOpacity>
          </View>

          {/* Tip */}
          <View style={styles.fallbackTip}>
            <Ionicons name="bulb-outline" size={16} color={TEXT.tertiary} />
            <Text style={styles.fallbackTipText}>
              Try using text input or a clearer photo
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  // ============================================================================
  // FALLBACK UI: Product not found in database
  // ============================================================================
  if (notFoundBarcode) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <KeyboardAvoidingView
          style={styles.fallbackContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.fallbackHeader}>
            <TouchableOpacity style={styles.photoCloseButton} onPress={onClose}>
              <Ionicons name="close" size={28} color={TEXT.primary} />
            </TouchableOpacity>
            <Text style={styles.photoHeaderTitle}>Product Not Found</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Not Found Icon & Message */}
          <View style={styles.fallbackIconContainer}>
            <View style={styles.fallbackIconCircle}>
              <Ionicons name="search-outline" size={48} color={BRAND.primary} />
            </View>
            <Text style={styles.fallbackTitle}>Not in Database</Text>
            <Text style={styles.fallbackSubtitle}>
              Barcode <Text style={styles.fallbackBarcodeText}>{notFoundBarcode}</Text> was not found in our product database.
            </Text>
          </View>

          {/* Manual Product Name Entry */}
          <View style={styles.fallbackInputSection}>
            <Text style={styles.fallbackInputLabel}>
              Enter the product name and we will analyze it with AI:
            </Text>
            <TextInput
              style={[
                styles.fallbackInput,
                productName.trim() && !isValidProductName && styles.barcodeInputError
              ]}
              placeholder="e.g., Chocolate Wafer Cookies"
              placeholderTextColor={TEXT.tertiary}
              value={productName}
              onChangeText={setProductName}
              autoFocus
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={isValidProductName ? handleFallbackAnalysis : undefined}
            />
            {productName.trim() && !isValidProductName && (
              <Text style={styles.validationError}>Enter at least 2 characters</Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.fallbackActions}>
            <TouchableOpacity
              style={[
                styles.fallbackPrimaryButton,
                !isValidProductName && styles.buttonDisabled
              ]}
              onPress={handleFallbackAnalysis}
              disabled={isFallbackAnalyzing || !isValidProductName}
            >
              {isFallbackAnalyzing ? (
                <ActivityIndicator size="small" color={TEXT.white} style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="sparkles" size={20} color={TEXT.white} style={{ marginRight: 8 }} />
              )}
              <Text style={styles.fallbackPrimaryButtonText}>
                {isFallbackAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fallbackSecondaryButton}
              onPress={handleBackToScanner}
              disabled={isFallbackAnalyzing}
            >
              <Ionicons name="scan-outline" size={20} color={BRAND.primary} style={{ marginRight: 8 }} />
              <Text style={styles.fallbackSecondaryButtonText}>Try Different Barcode</Text>
            </TouchableOpacity>
          </View>

          {/* Tip */}
          <View style={styles.fallbackTip}>
            <Ionicons name="bulb-outline" size={16} color={TEXT.tertiary} />
            <Text style={styles.fallbackTipText}>
              Tip: Include brand name and flavor for better accuracy
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  // Show photo preview if photo selected - offer two options
  if (photoUri) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <KeyboardAvoidingView
          style={styles.photoContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Light-themed header for photo preview */}
          <View style={styles.photoHeader}>
            <TouchableOpacity style={styles.photoCloseButton} onPress={onClose}>
              <Ionicons name="close" size={28} color={TEXT.primary} />
            </TouchableOpacity>
            <Text style={styles.photoHeaderTitle}>Analyze Product</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Photo preview with proper light background */}
          <View style={styles.photoPreviewContainer}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          </View>

          {/* Option 1: AI Photo Analysis (Primary) */}
          <View style={styles.photoOptionSection}>
            <TouchableOpacity
              style={[styles.photoOptionPrimary, isProcessingPhoto && styles.buttonDisabled]}
              onPress={async () => {
                if (!foodAnalysis) return;
                setIsProcessingPhoto(true);
                try {
                  await foodAnalysis.analyzePhoto(photoUri);
                  if (onScanSuccess) {
                    onScanSuccess('photo');
                  }
                  notify.success('Product analyzed!');
                  onClose();
                } catch (error) {
                  console.error('[BarcodeScannerModal] Photo analysis error:', error);
                  const errMsg = error.message || 'Unknown error analyzing photo';
                  setErrorMessage(errMsg);
                  notify.error(errMsg);
                } finally {
                  setIsProcessingPhoto(false);
                }
              }}
              disabled={isProcessingPhoto}
            >
              {isProcessingPhoto ? (
                <ActivityIndicator size="small" color={TEXT.white} style={{ marginRight: 10 }} />
              ) : (
                <Ionicons name="sparkles" size={22} color={TEXT.white} style={{ marginRight: 10 }} />
              )}
              <View>
                <Text style={styles.photoOptionPrimaryText}>
                  {isProcessingPhoto ? 'Analyzing...' : 'Analyze with AI'}
                </Text>
                <Text style={styles.photoOptionSubtext}>Best for product photos</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.photoDivider}>
            <View style={styles.photoDividerLine} />
            <Text style={styles.photoDividerText}>OR</Text>
            <View style={styles.photoDividerLine} />
          </View>

          {/* Option 2: Manual barcode entry */}
          <View style={styles.manualEntryContainer}>
            <Text style={styles.photoHint}>
              If this is a barcode photo, enter the number:
            </Text>
            <View style={styles.barcodeInputRow}>
              <TextInput
                style={[
                  styles.barcodeInputCompact,
                  manualBarcode.trim() && !isValidBarcode && styles.barcodeInputError
                ]}
                placeholder="e.g., 073935942400"
                placeholderTextColor={TEXT.tertiary}
                value={manualBarcode}
                onChangeText={setManualBarcode}
                keyboardType="number-pad"
                maxLength={14}
              />
              <TouchableOpacity
                style={[styles.barcodeSubmitButton, !isValidBarcode && styles.buttonDisabled]}
                onPress={handleManualBarcodeSubmit}
                disabled={isProcessingPhoto || !isValidBarcode}
              >
                <Ionicons name="arrow-forward" size={20} color={TEXT.white} />
              </TouchableOpacity>
            </View>
            {manualBarcode.trim() && !isValidBarcode && (
              <Text style={styles.validationError}>Barcode must be 8–14 digits</Text>
            )}
          </View>

          {/* Change Photo button */}
          <TouchableOpacity
            style={styles.changePhotoButton}
            onPress={handleClearPhoto}
            disabled={isProcessingPhoto}
          >
            <Ionicons name="camera-outline" size={18} color={BRAND.primary} style={{ marginRight: 6 }} />
            <Text style={styles.changePhotoText}>Choose Different Photo</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Camera view without children - per expo-camera requirements */}
        <CameraView
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e'],
          }}
        />

        {/* Overlay with absolute positioning - separate from CameraView */}
        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={30} color={TEXT.white} />
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
                <ActivityIndicator size="large" color={TEXT.white} style={{ marginBottom: 10 }} />
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
          <View style={styles.scanStatusRow}>
            <Ionicons name="scan-outline" size={18} color="rgba(255,255,255,0.7)" />
            <Text style={styles.scanInstruction}> Scanner ready</Text>
          </View>

          {scanned && !foodAnalysis.isAnalyzing && (
            <TouchableOpacity style={styles.rescanButton} onPress={() => setScanned(false)}>
              <LinearGradient
                colors={SURFACES.gradient.blue}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.rescanButtonGradient}
              >
                <Ionicons name="scan-circle-outline" size={24} color={TEXT.white} />
                <Text style={styles.rescanButtonText}>Tap to Rescan</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {!scanned && (
            <TouchableOpacity style={styles.photoUploadButton} onPress={handlePhotoUpload}>
              <LinearGradient
                colors={SURFACES.gradient.blue}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.photoUploadGradient}
              >
                <Ionicons name="image-outline" size={24} color={TEXT.white} />
                <Text style={styles.photoUploadText}>Or Upload Photo</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Camera/Scanner view - dark background for camera
  container: { flex: 1, backgroundColor: '#000000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: SURFACES.background.primary, padding: 20 },
  permissionText: { marginTop: 20, fontSize: 16, textAlign: 'center', color: TEXT.primary },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 40,
  },
  header: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  closeButton: { position: 'absolute', left: 20, padding: 5 },
  closeButtonText: { color: BRAND.primary, fontSize: 16, fontFamily: TYPOGRAPHY.family.bold },
  headerTitle: { fontSize: 24, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.white },
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
  analysisText: { color: TEXT.white, fontSize: 16, fontFamily: TYPOGRAPHY.family.semibold },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: TEXT.white,
    borderWidth: 4,
  },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
  scanInstruction: { color: 'rgba(255,255,255,0.7)', marginTop: 20, fontSize: 16, textAlign: 'center' },
  scanStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  rescanButton: { marginTop: 20, borderRadius: 12, overflow: 'hidden' },
  rescanButtonGradient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
  rescanButtonText: { color: TEXT.white, fontSize: 16, fontFamily: TYPOGRAPHY.family.semibold, marginLeft: 8 },
  // Photo upload button (in camera view)
  photoUploadButton: { marginTop: 12, borderRadius: 12, overflow: 'hidden' },
  photoUploadGradient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
  photoUploadText: { color: TEXT.white, fontSize: 16, fontFamily: TYPOGRAPHY.family.semibold, marginLeft: 8 },

  // ============ PHOTO PREVIEW STYLES (LIGHT THEME) ============
  photoContainer: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
    paddingTop: 60,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
    height: 44,
  },
  photoCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SURFACES.card.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  photoHeaderTitle: {
    fontSize: 20,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  photoPreviewContainer: {
    height: 200,
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 16,
    backgroundColor: SURFACES.card.secondary,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  photoHint: {
    color: TEXT.secondary,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
    lineHeight: 20,
  },
  manualEntryContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  barcodeInput: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
    textAlign: 'center',
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: BRAND.primary + '40',
  },
  barcodeInputError: {
    borderColor: SEMANTIC_ACTIONS.danger,
    borderWidth: 1.5,
  },
  validationError: {
    color: SEMANTIC_ACTIONS.danger,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  photoActionContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
  },
  analyzeButton: {
    backgroundColor: BRAND.primary,
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  clearButton: {
    backgroundColor: SURFACES.background.primary,
    borderWidth: 1.5,
    borderColor: SEMANTIC_ACTIONS.danger,
  },
  photoButtonText: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.white,
  },

  // ============ PHOTO OPTIONS UI STYLES ============
  photoOptionSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  photoOptionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.primary,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  photoOptionPrimaryText: {
    fontSize: 17,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.white,
  },
  photoOptionSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  photoDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 12,
  },
  photoDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: TEXT.tertiary + '40',
  },
  photoDividerText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
    paddingHorizontal: 12,
  },
  barcodeInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  barcodeInputCompact: {
    flex: 1,
    backgroundColor: SURFACES.card.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
    textAlign: 'center',
    letterSpacing: 1.5,
    borderWidth: 1,
    borderColor: TEXT.tertiary + '30',
  },
  barcodeSubmitButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: BRAND.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginHorizontal: 20,
    marginTop: 8,
  },
  changePhotoText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },

  // ============ FALLBACK UI STYLES ============
  fallbackContainer: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
    paddingTop: 60,
  },
  fallbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
    height: 44,
  },
  fallbackIconContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 32,
  },
  fallbackIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: BRAND.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  // Error-specific styles
  errorIconCircle: {
    backgroundColor: '#EF444415',
  },
  errorMessageText: {
    color: TEXT.secondary,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  fallbackTitle: {
    fontSize: 24,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: 8,
  },
  fallbackSubtitle: {
    fontSize: 15,
    color: TEXT.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  fallbackBarcodeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: TEXT.primary,
  },
  fallbackInputSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  fallbackInputLabel: {
    fontSize: 14,
    color: TEXT.secondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  fallbackInput: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 17,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
    borderWidth: 1.5,
    borderColor: BRAND.primary + '30',
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  fallbackActions: {
    paddingHorizontal: 20,
    gap: 12,
  },
  fallbackPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.primary,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  fallbackPrimaryButtonText: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.white,
  },
  fallbackSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACES.card.primary,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BRAND.primary + '40',
  },
  fallbackSecondaryButtonText: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },
  fallbackTip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingHorizontal: 32,
    gap: 6,
  },
  fallbackTipText: {
    fontSize: 13,
    color: TEXT.tertiary,
  },
});
