/**
 * Multi-Task Learning Model
 *
 * Implements a shared-bottom MTL architecture with task-specific heads
 * for predicting multiple health outcomes from shared user-day features.
 *
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    Input Features (43-dim)                  │
 * └─────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │              Shared Encoder (43 → 64 → 32)                  │
 * │              - ReLU activation                               │
 * │              - Batch normalization equivalent                │
 * │              - Dropout for regularization                    │
 * └─────────────────────────────────────────────────────────────┘
 *                              │
 *          ┌───────────────────┼───────────────────┐
 *          │                   │                   │
 *          ▼                   ▼                   ▼
 * ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
 * │  Mood Head  │     │ Energy Head │     │ Sleep Head  │ ...
 * │  (32 → 16   │     │  (32 → 16   │     │  (32 → 16   │
 * │   → 1)      │     │   → 1)      │     │   → 1)      │
 * └─────────────┘     └─────────────┘     └─────────────┘
 *
 * TASKS:
 * 1. mood_prediction - Predict mood score (1-5)
 * 2. energy_prediction - Predict energy level (1-5)
 * 3. sleep_quality_prediction - Predict sleep quality (1-5)
 * 4. hydration_adequacy - Binary: adequate hydration or not
 * 5. goal_compliance - Binary: on track with nutrition goals
 *
 * UNCERTAINTY WEIGHTING:
 * Uses homoscedastic uncertainty to automatically balance task losses:
 * L_total = Σ (1/2σ²_i) * L_i + log(σ_i)
 *
 * References:
 * - Kendall et al. (2018): Multi-Task Learning Using Uncertainty
 * - Ruder (2017): An Overview of Multi-Task Learning
 */

import { getFeatureDimension } from './featureEncoder.js';

/**
 * ============================================
 * MODEL CONFIGURATION
 * ============================================
 */

export const MODEL_CONFIG = {
  // Architecture
  inputDim: 43, // From feature encoder
  sharedDims: [64, 32], // Shared encoder layers
  taskDims: [16], // Task-specific layers before output

  // Tasks
  tasks: {
    mood: { type: 'regression', outputDim: 1, range: [1, 5], weight: 1.0 },
    energy: { type: 'regression', outputDim: 1, range: [1, 5], weight: 1.0 },
    sleep: { type: 'regression', outputDim: 1, range: [1, 5], weight: 0.8 },
    hydration: { type: 'binary', outputDim: 1, threshold: 0.5, weight: 0.8 },
    compliance: { type: 'binary', outputDim: 1, threshold: 0.5, weight: 0.6 },
  },

  // Training
  learningRate: 0.001,
  dropoutRate: 0.2,
  l2Regularization: 0.001,
  batchSize: 32,

  // Uncertainty weighting
  useUncertaintyWeighting: true,
  initialLogVariance: 0.0, // log(σ²) initialized to 0 (σ = 1)
};

/**
 * ============================================
 * NEURAL NETWORK PRIMITIVES
 * ============================================
 * Note: Pure JavaScript implementation for production deployment
 * without external ML library dependencies
 */

/**
 * Dense layer with weights and bias
 */
class DenseLayer {
  constructor(inputDim, outputDim, activation = 'relu') {
    this.inputDim = inputDim;
    this.outputDim = outputDim;
    this.activation = activation;

    // Xavier initialization
    const scale = Math.sqrt(2 / (inputDim + outputDim));
    this.weights = Array(outputDim).fill(null).map(() =>
      Array(inputDim).fill(null).map(() => (Math.random() - 0.5) * 2 * scale)
    );
    this.bias = Array(outputDim).fill(0);

    // Gradients for training
    this.weightGrad = null;
    this.biasGrad = null;
    this.inputCache = null;
    this.preActivationCache = null;
  }

  forward(input) {
    this.inputCache = input;

    // Matrix multiplication: output = W * input + b
    const preActivation = this.weights.map((row, i) => {
      let sum = this.bias[i];
      for (let j = 0; j < row.length; j++) {
        sum += row[j] * input[j];
      }
      return sum;
    });

    this.preActivationCache = preActivation;

    // Apply activation
    return this.applyActivation(preActivation);
  }

  applyActivation(x) {
    switch (this.activation) {
      case 'relu':
        return x.map(v => Math.max(0, v));
      case 'sigmoid':
        return x.map(v => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, v)))));
      case 'tanh':
        return x.map(v => Math.tanh(v));
      case 'linear':
      default:
        return x;
    }
  }

  backward(gradOutput, learningRate) {
    // Compute activation gradient
    const activationGrad = this.computeActivationGrad(gradOutput);

    // Compute weight gradients
    this.weightGrad = this.weights.map((row, i) =>
      row.map((_, j) => activationGrad[i] * this.inputCache[j])
    );

    this.biasGrad = activationGrad;

    // Compute input gradient for backprop
    const inputGrad = Array(this.inputDim).fill(0);
    for (let j = 0; j < this.inputDim; j++) {
      for (let i = 0; i < this.outputDim; i++) {
        inputGrad[j] += this.weights[i][j] * activationGrad[i];
      }
    }

    // Update weights
    for (let i = 0; i < this.outputDim; i++) {
      this.bias[i] -= learningRate * this.biasGrad[i];
      for (let j = 0; j < this.inputDim; j++) {
        this.weights[i][j] -= learningRate * this.weightGrad[i][j];
      }
    }

    return inputGrad;
  }

  computeActivationGrad(gradOutput) {
    switch (this.activation) {
      case 'relu':
        return gradOutput.map((g, i) => this.preActivationCache[i] > 0 ? g : 0);
      case 'sigmoid':
        const sigOut = this.applyActivation(this.preActivationCache);
        return gradOutput.map((g, i) => g * sigOut[i] * (1 - sigOut[i]));
      case 'tanh':
        const tanhOut = this.applyActivation(this.preActivationCache);
        return gradOutput.map((g, i) => g * (1 - tanhOut[i] * tanhOut[i]));
      case 'linear':
      default:
        return gradOutput;
    }
  }

  getParams() {
    return { weights: this.weights, bias: this.bias };
  }

  setParams(params) {
    this.weights = params.weights;
    this.bias = params.bias;
  }
}

/**
 * Dropout layer for regularization
 */
class DropoutLayer {
  constructor(rate = 0.2) {
    this.rate = rate;
    this.mask = null;
    this.training = true;
  }

  forward(input) {
    if (!this.training) {
      return input;
    }

    this.mask = input.map(() => Math.random() > this.rate ? 1 / (1 - this.rate) : 0);
    return input.map((v, i) => v * this.mask[i]);
  }

  backward(gradOutput) {
    if (!this.training) {
      return gradOutput;
    }
    return gradOutput.map((g, i) => g * this.mask[i]);
  }

  setTraining(training) {
    this.training = training;
  }
}

/**
 * ============================================
 * MULTI-TASK MODEL
 * ============================================
 */

/**
 * Main MTL Model class
 */
export class MultiTaskModel {
  constructor(config = MODEL_CONFIG) {
    this.config = config;

    // Initialize shared encoder
    this.sharedEncoder = this.buildSharedEncoder();

    // Initialize task-specific heads
    this.taskHeads = {};
    for (const [taskName, taskConfig] of Object.entries(config.tasks)) {
      this.taskHeads[taskName] = this.buildTaskHead(taskName, taskConfig);
    }

    // Initialize uncertainty parameters (log variance for each task)
    if (config.useUncertaintyWeighting) {
      this.logVariances = {};
      for (const taskName of Object.keys(config.tasks)) {
        this.logVariances[taskName] = config.initialLogVariance;
      }
    }

    this.training = true;
  }

  buildSharedEncoder() {
    const layers = [];
    let inputDim = this.config.inputDim;

    for (const outputDim of this.config.sharedDims) {
      layers.push(new DenseLayer(inputDim, outputDim, 'relu'));
      layers.push(new DropoutLayer(this.config.dropoutRate));
      inputDim = outputDim;
    }

    return layers;
  }

  buildTaskHead(taskName, taskConfig) {
    const layers = [];
    let inputDim = this.config.sharedDims[this.config.sharedDims.length - 1];

    // Task-specific hidden layers
    for (const outputDim of this.config.taskDims) {
      layers.push(new DenseLayer(inputDim, outputDim, 'relu'));
      inputDim = outputDim;
    }

    // Output layer
    const activation = taskConfig.type === 'binary' ? 'sigmoid' : 'linear';
    layers.push(new DenseLayer(inputDim, taskConfig.outputDim, activation));

    return layers;
  }

  /**
   * Forward pass through the model
   *
   * @param {Array} input - Feature vector
   * @returns {Object} Predictions for all tasks
   */
  forward(input) {
    // Pass through shared encoder
    let hidden = input;
    for (const layer of this.sharedEncoder) {
      hidden = layer.forward(hidden);
    }

    // Pass through each task head
    const predictions = {};
    for (const [taskName, taskLayers] of Object.entries(this.taskHeads)) {
      let taskOutput = hidden;
      for (const layer of taskLayers) {
        taskOutput = layer.forward(taskOutput);
      }

      // Post-process based on task type
      const taskConfig = this.config.tasks[taskName];
      if (taskConfig.type === 'regression') {
        // Scale to task range
        const [min, max] = taskConfig.range;
        predictions[taskName] = taskOutput[0] * (max - min) / 4 + (min + max) / 2;
      } else {
        predictions[taskName] = taskOutput[0];
      }
    }

    return predictions;
  }

  /**
   * Compute loss for all tasks with uncertainty weighting
   *
   * @param {Object} predictions - Model predictions
   * @param {Object} targets - Ground truth labels
   * @returns {Object} Loss breakdown and total
   */
  computeLoss(predictions, targets) {
    const losses = {};
    let totalLoss = 0;

    for (const [taskName, taskConfig] of Object.entries(this.config.tasks)) {
      if (targets[taskName] === undefined || targets[taskName] === null) {
        continue; // Skip missing labels
      }

      const pred = predictions[taskName];
      const target = targets[taskName];

      // Compute task-specific loss
      let taskLoss;
      if (taskConfig.type === 'regression') {
        // MSE loss
        taskLoss = Math.pow(pred - target, 2);
      } else {
        // Binary cross-entropy
        const eps = 1e-7;
        const clippedPred = Math.max(eps, Math.min(1 - eps, pred));
        taskLoss = -(target * Math.log(clippedPred) + (1 - target) * Math.log(1 - clippedPred));
      }

      losses[taskName] = taskLoss;

      // Apply uncertainty weighting
      if (this.config.useUncertaintyWeighting) {
        const logVar = this.logVariances[taskName];
        const precision = Math.exp(-logVar);
        totalLoss += 0.5 * precision * taskLoss + 0.5 * logVar;
      } else {
        totalLoss += taskConfig.weight * taskLoss;
      }
    }

    return { losses, totalLoss };
  }

  /**
   * Train on a single example
   *
   * @param {Array} input - Feature vector
   * @param {Object} targets - Ground truth labels
   * @returns {Object} Loss values
   */
  trainStep(input, targets) {
    // Forward pass
    const predictions = this.forward(input);
    const { losses, totalLoss } = this.computeLoss(predictions, targets);

    // Backward pass through task heads
    const sharedGrads = {};

    for (const [taskName, taskLayers] of Object.entries(this.taskHeads)) {
      if (targets[taskName] === undefined) continue;

      const taskConfig = this.config.tasks[taskName];
      const pred = predictions[taskName];
      const target = targets[taskName];

      // Compute output gradient
      let outputGrad;
      if (taskConfig.type === 'regression') {
        outputGrad = [2 * (pred - target)];
      } else {
        const eps = 1e-7;
        outputGrad = [(pred - target) / (pred * (1 - pred) + eps)];
      }

      // Apply uncertainty scaling
      if (this.config.useUncertaintyWeighting) {
        const precision = Math.exp(-this.logVariances[taskName]);
        outputGrad = outputGrad.map(g => g * precision);
      }

      // Backprop through task head
      let grad = outputGrad;
      for (let i = taskLayers.length - 1; i >= 0; i--) {
        grad = taskLayers[i].backward(grad, this.config.learningRate);
      }

      // Accumulate gradient for shared encoder
      if (!sharedGrads.accumulated) {
        sharedGrads.accumulated = grad;
      } else {
        sharedGrads.accumulated = sharedGrads.accumulated.map((g, i) => g + grad[i]);
      }
    }

    // Backprop through shared encoder
    if (sharedGrads.accumulated) {
      let grad = sharedGrads.accumulated;
      for (let i = this.sharedEncoder.length - 1; i >= 0; i--) {
        if (this.sharedEncoder[i].backward) {
          grad = this.sharedEncoder[i].backward(grad, this.config.learningRate);
        }
      }
    }

    // Update uncertainty parameters
    if (this.config.useUncertaintyWeighting) {
      for (const [taskName, loss] of Object.entries(losses)) {
        const grad = 0.5 * (loss * Math.exp(-this.logVariances[taskName]) - 1);
        this.logVariances[taskName] -= this.config.learningRate * grad;
      }
    }

    return { predictions, losses, totalLoss };
  }

  /**
   * Predict with confidence intervals
   *
   * @param {Array} input - Feature vector
   * @returns {Object} Predictions with uncertainty estimates
   */
  predict(input) {
    this.setTraining(false);
    const predictions = this.forward(input);

    // Add uncertainty estimates
    const result = {};
    for (const [taskName, pred] of Object.entries(predictions)) {
      const taskConfig = this.config.tasks[taskName];

      let confidence;
      if (this.config.useUncertaintyWeighting) {
        // Use learned variance
        const variance = Math.exp(this.logVariances[taskName]);
        const std = Math.sqrt(variance);
        confidence = {
          value: pred,
          std,
          lower: pred - 1.96 * std,
          upper: pred + 1.96 * std,
        };
      } else {
        confidence = { value: pred };
      }

      // Clip to valid range for regression tasks
      if (taskConfig.type === 'regression') {
        const [min, max] = taskConfig.range;
        confidence.value = Math.max(min, Math.min(max, confidence.value));
        if (confidence.lower) confidence.lower = Math.max(min, confidence.lower);
        if (confidence.upper) confidence.upper = Math.min(max, confidence.upper);
      }

      result[taskName] = {
        ...confidence,
        taskType: taskConfig.type,
        ...(taskConfig.type === 'binary' && { probability: pred, predicted: pred > taskConfig.threshold }),
      };
    }

    this.setTraining(true);
    return result;
  }

  /**
   * Set training mode for all layers
   */
  setTraining(training) {
    this.training = training;
    for (const layer of this.sharedEncoder) {
      if (layer.setTraining) layer.setTraining(training);
    }
    for (const taskLayers of Object.values(this.taskHeads)) {
      for (const layer of taskLayers) {
        if (layer.setTraining) layer.setTraining(training);
      }
    }
  }

  /**
   * Get all model parameters for serialization
   */
  getParams() {
    const params = {
      sharedEncoder: this.sharedEncoder
        .filter(l => l.getParams)
        .map(l => l.getParams()),
      taskHeads: {},
      logVariances: this.logVariances,
      config: this.config,
    };

    for (const [taskName, layers] of Object.entries(this.taskHeads)) {
      params.taskHeads[taskName] = layers
        .filter(l => l.getParams)
        .map(l => l.getParams());
    }

    return params;
  }

  /**
   * Load model parameters
   */
  setParams(params) {
    let idx = 0;
    for (const layer of this.sharedEncoder) {
      if (layer.setParams) {
        layer.setParams(params.sharedEncoder[idx]);
        idx++;
      }
    }

    for (const [taskName, layers] of Object.entries(this.taskHeads)) {
      idx = 0;
      for (const layer of layers) {
        if (layer.setParams) {
          layer.setParams(params.taskHeads[taskName][idx]);
          idx++;
        }
      }
    }

    if (params.logVariances) {
      this.logVariances = params.logVariances;
    }
  }

  /**
   * Get task-specific uncertainty (for visualization)
   */
  getTaskUncertainties() {
    const uncertainties = {};
    for (const taskName of Object.keys(this.config.tasks)) {
      if (this.logVariances[taskName] !== undefined) {
        const variance = Math.exp(this.logVariances[taskName]);
        uncertainties[taskName] = {
          variance,
          std: Math.sqrt(variance),
          confidence: 1 / (1 + variance), // Higher variance = lower confidence
        };
      }
    }
    return uncertainties;
  }
}

/**
 * Create a new model instance with default config
 */
export function createModel(customConfig = {}) {
  const config = { ...MODEL_CONFIG, ...customConfig };
  return new MultiTaskModel(config);
}

export default {
  MultiTaskModel,
  createModel,
  MODEL_CONFIG,
};
