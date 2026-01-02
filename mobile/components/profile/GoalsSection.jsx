import { View, Text, TouchableOpacity, TextInput } from "react-native";
import EditableSection from "../EditableSection";
import { PRIMARY_GOAL_OPTIONS } from "../../constants/profileConfig";
import { profileStyles } from "../../assets/styles/profile.styles";

export default function GoalsSection({ goals, isEditing, toggleEdit, saveSection, cancelEdit, updateField, status }) {
  return (
    <EditableSection
      title="Nutrition Goals"
      isEditing={isEditing}
      onToggleEdit={toggleEdit}
      onSave={saveSection}
      onCancel={cancelEdit}
      isSaving={status === 'saving'}
    >
      {isEditing ? (
        <View>
          <Text style={profileStyles.inputLabel}>Primary Goal</Text>
          <View style={profileStyles.chipRow}>
            {PRIMARY_GOAL_OPTIONS.map((option) => {
              const isSelected = goals.primaryGoal === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[profileStyles.chip, isSelected && profileStyles.chipSelected]}
                  onPress={() => updateField("goals", "primaryGoal", option.key)}
                >
                  <Text style={[profileStyles.chipText, isSelected && profileStyles.chipTextSelected]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[profileStyles.inputLabel, { marginTop: 12 }]}>Daily Calories (kcal)</Text>
          <TextInput
            style={profileStyles.inputBox}
            value={goals.dailyCalories?.toString() || ""}
            onChangeText={(t) => updateField("goals", "dailyCalories", parseInt(t, 10) || 0)}
            keyboardType="numeric"
            placeholder="e.g. 2000"
          />
          <View style={profileStyles.rowGap16}>
            <View style={profileStyles.rowItem}>
              <Text style={profileStyles.inputLabel}>Protein (g)</Text>
              <TextInput
                style={profileStyles.inputBox}
                value={goals.proteinG?.toString() || ""}
                onChangeText={(t) => updateField("goals", "proteinG", parseInt(t, 10) || 0)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
            <View style={profileStyles.rowItem}>
              <Text style={profileStyles.inputLabel}>Carbs (g)</Text>
              <TextInput
                style={profileStyles.inputBox}
                value={goals.carbsG?.toString() || ""}
                onChangeText={(t) => updateField("goals", "carbsG", parseInt(t, 10) || 0)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
            <View style={profileStyles.rowItem}>
              <Text style={profileStyles.inputLabel}>Fats (g)</Text>
              <TextInput
                style={profileStyles.inputBox}
                value={goals.fatsG?.toString() || ""}
                onChangeText={(t) => updateField("goals", "fatsG", parseInt(t, 10) || 0)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>
          <Text style={[profileStyles.inputLabel, { marginTop: 12 }]}>Daily Water Goal (L)</Text>
          <TextInput
            style={profileStyles.inputBox}
            value={goals.waterLiters?.toString() || ""}
            onChangeText={(t) => updateField("goals", "waterLiters", parseFloat(t) || 0)}
            keyboardType="decimal-pad"
            placeholder="e.g. 2.5"
          />
        </View>
      ) : (
        <View>
          <Text style={profileStyles.inputLabel}>Primary Goal</Text>
          <Text style={[profileStyles.text, { marginBottom: 12, fontWeight: '600' }]}> {PRIMARY_GOAL_OPTIONS.find(o => o.key === goals.primaryGoal)?.label || "Not set"} </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={profileStyles.inputLabel}>Calories</Text>
              <Text style={profileStyles.text}>{goals.dailyCalories || "—"} kcal</Text>
            </View>
            <View>
              <Text style={profileStyles.inputLabel}>Protein</Text>
              <Text style={profileStyles.text}>{goals.proteinG || "—"} g</Text>
            </View>
            <View>
              <Text style={profileStyles.inputLabel}>Carbs</Text>
              <Text style={profileStyles.text}>{goals.carbsG || "—"} g</Text>
            </View>
            <View>
              <Text style={profileStyles.inputLabel}>Fats</Text>
              <Text style={profileStyles.text}>{goals.fatsG || "—"} g</Text>
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            <Text style={profileStyles.inputLabel}>Water Goal</Text>
            <Text style={profileStyles.text}>{goals.waterLiters || "—"} L</Text>
          </View>
        </View>
      )}
    </EditableSection>
  );
}
