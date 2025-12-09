import React, { useEffect, useState } from "react";
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
  ScrollView
} from "react-native";
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

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName?.trim()) newErrors.fullName = "Name is required";
    if (formData.age && isNaN(formData.age)) newErrors.age = "Age must be a number";
    if (formData.weightKg && isNaN(formData.weightKg)) newErrors.weightKg = "Weight must be a number";
    if (formData.heightCm && isNaN(formData.heightCm)) newErrors.heightCm = "Height must be a number";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave();
    } else {
      Alert.alert("Validation Error", "Please check the fields and try again.");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Edit Profile</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  placeholder="Enter your full name"
                  value={formData.fullName || ""}
                  onChangeText={(t) => updateFormField("fullName", t)}
                  style={[styles.input, errors.fullName && styles.inputError]}
                  placeholderTextColor="#999"
                />
                {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Age</Text>
                  <TextInput
                    placeholder="Years"
                    value={formData.age?.toString() || ""}
                    onChangeText={(t) => updateFormField("age", t)}
                    style={[styles.input, errors.age && styles.inputError]}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Gender</Text>
                  <TextInput
                    placeholder="M/F/Other"
                    value={formData.gender || ""}
                    onChangeText={(t) => updateFormField("gender", t)}
                    style={styles.input}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Weight (kg)</Text>
                  <TextInput
                    placeholder="kg"
                    value={formData.weightKg?.toString() || ""}
                    onChangeText={(t) => updateFormField("weightKg", t)}
                    style={[styles.input, errors.weightKg && styles.inputError]}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Height (cm)</Text>
                  <TextInput
                    placeholder="cm"
                    value={formData.heightCm?.toString() || ""}
                    onChangeText={(t) => updateFormField("heightCm", t)}
                    style={[styles.input, errors.heightCm && styles.inputError]}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Activity Level</Text>
                <TextInput
                  placeholder="sedentary, light, moderate, active"
                  value={formData.activityLevel || ""}
                  onChangeText={(t) => updateFormField("activityLevel", t)}
                  style={styles.input}
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
                <Text style={styles.helperText}>
                  Options: sedentary, light, moderate, active, athlete
                </Text>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity 
                onPress={onClose} 
                style={styles.btnOutline}
                activeOpacity={0.7}
                disabled={isUpdating}
              >
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                style={styles.btnPrimary}
                activeOpacity={0.7}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.btnText, { color: "#fff" }]}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  keyboardView: {
    width: "100%",
    alignItems: "center",
  },
  container: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: COLORS.text 
  },
  closeText: {
    fontSize: 20,
    color: "#999",
    padding: 4,
  },
  scrollContent: {
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 16,
  },
  rowInputs: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: "#F9FAFB",
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  btnOutline: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#fff",
  },
  btnPrimary: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
});

export default EditProfileModal;
