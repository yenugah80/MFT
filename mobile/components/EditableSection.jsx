import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from "react";
import { BRAND, SURFACES, TEXT, TYPOGRAPHY, SPACING, RADIUS, ICON_SIZES, SHADOWS, SEMANTIC_ACTIONS } from '../constants/premiumTheme';
import SaveSuccessAnimation from "./profile/SaveSuccessAnimation";
import { createFadeSlideAnimation, ANIMATION_TIMING } from "../utils/profileAnimations";

/**
 * EditableSection Component - Premium Version with Animations
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
  const contentAnim = useRef(createFadeSlideAnimation(20, ANIMATION_TIMING.normal)).current;
  const [showSuccess, setShowSuccess] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Trigger animation when entering edit mode
  useEffect(() => {
    if (isEditing) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      contentAnim.start();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await onSave?.();
      setShowSuccess(true);
    } catch (_error) {
      // Show shake animation on error
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCancel?.();
  };

  const handleToggleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleEdit?.();
  };

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [{ translateX: shakeAnim }],
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>

        <View style={styles.actions}>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                disabled={isSaving}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
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
              onPress={handleToggleEdit}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={ICON_SIZES.sm} color={BRAND.primary} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isEditing && (
        <Animated.View
          style={[
            styles.content,
            {
              opacity: contentAnim.opacityValue,
              transform: [{ translateY: contentAnim.slideValue }],
            },
          ]}
        >
          {children}
        </Animated.View>
      )}
      {!isEditing && <View style={styles.content}>{children}</View>}

      <SaveSuccessAnimation
        visible={showSuccess}
        onComplete={() => setShowSuccess(false)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS['2xl'],
    padding: SPACING[5],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[4],
    paddingBottom: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    letterSpacing: -0.3,
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
    borderColor: `${SEMANTIC_ACTIONS.success}33`,
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
