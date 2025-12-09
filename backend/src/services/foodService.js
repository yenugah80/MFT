import { ENV } from "../config/env.js";

const USDA_API_KEY = ENV?.USDA_API_KEY || process.env.USDA_API_KEY || "DEMO_KEY";
const OPENAI_API_KEY = ENV?.OPENAI_API_KEY || process.env.OPENAI_API_KEY || null;

// ---------- Generic helpers ----------

async function safeFetchJson(url, options = {}, label = "request") {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      console.error(`[FoodService] ${label} failed with status ${res.status}`, url);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`[FoodService] ${label} error:`, err);
    return null;
  }
}

function hasOpenAI() {
  if (!OPENAI_API_KEY) {
    console.warn("[FoodService] OPENAI_API_KEY is not set. AI features disabled.");
    return false;
  }
  return true;
}

// ---------- NutriScore & EcoScore engine ----------

/**
 * Compute NutriScore (A–E) from per-100g nutriments (OpenFoodFacts-style).
 * Expects `nutriments` object from OFF or similar shape.
 * Returns { grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'UNKNOWN', score: number | null }
 */
function computeNutriScoreFromNutriments(nutriments = {}) {
  if (!nutriments || typeof nutriments !== "object") {
    return { grade: "UNKNOWN", score: null };
  }

  // Energy in kJ per 100g
  let energyKj = nutriments["energy-kj_100g"];
  if (!energyKj && nutriments["energy-kcal_100g"]) {
    energyKj = nutriments["energy-kcal_100g"] * 4.184;
  }

  const sugars = nutriments["sugars_100g"];
  const satFat = nutriments["saturated-fat_100g"];
  const sodium =
    nutriments["sodium_100g"] ??
    (nutriments["salt_100g"] ? nutriments["salt_100g"] * 400 : undefined); // Na ≈ 40% of salt (NaCl)

  const fiber = nutriments["fiber_100g"];
  const protein = nutriments["proteins_100g"];

  // Fruits/veg/nuts % if provided by OFF
  const fruitsPct =
    nutriments["fruits-vegetables-nuts_100g"] ??
    nutriments["fruits-vegetables-nuts-estimate_100g"] ??
    0;

  // If we don't even have energy/sugars/satFat/sodium, bail out.
  if (energyKj == null && sugars == null && satFat == null && sodium == null) {
    return { grade: "UNKNOWN", score: null };
  }

  const negativePoints = {
    energy: scoreNegativeEnergy(energyKj),
    sugars: scoreNegativeSugars(sugars),
    satFat: scoreNegativeSatFat(satFat),
    sodium: scoreNegativeSodium(sodium),
  };

  const positivePoints = {
    fruits: scorePositiveFruits(fruitsPct),
    fiber: scorePositiveFiber(fiber),
    protein: scorePositiveProtein(protein),
  };

  const totalNegative =
    negativePoints.energy +
    negativePoints.sugars +
    negativePoints.satFat +
    negativePoints.sodium;

  const totalPositive =
    positivePoints.fruits + positivePoints.fiber + positivePoints.protein;

  const finalScore = totalNegative - totalPositive;
  const grade = scoreToNutriGrade(finalScore);

  return { grade, score: finalScore };
}

// Negative scoring functions (0–10 points each)
function scoreNegativeEnergy(kj) {
  if (kj == null) return 0;
  if (kj <= 335) return 0;
  if (kj <= 670) return 1;
  if (kj <= 1005) return 2;
  if (kj <= 1340) return 3;
  if (kj <= 1675) return 4;
  if (kj <= 2010) return 5;
  if (kj <= 2345) return 6;
  if (kj <= 2680) return 7;
  if (kj <= 3015) return 8;
  if (kj <= 3350) return 9;
  return 10;
}

function scoreNegativeSugars(g) {
  if (g == null) return 0;
  if (g <= 4.5) return 0;
  if (g <= 9) return 1;
  if (g <= 13.5) return 2;
  if (g <= 18) return 3;
  if (g <= 22.5) return 4;
  if (g <= 27) return 5;
  if (g <= 31) return 6;
  if (g <= 36) return 7;
  if (g <= 40) return 8;
  if (g <= 45) return 9;
  return 10;
}

function scoreNegativeSatFat(g) {
  if (g == null) return 0;
  if (g <= 1) return 0;
  if (g <= 2) return 1;
  if (g <= 3) return 2;
  if (g <= 4) return 3;
  if (g <= 5) return 4;
  if (g <= 6) return 5;
  if (g <= 7) return 6;
  if (g <= 8) return 7;
  if (g <= 9) return 8;
  if (g <= 10) return 9;
  return 10;
}

function scoreNegativeSodium(mg) {
  if (mg == null) return 0;
  if (mg <= 90) return 0;
  if (mg <= 180) return 1;
  if (mg <= 270) return 2;
  if (mg <= 360) return 3;
  if (mg <= 450) return 4;
  if (mg <= 540) return 5;
  if (mg <= 630) return 6;
  if (mg <= 720) return 7;
  if (mg <= 810) return 8;
  if (mg <= 900) return 9;
  return 10;
}

// Positive scoring functions (0–5 points each)
function scorePositiveFruits(pct) {
  if (pct == null) return 0;
  if (pct < 40) return 0;
  if (pct < 60) return 1;
  if (pct < 80) return 2;
  return 5;
}

function scorePositiveFiber(g) {
  if (g == null) return 0;
  if (g <= 0.9) return 0;
  if (g <= 1.9) return 1;
  if (g <= 2.8) return 2;
  if (g <= 3.7) return 3;
  if (g <= 4.7) return 4;
  return 5;
}

function scorePositiveProtein(g) {
  if (g == null) return 0;
  if (g <= 1.6) return 0;
  if (g <= 3.2) return 1;
  if (g <= 4.8) return 2;
  if (g <= 6.4) return 3;
  if (g <= 8) return 4;
  return 5;
}

function scoreToNutriGrade(score) {
  if (score == null || Number.isNaN(score)) return "UNKNOWN";
  if (score <= -1) return "A";
  if (score <= 2) return "B";
  if (score <= 10) return "C";
  if (score <= 18) return "D";
  return "E";
}

// ---------- OpenAI helpers ----------

async function callOpenAIChatJSON(payload, label) {
  if (!hasOpenAI()) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        response_format: { type: "json_object" },
        ...payload,
      }),
    });

    const data = await res.json();

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      console.error(`[FoodService] OpenAI (${label}) returned no content`, data);
      return null;
    }

    return JSON.parse(content);
  } catch (err) {
    console.error(`[FoodService] OpenAI (${label}) error:`, err);
    return null;
  }
}

// ---------- Main Service ----------

export const FoodService = {
  // Unified search across MealDB, OpenFoodFacts, USDA, with AI fallback
  searchAll: async (query) => {
    try {
      const [mealDbResults, offResults, usdaResults] = await Promise.allSettled([
        FoodService.searchMealDB(query),
        FoodService.searchOpenFoodFacts(query),
        FoodService.searchUSDA(query),
      ]);

      const meals =
        mealDbResults.status === "fulfilled"
          ? mealDbResults.value.map((item) => ({
              ...FoodService.transformMealData(item),
              source: "mealdb",
              type: "recipe",
            }))
          : [];

      const products =
        offResults.status === "fulfilled"
          ? offResults.value.map((item) => ({
              ...FoodService.transformProductData(item),
              source: "openfoodfacts",
              type: "product",
            }))
          : [];

      const foods =
        usdaResults.status === "fulfilled"
          ? usdaResults.value.map((item) => ({
              ...FoodService.transformUSDAData(item),
              source: "usda",
              type: "generic",
            }))
          : [];

      let combinedResults = [...meals, ...products, ...foods];

      if (combinedResults.length === 0 && OPENAI_API_KEY) {
        console.log("[FoodService] No results in standard APIs. Falling back to OpenAI.");
        const aiResult = await FoodService.generateFoodDetailsAI(query);
        if (aiResult) {
          combinedResults = [
            {
              ...aiResult,
              source: "openai",
              type: "generic",
            },
          ];
        }
      }

      return combinedResults;
    } catch (error) {
      console.error("[FoodService] Error in unified search:", error);
      return [];
    }
  },

  // ------------- External Searches -------------

  searchMealDB: async (query) => {
    const url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(
      query
    )}`;
    const data = await safeFetchJson(url, {}, "MealDB search");
    return data?.meals || [];
  },

  searchOpenFoodFacts: async (query) => {
    // Request specific fields to reduce payload but ensure we get everything we need
    const fields = "code,product_name,brands,image_front_small_url,image_front_url,nutriments,ecoscore_grade,ingredients_text,serving_size,categories_tags";
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
      query
    )}&search_simple=1&action=process&json=1&page_size=20&fields=${fields}`;
    const data = await safeFetchJson(url, {}, "OpenFoodFacts search");
    return data?.products || [];
  },

  searchUSDA: async (query) => {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(
      query
    )}&pageSize=20`;
    const data = await safeFetchJson(url, {}, "USDA search");
    return data?.foods || [];
  },

  searchByBarcode: async (barcode) => {
    const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    const data = await safeFetchJson(url, {}, "OpenFoodFacts barcode");
    const product = data?.product;
    if (!product) return null;

    return {
      ...FoodService.transformProductData(product),
      source: "openfoodfacts",
      type: "product",
    };
  },

  getMealById: async (id) => {
    const url = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`;
    const data = await safeFetchJson(url, {}, "MealDB lookup");
    return data?.meals ? data.meals[0] : null;
  },

  getRandomMeals: async (count = 6) => {
    try {
      const promises = Array(count)
        .fill(null)
        .map(async () => {
          const data = await safeFetchJson(
            "https://www.themealdb.com/api/json/v1/1/random.php",
            {},
            "MealDB random"
          );
          return data?.meals ? data.meals[0] : null;
        });

      const meals = await Promise.all(promises);
      return meals.filter((m) => m !== null);
    } catch (error) {
      console.error("[FoodService] Error getting random meals:", error);
      return [];
    }
  },

  getCategories: async () => {
    const url = "https://www.themealdb.com/api/json/v1/1/categories.php";
    const data = await safeFetchJson(url, {}, "MealDB categories");
    return data?.categories || [];
  },

  filterByIngredient: async (ingredient) => {
    const url = `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(
      ingredient
    )}`;
    const data = await safeFetchJson(url, {}, "MealDB filter by ingredient");
    return data?.meals || [];
  },

  filterByCategory: async (category) => {
    const url = `https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(
      category
    )}`;
    const data = await safeFetchJson(url, {}, "MealDB filter by category");
    return data?.meals || [];
  },

  // ------------- AI: Image Analysis -------------

  /**
   * Analyze a food image and return normalized food object from AI.
   * base64Image: string (WITHOUT data: prefix)
   */
  analyzeImage: async (base64Image) => {
    if (!hasOpenAI()) return null;

    const json = await callOpenAIChatJSON(
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a nutritional assistant. Analyze the food in the image and return ONLY a JSON object.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Analyze this food and return a JSON object with fields: " +
                  '{ "id": "string", "title": "string", "description": "string", "calories": number, "protein": number, "carbs": number, "fat": number, "nutriscore": "A"|"B"|"C"|"D"|"E"|"UNKNOWN", "ecoscore": "A"|"B"|"C"|"D"|"E"|"UNKNOWN", "novaScore": 1|2|3|4, "dietLabels": ["Vegan"|"Keto"|"Gluten-Free"|"Low-Carb"], "allergens": ["Peanuts"|"Dairy"|"Gluten"|"Soy"|"Eggs"|"Fish"|"Shellfish"|"Tree Nuts"], "category": "string", "servingSize": "string", "ingredients": [{"name": "string", "amount": "string"}], "micros": { "calcium": "string", "iron": "string", "vitaminA": "string", "vitaminC": "string", "potassium": "string" }, "detectedFoods": [{"name": "string", "calories": number, "protein": number, "carbs": number, "fat": number, "portion": "string"}] } ' +
                  "Use best estimates for micros, ingredients, and diet labels. If multiple foods are present, list them in 'detectedFoods'. If food is unrecognized, return null.",
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64Image}` },
              },
            ],
          },
        ],
      },
      "analyzeImage"
    );

    if (!json) return null;
    if (json === null) return null;

    const id = json.id || `ai_${Date.now()}`;

    return {
      id,
      title: json.title || "Unknown Food",
      description: json.description || "",
      calories: Number.isFinite(json.calories) ? json.calories : null,
      protein: Number.isFinite(json.protein) ? json.protein : null,
      carbs: Number.isFinite(json.carbs) ? json.carbs : null,
      fat: Number.isFinite(json.fat) ? json.fat : null,
      nutriscore: json.nutriscore || "UNKNOWN",
      ecoscore: json.ecoscore || "UNKNOWN",
      novaScore: json.novaScore || null,
      dietLabels: Array.isArray(json.dietLabels) ? json.dietLabels : [],
      allergens: Array.isArray(json.allergens) ? json.allergens : [],
      category: json.category || "General",
      servingSize: json.servingSize || "1 serving",
      ingredients: Array.isArray(json.ingredients) ? json.ingredients : [],
      micros: json.micros || {},
      detectedFoods: Array.isArray(json.detectedFoods) ? json.detectedFoods : [],
    };
  },

  // ------------- AI: Text-based fallback -------------

  generateFoodDetailsAI: async (query) => {
    if (!hasOpenAI()) return null;

    const json = await callOpenAIChatJSON(
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a nutritional assistant. Analyze the food query and return ONLY a JSON object.",
          },
          {
            role: "user",
            content:
              "Analyze this food item: " +
              query +
              ' Return a JSON object with fields: { "id": "string", "title": "string", "description": "string", "calories": number, "protein": number, "carbs": number, "fat": number, "nutriscore": "A"|"B"|"C"|"D"|"E"|"UNKNOWN", "ecoscore": "A"|"B"|"C"|"D"|"E"|"UNKNOWN", "novaScore": 1|2|3|4, "dietLabels": ["Vegan"|"Keto"|"Gluten-Free"|"Low-Carb"], "allergens": ["Peanuts"|"Dairy"|"Gluten"|"Soy"|"Eggs"|"Fish"|"Shellfish"|"Tree Nuts"], "ingredients": [{"name": "string", "amount": "string"}], "category": "string", "servingSize": "string", "micros": { "calcium": "string", "iron": "string", "vitaminA": "string", "vitaminC": "string", "potassium": "string" } }. If unrecognized, return null.',
          },
        ],
        temperature: 0.5,
      },
      "generateFoodDetailsAI"
    );

    if (!json) return null;
    if (json === null) return null;

    const id = json.id || `ai_${Date.now()}`;

    return {
      id,
      title: json.title || query,
      description: json.description || "",
      calories: Number.isFinite(json.calories) ? json.calories : null,
      protein: Number.isFinite(json.protein) ? json.protein : null,
      carbs: Number.isFinite(json.carbs) ? json.carbs : null,
      fat: Number.isFinite(json.fat) ? json.fat : null,
      nutriscore: json.nutriscore || "UNKNOWN",
      ecoscore: json.ecoscore || "UNKNOWN",
      novaScore: json.novaScore || null,
      dietLabels: Array.isArray(json.dietLabels) ? json.dietLabels : [],
      allergens: Array.isArray(json.allergens) ? json.allergens : [],
      ingredients: Array.isArray(json.ingredients) ? json.ingredients : [],
      category: json.category || "General",
      servingSize: json.servingSize || "1 serving",
      micros: json.micros || {},
    };
  },

  // ------------- Transformers -------------

  transformMealData: (meal) => {
    // Extract ingredients with measures
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const name = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      if (name && name.trim()) {
        ingredients.push({
          name: name.trim(),
          amount: measure ? measure.trim() : "",
        });
      }
    }

    return {
      id: meal.idMeal,
      title: meal.strMeal,
      description: `${meal.strArea || ""} ${meal.strCategory || ""}`.trim(),
      image: meal.strMealThumb || null,
      calories: null, // MealDB doesn't include nutrition
      protein: null,
      carbs: null,
      fat: null,
      nutriscore: "UNKNOWN",
      ecoscore: "UNKNOWN",
      category: meal.strCategory || "General",
      servingSize: "1 serving",
      ingredients,
      micros: {}, // MealDB doesn't provide micros
    };
  },

  transformProductData: (product) => {
    const n = product.nutriments || {};
    const nutri = computeNutriScoreFromNutriments(n);

    // Helper to safely get nutrient with unit
    const getMicro = (key, unit = "mg") => {
      const val = n[key];
      return Number.isFinite(val) ? `${val}${unit}` : null;
    };

    return {
      id: product.code,
      title: product.product_name || "Unknown Product",
      description: product.brands || "",
      image: product.image_front_small_url || product.image_front_url || null,
      calories: Number.isFinite(n["energy-kcal_100g"])
        ? Math.round(n["energy-kcal_100g"])
        : null,
      protein: Number.isFinite(n.protein_100g)
        ? Math.round(n.protein_100g)
        : null,
      carbs: Number.isFinite(n.carbohydrates_100g)
        ? Math.round(n.carbohydrates_100g)
        : null,
      fat: Number.isFinite(n.fat_100g) ? Math.round(n.fat_100g) : null,
      nutriscore: nutri.grade,
      nutriscoreScore: nutri.score,
      ecoscore: product.ecoscore_grade ? product.ecoscore_grade.toUpperCase() : "UNKNOWN",
      category: Array.isArray(product.categories_tags) &&
        product.categories_tags.length > 0
        ? product.categories_tags[0].replace(/^..:/, "")
        : "General",
      servingSize: product.serving_size || "100g",
      ingredients: product.ingredients_text 
        ? [{ name: product.ingredients_text, amount: "see label" }] 
        : [],
      micros: {
        calcium: getMicro("calcium_100g"),
        iron: getMicro("iron_100g"),
        vitaminA: getMicro("vitamin-a_100g", "IU"),
        vitaminC: getMicro("vitamin-c_100g"),
        potassium: getMicro("potassium_100g"),
      }
    };
  },

  transformUSDAData: (food) => {
    const getNutrientVal = (predicate) => {
      const n = (food.foodNutrients || []).find(predicate);
      return n ? n.value : null;
    };

    const getNutrientString = (name) => {
      const n = (food.foodNutrients || []).find(nut => nut.nutrientName.toLowerCase().includes(name.toLowerCase()));
      return n ? `${n.value} ${n.unitName}` : null;
    };

    const kcal = getNutrientVal((n) => /energy/i.test(n.nutrientName));
    const protein = getNutrientVal((n) => /protein/i.test(n.nutrientName));
    const carbs = getNutrientVal((n) => /carbohydrate/i.test(n.nutrientName));
    const fat = getNutrientVal((n) => /total lipid/i.test(n.nutrientName));
    const satFat = getNutrientVal((n) => /saturated fat/i.test(n.nutrientName));
    const sugars = getNutrientVal((n) => /sugars/i.test(n.nutrientName));
    const fiber = getNutrientVal((n) => /fiber/i.test(n.nutrientName));
    const sodium = getNutrientVal((n) => /sodium/i.test(n.nutrientName));

    // Build a pseudo-nutriments to reuse NutriScore engine
    const pseudoNutriments = {
      "energy-kj_100g": kcal != null ? kcal * 4.184 : undefined,
      "sugars_100g": sugars,
      "saturated-fat_100g": satFat,
      "sodium_100g": sodium != null ? sodium / 1000 : undefined, // USDA mg -> g
      "fiber_100g": fiber,
      "proteins_100g": protein,
    };

    const nutri = computeNutriScoreFromNutriments(pseudoNutriments);

    return {
      id: String(food.fdcId),
      title: food.description,
      description:
        food.brandOwner || food.additionalDescriptions || "USDA Food Item",
      image: null,
      calories: Number.isFinite(kcal) ? Math.round(kcal) : null,
      protein: Number.isFinite(protein) ? Math.round(protein) : null,
      carbs: Number.isFinite(carbs) ? Math.round(carbs) : null,
      fat: Number.isFinite(fat) ? Math.round(fat) : null,
      nutriscore: nutri.grade,
      nutriscoreScore: nutri.score,
      ecoscore: "UNKNOWN", // USDA doesn't provide eco score
      category: food.foodCategory || "General",
      servingSize: food.servingSize ? `${food.servingSize} ${food.servingSizeUnit}` : "100g",
      ingredients: food.ingredients 
        ? [{ name: food.ingredients, amount: "see label" }] 
        : [],
      micros: {
        calcium: getNutrientString("Calcium"),
        iron: getNutrientString("Iron"),
        vitaminA: getNutrientString("Vitamin A"),
        vitaminC: getNutrientString("Vitamin C"),
        potassium: getNutrientString("Potassium"),
      }
    };
  },
};
