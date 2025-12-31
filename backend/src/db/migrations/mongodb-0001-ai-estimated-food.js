/**
 * MongoDB Migration: Initialize AiEstimatedFood collection
 * Creates indexes for regional food caching system
 *
 * Run: node backend/src/db/migrations/mongodb-0001-ai-estimated-food.js
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'myfoodtracker';

async function migrateAiEstimatedFood() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const collection = db.collection('ai_estimated_foods');

    // Create main indexes for regional food caching
    console.log('\n📊 Creating indexes for ai_estimated_foods collection...');

    // 1. Compound index for regional cache lookups
    await collection.createIndex(
      {
        sourceQuery: 1,
        cuisine: 1,
        region: 1,
        cookingMethod: 1
      },
      { name: 'idx_regional_cache_lookup' }
    );
    console.log('✅ Created index: idx_regional_cache_lookup');

    // 2. Index for cache hit queries (without cooking method)
    await collection.createIndex(
      {
        sourceQuery: 1,
        cuisine: 1,
        region: 1
      },
      { name: 'idx_cuisine_region_lookup' }
    );
    console.log('✅ Created index: idx_cuisine_region_lookup');

    // 3. Index for finding verified foods with highest confidence
    await collection.createIndex(
      {
        sourceQuery: 1,
        isVerified: 1,
        confidence: -1
      },
      { name: 'idx_verified_confidence' }
    );
    console.log('✅ Created index: idx_verified_confidence');

    // 4. Index for cache effectiveness (access count tracking)
    await collection.createIndex(
      {
        accessCount: -1,
        lastAccessedAt: -1
      },
      { name: 'idx_cache_effectiveness' }
    );
    console.log('✅ Created index: idx_cache_effectiveness');

    // 5. Index for food discovery by cuisine
    await collection.createIndex(
      {
        cuisine: 1,
        region: 1,
        isVerified: -1
      },
      { name: 'idx_cuisine_region_verified' }
    );
    console.log('✅ Created index: idx_cuisine_region_verified');

    // 6. TTL index for cache cleanup (LRU - keep foods accessed in last 180 days)
    await collection.createIndex(
      {
        lastAccessedAt: 1
      },
      {
        name: 'idx_ttl_cache_cleanup',
        expireAfterSeconds: 15552000 // 180 days in seconds
      }
    );
    console.log('✅ Created index: idx_ttl_cache_cleanup (180-day TTL)');

    console.log('\n📈 All indexes created successfully!');
    console.log('\n✅ MongoDB migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

migrateAiEstimatedFood();
