import mongoose from 'mongoose';

/**
 * Schema for storing AI-estimated foods.
 * This builds a proprietary database of foods that aren't in the hardcoded dictionary.
 */
const AiEstimatedFoodSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true }, // e.g., "sushi roll"
  nutrition: {
    calories: { type: Number, required: true },
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fat: { type: Number, required: true },
    micros: { type: Map, of: Object, default: {} } // Store vitamins/minerals
  },
  portion: {
    amount: { type: Number, default: 1 },
    unit: { type: String, default: 'serving' }
  },
  confidence: Number,
  sourceQuery: String, // The original user text that triggered this
  isVerified: { type: Boolean, default: false }, // For manual review later
  reports: { type: Number, default: 0 }, // User reports for incorrect data
  lastReportedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

// Compound index to quickly find existing estimates
AiEstimatedFoodSchema.index({ name: 1, 'portion.unit': 1 });

export const AiEstimatedFood = mongoose.model('AiEstimatedFood', AiEstimatedFoodSchema);