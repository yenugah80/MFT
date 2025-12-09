import { View, ScrollView, Text, TouchableOpacity, ActivityIndicator, Alert, Modal, StyleSheet, Button } from "react-native";
import { useState, useCallback, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useAuth } from "@clerk/clerk-expo";
import SafeScreen from "../../components/SafeScreen";
import { foodLoggingStyles } from "../../assets/styles/foodLogging.styles";
import { COLORS } from "../../constants/colors";
import { UnifiedFoodService } from "../../services/unifiedFoodService";

const LOGGING_OPTIONS = [
  {
    id: "photo",
    icon: "camera-outline",
    title: "Photo Scan",
    desc: "Snap a picture of your food",
  },
  {
    id: "barcode",
    icon: "barcode",
    title: "Barcode Scan",
    desc: "Scan a product's barcode",
  },
  {
    id: "voice",
    icon: "mic-outline",
    title: "Voice Logging",
    desc: "Say what you ate",
  },
  {
    id: "text",
    icon: "search-outline",
    title: "Text Logging",
    desc: "Search our database",
  },
];

const QUICK_ACTIONS = [
  { id: "water", icon: "water", label: "Add Water" },
  { id: "recipe", icon: "book-outline", label: "Add Recipe" },
  { id: "mood", icon: "happy-outline", label: "Add Mood" },
];

const NAV_ITEMS = [
  { id: "home", icon: "home-outline", label: "Home", route: "/" },
  { id: "diary", icon: "document-text-outline", label: "Diary", route: "/(tabs)/index" },
  { id: "log", icon: "add-circle-outline", label: "Log", active: true },
  { id: "profile", icon: "person-outline", label: "Me", route: "/(tabs)/profile" },
];

export default function FoodLoggingScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [selectedLogging, setSelectedLogging] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Camera & Barcode State
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  // Handle photo scan
  const handlePhotoScan = useCallback(async () => {
    try {
      setLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setMessage({ type: "success", text: "📸 Photo captured! Analyzing food..." });
        
        const token = await getToken();
        const data = await UnifiedFoodService.analyzePlate(result.assets[0].base64, token);
        
        if (data) {
           // Inject the local image URI so it can be displayed
           data.imageUrl = result.assets[0].uri;

           router.push({
             pathname: "/(tabs)/food-details",
             params: { food: JSON.stringify(data) }
           });
        } else {
           throw new Error("Analysis failed");
        }
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to capture/analyze photo" });
      console.error(error);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
      setMessage(null);
    }
  }, [getToken]);

  // Handle barcode scan
  const handleBarcodeScan = useCallback(async () => {
    if (!permission) {
        await requestPermission();
    }
    if (!permission?.granted) {
        const { status } = await requestPermission();
        if (status !== 'granted') {
            Alert.alert("Permission Denied", "Camera access is required to scan barcodes");
            return;
        }
    }
    setIsScanning(true);
    setScanned(false);
  }, [permission, requestPermission]);

  const onBarcodeScanned = async ({ type, data }) => {
    if (scanned) return;
    setScanned(true);
    setIsScanning(false);
    setLoading(true);
    setMessage({ type: "success", text: "📦 Barcode detected! Searching..." });

    try {
        const token = await getToken();
        const result = await UnifiedFoodService.searchByBarcode(data, token);
        
        if (result) {
            router.push({
              pathname: "/(tabs)/food-details",
              params: { food: JSON.stringify(result) }
            });
        } else {
            Alert.alert("Not Found", "Product not found in database.");
        }
    } catch (error) {
        console.error(error);
        Alert.alert("Error", "Failed to lookup barcode");
    } finally {
        setLoading(false);
        setMessage(null);
    }
  };

  // Handle voice logging
  const handleVoiceLogging = useCallback(async () => {
    try {
      setLoading(true);
      setMessage({ type: "success", text: "🎤 Voice logging started..." });
      // TODO: Start voice recording and NLP processing
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to start voice logging" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle text logging
  const handleTextLogging = useCallback(async () => {
    try {
      setLoading(true);
      router.push("/(modals)/foodSearch");
      // Fallback: setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to open food search" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Handle logging option selection
  const handleLoggingSelect = useCallback((id) => {
    setSelectedLogging(id);
    switch (id) {
      case "photo":
        handlePhotoScan();
        break;
      case "barcode":
        handleBarcodeScan();
        break;
      case "voice":
        handleVoiceLogging();
        break;
      case "text":
        handleTextLogging();
        break;
      default:
        break;
    }
  }, [handlePhotoScan, handleBarcodeScan, handleVoiceLogging, handleTextLogging]);

  // Handle quick action
  const handleQuickAction = useCallback((id) => {
    setSelectedAction(id);
    switch (id) {
      case "water":
        setMessage({ type: "success", text: "💧 Added 250ml water" });
        break;
      case "recipe":
        setMessage({ type: "success", text: "📖 Opening recipe builder..." });
        break;
      case "mood":
        setMessage({ type: "success", text: "😊 Mood logged" });
        break;
      default:
        break;
    }
    setTimeout(() => {
      setSelectedAction(null);
      setMessage(null);
    }, 1500);
  }, []);

  // Handle navigation
  const handleNavigation = useCallback((route) => {
    if (route) router.push(route);
  }, [router]);

  return (
    <SafeScreen>
      <View style={foodLoggingStyles.container}>
        {/* Barcode Scanner Modal */}
        <Modal visible={isScanning} animationType="slide" presentationStyle="pageSheet">
            <View style={{ flex: 1, backgroundColor: "black" }}>
                <CameraView
                    style={{ flex: 1 }}
                    facing="back"
                    onBarcodeScanned={scanned ? undefined : onBarcodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr", "ean13", "ean8", "upc_e", "upc_a"],
                    }}
                >
                    <View style={{ flex: 1, justifyContent: "flex-end", padding: 20 }}>
                        <TouchableOpacity 
                            style={{ backgroundColor: "white", padding: 15, borderRadius: 10, alignItems: "center" }}
                            onPress={() => setIsScanning(false)}
                        >
                            <Text style={{ fontSize: 16, fontWeight: "bold" }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </CameraView>
            </View>
        </Modal>

        {/* Header */}
        <View style={foodLoggingStyles.header}>
          <TouchableOpacity style={foodLoggingStyles.iconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={foodLoggingStyles.headerTitle}>Log Your Meal</Text>
          <View style={foodLoggingStyles.iconButton} />
        </View>

        {/* Main Content */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
          {/* Message Display */}
          {message && (
            <View style={message.type === "success" ? foodLoggingStyles.successMessage : foodLoggingStyles.errorMessage}>
              <Text style={message.type === "success" ? foodLoggingStyles.successText : foodLoggingStyles.errorText}>
                {message.text}
              </Text>
            </View>
          )}

          {/* Logging Options Grid */}
          <View style={foodLoggingStyles.gridContainer}>
            <View style={foodLoggingStyles.loggingGrid}>
              {LOGGING_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    foodLoggingStyles.loggingCard,
                    selectedLogging === option.id && foodLoggingStyles.loggingCardActive,
                    { opacity: loading ? 0.6 : 1 },
                  ]}
                  onPress={() => handleLoggingSelect(option.id)}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Ionicons name={option.icon} size={28} color={COLORS.text} />
                  <View>
                    <Text style={foodLoggingStyles.loggingCardTitle}>{option.title}</Text>
                    <Text style={foodLoggingStyles.loggingCardDesc}>{option.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quick Actions */}
          <Text style={foodLoggingStyles.quickActionsLabel}>Quick Actions</Text>
          <View style={foodLoggingStyles.quickActionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  foodLoggingStyles.quickActionCard,
                  selectedAction === action.id && foodLoggingStyles.quickActionCardActive,
                  { opacity: loading ? 0.6 : 1 },
                ]}
                onPress={() => handleQuickAction(action.id)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <View style={foodLoggingStyles.quickActionIcon}>
                  <Ionicons name={action.icon} size={20} color={COLORS.text} />
                </View>
                <Text style={foodLoggingStyles.quickActionText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Primary CTA */}
          <TouchableOpacity
            style={[foodLoggingStyles.primaryButton, { opacity: loading ? 0.7 : 1 }]}
            onPress={() => handleLoggingSelect("photo")}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.text} />
            ) : (
              <Text style={foodLoggingStyles.primaryButtonText}>Scan a Full Meal</Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={foodLoggingStyles.bottomNav}>
          {NAV_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                foodLoggingStyles.navItem,
                item.active ? foodLoggingStyles.navItemActive : foodLoggingStyles.navItemInactive,
              ]}
              onPress={() => handleNavigation(item.route)}
              disabled={item.active}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.active ? "add-circle" : item.icon}
                size={item.active ? 28 : 24}
                color={item.active ? COLORS.primary : COLORS.textLight}
                style={{
                  ...(item.active ? { fontWeight: "700" } : {}),
                }}
              />
              <Text style={item.active ? foodLoggingStyles.navLabelActive : foodLoggingStyles.navLabel}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeScreen>
  );
}
