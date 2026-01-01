import React, { useEffect, useState, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from "@expo/vector-icons";
import SaveSuccessAnimation from "./profile/SaveSuccessAnimation";
import { createFadeSlideAnimation, createSlideUpAnimation, ANIMATION_TIMING } from "../utils/profileAnimations";
import { BRAND, SURFACES, TEXT, TYPOGRAPHY, SPACING, RADIUS, ICON_SIZES, SHADOWS } from "../constants/premiumTheme";
import { COLORS } from "../constants/colors";

const EditProfileModal = ({
  visible,
  onClose,
  formData = {},
  onSave,
  updateFormField,
  isUpdating,
}) => {
  // Local validation state
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  // Animation refs
  const slideAnim = useRef(createSlideUpAnimation(100, ANIMATION_TIMING.normal)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const focusScaleAnim = useRef(new Animated.Value(1)).current;

  // Trigger animations on modal open/close
  useEffect(() => {
    if (visible) {
      slideAnim.start();
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: ANIMATION_TIMING.normal,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      // Reset animations
      slideAnim.reset?.();
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName?.trim()) newErrors.fullName = "Name is required";
    if (formData.age && isNaN(formData.age)) newErrors.age = "Age must be a number";
    if (formData.weightKg && isNaN(formData.weightKg)) newErrors.weightKg = "Weight must be a number";
    if (formData.heightCm && isNaN(formData.heightCm)) newErrors.heightCm = "Height must be a number";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (validate()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        await onSave?.();
        setShowSuccess(true);
      } catch (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Please check the fields and try again.");
    }
  };

  const handleFieldFocus = (fieldName) => {
    setFocusedField(fieldName);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(focusScaleAnim, {
      toValue: 1.02,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handleFieldBlur = () => {
    setFocusedField(null);
    Animated.spring(focusScaleAnim, {
      toValue: 1,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose?.();
  };

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={handleCancel}>
      {/* Backdrop with fade animation */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropAnim,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.backdropTouchable}
          onPress={handleCancel}
        />
      </Animated.View>

      {/* Modal container with slide-up animation */}
      <Animated.View
        style={[
          styles.modalContainer,
          {
            opacity: slideAnim.opacityValue,
            transform: [{ translateY: slideAnim.slideValue }],
          },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Edit Profile</Text>
              <TouchableOpacity
                onPress={handleCancel}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={ICON_SIZES.md} color={TEXT.secondary} />
              </TouchableOpacity>
            </View>

            {/* Form content */}
            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <Animated.View
                  style={{
                    transform: [{ scale: focusedField === "fullName" ? focusScaleAnim : 1 }],
                  }}
                >
                  <TextInput
                    placeholder="Enter your full name"
                    value={formData.fullName || ""}
                    onChangeText={(t) => updateFormField("fullName", t)}
                    onFocus={() => handleFieldFocus("fullName")}
                    onBlur={handleFieldBlur}
                    style={[styles.input, errors.fullName && styles.inputError]}
                    placeholderTextColor={TEXT.muted}
                  />
                </Animated.View>
                {errors.fullName && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={14} color={BRAND.secondary} />
                    <Text style={styles.errorText}>{errors.fullName}</Text>
                  </View>
                )}
              </View>

              {/* Age & Gender */}
              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: SPACING[2] }]}>
                  <Text style={styles.label}>Age</Text>
                  <Animated.View
                    style={{
                      transform: [{ scale: focusedField === "age" ? focusScaleAnim : 1 }],
                    }}
                  >
                    <TextInput
                      placeholder="Years"
                      value={formData.age?.toString() || ""}
                      onChangeText={(t) => updateFormField("age", t)}
                      onFocus={() => handleFieldFocus("age")}
                      onBlur={handleFieldBlur}
                      style={[styles.input, errors.age && styles.inputError]}
                      keyboardType="numeric"
                      placeholderTextColor={TEXT.muted}
                    />
                  </Animated.View>
                  {errors.age && (
                    <Text style={styles.errorText}>{errors.age}</Text>
                  )}
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: SPACING[2] }]}>
                  <Text style={styles.label}>Gender</Text>
                  <Animated.View
                    style={{
                      transform: [{ scale: focusedField === "gender" ? focusScaleAnim : 1 }],
                    }}
                  >
                    <TextInput
                      placeholder="M/F/Other"
                      value={formData.gender || ""}
                      onChangeText={(t) => updateFormField("gender", t)}
                      onFocus={() => handleFieldFocus("gender")}
                      onBlur={handleFieldBlur}
                      style={styles.input}
                      placeholderTextColor={TEXT.muted}
                    />
                  </Animated.View>
                </View>
              </View>

              {/* Weight & Height */}
              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: SPACING[2] }]}>
                  <Text style={styles.label}>Weight (kg)</Text>
                  <Animated.View
                    style={{
                      transform: [{ scale: focusedField === "weightKg" ? focusScaleAnim : 1 }],
                    }}
                  >
                    <TextInput
                      placeholder="kg"
                      value={formData.weightKg?.toString() || ""}
                      onChangeText={(t) => updateFormField("weightKg", t)}
                      onFocus={() => handleFieldFocus("weightKg")}
                      onBlur={handleFieldBlur}
                      style={[styles.input, errors.weightKg && styles.inputError]}
                      keyboardType="numeric"
                      placeholderTextColor={TEXT.muted}
                    />
                  </Animated.View>
                  {errors.weightKg && (
                    <Text style={styles.errorText}>{errors.weightKg}</Text>
                  )}
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: SPACING[2] }]}>
                  <Text style={styles.label}>Height (cm)</Text>
                  <Animated.View
                    style={{
                      transform: [{ scale: focusedField === "heightCm" ? focusScaleAnim : 1 }],
                    }}
                  >
                    <TextInput
                      placeholder="cm"
                      value={formData.heightCm?.toString() || ""}
                      onChangeText={(t) => updateFormField("heightCm", t)}
                      onFocus={() => handleFieldFocus("heightCm")}
                      onBlur={handleFieldBlur}
                      style={[styles.input, errors.heightCm && styles.inputError]}
                      keyboardType="numeric"
                      placeholderTextColor={TEXT.muted}
                    />
                  </Animated.View>
                  {errors.heightCm && (
                    <Text style={styles.errorText}>{errors.heightCm}</Text>
                  )}
                </View>
              </View>

              {/* Activity Level */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Activity Level</Text>
                <Animated.View
                  style={{
                    transform: [{ scale: focusedField === "activityLevel" ? focusScaleAnim : 1 }],
                  }}
                >
                  <TextInput
                    placeholder="sedentary, light, moderate, active"
                    value={formData.activityLevel || ""}
                    onChangeText={(t) => updateFormField("activityLevel", t)}
                    onFocus={() => handleFieldFocus("activityLevel")}
                    onBlur={handleFieldBlur}
                    style={styles.input}
                    placeholderTextColor={TEXT.muted}
                    autoCapitalize="none"
                  />
                </Animated.View>
                <Text style={styles.helperText}>
                  Options: sedentary, light, moderate, active, athlete
                </Text>
              </View>
            </ScrollView>

            {/* Footer with buttons */}
            <View style={styles.footer}>
              <TouchableOpacity
                onPress={handleCancel}
                style={styles.btnCancel}
                activeOpacity={0.7}
                disabled={isUpdating}
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                style={styles.btnSave}
                activeOpacity={0.8}
                disabled={isUpdating}
              >
                <LinearGradient
                  colors={SURFACES.gradient.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.btnSaveGradient}
                >
                  {isUpdating ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={ICON_SIZES.sm} color="#FFFFFF" />
                      <Text style={styles.btnSaveText}>Save</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>

      {/* Success animation */}
      <SaveSuccessAnimation
        visible={showSuccess}
        onComplete={() => {
          setShowSuccess(false);
          onClose?.();
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Backdrop
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SURFACES.card.overlay,
  },
  backdropTouchable: {
    flex: 1,
  },

  // Modal container
  modalContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  keyboardView: {
    width: "100%",
    alignItems: "center",
  },
  container: {
    width: "100%",
    backgroundColor: SURFACES.card.primary,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING[5],
    paddingTop: SPACING[5],
    paddingBottom: SPACING[5],
    maxHeight: "90%",
    ...SHADOWS.lg,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING[5],
    paddingBottom: SPACING[4],
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.card.border,
  },
  title: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },

  // Form content
  scrollContent: {
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: SPACING[4],
  },
  rowInputs: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[2],
  },
  input: {
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    padding: SPACING[3],
    borderRadius: RADIUS.md,
    fontSize: TYPOGRAPHY.size.base,
    color: TEXT.primary,
    backgroundColor: SURFACES.background.tertiary,
    fontWeight: TYPOGRAPHY.weight.regular,
  },
  inputError: {
    borderColor: BRAND.secondary,
    backgroundColor: '#FEF2F2',
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING[1],
    marginTop: SPACING[2],
  },
  errorText: {
    color: BRAND.secondary,
    fontSize: TYPOGRAPHY.size.xs,
    marginTop: SPACING[2],
  },
  helperText: {
    color: TEXT.tertiary,
    fontSize: TYPOGRAPHY.size.xs,
    marginTop: SPACING[2],
  },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING[3],
    marginTop: SPACING[5],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: SURFACES.card.border,
  },
  btnCancel: {
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    backgroundColor: SURFACES.card.primary,
  },
  btnCancelText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
  },
  btnSave: {
    borderRadius: RADIUS.md,
    overflow: "hidden",
  },
  btnSaveGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING[2],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    minWidth: 100,
    justifyContent: "center",
  },
  btnSaveText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: "#FFFFFF",
  },
});

export default EditProfileModal;
