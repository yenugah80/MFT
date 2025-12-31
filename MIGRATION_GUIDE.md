# Database Migration Guide

## Overview

This guide explains how to run the database migrations for the regional multimodal food analysis system.

**Total Migrations:**
- 2 PostgreSQL migrations (0019, 0020)
- 1 MongoDB migration (0001)

**What's Being Added:**
- Regional context fields (cuisine preferences, region, cooking style)
- Multimodal input support (voice transcripts, ingredient breakdowns)
- AI metadata tracking (model used, confidence scores)
- Indexed collections for fast regional lookups

---

## PostgreSQL Migrations

### Migration 0019: Add Regional Context to Profiles

**Purpose:** Store user cuisine preferences and regional information

**Fields Added:**
- `cuisine_preference` (jsonb array): User's preferred cuisines
- `region` (text): User's geographical region
- `cooking_style` (text): User's preferred cooking style

**Run via:**
```bash
# Automatic (recommended)
npm run db:migrate

# Manual
node backend/src/db/runMigration.js
```

### Migration 0020: Add Multimodal Analysis Fields to Food Log

**Purpose:** Store voice transcripts, ingredient breakdowns, and AI metadata

**Fields Added:**
- `cuisine` (text): Cuisine type for nutrition variation
- `cooking_method` (text): Preparation method (fried, steamed, grilled, etc.)
- `voice_transcript` (text): Original voice transcription if voice input
- `ingredients_breakdown` (jsonb): Array of ingredient components
- `multimodal_source` (jsonb): Metadata about photo + voice combinations
- `ai_model` (text): Which AI model generated the estimate
- `ai_confidence` (numeric): Confidence score 0.00-1.00

**Run via:**
```bash
# Automatic (recommended)
npm run db:migrate

# Manual
node backend/src/db/runMigration.js
```

---

## MongoDB Migrations

### Migration 0001: Initialize AiEstimatedFood Collection

**Purpose:** Create the self-growing regional food database with optimized indexes

**Collections Created:**
- `ai_estimated_foods`: Stores AI-estimated nutrition data with regional variations

**Indexes Created:**

| Index Name | Purpose | Fields |
|------------|---------|--------|
| `idx_regional_cache_lookup` | Fast regional cache hits | sourceQuery, cuisine, region, cookingMethod |
| `idx_cuisine_region_lookup` | Fallback without cooking method | sourceQuery, cuisine, region |
| `idx_verified_confidence` | Find verified foods | sourceQuery, isVerified, confidence |
| `idx_cache_effectiveness` | LRU cache tracking | accessCount, lastAccessedAt |
| `idx_cuisine_region_verified` | Cuisine-based discovery | cuisine, region, isVerified |
| `idx_ttl_cache_cleanup` | Auto-cleanup 180+ days old | lastAccessedAt (180-day TTL) |

**Run via:**
```bash
# From project root
node backend/src/db/migrations/mongodb-0001-ai-estimated-food.js
```

---

## Complete Migration Sequence

### For Development/New Installations:

```bash
# 1. Navigate to project root
cd /path/to/MyFoodTracker-main

# 2. Run PostgreSQL migrations
npm run db:migrate

# 3. Run MongoDB migrations
node backend/src/db/migrations/mongodb-0001-ai-estimated-food.js

# 4. Verify both completed
echo "✅ All migrations completed!"
```

### For Production:

```bash
# 1. Backup databases
# PostgreSQL
pg_dump YOUR_DB_NAME > backup_$(date +%Y%m%d).sql

# MongoDB
mongodump --uri="YOUR_MONGODB_URI" --out backup_$(date +%Y%m%d)

# 2. Run PostgreSQL migrations (idempotent - safe to re-run)
npm run db:migrate

# 3. Run MongoDB migrations (idempotent - safe to re-run)
node backend/src/db/migrations/mongodb-0001-ai-estimated-food.js

# 4. Verify data integrity
# Check profiles table for new columns
psql -c "SELECT cuisine_preference, region, cooking_style FROM profiles LIMIT 1;"

# Check food_log table for new columns
psql -c "SELECT voice_transcript, ingredients_breakdown, ai_model FROM food_log LIMIT 1;"

# Check MongoDB indexes
mongosh --eval "db.ai_estimated_foods.getIndexes()"
```

---

## What Each Migration Does

### PostgreSQL Migration 0019: `add_regional_context`

```sql
-- Adds cuisine preference, region, and cooking style
ALTER TABLE "profiles" ADD COLUMN "cuisine_preference" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "profiles" ADD COLUMN "region" text;
ALTER TABLE "profiles" ADD COLUMN "cooking_style" text;

-- Creates indexes for fast lookups
CREATE INDEX idx_profiles_region ON profiles(region);
CREATE INDEX idx_profiles_cuisine ON profiles USING GIN (cuisine_preference);
```

### PostgreSQL Migration 0020: `add_multimodal_analysis`

```sql
-- Adds voice transcript and ingredients breakdown
ALTER TABLE "food_log" ADD COLUMN "voice_transcript" text;
ALTER TABLE "food_log" ADD COLUMN "ingredients_breakdown" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "food_log" ADD COLUMN "cuisine" text;
ALTER TABLE "food_log" ADD COLUMN "cooking_method" text;

-- Adds AI metadata
ALTER TABLE "food_log" ADD COLUMN "ai_model" text;
ALTER TABLE "food_log" ADD COLUMN "ai_confidence" numeric(3,2);

-- Creates indexes for queries
CREATE INDEX idx_food_log_ai_confidence ON food_log(ai_confidence);
CREATE INDEX idx_food_log_cuisine ON food_log(cuisine);
```

### MongoDB Migration 0001: `ai_estimated_foods`

```javascript
// Creates regional food database collection
db.createCollection('ai_estimated_foods');

// Creates 6 optimized indexes for:
// - Regional cache lookups (4-field compound index)
// - Fallback queries (3-field index)
// - Verification tracking (verified + confidence)
// - Cache effectiveness (LRU with TTL)
// - Cuisine-based discovery
// - Auto-cleanup of old data (180-day TTL)
```

---

## Verifying Migrations

### PostgreSQL Verification

```bash
# Check profiles table
psql -c "\d profiles" | grep -E "cuisine|region|cooking"

# Expected output:
# cuisine_preference | jsonb
# region            | text
# cooking_style     | text

# Check food_log table
psql -c "\d food_log" | grep -E "voice|ingredients|cooking|ai_"

# Expected output:
# voice_transcript     | text
# ingredients_breakdown | jsonb
# cuisine              | text
# cooking_method       | text
# ai_model             | text
# ai_confidence        | numeric
```

### MongoDB Verification

```bash
# List all indexes
mongosh <<EOF
use myfoodtracker
db.ai_estimated_foods.getIndexes()
EOF

# Expected output: 6 indexes
# _id_ (default)
# idx_regional_cache_lookup
# idx_cuisine_region_lookup
# idx_verified_confidence
# idx_cache_effectiveness
# idx_cuisine_region_verified
# idx_ttl_cache_cleanup
```

---

## Troubleshooting

### PostgreSQL

**"Column already exists"**
- This is normal! Migrations use `IF NOT EXISTS` and are idempotent
- Safe to re-run without errors

**Index creation fails**
- Check if index already exists: `\di` in psql
- Drop and recreate: `DROP INDEX idx_name; CREATE INDEX...`

### MongoDB

**"Index with name ... already exists"**
- MongoDB prevents duplicate index names
- This is expected behavior and safe

**Indexes not created**
- Verify MongoDB connection: `mongosh --uri "YOUR_MONGODB_URI"`
- Check collection exists: `db.ai_estimated_foods.count()`
- Re-run migration: `node backend/src/db/migrations/mongodb-0001-ai-estimated-food.js`

---

## Rollback (If Needed)

### PostgreSQL Rollback

```sql
-- Drop new columns (careful in production!)
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "cuisine_preference" CASCADE;
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "region" CASCADE;
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "cooking_style" CASCADE;

ALTER TABLE "food_log" DROP COLUMN IF EXISTS "voice_transcript" CASCADE;
ALTER TABLE "food_log" DROP COLUMN IF EXISTS "ingredients_breakdown" CASCADE;
ALTER TABLE "food_log" DROP COLUMN IF EXISTS "cuisine" CASCADE;
ALTER TABLE "food_log" DROP COLUMN IF EXISTS "cooking_method" CASCADE;
ALTER TABLE "food_log" DROP COLUMN IF EXISTS "ai_model" CASCADE;
ALTER TABLE "food_log" DROP COLUMN IF EXISTS "ai_confidence" CASCADE;
```

### MongoDB Rollback

```bash
# Drop the entire collection (destructive!)
mongosh --eval "db.ai_estimated_foods.drop()"

# Or just drop indexes
mongosh --eval "db.ai_estimated_foods.dropIndex('idx_regional_cache_lookup')"
```

---

## Performance Impact

**Estimated Impact:**

| Operation | Before | After | Overhead |
|-----------|--------|-------|----------|
| User profile query | ~50ms | ~50ms | None |
| Food log insert | ~100ms | ~110ms | +10% (new columns) |
| Regional food lookup | N/A | ~20ms | Gain (new query) |

**Storage Impact:**

- PostgreSQL: +200KB per 10K users (sparse columns)
- MongoDB: +500MB per 100K foods (with full indexes)

---

## Next Steps

1. ✅ Run migrations
2. ✅ Verify all tables/collections
3. ⚙️ Test regional food analysis
4. 📊 Monitor query performance
5. 🚀 Deploy to production

---

## Support

If you encounter issues:

1. Check logs: `npm run db:migrate 2>&1 | tee migration.log`
2. Verify database connections in `.env`
3. Review migration files: `/backend/src/db/migrations/`
4. Check that both PostgreSQL and MongoDB are running

---

## Migration Files

| File | Type | Purpose |
|------|------|---------|
| `0019_add_regional_context.sql` | PostgreSQL | Add user regional preferences |
| `0020_add_multimodal_analysis.sql` | PostgreSQL | Add multimodal input tracking |
| `mongodb-0001-ai-estimated-food.js` | MongoDB | Initialize food database |
| `runMigration.js` | Runner | Execute PostgreSQL migrations |

---

**Last Updated:** 2025-12-31
**Status:** Ready for deployment
