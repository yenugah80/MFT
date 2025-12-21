import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND, SURFACES, TEXT, TYPOGRAPHY, SPACING, RADIUS, ICON_SIZES, SHADOWS } from "../constants/premiumTheme";

/**
 * EditableSection Component - Premium Version
 * Wrapper for profile sections with edit/save/cancel actions
 */
export default function EditableSection({
  title,
  isEditing,
  onToggleEdit,
  onSave,
  onCancel,
  children,
  isSaving = false,
}) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>

        <View style={styles.actions}>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
                disabled={isSaving}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={onSave}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={SURFACES.gradient.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveButtonGradient}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={ICON_SIZES.sm} color="#FFFFFF" />
                      <Text style={styles.saveButtonText}>Save</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.editButton}
              onPress={onToggleEdit}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={ICON_SIZES.sm} color={BRAND.primary} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[5],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(107, 78, 255, 0.1)',
    ...SHADOWS.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[4],
    paddingBottom: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(107, 78, 255, 0.1)',
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING[2],
    alignItems: 'center',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
  },
  editButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: BRAND.primary,
  },
  cancelButton: {
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(107, 78, 255, 0.2)',
  },
  cancelButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
  },
  saveButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    minWidth: 60,
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
  },
  content: {
    // Content area
  },
});
