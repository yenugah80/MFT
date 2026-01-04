/**
 * AiEstimatedFood Model
 *
 * Stores AI-estimated food nutrition data with regional variations.
 * This is the core of the self-growing food database.
 *
 * The system saves foods estimated by OpenAI so that:
 * 1. Second user asking for same food gets instant cached result
 * 2. Foods can be verified by users to improve accuracy
 * 3. Regional variations are stored separately (South Indian curry ≠ American curry)
 * 4. Crowdsourcing improves data quality over time
 */

import mongoose from 'mongoose';

const aiEstimatedFoodSchema = new mongoose.Schema(
  {
    // ═══════════════════════════════════════════════════════════
    // CORE FOOD IDENTIFICATION
    // ═══════════════════════════════════════════════════════════
    name: {
      type: String,
      required: true,
      index: true,
      trim: true,
      lowercase: true
    },

    /**
     * Normalized query string for cache matching
     * Example: "masala dosa" → "masaladosa"
     * Used for fuzzy matching without special characters/spaces
     */
    sourceQuery: {
      type: String,
      required: true,
      index: true,
      trim: true,
      lowercase: true
    },

    // ═══════════════════════════════════════════════════════════
    // NUTRITION DATA (Macros & Micros)
    // ═══════════════════════════════════════════════════════════
    nutrition: {
      calories: Number, // kcal
      protein: Number, // grams
      carbs: Number, // grams
      fats: Number, // grams
      fiber: Number, // grams
      sugar: Number, // grams
      sodium: Number, // mg

      /**
       * Micronutrients as a Map for flexibility
       * Example: { calcium: { value: 100, unit: "mg" }, iron: { value: 2, unit: "mg" } }
       */
      micros: {
        type: Map,
        of: {
          value: Number,
          unit: String // "mg", "µg", "IU", etc.
        }
      }
    },

    /**
     * Portion size for the nutrition data
     * Example: { amount: 1, unit: "serving" } or { amount: 100, unit: "g" }
     */
    portion: {
      amount: { type: Number, default: 1 },
      unit: { type: String, default: 'serving' } // "cup", "g", "oz", "serving", etc.
    },

    // ═══════════════════════════════════════════════════════════
    // REGIONAL SUPPORT (NEW)
    // ═══════════════════════════════════════════════════════════

    /**
     * Cuisine type for regional variations
     * Examples: "South Indian", "American", "Italian", "Mexican", "Thai", etc.
     */
    cuisine: {
      type: String,
      index: true,
      trim: true
    },

    /**
     * Geographic region
     * Examples: "India", "USA", "UK", "Europe", etc.
     */
    region: {
      type: String,
      index: true,
      trim: true
    },

    /**
     * Cooking method significantly affects nutrition
     * Examples: "fried", "steamed", "grilled", "boiled", "raw", "baked"
     */
    cookingMethod: {
      type: String,
      index: true,
      trim: true
    },

    // ═══════════════════════════════════════════════════════════
    // INGREDIENTS BREAKDOWN (NEW)
    // ═══════════════════════════════════════════════════════════

    /**
     * Individual ingredients and their nutrition contribution
     * Allows showing users what makes up the dish
     * Example: [
     *   { name: "rice", amount: "1 cup", calories: 200, protein: 4, carbs: 45, fats: 0 },
     *   { name: "dal", amount: "0.5 cup", calories: 115, protein: 9, carbs: 20, fats: 0 }
     * ]
     */
    ingredients: [
      {
        name: String, // ingredient name
        amount: String, // amount (e.g., "1 cup", "100g")
        calories: Number,
        protein: Number, // grams
        carbs: Number, // grams
        fats: Number // grams
      }
    ],

    // ═══════════════════════════════════════════════════════════
    // AI METADATA
    // ═══════════════════════════════════════════════════════════

    /**
     * Confidence score from 0-1
     * 0.5: Low confidence (uncertain AI estimate)
     * 0.7-0.8: Medium (user verified)
     * 0.95+: High (multiple users verified)
     */
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    },

    /**
     * Health score (0-100)
     * Based on nutrient density, processing level (NOVA), macronutrient balance
     * 80+: Very healthy
     * 60-80: Good
     * 40-60: Moderate
     * <40: Less healthy
     */
    healthScore: {
      type: Number,
      min: 0,
      max: 100
    },

    /**
     * Nutri-Score (A-E)
     * A: Best nutritional profile
     * E: Poorest nutritional profile
     */
    nutriScore: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'E']
    },

    /**
     * Human-readable analysis of health score
     * Example: "High protein but high sodium due to soy sauce"
     */
    analysis: String,

    /**
     * Which OpenAI model was used for estimation
     */
    aiModel: {
      type: String,
      enum: ['gpt-4o-mini', 'gpt-4o'],
      default: 'gpt-4o-mini'
    },

    // ═══════════════════════════════════════════════════════════
    // DATA QUALITY & VERIFICATION (NEW)
    // ═══════════════════════════════════════════════════════════

    /**
     * Whether this food has been verified by at least one user
     */
    isVerified: {
      type: Boolean,
      default: false,
      index: true
    },

    /**
     * Number of users who confirmed this estimate as accurate
     */
    verificationCount: {
      type: Number,
      default: 0
    },

    /**
     * Number of users who made corrections to this estimate
     */
    correctionCount: {
      type: Number,
      default: 0
    },

    /**
     * Regional accuracy tracking
     * Key = "India" or "USA", Value = { verifiedCount, correctedCount, avgConfidence }
     * Allows showing "95% accurate in South India" metrics
     */
    regionalAccuracy: {
      type: Map,
      of: {
        verifiedCount: { type: Number, default: 0 },
        correctedCount: { type: Number, default: 0 },
        avgConfidence: { type: Number, default: 0.5 }
      },
      default: new Map()
    },

    /**
     * Individual user verifications for auditability
     * Tracks who verified/corrected and what changes they made
     */
    userVerifications: [
      {
        userId: String, // Clerk user ID
        verified: Boolean, // true = confirmed as accurate, false = made corrections
        corrections: {
          calories: Number,
          protein: Number,
          carbs: Number,
          fats: Number
        },
        region: String, // User's region
        cuisine: String, // User's cuisine preference
        timestamp: { type: Date, default: Date.now }
      }
    ],

    /**
     * User reports for moderation (spam, incorrect data, etc.)
     */
    reports: {
      type: Number,
      default: 0
    },

    /**
     * Data source tracking
     */
    source: {
      type: String,
      enum: ['ai_estimate', 'user_submitted', 'usda_fallback'],
      default: 'ai_estimate'
    },

    // ═══════════════════════════════════════════════════════════
    // CACHE OPTIMIZATION
    // ═══════════════════════════════════════════════════════════

    /**
     * Number of times this food has been retrieved from cache
     * Tracks popularity (helps with cache eviction strategy)
     */
    accessCount: {
      type: Number,
      default: 0,
      index: true
    },

    /**
     * Last time this food was accessed
     * Used for LRU (Least Recently Used) cache eviction
     */
    lastAccessedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'ai_estimated_foods'
  }
);

// ═══════════════════════════════════════════════════════════
// INDEXES FOR PERFORMANCE
// ═══════════════════════════════════════════════════════════

/**
 * Compound index for regional cache lookups
 * Allows fast queries like: find({ sourceQuery, cuisine, region, cookingMethod })
 */
aiEstimatedFoodSchema.index({
  sourceQuery: 1,
  cuisine: 1,
  region: 1,
  cookingMethod: 1
});

/**
 * Index for cache hit queries
 */
aiEstimatedFoodSchema.index({
  sourceQuery: 1,
  cuisine: 1,
  region: 1
});

/**
 * Index for finding verified foods
 */
aiEstimatedFoodSchema.index({
  sourceQuery: 1,
  isVerified: 1,
  confidence: -1
});

// ═══════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════

/**
 * Find the best match for a food query with regional fallback
 *
 * Strategy:
 * 1. Try exact match with cuisine + region + cooking method
 * 2. Fall back without cooking method
 * 3. Fall back without cuisine
 * 4. Fall back to just source query
 *
 * Each step prioritizes verified entries with highest confidence
 *
 * @param {string} sourceQuery - Normalized food query
 * @param {string} cuisine - User's cuisine preference (optional)
 * @param {string} region - User's region (optional)
 * @param {string} cookingMethod - Cooking method (optional)
 * @returns {Promise<Object>} Best matching food or null
 */
aiEstimatedFoodSchema.statics.findBestMatch = async function (
  sourceQuery,
  cuisine = null,
  region = null,
  cookingMethod = null
) {
  // Normalize query
  const normalizedQuery = sourceQuery
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();

  const query = { sourceQuery: normalizedQuery };

  // Build query with optional parameters
  if (cuisine) query.cuisine = cuisine;
  if (region) query.region = region;
  if (cookingMethod) query.cookingMethod = cookingMethod;

  // Try exact match
  let match = await this.findOne(query)
    .sort({ isVerified: -1, confidence: -1 })
    .lean();

  if (match) {
    // Increment access count for LRU
    await this.updateOne(
      { _id: match._id },
      {
        $inc: { accessCount: 1 },
        $set: { lastAccessedAt: new Date() }
      }
    );
    return match;
  }

  // Fallback 1: Remove cooking method
  if (cookingMethod) {
    delete query.cookingMethod;
    match = await this.findOne(query)
      .sort({ isVerified: -1, confidence: -1 })
      .lean();
    if (match) {
      await this.updateOne(
        { _id: match._id },
        {
          $inc: { accessCount: 1 },
          $set: { lastAccessedAt: new Date() }
        }
      );
      return match;
    }
  }

  // Fallback 2: Remove cuisine
  if (cuisine) {
    delete query.cuisine;
    match = await this.findOne(query)
      .sort({ isVerified: -1, confidence: -1 })
      .lean();
    if (match) {
      await this.updateOne(
        { _id: match._id },
        {
          $inc: { accessCount: 1 },
          $set: { lastAccessedAt: new Date() }
        }
      );
      return match;
    }
  }

  // Fallback 3: Just source query
  query.cuisine = undefined;
  query.region = undefined;
  match = await this.findOne({ sourceQuery: normalizedQuery })
    .sort({ isVerified: -1, confidence: -1 })
    .lean();

  if (match) {
    await this.updateOne(
      { _id: match._id },
      {
        $inc: { accessCount: 1 },
        $set: { lastAccessedAt: new Date() }
      }
    );
  }

  return match;
};

/**
 * Add user verification/correction
 * Updates verification counts and recalculates confidence
 *
 * @param {string} userId - Clerk user ID
 * @param {boolean} verified - true if user confirmed, false if user corrected
 * @param {Object} corrections - Nutrition corrections (if any)
 * @param {string} region - User's region
 * @param {string} cuisine - User's cuisine
 */
aiEstimatedFoodSchema.statics.addVerification = async function (
  foodId,
  userId,
  verified,
  corrections = {},
  region = null,
  cuisine = null
) {
  const food = await this.findById(foodId);
  if (!food) throw new Error('Food not found');

  // Add verification record
  food.userVerifications.push({
    userId,
    verified,
    corrections: verified ? {} : corrections,
    region,
    cuisine,
    timestamp: new Date()
  });

  // Update regional accuracy
  if (region) {
    const regionKey = region;
    if (!food.regionalAccuracy.has(regionKey)) {
      food.regionalAccuracy.set(regionKey, {
        verifiedCount: 0,
        correctedCount: 0,
        avgConfidence: food.confidence
      });
    }
    const regionData = food.regionalAccuracy.get(regionKey);
    if (verified) {
      regionData.verifiedCount += 1;
    } else {
      regionData.correctedCount += 1;
      // If correction is significant (>10%), apply it
      if (
        corrections.calories &&
        Math.abs(corrections.calories - food.nutrition.calories) /
          food.nutrition.calories >
          0.1
      ) {
        food.nutrition.calories = corrections.calories;
        food.nutrition.protein = corrections.protein || food.nutrition.protein;
        food.nutrition.carbs = corrections.carbs || food.nutrition.carbs;
        food.nutrition.fats = corrections.fats || food.nutrition.fats;
      }
    }
    // Recalculate average confidence
    const totalRegional = regionData.verifiedCount + regionData.correctedCount;
    regionData.avgConfidence = regionData.verifiedCount / totalRegional;
    food.regionalAccuracy.set(regionKey, regionData);
  }

  // Update global verification counts
  if (verified) {
    food.verificationCount += 1;
  } else {
    food.correctionCount += 1;
  }

  // Recalculate overall confidence
  const totalVerifications = food.verificationCount + food.correctionCount;
  food.confidence = food.verificationCount / totalVerifications;

  // Mark as verified if threshold met
  if (food.verificationCount >= 3) {
    food.isVerified = true;
  }

  await food.save();
  return food;
};

/**
 * Get popular foods for analytics
 * @param {number} limit - Top N foods
 * @returns {Promise<Array>} Top foods by access count
 */
aiEstimatedFoodSchema.statics.getPopular = function (limit = 10) {
  return this.find({})
    .sort({ accessCount: -1 })
    .limit(limit)
    .lean();
};

/**
 * Get unverified foods for review queue
 * @param {number} limit - Number to return
 * @returns {Promise<Array>} Unverified foods
 */
aiEstimatedFoodSchema.statics.getUnverified = function (limit = 20) {
  return this.find({ isVerified: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// ═══════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════

/**
 * Get confidence percentage for display
 */
aiEstimatedFoodSchema.methods.getConfidencePercent = function () {
  return Math.round(this.confidence * 100);
};

/**
 * Check if this food is accurate for a specific region
 */
aiEstimatedFoodSchema.methods.isAccurateForRegion = function (region) {
  if (!region || !this.regionalAccuracy.has(region)) {
    return this.confidence > 0.7;
  }
  const regionData = this.regionalAccuracy.get(region);
  return regionData.avgConfidence > 0.7;
};

export const AiEstimatedFood = mongoose.model(
  'AiEstimatedFood',
  aiEstimatedFoodSchema
);
