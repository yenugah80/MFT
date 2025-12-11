import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { profileStyles } from "../../assets/styles/profile.styles";

export default function BasicsSection({ basics, user, onEdit }) {
  return (
    <View style={profileStyles.sectionCard}>
      <View style={{ alignItems: "center", marginBottom: 16 }}>
        {user?.imageUrl ? (
          <Image
            source={{ uri: user.imageUrl }}
            style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 12 }}
          />
        ) : (
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#E0BFB8", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Ionicons name="person" size={40} color="#FFFFFF" />
          </View>
        )}
        <Text style={[profileStyles.sectionTitle, { textAlign: "center" }]}> {basics?.fullName || user?.fullName || "User"} </Text>
        <Text style={[profileStyles.metaText, { textAlign: "center" }]}> {user?.primaryEmailAddress?.emailAddress || ""} </Text>
      </View>
      <TouchableOpacity style={[profileStyles.primaryButton, { alignSelf: 'center', paddingHorizontal: 24 }]} onPress={onEdit}>
        <Text style={profileStyles.primaryButtonText}>Edit Personal Info</Text>
      </TouchableOpacity>
    </View>
  );
}
