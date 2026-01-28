import { ENV } from "../config/env.js";
import { usdaClient } from "./apiClients/USDAClient.js";
import { openaiClient } from "./apiClients/OpenAIClient.js";
import { db } from "../config/db.js";
import { barcodeProductsTable } from "../db/schema.js";
import { eq } from "drizzle-orm";

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
  return openaiClient.isAvailable();
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

// ---------- OpenAI helpers (MIGRATED TO CLIENTS) ----------
// All OpenAI functionality now handled by industrial-grade OpenAIClient
// with cost tracking, rate limiting, caching, and circuit breaker

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

      if (combinedResults.length === 0 && hasOpenAI()) {
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
    // Using industrial-grade USDA client with rate limiting, caching, circuit breaker
    const foods = await usdaClient.searchFoods(query, 20);
    return foods || [];
  },

  /**
   * Search USDA by name and return detailed nutrition data for resolver pipeline
   * Returns array of foods with normalized structure for matching
   *
   * NOW USING: Industrial-grade USDA client with caching, rate limiting, circuit breaker
   */
  searchUSDAByName: async (name) => {
    // Delegate to industrial-grade client
    return await usdaClient.searchByName(name);
  },

  /**
   * Parse text query into structured food items using OpenAI
   * Returns array of parsed food objects with name, quantity, unit
   *
   * NOW USING: Industrial-grade OpenAI client with cost tracking, caching, rate limiting
   */
  parseTextToFoods: async (query) => {
    // Delegate to industrial-grade client
    return await openaiClient.parseTextToFoods(query);
  },

  searchByBarcode: async (barcode) => {
    const code = (barcode || "").trim();
    if (!code) return null;

    // 1) Check cache first
    try {
      const cached = await db.query.barcodeProductsTable.findFirst({
        where: eq(barcodeProductsTable.barcode, code),
      });

      if (cached) {
        const transformed = FoodService.transformProductData({
          code: cached.barcode,
          product_name: cached.productName,
          brands: cached.brand,
          categories: cached.category,
          image_front_small_url: cached.imageUrl,
          image_front_url: cached.imageUrl,
          serving_size: cached.servingSize,
          nutriments: cached.nutriments || {},
        });

        return {
          ...transformed,
          source: cached.source || "cache",
          type: "product",
        };
      }
    } catch (error) {
      console.error("[FoodService] Barcode cache lookup failed", error);
    }

    // 2) Fetch from Open Food Facts
    const url = `https://world.openfoodfacts.org/api/v0/product/${code}.json`;
    const data = await safeFetchJson(url, {}, "OpenFoodFacts barcode");
    const product = data?.product;
    if (!product) return null;

    const transformed = FoodService.transformProductData(product);

    // 3) Upsert into cache (best effort)
    try {
      await db
        .insert(barcodeProductsTable)
        .values({
          barcode: code,
          productName: transformed.title || product.product_name || "Unknown Product",
          brand: transformed.description || product.brands || null,
          category: transformed.category || null,
          imageUrl: transformed.image || product.image_url || null,
          nutriments: product.nutriments || {},
          servingSize: product.serving_size || null,
          source: "openfoodfacts",
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: barcodeProductsTable.barcode,
          set: {
            productName: transformed.title || product.product_name || "Unknown Product",
            brand: transformed.description || product.brands || null,
            category: transformed.category || null,
            imageUrl: transformed.image || product.image_url || null,
            nutriments: product.nutriments || {},
            servingSize: product.serving_size || null,
            source: "openfoodfacts",
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          },
        });
    } catch (error) {
      console.error("[FoodService] Failed to upsert barcode cache", error);
    }

    return {
      ...transformed,
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

  // ------------- AI: Voice Analysis -------------

  /**
   * Transcribe voice recording to text ONLY (step 1 of voice logging)
   * audioBuffer: Buffer containing audio file (m4a, mp3, wav)
   * options: { language: string }
   *
   * USES: gpt-4o-mini-transcribe for speech-to-text
   * Returns: { transcript: string, confidence: number }
   */
  transcribeVoice: async (audioBuffer, options = {}) => {
    try {
      // Transcribe audio using gpt-4o-mini-transcribe
      const transcription = await openaiClient.transcribeAudio(audioBuffer, options);

      if (!transcription || !transcription.text) {
        throw new Error('Transcription failed or empty');
      }

      console.log(`[FoodService] Transcribed: "${transcription.text}"`);

      return {
        transcript: transcription.text,
        confidence: transcription.confidence || 0.9,
      };

    } catch (error) {
      console.error(`[FoodService] Voice transcription failed:`, error.message);
      throw error;
    }
  },

  /**
   * Analyze voice recording and return nutrition data (LEGACY - combines transcribe + analyze)
   * audioBuffer: Buffer containing audio file (m4a, mp3, wav)
   * options: { language: string }
   *
   * USES: gpt-4o-mini-transcribe for speech-to-text + GPT-4o for nutrition extraction
   *
   * NOTE: Prefer using transcribeVoice() + existing nutrition estimation for better UX
   */
  analyzeVoice: async (audioBuffer, options = {}) => {
    try {
      // Step 1: Transcribe audio using gpt-4o-mini-transcribe
      const transcription = await openaiClient.transcribeAudio(audioBuffer, options);

      if (!transcription || !transcription.text) {
        throw new Error('Transcription failed or empty');
      }

      console.log(`[FoodService] Transcribed: "${transcription.text}"`);

      // Step 2: Extract nutrition from transcript using GPT-4o
      const messages = [
        {
          role: 'system',
          content: 'You are a nutrition expert. Extract food and nutrition data from voice transcripts. Return ONLY a JSON object.',
        },
        {
          role: 'user',
          content: `Analyze this food description from a voice recording: "${transcription.text}"

Return JSON with:
{
  "foodName": "string (e.g., 'Grilled Chicken Salad')",
  "description": "string (brief description)",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "sugar": number,
  "sodium": number,
  "servingSize": "string (e.g., '1 cup', '200g')",
  "mealType": "breakfast"|"lunch"|"dinner"|"snack",
  "confidence": 0.0-1.0,
  "micros": {
    "calcium": "string with unit",
    "iron": "string with unit",
    "vitaminA": "string with unit",
    "vitaminC": "string with unit",
    "potassium": "string with unit"
  }
}

Important: Be accurate and realistic with nutrition values. If uncertain, use moderate estimates.`,
        },
      ];

      const json = await openaiClient.chatCompletionJSON(messages, {
        model: 'gpt-4o',
        temperature: 0.3,
        maxTokens: 600,
      });

      if (!json) {
        throw new Error('Nutrition extraction failed');
      }

      // Return normalized food object with transcript
      return {
        ...json,
        transcript: transcription.text,
        transcriptionConfidence: transcription.confidence,
        source: 'voice',
      };

    } catch (error) {
      console.error(`[FoodService] Voice analysis failed:`, error.message);
      throw error;
    }
  },

  // ------------- AI: Image Analysis -------------

  /**
   * Analyze a food image and return normalized food object from AI.
   * base64Image: string (WITHOUT data: prefix)
   * options: {
   *   highAccuracy: boolean,
   *   includeIngredients: boolean,
   *   cuisinePreference: string,
   *   region: string,
   *   cookingMethod: string,
   *   voiceTranscript: string,
   *   mealType: string,
   *   userGoals: object
   * }
   *
   * NOW USING: Industrial-grade OpenAI client with enhanced regional context
   */
  analyzeImage: async (base64Image, options = {}) => {
    try {
      console.log(`[FoodService] Analyzing image with context:`, {
        hasRegion: !!options.region,
        hasCuisine: !!options.cuisinePreference,
        hasVoice: !!options.voiceTranscript,
        mealType: options.mealType
      });

      // Delegate to industrial-grade client with full context
      const aiResult = await openaiClient.analyzeImage(base64Image, {
        highAccuracy: options.highAccuracy ?? true,
        includeIngredients: options.includeIngredients ?? true,
        cuisinePreference: options.cuisinePreference,
        region: options.region,
        cookingMethod: options.cookingMethod,
        customInstructions: options.customInstructions,
        voiceTranscript: options.voiceTranscript,
        mealType: options.mealType,
        userGoals: options.userGoals
      });

      if (!aiResult) {
        throw new Error('AI returned no result for image analysis');
      }

      // Transform to match FoodService format with enhanced fields
      return FoodService.transformAIResponse(aiResult);
    } catch (error) {
      console.error(`[FoodService] Image analysis failed:`, error.message);
      // Re-throw with context preserved
      throw error;
    }
  },

  // ------------- AI: Text-based fallback -------------

  /**
   * Generate food details using AI when no results found in databases
   *
   * NOW USING: Industrial-grade OpenAI client with cost tracking, caching
   */
  generateFoodDetailsAI: async (query) => {
    if (!hasOpenAI()) return null;

    const messages = [
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
    ];

    // Use industrial-grade client with cost tracking
    const json = await openaiClient.chatCompletionJSON(messages, {
      temperature: 0.5,
      maxTokens: 500
    });

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
      fats: Number.isFinite(json.fats || json.fat) ? (json.fats || json.fat) : null,
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
      fats: null,
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
      fats: Number.isFinite(n.fat_100g) ? Math.round(n.fat_100g) : null,
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
    const getNutrient = (name) => {
      const n = food.foodNutrients.find((x) => x.nutrientName === name);
      return n ? n.value : 0;
    };
    const getNutrientString = (name) => {
      const n = food.foodNutrients.find((x) => x.nutrientName === name);
      return n ? `${n.value}${n.unitName.toLowerCase()}` : "0";
    };

    const kcal = getNutrient("Energy");
    const protein = getNutrient("Protein");
    const carbs = getNutrient("Carbohydrate, by difference");
    const fat = getNutrient("Total lipid (fat)");
    const sugars = getNutrient("Sugars, total including NLEA");
    const fiber = getNutrient("Fiber, total dietary");
    const sodium = getNutrient("Sodium, Na");
    const satFat = getNutrient("Fatty acids, total saturated");

    // Construct pseudo-nutriments for NutriScore (assuming USDA values are per 100g usually, 
    // but sometimes per serving. We'll assume per 100g for scoring if not specified, 
    // or just use what we have as a best effort).
    const pseudoNutriments = {
      "energy-kcal_100g": kcal,
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
      fats: Number.isFinite(fat) ? Math.round(fat) : null,
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

  /**
   * Transform AI response into standard Food object.
   * Enhanced to handle multi-item responses and new analysis fields.
   * Ensures all required fields for FoodDetailsScreen are present.
   */
  transformAIResponse: (aiData) => {
    // Handle multi-item format (new enhanced format)
    if (aiData.isMultiItem && Array.isArray(aiData.items)) {
      const totals = aiData.totals || {};
      const mealSummary = aiData.mealSummary || {};
      const firstItem = aiData.items[0] || {};

      return {
        id: `ai_${Date.now()}`,
        title: aiData.items.length === 1
          ? firstItem.name
          : `${mealSummary.dominantCuisine || 'Mixed'} Meal (${aiData.items.length} items)`,
        foodName: firstItem.name || 'Analyzed Meal',
        description: aiData.items.length === 1
          ? firstItem.description
          : `${aiData.items.map(i => i.name).join(', ')}`,
        image: null,
        // Use totals for multi-item meals
        calories: Math.round(totals.calories || 0),
        protein: Math.round(totals.protein || 0),
        carbs: Math.round(totals.carbs || 0),
        fats: Math.round(totals.fat || 0),
        fiber: Math.round(totals.fiber || 0),
        sugar: Math.round(totals.sugar || 0),
        sodium: Math.round(totals.sodium || 0),
        // Health scores
        nutriscore: FoodService._calculateNutriScoreGrade(totals),
        healthScore: mealSummary.healthScore || null,
        // Enhanced metadata
        cookingMethod: firstItem.cookingMethod || null,
        cuisine: mealSummary.dominantCuisine || firstItem.cuisine || null,
        isRestaurantStyle: firstItem.isRestaurantStyle || false,
        portionAssessment: mealSummary.portionAssessment || null,
        // Individual items for detailed view
        items: aiData.items.map(item => ({
          name: item.name,
          description: item.description,
          calories: item.macros?.calories || 0,
          protein: item.macros?.protein || 0,
          carbs: item.macros?.carbs || 0,
          fat: item.macros?.fat || 0,
          fiber: item.macros?.fiber || 0,
          portion: item.portion,
          cookingMethod: item.cookingMethod,
          cuisine: item.cuisine,
          confidence: item.confidence,
          healthFlags: item.healthFlags,
          ingredients: item.ingredients || []
        })),
        // Aggregate fields
        category: mealSummary.mealType || "General",
        servingSize: `${aiData.items.length} item(s)`,
        ingredients: aiData.items.flatMap(i => i.ingredients || []),
        micros: totals.micros || {},
        confidence: Math.min(...aiData.items.map(i => i.confidence || 0.7)),
        // Analysis metadata
        imageAnalysis: aiData.imageAnalysis || null,
        suggestions: mealSummary.suggestions || [],
        isMultiItem: true,
        itemCount: aiData.items.length
      };
    }

    // Handle legacy single-item format
    const nutri = { grade: aiData.nutriscore || "UNKNOWN", score: null };

    return {
      id: `ai_${Date.now()}`,
      title: aiData.foodName || aiData.title || "Unknown Food",
      foodName: aiData.foodName || aiData.title || "Unknown Food",
      description: aiData.description || "AI Analyzed Meal",
      image: null,
      calories: aiData.calories || 0,
      protein: aiData.protein || 0,
      carbs: aiData.carbs || 0,
      fats: aiData.fats || aiData.fat || 0,
      fiber: aiData.fiber || 0,
      sugar: aiData.sugar || 0,
      sodium: aiData.sodium || 0,
      nutriscore: nutri.grade,
      nutriscoreScore: nutri.score,
      healthScore: aiData.healthScore || null,
      cookingMethod: aiData.cookingMethod || null,
      cuisine: aiData.cuisine || null,
      ecoscore: "UNKNOWN",
      category: aiData.mealType || aiData.category || "General",
      servingSize: aiData.servingSize || "1 serving",
      ingredients: Array.isArray(aiData.ingredients) ? aiData.ingredients : [],
      micros: aiData.micros || {},
      confidence: aiData.confidence || 0.75,
      isMultiItem: false
    };
  },

  /**
   * Calculate NutriScore grade from nutrition totals
   * @private
   */
  _calculateNutriScoreGrade: (totals) => {
    if (!totals || !totals.calories) return "UNKNOWN";

    // Simple heuristic based on macro balance
    const protein = totals.protein || 0;
    const fiber = totals.fiber || 0;
    const sodium = totals.sodium || 0;
    const sugar = totals.sugar || 0;

    let score = 0;

    // Positive: protein and fiber
    if (protein > 20) score -= 2;
    if (fiber > 5) score -= 2;

    // Negative: sodium and sugar
    if (sodium > 600) score += 2;
    if (sugar > 15) score += 2;

    if (score <= -2) return "A";
    if (score <= 0) return "B";
    if (score <= 2) return "C";
    if (score <= 4) return "D";
    return "E";
  },
};
