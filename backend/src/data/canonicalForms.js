/**
 * Canonical Ingredient Forms Data
 * Separated from logic for better maintainability.
 */
export const CANONICAL_FORMS = {
  // ============================================================================
  // GRAINS & STARCHES
  // ============================================================================

  rice: {
    canonical: "white rice",
    preparation: "cooked",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["rice", "plain rice", "steamed rice", "boiled rice"],
  },

  "white rice": {
    canonical: "white rice",
    preparation: "cooked",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["white rice"],
  },

  "brown rice": {
    canonical: "brown rice",
    preparation: "cooked",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["brown rice", "whole grain rice"],
  },

  "basmati rice": {
    canonical: "basmati rice",
    preparation: "cooked",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["basmati", "basmati rice"],
  },

  "jasmine rice": {
    canonical: "jasmine rice",
    preparation: "cooked",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["jasmine", "jasmine rice", "thai rice"],
  },

  // ============================================================================
  // PROTEINS - EGGS
  // ============================================================================

  egg: {
    canonical: "egg",
    preparation: "boiled",
    portion: { amount: 2, unit: "large" },
    synonyms: ["egg", "eggs"],
  },

  eggs: {
    canonical: "egg",
    preparation: "boiled",
    portion: { amount: 2, unit: "large" },
    synonyms: ["egg", "eggs", "boiled egg"],
  },

  "boiled eggs": {
    canonical: "egg",
    preparation: "boiled",
    portion: { amount: 2, unit: "large" },
    synonyms: ["boiled egg", "hard boiled egg"],
  },

  "scrambled eggs": {
    canonical: "egg",
    preparation: "scrambled",
    portion: { amount: 2, unit: "large" },
    synonyms: ["scrambled egg"],
  },

  "fried eggs": {
    canonical: "egg",
    preparation: "fried",
    portion: { amount: 2, unit: "large" },
    synonyms: ["fried egg", "sunny side up"],
  },

  omelet: {
    canonical: "egg",
    preparation: "omelet",
    portion: { amount: 2, unit: "large" },
    synonyms: ["omelette", "egg omelet"],
  },

  // ============================================================================
  // PROTEINS - CHICKEN
  // ============================================================================

  chicken: {
    canonical: "chicken",
    preparation: "grilled",
    portion: { amount: 4, unit: "oz" },
    synonyms: ["chicken", "plain chicken"],
  },

  "chicken breast": {
    canonical: "chicken breast",
    preparation: "grilled",
    portion: { amount: 4, unit: "oz" },
    synonyms: ["chicken breast", "breast"],
  },

  "grilled chicken": {
    canonical: "chicken",
    preparation: "grilled",
    portion: { amount: 4, unit: "oz" },
    synonyms: ["grilled chicken breast"],
  },

  "fried chicken": {
    canonical: "chicken",
    preparation: "fried",
    portion: { amount: 4, unit: "oz" },
    synonyms: ["fried chicken breast"],
  },

  "chicken thigh": {
    canonical: "chicken thigh",
    preparation: "grilled",
    portion: { amount: 4, unit: "oz" },
    synonyms: ["thigh", "chicken thighs"],
  },

  // ============================================================================
  // PROTEINS - FISH
  // ============================================================================

  salmon: {
    canonical: "salmon",
    preparation: "grilled",
    portion: { amount: 4, unit: "oz" },
    synonyms: ["salmon", "salmon fillet"],
  },

  "grilled salmon": {
    canonical: "salmon",
    preparation: "grilled",
    portion: { amount: 4, unit: "oz" },
    synonyms: ["grilled salmon fillet"],
  },

  tuna: {
    canonical: "tuna",
    preparation: "canned",
    portion: { amount: 3, unit: "oz" },
    synonyms: ["tuna", "canned tuna"],
  },

  // ============================================================================
  // PROTEINS - VEGETARIAN
  // ============================================================================

  tofu: {
    canonical: "tofu",
    preparation: "firm",
    portion: { amount: 100, unit: "g" },
    synonyms: ["tofu", "bean curd"],
  },

  "tofu stir fry": {
    canonical: "tofu",
    preparation: "stir fried",
    portion: { amount: 100, unit: "g" },
    synonyms: ["stir fried tofu"],
  },

  // ============================================================================
  // VEGETABLES
  // ============================================================================

  broccoli: {
    canonical: "broccoli",
    preparation: "steamed",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["broccoli", "broccoli florets"],
  },

  "steamed broccoli": {
    canonical: "broccoli",
    preparation: "steamed",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["steamed broccoli florets"],
  },

  spinach: {
    canonical: "spinach",
    preparation: "raw",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["spinach", "baby spinach"],
  },

  "cooked spinach": {
    canonical: "spinach",
    preparation: "cooked",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["sauteed spinach", "steamed spinach"],
  },

  "spinach curry": {
    canonical: "spinach curry",
    preparation: "cooked",
    portion: { amount: 1, unit: "serving" },
    synonyms: ["spinach curry"],
  },

  "palak curry": {
    canonical: "palak curry",
    preparation: "cooked",
    portion: { amount: 1, unit: "serving" },
    synonyms: ["palak curry"],
  },

  saag: {
    canonical: "saag",
    preparation: "cooked",
    portion: { amount: 1, unit: "serving" },
    synonyms: ["saag"],
  },

  carrots: {
    canonical: "carrot",
    preparation: "raw",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["carrot", "baby carrot"],
  },

  // ============================================================================
  // BREAD & TOAST
  // ============================================================================

  bread: {
    canonical: "bread",
    preparation: "white",
    portion: { amount: 1, unit: "slice" },
    synonyms: ["bread", "bread slice"],
  },

  toast: {
    canonical: "bread",
    preparation: "toasted",
    portion: { amount: 1, unit: "slice" },
    synonyms: ["toast", "toasted bread"],
  },

  "whole wheat toast": {
    canonical: "whole wheat bread",
    preparation: "toasted",
    portion: { amount: 1, unit: "slice" },
    synonyms: ["whole grain toast"],
  },

  "whole wheat bread": {
    canonical: "whole wheat bread",
    preparation: "regular",
    portion: { amount: 1, unit: "slice" },
    synonyms: ["whole grain bread", "brown bread"],
  },

  // ============================================================================
  // FRUITS
  // ============================================================================

  apple: {
    canonical: "apple",
    preparation: "raw",
    portion: { amount: 1, unit: "medium" },
    synonyms: ["apple", "apples"],
  },

  banana: {
    canonical: "banana",
    preparation: "raw",
    portion: { amount: 1, unit: "medium" },
    synonyms: ["banana", "bananas"],
  },

  avocado: {
    canonical: "avocado",
    preparation: "raw",
    portion: { amount: 0.5, unit: "medium" },
    synonyms: ["avocado", "avocados"],
  },

  // ============================================================================
  // DAIRY
  // ============================================================================

  milk: {
    canonical: "milk",
    preparation: "raw",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["milk", "whole milk", "skim milk"],
  },

  cheese: {
    canonical: "cheddar cheese",
    preparation: "sliced",
    portion: { amount: 1, unit: "slice" },
    synonyms: ["cheese", "cheddar", "swiss cheese"],
  },

  yogurt: {
    canonical: "yogurt",
    preparation: "plain",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["yogurt", "greek yogurt"],
  },

  butter: {
    canonical: "butter",
    preparation: "salted",
    portion: { amount: 1, unit: "tbsp" },
    synonyms: ["butter", "margarine"],
  },

  // ============================================================================
  // FAST FOOD & MEALS
  // ============================================================================

  pizza: {
    canonical: "pizza",
    preparation: "regular crust",
    portion: { amount: 1, unit: "slice" },
    synonyms: ["pizza", "cheese pizza", "pepperoni pizza"],
  },

  burger: {
    canonical: "hamburger",
    preparation: "grilled",
    portion: { amount: 1, unit: "sandwich" },
    synonyms: ["burger", "hamburger", "cheeseburger"],
  },

  fries: {
    canonical: "french fries",
    preparation: "fried",
    portion: { amount: 1, unit: "medium" },
    synonyms: ["fries", "french fries", "chips"],
  },

  pasta: {
    canonical: "pasta",
    preparation: "cooked",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["pasta", "spaghetti", "macaroni"],
  },

  // ============================================================================
  // BEVERAGES
  // ============================================================================

  coffee: {
    canonical: "coffee",
    preparation: "brewed",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["coffee", "black coffee"],
  },

  tea: {
    canonical: "tea",
    preparation: "brewed",
    portion: { amount: 1, unit: "cup" },
    synonyms: ["tea", "green tea", "black tea"],
  },

  soda: {
    canonical: "soda",
    preparation: "regular",
    portion: { amount: 1, unit: "can" },
    synonyms: ["soda", "coke", "pop", "soft drink"],
  },
};