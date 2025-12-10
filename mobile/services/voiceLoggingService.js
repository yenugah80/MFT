// services/voiceLoggingService.js
import { Audio } from "expo-av";
import { Alert } from "react-native";
import { API_URL } from "../constants/api";

export const VoiceLoggingService = {
  recording: null,

  async start(token, router) {
    try {
      // 1. Request permissions
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Permission required",
          "Microphone access is needed for voice logging."
        );
        return;
      }

      // 2. Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // 3. Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;

      // Show "Recording..." UI (handled by caller usually, but we can alert for now)
      // In a real app, you'd return the recording object to the UI to show a waveform.
      Alert.alert(
        "Listening...",
        "Speak your meal now. Tap 'Stop' when done.",
        [
          {
            text: "Stop & Analyze",
            onPress: () => this.stopAndUpload(token, router),
          },
          {
            text: "Cancel",
            onPress: () => this.cancel(),
            style: "cancel",
          },
        ]
      );
    } catch (err) {
      console.error("Failed to start recording", err);
      Alert.alert("Error", "Could not start voice recording.");
    }
  },

  async stopAndUpload(token, router) {
    if (!this.recording) return;

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();

      if (!uri) {
        throw new Error("No recording URI found");
      }

      // 4. Upload to backend
      const formData = new FormData();
      formData.append("audio", {
        uri,
        type: "audio/m4a", // Expo default is m4a/caf
        name: "voice_log.m4a",
      });

      // Note: You need to implement /api/nutrition/voice-log on backend
      const response = await fetch(`${API_URL}/nutrition/voice-log`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Voice analysis failed");
      }

      const data = await response.json();

      // 5. Navigate to details
      router.push({
        pathname: "/(tabs)/food-details",
        params: { food: JSON.stringify(data), source: "voice" },
      });
    } catch (err) {
      console.error("Voice upload error", err);
      Alert.alert("Error", "Failed to analyze voice log.");
    } finally {
      this.recording = null;
    }
  },

  async cancel() {
    if (this.recording) {
      await this.recording.stopAndUnloadAsync();
      this.recording = null;
    }
  },
};
