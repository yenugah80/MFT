import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { useCallback } from "react";
import { profileStyles } from "../assets/styles/profile.styles";
import EditableSection from "./EditableSection";
import TagInput from "./TagInput";
import { DIETARY_PRESETS } from "../constants/profileConfig";

export default function DietaryPreferencesSection({
  data,
  isEditing,
  isSaving,
  onUpdate,
  onToggleEdit,
  onSave,
  onCancel,
}) {
  const handleTogglePreset = useCallback((preset) => {
    const currentPreferences = data.preferences || [];
    const newPreferences = currentPreferences.includes(preset)
      ? currentPreferences.filter((p) => p !== preset)
      : [...currentPreferences, preset];
    
    onUpdate('preferences', newPreferences);
  }, [data.preferences, onUpdate]);

  const handleAddTag = useCallback((key, value) => {
    const currentTags = data[key] || [];
    const newTags = Array.from(new Set([...currentTags, value]));
    onUpdate(key, newTags);
  }, [data, onUpdate]);

  const handleRemoveTag = useCallback((key, value) => {
    const currentTags = data[key] || [];
    const newTags = currentTags.filter((item) => item !== value);
    onUpdate(key, newTags);
  }, [data, onUpdate]);

  return (
    <EditableSection
      title="Dietary Preferences"
      isEditing={isEditing}
      isSaving={isSaving}
      onToggleEdit={onToggleEdit}
      onSave={onSave}
      onCancel={onCancel}
    >
      <Text style={profileStyles.inputLabel}>Pick presets</Text>
      <View style={profileStyles.chipRow}>
        {DIETARY_PRESETS.map((preset) => {
          const selected = (data.preferences || []).includes(preset);
          return (
            <TouchableOpacity
              key={preset}
              disabled={!isEditing}
              onPress={() => handleTogglePreset(preset)}
              style={[
                profileStyles.chip,
                selected && profileStyles.chipSelected,
                !isEditing && profileStyles.chipDisabled,
              ]}
            >
              <Text
                style={[
                  profileStyles.chipText,
                  selected && profileStyles.chipTextSelected,
                ]}
              >
                {preset}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={profileStyles.inputLabel}>Custom preferences</Text>
      <TagInput
        tags={data.preferences || []}
        onAdd={(value) => handleAddTag('preferences', value)}
        onRemove={(value) => handleRemoveTag('preferences', value)}
        placeholder="Add another preference"
        editable={isEditing}
        variant="default"
      />

      <TagInput
        label="Allergies"
        tags={data.allergies || []}
        onAdd={(value) => handleAddTag('allergies', value)}
        onRemove={(value) => handleRemoveTag('allergies', value)}
        placeholder="Add an allergy"
        editable={isEditing}
        variant="danger"
      />

      <TagInput
        label="Food dislikes"
        tags={data.dislikes || []}
        onAdd={(value) => handleAddTag('dislikes', value)}
        onRemove={(value) => handleRemoveTag('dislikes', value)}
        placeholder="Add a food you avoid"
        editable={isEditing}
        variant="default"
      />
    </EditableSection>
  );
}
