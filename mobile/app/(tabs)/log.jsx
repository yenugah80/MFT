// app/(tabs)/log.jsx
import { 
  View, 
  ScrollView, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  Modal 
} from "react-native";
import { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useAuth } from "@clerk/clerk-expo";

import SafeScreen from "../../components/SafeScreen";
import { foodLoggingStyles } from "../../assets/styles/foodLogging.styles";
import { COLORS } from "../../constants/colors";
import { UnifiedFoodService } from "../../services/unifiedFoodService";
import { LoggingService } from "../../services/loggingService";
import { VoiceLoggingService } from "../../services/voiceLoggingService";

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
  { id: "water", icon: "water", label: "Add Water (250ml)" },
  { id: "recipe", icon: "book-outline", label: "Add Recipe" },
  { id: "mood", icon: "happy-outline", label: "Log Mood" },
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

  // Camera / barcode
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  /* -------------------------
     Helpers
  --------------------------- */

  const withGlobalLoading = useCallback(
    async (fn, loadingMessage) => {
      try {
        setLoading(true);
        if (loadingMessage) {
          setMessage({ type: "info", text: loadingMessage });
        }
        await fn();
      } catch (err) {
        console.error(err);
        Alert.alert("Error", err?.message || "Something went wrong");
        setMessage({ type: "error", text: "An error occurred" });
      } finally {
        setLoading(false);
        setTimeout(() => setMessage(null), 1500);
      }
    },
    []
  );

  const ensureCameraPermission = useCallback(async () => {
    if (!permission) {
      const { status } = await requestPermission();
      if (status !== "granted") {
        throw new Error("Camera access is required for this feature.");
      }
      return;
    }

    if (!permission.granted) {
      const { status } = await requestPermission();
      if (status !== "granted") {
        throw new Error("Camera access is required for this feature.");
      }
    }
  }, [permission, requestPermission]);

  /* -------------------------
     Photo Scan (AI analysis)
  --------------------------- */

  const handlePhotoScan = useCallback(() => {
    withGlobalLoading(async () => {
      await ensureCameraPermission();

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (result.canceled) {
        setMessage({ type: "info", text: "Photo capture cancelled" });
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.base64) {
        throw new Error("No image data returned from camera.");
      }

      setMessage({ type: "info", text: "Analyzing your meal..." });

      const token = await getToken();
      if (!token) throw new Error("Missing auth token");

      const analysis = await UnifiedFoodService.analyzePlate(asset.base64, token);

      if (!analysis) {
        throw new Error("Failed to analyze meal.");
      }

      // include local URI so UI can show the captured image
      const payload = { ...analysis, imageUrl: asset.uri };

      router.push({
        pathname: "/(tabs)/food-details",
        params: { food: JSON.stringify(payload), source: "photo" },
      });
    }, "Opening camera...");
  }, [withGlobalLoading, ensureCameraPermission, getToken, router]);

  /* -------------------------
     Barcode Scan
  --------------------------- */

  const handleBarcodeScan = useCallback(() => {
    withGlobalLoading(async () => {
      await ensureCameraPermission();
      setIsScanning(true);
      setScanned(false);
      setMessage(null);
    });
  }, [withGlobalLoading, ensureCameraPermission]);

  const onBarcodeScanned = async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setIsScanning(false);

    await withGlobalLoading(async () => {
      const token = await getToken();
      if (!token) throw new Error("Missing auth token");

      setMessage({ type: "info", text: "Looking up product..." });

      const result = await UnifiedFoodService.searchByBarcode(data, token);

      if (!result) {
        Alert.alert("Not Found", "Product not found in our database.");
        return;
      }

      router.push({
        pathname: "/(tabs)/food-details",
        params: { food: JSON.stringify(result), source: "barcode" },
      });
    });
  };

  /* -------------------------
     Voice Logging
  --------------------------- */

  const handleVoiceLogging = useCallback(() => {
    withGlobalLoading(async () => {
      const token = await getToken();
      if (!token) throw new Error("Missing auth token");

      await VoiceLoggingService.start(token, router);
    }, "Starting voice logging...");
  }, [withGlobalLoading, getToken, router]);

  /* -------------------------
     Text Logging (Search)
  --------------------------- */

  const handleTextLogging = useCallback(() => {
    withGlobalLoading(async () => {
      router.push("/(modals)/foodSearch");
    }, "Opening food search...");
  }, [withGlobalLoading, router]);

  /* -------------------------
     Quick Actions
  --------------------------- */

  const handleQuickAction = useCallback(
    (id) => {
      setSelectedAction(id);

      withGlobalLoading(async () => {
        const token = await getToken();
        if (!token) throw new Error("Missing auth token");

        switch (id) {
          case "water":
            await LoggingService.logWater(token, 0.25); // 0.25 L (250 ml)
            setMessage({ type: "success", text: "💧 Added 250ml of water" });
            break;

          case "recipe":
            // Navigate to a recipe builder screen (you can implement this route)
            router.push("/(modals)/recipeBuilder");
            break;

          case "mood":
            await LoggingService.logMood(token, {
              mood: "neutral",
              source: "quick_action",
            });
            setMessage({ type: "success", text: "😊 Mood logged" });
            break;

          default:
            break;
        }
      }).finally?.(() => {
        setTimeout(() => {
          setSelectedAction(null);
        }, 1200);
      });
    },
    [withGlobalLoading, getToken, router]
  );

  /* -------------------------
     Logging option handler
  --------------------------- */

  const handleLoggingSelect = useCallback(
    (id) => {
      if (loading) return;

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
    },
    [loading, handlePhotoScan, handleBarcodeScan, handleVoiceLogging, handleTextLogging]
  );

  /* -------------------------
     Bottom navigation
  --------------------------- */

  const handleNavigation = useCallback(
    (route) => {
      if (route) router.push(route);
    },
    [router]
  );

  /* -------------------------
     Render
  --------------------------- */

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
              <View
                style={{
                  flex: 1,
                  justifyContent: "flex-end",
                  padding: 20,
                }}
              >
                <TouchableOpacity
                  style={{
                    backgroundColor: "white",
                    padding: 15,
                    borderRadius: 10,
                    alignItems: "center",
                  }}
                  onPress={() => {
                    setIsScanning(false);
                    setScanned(false);
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "bold" }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </CameraView>
          </View>
        </Modal>

        {/* Header */}
        <View style={foodLoggingStyles.header}>
          <TouchableOpacity
            style={foodLoggingStyles.iconButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={foodLoggingStyles.headerTitle}>Log Your Meal</Text>
          <View style={foodLoggingStyles.iconButton} />
        </View>

        {/* Main Content */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
          {/* Message */}
          {message && (
            <View
              style={
                message.type === "error"
                  ? foodLoggingStyles.errorMessage
                  : foodLoggingStyles.successMessage
              }
            >
              <Text
                style={
                  message.type === "error"
                    ? foodLoggingStyles.errorText
                    : foodLoggingStyles.successText
                }
              >
                {message.text}
              </Text>
            </View>
          )}

          {/* Logging Options */}
          <View style={foodLoggingStyles.gridContainer}>
            <View style={foodLoggingStyles.loggingGrid}>
              {LOGGING_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    foodLoggingStyles.loggingCard,
                    selectedLogging === option.id && foodLoggingStyles.loggingCardActive,
                    loading && { opacity: 0.6 },
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
                  loading && { opacity: 0.6 },
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
            style={[
              foodLoggingStyles.primaryButton,
              loading && { opacity: 0.7 },
            ]}
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
                item.active
                  ? foodLoggingStyles.navItemActive
                  : foodLoggingStyles.navItemInactive,
              ]}
              onPress={() => handleNavigation(item.route)}
              disabled={item.active}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.active ? "add-circle" : item.icon}
                size={item.active ? 28 : 24}
                color={item.active ? COLORS.primary : COLORS.textLight}
              />
              <Text
                style={
                  item.active
                    ? foodLoggingStyles.navLabelActive
                    : foodLoggingStyles.navLabel
                }
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeScreen>
  );
}

