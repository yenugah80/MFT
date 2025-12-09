import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import SafeScreen from "../../components/SafeScreen";
import { COLORS } from "../../constants/colors";
import { UnifiedFoodService } from "../../services/unifiedFoodService";

export default function FoodDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { getToken } = useAuth();
  
  const [foodData, setFoodData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [portionMultiplier, setPortionMultiplier] = useState(1);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0); // For multi-food
  const [scaledValues, setScaledValues] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0, micros: {} });
  const [mealType, setMealType] = useState("snack");
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (params.food) {
      try {
        const parsed = JSON.parse(params.food);
        setFoodData(parsed);
      } catch (e) {
        Alert.alert("Error", "Invalid food data");
        router.back();
      }
    }
  }, [params.food]);

  // Handle Multi-Food vs Single Food
  const isMultiFood = foodData?.detectedFoods && foodData.detectedFoods.length > 0;
  const currentItem = isMultiFood ? foodData.detectedFoods[selectedItemIndex] : foodData;

  // Backend Scaling
  useEffect(() => {
    let isMounted = true;
    async function scale() {
      if (!currentItem) return;
      const token = await getToken();
      const scaled = await UnifiedFoodService.scaleNutrition(currentItem, portionMultiplier, token);
      if (isMounted) setScaledValues(scaled);
    }
    scale();
    return () => { isMounted = false; };
  }, [portionMultiplier, currentItem, getToken]);

  if (!foodData || !currentItem) return <SafeScreen><ActivityIndicator /></SafeScreen>;

  // Safe Accessor
  const safe = (val, fallback = "N/A") => (val !== null && val !== undefined ? val : fallback);

  // Fat normalization
  const fat = scaledValues.fats || scaledValues.fat || 0;

  // Helper to handle various image formats (URL, URI, Base64)
  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('data:')) {
      return url;
    }
    // Assume raw base64 if not one of the above (common with some AI responses)
    return `data:image/jpeg;base64,${url}`;
  };

  const displayImage = getImageUrl(foodData.imageUrl || currentItem.image);

  // Validation Logic
  const expectedCalories = (scaledValues.protein * 4) + (scaledValues.carbs * 4) + (fat * 9);
  const calorieDiff = Math.abs(scaledValues.calories - expectedCalories);
  const isMacroMismatch = calorieDiff > (scaledValues.calories * 0.2) && scaledValues.calories > 50;

  const handleLogFood = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      
      const payload = {
        foodName: currentItem.title || currentItem.name || "Unknown Food",
        calories: scaledValues.calories,
        protein: scaledValues.protein,
        carbs: scaledValues.carbs,
        fats: fat,
        servingSize: `${portionMultiplier} serving`,
        mealType: mealType,
        micros: scaledValues.micros || currentItem.micros || {},
        nutriscore: currentItem.nutriscore,
        ecoscore: currentItem.ecoscore,
        novaScore: currentItem.novaScore,
        dietLabels: currentItem.dietLabels,
        allergens: currentItem.allergens,
        ingredients: currentItem.ingredients,
        imageUrl: displayImage,
        barcode: currentItem.barcode || foodData.barcode,
      };

      const result = await UnifiedFoodService.logFood(payload, token);
      
      if (result) {
        Alert.alert("Success", "Food logged successfully!", [
          { text: "OK", onPress: () => router.replace("/(tabs)/index") }
        ]);
      } else {
        throw new Error("Failed to log");
      }
    } catch (error) {
      Alert.alert("Error", "Could not log food");
    } finally {
      setLoading(false);
    }
  };

  const handleLogEntirePlate = async () => {
    if (!isMultiFood) return;
    setLoading(true);
    try {
      const token = await getToken();
      const payload = foodData.detectedFoods.map(item => ({
        foodName: item.name || item.title || "Unknown Item",
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fats: item.fat || item.fats,
        micros: item.micros || {},
        nutriscore: item.nutriscore,
        ecoscore: item.ecoscore,
        novaScore: item.novaScore,
        dietLabels: item.dietLabels || [],
        allergens: item.allergens || [],
        ingredients: item.ingredients || [],
        mealType: mealType,
        imageUrl: displayImage, // Shared image
      }));

      await UnifiedFoodService.logPlate(payload, token);
      Alert.alert("Success", "Entire plate logged.", [
        { text: "OK", onPress: () => router.replace("/(tabs)/index") }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not log plate");
    } finally {
      setLoading(false);
    }
  };

  const renderScore = (label, value, colorMap) => {
    if (!value || value === "UNKNOWN") return null;
    const color = colorMap[value] || COLORS.textLight;
    return (
      <View style={styles.scoreBadge}>
        <Text style={styles.scoreLabel}>{label}</Text>
        <View style={[styles.scoreValueContainer, { backgroundColor: color }]}>
          <Text style={styles.scoreValue}>{value}</Text>
        </View>
      </View>
    );
  };

  const NUTRISCORE_COLORS = {
    A: "#038141", B: "#85BB2F", C: "#FECB02", D: "#EE8100", E: "#E63E11"
  };
  
  const ECOSCORE_COLORS = {
    A: "#1E8F4E", B: "#2ECC71", C: "#FFC107", D: "#FF9800", E: "#FF5722"
  };

  const NOVA_COLORS = {
    1: "#038141", 2: "#79C000", 3: "#FFB100", 4: "#E63E11",
  };

  const DIET_COLORS = {
    "Vegan": "#4CAF50",
    "Vegetarian": "#2196F3",
    "Keto": "#9C27B0",
    "High-Protein": "#FF9800",
    "Gluten-Free": "#8D6E63",
  };

  const CONFIDENCE_COLORS = (score) => {
    if (score >= 90) return "#4CAF50";
    if (score >= 70) return "#FF9800";
    return "#F44336";
  };

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Food Details</Text>
        <TouchableOpacity onPress={() => setShowDebug(true)}>
          <Ionicons name="code-slash-outline" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Image Section */}
        <View style={styles.imageContainer}>
           {displayImage ? (
             <Image 
               source={{ uri: displayImage }} 
               style={styles.foodImage}
               resizeMode="cover"
             />
           ) : (
             <Ionicons name="fast-food-outline" size={80} color={COLORS.primary} />
           )}
           {currentItem.confidence && (
             <View style={[styles.confidenceBadge, { backgroundColor: CONFIDENCE_COLORS(currentItem.confidence) }]}>
               <Text style={styles.confidenceText}>{currentItem.confidence}% Match</Text>
             </View>
           )}
        </View>

        {/* Title & Multi-Food Selector */}
        <Text style={styles.foodTitle}>{currentItem.title || currentItem.name || "Unknown Food"}</Text>
        
        {isMultiFood && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorContainer}>
            {foodData.detectedFoods.map((item, index) => (
              <TouchableOpacity 
                key={index} 
                onPress={() => {
                  setSelectedItemIndex(index);
                  setPortionMultiplier(1); // Reset portion on switch
                }}
                style={[
                  styles.selectorChip, 
                  selectedItemIndex === index && styles.selectorChipActive
                ]}
              >
                <Text style={[
                  styles.selectorText,
                  selectedItemIndex === index && styles.selectorTextActive
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Scores Row */}
        <View style={styles.scoresRow}>
          {renderScore("NutriScore", safe(currentItem.nutriscore), NUTRISCORE_COLORS)}
          {renderScore("EcoScore", safe(currentItem.ecoscore), ECOSCORE_COLORS)}
          {currentItem.novaScore && (
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreLabel}>NOVA</Text>
              <View style={[styles.scoreValueContainer, { backgroundColor: NOVA_COLORS[currentItem.novaScore] || COLORS.primary }]}>
                <Text style={styles.scoreValue}>{currentItem.novaScore}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Validation Warning */}
        {isMacroMismatch && (
          <View style={styles.warningCard}>
            <Ionicons name="warning-outline" size={20} color="#E65100" />
            <Text style={styles.warningText}>
              Nutrition Mismatch: Expected ~{Math.round(expectedCalories)} kcal but detected {scaledValues.calories} kcal.
            </Text>
          </View>
        )}

        {/* Macros Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nutrition per serving</Text>
          
          <View style={styles.macroRow}>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{scaledValues.calories}</Text>
              <Text style={styles.macroLabel}>kcal</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{scaledValues.protein}g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{scaledValues.carbs}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{fat}g</Text>
              <Text style={styles.macroLabel}>Fat</Text>
            </View>
          </View>

          {/* Portion Control */}
          <View style={styles.portionContainer}>
            <Text style={styles.portionLabel}>Portion:</Text>
            <View style={styles.portionControl}>
              <TouchableOpacity onPress={() => setPortionMultiplier(Math.max(0.5, portionMultiplier - 0.5))}>
                <Ionicons name="remove-circle-outline" size={28} color={COLORS.primary} />
              </TouchableOpacity>
              <Text style={styles.portionValue}>{portionMultiplier}x</Text>
              <TouchableOpacity onPress={() => setPortionMultiplier(portionMultiplier + 0.5)}>
                <Ionicons name="add-circle-outline" size={28} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.servingHint}>
            {currentItem.servingSize ? `Base serving: ${currentItem.servingSize}` : "Base serving: 100g"}
          </Text>
        </View>

        {/* Meal Type Selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Meal Type</Text>
          <View style={styles.mealTypeContainer}>
            {["Breakfast", "Lunch", "Dinner", "Snack"].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.mealTypeButton,
                  mealType === type.toLowerCase() && styles.mealTypeButtonActive
                ]}
                onPress={() => setMealType(type.toLowerCase())}
              >
                <Text style={[
                  styles.mealTypeText,
                  mealType === type.toLowerCase() && styles.mealTypeTextActive
                ]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Ingredients & Allergens */}
        {(currentItem.ingredients?.length > 0 || currentItem.allergens?.length > 0 || currentItem.dietLabels?.length > 0) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Details</Text>
            
            {Array.isArray(currentItem.allergens) && currentItem.allergens.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>⚠️ Allergens:</Text>
                <View style={styles.tagsContainer}>
                  {currentItem.allergens.map((alg, i) => (
                    <View key={i} style={styles.allergenTag}>
                      <Text style={styles.allergenText}>{alg}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.disclaimerText}>* This food may contain these allergens.</Text>
              </View>
            )}

            {Array.isArray(currentItem.dietLabels) && currentItem.dietLabels.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Dietary Tags:</Text>
                <View style={styles.tagsContainer}>
                  {currentItem.dietLabels.map((tag, i) => (
                    <View key={i} style={[styles.dietTag, { borderColor: DIET_COLORS[tag] || "#C8E6C9" }]}>
                      <Text style={[styles.dietText, { color: DIET_COLORS[tag] || "#2E7D32" }]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {Array.isArray(currentItem.ingredients) && currentItem.ingredients.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Ingredients:</Text>
                <View style={styles.ingredientsList}>
                  {currentItem.ingredients.map((ing, i) => {
                    const isAllergen = currentItem.allergens?.some(a => ing.name.toLowerCase().includes(a.toLowerCase()));
                    return (
                      <Text key={i} style={[styles.ingredientItem, isAllergen && styles.ingredientAllergen]}>
                        {ing.name} {ing.amount ? `(${ing.amount})` : ''}
                      </Text>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Micros */}
        {(scaledValues.micros || currentItem.micros) && Object.keys(scaledValues.micros || currentItem.micros || {}).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Micronutrients (Scaled)</Text>
            {Object.entries(scaledValues.micros || currentItem.micros).map(([key, val]) => {
              // Get original unit if available
              const originalString = currentItem.micros?.[key];
              const unit = typeof originalString === 'string' ? originalString.replace(/[\d.]/g, '').trim() : '';
              
              return (
                val ? (
                  <View key={key} style={styles.microRow}>
                    <Text style={styles.microName}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                    <Text style={styles.microValue}>
                      {typeof val === 'number' ? val.toFixed(1) : val}{unit}
                    </Text>
                  </View>
                ) : null
              );
            })}
          </View>
        )}

        {/* Barcode Info */}
        {(currentItem.barcode || currentItem.brand) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Product Info</Text>
            {currentItem.brand && <Text style={styles.infoText}>Brand: {currentItem.brand}</Text>}
            {currentItem.barcode && <Text style={styles.infoText}>Barcode: {currentItem.barcode}</Text>}
            {currentItem.category && <Text style={styles.infoText}>Category: {currentItem.category}</Text>}
          </View>
        )}

      </ScrollView>

      {/* Footer Action */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.logButton} 
          onPress={handleLogFood}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.logButtonText}>Log Selected Item</Text>
          )}
        </TouchableOpacity>
        
        {isMultiFood && (
          <TouchableOpacity 
            style={[styles.logButton, styles.logPlateButton]} 
            onPress={handleLogEntirePlate}
            disabled={loading}
          >
            <Text style={[styles.logButtonText, styles.logPlateButtonText]}>Log Entire Plate</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Debug Modal */}
      <Modal visible={showDebug} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.debugContainer}>
          <View style={styles.debugHeader}>
            <Text style={styles.debugTitle}>Raw Data</Text>
            <TouchableOpacity onPress={() => setShowDebug(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.debugContent}>
            <Text style={styles.debugText}>{JSON.stringify(foodData, null, 2)}</Text>
          </ScrollView>
        </View>
      </Modal>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  imageContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 200,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    position: 'relative',
  },
  foodImage: {
    width: "100%",
    height: "100%",
  },
  confidenceBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  confidenceText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  foodTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 15,
  },
  selectorContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  selectorChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 10,
  },
  selectorChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  selectorText: {
    color: COLORS.text,
    fontWeight: "600",
  },
  selectorTextActive: {
    color: "#FFF",
  },
  scoresRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 15,
    marginBottom: 20,
  },
  scoreBadge: {
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  scoreValueContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreValue: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 15,
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  macroItem: {
    alignItems: "center",
    flex: 1,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  macroLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  portionContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  portionLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  portionControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  portionValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    minWidth: 40,
    textAlign: "center",
  },
  servingHint: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: 12,
    marginTop: 8,
  },
  mealTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  mealTypeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mealTypeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  mealTypeText: {
    fontSize: 12,
    color: COLORS.text,
  },
  mealTypeTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 15,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  allergenTag: {
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  allergenText: {
    color: "#D32F2F",
    fontSize: 12,
    fontWeight: "600",
  },
  dietTag: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  dietText: {
    color: "#2E7D32",
    fontSize: 12,
    fontWeight: "600",
  },
  ingredientsText: {
    color: COLORS.textLight,
    lineHeight: 20,
  },
  microRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  microName: {
    color: COLORS.text,
  },
  microValue: {
    color: COLORS.textLight,
    fontWeight: "600",
  },
  footer: {
    padding: 20,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  logButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  logButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  warningText: {
    color: '#E65100',
    fontSize: 12,
    flex: 1,
  },
  disclaimerText: {
    fontSize: 10,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginTop: 4,
  },
  ingredientsList: {
    gap: 4,
  },
  ingredientItem: {
    color: COLORS.textLight,
    fontSize: 14,
  },
  ingredientAllergen: {
    color: '#D32F2F',
    fontWeight: 'bold',
  },
  debugContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  debugContent: {
    padding: 20,
  },
  debugText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
});
