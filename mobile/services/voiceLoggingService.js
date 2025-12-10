// services/voiceLoggingService.js
import { API_URL } from "../constants/api";
import { Alert } from "react-native";

export const VoiceLoggingService = {
  async start(token, router) {
    // This is intentionally structured for production:
    // 1. Get mic permission
    // 2. Record audio
    // 3. Upload to backend for STT + NLP
    // 4. Backend returns structured "meal" candidate
    // 5. Navigate to food-details for confirmation / logging

    // Pseudo-code for now: you still need to wire up actual audio lib
    // (expo-av, react-native-audio, or native module).

    Alert.alert(
      "Voice logging not fully wired",
      "Backend + audio recording need to be connected, but the navigation + API contract are defined."
    );

    // Example contract (what backend should eventually support):
    // const audioBlob = await AudioRecorder.record( ... );
    // const formData = new FormData();
    // formData.append("audio", { uri, type: "audio/m4a", name: "voice.m4a" });
    //
    // const res = await fetch(`${API_URL}/log/voice`, {
    //   method: "POST",
    //   headers: { Authorization: `Bearer ${token}` },
    //   body: formData,
    // });
    //
    // const data = await res.json();
    // router.push({
    //   pathname: "/(tabs)/food-details",
    //   params: { food: JSON.stringify(data), source: "voice" },
    // });
  },
};
