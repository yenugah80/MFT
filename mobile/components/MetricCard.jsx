import { View, Text } from "react-native";
import { profileStyles } from "../assets/styles/profile.styles";

/**
 * MetricCard Component
 * Displays a single health metric (BMI, BMR, TDEE)
 */
export default function MetricCard({ label, value, unit = "", description }) {
  const displayValue = value ?? "-";
  const displayText = unit ? `${displayValue} ${unit}` : displayValue;

  return (
    <View style={profileStyles.metricCard}>
      <Text style={profileStyles.metricLabel}>{label}</Text>
      <Text style={profileStyles.metricValue}>{displayText}</Text>
      {description && (
        <Text style={profileStyles.metaText}>{description}</Text>
      )}
    </View>
  );
}
