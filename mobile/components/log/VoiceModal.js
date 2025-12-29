import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Platform,
  LayoutAnimation,
  UIManager,
  TextInput,
  KeyboardAvoidingView,
  Animated,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export const VoiceModal = ({ visible, onClose, onComplete, voiceHook }) => {
  const safeHook = voiceHook || {};
  const { 
    isRecording = false, 
    isProcessing = false,
    transcript = '', 
    startRecording = () => {}, 
    stopRecording: stopRecordingFn,
    stopAndUpload,
    cancelRecording = () => {}, 
    liveItems = [],
    updateItem = () => {},
    removeItem = () => {},
    error: hookError,
    processingState = { step: 0, label: 'Processing...' },
  } = safeHook;
  
  const stopRecording = stopAndUpload || stopRecordingFn || (async () => null);
  const safeLiveItems = Array.isArray(liveItems) ? liveItems : [];

  const [editingItem, setEditingItem] = useState(null);
  const [editQty, setEditQty] = useState('');

  // Animation value for microphone pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Polish: Haptic feedback on processing step transitions
  useEffect(() => {
    if (processingState.step > 0) {
      Haptics.selectionAsync();
    }
  }, [processingState.step]);

  useEffect(() => {
    let animation;
    if (isRecording) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => animation?.stop();
  }, [isRecording]);

  // Reset state when modal closes, but DO NOT auto-start
  useEffect(() => {
    if (!visible) {
      cancelRecording();
      setEditingItem(null);
    }
  }, [visible, cancelRecording]);

  // Animate pills when they change
  useEffect(() => {
    if (safeLiveItems.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [safeLiveItems]);

  const playSound = async (type) => {
    try {
      // FIXED: Use local assets for App Store compliance and reliability
      const source = type === 'start' 
        ? require('../../assets/sounds/start.mp3') 
        : require('../../assets/sounds/stop.mp3');
      
      const { sound } = await Audio.Sound.createAsync(source);
      await sound.playAsync();
      
      // Cleanup
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.didJustFinish) {
          await sound.unloadAsync();
        }
      });
    } catch (error) {
      console.warn('Failed to play sound', error);
    }
  };

  const handleStop = async () => {
    playSound('stop');
    const result = await stopRecording();
    if (result) {
      onComplete(result);
    }
    // If result is null (error), keep modal open so user sees the error message
    // and can try again or cancel manually.
  };

  const handleStart = () => {
    playSound('start');
    startRecording();
  };

  const handleEditPress = (item) => {
    Haptics.selectionAsync();
    setEditingItem(item);
    setEditQty(String(item.quantity));
  };

  const saveEdit = () => {
    if (editingItem && editQty) {
      const newQty = parseFloat(editQty);
      if (!isNaN(newQty) && newQty > 0) {
        updateItem(editingItem, { quantity: newQty });
      }
    }
    setEditingItem(null);
  };

  const handleDelete = () => {
    if (editingItem) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      removeItem(editingItem);
      setEditingItem(null);
    }
  };

  // Helper to get confidence color
  const getConfidenceStyle = (confidence) => {
    // Default to high confidence if undefined (e.g. manual entry)
    const score = confidence ?? 1.0; 
    if (score >= 0.85) return { borderColor: '#10B981', icon: 'checkmark-circle' }; // Green (High)
    if (score >= 0.6) return { borderColor: '#F59E0B', icon: 'alert-circle' };     // Yellow (Medium)
    return { borderColor: '#EF4444', icon: 'help-circle' };                         // Red (Low)
  };

  const getConfidenceExplanation = (confidence) => {
    const score = confidence ?? 1.0;
    if (score >= 0.85) return { text: "High Confidence: AI is sure about this match.", color: "#10B981" };
    if (score >= 0.6) return { text: "Medium Confidence: Please verify the details.", color: "#F59E0B" };
    return { text: "Low Confidence: AI might have guessed. Please check.", color: "#EF4444" };
  };

  // Use real state from hook
  const processingLabel = processingState.label || 'Processing...';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{isProcessing ? 'Analyzing...' : isRecording ? 'Listening...' : 'Tap to Record'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Live Transcript */}
          <View style={styles.transcriptContainer}>
            {isProcessing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color="#6B4EFF" style={{ marginBottom: 16 }} />
                <Text style={styles.processingText}>{processingLabel}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.transcriptText}>
                  {transcript || (isRecording ? "Listening..." : "Say something like 'I had 2 eggs and toast'...")}
                </Text>
                
                {/* Clear Button */}
                {transcript.length > 0 && (
                  <TouchableOpacity 
                    style={styles.clearButton}
                    onPress={() => {
                      Haptics.selectionAsync();
                      cancelRecording();
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="refresh-circle" size={20} color="#9CA3AF" />
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* Live Detected Items (Pills) */}
          {!isProcessing && (
            <View style={styles.liveResultsContainer}>
            {safeLiveItems.length > 0 && (
              <>
                <Text style={styles.liveResultsLabel}>Detected Items:</Text>
                <View style={styles.pillsWrapper}>
                  {safeLiveItems.map((item, index) => {
                    const confStyle = getConfidenceStyle(item.confidence);
                    return (
                    <TouchableOpacity
                      key={`${item.name}-${index}`}
                      style={[styles.pill, { borderLeftColor: confStyle.borderColor, borderLeftWidth: 4 }]}
                      onPress={() => handleEditPress(item)}
                      activeOpacity={0.7}
                    >
                      {/* Confidence Indicator Icon */}
                      <Ionicons name={confStyle.icon} size={16} color="#FFFFFF" style={{ opacity: 0.9 }} />
                      
                      <Text style={styles.pillText}>
                        {item.quantity} {item.unit} {item.name}
                      </Text>
                      <View style={styles.editBadge}>
                        <Ionicons name="pencil" size={10} color="#10B981" />
                      </View>
                    </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
            </View>
          )}

          {/* Edit Overlay (Mini Modal inside) */}
          {editingItem && (
            <View style={styles.editOverlay}>
              {/* Confidence Tooltip */}
              <View style={[styles.confidenceTooltip, { backgroundColor: getConfidenceExplanation(editingItem.confidence).color + '20' }]}>
                <Ionicons 
                  name="information-circle" 
                  size={16} 
                  color={getConfidenceExplanation(editingItem.confidence).color} 
                />
                <Text style={[styles.confidenceText, { color: getConfidenceExplanation(editingItem.confidence).color }]}>{getConfidenceExplanation(editingItem.confidence).text}</Text>
              </View>

              <Text style={styles.editTitle}>Edit Quantity</Text>
              <Text style={styles.editSubtitle}>{editingItem.name}</Text>
              
              <View style={styles.editRow}>
                <TextInput
                  style={styles.editInput}
                  value={editQty}
                  onChangeText={setEditQty}
                  keyboardType="numeric"
                  autoFocus
                  selectTextOnFocus
                />
                <Text style={styles.editUnit}>{editingItem.unit}</Text>
              </View>

              <View style={styles.editActions}>
                <TouchableOpacity 
                  style={[styles.editButton, styles.deleteEditButton]} 
                  onPress={handleDelete}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.editButton, styles.cancelEditButton]} 
                  onPress={() => setEditingItem(null)}
                >
                  <Text style={styles.cancelEditText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.editButton, styles.saveEditButton]} 
                  onPress={saveEdit}
                >
                  <Text style={styles.saveEditText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Record / Stop Button */}
          {!editingItem && !isProcessing && (
            <TouchableOpacity
              style={styles.stopButtonContainer}
              onPress={isRecording ? handleStop : handleStart}
              activeOpacity={0.8}
            >
              <View>
                {isRecording && (
                  <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
                )}
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  style={styles.stopButton}
                >
                  <View style={styles.stopIcon} />
                  {!isRecording && (
                    <Ionicons name="mic" size={32} color="#FFFFFF" style={{ position: 'absolute' }} />
                  )}
                </LinearGradient>
              </View>
            </TouchableOpacity>
          )}

          {/* Cancel Button */}
          {(isRecording || isProcessing) && (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                cancelRecording();
                onClose();
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}

          {hookError && !isProcessing && (
            <Text style={styles.errorText}>{hookError}</Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  transcriptContainer: {
    minHeight: 60,
    marginBottom: 20,
  },
  transcriptText: {
    fontSize: 18,
    color: '#4B5563',
    lineHeight: 26,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 8,
    gap: 4,
  },
  clearButtonText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  processingText: {
    fontSize: 18,
    color: '#6B4EFF',
    fontWeight: '600',
  },
  liveResultsContainer: {
    marginBottom: 30,
  },
  liveResultsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  pillsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    overflow: 'hidden', // Ensure borderLeftWidth respects radius
  },
  pillText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  editBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  stopButtonContainer: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  stopButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    // shadowColor: isRecording ? '#EF4444' : '#6B4EFF', // You could animate this color
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  stopIcon: {
    width: 24,
    height: 24,
    backgroundColor: 'transparent', // Changed to transparent to show mic icon if needed, or handle logic
    borderRadius: 4,
  },
  pulseRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 36,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  
  /* Edit Overlay Styles */
  editOverlay: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
  },
  confidenceTooltip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  editSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  editInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    width: 80,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  editUnit: {
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '500',
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteEditButton: {
    flex: 0.5,
    backgroundColor: '#FEE2E2',
    marginRight: 8,
  },
  cancelEditButton: {
    backgroundColor: '#E5E7EB',
  },
  saveEditButton: {
    backgroundColor: '#6B4EFF',
  },
  cancelEditText: {
    fontWeight: '600',
    color: '#374151',
  },
  saveEditText: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
  cancelButton: {
    marginTop: 16,
    padding: 8,
  },
  cancelButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
});
