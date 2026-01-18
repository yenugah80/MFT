/**
 * OpenAI API Client
 * Production-grade client with cost tracking, rate limiting, and safety controls
 *
 * API Docs: https://platform.openai.com/docs/api-reference
 * Pricing: https://openai.com/pricing
 * - GPT-4o-mini: $0.15/1M input tokens, $0.60/1M output tokens
 * - GPT-4o: $2.50/1M input tokens, $10.00/1M output tokens
 */

import NodeCache from 'node-cache';
import { createClient } from 'redis';
import OpenAI, { toFile } from 'openai';
import { BaseApiClient } from './BaseApiClient.js';
import { ENV } from '../../config/env.js';
import { buildImageAnalysisPrompt } from './prompts/nutritionAnalysis.js';
import { normalizeNutritionAnalysis, normalizeMultiItemAnalysis, hasRequiredFields, calculateDataQuality } from './schemas/nutritionSchema.js';
import { canonicalize, validateExtraction } from '../canonicalIngredients.js';

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
    this.sdk = this.apiKey ? new OpenAI({ apiKey: this.apiKey }) : null;

    // Cache specifically for nutrition estimation (24 hour TTL)
    if (process.env.REDIS_URL) {
      this.redisClient = createClient({ url: process.env.REDIS_URL });
      this.redisClient.on('error', (err) => console.error('[Redis] Client Error', err));
      this.redisClient.connect().catch(console.error);
    } else {
      this.nutritionCache = new NodeCache({ stdTTL: 86400, maxKeys: 5000 });
    }

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
   * Categorize ingredient for intelligent grouping
   * @private
   */
  _categorizeIngredient(name) {
    const lower = name.toLowerCase();

    // Spices and seasonings
    if (/salt|pepper|cumin|coriander|turmeric|paprika|chili|garlic powder|ginger powder|cinnamon|cardamom|cloves|nutmeg/.test(lower)) {
      return 'spices';
    }

    // Sauces
    if (/sauce|dressing|gravy|paste|oil|butter|ghee|mayo|mustard/.test(lower)) {
      return 'sauces';
    }

    // Proteins
    if (/chicken|beef|pork|fish|tofu|egg|shrimp|lamb|turkey|duck|salmon/.test(lower)) {
      return 'proteins';
    }

    // Carbs
    if (/rice|pasta|noodle|bread|potato|tortilla|roti|naan|couscous/.test(lower)) {
      return 'carbs';
    }

    // Vegetables
    if (/onion|tomato|spinach|broccoli|carrot|pepper|lettuce|cucumber|zucchini|mushroom|garlic|ginger/.test(lower)) {
      return 'vegetables';
    }

    return 'other';
  }

  /**
   * Intelligently collapse ingredients when 20+ items
   * @private
   */
  _intelligentCollapse(ingredients) {
    const categorized = {
      proteins: [],
      carbs: [],
      vegetables: [],
      spices: [],
      sauces: [],
      other: []
    };

    // Categorize each ingredient
    for (const item of ingredients) {
      const category = this._categorizeIngredient(item.name);
      categorized[category].push(item);
    }

    const collapsed = [];

    // Keep proteins separate (critical for nutrition)
    collapsed.push(...categorized.proteins);

    // Keep carbs separate
    collapsed.push(...categorized.carbs);

    // Keep major vegetables, collapse if too many
    if (categorized.vegetables.length > 5) {
      const totalVegCalories = categorized.vegetables.reduce((sum, v) => sum + (v.calories || 0), 0);
      collapsed.push({
        name: "mixed vegetables",
        display_name: `${categorized.vegetables.length} vegetables`,
        quantity: 1,
        unit: "portion",
        confidence: 0.7,
        collapsed_items: categorized.vegetables,
        is_collapsed_group: true,
        calories: totalVegCalories
      });
    } else {
      collapsed.push(...categorized.vegetables);
    }

    // Merge all spices into one
    if (categorized.spices.length > 0) {
      const totalSpiceCalories = categorized.spices.reduce((sum, s) => sum + (s.calories || 0), 0);
      collapsed.push({
        name: "spices and seasonings",
        display_name: `${categorized.spices.length} spices`,
        quantity: 1,
        unit: "blend",
        confidence: 0.8,
        collapsed_items: categorized.spices,
        is_collapsed_group: true,
        calories: totalSpiceCalories
      });
    }

    // Merge sauces if multiple
    if (categorized.sauces.length > 2) {
      const totalSauceCalories = categorized.sauces.reduce((sum, s) => sum + (s.calories || 0), 0);
      collapsed.push({
        name: "sauce blend",
        display_name: `${categorized.sauces.length} sauces`,
        quantity: 1,
        unit: "mixture",
        confidence: 0.75,
        collapsed_items: categorized.sauces,
        is_collapsed_group: true,
        calories: totalSauceCalories
      });
    } else {
      collapsed.push(...categorized.sauces);
    }

    // Keep other items
    collapsed.push(...categorized.other);

    return {
      items: collapsed,
      categories: Object.keys(categorized).filter(k => categorized[k].length > 0)
    };
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
    // CRITICAL FIX: Previous truncation to 500 chars caused cache collisions!
    // The system prompt alone is ~400 chars, so user queries never made it into the key.
    // Now we include: model + hash of system prompt (for efficiency) + FULL user content
    const cacheKey = options.disableCache
      ? null
      : (() => {
          const userMessage = messages.find(m => m.role === 'user');
          const systemMessage = messages.find(m => m.role === 'system');
          // Use first 100 chars of system as identifier + FULL user content for uniqueness
          const systemId = systemMessage?.content?.substring(0, 100) || 'no-system';
          const userContent = typeof userMessage?.content === 'string'
            ? userMessage.content
            : JSON.stringify(userMessage?.content || '');
          return `chat:${model}:${systemId}:${userContent}`;
        })()

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
   *
   * ARCHITECTURE: Minimal AI prompt + Code-based post-processing
   * - AI does ONE thing: extract food items exactly as user typed
   * - Code handles: canonicalization, portion defaults, nutrition lookup
   * - This prevents prompt overload and LLM hallucinations
   *
   * Why this works better:
   * 1. Short prompts = focused attention = fewer errors
   * 2. Rules in code are deterministic, rules in prompts are probabilistic
   * 3. Easier to debug, test, and iterate
   */
  async parseTextToFoods(query) {
    // MINIMAL PROMPT: Extract what user typed, nothing more
    const messages = [
      {
        role: 'system',
        content: `Extract food items with quantities from text.

CRITICAL RULES:
1. PRESERVE EXACT FOOD NAMES - Never change, translate, correct, or substitute food names
2. If you don't recognize a regional/ethnic dish name, KEEP IT EXACTLY as typed
   - "Chamadhumpa curry" stays "Chamadhumpa curry" (NOT rice noodles, NOT something else)
   - "Dosa" stays "Dosa", "Idli" stays "Idli", "Pho" stays "Pho"
3. Extract the food name WITHOUT the quantity (e.g., "five eggs" → name: "eggs", quantity: 5)
4. Convert word quantities to numbers (one=1, two=2, three=3, four=4, five=5, six=6, etc.)
5. Parse "X servings of Y" as quantity X, unit "servings", name Y
6. If no quantity specified, use quantity: 1
7. If no unit specified, use unit: "serving"
8. Treat named dishes as single items (e.g., "chicken curry", "beef tacos", "pad thai")
9. Split into multiple items when user lists separate foods (commas, "and", "with")
10. NEVER hallucinate or guess different foods - use EXACTLY what the user wrote

Examples:
- "five eggs" → {"name": "eggs", "quantity": 5, "unit": "serving"}
- "two servings of chicken curry" → {"name": "chicken curry", "quantity": 2, "unit": "servings"}
- "3 Indian Vadas" → {"name": "Indian Vadas", "quantity": 3, "unit": "serving"}
- "a bowl of rice" → {"name": "rice", "quantity": 1, "unit": "bowl"}
- "Chamadhumpa curry with cooked rice" → [{"name": "Chamadhumpa curry", "quantity": 1, "unit": "serving"}, {"name": "cooked rice", "quantity": 1, "unit": "serving"}]
- "unknown regional dish" → {"name": "unknown regional dish", "quantity": 1, "unit": "serving"}

Return JSON: {"foods": [{"name": "...", "quantity": N, "unit": "..."}]}`,
      },
      {
        role: 'user',
        content: query,
      },
    ];

    try {
      console.log(`[OpenAI] parseTextToFoods called with query: "${query}"`);
      const json = await this.chatCompletionJSON(messages, {
        temperature: 0.1, // Very low for deterministic extraction
        maxTokens: 300, // Minimal - just food names and quantities
      });
      console.log(`[OpenAI] Raw response:`, JSON.stringify(json));

      if (!json.foods || !Array.isArray(json.foods)) {
        console.error(`[OpenAI] Invalid response format - missing foods array`);
        throw new Error('Invalid response format');
      }
      console.log(`[OpenAI] Parsed ${json.foods.length} foods from AI response`);

      // PRODUCTION FIX: Validation + Canonicalization Pipeline
      // Step 1: Validate extraction (ensure no ingredients were missed)
      // PERFORMANCE: Enable confidence-based validation skip (70-80% skip rate expected)
      const validated = validateExtraction(query, json.foods, {
        skipIfHighConfidence: true, // Skip validation when AI confidence >= 0.9
      });

      // Step 2: Process each ingredient - preserve original names for accurate nutrition lookup
      // CRITICAL: OpenAI should return EXACT user input - we just add metadata
      const canonical = validated.map(item => {
        const canonicalForm = canonicalize(item.name);
        const baseConfidence = item.confidence ?? 0.5;
        // Treat ALL foods as worthy of full name preservation
        const isComplex = true; // Always preserve full name for nutrition lookup
        const confidenceLevel = isComplex
          ? 'estimated'
          : baseConfidence >= 0.85
          ? 'typical'
          : 'estimated';
        const confidenceReason = isComplex
          ? 'Complex dish with many variations'
          : baseConfidence >= 0.85
          ? 'Clear food mention'
          : 'Limited detail in input';

        return {
          ...item,
          canonical: canonicalForm,
          // CRITICAL: Use AI-extracted name directly - prompt instructs AI to preserve exact user input
          // Never override with canonical form since that might change regional food names
          name: item.name,
          // For nutrition lookup, also use the exact name from AI extraction
          canonicalName: item.name,
          preparation: null,
          quantity: item.quantity || 1,
          unit: item.unit || 'serving',
          confidence: baseConfidence,
          confidenceLevel,
          confidenceReason,
          assumptions: isComplex
            ? { oilLevel: 'moderate', proteinCut: 'average', cuisineStyle: 'home-style' }
            : null,
          isComplex,
          originalInput: item.name, // Preserve what AI extracted (should match user input per prompt)
          _userQuery: query, // Also store full original query for debugging
        };
      });

      // Step 3: Intelligent collapsing for 20+ items
      let finalItems = canonical;
      let long_ingredient_list = false;
      let ui_message = null;

      if (canonical.length > 20) {
        console.log(`[ParseText] 🔄 Collapsing ${canonical.length} items...`);
        const collapsed = this._intelligentCollapse(canonical);
        finalItems = collapsed.items;
        long_ingredient_list = true;
        ui_message = "This looks like a complex recipe. Ingredients were grouped for clarity.";

        console.log(`[ParseText] 📦 Collapsed: ${canonical.length} → ${finalItems.length} items`);
      }

      // Step 4: Log for monitoring
      console.log(`[ParseText] Input: "${query}"`);
      console.log(`[ParseText] Extracted: ${canonical.length} items`);
      console.log(`[ParseText] Final: ${finalItems.map(c => c.name).join(', ')}`);

      // Attach metadata for UI
      return finalItems.map(item => ({
        ...item,
        long_ingredient_list,
        ui_message
      }));
    } catch (error) {
      console.error(`[OpenAI] Parse failed for "${query}":`, error.message);

      // Fallback: treat entire query as single food
      // CRITICAL: Preserve EXACT user input - never substitute or canonicalize unknown foods
      const canonicalForm = canonicalize(query);
      return [
        {
          name: query.trim(), // ALWAYS use original query, not canonicalized version
          preparation: null,
          quantity: 1,
          unit: 'serving',
          confidence: 0.5,
          canonical: canonicalForm,
          canonicalName: query.trim(), // Use original for nutrition lookup too
          originalInput: query.trim(),
        },
      ];
    }
  }

  /**
   * Detect dish complexity for smart model routing
   * @param {string} text - Food query
   * @returns {'simple'|'complex'|'regional'} Complexity level
   *
   * Regional dishes are detected so we use GPT-4o for better accuracy
   * Simple foods use gpt-4o-mini for cost optimization
   */
  detectDishComplexity(text) {
    const regionalDishes = /\b(masala|biryani|curry|tikka|dosa|idli|sambar|korma|vindaloo|tandoori|dal|saag|chutney|raita|roti|naan|kebab|shawarma|falafel|pad thai|pho|ramen|sushi|enchilada|tacos|taco|burrito|quesadilla|paella|risotto|carbonara|tiramisu)\b/i;
    const simpleFoods = /\b(egg|eggs|rice|bread|milk|banana|apple|chicken breast|water|toast|cereal|yogurt|cheese|butter|oil)\b/i;

    if (regionalDishes.test(text)) return 'regional';
    if (simpleFoods.test(text)) return 'simple';
    const wordCount = text.split(/\s+/).length;
    return wordCount > 3 ? 'complex' : 'simple';
  }

  /**
   * Choose optimal OpenAI model based on complexity
   * Simple → gpt-4o-mini ($0.15/1M input tokens) - cost optimized
   * Complex/Regional → gpt-4o ($2.50/1M input tokens) - better accuracy
   *
   * @param {string} complexity - Complexity level from detectDishComplexity
   * @returns {string} OpenAI model name
   */
  chooseModel(complexity) {
    return complexity === 'simple' ? 'gpt-4o-mini' : 'gpt-4o';
  }

  /**
   * Parse text AND estimate nutrition for unknown foods
   * Used as fallback when local dictionary lookup fails.
   *
   * Optimization:
   * - Estimates specific macros (Cal, P, C, F)
   * - Skips micros to save tokens and reduce noise
   * - Returns structure compatible with app's food logging
   * - Uses smart model routing for cost optimization (PHASE 2 ENHANCEMENT)
   */
  async estimateNutritionForText(query, options = {}) {
    const {
      mealType = 'general',
      cuisinePreference = null,
      region = null,
      cookingMethod = null
    } = options;

    // 🆕 SMART MODEL ROUTING: Detect complexity and choose optimal model
    const complexity = this.detectDishComplexity(query);
    const model = this.chooseModel(complexity);
    console.log(`[AI] Query: "${query}" → Complexity: ${complexity} → Model: ${model}`);

    // 🆕 REGIONAL CACHE KEY: Include cuisine and region for better cache hits
    const cacheKey = `nutri_est:${query.toLowerCase().trim()}:${mealType}:${cuisinePreference || 'any'}:${region || 'any'}`;

    if (this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (e) { console.error('[Redis] Read failed', e); }
    } else {
      const cached = this.nutritionCache.get(cacheKey);
      if (cached) return cached;
    }

    const messages = [
      {
        role: 'system',
        content: `You are a nutritionist API specializing in ${cuisinePreference || 'global'} cuisine.

🌍 REGIONAL CONTEXT:
- Cuisine: ${cuisinePreference || 'Not specified'}
- Region: ${region || 'Not specified'}
- Cooking Style: ${cookingMethod || 'typical preparation'}
- Meal Type: ${mealType}

📏 PORTION GUIDANCE (REGIONAL):
- South Indian: Larger rice/grain portions (1.5-2 cups), smaller protein portions, coconut-based curries with oil
- American: Larger protein portions (6-8oz), moderate carbs, butter/cream-based sauces

Rules:
1. CRITICAL: Split multiple foods into SEPARATE items in the foods array
   - "5 eggs and 2 toast" → foods: [{name: "eggs", quantity: 5}, {name: "toast", quantity: 2}]
   - "Indian vadas and chicken curry" → foods: [{name: "Indian vadas"}, {name: "chicken curry"}]
   - Split on: "and", commas, "with" (when listing separate items)
2. Extract food name, quantity, and unit. Use meal context to infer typical portion sizes.
3. Account for regional cooking methods: South Indian uses more oil/coconut, American uses butter/cream
4. Estimate nutrition for the SPECIFIED quantity and cooking method
5. Include macros: calories, protein (g), carbs (g), fat (g)
6. Include detailed INGREDIENTS breakdown (what makes up this dish)
7. Include key micros if significant: iron (mg), calcium (mg), vitaminC (mg), vitaminA (µg), potassium (mg)
8. Calculate Health Score (0-100) and NutriScore (A-E) based on:
   - Nutrient density, processing level (NOVA), cooking method
   - Penalize: frying (+30-50% cal), added sugars, high sodium, ultra-processing
   - Boost: whole foods, fiber, vitamins, healthy prep (steamed/grilled)
9. Identify the "cookingMethod" (fried, steamed, grilled, boiled, baked, raw)
10. Identify the "cuisine" (South Indian, American, Italian, etc.)
11. Provide a short analysis note explaining the score

Return JSON:
{
  "foods": [
    {
      "name": "food name",
      "quantity": number,
      "unit": "unit",
      "cuisine": "South Indian" | "American" | "Other",
      "cookingMethod": "fried" | "steamed" | "grilled" | "boiled" | "baked" | "raw",
      "nutrition": {
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number,
        "micros": { "calcium": { "value": 10, "unit": "mg" }, "iron": { "value": 2, "unit": "mg" } }
      },
      "🆕 ingredients": [
        { "name": "rice", "amount": "1 cup", "calories": 200, "protein": 4, "carbs": 45, "fat": 0 },
        { "name": "dal", "amount": "0.5 cup", "calories": 115, "protein": 9, "carbs": 20, "fat": 0 }
      ],
      "healthScore": number (0-100),
      "nutriScore": "A"|"B"|"C"|"D"|"E",
      "analysis": "string explaining score"
    }
  ]
}`,
      },
      {
        role: 'user',
        content: query,
      },
    ];

    try {
      const json = await this.chatCompletionJSON(messages, {
        model, // 🆕 DYNAMIC MODEL SELECTION: Uses detectDishComplexity + chooseModel
        temperature: 0.2,
        maxTokens: complexity === 'simple' ? 400 : 1500, // Regional/complex foods with ingredients need more tokens
      });

      if (!json.foods || !Array.isArray(json.foods)) {
        return [];
      }

      // Map to application structure
      const results = json.foods.map(item => ({
        name: item.name,
        quantity: item.quantity || 1,
        unit: item.unit || 'serving',
        confidence: 0.8,
        notes: "AI Estimated Nutrition",
        source: 'ai_estimate', // EXPLICIT DISCLAIMER
        // Construct a synthetic canonical object with the estimated nutrition
        canonical: {
          canonical: item.name,
          preparation: "unknown",
          portion: { amount: item.quantity || 1, unit: item.unit || 'serving' },
          nutrition: {
            ...item.nutrition,
            micros: item.nutrition.micros || {} // Ensure micros are passed
          },
          healthScore: item.healthScore,
          nutriScore: item.nutriScore,
          cookingMethod: item.cookingMethod,
          analysis: item.analysis,
          synonyms: []
        },
        isEstimated: true, // Internal flag for confidence logic
        autoAdded: true
      }));

      // Save to cache
      if (this.redisClient) {
        this.redisClient.set(cacheKey, JSON.stringify(results), { EX: 86400 }).catch(e => console.error('[Redis] Write failed', e));
      } else {
        this.nutritionCache.set(cacheKey, results);
      }
      return results;

    } catch (error) {
      console.error(`[OpenAI] Nutrition estimation failed:`, error.message);
      return [];
    }
  }

  /**
   * Transcribe audio to text using gpt-4o-mini-transcribe
   *
   * @param {Buffer} audioBuffer - Audio file buffer (m4a, mp3, wav, etc.)
   * @param {object} options - Transcription options
   * @param {string} options.language - Language code (e.g., 'en') for better accuracy
   * @param {number} options.temperature - Temperature for transcription (0-1, default 0)
   * @param {string} options.filename - Original filename (helps OpenAI detect format)
   * @param {string} options.mimeType - MIME type of the audio
   * @returns {Promise<{text: string, confidence: number}>}
   */
  async transcribeAudio(audioBuffer, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key not configured');
    }

    const { 
      language = 'en', 
      temperature = 0,
      filename = 'audio.m4a',
      mimeType = 'audio/mp4'
    } = options;

    // Use gpt-4o-mini-transcribe for cost-efficient, high-quality speech-to-text
    const model = process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe';

    try {
      if (!this.sdk) {
        throw new Error('OpenAI SDK not initialized');
      }

      // Fix: Use dynamic filename/mimeType so OpenAI knows if it's wav/mp3/m4a
      const file = await toFile(audioBuffer, filename, { type: mimeType });
      
      const data = await this.sdk.audio.transcriptions.create({
        file,
        model,
        language,
        temperature,
        response_format: 'json',
      });

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
   * Enhanced for 97%+ accuracy with professional nutrition expertise
   *
   * @param {string} base64Image - Base64-encoded image
   * @param {object} options - Analysis options
   * @param {boolean} options.highAccuracy - Use GPT-4o for detailed analysis (default: true for best results)
   * @param {boolean} options.includeIngredients - Attempt to list individual ingredients
   */
  async analyzeImage(base64Image, options = {}) {
    const { highAccuracy = true, includeIngredients = true } = options; // Changed defaults for better quality

    // Model selection:
    // - gpt-4o: Default for high-quality analysis ($2.50/1M input, $10/1M output) - best for all foods
    // - gpt-4o-mini: Fast, cheap ($0.15/1M) - use only if cost is critical
    const visionModel = highAccuracy
      ? 'gpt-4o'
      : (process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini');

    // Use separated prompts for better maintainability
    const { systemPrompt, userPrompt: baseUserPrompt } = buildImageAnalysisPrompt({
      includeIngredients,
      mealType: options.mealType,
      customInstructions: options.customInstructions,
    });

    // baseUserPrompt already contains all the instructions from the separated prompts file
    const userPrompt = baseUserPrompt;

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
        maxTokens: highAccuracy ? 2000 : 1000, // Increased for multi-item + per-ingredient breakdown
        temperature: 0.2, // Lower temperature for more consistent quality
      });

      // NEW: Use multi-item normalization to handle both single and multi-item formats
      let result;
      try {
        result = normalizeMultiItemAnalysis(json);

        // Log analysis info
        console.log(
          `[OpenAI] Vision Analysis - Model: ${visionModel}, ` +
          `Items detected: ${result.items.length}, ` +
          `Total Calories: ${result.totals.calories}`
        );

        // Log each item
        result.items.forEach((item, idx) => {
          console.log(`[OpenAI] Item ${idx + 1}: "${item.name}" - ${item.macros.calories} cal, confidence: ${item.confidence}`);

          // Log micros for debugging
          const microsKeys = Object.keys(item.micros || {});
          if (microsKeys.length > 0) {
            console.log(`[OpenAI]   Micros: ${microsKeys.join(', ')}`);
          }
        });

        // Add metadata
        result._modelUsed = visionModel;
        result._isMultiItem = result.isMultiItem;

      } catch (normalizationError) {
        console.error('[OpenAI] Schema normalization failed:', normalizationError.message);
        // Fallback to legacy single-item format
        result = {
          isMultiItem: false,
          items: [{
            name: json.foodName || json.items?.[0]?.name || 'Unknown Food',
            description: json.description || 'Analyzed Meal',
            macros: {
              calories: json.calories || json.items?.[0]?.macros?.calories || 0,
              protein: json.protein || json.items?.[0]?.macros?.protein || 0,
              carbs: json.carbs || json.items?.[0]?.macros?.carbs || 0,
              fat: json.fats || json.fat || json.items?.[0]?.macros?.fat || 0,
              fiber: json.fiber || 0,
              sugar: json.sugar || 0,
              sodium: json.sodium || 0
            },
            micros: json.micros || {},
            confidence: json.confidence || 0.7,
            portion: { amount: 1, unit: 'serving', estimatedGrams: 100 }
          }],
          totals: {
            calories: json.calories || 0,
            protein: json.protein || 0,
            carbs: json.carbs || 0,
            fat: json.fats || json.fat || 0,
            fiber: json.fiber || 0,
            sugar: json.sugar || 0,
            sodium: json.sodium || 0,
            micros: json.micros || {}
          },
          _modelUsed: visionModel,
          _normalizationError: normalizationError.message,
        };
      }

      return result;
    } catch (error) {
      console.error(`[OpenAI] Image analysis failed:`, error.message);
      // Propagate error with descriptive message instead of returning null
      const errorMessage = error.message || 'Unknown error';
      if (errorMessage.includes('API key')) {
        throw new Error('AI service not configured. Please contact support.');
      } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
        throw new Error('AI analysis timed out. Please try again.');
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        throw new Error('AI service is busy. Please try again in a moment.');
      } else if (errorMessage.includes('invalid_api_key')) {
        throw new Error('AI service authentication failed. Please contact support.');
      }
      throw new Error(`Image analysis failed: ${errorMessage}`);
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
