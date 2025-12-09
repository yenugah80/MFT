import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import SafeScreen from "../../components/SafeScreen";
import useActivityLevels from "../../hooks/useActivityLevels";
import { profileStyles } from "../../assets/styles/profile.styles";
import { COLORS } from "../../constants/colors";

const ERROR_COLOR = "#EF4444";

const initialForm = { key: "", label: "", desc: "", factor: "1.2" };

export default function ActivityLevelsScreen() {
  const { levels, loading, error, refresh, createLevel, updateLevel, deleteLevel } = useActivityLevels();
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [submittingId, setSubmittingId] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!levels) return;
    setDrafts(
      levels.reduce((acc, level) => {
        acc[level.id] = {
          ...level,
          factor: String(level.factor ?? ""),
        };
        return acc;
      }, {})
    );
  }, [levels]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (payload) => {
    if (!payload.key.trim() || !payload.label.trim()) {
      throw new Error("Key and label are required");
    }
    const numericFactor = Number(payload.factor);
    if (Number.isNaN(numericFactor) || numericFactor < 1 || numericFactor > 2.5) {
      throw new Error("Factor must be between 1.0 and 2.5");
    }
    return { ...payload, factor: numericFactor };
  };

  const handleCreate = async () => {
    setFormError(null);
    let payload;
    try {
      payload = validate(form);
    } catch (err) {
      setFormError(err.message);
      return;
    }

    setCreating(true);
    try {
      await createLevel(payload);
      setForm(initialForm);
    } catch (err) {
      setFormError(err.message || "Failed to create activity level");
    } finally {
      setCreating(false);
    }
  };

  const handleDraftChange = (id, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleUpdate = async (id) => {
    if (!drafts[id]) return;
    setFormError(null);
    let payload;
    try {
      payload = validate(drafts[id]);
    } catch (err) {
      setFormError(err.message);
      return;
    }

    setSubmittingId(id);
    try {
      await updateLevel(id, payload);
    } catch (err) {
      setFormError(err.message || "Failed to update activity level");
    } finally {
      setSubmittingId(null);
    }
  };

  const resetDraft = (id) => {
    const original = levels?.find((level) => level.id === id);
    if (!original) return;
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...original, factor: String(original.factor ?? "") },
    }));
  };

  const handleDelete = async (id) => {
    setFormError(null);
    setSubmittingId(id);
    try {
      await deleteLevel(id);
    } catch (err) {
      setFormError(err.message || "Failed to delete activity level");
    } finally {
      setSubmittingId(null);
    }
  };

  const sortedLevels = useMemo(() => {
    if (!levels) return [];
    return [...levels].sort((a, b) => a.label.localeCompare(b.label));
  }, [levels]);

  return (
    <SafeScreen>
      <ScrollView style={profileStyles.container}>
        <Text style={profileStyles.headerText}>Activity Levels</Text>
        <Text style={profileStyles.metaText}>
          Admin controls to manage activity levels and factors used for TDEE.
        </Text>

        <View style={[profileStyles.sectionCard, { marginTop: 12 }]}>
          <Text style={profileStyles.sectionTitle}>Add Activity Level</Text>
          {formError && (
            <Text style={[profileStyles.mutedText, { color: ERROR_COLOR, marginTop: 6 }]}>{formError}</Text>
          )}
          <Text style={profileStyles.inputLabel}>Key</Text>
          <TextInput
            style={profileStyles.inputBox}
            value={form.key}
            onChangeText={(v) => handleChange("key", v)}
            placeholder="e.g. moderate"
            autoCapitalize="none"
          />

          <Text style={profileStyles.inputLabel}>Label</Text>
          <TextInput
            style={profileStyles.inputBox}
            value={form.label}
            onChangeText={(v) => handleChange("label", v)}
            placeholder="e.g. Moderate Activity"
          />

          <Text style={profileStyles.inputLabel}>Description</Text>
          <TextInput
            style={profileStyles.inputBox}
            value={form.desc}
            onChangeText={(v) => handleChange("desc", v)}
            placeholder="How often someone moves"
          />

          <Text style={profileStyles.inputLabel}>Factor (1.0 - 2.5)</Text>
          <TextInput
            style={profileStyles.inputBox}
            value={form.factor}
            onChangeText={(v) => handleChange("factor", v)}
            keyboardType="decimal-pad"
            placeholder="e.g. 1.55"
          />

          <TouchableOpacity
            style={[profileStyles.primaryButton, { marginTop: 8, opacity: creating ? 0.7 : 1 }]}
            onPress={handleCreate}
            disabled={creating}
          >
            <Text style={profileStyles.primaryButtonText}>{creating ? "Saving..." : "Create"}</Text>
          </TouchableOpacity>
        </View>

        <View style={profileStyles.sectionCard}>
          <View style={profileStyles.sectionHeaderRow}>
            <Text style={profileStyles.sectionTitle}>Existing Levels</Text>
            <TouchableOpacity onPress={() => refresh(true)}>
              <Text style={profileStyles.ghostButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {error && <Text style={[profileStyles.mutedText, { color: ERROR_COLOR }]}>{error}</Text>}
          {loading && <Text style={profileStyles.mutedText}>Loading...</Text>}
          {!loading && sortedLevels.length === 0 && (
            <Text style={profileStyles.mutedText}>No activity levels found.</Text>
          )}

          {sortedLevels.map((level) => (
            <View key={level.id} style={{ marginBottom: 14 }}>
              <Text style={profileStyles.inputLabel}>Key</Text>
              <TextInput
                style={profileStyles.inputBox}
                value={drafts[level.id]?.key || ""}
                onChangeText={(v) => handleDraftChange(level.id, "key", v)}
                autoCapitalize="none"
              />

              <Text style={profileStyles.inputLabel}>Label</Text>
              <TextInput
                style={profileStyles.inputBox}
                value={drafts[level.id]?.label || ""}
                onChangeText={(v) => handleDraftChange(level.id, "label", v)}
              />

              <Text style={profileStyles.inputLabel}>Description</Text>
              <TextInput
                style={profileStyles.inputBox}
                value={drafts[level.id]?.desc || ""}
                onChangeText={(v) => handleDraftChange(level.id, "desc", v)}
              />

              <Text style={profileStyles.inputLabel}>Factor</Text>
              <TextInput
                style={profileStyles.inputBox}
                value={drafts[level.id]?.factor || ""}
                onChangeText={(v) => handleDraftChange(level.id, "factor", v)}
                keyboardType="decimal-pad"
              />

              <View style={profileStyles.sectionActions}>
                <TouchableOpacity
                  style={[profileStyles.primaryButton, { flex: 1, opacity: submittingId === level.id ? 0.7 : 1 }]}
                  onPress={() => handleUpdate(level.id)}
                  disabled={submittingId === level.id}
                >
                  <Text style={profileStyles.primaryButtonText}>
                    {submittingId === level.id ? "Saving..." : "Save"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[profileStyles.secondaryButton, { flex: 1 }]}
                  onPress={() => resetDraft(level.id)}
                >
                  <Text style={profileStyles.secondaryButtonText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[profileStyles.secondaryButton, { borderColor: ERROR_COLOR, flex: 1 }]}
                  onPress={() => handleDelete(level.id)}
                  disabled={submittingId === level.id}
                >
                  <Text style={[profileStyles.secondaryButtonText, { color: ERROR_COLOR }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeScreen>
  );
}
