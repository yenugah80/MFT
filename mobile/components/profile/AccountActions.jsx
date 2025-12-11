import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { profileStyles } from "../../assets/styles/profile.styles";

export default function AccountActions({ onSignOut }) {
  return (
    <View style={profileStyles.sectionCard}>
      <Text style={profileStyles.sectionTitle}>Account</Text>
      <TouchableOpacity style={profileStyles.settingRow} activeOpacity={0.7}>
        <Ionicons name="lock-closed-outline" size={22} color="#6A1B9A" />
        <Text style={profileStyles.settingText}>Privacy & Security</Text>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
      <TouchableOpacity style={profileStyles.settingRow} activeOpacity={0.7}>
        <Ionicons name="notifications-outline" size={22} color="#6A1B9A" />
        <Text style={profileStyles.settingText}>Notifications</Text>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
      <TouchableOpacity
        style={[profileStyles.sectionCard, { backgroundColor: "#FFF3F0", borderColor: "#FFD5CC" }]}
        onPress={onSignOut}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="log-out-outline" size={22} color="#FF7E67" />
          <Text style={[profileStyles.sectionTitle, { color: "#FF7E67", marginLeft: 8 }]}>Sign Out</Text>
        </View>
      </TouchableOpacity>
      <View style={profileStyles.footerNote}>
        <Text style={profileStyles.mutedText}>Manage your account settings and preferences here.</Text>
      </View>
    </View>
  );
}
