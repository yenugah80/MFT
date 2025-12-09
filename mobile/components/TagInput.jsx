import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { useState } from "react";
import { profileStyles } from "../assets/styles/profile.styles";

/**
 * TagInput Component
 * Reusable component for adding and displaying tags (preferences, allergies, dislikes)
 */
export default function TagInput({
  tags = [],
  onAdd,
  onRemove,
  placeholder = "Add item",
  editable = true,
  variant = "default", // 'default' | 'danger'
  label,
}) {
  const [input, setInput] = useState("");

  const handleAdd = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    
    onAdd(trimmed);
    setInput("");
  };

  const handleKeyPress = (e) => {
    if (e.nativeEvent.key === 'Enter') {
      handleAdd();
    }
  };

  const inputStyles = [
    profileStyles.inputBox,
    profileStyles.flex1,
    variant === "danger" && profileStyles.warningInput,
  ].filter(Boolean);

  const buttonStyles = 
    variant === "danger"
      ? [profileStyles.secondaryButton, profileStyles.addButton]
      : [profileStyles.primaryButton, profileStyles.addButton];

  const buttonTextStyles =
    variant === "danger"
      ? profileStyles.secondaryButtonText
      : profileStyles.primaryButtonText;

  const tagPillStyles = [
    profileStyles.tagPill,
    variant === "danger" && profileStyles.tagDanger,
  ].filter(Boolean);

  return (
    <>
      {label && <Text style={profileStyles.inputLabel}>{label}</Text>}
      
      <View style={profileStyles.inlineInputRow}>
        <TextInput
          style={inputStyles}
          editable={editable}
          value={input}
          onChangeText={setInput}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
        />
        <TouchableOpacity
          style={buttonStyles}
          disabled={!editable}
          onPress={handleAdd}
        >
          <Text style={buttonTextStyles}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={profileStyles.tagRow}>
        {tags.map((item, index) => (
          <TouchableOpacity
            key={`${item}-${index}`}
            disabled={!editable}
            style={tagPillStyles}
            onPress={() => onRemove(item)}
          >
            <Text style={profileStyles.tagText}>{item}</Text>
            {editable && <Text style={profileStyles.tagRemove}>✕</Text>}
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}
