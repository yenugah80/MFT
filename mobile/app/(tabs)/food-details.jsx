// app/(tabs)/food-details.jsx
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Image, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import SafeScreen from "../../components/SafeScreen";
import { LoggingService } from "../../services/loggingService";
import { COLORS } from "../../constants/colors";

export default function FoodDetailsScreen() {
  const { food: foodParam, source } = useLocalSearchParams();
  const router = useRouter();
  const { getToken } = useAuth();

  const parsed = foodParam ? JSON.parse(foodParam) : null;
  const food = parsed || {};

  const handleLogMeal = async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error("Missing auth token");

      // This mapping depends on what your backend returns from analyzePlate / barcode
      const payload = {
        foodName: food.name || food.foodName || "Meal",
        calories: food.calories || food.energyKcal || null,
        protein: food.protein || null,
        carbs: food.carbs || null,
        fats: food.fats || null,
        servingSize: food.servingSize || "1 serving",
        mealType: "unspecified", // or breakfast/lunch/etc based on UI
        micros: food.micros || {},
        nutriscore: food.nutriscore || null,
        ecoscore: food.ecoscore || null,
        novaScore: food.novaScore || null,
        dietLabels: food.dietLabels || [],
        allergens: food.allergens || [],
        ingredients: food.ingredients || [],
        barcode: food.barcode || null,
        imageUrl: food.imageUrl || null,
        source: source || "manual",
      };

      await LoggingService.logMeal(token, payload);
      Alert.alert("Logged", "Meal added to your diary.");
      router.push("/(tabs)/index"); // diary / dashboard
    } catch (err) {
      console.error(err);
      Alert.alert("Error", err?.message || "Failed to log meal");
    }
  };

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {food.imageUrl && (
          <Image
            source={{ uri: food.imageUrl }}
            style={{ width: "100%", height: 220, borderRadius: 16, marginBottom: 16 }}
          />
        )}
        <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 8 }}>
          {food.name || food.foodName || "Meal"}
        </Text>
        {food.brand && (
          <Text style={{ fontSize: 14, color: COLORS.textLight, marginBottom: 4 }}>
            {food.brand}
          </Text>
        )}

        {/* Macro summary */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginVertical: 12,
          }}
        >
          <Text>Calories: {food.calories ?? food.energyKcal ?? "-"} kcal</Text>
          <Text>P: {food.protein ?? "-"}g</Text>
          <Text>C: {food.carbs ?? "-"}g</Text>
          <Text>F: {food.fats ?? "-"}g</Text>
        </View>

        {/* You can render ingredients, diet labels, etc. here */}

        <TouchableOpacity
          style={{
            marginTop: 24,
            backgroundColor: COLORS.primary,
            padding: 16,
            borderRadius: 999,
            alignItems: "center",
          }}
          onPress={handleLogMeal}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
            Log this meal
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeScreen>
  );
}
