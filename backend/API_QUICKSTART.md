# API Client Quick Start Guide

**For Developers:** How to use the industrial-grade API clients in your code

---

## 🚀 **Getting Started**

### **1. Setup API Keys**

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your keys
nano .env
```

Add your API keys:
```bash
USDA_API_KEY=your_actual_usda_key_here
OPENAI_API_KEY=sk-proj-your_openai_key_here
```

Get API keys:
- **USDA:** https://fdc.nal.usda.gov/api-key-signup.html (Free)
- **OpenAI:** https://platform.openai.com/api-keys ($5 free credit)

### **2. Start the Server**

```bash
cd backend
npm run dev
```

You should see:
```
Server is running on PORT: 5001
```

If you see `[USDA] Using DEMO_KEY`, you need to add your real USDA key to `.env`.

---

## 📖 **Using the API Clients**

### **Import the Clients**

```javascript
import { usdaClient } from "./services/apiClients/USDAClient.js";
import { openaiClient } from "./services/apiClients/OpenAIClient.js";
```

---

## 🍎 **USDA Client Usage**

### **1. Search Foods**

```javascript
// Search for foods by query
const foods = await usdaClient.searchFoods("chicken breast", 20);

// Returns array of raw USDA food objects
console.log(foods.length); // Up to 20 results
```

### **2. Search with Nutrition Data**

```javascript
// Search and get normalized nutrition data
const results = await usdaClient.searchByName("grilled chicken");

// Returns array of foods with extracted macros/micros
results.forEach(food => {
  console.log(food.description);
  console.log(food.macros);  // { calories_kcal, protein_g, carbs_g, fat_g, ... }
  console.log(food.micros);  // { calcium: { value, unit }, iron: {...}, ... }
});
```

### **3. Get Food by ID**

```javascript
// Get specific food by FDC ID
const food = await usdaClient.getFoodById(174576);

console.log(food.description);
console.log(food.foodNutrients);
```

### **4. Batch Lookup (Max 20)**

```javascript
// Get multiple foods at once
const fdcIds = [174576, 173420, 171705];
const foods = await usdaClient.getFoodsByIds(fdcIds);

foods.forEach(food => {
  console.log(`${food.description}: ${food.foodNutrients.length} nutrients`);
});
```

---

## 🤖 **OpenAI Client Usage**

### **1. Check Availability**

```javascript
// Check if OpenAI is configured
if (openaiClient.isAvailable()) {
  console.log("OpenAI features enabled");
} else {
  console.log("OpenAI API key not set");
}
```

### **2. Parse Text to Foods**

```javascript
// Parse natural language food description
const foods = await openaiClient.parseTextToFoods("2 eggs and toast with butter");

// Returns array of parsed foods
foods.forEach(food => {
  console.log(`${food.name}: ${food.quantity} ${food.unit} (${food.confidence})`);
});

// Example output:
// eggs: 2 serving (0.95)
// toast: 1 serving (0.9)
// butter: 1 tbsp (0.85)
```

### **3. Analyze Food Image**

```javascript
// Analyze food photo (base64 string WITHOUT data: prefix)
const base64Image = "iVBORw0KGgoAAAANS..."; // Your base64 image

const result = await openaiClient.analyzeImage(base64Image);

console.log(result.foodName);        // "Grilled Chicken Salad"
console.log(result.description);     // "Mixed greens with grilled chicken..."
console.log(result.calories);        // 380
console.log(result.protein);         // 45
console.log(result.confidence);      // 0.92
```

### **4. Custom Chat Completion**

```javascript
// Make custom OpenAI request with JSON response
const messages = [
  { role: "system", content: "You are a nutrition expert." },
  { role: "user", content: "Is avocado keto-friendly? Return JSON with { answer, reasoning }" }
];

const json = await openaiClient.chatCompletionJSON(messages, {
  temperature: 0.3,
  maxTokens: 200
});

console.log(json.answer);      // "Yes"
console.log(json.reasoning);   // "High fat, low carb..."
```

---

## 📊 **Monitoring & Metrics**

### **1. Get Real-Time Metrics**

```javascript
// Access metrics programmatically
const usdaMetrics = usdaClient.getMetrics();

console.log(usdaMetrics);
// {
//   totalRequests: 1523,
//   successfulRequests: 1498,
//   failedRequests: 25,
//   successRate: "98.36%",
//   avgLatency: "234ms",
//   cacheHits: 1089,
//   cacheMisses: 434,
//   cacheHitRate: "71.49%",
//   circuitBreakerState: "CLOSED",
//   apiKey: "Registered Key"
// }
```

### **2. OpenAI Cost Tracking**

```javascript
// Get cost breakdown
const costMetrics = openaiClient.getCostMetrics();

console.log(costMetrics);
// {
//   totalTokensUsed: 45234,
//   totalCostUSD: "$0.0234",
//   byModel: [
//     { model: "gpt-4o-mini", requests: 430, tokens: 42000, cost: "$0.0210" },
//     { model: "gpt-4o", requests: 22, tokens: 3234, cost: "$0.0024" }
//   ]
// }
```

### **3. HTTP Metrics Endpoint**

```bash
# Get all metrics via API
curl http://localhost:5001/api/metrics

# Requires authentication (Clerk token)
curl http://localhost:5001/api/metrics \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"
```

---

## 🔧 **Advanced Features**

### **1. Manual Cache Management**

```bash
# Clear USDA cache
curl -X POST http://localhost:5001/api/metrics/clear-cache/usda

# Clear OpenAI cache
curl -X POST http://localhost:5001/api/metrics/clear-cache/openai
```

### **2. Circuit Breaker Management**

```bash
# Reset circuit breaker (if stuck OPEN)
curl -X POST http://localhost:5001/api/metrics/reset-circuit-breaker/usda
curl -X POST http://localhost:5001/api/metrics/reset-circuit-breaker/openai
```

### **3. Custom Configuration**

Adjust settings in `.env`:

```bash
# Rate Limits
USDA_RATE_LIMIT_PER_HOUR=900         # Requests per hour
OPENAI_RATE_LIMIT_PER_MINUTE=60      # Requests per minute

# Caching
USDA_CACHE_TTL_SECONDS=86400         # 24 hours
OFF_CACHE_TTL_SECONDS=604800         # 7 days

# Timeouts
USDA_TIMEOUT_MS=10000                # 10 seconds
OPENAI_TIMEOUT_MS=30000              # 30 seconds

# Circuit Breaker
CIRCUIT_BREAKER_THRESHOLD=5          # Failures before open
CIRCUIT_BREAKER_TIMEOUT_MS=60000     # 60 seconds cooldown

# OpenAI Models
OPENAI_MODEL=gpt-4o-mini             # Default model
OPENAI_MAX_TOKENS=1000               # Max tokens per request
```

---

## 💡 **Best Practices**

### **1. Always Check Availability**

```javascript
// Check before using OpenAI features
if (openaiClient.isAvailable()) {
  const parsed = await openaiClient.parseTextToFoods(query);
} else {
  // Fallback to basic parsing
  const parsed = [{ name: query, quantity: 1, unit: 'serving' }];
}
```

### **2. Handle Errors Gracefully**

```javascript
try {
  const foods = await usdaClient.searchFoods("chicken", 20);
  if (!foods || foods.length === 0) {
    console.log("No results found");
  }
} catch (error) {
  if (error.message.includes("Rate limit exceeded")) {
    console.log("Too many requests, try again in a moment");
  } else if (error.message.includes("Circuit breaker OPEN")) {
    console.log("USDA API is temporarily unavailable");
  } else {
    console.error("Search failed:", error);
  }
}
```

### **3. Use Specific Methods**

```javascript
// GOOD: Use specific method for better caching
const foods = await usdaClient.searchByName("chicken");

// LESS OPTIMAL: Generic search (still works, but less optimized)
const foods = await usdaClient.searchFoods("chicken", 10);
```

### **4. Monitor Costs**

```javascript
// Log cost after expensive operations
const result = await openaiClient.analyzeImage(base64Image);
const costs = openaiClient.getCostMetrics();
console.log(`Current session cost: ${costs.totalCostUSD}`);
```

---

## 🐛 **Troubleshooting**

### **"Rate limit exceeded" Error**

**Cause:** Too many requests in time window

**Solution:**
```javascript
// Check current metrics
const metrics = usdaClient.getMetrics();
console.log(`Requests: ${metrics.totalRequests}`);

// Wait for rate limit window to reset
// USDA: Resets every hour
// OpenAI: Resets every minute
```

### **"Circuit breaker OPEN" Error**

**Cause:** API experienced 5 consecutive failures

**Solution:**
```javascript
// Option 1: Wait 60 seconds for automatic recovery
await new Promise(resolve => setTimeout(resolve, 60000));

// Option 2: Manual reset via API
// POST /api/metrics/reset-circuit-breaker/usda
```

### **DEMO_KEY Warning**

**Cause:** USDA API key not set in `.env`

**Solution:**
```bash
# Add real key to .env
echo "USDA_API_KEY=your_real_key_here" >> backend/.env

# Restart server
```

### **High OpenAI Costs**

**Cause:** Low cache hit rate or using expensive model

**Solution:**
```javascript
// Check cost breakdown
const costs = openaiClient.getCostMetrics();
console.log(costs.byModel);

// If gpt-4o is dominating costs:
// - Use gpt-4o-mini for text parsing (10x cheaper)
// - Only use gpt-4o for vision analysis
// - Increase cache TTL in .env
```

---

## 📚 **Code Examples**

### **Example 1: Complete Food Search Flow**

```javascript
import { usdaClient, openaiClient } from "./services/apiClients/index.js";

async function searchFood(userQuery) {
  try {
    // Step 1: Try USDA first
    const usdaResults = await usdaClient.searchByName(userQuery);

    if (usdaResults && usdaResults.length > 0) {
      console.log(`Found ${usdaResults.length} USDA results`);
      return usdaResults[0]; // Return best match
    }

    // Step 2: Fallback to OpenAI if no USDA results
    if (openaiClient.isAvailable()) {
      console.log("No USDA results, using AI...");
      const parsed = await openaiClient.parseTextToFoods(userQuery);
      return parsed[0];
    }

    // Step 3: Ultimate fallback
    return { name: userQuery, quantity: 1, unit: 'serving' };

  } catch (error) {
    console.error("Search failed:", error);
    return null;
  }
}

// Usage
const food = await searchFood("grilled chicken breast");
console.log(food);
```

### **Example 2: Batch Process with Rate Limiting**

```javascript
async function processMultipleFoods(queries) {
  const results = [];

  for (const query of queries) {
    try {
      const foods = await usdaClient.searchByName(query);
      results.push({ query, foods, status: 'success' });

      // Check if approaching rate limit
      const metrics = usdaClient.getMetrics();
      if (metrics.totalRequests > 850) { // Close to 900/hour limit
        console.log("Approaching rate limit, adding delay...");
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

    } catch (error) {
      if (error.message.includes("Rate limit")) {
        console.log("Rate limit hit, waiting 60s...");
        await new Promise(resolve => setTimeout(resolve, 60000));
        // Retry
        const foods = await usdaClient.searchByName(query);
        results.push({ query, foods, status: 'retried' });
      } else {
        results.push({ query, error: error.message, status: 'failed' });
      }
    }
  }

  return results;
}
```

### **Example 3: Cost-Aware Image Analysis**

```javascript
async function analyzeImageWithBudget(base64Image, dailyBudget = 1.0) {
  // Check current costs
  const costs = openaiClient.getCostMetrics();
  const currentCost = parseFloat(costs.totalCostUSD.replace('$', ''));

  // Estimate cost for vision request (~$0.003 per image)
  const estimatedCost = 0.003;

  if (currentCost + estimatedCost > dailyBudget) {
    throw new Error(`Daily budget exceeded (${currentCost}/${dailyBudget})`);
  }

  // Proceed with analysis
  const result = await openaiClient.analyzeImage(base64Image);

  // Log updated cost
  const newCosts = openaiClient.getCostMetrics();
  console.log(`Image analyzed. Total cost today: ${newCosts.totalCostUSD}`);

  return result;
}
```

---

## 🎯 **Quick Reference**

| Task | Code |
|------|------|
| Search USDA | `await usdaClient.searchFoods("chicken", 20)` |
| Get nutrition data | `await usdaClient.searchByName("chicken")` |
| Get food by ID | `await usdaClient.getFoodById(174576)` |
| Parse text | `await openaiClient.parseTextToFoods("2 eggs")` |
| Analyze image | `await openaiClient.analyzeImage(base64)` |
| Check OpenAI available | `openaiClient.isAvailable()` |
| Get USDA metrics | `usdaClient.getMetrics()` |
| Get OpenAI costs | `openaiClient.getCostMetrics()` |

---

## 📖 **Further Reading**

- [API_ARCHITECTURE.md](./API_ARCHITECTURE.md) - Complete architecture guide
- [API_IMPLEMENTATION_SUMMARY.md](./API_IMPLEMENTATION_SUMMARY.md) - Implementation details
- [FOODSERVICE_MIGRATION_COMPLETE.md](./FOODSERVICE_MIGRATION_COMPLETE.md) - Migration summary

---

**Happy Coding! 🚀**

If you encounter issues, check:
1. API keys are set in `.env`
2. Server logs for specific error messages
3. `/api/metrics` endpoint for system health
4. Rate limit compliance (metrics show current usage)
