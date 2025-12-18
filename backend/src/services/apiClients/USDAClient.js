/**
 * USDA FoodData Central API Client
 * Production-grade client with rate limiting, caching, and monitoring
 *
 * API Docs: https://fdc.nal.usda.gov/api-guide.html
 * Rate Limits: 1,000 requests/hour (free tier), 3,600/hour (registered)
 */

import { BaseApiClient } from './BaseApiClient.js';
import { ENV } from '../../config/env.js';

class USDAClient extends BaseApiClient {
  constructor() {
    super({
      name: 'USDA FoodData Central',
      baseURL: 'https://api.nal.usda.gov/fdc/v1',
      apiKey: ENV?.USDA_API_KEY || process.env.USDA_API_KEY || 'DEMO_KEY',
      timeout: parseInt(process.env.USDA_TIMEOUT_MS) || 10000,
      cacheTTL: parseInt(process.env.USDA_CACHE_TTL_SECONDS) * 1000 || 86400000, // 24 hours
      rateLimit: {
        maxRequests: parseInt(process.env.USDA_RATE_LIMIT_PER_HOUR) || 900,
        windowMs: 3600000, // 1 hour
      },
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 60000, // 1 minute
      },
      retry: {
        maxAttempts: 3,
        backoffMs: 1000,
        backoffMultiplier: 2,
      },
    });

    // Validate API key
    if (this.apiKey === 'DEMO_KEY') {
      console.warn('[USDA] Using DEMO_KEY. Get your key at: https://fdc.nal.usda.gov/api-key-signup.html');
      console.warn('[USDA] DEMO_KEY has strict rate limits and may return limited results');
    }
  }

  /**
   * Search foods by query
   * @param {string} query - Search term
   * @param {number} pageSize - Number of results (max 200)
   * @returns {Promise<Array>} - Array of food items
   */
  async searchFoods(query, pageSize = 20) {
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }

    if (pageSize < 1 || pageSize > 200) {
      throw new Error('Page size must be between 1 and 200');
    }

    const url = `${this.baseURL}/foods/search?api_key=${this.apiKey}&query=${encodeURIComponent(query)}&pageSize=${pageSize}`;
    const cacheKey = `search:${query}:${pageSize}`;

    try {
      const data = await this.request(url, {}, cacheKey);

      console.log(`[USDA] Search "${query}": ${data.foods?.length || 0} results`);

      return data.foods || [];
    } catch (error) {
      console.error(`[USDA] Search failed for "${query}":`, error.message);
      throw new Error(`USDA search failed: ${error.message}`);
    }
  }

  /**
   * Search foods with detailed nutrition data for resolver pipeline
   * @param {string} name - Food name
   * @returns {Promise<Array>} - Array of foods with normalized nutrition data
   */
  async searchByName(name) {
    const foods = await this.searchFoods(name, 10);

    if (!foods || foods.length === 0) {
      return null;
    }

    return foods.map((food) => {
      const getNutrient = (nutrientName) => {
        const nutrient = food.foodNutrients?.find((n) => n.nutrientName === nutrientName);
        return nutrient ? nutrient.value : 0;
      };

      return {
        fdcId: food.fdcId,
        description: food.description,
        dataType: food.dataType,
        brandOwner: food.brandOwner,
        servingSize: food.servingSize,
        servingSizeUnit: food.servingSizeUnit,
        gramsPerServing: food.servingSize && food.servingSizeUnit === 'g' ? food.servingSize : 100,
        servingText: food.servingSize ? `${food.servingSize} ${food.servingSizeUnit}` : '100g',
        macros: {
          calories_kcal: Math.round(getNutrient('Energy')),
          protein_g: Math.round(getNutrient('Protein') * 10) / 10,
          carbs_g: Math.round(getNutrient('Carbohydrate, by difference') * 10) / 10,
          fat_g: Math.round(getNutrient('Total lipid (fat)') * 10) / 10,
          fiber_g: Math.round(getNutrient('Fiber, total dietary') * 10) / 10,
          sugar_g: Math.round(getNutrient('Sugars, total including NLEA') * 10) / 10,
          sodium_mg: Math.round(getNutrient('Sodium, Na')),
        },
        micros: {
          calcium: { value: getNutrient('Calcium, Ca'), unit: 'mg' },
          iron: { value: getNutrient('Iron, Fe'), unit: 'mg' },
          potassium: { value: getNutrient('Potassium, K'), unit: 'mg' },
          vitamin_a: { value: getNutrient('Vitamin A, RAE'), unit: 'µg' },
          vitamin_c: { value: getNutrient('Vitamin C, total ascorbic acid'), unit: 'mg' },
        },
      };
    });
  }

  /**
   * Get food by FDC ID
   * @param {number} fdcId - Food Data Central ID
   * @returns {Promise<Object>} - Food details
   */
  async getFoodById(fdcId) {
    if (!fdcId || typeof fdcId !== 'number') {
      throw new Error('FDC ID must be a number');
    }

    const url = `${this.baseURL}/food/${fdcId}?api_key=${this.apiKey}`;
    const cacheKey = `food:${fdcId}`;

    try {
      const data = await this.request(url, {}, cacheKey);

      console.log(`[USDA] Fetched food ID ${fdcId}: ${data.description}`);

      return data;
    } catch (error) {
      console.error(`[USDA] Failed to fetch food ID ${fdcId}:`, error.message);
      throw new Error(`USDA fetch failed: ${error.message}`);
    }
  }

  /**
   * Get multiple foods by FDC IDs (batch request)
   * @param {Array<number>} fdcIds - Array of FDC IDs
   * @returns {Promise<Array>} - Array of food details
   */
  async getFoodsByIds(fdcIds) {
    if (!Array.isArray(fdcIds) || fdcIds.length === 0) {
      throw new Error('FDC IDs must be a non-empty array');
    }

    if (fdcIds.length > 20) {
      throw new Error('Maximum 20 FDC IDs per batch request');
    }

    const url = `${this.baseURL}/foods?api_key=${this.apiKey}`;
    const cacheKey = `foods:batch:${fdcIds.join(',')}`;

    try {
      const data = await this.request(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fdcIds }),
        },
        cacheKey
      );

      console.log(`[USDA] Fetched ${data.length || 0} foods by IDs`);

      return data;
    } catch (error) {
      console.error(`[USDA] Batch fetch failed:`, error.message);
      throw new Error(`USDA batch fetch failed: ${error.message}`);
    }
  }
}

// Singleton instance
export const usdaClient = new USDAClient();
