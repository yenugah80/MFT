import { View, Text, ScrollView, TouchableOpacity, FlatList, RefreshControl, TextInput } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { MealAPI } from "../../services/mealAPI";
import { homeStyles } from "../../assets/styles/home.styles";
import { Image } from "expo-image";
import { COLORS } from "../../constants/colors";
import { Ionicons } from "@expo/vector-icons";
import CategoryFilter from "../../components/CategoryFilter";
import RecipeCard from "../../components/RecipeCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import { useDebounce } from "../../hooks/useDebounce";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const HomeScreen = () => {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featuredRecipe, setFeaturedRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const loadData = async () => {
    if (!isLoaded || !isSignedIn) return;
    try {
      setLoading(true);
      const token = await getToken();

      const [apiCategories, randomMeals, featuredMeal] = await Promise.all([
        MealAPI.getCategories(token),
        MealAPI.getRandomMeals(12, token),
        MealAPI.getRandomMeal(token),
      ]);

      const transformedCategories = apiCategories.map((cat, index) => ({
        id: index + 1,
        name: cat.strCategory,
        image: cat.strCategoryThumb,
        description: cat.strCategoryDescription,
      }));

      setCategories(transformedCategories);

      if (!selectedCategory) setSelectedCategory(transformedCategories[0].name);

      const transformedMeals = randomMeals
        .map((meal) => MealAPI.transformMealData(meal))
        .filter((meal) => meal !== null);

      setRecipes(transformedMeals);

      const transformedFeatured = MealAPI.transformMealData(featuredMeal);
      setFeaturedRecipe(transformedFeatured);
    } catch (error) {
      console.log("Error loading the data", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryData = async (category) => {
    try {
      const token = await getToken();
      const meals = await MealAPI.filterByCategory(category, token);
      const transformedMeals = meals
        .map((meal) => MealAPI.transformMealData(meal))
        .filter((meal) => meal !== null);
      setRecipes(transformedMeals);
    } catch (error) {
      console.error("Error loading category data:", error);
      setRecipes([]);
    }
  };

  const handleCategorySelect = async (category) => {
    setSelectedCategory(category);
    setSearchQuery(""); // Clear search when selecting category
    await loadCategoryData(category);
  };

  const performSearch = async (query) => {
    if (!query.trim()) {
      // If search is cleared, reload category data
      if (selectedCategory) {
        await loadCategoryData(selectedCategory);
      }
      return;
    }

    setIsSearching(true);
    try {
      const token = await getToken();
      const nameResults = await MealAPI.searchMealsByName(query, token);
      let results = nameResults;

      if (results.length === 0) {
        const ingredientResults = await MealAPI.filterByIngredient(query, token);
        results = ingredientResults;
      }

      const transformedMeals = results
        .slice(0, 12)
        .map((meal) => MealAPI.transformMealData(meal))
        .filter((meal) => meal !== null);

      setRecipes(transformedMeals);
    } catch (error) {
      console.error("Error searching:", error);
      setRecipes([]);
    } finally {
      setIsSearching(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setSearchQuery(""); // Clear search on refresh
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadData();
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (debouncedSearchQuery) {
      performSearch(debouncedSearchQuery);
    } else if (!loading) {
      // Reload category when search is cleared
      if (selectedCategory) {
        loadCategoryData(selectedCategory);
      }
    }
  }, [debouncedSearchQuery]);

  if (loading && !refreshing) return <LoadingSpinner message="Loading delicions recipes..." />;

  return (
    <View style={homeStyles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={homeStyles.scrollContent}
      >
        <View style={homeStyles.tabHeader}>
          <TouchableOpacity
            style={homeStyles.backButton}
            onPress={() => router.replace('/(tabs)/dashboard')}
            accessibilityLabel="Go to Dashboard tab"
          >
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={homeStyles.tabTitle}>Recipes</Text>
        </View>

        {/* SEARCH BAR */}
        <View style={homeStyles.searchSection}>
          <View style={homeStyles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color={COLORS.textLight}
              style={homeStyles.searchIcon}
            />
            <TextInput
              style={homeStyles.searchInput}
              placeholder="Search recipes, ingredients..."
              placeholderTextColor={COLORS.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} style={homeStyles.clearButton}>
                <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/*  ANIMAL ICONS (replaced PNG/JPGs with vector icons) */}
        <View style={homeStyles.welcomeSection}>
          <View style={{ width: 100, height: 100, justifyContent: "center", alignItems: "center" }}>
            <Ionicons name="restaurant-outline" size={56} color={COLORS.primary} />
          </View>
          <View style={{ width: 100, height: 100, justifyContent: "center", alignItems: "center" }}>
            <Ionicons name="fast-food-outline" size={56} color={COLORS.primary} />
          </View>
          <View style={{ width: 100, height: 100, justifyContent: "center", alignItems: "center" }}>
            <Ionicons name="leaf-outline" size={56} color={COLORS.primary} />
          </View>
        </View>

        {/* FEATURED SECTION */}
        {featuredRecipe && (
          <View style={homeStyles.featuredSection}>
            <TouchableOpacity
              style={homeStyles.featuredCard}
              activeOpacity={0.9}
              onPress={() => router.push(`/recipe/${featuredRecipe.id}`)}
            >
              <View style={homeStyles.featuredImageContainer}>
                <Image
                  source={{ uri: featuredRecipe.image }}
                  style={homeStyles.featuredImage}
                  contentFit="cover"
                  transition={500}
                />
                <View style={homeStyles.featuredOverlay}>
                  <View style={homeStyles.featuredBadge}>
                    <Text style={homeStyles.featuredBadgeText}>Featured</Text>
                  </View>

                  <View style={homeStyles.featuredContent}>
                    <Text style={homeStyles.featuredTitle} numberOfLines={2}>
                      {featuredRecipe.title}
                    </Text>

                    <View style={homeStyles.featuredMeta}>
                      <View style={homeStyles.metaItem}>
                        <Ionicons name="time-outline" size={16} color={COLORS.white} />
                        <Text style={homeStyles.metaText}>{featuredRecipe.cookTime}</Text>
                      </View>
                      <View style={homeStyles.metaItem}>
                        <Ionicons name="people-outline" size={16} color={COLORS.white} />
                        <Text style={homeStyles.metaText}>{featuredRecipe.servings}</Text>
                      </View>
                      {featuredRecipe.area && (
                        <View style={homeStyles.metaItem}>
                          <Ionicons name="location-outline" size={16} color={COLORS.white} />
                          <Text style={homeStyles.metaText}>{featuredRecipe.area}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {categories.length > 0 && (
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
          />
        )}

        <View style={homeStyles.recipesSection}>
          <View style={homeStyles.sectionHeader}>
            <Text style={homeStyles.sectionTitle}>
              {searchQuery ? `Results for "${searchQuery}"` : selectedCategory}
            </Text>
            <Text style={homeStyles.resultsCount}>{recipes.length} recipes</Text>
          </View>

          {isSearching ? (
            <View style={homeStyles.loadingContainer}>
              <LoadingSpinner message="Searching recipes..." size="small" />
            </View>
          ) : recipes.length > 0 ? (
            <FlatList
              data={recipes}
              renderItem={({ item }) => <RecipeCard recipe={item} />}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              columnWrapperStyle={homeStyles.row}
              contentContainerStyle={homeStyles.recipesGrid}
              scrollEnabled={false}
              // ListEmptyComponent={}
            />
          ) : (
            <View style={homeStyles.emptyState}>
              <Ionicons name="restaurant-outline" size={64} color={COLORS.textLight} />
              <Text style={homeStyles.emptyTitle}>No recipes found</Text>
              <Text style={homeStyles.emptyDescription}>Try a different category</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};
export default HomeScreen;
