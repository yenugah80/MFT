import { View, Text, TouchableOpacity } from "react-native";
import { profileStyles } from "../assets/styles/profile.styles";

/**
 * EditableSection Component
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
    <View style={profileStyles.sectionCard}>
      <View style={profileStyles.sectionHeaderRow}>
        <Text style={profileStyles.sectionTitle}>{title}</Text>
        
        <View style={profileStyles.sectionActions}>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={profileStyles.secondaryButton}
                onPress={onCancel}
                disabled={isSaving}
                activeOpacity={0.7}
              >
                <Text style={profileStyles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={profileStyles.primaryButton}
                onPress={onSave}
                disabled={isSaving}
                activeOpacity={0.7}
              >
                <Text style={profileStyles.primaryButtonText}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={profileStyles.ghostButton}
              onPress={onToggleEdit}
              activeOpacity={0.7}
            >
              <Text style={profileStyles.ghostButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {children}
    </View>
  );
}
