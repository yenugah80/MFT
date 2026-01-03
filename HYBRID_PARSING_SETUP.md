# Strategic Hybrid Parsing Implementation Guide

## Overview

This guide explains the **strategic hybrid food parsing system** that intelligently routes between rule-based (regex) and AI-powered (OpenAI) parsing engines based on user tier and feature flags.

**Goal**: Start free with regex, upgrade premium users to OpenAI, monitor ROI and costs.

---

## Architecture

### Three-Tier Strategy

```
Free Users              Premium Users            Enterprise Users
      ↓                        ↓                         ↓
[Rule-Based Regex]     [OpenAI API]           [Custom Solutions]
   $0/user                $5/month                 $99/month
 Fast, Accurate         Accurate                 Ultra-Premium
```

### Key Components

1. **PremiumFeatures.js** - Feature flag management and user tier detection
2. **StrategicFoodParser.js** - Router between parsing engines
3. **admin/strategy.js** - Admin monitoring endpoints for ROI tracking
4. **resolve.js** - Integration point for text/voice parsing

---

## Environment Variables

### Required Setup

Add these variables to your `.env.local` (development) or deployment environment:

```bash
# Feature Flags - Control which parsing engines are enabled
HYBRID_FEATURE_MODE=true              # Enable hybrid mode (free + premium tiers)
ENABLE_PREMIUM_OPENAI=false           # Enable OpenAI for premium users (initially false, enable when ready)
FULL_AI_MODE=false                    # Migrate ALL users to AI (final phase, requires revenue)

# Analytics
TRACK_FEATURE_USAGE=true              # Track which features users access
```

### Feature Flag Meanings

| Flag | Value | Behavior |
|------|-------|----------|
| `HYBRID_FEATURE_MODE` | `true` | Free users get regex, Premium users get OpenAI (if ENABLE_PREMIUM_OPENAI=true) |
| `HYBRID_FEATURE_MODE` | `false` | All users get regex (fallback to old system) |
| `ENABLE_PREMIUM_OPENAI` | `true` | Premium users route to OpenAI API (requires OPENAI_API_KEY) |
| `ENABLE_PREMIUM_OPENAI` | `false` | Premium users still get regex (cost-saving mode) |
| `FULL_AI_MODE` | `true` | ALL users (free + premium) use OpenAI (high-cost, high-accuracy mode) |

---

## Implementation Phases

### Phase 1: MVP (Current - Rule-Based Only)

**Settings**:
```bash
HYBRID_FEATURE_MODE=true
ENABLE_PREMIUM_OPENAI=false
FULL_AI_MODE=false
```

**Cost**: $0
**What happens**: All users get regex parsing, regardless of tier

**Command to deploy**:
```bash
# Add to .env
echo "HYBRID_FEATURE_MODE=true" >> .env.local
echo "ENABLE_PREMIUM_OPENAI=false" >> .env.local
echo "FULL_AI_MODE=false" >> .env.local
```

---

### Phase 2: Premium OpenAI (500+ users)

When you have 500+ active users with 15-20% converting to premium:

**Settings**:
```bash
HYBRID_FEATURE_MODE=true
ENABLE_PREMIUM_OPENAI=true
FULL_AI_MODE=false
```

**Cost**: ~$0.002-0.005 per premium user request (based on actual usage)
**What happens**:
- Free users: regex parsing ($0)
- Premium users: OpenAI API parsing (~$5/month in API costs)
- Premium revenue ($5/month × 100 users = $500) >> API costs (~$200)

**Checklist**:
- [ ] Have OPENAI_API_KEY configured
- [ ] Have 500+ users
- [ ] Have 75+ premium users
- [ ] Run `/api/admin/strategy/forecast` and confirm profit margin > 0%

**Command to deploy**:
```bash
echo "ENABLE_PREMIUM_OPENAI=true" >> .env.local
```

---

### Phase 3: Full AI Migration (10k+ users)

When premium revenue justifies universal AI upgrade:

**Settings**:
```bash
HYBRID_FEATURE_MODE=true
ENABLE_PREMIUM_OPENAI=true
FULL_AI_MODE=true
```

**Cost**: $0.002-0.005 per user request
**What happens**: ALL users get OpenAI, regardless of tier

**When to switch**:
- [ ] Have 10,000+ users
- [ ] Premium revenue covers 3x the OpenAI costs
- [ ] Run `/api/admin/strategy/forecast` confirms profitability for 10k user scale

**Command to deploy**:
```bash
echo "FULL_AI_MODE=true" >> .env.local
```

---

## How It Works

### Request Flow

```
User sends "scrambled eggs with toast"
        ↓
[Resolve Route Handler]
        ↓
[Get User Tier from DB]
        ↓
          ├─→ Free User? → Use StrategicFoodParser (routes to regex)
          │
          └─→ Premium User?
                  ├─→ ENABLE_PREMIUM_OPENAI=true? → Route to OpenAI
                  └─→ ENABLE_PREMIUM_OPENAI=false? → Route to regex
        ↓
[Return with metadata: engine, confidence, cost]
```

### Cost Tracking

Every request is tracked:
```javascript
{
  engine: "rule-based" | "ai-powered",
  cost: 0.00324,  // OpenAI cost in dollars
  confidence: 0.87,
  tokens: { input: 150, output: 42 }
}
```

### Admin Monitoring

**Check strategy metrics**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5001/api/admin/strategy/metrics
```

**Response**:
```json
{
  "timestamp": "2025-01-03T12:00:00Z",
  "parser": {
    "totalRequests": 1250,
    "ruleBasedRequests": 1200,
    "aiPoweredRequests": 50,
    "fallbackRequests": 0,
    "totalCost": 0.12,
    "estimatedMonthlyCost": 3.60,
    "aiPoweredPercentage": 4.0
  },
  "strategy": {
    "hybridModeEnabled": true,
    "fullAIModeEnabled": false,
    "environment": {
      "HYBRID_FEATURE_MODE": "true",
      "ENABLE_PREMIUM_OPENAI": "false",
      "FULL_AI_MODE": "false"
    }
  }
}
```

---

## Admin Endpoints

### GET /api/admin/strategy/metrics

Current parsing metrics and cost tracking.

```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5001/api/admin/strategy/metrics
```

---

### GET /api/admin/strategy/recommendations

AI-generated strategic recommendations based on current metrics.

```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5001/api/admin/strategy/recommendations
```

**Example response**:
```json
{
  "recommendations": [
    {
      "level": "info",
      "title": "Phase 2 (Growth)",
      "message": "Good time to introduce premium tier with AI parsing. Expected conversion: 15-20%."
    },
    {
      "level": "success",
      "message": "Hybrid strategy is working well. AI usage is controlled and cost-effective."
    }
  ]
}
```

---

### GET /api/admin/strategy/forecast

Financial projections for different user scales.

```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5001/api/admin/strategy/forecast
```

**Response**:
```json
{
  "forecasts": [
    {
      "scenario": "Early MVP (100 users)",
      "users": 100,
      "totalMonthlyRequests": 6000,
      "totalMonthlyCost": "$0.12",
      "costPerUser": "$0.001",
      "projectedPremiumUsers": 20,
      "projectedRevenue": "$100",
      "profitMargin": "99.9%",
      "viable": "Yes ✅"
    },
    {
      "scenario": "Early Adopters (500 users)",
      "users": 500,
      "totalMonthlyRequests": 30000,
      "totalMonthlyCost": "$0.60",
      "costPerUser": "$0.001",
      "projectedPremiumUsers": 100,
      "projectedRevenue": "$500",
      "profitMargin": "99.9%",
      "viable": "Yes ✅"
    },
    {
      "scenario": "Mature Product (10k users)",
      "users": 10000,
      "totalMonthlyRequests": 600000,
      "totalMonthlyCost": "$1.20",
      "costPerUser": "$0.000",
      "projectedPremiumUsers": 2000,
      "projectedRevenue": "$10,000",
      "profitMargin": "99.9%",
      "viable": "Yes ✅"
    }
  ]
}
```

---

## Database Schema Updates

### Profiles Table
New fields added for premium features:
```sql
ALTER TABLE profiles ADD COLUMN is_premium BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN premium_tier TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN subscription_started_at TIMESTAMP;
ALTER TABLE profiles ADD COLUMN subscription_ends_at TIMESTAMP;
```

### Migration
Run this migration:
```bash
npm run db:migrate
```

---

## Cost Calculations

### OpenAI Pricing (as of 2024)

- **Input tokens**: $0.15 per 1M tokens
- **Output tokens**: $0.60 per 1M tokens

### Per-Request Estimate

A typical food parsing request uses:
- **Input**: ~150 tokens (the user's query + system prompt)
- **Output**: ~42 tokens (parsed food items)

**Cost per request**: `(150 × 0.000000015) + (42 × 0.00000006) = $0.00325`

### Monthly Projections

If 100 premium users log 2 meals/day:
- **Requests**: 100 users × 2 meals × 30 days = 6,000 requests
- **Cost**: 6,000 × $0.00325 = **$19.50/month**
- **Revenue**: 100 × $5 = **$500/month**
- **Profit margin**: ($500 - $19.50) / $500 = **96.1%**

---

## Testing the Hybrid System

### Manual Test: Free User (Regex)

```bash
# Create a free user (is_premium = false)
curl -X POST http://localhost:5001/api/food/resolve \
  -H "Authorization: Bearer FREE_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode": "text", "query": "chicken with rice and vegetables"}'

# Check response - should have:
# "strategicParsing": {
#   "engine": "rule-based",
#   "confidence": 0.75,
#   "cost": 0
# }
```

### Manual Test: Premium User (OpenAI)

First, enable premium in DB:
```sql
UPDATE profiles SET is_premium = true, premium_tier = 'premium'
WHERE user_id = 'PREMIUM_USER_ID';
```

Then with `ENABLE_PREMIUM_OPENAI=true`:
```bash
curl -X POST http://localhost:5001/api/food/resolve \
  -H "Authorization: Bearer PREMIUM_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode": "text", "query": "grilled chicken breast with quinoa salad and tahini dressing"}'

# Check response - should have:
# "strategicParsing": {
#   "engine": "ai-powered",
#   "confidence": 0.92,
#   "cost": 0.00325
# }
```

### Admin Monitoring

```bash
# Get metrics
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:5001/api/admin/strategy/metrics

# Get forecast
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:5001/api/admin/strategy/forecast

# Get recommendations
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:5001/api/admin/strategy/recommendations
```

---

## Troubleshooting

### Issue: All users getting regex even though ENABLE_PREMIUM_OPENAI=true

**Check**:
1. Verify `HYBRID_FEATURE_MODE=true`
2. Verify user's `isPremium` flag is set in database
3. Check server logs for "Using rule-based engine"

**Fix**:
```sql
-- Verify user is premium
SELECT user_id, is_premium, premium_tier FROM profiles
WHERE user_id = 'USER_ID';

-- Set to premium if needed
UPDATE profiles SET is_premium = true, premium_tier = 'premium'
WHERE user_id = 'USER_ID';
```

### Issue: OpenAI API errors

**Check**: Ensure `OPENAI_API_KEY` is set
```bash
echo $OPENAI_API_KEY  # Should output your key
```

**Fix**: If missing, add to `.env`:
```bash
echo "OPENAI_API_KEY=sk-..." >> .env
```

### Issue: Admin endpoints returning 401 Unauthorized

**Check**: Admin endpoints require authentication. Provide valid Bearer token:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5001/api/admin/strategy/metrics
```

---

## Summary: Decision Tree

**Starting with 0 users?**
```
HYBRID_FEATURE_MODE=true
ENABLE_PREMIUM_OPENAI=false
FULL_AI_MODE=false
→ All users get free regex parsing
```

**Reached 500+ users with premium tiers?**
```
Check: /api/admin/strategy/forecast
If profitMargin > 0% for 500-user scale?
  YES → Enable: ENABLE_PREMIUM_OPENAI=true
  NO  → Keep free regex, focus on conversion
```

**Reached 10,000 users with strong premium adoption?**
```
Check: /api/admin/strategy/forecast
If profitMargin > 20% for 10k-user scale?
  YES → Enable: FULL_AI_MODE=true (universal AI)
  NO  → Keep hybrid, focus on premium conversion
```

---

## Next Steps

1. ✅ Deploy with Phase 1 settings (regex only)
2. ⏳ Monitor metrics via `/api/admin/strategy/metrics`
3. ⏳ When 500+ users → check forecast
4. ⏳ When profitable → enable Phase 2
5. ⏳ When 10k+ users & high premium rate → enable Phase 3

---

## Files Modified

- `backend/src/routes/resolve.js` - Integrated StrategicFoodParser
- `backend/src/services/StrategicFoodParser.js` - Hybrid router
- `backend/src/services/PremiumFeatures.js` - Tier management
- `backend/src/routes/admin/strategy.js` - Monitoring endpoints
- `backend/src/db/schema.js` - Added premium fields to profiles
- `backend/src/server.js` - Mounted admin routes

---

## Questions?

- **How much does OpenAI cost?** → See "Cost Calculations"
- **When should I enable premium parsing?** → See "Implementation Phases"
- **How do I monitor ROI?** → Use `/api/admin/strategy/forecast`
- **What if costs exceed revenue?** → Keep `ENABLE_PREMIUM_OPENAI=false`
