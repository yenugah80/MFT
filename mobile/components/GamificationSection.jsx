import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { profileStyles } from "../assets/styles/profile.styles";
import EditableSection from "./EditableSection";
import { XP_PER_LEVEL, BADGE_PRESETS } from "../constants/profileConfig";

export default function GamificationSection({
  data,
  isEditing,
  isSaving,
  onUpdate,
  onToggleEdit,
  onSave,
  onCancel,
}) {
  const handleToggleBadge = (badge) => {
    const currentBadges = data.badges || [];
    const newBadges = currentBadges.includes(badge)
      ? currentBadges.filter((b) => b !== badge)
      : [...currentBadges, badge];
    
    onUpdate('badges', newBadges);
  };

  const handleIncrementStreak = () => {
    onUpdate('streak', (data.streak || 0) + 1);
  };

  const progressPercentage = Math.min(100, ((data.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100);

  return (
    <EditableSection
      title="Progress & Gamification"
      isEditing={isEditing}
      isSaving={isSaving}
      onToggleEdit={onToggleEdit}
      onSave={onSave}
      onCancel={onCancel}
    >
      <View style={profileStyles.rowGap16}>
        <View style={profileStyles.rowItem}>
          <Text style={profileStyles.inputLabel}>XP</Text>
          <TextInput
            style={profileStyles.inputBox}
            editable={isEditing}
            keyboardType="numeric"
            value={String(data.xp || 0)}
            onChangeText={(v) => onUpdate('xp', Number(v.replace(/[^\d]/g, '')) || 0)}
            placeholder="0"
          />
        </View>
        <View style={profileStyles.rowItem}>
          <Text style={profileStyles.inputLabel}>Level</Text>
          <TextInput
            style={profileStyles.inputBox}
            editable={isEditing}
            keyboardType="numeric"
            value={String(data.level || 1)}
            onChangeText={(v) => onUpdate('level', Number(v.replace(/[^\d]/g, '')) || 1)}
            placeholder="1"
          />
        </View>
        <View style={profileStyles.rowItem}>
          <Text style={profileStyles.inputLabel}>Streak (days)</Text>
          <View style={profileStyles.inlineInputRow}>
            <TextInput
              style={[profileStyles.inputBox, profileStyles.flex1]}
              editable={isEditing}
              keyboardType="numeric"
              value={String(data.streak || 0)}
              onChangeText={(v) => onUpdate('streak', Number(v.replace(/[^\d]/g, '')) || 0)}
              placeholder="0"
            />
            <TouchableOpacity
              style={[profileStyles.secondaryButton, profileStyles.addButton]}
              disabled={!isEditing}
              onPress={handleIncrementStreak}
            >
              <Text style={profileStyles.secondaryButtonText}>+1</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Text style={profileStyles.subTitle}>Progress indicators</Text>
      <View style={profileStyles.progressCard}>
        <Text style={profileStyles.mutedText}>XP to next level</Text>
        <View style={profileStyles.progressBar}>
          <View
            style={[
              profileStyles.progressFill,
              { width: `${progressPercentage}%` },
            ]}
          />
        </View>
        <Text style={profileStyles.metaText}>
          {data.xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP
        </Text>
      </View>

      <Text style={profileStyles.subTitle}>Achievement badges</Text>
      <View style={profileStyles.chipRow}>
        {BADGE_PRESETS.map((badge) => {
          const selected = (data.badges || []).includes(badge);
          return (
            <TouchableOpacity
              key={badge}
              disabled={!isEditing}
              onPress={() => handleToggleBadge(badge)}
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
                {badge}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={profileStyles.tagRow}>
        {(data.badges || []).map((badge) => (
          <TouchableOpacity
            key={badge}
            disabled={!isEditing}
            style={profileStyles.tagPill}
            onPress={() =>
              onUpdate('badges', data.badges.filter((b) => b !== badge))
            }
          >
            <Text style={profileStyles.tagText}>{badge}</Text>
            {isEditing && <Text style={profileStyles.tagRemove}>✕</Text>}
          </TouchableOpacity>
        ))}
      </View>
    </EditableSection>
  );
}
