import { View, Text, TouchableOpacity } from "react-native";
import EditableSection from "../EditableSection";
import TagInput from "../TagInput";
import { DIETARY_PRESETS } from "../../constants/profileConfig";
import { profileStyles } from "../../assets/styles/profile.styles";

export default function DietarySection({ dietary, isEditing, toggleEdit, saveSection, cancelEdit, updateField, status }) {
  const togglePreference = (pref) => {
    const current = dietary.preferences || [];
    const updated = current.includes(pref)
      ? current.filter(p => p !== pref)
      : [...current, pref];
    updateField("dietary", "preferences", updated);
  };

  const addAllergy = (tag) => {
    const current = dietary.allergies || [];
    if (!current.includes(tag)) {
      updateField("dietary", "allergies", [...current, tag]);
    }
  };

  const removeAllergy = (tag) => {
    const current = dietary.allergies || [];
    updateField("dietary", "allergies", current.filter(t => t !== tag));
  };

  return (
    <EditableSection
      title="Dietary Preferences"
      isEditing={isEditing}
      onToggleEdit={toggleEdit}
      onSave={saveSection}
      onCancel={cancelEdit}
      isSaving={status === 'saving'}
    >
      {isEditing ? (
        <View>
          <Text style={profileStyles.inputLabel}>Diet Type</Text>
          <View style={profileStyles.chipRow}>
            {DIETARY_PRESETS.map((pref) => {
              const isSelected = dietary.preferences?.includes(pref);
              return (
                <TouchableOpacity
                  key={pref}
                  style={[profileStyles.chip, isSelected && profileStyles.chipSelected]}
                  onPress={() => togglePreference(pref)}
                >
                  <Text style={[profileStyles.chipText, isSelected && profileStyles.chipTextSelected]}>{pref}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[profileStyles.inputLabel, { marginTop: 12 }]}>Allergies & Restrictions</Text>
          <TagInput
            tags={dietary.allergies || []}
            onAdd={addAllergy}
            onRemove={removeAllergy}
            placeholder="Add allergy (e.g. Peanuts)"
            variant="danger"
          />
          <Text style={[profileStyles.inputLabel, { marginTop: 12 }]}>Dislikes</Text>
          <TagInput
            tags={dietary.dislikes || []}
            onAdd={(tag) => {
              const current = dietary.dislikes || [];
              if (!current.includes(tag)) {
                updateField("dietary", "dislikes", [...current, tag]);
              }
            }}
            onRemove={(tag) => {
              const current = dietary.dislikes || [];
              updateField("dietary", "dislikes", current.filter(t => t !== tag));
            }}
            placeholder="Add dislike (e.g. Mushrooms)"
            variant="default"
          />
        </View>
      ) : (
        <View>
          <Text style={profileStyles.inputLabel}>Diet Type</Text>
          <View style={profileStyles.chipRow}>
            {dietary.preferences?.length > 0 ? (
              dietary.preferences.map((pref) => (
                <View key={pref} style={profileStyles.chip}>
                  <Text style={profileStyles.chipText}>{pref}</Text>
                </View>
              ))
            ) : (
              <Text style={profileStyles.mutedText}>No preferences set</Text>
            )}
          </View>
          <Text style={[profileStyles.inputLabel, { marginTop: 12 }]}>Allergies</Text>
          <View style={profileStyles.chipRow}>
            {dietary.allergies?.length > 0 ? (
              dietary.allergies.map((tag) => (
                <View key={tag} style={[profileStyles.chip, { borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' }]}>
                  <Text style={[profileStyles.chipText, { color: '#D32F2F' }]}>{tag}</Text>
                </View>
              ))
            ) : (
              <Text style={profileStyles.mutedText}>No allergies listed</Text>
            )}
          </View>
          <Text style={[profileStyles.inputLabel, { marginTop: 12 }]}>Dislikes</Text>
          <View style={profileStyles.chipRow}>
            {dietary.dislikes?.length > 0 ? (
              dietary.dislikes.map((tag) => (
                <View key={tag} style={profileStyles.chip}>
                  <Text style={profileStyles.chipText}>{tag}</Text>
                </View>
              ))
            ) : (
              <Text style={profileStyles.mutedText}>No dislikes listed</Text>
            )}
          </View>
        </View>
      )}
    </EditableSection>
  );
}
