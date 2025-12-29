/**
 * Script to periodically verify AI-estimated foods.
 * Run this via cron or manually to audit the proprietary database.
 * 
 * Usage: node src/scripts/verifyNutritionEstimates.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { AiEstimatedFood } from '../models/AiEstimatedFood.js';
import { openaiClient } from '../services/apiClients/OpenAIClient.js';

// Load environment variables
dotenv.config();

const BATCH_SIZE = 10;
const CONFIDENCE_THRESHOLD = 0.9;

async function removeDuplicates() {
  console.log('🧹 Checking for duplicates...');
  try {
    const duplicates = await AiEstimatedFood.aggregate([
      {
        $group: {
          _id: { name: { $toLower: "$name" }, unit: "$portion.unit" },
          ids: { $push: "$_id" },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);

    let deletedCount = 0;
    for (const group of duplicates) {
      // Keep the best record: Verified ones first, then oldest
      const docs = await AiEstimatedFood.find({ _id: { $in: group.ids } }).sort({ isVerified: -1, createdAt: 1 });
      const [keep, ...remove] = docs;
      
      if (remove.length > 0) {
        await AiEstimatedFood.deleteMany({ _id: { $in: remove.map(d => d._id) } });
        deletedCount += remove.length;
      }
    }
    console.log(`✨ Removed ${deletedCount} duplicate entries.`);
  } catch (err) {
    console.error('⚠️ Duplicate cleanup failed:', err.message);
  }
}

async function cleanupReportedItems() {
  console.log('🚩 Checking for highly reported items...');
  try {
    const result = await AiEstimatedFood.deleteMany({ reports: { $gt: 5 } });
    if (result.deletedCount > 0) {
      console.log(`🗑️ Automatically deleted ${result.deletedCount} items with >5 reports.`);
    }
  } catch (err) {
    console.error('⚠️ Report cleanup failed:', err.message);
  }
}

async function verifyFoods() {
  console.log('🔍 Starting Nutrition Verification Audit...');

  try {
    // 1. Connect to Database
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 0. Clean up duplicates first
    await removeDuplicates();

    // 1. Clean up highly reported items
    await cleanupReportedItems();

    // 2. Find unverified foods
    // We prioritize items that haven't been verified and have lower confidence
    const foodsToVerify = await AiEstimatedFood.find({
      isVerified: false
    }).limit(BATCH_SIZE);

    if (foodsToVerify.length === 0) {
      console.log('✨ No unverified foods found. Database is clean.');
      process.exit(0);
    }

    console.log(`📋 Found ${foodsToVerify.length} items to verify.`);

    // 3. Verify each food
    for (const food of foodsToVerify) {
      console.log(`\nAnalyzing: "${food.name}" (${food.portion.amount} ${food.portion.unit})`);
      console.log(`   Current: ${food.nutrition.calories}kcal | P:${food.nutrition.protein} C:${food.nutrition.carbs} F:${food.nutrition.fat}`);

      // Ask OpenAI (GPT-4o) to audit this specific entry
      // We use the estimateNutritionForText method which uses the high-quality prompt
      const query = `${food.portion.amount} ${food.portion.unit} ${food.name}`;
      const aiResult = await openaiClient.estimateNutritionForText(query);

      if (aiResult && aiResult.length > 0) {
        const audit = aiResult[0].canonical.nutrition;
        
        // Calculate variance
        const calVariance = Math.abs(audit.calories - food.nutrition.calories);
        const isAccurate = calVariance < (food.nutrition.calories * 0.2); // 20% tolerance

        if (isAccurate) {
          console.log(`   ✅ Verified! (Variance: ${calVariance.toFixed(0)}kcal)`);
          food.isVerified = true;
          food.confidence = Math.max(food.confidence || 0, 0.95);
          await food.save();
        } else {
          console.log(`   ⚠️  Correction needed. New estimate: ${audit.calories}kcal`);
          
          // Update with better data
          food.nutrition = {
            calories: audit.calories,
            protein: audit.protein,
            carbs: audit.carbs,
            fat: audit.fat
          };
          food.isVerified = true; // Mark verified after correction
          food.confidence = 0.9;
          await food.save();
        }
      } else {
        console.log('   ❌ AI could not verify this item. Skipping.');
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n🎉 Verification Batch Complete.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Verification Script Error:', error);
    process.exit(1);
  }
}

verifyFoods();