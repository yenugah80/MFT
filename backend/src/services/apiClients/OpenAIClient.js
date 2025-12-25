/**
 * OpenAI API Client
 * Production-grade client with cost tracking, rate limiting, and safety controls
 *
 * API Docs: https://platform.openai.com/docs/api-reference
 * Pricing: https://openai.com/pricing
 * - GPT-4o-mini: $0.15/1M input tokens, $0.60/1M output tokens
 * - GPT-4o: $2.50/1M input tokens, $10.00/1M output tokens
 */

import { BaseApiClient } from './BaseApiClient.js';
import { ENV } from '../../config/env.js';

class OpenAIClient extends BaseApiClient {
  constructor() {
    super({
      name: 'OpenAI',
      baseURL: 'https://api.openai.com/v1',
      apiKey: ENV?.OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      timeout: parseInt(process.env.OPENAI_TIMEOUT_MS) || 30000,
      cacheTTL: 3600000, // 1 hour (prompts change rarely)
      rateLimit: {
        maxRequests: parseInt(process.env.OPENAI_RATE_LIMIT_PER_MINUTE) || 60,
        windowMs: 60000, // 1 minute
      },
      circuitBreaker: {
        failureThreshold: 3,
        resetTimeout: 120000, // 2 minutes
      },
      retry: {
        maxAttempts: 2, // OpenAI is expensive, limit retries
        backoffMs: 2000,
        backoffMultiplier: 2,
      },
    });

    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 1000;

    // Cost tracking
    this.costs = {
      totalTokensUsed: 0,
      totalCostUSD: 0,
      requestsByModel: {},
    };

    // Validate API key
    if (!this.apiKey) {
      console.warn('[OpenAI] API key not set. AI features will be disabled.');
      console.warn('[OpenAI] Get your key at: https://platform.openai.com/api-keys');
    }
  }

  /**
   * Check if OpenAI is available
   */
  isAvailable() {
    return !!this.apiKey;
  }

  /**
   * Calculate cost based on token usage
   */
  _calculateCost(model, inputTokens, outputTokens) {
    const pricing = {
      'gpt-4o-mini': { input: 0.15 / 1000000, output: 0.60 / 1000000 },
      'gpt-4o': { input: 2.50 / 1000000, output: 10.00 / 1000000 },
      'gpt-4': { input: 30.00 / 1000000, output: 60.00 / 1000000 },
    };

    const rates = pricing[model] || pricing['gpt-4o-mini'];
    const cost = inputTokens * rates.input + outputTokens * rates.output;

    return {
      cost: cost,
      breakdown: {
        inputCost: inputTokens * rates.input,
        outputCost: outputTokens * rates.output,
      },
    };
  }

  /**
   * Make chat completion request with JSON response
   */
  async chatCompletionJSON(messages, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key not configured');
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages must be a non-empty array');
    }

    const model = options.model || this.model;
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens || this.maxTokens;

    const requestBody = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    };

    // Generate cache key from messages (for identical requests)
    const cacheKey = options.disableCache
      ? null
      : `chat:${model}:${JSON.stringify(messages).substring(0, 100)}`;

    try {
      const data = await this.request(
        `${this.baseURL}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        },
        cacheKey
      );

      // Extract response
      const content = data?.choices?.[0]?.message?.content;

      if (!content) {
        console.error('[OpenAI] No content in response:', data);
        throw new Error('OpenAI returned no content');
      }

      // Parse JSON with error handling (PHASE 3.1 - API FIX)
      let jsonResponse;
      try {
        jsonResponse = JSON.parse(content);
      } catch (parseError) {
        console.error('[OpenAI] JSON parse failed:', parseError.message);
        console.error('[OpenAI] Raw content:', content.substring(0, 500));
        throw new Error(`OpenAI returned invalid JSON: ${parseError.message}`);
      }

      // Track usage and costs
      const usage = data.usage || {};
      const costInfo = this._calculateCost(model, usage.prompt_tokens || 0, usage.completion_tokens || 0);

      this.costs.totalTokensUsed += usage.total_tokens || 0;
      this.costs.totalCostUSD += costInfo.cost;

      if (!this.costs.requestsByModel[model]) {
        this.costs.requestsByModel[model] = { count: 0, tokens: 0, cost: 0 };
      }
      this.costs.requestsByModel[model].count++;
      this.costs.requestsByModel[model].tokens += usage.total_tokens || 0;
      this.costs.requestsByModel[model].cost += costInfo.cost;

      console.log(`[OpenAI] ${model} - Tokens: ${usage.total_tokens || 0}, Cost: $${costInfo.cost.toFixed(6)}`);

      return jsonResponse;
    } catch (error) {
      console.error(`[OpenAI] Request failed:`, error.message);
      throw new Error(`OpenAI request failed: ${error.message}`);
    }
  }

  /**
   * Parse text query into structured food items
   */
  async parseTextToFoods(query) {
    const messages = [
      {
        role: 'system',
        content: 'You are a nutrition assistant. Parse food descriptions into structured data. Return ONLY a JSON object.',
      },
      {
        role: 'user',
        content: `Parse this food description into individual items: "${query}"

Return JSON with this structure:
{
  "foods": [
    {
      "name": "food name (generic, lowercase)",
      "quantity": number,
      "unit": "serving" | "cup" | "oz" | "g" | "ml" | "tbsp" | "tsp",
      "confidence": 0.0-1.0
    }
  ]
}

Examples:
"2 eggs and toast" → [{"name": "eggs", "quantity": 2, "unit": "serving", "confidence": 0.95}, {"name": "toast", "quantity": 1, "unit": "serving", "confidence": 0.9}]
"grilled chicken breast" → [{"name": "grilled chicken breast", "quantity": 1, "unit": "serving", "confidence": 0.9}]
"300g rice with vegetables" → [{"name": "rice", "quantity": 300, "unit": "g", "confidence": 0.95}, {"name": "vegetables", "quantity": 1, "unit": "serving", "confidence": 0.7}]`,
      },
    ];

    try {
      const json = await this.chatCompletionJSON(messages, {
        temperature: 0.3,
        maxTokens: 500,
      });

      if (!json.foods || !Array.isArray(json.foods)) {
        throw new Error('Invalid response format');
      }

      return json.foods;
    } catch (error) {
      console.error(`[OpenAI] Parse failed for "${query}":`, error.message);

      // Fallback: treat entire query as single food
      return [
        {
          name: query,
          quantity: 1,
          unit: 'serving',
          confidence: 0.5,
        },
      ];
    }
  }

  /**
   * Transcribe audio to text using gpt-4o-mini-transcribe
   *
   * @param {Buffer} audioBuffer - Audio file buffer (m4a, mp3, wav, etc.)
   * @param {object} options - Transcription options
   * @param {string} options.language - Language code (e.g., 'en') for better accuracy
   * @param {number} options.temperature - Temperature for transcription (0-1, default 0)
   * @returns {Promise<{text: string, confidence: number}>}
   */
  async transcribeAudio(audioBuffer, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key not configured');
    }

    const { language = 'en', temperature = 0 } = options;

    // Use gpt-4o-mini-transcribe for cost-efficient, high-quality speech-to-text
    const model = 'gpt-4o-mini-transcribe';

    try {
      // Create form data for multipart upload
      const FormData = (await import('form-data')).default;
      const formData = new FormData();

      formData.append('file', audioBuffer, {
        filename: 'audio.m4a',
        contentType: 'audio/m4a',
      });
      formData.append('model', model);
      formData.append('language', language);
      formData.append('temperature', temperature.toString());
      formData.append('response_format', 'json'); // Returns JSON with text and metadata

      // Make request with FormData headers
      const response = await fetch(`${this.baseURL}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...formData.getHeaders(),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Transcription failed: ${response.status}`);
      }

      const data = await response.json();

      // Track usage (approximate - audio transcription is priced differently)
      console.log(`[OpenAI] ${model} - Transcription completed`);

      return {
        text: data.text || '',
        confidence: 0.9, // gpt-4o-transcribe has high accuracy (95%+)
        language: data.language || language,
        duration: data.duration,
      };
    } catch (error) {
      console.error(`[OpenAI] Audio transcription failed:`, error.message);
      throw new Error(`Audio transcription failed: ${error.message}`);
    }
  }

  /**
   * Analyze food image (Vision API)
   *
   * @param {string} base64Image - Base64-encoded image
   * @param {object} options - Analysis options
   * @param {boolean} options.highAccuracy - Use GPT-4o for detailed analysis (16x more expensive but more accurate)
   * @param {boolean} options.includeIngredients - Attempt to list individual ingredients
   */
  async analyzeImage(base64Image, options = {}) {
    const { highAccuracy = false, includeIngredients = false } = options;

    // Model selection:
    // - gpt-4o-mini: Fast, cheap ($0.15/1M), 75-85% accuracy - good for simple foods
    // - gpt-4o: Slower, expensive ($2.50/1M), 85-92% accuracy - needed for complex meals
    const visionModel = highAccuracy
      ? 'gpt-4o'
      : (process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini');

    const systemPrompt = highAccuracy
      ? 'You are an expert nutritionist with deep knowledge of food composition, ingredients, and nutrition science. Provide detailed, accurate nutritional analysis.'
      : 'You are a nutritionist. Analyze the food in the image. Return a JSON object with nutritional details.';

    const userPrompt = includeIngredients
      ? `Analyze this food image in detail. Identify:
1. Main food name
2. Individual ingredients (if visible/detectable)
3. Estimated portion size in grams
4. Detailed macronutrients (calories, protein, carbs, fat, fiber, sugar, sodium)
5. Key micronutrients (calcium, iron, vitamin A, vitamin C, potassium)

Return JSON with: {
  "foodName": "string",
  "description": "string",
  "ingredients": ["ingredient1", "ingredient2", ...],
  "portionGrams": number,
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "sugar": number,
  "sodium": number,
  "servingSize": "string",
  "mealType": "breakfast|lunch|dinner|snack",
  "confidence": 0.0-1.0,
  "micros": {
    "calcium": "string with unit (e.g., 80mg)",
    "iron": "string with unit",
    "vitaminA": "string with unit",
    "vitaminC": "string with unit",
    "potassium": "string with unit"
  }
}

NOTE: Nutri-Score and Eco-Score cannot be reliably estimated from images alone - they require verified database lookups.`
      : 'Identify the food and estimate nutrition. Return JSON with: { foodName, description, calories (number), protein (number), carbs (number), fat (number), servingSize, mealType, confidence (0.0-1.0), micros: { calcium, iron, vitaminA, vitaminC, potassium } }.';

    const messages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: userPrompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ];

    try {
      const json = await this.chatCompletionJSON(messages, {
        model: visionModel,
        maxTokens: highAccuracy ? 1000 : 500,
      });

      const result = {
        foodName: json.foodName || 'Unknown Food',
        description: json.description || 'AI Analyzed Meal',
        calories: json.calories || 0,
        protein: json.protein || 0,
        carbs: json.carbs || 0,
        fat: json.fat || json.fats || 0,
        fiber: json.fiber || 0,
        sugar: json.sugar || 0,
        sodium: json.sodium || 0,
        servingSize: json.servingSize || '1 serving',
        portionGrams: json.portionGrams,
        mealType: json.mealType || 'snack',
        confidence: json.confidence || 0.7,
        ingredients: json.ingredients || [],
        micros: json.micros || {},
        _modelUsed: visionModel,
      };

      // Log accuracy mode
      if (highAccuracy) {
        console.log(`[OpenAI] High-accuracy mode: ${visionModel} (confidence: ${result.confidence})`);
      }

      return result;
    } catch (error) {
      console.error(`[OpenAI] Image analysis failed:`, error.message);
      return null;
    }
  }

  /**
   * Get cost metrics
   */
  getCostMetrics() {
    return {
      ...this.costs,
      totalCostUSD: `$${this.costs.totalCostUSD.toFixed(4)}`,
      byModel: Object.entries(this.costs.requestsByModel).map(([model, stats]) => ({
        model,
        requests: stats.count,
        tokens: stats.tokens,
        cost: `$${stats.cost.toFixed(4)}`,
      })),
    };
  }
}

// Singleton instance
export const openaiClient = new OpenAIClient();
