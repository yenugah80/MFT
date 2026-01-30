import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, SURFACES, BRAND, TYPOGRAPHY, SPACING, RADIUS } from '../../constants/premiumTheme';
import apiClient from '../../services/apiClient';

// Common ingredients database (quick add options)
const QUICK_ADD_INGREDIENTS = {
  protein: [
    { name: 'Grilled Chicken', calories: 165, protein: 31, carbs: 0, fat: 3.6, portion: '100g' },
    { name: 'Bacon (2 strips)', calories: 86, protein: 6, carbs: 0.3, fat: 6.7, portion: '2 strips' },
    { name: 'Fried Egg', calories: 90, protein: 6, carbs: 0.4, fat: 7, portion: '1 egg' },
    { name: 'Beef Patty', calories: 250, protein: 20, carbs: 0, fat: 18, portion: '113g' },
  ],
  cheese: [
    { name: 'American Cheese', calories: 94, protein: 5, carbs: 2, fat: 7, portion: '1 slice' },
    { name: 'Cheddar Cheese', calories: 113, protein: 7, carbs: 0.4, fat: 9, portion: '1 oz' },
    { name: 'Mozzarella', calories: 85, protein: 6, carbs: 1, fat: 6, portion: '1 oz' },
    { name: 'Parmesan', calories: 110, protein: 10, carbs: 1, fat: 7, portion: '1 oz' },
  ],
  sauce: [
    { name: 'Mayonnaise', calories: 94, protein: 0, carbs: 0, fat: 10, portion: '1 tbsp' },
    { name: 'Ketchup', calories: 20, protein: 0, carbs: 5, fat: 0, portion: '1 tbsp' },
    { name: 'Mustard', calories: 3, protein: 0, carbs: 0.3, fat: 0.2, portion: '1 tsp' },
    { name: 'Ranch Dressing', calories: 73, protein: 0, carbs: 1, fat: 8, portion: '1 tbsp' },
    { name: 'BBQ Sauce', calories: 29, protein: 0, carbs: 7, fat: 0, portion: '1 tbsp' },
  ],
  vegetable: [
    { name: 'Lettuce', calories: 5, protein: 0.5, carbs: 1, fat: 0, portion: '1 cup' },
    { name: 'Tomato Slice', calories: 5, protein: 0.2, carbs: 1, fat: 0, portion: '1 slice' },
    { name: 'Onion (raw)', calories: 6, protein: 0.1, carbs: 1.4, fat: 0, portion: '1 tbsp' },
    { name: 'Pickles', calories: 4, protein: 0.1, carbs: 0.8, fat: 0, portion: '3 slices' },
    { name: 'Avocado', calories: 80, protein: 1, carbs: 4, fat: 7, portion: '50g' },
    { name: 'Jalapenos', calories: 4, protein: 0.1, carbs: 0.9, fat: 0, portion: '1 tbsp' },
  ],
  extras: [
    { name: 'Butter', calories: 102, protein: 0, carbs: 0, fat: 12, portion: '1 tbsp' },
    { name: 'Olive Oil', calories: 119, protein: 0, carbs: 0, fat: 14, portion: '1 tbsp' },
    { name: 'Sour Cream', calories: 23, protein: 0.3, carbs: 0.5, fat: 2.4, portion: '1 tbsp' },
    { name: 'Guacamole', calories: 50, protein: 1, carbs: 3, fat: 4, portion: '2 tbsp' },
  ],
};

const CATEGORY_INFO = {
  protein: { icon: 'fish-outline', color: '#EF4444', label: 'Protein' },
  cheese: { icon: 'cube-outline', color: '#F59E0B', label: 'Cheese' },
  sauce: { icon: 'water-outline', color: '#8B5CF6', label: 'Sauces' },
  vegetable: { icon: 'leaf-outline', color: '#10B981', label: 'Vegetables' },
  extras: { icon: 'add-circle-outline', color: '#6366F1', label: 'Extras' },
};

/**
 * AddIngredientModal
 *
 * Modal for adding ingredients to a food item.
 * Supports quick-add from common ingredients or custom input.
 *
 * Props:
 * - visible: boolean
 * - onClose: () => void
 * - onAdd: (ingredient) => void
 * - foodName: string (for context)
 */
const AddIngredientModal = ({
  visible,
  onClose,
  onAdd,
  foodName = '',
}) => {
  const [activeTab, setActiveTab] = useState('quick');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('protein');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // Custom ingredient form state
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customPortion, setCustomPortion] = useState('1 serving');

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setCustomName('');
      setCustomCalories('');
      setCustomProtein('');
      setCustomCarbs('');
      setCustomFat('');
      setCustomPortion('1 serving');
      setSearchResults([]);
    }
  }, [visible]);

  // Filter quick add ingredients based on search
  const filteredQuickAdd = useMemo(() => {
    const categoryItems = QUICK_ADD_INGREDIENTS[selectedCategory] || [];
    if (!searchQuery.trim()) return categoryItems;

    const query = searchQuery.toLowerCase();
    return categoryItems.filter((item) =>
      item.name.toLowerCase().includes(query)
    );
  }, [selectedCategory, searchQuery]);

  // Search ingredients from backend
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;

    setIsSearching(true);
    try {
      const response = await apiClient.get('/ingredients/database', {
        params: { search: searchQuery },
      });
      setSearchResults(response.data?.ingredients || []);
    } catch (error) {
      console.warn('[AddIngredient] Search failed:', error.message);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Handle quick add selection
  const handleQuickAdd = useCallback((ingredient) => {
    onAdd?.({
      id: `added-${Date.now()}`,
      name: ingredient.name,
      portion: ingredient.portion,
      category: selectedCategory,
      isRemovable: true,
      isOptional: true,
      nutrition: {
        calories: ingredient.calories,
        protein: ingredient.protein,
        carbs: ingredient.carbs,
        fat: ingredient.fat,
      },
    });
    onClose();
  }, [selectedCategory, onAdd, onClose]);

  // Handle custom ingredient add
  const handleCustomAdd = useCallback(() => {
    if (!customName.trim()) return;

    const calories = parseFloat(customCalories) || 0;
    const protein = parseFloat(customProtein) || 0;
    const carbs = parseFloat(customCarbs) || 0;
    const fat = parseFloat(customFat) || 0;

    onAdd?.({
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      portion: customPortion.trim() || '1 serving',
      category: 'extras',
      isRemovable: true,
      isOptional: true,
      nutrition: { calories, protein, carbs, fat },
    });
    onClose();
  }, [customName, customCalories, customProtein, customCarbs, customFat, customPortion, onAdd, onClose]);

  const isCustomValid = customName.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="add-circle" size={24} color={BRAND.primary} />
              <Text style={styles.headerTitle}>Add Ingredient</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={TEXT.tertiary} />
            </TouchableOpacity>
          </View>

          {foodName && (
            <Text style={styles.foodContext}>Adding to: {foodName}</Text>
          )}

          {/* Tab Selector */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'quick' && styles.tabActive]}
              onPress={() => setActiveTab('quick')}
            >
              <Ionicons
                name="flash-outline"
                size={18}
                color={activeTab === 'quick' ? BRAND.primary : TEXT.tertiary}
              />
              <Text style={[styles.tabText, activeTab === 'quick' && styles.tabTextActive]}>
                Quick Add
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'custom' && styles.tabActive]}
              onPress={() => setActiveTab('custom')}
            >
              <Ionicons
                name="create-outline"
                size={18}
                color={activeTab === 'custom' ? BRAND.primary : TEXT.tertiary}
              />
              <Text style={[styles.tabText, activeTab === 'custom' && styles.tabTextActive]}>
                Custom
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Add Tab */}
          {activeTab === 'quick' && (
            <View style={styles.quickAddContent}>
              {/* Category Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryScrollContent}
              >
                {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.categoryPill,
                      selectedCategory === key && styles.categoryPillActive,
                      selectedCategory === key && { backgroundColor: info.color },
                    ]}
                    onPress={() => setSelectedCategory(key)}
                  >
                    <Ionicons
                      name={info.icon}
                      size={16}
                      color={selectedCategory === key ? '#FFFFFF' : info.color}
                    />
                    <Text
                      style={[
                        styles.categoryPillText,
                        selectedCategory === key && styles.categoryPillTextActive,
                      ]}
                    >
                      {info.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={18} color={TEXT.tertiary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search ingredients..."
                  placeholderTextColor={TEXT.tertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                />
                {isSearching && <ActivityIndicator size="small" color={BRAND.primary} />}
              </View>

              {/* Ingredients List */}
              <ScrollView
                style={styles.ingredientsList}
                contentContainerStyle={styles.ingredientsListContent}
                showsVerticalScrollIndicator={false}
              >
                {filteredQuickAdd.map((ingredient, index) => (
                  <TouchableOpacity
                    key={`${ingredient.name}-${index}`}
                    style={styles.ingredientOption}
                    onPress={() => handleQuickAdd(ingredient)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.ingredientOptionLeft}>
                      <View
                        style={[
                          styles.ingredientOptionIcon,
                          { backgroundColor: CATEGORY_INFO[selectedCategory]?.color + '20' },
                        ]}
                      >
                        <Ionicons
                          name={CATEGORY_INFO[selectedCategory]?.icon || 'ellipse-outline'}
                          size={16}
                          color={CATEGORY_INFO[selectedCategory]?.color}
                        />
                      </View>
                      <View>
                        <Text style={styles.ingredientOptionName}>{ingredient.name}</Text>
                        <Text style={styles.ingredientOptionPortion}>{ingredient.portion}</Text>
                      </View>
                    </View>
                    <View style={styles.ingredientOptionRight}>
                      <Text style={styles.ingredientOptionCalories}>+{ingredient.calories}</Text>
                      <Text style={styles.ingredientOptionCaloriesLabel}>cal</Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {filteredQuickAdd.length === 0 && (
                  <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={32} color={TEXT.tertiary} />
                    <Text style={styles.emptyStateText}>No matching ingredients</Text>
                    <Text style={styles.emptyStateHint}>Try the Custom tab to add manually</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}

          {/* Custom Tab */}
          {activeTab === 'custom' && (
            <ScrollView
              style={styles.customContent}
              contentContainerStyle={styles.customContentContainer}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ingredient Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., Extra cheese"
                  placeholderTextColor={TEXT.tertiary}
                  value={customName}
                  onChangeText={setCustomName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Portion Size</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., 1 tbsp, 1 oz"
                  placeholderTextColor={TEXT.tertiary}
                  value={customPortion}
                  onChangeText={setCustomPortion}
                />
              </View>

              <Text style={styles.sectionLabel}>Nutrition (optional)</Text>

              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionInputContainer}>
                  <Text style={styles.nutritionLabel}>Calories</Text>
                  <TextInput
                    style={styles.nutritionInput}
                    placeholder="0"
                    placeholderTextColor={TEXT.tertiary}
                    value={customCalories}
                    onChangeText={setCustomCalories}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.nutritionInputContainer}>
                  <Text style={styles.nutritionLabel}>Protein (g)</Text>
                  <TextInput
                    style={styles.nutritionInput}
                    placeholder="0"
                    placeholderTextColor={TEXT.tertiary}
                    value={customProtein}
                    onChangeText={setCustomProtein}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.nutritionInputContainer}>
                  <Text style={styles.nutritionLabel}>Carbs (g)</Text>
                  <TextInput
                    style={styles.nutritionInput}
                    placeholder="0"
                    placeholderTextColor={TEXT.tertiary}
                    value={customCarbs}
                    onChangeText={setCustomCarbs}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.nutritionInputContainer}>
                  <Text style={styles.nutritionLabel}>Fat (g)</Text>
                  <TextInput
                    style={styles.nutritionInput}
                    placeholder="0"
                    placeholderTextColor={TEXT.tertiary}
                    value={customFat}
                    onChangeText={setCustomFat}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.addButton,
                  !isCustomValid && styles.addButtonDisabled,
                ]}
                onPress={handleCustomAdd}
                disabled={!isCustomValid}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add Ingredient</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: SURFACES.background.secondary,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING[4],
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.divider,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  foodContext: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    paddingHorizontal: SPACING[4],
    paddingTop: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING[4],
    marginTop: SPACING[3],
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  tabActive: {
    backgroundColor: SURFACES.card.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
  },
  tabTextActive: {
    color: BRAND.primary,
  },
  quickAddContent: {
    flex: 1,
  },
  categoryScroll: {
    marginTop: SPACING[3],
  },
  categoryScrollContent: {
    paddingHorizontal: SPACING[4],
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: SURFACES.background.tertiary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryPillActive: {
    borderColor: 'transparent',
  },
  categoryPillText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING[4],
    marginTop: SPACING[3],
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.md,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.primary,
    padding: 0,
  },
  ingredientsList: {
    flex: 1,
    marginTop: SPACING[3],
  },
  ingredientsListContent: {
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[4],
  },
  ingredientOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
  },
  ingredientOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ingredientOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ingredientOptionName: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  ingredientOptionPortion: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginTop: 2,
  },
  ingredientOptionRight: {
    alignItems: 'flex-end',
  },
  ingredientOptionCalories: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: BRAND.primary,
  },
  ingredientOptionCaloriesLabel: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
    marginTop: 12,
  },
  emptyStateHint: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: 4,
  },
  customContent: {
    flex: 1,
    marginTop: SPACING[3],
  },
  customContentContainer: {
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[4],
  },
  inputGroup: {
    marginBottom: SPACING[3],
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.primary,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    marginTop: SPACING[2],
    marginBottom: SPACING[3],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: SPACING[4],
  },
  nutritionInputContainer: {
    width: '47%',
  },
  nutritionLabel: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
    marginBottom: 4,
  },
  nutritionInput: {
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.primary,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    marginTop: SPACING[3],
  },
  addButtonDisabled: {
    backgroundColor: TEXT.tertiary,
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#FFFFFF',
  },
});

export default AddIngredientModal;
