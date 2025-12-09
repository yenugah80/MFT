import { API_URL } from "../constants/api";

export const UnifiedFoodService = {
  /**
   * Searches all connected APIs via the Backend BFF.
   */
  searchAll: async (query, token) => {
    try {
      if (!token) return [];
      const response = await fetch(`${API_URL}/food/search?query=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Search failed");
      return await response.json();
    } catch (error) {
      console.error("Error in Unified Search:", error);
      return [];
    }
  },

  /**
   * Look up a product by barcode.
   */
  searchByBarcode: async (barcode, token) => {
    try {
      const response = await fetch(`${API_URL}/food/barcode/${barcode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Barcode lookup failed");
      return await response.json();
    } catch (error) {
      console.error("Error in Barcode Search:", error);
      return null;
    }
  },

  /**
   * Analyzes a food plate image using AI.
   */
  analyzePlate: async (base64Image, token) => {
    try {
      const response = await fetch(`${API_URL}/nutrition/analyze-plate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imageBase64: base64Image }),
      });

      if (!response.ok) throw new Error("Analysis failed");
      return await response.json();
    } catch (error) {
      console.error("Error analyzing plate:", error);
      return null;
    }
  },

  /**
   * Logs a food item to the user's history.
   */
  logFood: async (foodData, token) => {
    try {
      const response = await fetch(`${API_URL}/nutrition/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(foodData),
      });

      if (!response.ok) throw new Error("Logging failed");
      return await response.json();
    } catch (error) {
      console.error("Error logging food:", error);
      return null;
    }
  },

  /**
   * Parses a recipe text/URL using AI.
   */
  parseRecipe: async (text, token) => {
    try {
      const response = await fetch(`${API_URL}/nutrition/recipe/parse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("Recipe parsing failed");
      return await response.json();
    } catch (error) {
      console.error("Error parsing recipe:", error);
      return null;
    }
  },

  /**
   * Fetches nutrition history.
   */
  getHistory: async (date, token) => {
    try {
      const query = date ? `?date=${date}` : "";
      const response = await fetch(`${API_URL}/nutrition/history${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("History fetch failed");
      return await response.json();
    } catch (error) {
      console.error("Error fetching history:", error);
      return [];
    }
  },

  /**
   * Logs multiple food items (a plate) to history.
   */
  logPlate: async (items, token) => {
    try {
      const promises = items.map(item => UnifiedFoodService.logFood(item, token));
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error("Error logging plate:", error);
      return false;
    }
  },

  /**
   * Scales nutrition via backend.
   */
  scaleNutrition: async (item, multiplier, token) => {
    try {
      const nutrients = {
        calories: item.calories || 0,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fats: item.fat || item.fats || 0,
      };

      // Attempt to parse micros for scaling if they are strings
      if (item.micros) {
        Object.entries(item.micros).forEach(([key, val]) => {
          // Extract number from string like "10mg"
          const match = typeof val === 'string' ? val.match(/([\d.]+)/) : [null, val];
          if (match && match[1]) {
             nutrients[key] = parseFloat(match[1]);
          }
        });
      }

      const response = await fetch(`${API_URL}/nutrition/scale`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nutrients,
          baseAmount: 1,
          targetAmount: multiplier,
        }),
      });

      if (!response.ok) return nutrients;
      const scaledResult = await response.json();
      
      // Re-attach units to micros if needed, or return as is
      // For now, we assume the UI handles unit display or backend returns numbers
      return scaledResult;
    } catch (error) {
      console.error("Error scaling:", error);
      return {
        calories: item.calories || 0,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fats: item.fat || item.fats || 0,
        ...item.micros
      };
    }
  },

  // Legacy/Placeholder methods
  getCategories: () => [],
  getRandomMeals: () => [],
  getRandomMeal: () => null,
  filterByCategory: () => [],
  transformMealData: (meal) => meal,
};
