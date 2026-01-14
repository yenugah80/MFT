/**
 * Meta-Learning Service
 *
 * Implements MAML-style (Model-Agnostic Meta-Learning) approach for:
 * 1. Cold Start - Good initialization for new users
 * 2. Few-Shot Personalization - Rapid adaptation from 3-5 days of data
 * 3. Cross-User Transfer - Learn from similar user clusters
 *
 * ALGORITHM (Simplified MAML):
 * 1. Meta-train on population of users
 * 2. For each user: compute personalized update with inner loop
 * 3. Aggregate inner loop losses to update meta-parameters
 * 4. Result: initialization that adapts quickly to any user
 *
 * COLD START STRATEGY:
 * - Day 0: Use population average (meta-learned initialization)
 * - Days 1-3: Blend population prior with user data
 * - Days 4-7: Rapid personalization with few-shot adaptation
 * - Day 7+: Fully personalized model
 *
 * References:
 * - Finn et al. (2017): Model-Agnostic Meta-Learning (MAML)
 * - Nichol et al. (2018): On First-Order Meta-Learning (Reptile)
 * - Hospedales et al. (2020): Meta-Learning in Neural Networks
 */

import { db } from '../../db/index.js';
import { profilesTable, gamificationTable } from '../../db/schema.js';
import { eq, gte, sql } from 'drizzle-orm';
import { MultiTaskModel, createModel, MODEL_CONFIG } from './multiTaskModel.js';
import { encodeUserDay, batchEncodeUserDays } from './featureEncoder.js';

/**
 * ============================================
 * META-LEARNING CONFIGURATION
 * ============================================
 */

const META_CONFIG = {
  // Meta-learning hyperparameters
  metaLearningRate: 0.01,      // Outer loop learning rate
  innerLearningRate: 0.1,      // Inner loop (adaptation) learning rate
  innerSteps: 3,                // Number of gradient steps for adaptation

  // Cold start configuration
  coldStartDays: 7,             // Days until fully personalized
  warmStartWeight: 0.7,         // Weight of population prior for new users

  // User clustering
  numClusters: 5,               // Number of user clusters for transfer
  minUsersPerCluster: 10,       // Minimum users to form a cluster

  // Training
  metaBatchSize: 10,            // Users per meta-batch
  supportSetSize: 5,            // Days for adaptation (support set)
  querySetSize: 2,              // Days for evaluation (query set)
};

/**
 * ============================================
 * USER CLUSTERING
 * ============================================
 */

// Cluster prototypes (learned from population)
let clusterPrototypes = null;
let clusterStats = null;

/**
 * Simple k-means clustering for user profiles
 * Used for warm-start from similar users
 */
async function clusterUsers() {
  try {
    // Get all users with sufficient data
    const users = await db
      .select({
        userId: profilesTable.userId,
        age: profilesTable.age,
        heightCm: profilesTable.heightCm,
        weightKg: profilesTable.weightKg,
        activityLevel: profilesTable.activityLevel,
      })
      .from(profilesTable)
      .leftJoin(gamificationTable, eq(profilesTable.userId, gamificationTable.userId))
      .where(gte(gamificationTable.totalMealsLogged, 14)); // Minimum 14 days

    if (users.length < META_CONFIG.minUsersPerCluster * META_CONFIG.numClusters) {
      console.log('[Meta-Learner] Insufficient users for clustering');
      return null;
    }

    // Encode user profiles as feature vectors
    const userFeatures = users.map(u => encodeUserProfile(u));

    // Run k-means
    const clusters = kMeans(userFeatures, META_CONFIG.numClusters, 50);

    // Store cluster prototypes
    clusterPrototypes = clusters.centroids;
    clusterStats = clusters.assignments.reduce((acc, cluster, idx) => {
      if (!acc[cluster]) acc[cluster] = [];
      acc[cluster].push(users[idx].userId);
      return acc;
    }, {});

    console.log(`[Meta-Learner] Clustered ${users.length} users into ${META_CONFIG.numClusters} groups`);

    return { prototypes: clusterPrototypes, stats: clusterStats };
  } catch (error) {
    console.error('[Meta-Learner] Error clustering users:', error);
    return null;
  }
}

/**
 * Encode user profile for clustering
 */
function encodeUserProfile(user) {
  const activityMap = {
    sedentary: 0,
    lightly_active: 0.25,
    moderately_active: 0.5,
    very_active: 0.75,
    extremely_active: 1,
  };

  return [
    (user.age || 30) / 80,
    (user.heightCm || 170) / 200,
    (user.weightKg || 70) / 150,
    activityMap[user.activityLevel] || 0.5,
  ];
}

/**
 * Simple k-means implementation
 */
function kMeans(data, k, maxIterations = 50) {
  const n = data.length;
  const dim = data[0].length;

  // Initialize centroids randomly
  let centroids = [];
  const indices = new Set();
  while (indices.size < k) {
    indices.add(Math.floor(Math.random() * n));
  }
  centroids = Array.from(indices).map(i => [...data[i]]);

  let assignments = new Array(n).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign points to nearest centroid
    let changed = false;
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let minCluster = 0;

      for (let c = 0; c < k; c++) {
        const dist = euclideanDistance(data[i], centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          minCluster = c;
        }
      }

      if (assignments[i] !== minCluster) {
        assignments[i] = minCluster;
        changed = true;
      }
    }

    if (!changed) break;

    // Update centroids
    centroids = centroids.map((_, c) => {
      const clusterPoints = data.filter((_, i) => assignments[i] === c);
      if (clusterPoints.length === 0) return centroids[c];

      return clusterPoints[0].map((_, d) =>
        clusterPoints.reduce((sum, p) => sum + p[d], 0) / clusterPoints.length
      );
    });
  }

  return { centroids, assignments };
}

/**
 * Euclidean distance between two vectors
 */
function euclideanDistance(a, b) {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

/**
 * Find closest cluster for a user
 */
function findClosestCluster(userProfile) {
  if (!clusterPrototypes) return null;

  const features = encodeUserProfile(userProfile);
  let minDist = Infinity;
  let closestCluster = 0;

  for (let c = 0; c < clusterPrototypes.length; c++) {
    const dist = euclideanDistance(features, clusterPrototypes[c]);
    if (dist < minDist) {
      minDist = dist;
      closestCluster = c;
    }
  }

  return closestCluster;
}

/**
 * ============================================
 * META-LEARNED INITIALIZATION
 * ============================================
 */

// Population-level meta-learned model parameters
let metaModelParams = null;

/**
 * Get initial model parameters for a new user
 * Uses meta-learned initialization with cluster-based warm-start
 *
 * @param {string} userId - User ID
 * @param {Object} userProfile - User profile data
 * @returns {Object} Initial model parameters
 */
export async function getInitialParams(userId, userProfile = null) {
  // If no meta-model trained, return random initialization
  if (!metaModelParams) {
    const model = createModel();
    return {
      params: model.getParams(),
      source: 'random',
      confidence: 0.1,
    };
  }

  // Find user's cluster if possible
  let clusterParams = null;
  if (userProfile && clusterPrototypes) {
    const clusterId = findClosestCluster(userProfile);
    // In production, we would have cluster-specific params
    clusterParams = null; // Placeholder
  }

  // Blend meta-params with cluster-specific adjustments
  const params = clusterParams
    ? blendParams(metaModelParams, clusterParams, META_CONFIG.warmStartWeight)
    : metaModelParams;

  return {
    params,
    source: clusterParams ? 'cluster_warm_start' : 'meta_learned',
    confidence: clusterParams ? 0.6 : 0.5,
  };
}

/**
 * Blend two sets of parameters
 */
function blendParams(params1, params2, weight1) {
  const blendArray = (arr1, arr2) => arr1.map((v, i) => v * weight1 + arr2[i] * (1 - weight1));

  const blendMatrix = (mat1, mat2) => mat1.map((row, i) => blendArray(row, mat2[i]));

  const blendLayerParams = (p1, p2) => ({
    weights: blendMatrix(p1.weights, p2.weights),
    bias: blendArray(p1.bias, p2.bias),
  });

  return {
    sharedEncoder: params1.sharedEncoder.map((p, i) => blendLayerParams(p, params2.sharedEncoder[i])),
    taskHeads: Object.fromEntries(
      Object.entries(params1.taskHeads).map(([task, layers]) => [
        task,
        layers.map((p, i) => blendLayerParams(p, params2.taskHeads[task][i])),
      ])
    ),
    logVariances: params1.logVariances,
    config: params1.config,
  };
}

/**
 * ============================================
 * FEW-SHOT PERSONALIZATION
 * ============================================
 */

/**
 * Personalize model for a user with limited data
 * Implements few-shot adaptation using inner loop gradient steps
 *
 * @param {string} userId - User ID
 * @param {Array} supportData - Support set (user's data for adaptation)
 * @param {Object} baseParams - Starting parameters
 * @returns {Object} Personalized model parameters
 */
export async function personalizeModel(userId, supportData, baseParams = null) {
  try {
    // Get base parameters
    const initialParams = baseParams || (await getInitialParams(userId)).params;

    // Create model with base parameters
    const model = createModel();
    model.setParams(initialParams);

    // Perform inner loop adaptation
    const numSteps = Math.min(META_CONFIG.innerSteps, supportData.length);

    for (let step = 0; step < numSteps; step++) {
      // Use random sample from support set
      const sample = supportData[Math.floor(Math.random() * supportData.length)];

      // Encode features
      const encoded = await encodeUserDay(userId, sample.date);

      // Construct targets
      const targets = {
        mood: sample.mood,
        energy: sample.energy,
        sleep: sample.sleep,
        hydration: sample.hydrationAdequate ? 1 : 0,
        compliance: sample.goalCompliant ? 1 : 0,
      };

      // Train step with inner learning rate
      model.config.learningRate = META_CONFIG.innerLearningRate;
      model.trainStep(encoded.featureVector, targets);
    }

    return {
      params: model.getParams(),
      adaptationSteps: numSteps,
      supportSetSize: supportData.length,
    };
  } catch (error) {
    console.error('[Meta-Learner] Error personalizing model:', error);
    throw error;
  }
}

/**
 * ============================================
 * COLD START HANDLING
 * ============================================
 */

/**
 * Get personalization level based on days of data
 *
 * @param {number} daysOfData - Number of days with logged data
 * @returns {Object} Personalization configuration
 */
export function getPersonalizationLevel(daysOfData) {
  if (daysOfData === 0) {
    return {
      level: 'population',
      description: 'Using population-level predictions',
      confidence: 0.3,
      personalizedWeight: 0,
      populationWeight: 1,
    };
  }

  if (daysOfData < 3) {
    return {
      level: 'early',
      description: 'Building your personal profile',
      confidence: 0.4,
      personalizedWeight: daysOfData * 0.15,
      populationWeight: 1 - daysOfData * 0.15,
    };
  }

  if (daysOfData < META_CONFIG.coldStartDays) {
    const progress = (daysOfData - 3) / (META_CONFIG.coldStartDays - 3);
    return {
      level: 'adapting',
      description: 'Personalizing predictions for you',
      confidence: 0.5 + progress * 0.2,
      personalizedWeight: 0.45 + progress * 0.35,
      populationWeight: 0.55 - progress * 0.35,
    };
  }

  return {
    level: 'personalized',
    description: 'Fully personalized predictions',
    confidence: 0.75,
    personalizedWeight: 0.85,
    populationWeight: 0.15,
  };
}

/**
 * Generate cold-start aware prediction
 * Blends population and personalized predictions based on data availability
 *
 * @param {string} userId - User ID
 * @param {Array} input - Feature vector
 * @param {number} daysOfData - Number of days of user data
 * @returns {Object} Blended predictions
 */
export async function coldStartAwarePrediction(userId, input, daysOfData) {
  const personalizationLevel = getPersonalizationLevel(daysOfData);

  // Get population prediction
  const populationModel = createModel();
  if (metaModelParams) {
    populationModel.setParams(metaModelParams);
  }
  const populationPred = populationModel.predict(input);

  // If no personalized model or early stage, return population
  if (personalizationLevel.personalizedWeight === 0) {
    return {
      predictions: populationPred,
      personalization: personalizationLevel,
      source: 'population',
    };
  }

  // Get personalized prediction
  // In production, load user's personalized params from database
  const personalizedPred = populationPred; // Placeholder

  // Blend predictions
  const blendedPred = {};
  for (const [task, popValue] of Object.entries(populationPred)) {
    const persValue = personalizedPred[task];
    blendedPred[task] = {
      value: popValue.value * personalizationLevel.populationWeight +
        persValue.value * personalizationLevel.personalizedWeight,
      populationValue: popValue.value,
      personalizedValue: persValue.value,
      confidence: personalizationLevel.confidence,
    };
  }

  return {
    predictions: blendedPred,
    personalization: personalizationLevel,
    source: 'blended',
  };
}

/**
 * ============================================
 * META-TRAINING
 * ============================================
 */

/**
 * Meta-train the model on population data
 * Uses simplified Reptile algorithm (first-order approximation to MAML)
 *
 * @param {Object} options - Training options
 * @returns {Object} Training results
 */
export async function metaTrain(options = {}) {
  const {
    epochs = 10,
    usersPerEpoch = 50,
    minDaysPerUser = 10,
  } = options;

  console.log('[Meta-Learner] Starting meta-training');

  try {
    // Get eligible users
    const eligibleUsers = await db
      .select({ userId: profilesTable.userId })
      .from(profilesTable)
      .leftJoin(gamificationTable, eq(profilesTable.userId, gamificationTable.userId))
      .where(gte(gamificationTable.totalMealsLogged, minDaysPerUser * 2));

    if (eligibleUsers.length < META_CONFIG.metaBatchSize) {
      console.log('[Meta-Learner] Insufficient users for meta-training');
      return { success: false, error: 'Insufficient users' };
    }

    // Initialize meta-model
    const metaModel = createModel();
    let metaParams = metaModel.getParams();

    const trainingHistory = [];

    for (let epoch = 0; epoch < epochs; epoch++) {
      // Sample users for this epoch
      const sampledUsers = shuffleArray(eligibleUsers).slice(0, usersPerEpoch);

      let epochLoss = 0;
      let userCount = 0;

      for (const user of sampledUsers) {
        // Reset model to meta-params
        metaModel.setParams(metaParams);

        // Get user's data (simplified - in production, fetch actual data)
        // This is a placeholder for the actual data fetching
        const userData = await getUserTrainingData(user.userId, META_CONFIG.supportSetSize + META_CONFIG.querySetSize);

        if (userData.length < META_CONFIG.supportSetSize + META_CONFIG.querySetSize) {
          continue;
        }

        // Split into support (adaptation) and query (evaluation) sets
        const supportSet = userData.slice(0, META_CONFIG.supportSetSize);
        const querySet = userData.slice(META_CONFIG.supportSetSize);

        // Inner loop: adapt on support set
        for (const sample of supportSet) {
          if (sample.features && sample.targets) {
            metaModel.trainStep(sample.features, sample.targets);
          }
        }

        // Outer loop: compute loss on query set
        for (const sample of querySet) {
          if (sample.features && sample.targets) {
            const pred = metaModel.forward(sample.features);
            const { totalLoss } = metaModel.computeLoss(pred, sample.targets);
            epochLoss += totalLoss;
          }
        }

        userCount++;
      }

      // Update meta-params (Reptile-style: move towards adapted params)
      const adaptedParams = metaModel.getParams();
      metaParams = interpolateParams(metaParams, adaptedParams, META_CONFIG.metaLearningRate);

      const avgLoss = userCount > 0 ? epochLoss / userCount : 0;
      trainingHistory.push({ epoch, loss: avgLoss, users: userCount });

      console.log(`[Meta-Learner] Epoch ${epoch + 1}/${epochs}: Loss=${avgLoss.toFixed(4)}, Users=${userCount}`);
    }

    // Store meta-params
    metaModelParams = metaParams;

    // Also run clustering
    await clusterUsers();

    return {
      success: true,
      epochs,
      history: trainingHistory,
      finalLoss: trainingHistory[trainingHistory.length - 1]?.loss,
    };
  } catch (error) {
    console.error('[Meta-Learner] Meta-training error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user training data (placeholder implementation)
 */
async function getUserTrainingData(userId, numDays) {
  // In production, this would fetch actual encoded data from database
  // For now, return empty to indicate data fetching needed
  return [];
}

/**
 * Interpolate between two parameter sets
 */
function interpolateParams(params1, params2, alpha) {
  const interpArray = (arr1, arr2) => arr1.map((v, i) => v + alpha * (arr2[i] - v));
  const interpMatrix = (mat1, mat2) => mat1.map((row, i) => interpArray(row, mat2[i]));

  const interpLayerParams = (p1, p2) => ({
    weights: interpMatrix(p1.weights, p2.weights),
    bias: interpArray(p1.bias, p2.bias),
  });

  return {
    sharedEncoder: params1.sharedEncoder.map((p, i) => interpLayerParams(p, params2.sharedEncoder[i])),
    taskHeads: Object.fromEntries(
      Object.entries(params1.taskHeads).map(([task, layers]) => [
        task,
        layers.map((p, i) => interpLayerParams(p, params2.taskHeads[task][i])),
      ])
    ),
    logVariances: Object.fromEntries(
      Object.entries(params1.logVariances).map(([task, v1]) => [
        task,
        v1 + alpha * (params2.logVariances[task] - v1),
      ])
    ),
    config: params1.config,
  };
}

/**
 * Shuffle array utility
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * ============================================
 * EXPORTS
 * ============================================
 */

export default {
  getInitialParams,
  personalizeModel,
  getPersonalizationLevel,
  coldStartAwarePrediction,
  metaTrain,
  clusterUsers,
  META_CONFIG,
};
