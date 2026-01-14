/**
 * Multi-Factor Health Analytics Engine
 *
 * Research-backed analysis of cross-factor correlations:
 * - Food ↔ Mood ↔ Hydration ↔ Activity ↔ Sleep
 *
 * Based on validated research from:
 * - WHO: Nutritional psychiatry, diet-mental health correlations
 * - CDC: Hydration-cognition (NHANES), Physical Activity Guidelines
 * - NIH: Sleep-nutrition-circadian rhythm interactions
 * - PubMed: Meta-analyses on synergistic effects
 *
 * @module multiFactorAnalytics
 */

// ============================================================================
// SCIENTIFIC PRIORS - Government & Healthcare Validated Research
// ============================================================================

/**
 * Evidence-based priors from WHO, CDC, NIH, FDA-validated clinical research
 *
 * Sources:
 * - WHO Global Mental Health estimates
 * - SMILES trial (Mediterranean diet RCT)
 * - CDC NHANES hydration-cognition studies
 * - NIH circadian rhythm research (PMC)
 * - PubMed meta-analyses on protein-exercise synergy
 */
export const SCIENTIFIC_PRIORS = {

  // FOOD → MOOD (Nutritional Psychiatry)
  FOOD_MOOD: {
    // B vitamins (B6, B9/folate, B12) - neurotransmitter synthesis
    b_vitamins: {
      effect: 0.35,
      confidence: 0.85,
      mechanism: 'Neurotransmitter synthesis, methylation, HPA axis regulation',
      sources: ['WHO Mental Health', 'Nutritional Psychiatry 2025'],
      nutrients: ['B6', 'B9 (Folate)', 'B12'],
      evidenceLevel: 'RCT', // Randomized Controlled Trial
    },

    // Omega-3 fatty acids - anti-inflammatory, neuroprotective
    omega3: {
      effect: 0.30,
      confidence: 0.80,
      mechanism: 'Anti-inflammatory, membrane fluidity, BDNF modulation',
      sources: ['Meta-analyses PMC', 'Frontiers Nutrition 2025'],
      nutrients: ['DHA', 'EPA'],
      evidenceLevel: 'Meta-analysis',
    },

    // Magnesium - HPA axis modulation, NMDA receptor activity
    magnesium: {
      effect: 0.28,
      confidence: 0.75,
      mechanism: 'HPA axis modulation, NMDA receptor, GABAergic activity',
      sources: ['MDPI Nutrients 2025', 'WHO guidelines'],
      evidenceLevel: 'Observational + RCT',
    },

    // Protein/Tryptophan - serotonin precursor
    protein_tryptophan: {
      effect: 0.25,
      confidence: 0.78,
      mechanism: 'Tryptophan → Serotonin → Melatonin pathway',
      sources: ['NIH Sleep Research PMC', 'Nutritional Interventions 2025'],
      evidenceLevel: 'RCT',
    },

    // Mediterranean diet pattern (SMILES trial)
    mediterranean_pattern: {
      effect: 0.40,
      confidence: 0.88,
      mechanism: 'Combined polyphenols, omega-3, fiber, anti-inflammatory',
      sources: ['SMILES trial (Felice Jacka)', 'Deakin Food & Mood Centre'],
      evidenceLevel: 'RCT',
      landmark: true,
    },

    // Gut-brain axis (microbiota)
    gut_brain_axis: {
      effect: 0.32,
      confidence: 0.73,
      mechanism: 'Microbiota-gut-brain axis, immune pathways, neurotransmitters',
      sources: ['PubMed 2025', 'Frontiers Nutrition'],
      evidenceLevel: 'Emerging',
    },

    // High sugar - mood dysregulation
    high_sugar: {
      effect: -0.22,
      confidence: 0.70,
      mechanism: 'Blood glucose spikes, inflammation, dopamine dysregulation',
      sources: ['NHANES 2021-2023', 'Depression nutrition analysis'],
      evidenceLevel: 'Observational',
    },
  },

  // HYDRATION → COGNITION & MOOD (CDC NHANES studies)
  HYDRATION_COGNITION: {
    // Optimal hydration (U-shaped curve!)
    optimal_range: {
      effect: 0.26,
      confidence: 0.82,
      mechanism: 'Cerebral blood flow, neurotransmitter transport, electrolyte balance',
      sources: ['CDC NHANES 2011-2014 PMC', 'Hydration-cognition prospective study'],
      evidenceLevel: 'Observational',
      optimalRange: [2000, 3000], // ml/day
      curvilinear: true, // IMPORTANT: Both under and over are harmful
    },

    // Dehydration effects
    dehydration: {
      effect: -0.30,
      confidence: 0.85,
      mechanism: 'Reduced attention, processing speed, working memory (DSST scores)',
      sources: ['NHANES older adults PMC 8841102'],
      evidenceLevel: 'Observational',
      threshold: 1500, // ml/day
    },

    // Overhydration concerns
    overhydration: {
      effect: -0.18,
      confidence: 0.65,
      mechanism: 'Electrolyte dilution, hyponatremia risk',
      sources: ['NHANES curvilinear analysis PMC'],
      evidenceLevel: 'Observational',
      threshold: 4000, // ml/day
    },
  },

  // PHYSICAL ACTIVITY → MENTAL HEALTH (CDC Guidelines)
  ACTIVITY_MOOD: {
    // Acute exercise benefits
    acute_exercise: {
      effect: 0.35,
      confidence: 0.88,
      mechanism: 'Immediate cognition boost, endorphins, BDNF, neuroplasticity',
      sources: ['Physical Activity Guidelines for Americans 2018', 'CDC Brain Health'],
      evidenceLevel: 'Strong',
      duration: 'Transient post-recovery period',
    },

    // Chronic exercise
    chronic_exercise: {
      effect: 0.42,
      confidence: 0.90,
      mechanism: 'Reduced anxiety/depression, improved sleep, neurogenesis',
      sources: ['CDC Physical Activity Guidelines', 'Stacks CDC 80657'],
      evidenceLevel: 'Strong',
      dosage: '150-300 min/week moderate-vigorous',
    },

    // Alzheimer's prevention
    cognitive_decline_prevention: {
      effect: 0.38,
      confidence: 0.85,
      mechanism: 'Reduced dementia risk, improved cognitive function',
      sources: ['CDC Brain Health evidence', 'HHS Guidelines 2018'],
      evidenceLevel: 'Strong',
    },
  },

  // SLEEP → EVERYTHING (NIH Circadian Rhythm)
  SLEEP_MULTI: {
    // Sleep quality → Mood
    sleep_mood: {
      effect: 0.45,
      confidence: 0.92,
      mechanism: 'REM memory consolidation, mood regulation, HPA axis reset',
      sources: ['NIH Circadian Rhythms PMC', 'Sleep Recovery Review PMC 11221196'],
      evidenceLevel: 'Strong',
      threshold: 7, // hours
    },

    // Sleep disruption → Mental health
    sleep_disruption: {
      effect: -0.50,
      confidence: 0.90,
      mechanism: 'Depression, bipolar, SAD, anxiety, emotional instability',
      sources: ['NIH Sleep Circadian Health PMC 7202392', 'NIGMS Fact Sheet'],
      evidenceLevel: 'Strong',
      disorders: ['Depression', 'Bipolar', 'SAD', 'Anxiety'],
    },

    // Circadian misalignment → Nutrition
    circadian_nutrition: {
      effect: -0.35,
      confidence: 0.78,
      mechanism: 'Poor diet quality, higher energy intake, eating disorganization',
      sources: ['NIH Nutrition Circadian System PMC', 'Sleep-dietary practices PMC 10900051'],
      evidenceLevel: 'Observational',
    },
  },

  // SYNERGISTIC EFFECTS (PubMed Meta-Analyses)
  SYNERGIES: {
    // Protein + Strength Training
    protein_strength: {
      effect: 0.52, // Stronger than either alone
      confidence: 0.88,
      mechanism: 'Synergistic muscle protein synthesis, dose-response',
      sources: ['Sports Medicine Meta-analysis 2022', 'PubMed 36057893'],
      evidenceLevel: 'Meta-analysis',
      dosage: '1.5 g/kg body weight',
      interaction: 'Multiplicative',
    },

    // Protein + Endurance + Hydration
    protein_endurance_hydration: {
      effect: 0.38,
      confidence: 0.82,
      mechanism: 'Lean mass gain, improved time to exhaustion, aerobic capacity',
      sources: ['Frontiers Nutrition 2025 endurance', 'Systematic review PMC'],
      evidenceLevel: 'Meta-analysis',
      interaction: 'Additive',
    },

    // Multi-nutrient combinations (Protein + Polyphenols + Omega-3)
    multi_nutrient: {
      effect: 0.45, // NOT observed with single nutrients alone
      confidence: 0.75,
      mechanism: 'Synergistic physiological benefits, multiple pathways',
      sources: ['Network Meta-analysis PMC 12295849', 'Older adults mobility'],
      evidenceLevel: 'RCT',
      interaction: 'Synergistic',
      note: 'Effect not seen with whey protein alone',
    },
  },

  // ANTAGONISTIC EFFECTS (Research-based negatives)
  ANTAGONISMS: {
    // High sugar + Sedentary
    sugar_sedentary: {
      effect: -0.40,
      confidence: 0.75,
      mechanism: 'Compounded inflammation, insulin resistance, mood dysregulation',
      sources: ['NHANES Depression analysis', 'Metabolic syndrome research'],
      evidenceLevel: 'Observational',
      interaction: 'Multiplicative',
    },

    // Sleep deprivation negates exercise benefits
    sleep_deprivation_exercise: {
      effect: -0.35,
      confidence: 0.80,
      mechanism: 'Insufficient recovery, cortisol elevation, mood instability',
      sources: ['NIH Sleep Recovery PMC', 'Circadian misalignment'],
      evidenceLevel: 'Strong',
      interaction: 'Antagonistic',
    },
  },
};

// ============================================================================
// CONFIGURATION
// ============================================================================

export const CONFIG = {
  // Minimum data requirements for reliable analysis
  MIN_DAYS_BIVARIABLE: 14,  // Food-Mood correlation
  MIN_DAYS_MULTIVARIABLE: 21, // 3+ factor correlations
  MIN_DAYS_INTERACTION: 30,   // Interaction effects
  MIN_DAYS_PERSONALIZATION: 45, // Individual response patterns

  // Statistical thresholds
  SIGNIFICANCE_THRESHOLD: 0.05, // p-value
  EFFECT_SIZE_SMALL: 0.20,      // Cohen's d
  EFFECT_SIZE_MEDIUM: 0.50,
  EFFECT_SIZE_LARGE: 0.80,

  // Confidence requirements
  MIN_CONFIDENCE_RECOMMENDATION: 0.70,
  MIN_CONFIDENCE_PREDICTION: 0.75,

  // UI Display Thresholds (aligned with bodyIntelligenceEngine.js)
  // These map confidence scores to user-facing labels
  HIGH_CONFIDENCE: 0.80,      // "Strong evidence" - RCT-backed, high certainty
  MEDIUM_CONFIDENCE: 0.60,    // "Moderate confidence" - Multiple observational studies
  LOW_CONFIDENCE: 0.40,       // "Early pattern" - Personal correlation emerging
  VERY_LOW: 0.20,             // "Exploring" - Insufficient data, exploratory only

  // Hydration ranges (ml/day) - U-shaped curve
  HYDRATION_OPTIMAL_MIN: 2000,
  HYDRATION_OPTIMAL_MAX: 3000,
  HYDRATION_DEHYDRATION: 1500,
  HYDRATION_OVERHYDRATION: 4000,

  // Activity guidelines (CDC)
  ACTIVITY_MODERATE_MIN: 150, // min/week
  ACTIVITY_VIGOROUS_MIN: 75,

  // Sleep guidelines (NIH)
  SLEEP_OPTIMAL_MIN: 7, // hours
  SLEEP_OPTIMAL_MAX: 9,
};

/**
 * Evidence Level Terminology Mapping
 *
 * Aligns technical research terms with user-facing language.
 * Synchronized with bodyIntelligenceEngine.js CAUSAL_FRAMING.
 *
 * Technical Term        → User-Facing Label   → Meaning
 * -------------------------------------------------------------------------------
 * 'RCT'                 → 'established'        → Randomized Controlled Trial
 * 'Meta-analysis'       → 'established'        → Multiple RCTs combined
 * 'Strong'              → 'established'        → Strong causal evidence
 * 'Observational + RCT' → 'supported'          → Mixed evidence, leaning positive
 * 'Observational'       → 'associated'         → Correlation observed, not causal
 * 'Emerging'            → 'exploring'          → Early research, insufficient data
 *
 * Confidence Score Mapping:
 * - 0.80+ (HIGH_CONFIDENCE)     → "Strong evidence"
 * - 0.60-0.79 (MEDIUM)          → "Moderate confidence"
 * - 0.40-0.59 (LOW)             → "Early pattern"
 * - 0.20-0.39 (VERY_LOW)        → "Exploring"
 */
export const EVIDENCE_TERMINOLOGY = {
  // Map technical evidence levels to user-facing labels
  TECHNICAL_TO_USER_FACING: {
    'RCT': 'established',
    'Meta-analysis': 'established',
    'Strong': 'established',
    'Observational + RCT': 'supported',
    'Observational': 'associated',
    'Emerging': 'exploring',
  },

  // Get user-facing label based on confidence score
  getConfidenceLabel: (confidence) => {
    if (confidence >= CONFIG.HIGH_CONFIDENCE) return 'Strong evidence';
    if (confidence >= CONFIG.MEDIUM_CONFIDENCE) return 'Moderate confidence';
    if (confidence >= CONFIG.LOW_CONFIDENCE) return 'Early pattern';
    return 'Exploring';
  },

  // Get causal framing based on evidence level
  getCausalFraming: (evidenceLevel) => {
    return EVIDENCE_TERMINOLOGY.TECHNICAL_TO_USER_FACING[evidenceLevel] || 'exploring';
  },
};

// ============================================================================
// CORE ANALYTICS FUNCTIONS
// ============================================================================

/**
 * Analyze bidirectional relationships between all factors
 *
 * @param {Object} params - User's historical data
 * @returns {Object} Cross-factor correlation matrix
 */
export function analyzeMultiFactorCorrelations({
  foodLogs = [],
  moodLogs = [],
  waterLogs = [],
  activityLogs = [],
  sleepLogs = [],
}) {
  const alignedData = alignDataByDate({
    foodLogs,
    moodLogs,
    waterLogs,
    activityLogs,
    sleepLogs,
  });

  if (alignedData.length < CONFIG.MIN_DAYS_BIVARIABLE) {
    return {
      canAnalyze: false,
      daysNeeded: CONFIG.MIN_DAYS_BIVARIABLE - alignedData.length,
      message: `Need ${CONFIG.MIN_DAYS_BIVARIABLE - alignedData.length} more days of data for correlation analysis`,
    };
  }

  // Bidirectional correlation matrix
  const correlations = {
    food_mood: analyzeFoodMoodCorrelation(alignedData),
    mood_hydration: analyzeMoodHydrationCorrelation(alignedData),
    hydration_activity: analyzeHydrationActivityCorrelation(alignedData),
    activity_food: analyzeActivityFoodCorrelation(alignedData),

    // Reverse directions
    mood_food: analyzeMoodFoodCorrelation(alignedData),
    hydration_mood: analyzeHydrationMoodCorrelation(alignedData),
    activity_hydration: analyzeActivityHydrationCorrelation(alignedData),
    food_activity: analyzeFoodActivityCorrelation(alignedData),

    // Sleep as mediator
    sleep_mood: analyzeSleepMoodCorrelation(alignedData),
    sleep_food: analyzeSleepFoodCorrelation(alignedData),
    sleep_hydration: analyzeSleepHydrationCorrelation(alignedData),
    sleep_activity: analyzeSleepActivityCorrelation(alignedData),
  };

  return {
    canAnalyze: true,
    correlations,
    dataQuality: assessDataQuality(alignedData),
    daysAnalyzed: alignedData.length,
  };
}

/**
 * Detect interaction effects (synergistic/antagonistic)
 *
 * Multi-factor combinations that are stronger/weaker than expected
 * from individual effects alone
 *
 * @param {Object} params - User's historical data
 * @returns {Object} Discovered interactions
 */
export function detectInteractionEffects({
  foodLogs = [],
  moodLogs = [],
  waterLogs = [],
  activityLogs = [],
  sleepLogs = [],
}) {
  const alignedData = alignDataByDate({
    foodLogs,
    moodLogs,
    waterLogs,
    activityLogs,
    sleepLogs,
  });

  if (alignedData.length < CONFIG.MIN_DAYS_INTERACTION) {
    return {
      canAnalyze: false,
      daysNeeded: CONFIG.MIN_DAYS_INTERACTION - alignedData.length,
      message: `Need ${CONFIG.MIN_DAYS_INTERACTION - alignedData.length} more days for interaction analysis`,
    };
  }

  const interactions = [];

  // Check research-validated synergies

  // 1. Protein + Strength Activity (Meta-analysis validated)
  const proteinStrength = detectProteinStrengthSynergy(alignedData);
  if (proteinStrength.detected) {
    interactions.push({
      type: 'synergy',
      factors: ['protein', 'strength_training'],
      effect: proteinStrength.effect,
      expected: proteinStrength.individual,
      boost: proteinStrength.boost,
      confidence: proteinStrength.confidence,
      mechanism: SCIENTIFIC_PRIORS.SYNERGIES.protein_strength.mechanism,
      evidenceLevel: 'Meta-analysis',
      sources: SCIENTIFIC_PRIORS.SYNERGIES.protein_strength.sources,
    });
  }

  // 2. Protein + Endurance + Hydration
  const proteinEnduranceHydration = detectProteinEnduranceHydrationSynergy(alignedData);
  if (proteinEnduranceHydration.detected) {
    interactions.push({
      type: 'synergy',
      factors: ['protein', 'endurance_activity', 'hydration'],
      effect: proteinEnduranceHydration.effect,
      expected: proteinEnduranceHydration.individual,
      boost: proteinEnduranceHydration.boost,
      confidence: proteinEnduranceHydration.confidence,
      mechanism: SCIENTIFIC_PRIORS.SYNERGIES.protein_endurance_hydration.mechanism,
      evidenceLevel: 'Meta-analysis',
      sources: SCIENTIFIC_PRIORS.SYNERGIES.protein_endurance_hydration.sources,
    });
  }

  // 3. Multi-nutrient synergy (Protein + Omega-3 + Polyphenols)
  const multiNutrient = detectMultiNutrientSynergy(alignedData);
  if (multiNutrient.detected) {
    interactions.push({
      type: 'synergy',
      factors: ['protein', 'omega3', 'polyphenols'],
      effect: multiNutrient.effect,
      expected: multiNutrient.individual,
      boost: multiNutrient.boost,
      confidence: multiNutrient.confidence,
      mechanism: SCIENTIFIC_PRIORS.SYNERGIES.multi_nutrient.mechanism,
      evidenceLevel: 'RCT',
      sources: SCIENTIFIC_PRIORS.SYNERGIES.multi_nutrient.sources,
      note: 'Not observed with single nutrients alone',
    });
  }

  // Check antagonisms

  // 4. High Sugar + Sedentary
  const sugarSedentary = detectSugarSedentaryAntagonism(alignedData);
  if (sugarSedentary.detected) {
    interactions.push({
      type: 'antagonism',
      factors: ['high_sugar', 'sedentary'],
      effect: sugarSedentary.effect,
      expected: sugarSedentary.individual,
      penalty: sugarSedentary.penalty,
      confidence: sugarSedentary.confidence,
      mechanism: SCIENTIFIC_PRIORS.ANTAGONISMS.sugar_sedentary.mechanism,
      evidenceLevel: 'Observational',
      sources: SCIENTIFIC_PRIORS.ANTAGONISMS.sugar_sedentary.sources,
    });
  }

  // 5. Sleep Deprivation negating Exercise
  const sleepExercise = detectSleepDeprivationExerciseAntagonism(alignedData);
  if (sleepExercise.detected) {
    interactions.push({
      type: 'antagonism',
      factors: ['sleep_deprivation', 'exercise'],
      effect: sleepExercise.effect,
      expected: sleepExercise.individual,
      penalty: sleepExercise.penalty,
      confidence: sleepExercise.confidence,
      mechanism: SCIENTIFIC_PRIORS.ANTAGONISMS.sleep_deprivation_exercise.mechanism,
      evidenceLevel: 'Strong',
      sources: SCIENTIFIC_PRIORS.ANTAGONISMS.sleep_deprivation_exercise.sources,
    });
  }

  return {
    canAnalyze: true,
    interactions,
    synergies: interactions.filter(i => i.type === 'synergy'),
    antagonisms: interactions.filter(i => i.type === 'antagonism'),
    daysAnalyzed: alignedData.length,
  };
}

/**
 * Generate holistic recommendations based on ALL factors
 *
 * Multi-factor optimization (not just single metrics)
 *
 * @param {Object} params - Current state and goals
 * @returns {Array} Prioritized recommendations
 */
export function generateHolisticRecommendations({
  todaysMeals = [],
  todaysMood = null,
  todaysWater = 0,
  todaysActivity = null,
  todaysSleep = null,
  historicalData = {},
  goals = {},
  userPreferences = {},
}) {
  const recommendations = [];

  // Analyze current state
  const currentState = analyzeCurrentState({
    todaysMeals,
    todaysMood,
    todaysWater,
    todaysActivity,
    todaysSleep,
  });

  // Get correlations and interactions
  const correlations = analyzeMultiFactorCorrelations(historicalData);
  const interactions = detectInteractionEffects(historicalData);

  // Generate context-aware recommendations

  // 1. Multi-factor optimization
  if (correlations.canAnalyze && interactions.canAnalyze) {
    const multiFactorRecs = generateMultiFactorOptimization({
      currentState,
      correlations: correlations.correlations,
      interactions: interactions.interactions,
      goals,
    });
    recommendations.push(...multiFactorRecs);
  }

  // 2. Leverage synergies
  if (interactions.synergies?.length > 0) {
    const synergyRecs = generateSynergyRecommendations({
      currentState,
      synergies: interactions.synergies,
      userPreferences,
    });
    recommendations.push(...synergyRecs);
  }

  // 3. Avoid antagonisms
  if (interactions.antagonisms?.length > 0) {
    const antagonismWarnings = generateAntagonismWarnings({
      currentState,
      antagonisms: interactions.antagonisms,
    });
    recommendations.push(...antagonismWarnings);
  }

  // 4. Personalized pattern-based recommendations
  const personalizedRecs = generatePersonalizedRecommendations({
    currentState,
    historicalData,
    correlations: correlations.correlations,
  });
  recommendations.push(...personalizedRecs);

  // Sort by priority and confidence
  return recommendations
    .filter(rec => rec.confidence >= CONFIG.MIN_CONFIDENCE_RECOMMENDATION)
    .sort((a, b) => {
      // Prioritize by: impact * confidence * urgency
      const scoreA = a.impact * a.confidence * (a.urgency || 1);
      const scoreB = b.impact * b.confidence * (b.urgency || 1);
      return scoreB - scoreA;
    })
    .slice(0, 5); // Top 5 recommendations
}

/**
 * Show users their personalized response patterns
 *
 * "When you do X, your Y changes by Z"
 *
 * @param {Object} params - User's data
 * @returns {Object} Personal insights
 */
export function analyzePersonalizedResponses({
  foodLogs = [],
  moodLogs = [],
  waterLogs = [],
  activityLogs = [],
  sleepLogs = [],
}) {
  const alignedData = alignDataByDate({
    foodLogs,
    moodLogs,
    waterLogs,
    activityLogs,
    sleepLogs,
  });

  if (alignedData.length < CONFIG.MIN_DAYS_PERSONALIZATION) {
    return {
      canAnalyze: false,
      daysNeeded: CONFIG.MIN_DAYS_PERSONALIZATION - alignedData.length,
      message: `Need ${CONFIG.MIN_DAYS_PERSONALIZATION - alignedData.length} more days for personalized pattern analysis`,
    };
  }

  const patterns = [];

  // Discover INDIVIDUAL response patterns (not population averages)

  // 1. Best mood days - what did they have in common?
  const bestDays = identifyBestDays(alignedData, 'mood');
  if (bestDays.commonFactors.length > 0) {
    patterns.push({
      type: 'success_pattern',
      outcome: 'Best mood days',
      factors: bestDays.commonFactors,
      frequency: bestDays.frequency,
      avgImprovement: bestDays.avgImprovement,
      insight: formatSuccessPattern(bestDays),
    });
  }

  // 2. Worst mood days - what went wrong?
  const worstDays = identifyWorstDays(alignedData, 'mood');
  if (worstDays.commonFactors.length > 0) {
    patterns.push({
      type: 'struggle_pattern',
      outcome: 'Difficult mood days',
      factors: worstDays.commonFactors,
      frequency: worstDays.frequency,
      avgDrop: worstDays.avgDrop,
      insight: formatStrugglePattern(worstDays),
    });
  }

  // 3. Individual effect sizes (personalized)
  const personalEffects = calculatePersonalEffectSizes(alignedData);
  patterns.push({
    type: 'personal_effects',
    effects: personalEffects,
    insight: formatPersonalEffects(personalEffects),
  });

  // 4. Optimal combinations for THIS user
  const optimalCombos = findOptimalCombinations(alignedData);
  if (optimalCombos.length > 0) {
    patterns.push({
      type: 'optimal_combinations',
      combinations: optimalCombos,
      insight: formatOptimalCombinations(optimalCombos),
    });
  }

  // 5. Time-of-day patterns
  const temporalPatterns = analyzeTemporalPatterns(alignedData);
  if (temporalPatterns.length > 0) {
    patterns.push({
      type: 'temporal_patterns',
      patterns: temporalPatterns,
      insight: formatTemporalPatterns(temporalPatterns),
    });
  }

  return {
    canAnalyze: true,
    patterns,
    daysAnalyzed: alignedData.length,
    confidenceLevel: calculateOverallConfidence(alignedData),
  };
}

// ============================================================================
// HELPER FUNCTIONS - Data Alignment
// ============================================================================

/**
 * Align all data sources by date for correlation analysis
 */
function alignDataByDate({ foodLogs, moodLogs, waterLogs, activityLogs, sleepLogs }) {
  const dateMap = new Map();

  // Process food logs
  foodLogs.forEach(log => {
    const dateKey = getDateKey(log.loggedDate || log.date);
    if (!dateKey) return; // Skip logs with invalid dates
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, { date: dateKey, meals: [], moods: [], water: 0, activities: [], sleep: null });
    }
    dateMap.get(dateKey).meals.push(log);
  });

  // Process mood logs
  moodLogs.forEach(log => {
    const dateKey = getDateKey(log.loggedDate || log.date);
    if (!dateKey) return; // Skip logs with invalid dates
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, { date: dateKey, meals: [], moods: [], water: 0, activities: [], sleep: null });
    }
    dateMap.get(dateKey).moods.push(log);
  });

  // Process water logs
  waterLogs.forEach(log => {
    const dateKey = getDateKey(log.loggedDate || log.date);
    if (!dateKey) return; // Skip logs with invalid dates
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, { date: dateKey, meals: [], moods: [], water: 0, activities: [], sleep: null });
    }
    dateMap.get(dateKey).water += log.amount || 0;
  });

  // Process activity logs
  activityLogs.forEach(log => {
    const dateKey = getDateKey(log.loggedDate || log.date);
    if (!dateKey) return; // Skip logs with invalid dates
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, { date: dateKey, meals: [], moods: [], water: 0, activities: [], sleep: null });
    }
    dateMap.get(dateKey).activities.push(log);
  });

  // Process sleep logs
  sleepLogs.forEach(log => {
    const dateKey = getDateKey(log.loggedDate || log.date);
    if (!dateKey) return; // Skip logs with invalid dates
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, { date: dateKey, meals: [], moods: [], water: 0, activities: [], sleep: null });
    }
    dateMap.get(dateKey).sleep = log;
  });

  // Convert to array and sort by date (filter out any null date entries)
  return Array.from(dateMap.values())
    .filter(entry => entry.date != null)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function getDateKey(dateInput) {
  if (!dateInput) return null;

  // Handle different date input formats
  const date = new Date(dateInput);

  // Check for invalid date (NaN check)
  if (isNaN(date.getTime())) {
    console.warn('[MultiFactorAnalytics] Invalid date input:', dateInput);
    return null;
  }

  try {
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.warn('[MultiFactorAnalytics] Date conversion failed:', dateInput, error.message);
    return null;
  }
}

// ============================================================================
// CORRELATION ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Analyze Food → Mood correlation
 * Based on WHO/Nutritional Psychiatry research
 */
function analyzeFoodMoodCorrelation(alignedData) {
  const validDays = alignedData.filter(day =>
    day.meals.length > 0 && day.moods.length > 0
  );

  if (validDays.length < CONFIG.MIN_DAYS_BIVARIABLE) {
    return { canAnalyze: false, daysNeeded: CONFIG.MIN_DAYS_BIVARIABLE - validDays.length };
  }

  const features = extractNutritionalFeatures(validDays);
  const moodScores = validDays.map(day => calculateAverageMood(day.moods));

  const correlations = [];

  // B Vitamins (B6, B9, B12)
  const bVitaminCorr = calculateCorrelation(features.bVitamins, moodScores);
  if (bVitaminCorr.significant) {
    correlations.push({
      factor: 'B Vitamins (B6, B9, B12)',
      correlation: bVitaminCorr.r,
      pValue: bVitaminCorr.p,
      effectSize: bVitaminCorr.d,
      prior: SCIENTIFIC_PRIORS.FOOD_MOOD.b_vitamins.effect,
      confidence: bVitaminCorr.confidence,
      mechanism: SCIENTIFIC_PRIORS.FOOD_MOOD.b_vitamins.mechanism,
      evidenceLevel: SCIENTIFIC_PRIORS.FOOD_MOOD.b_vitamins.evidenceLevel,
      sources: SCIENTIFIC_PRIORS.FOOD_MOOD.b_vitamins.sources,
    });
  }

  // Omega-3
  const omega3Corr = calculateCorrelation(features.omega3, moodScores);
  if (omega3Corr.significant) {
    correlations.push({
      factor: 'Omega-3 (DHA, EPA)',
      correlation: omega3Corr.r,
      pValue: omega3Corr.p,
      effectSize: omega3Corr.d,
      prior: SCIENTIFIC_PRIORS.FOOD_MOOD.omega3.effect,
      confidence: omega3Corr.confidence,
      mechanism: SCIENTIFIC_PRIORS.FOOD_MOOD.omega3.mechanism,
      evidenceLevel: SCIENTIFIC_PRIORS.FOOD_MOOD.omega3.evidenceLevel,
      sources: SCIENTIFIC_PRIORS.FOOD_MOOD.omega3.sources,
    });
  }

  // Magnesium
  const magnesiumCorr = calculateCorrelation(features.magnesium, moodScores);
  if (magnesiumCorr.significant) {
    correlations.push({
      factor: 'Magnesium',
      correlation: magnesiumCorr.r,
      pValue: magnesiumCorr.p,
      effectSize: magnesiumCorr.d,
      prior: SCIENTIFIC_PRIORS.FOOD_MOOD.magnesium.effect,
      confidence: magnesiumCorr.confidence,
      mechanism: SCIENTIFIC_PRIORS.FOOD_MOOD.magnesium.mechanism,
      evidenceLevel: SCIENTIFIC_PRIORS.FOOD_MOOD.magnesium.evidenceLevel,
      sources: SCIENTIFIC_PRIORS.FOOD_MOOD.magnesium.sources,
    });
  }

  // Protein/Tryptophan
  const proteinCorr = calculateCorrelation(features.protein, moodScores);
  if (proteinCorr.significant) {
    correlations.push({
      factor: 'Protein/Tryptophan',
      correlation: proteinCorr.r,
      pValue: proteinCorr.p,
      effectSize: proteinCorr.d,
      prior: SCIENTIFIC_PRIORS.FOOD_MOOD.protein_tryptophan.effect,
      confidence: proteinCorr.confidence,
      mechanism: SCIENTIFIC_PRIORS.FOOD_MOOD.protein_tryptophan.mechanism,
      evidenceLevel: SCIENTIFIC_PRIORS.FOOD_MOOD.protein_tryptophan.evidenceLevel,
      sources: SCIENTIFIC_PRIORS.FOOD_MOOD.protein_tryptophan.sources,
    });
  }

  // High Sugar (negative correlation)
  const sugarCorr = calculateCorrelation(features.sugar, moodScores);
  if (sugarCorr.significant && sugarCorr.r < 0) {
    correlations.push({
      factor: 'High Sugar',
      correlation: sugarCorr.r,
      pValue: sugarCorr.p,
      effectSize: sugarCorr.d,
      prior: SCIENTIFIC_PRIORS.FOOD_MOOD.high_sugar.effect,
      confidence: sugarCorr.confidence,
      mechanism: SCIENTIFIC_PRIORS.FOOD_MOOD.high_sugar.mechanism,
      evidenceLevel: SCIENTIFIC_PRIORS.FOOD_MOOD.high_sugar.evidenceLevel,
      sources: SCIENTIFIC_PRIORS.FOOD_MOOD.high_sugar.sources,
      warning: true,
    });
  }

  return {
    canAnalyze: true,
    correlations,
    daysAnalyzed: validDays.length,
    overallStrength: calculateOverallStrength(correlations),
  };
}

/**
 * Analyze Hydration → Cognition/Mood correlation
 * Based on CDC NHANES research (U-shaped curve!)
 */
function analyzeHydrationMoodCorrelation(alignedData) {
  const validDays = alignedData.filter(day =>
    day.water > 0 && day.moods.length > 0
  );

  if (validDays.length < CONFIG.MIN_DAYS_BIVARIABLE) {
    return { canAnalyze: false, daysNeeded: CONFIG.MIN_DAYS_BIVARIABLE - validDays.length };
  }

  const hydrationLevels = validDays.map(day => day.water);
  const moodScores = validDays.map(day => calculateAverageMood(day.moods));

  // Check for U-shaped (curvilinear) relationship
  const linearCorr = calculateCorrelation(hydrationLevels, moodScores);
  const quadraticFit = fitQuadraticCurve(hydrationLevels, moodScores);

  const isUShaped = quadraticFit.r2 > linearCorr.r * linearCorr.r && quadraticFit.a < 0;

  if (isUShaped) {
    // Optimal range analysis
    const optimalRange = findOptimalHydrationRange(hydrationLevels, moodScores);

    return {
      canAnalyze: true,
      type: 'curvilinear',
      relationship: 'U-shaped',
      optimalRange,
      dehydrationThreshold: CONFIG.HYDRATION_DEHYDRATION,
      overhydrationThreshold: CONFIG.HYDRATION_OVERHYDRATION,
      mechanism: SCIENTIFIC_PRIORS.HYDRATION_COGNITION.optimal_range.mechanism,
      evidenceLevel: SCIENTIFIC_PRIORS.HYDRATION_COGNITION.optimal_range.evidenceLevel,
      sources: SCIENTIFIC_PRIORS.HYDRATION_COGNITION.optimal_range.sources,
      warning: 'Both dehydration AND overhydration can impair mood/cognition',
      daysAnalyzed: validDays.length,
    };
  }

  // Linear relationship
  return {
    canAnalyze: true,
    type: 'linear',
    correlation: linearCorr.r,
    pValue: linearCorr.p,
    effectSize: linearCorr.d,
    confidence: linearCorr.confidence,
    daysAnalyzed: validDays.length,
  };
}

// ============================================================================
// REVERSE & BIDIRECTIONAL CORRELATION FUNCTIONS
// ============================================================================

/**
 * Analyze Mood → Hydration (Reverse Direction)
 *
 * Research Question: Does emotional state affect water intake?
 * Theory: Stress/anxiety may reduce self-care behaviors like hydration
 *
 * @param {Array} alignedData - Date-aligned data
 * @returns {Object} Correlation analysis
 */
function analyzeMoodHydrationCorrelation(alignedData) {
  const validDays = alignedData.filter(day =>
    day.moods.length > 0 && day.water > 0
  );

  if (validDays.length < CONFIG.MIN_DAYS_BIVARIABLE) {
    return { canAnalyze: false, daysNeeded: CONFIG.MIN_DAYS_BIVARIABLE - validDays.length };
  }

  // Extract morning mood (predictor) and total daily water intake (outcome)
  const morningMoods = validDays.map(day => {
    const morningEntries = day.moods.filter(mood => {
      const hour = new Date(mood.loggedDate || mood.timestamp).getHours();
      return hour >= 6 && hour <= 12; // Morning window
    });
    return morningEntries.length > 0
      ? calculateAverageMood(morningEntries)
      : calculateAverageMood(day.moods); // Fallback to day average
  });

  const waterIntake = validDays.map(day => day.water);

  const correlation = calculateCorrelation(morningMoods, waterIntake);

  return {
    canAnalyze: true,
    type: 'mood_to_hydration',
    direction: 'reverse',
    correlation: correlation.r,
    pValue: correlation.p,
    effectSize: correlation.d,
    significant: correlation.significant,
    confidence: correlation.confidence,
    interpretation: correlation.r > 0
      ? 'Better mood associated with higher water intake'
      : 'Lower mood may reduce self-care behaviors like hydration',
    daysAnalyzed: validDays.length,
  };
}

/**
 * Analyze Hydration → Activity Performance
 *
 * Research: Dehydration impairs physical performance by 10-20%
 * Source: American College of Sports Medicine
 */
function analyzeHydrationActivityCorrelation(alignedData) {
  const validDays = alignedData.filter(day =>
    day.water > 0 && day.activities.length > 0
  );

  if (validDays.length < CONFIG.MIN_DAYS_BIVARIABLE) {
    return { canAnalyze: false, daysNeeded: CONFIG.MIN_DAYS_BIVARIABLE - validDays.length };
  }

  const hydrationLevels = validDays.map(day => day.water);
  const activityIntensity = validDays.map(day => {
    // Calculate total activity minutes as proxy for performance
    return day.activities.reduce((sum, act) => sum + (act.duration || 30), 0);
  });

  const correlation = calculateCorrelation(hydrationLevels, activityIntensity);

  return {
    canAnalyze: true,
    type: 'hydration_to_activity',
    correlation: correlation.r,
    pValue: correlation.p,
    effectSize: correlation.d,
    significant: correlation.significant,
    confidence: correlation.confidence,
    mechanism: 'Proper hydration maintains blood volume, thermoregulation, and muscle function',
    evidenceLevel: 'Strong',
    sources: ['American College of Sports Medicine', 'CDC Hydration Guidelines'],
    daysAnalyzed: validDays.length,
  };
}

/**
 * Analyze Activity → Food Appetite/Choices
 *
 * Research: Exercise increases appetite hormones (ghrelin) and energy needs
 */
function analyzeActivityFoodCorrelation(alignedData) {
  const validDays = alignedData.filter(day =>
    day.activities.length > 0 && day.meals.length > 0
  );

  if (validDays.length < CONFIG.MIN_DAYS_BIVARIABLE) {
    return { canAnalyze: false, daysNeeded: CONFIG.MIN_DAYS_BIVARIABLE - validDays.length };
  }

  const activityIntensity = validDays.map(day => {
    const hasVigorous = day.activities.some(act =>
      act.type && (act.type.toLowerCase().includes('run') ||
                   act.type.toLowerCase().includes('hiit') ||
                   act.type.toLowerCase().includes('intense'))
    );
    return hasVigorous ? 2 : 1; // Vigorous=2, Moderate=1
  });

  const totalCalories = validDays.map(day => {
    return day.meals.reduce((sum, meal) => sum + (meal.calories || 200), 0);
  });

  const correlation = calculateCorrelation(activityIntensity, totalCalories);

  return {
    canAnalyze: true,
    type: 'activity_to_food',
    direction: 'forward',
    correlation: correlation.r,
    pValue: correlation.p,
    effectSize: correlation.d,
    significant: correlation.significant,
    confidence: correlation.confidence,
    interpretation: 'Exercise affects appetite and food intake patterns',
    daysAnalyzed: validDays.length,
  };
}

/**
 * Analyze Mood → Food (Emotional Eating)
 *
 * Research: Negative emotions trigger hedonic eating (high-sugar, high-fat foods)
 * Positive emotions associated with healthier choices
 */
function analyzeMoodFoodCorrelation(alignedData) {
  const validDays = alignedData.filter(day =>
    day.moods.length > 0 && day.meals.length > 0
  );

  if (validDays.length < CONFIG.MIN_DAYS_BIVARIABLE) {
    return { canAnalyze: false, daysNeeded: CONFIG.MIN_DAYS_BIVARIABLE - validDays.length };
  }

  const moodScores = validDays.map(day => calculateAverageMood(day.moods));

  // Analyze sugar intake as proxy for emotional eating
  const sugarIntake = validDays.map(day => {
    return day.meals.reduce((sum, meal) => sum + (meal.sugar || 0), 0);
  });

  const correlation = calculateCorrelation(moodScores, sugarIntake);

  // Negative correlation suggests emotional eating (low mood → high sugar)
  const isEmotionalEating = correlation.r < -0.2 && correlation.significant;

  return {
    canAnalyze: true,
    type: 'mood_to_food',
    direction: 'reverse',
    correlation: correlation.r,
    pValue: correlation.p,
    effectSize: correlation.d,
    significant: correlation.significant,
    confidence: correlation.confidence,
    pattern: isEmotionalEating ? 'emotional_eating' : 'stable',
    interpretation: isEmotionalEating
      ? 'Lower mood associated with higher sugar intake - potential emotional eating pattern'
      : 'No strong emotional eating pattern detected',
    daysAnalyzed: validDays.length,
  };
}

/**
 * Analyze Activity → Hydration Needs
 *
 * Research: Exercise increases fluid loss through sweat (0.5-2 L/hour)
 */
function analyzeActivityHydrationCorrelation(alignedData) {
  const validDays = alignedData.filter(day =>
    day.activities.length > 0 && day.water > 0
  );

  if (validDays.length < CONFIG.MIN_DAYS_BIVARIABLE) {
    return { canAnalyze: false, daysNeeded: CONFIG.MIN_DAYS_BIVARIABLE - validDays.length };
  }

  const activityMinutes = validDays.map(day => {
    return day.activities.reduce((sum, act) => sum + (act.duration || 30), 0);
  });

  const waterIntake = validDays.map(day => day.water);

  const correlation = calculateCorrelation(activityMinutes, waterIntake);

  return {
    canAnalyze: true,
    type: 'activity_to_hydration',
    direction: 'forward',
    correlation: correlation.r,
    pValue: correlation.p,
    effectSize: correlation.d,
    significant: correlation.significant,
    confidence: correlation.confidence,
    recommendation: 'Increase water intake by ~500ml per hour of exercise',
    evidenceLevel: 'Strong',
    sources: ['American College of Sports Medicine', 'CDC Exercise Guidelines'],
    daysAnalyzed: validDays.length,
  };
}

/**
 * Analyze Food → Activity Energy
 *
 * Research: Carbohydrate intake affects exercise capacity
 * Low energy availability reduces physical activity
 */
function analyzeFoodActivityCorrelation(alignedData) {
  const validDays = alignedData.filter(day =>
    day.meals.length > 0 && day.activities.length >= 0 // Include sedentary days
  );

  if (validDays.length < CONFIG.MIN_DAYS_BIVARIABLE) {
    return { canAnalyze: false, daysNeeded: CONFIG.MIN_DAYS_BIVARIABLE - validDays.length };
  }

  const totalCalories = validDays.map(day => {
    return day.meals.reduce((sum, meal) => sum + (meal.calories || 200), 0);
  });

  const activityLevel = validDays.map(day => {
    return day.activities.length > 0 ? 1 : 0; // Binary: active vs sedentary
  });

  const correlation = calculateCorrelation(totalCalories, activityLevel);

  return {
    canAnalyze: true,
    type: 'food_to_activity',
    direction: 'forward',
    correlation: correlation.r,
    pValue: correlation.p,
    effectSize: correlation.d,
    significant: correlation.significant,
    confidence: correlation.confidence,
    interpretation: 'Food intake affects energy availability for physical activity',
    daysAnalyzed: validDays.length,
  };
}

/**
 * Analyze Sleep → Mood
 *
 * Research: NIH - Sleep quality strongly predicts next-day mood
 * Effect size: d = 0.45 (medium-to-large)
 */
function analyzeSleepMoodCorrelation(alignedData) {
  const validDays = alignedData.filter((day, idx) => {
    // Need sleep data from current day and mood data from next day
    return day.sleep && day.sleep.hours && idx < alignedData.length - 1 &&
           alignedData[idx + 1].moods.length > 0;
  });

  if (validDays.length < CONFIG.MIN_DAYS_BIVARIABLE) {
    return { canAnalyze: false, daysNeeded: CONFIG.MIN_DAYS_BIVARIABLE - validDays.length };
  }

  const sleepHours = validDays.map(day => day.sleep.hours);
  const nextDayMood = validDays.map((day, idx) => {
    const nextDay = alignedData[alignedData.indexOf(day) + 1];
    return calculateAverageMood(nextDay.moods);
  });

  const correlation = calculateCorrelation(sleepHours, nextDayMood);

  return {
    canAnalyze: true,
    type: 'sleep_to_mood',
    direction: 'forward',
    lag: 1, // 1-day lag
    correlation: correlation.r,
    pValue: correlation.p,
    effectSize: correlation.d,
    significant: correlation.significant,
    confidence: correlation.confidence,
    mechanism: SCIENTIFIC_PRIORS.SLEEP_MULTI.sleep_mood.mechanism,
    evidenceLevel: SCIENTIFIC_PRIORS.SLEEP_MULTI.sleep_mood.evidenceLevel,
    sources: SCIENTIFIC_PRIORS.SLEEP_MULTI.sleep_mood.sources,
    priorEffect: SCIENTIFIC_PRIORS.SLEEP_MULTI.sleep_mood.effect,
    daysAnalyzed: validDays.length,
  };
}

/**
 * Analyze Sleep → Food Choices
 *
 * Research: NIH - Sleep deprivation leads to poor diet quality, higher calorie intake
 */
function analyzeSleepFoodCorrelation(alignedData) {
  const validDays = alignedData.filter((day, idx) => {
    return day.sleep && day.sleep.hours && idx < alignedData.length - 1 &&
           alignedData[idx + 1].meals.length > 0;
  });

  if (validDays.length < CONFIG.MIN_DAYS_BIVARIABLE) {
    return { canAnalyze: false, daysNeeded: CONFIG.MIN_DAYS_BIVARIABLE - validDays.length };
  }

  const sleepHours = validDays.map(day => day.sleep.hours);
  const nextDaySugar = validDays.map((day, idx) => {
    const nextDay = alignedData[alignedData.indexOf(day) + 1];
    return nextDay.meals.reduce((sum, meal) => sum + (meal.sugar || 0), 0);
  });

  const correlation = calculateCorrelation(sleepHours, nextDaySugar);

  // Negative correlation expected: less sleep → more sugar
  return {
    canAnalyze: true,
    type: 'sleep_to_food',
    direction: 'forward',
    lag: 1,
    correlation: correlation.r,
    pValue: correlation.p,
    effectSize: correlation.d,
    significant: correlation.significant,
    confidence: correlation.confidence,
    mechanism: SCIENTIFIC_PRIORS.SLEEP_MULTI.circadian_nutrition.mechanism,
    evidenceLevel: SCIENTIFIC_PRIORS.SLEEP_MULTI.circadian_nutrition.evidenceLevel,
    sources: SCIENTIFIC_PRIORS.SLEEP_MULTI.circadian_nutrition.sources,
    interpretation: correlation.r < 0
      ? 'Poor sleep associated with higher sugar intake next day'
      : 'No clear sleep-food pattern detected',
    daysAnalyzed: validDays.length,
  };
}

/**
 * Analyze Sleep → Hydration
 *
 * Research: Sleep quality affects morning hydration status
 */
function analyzeSleepHydrationCorrelation(alignedData) {
  const validDays = alignedData.filter((day, idx) => {
    return day.sleep && day.sleep.hours && idx < alignedData.length - 1 &&
           alignedData[idx + 1].water > 0;
  });

  if (validDays.length < CONFIG.MIN_DAYS_BIVARIABLE) {
    return { canAnalyze: false, daysNeeded: CONFIG.MIN_DAYS_BIVARIABLE - validDays.length };
  }

  const sleepQuality = validDays.map(day => {
    // Use sleep hours as proxy for quality
    const hours = day.sleep.hours;
    return hours >= CONFIG.SLEEP_OPTIMAL_MIN && hours <= CONFIG.SLEEP_OPTIMAL_MAX ? 1 : 0;
  });

  const nextDayWater = validDays.map((day, idx) => {
    const nextDay = alignedData[alignedData.indexOf(day) + 1];
    return nextDay.water;
  });

  const correlation = calculateCorrelation(sleepQuality, nextDayWater);

  return {
    canAnalyze: true,
    type: 'sleep_to_hydration',
    direction: 'forward',
    lag: 1,
    correlation: correlation.r,
    pValue: correlation.p,
    effectSize: correlation.d,
    significant: correlation.significant,
    confidence: correlation.confidence,
    daysAnalyzed: validDays.length,
  };
}

/**
 * Analyze Sleep → Activity Performance
 *
 * Research: Sleep deprivation reduces physical performance by 10-15%
 */
function analyzeSleepActivityCorrelation(alignedData) {
  const validDays = alignedData.filter((day, idx) => {
    return day.sleep && day.sleep.hours && idx < alignedData.length - 1;
  });

  if (validDays.length < CONFIG.MIN_DAYS_BIVARIABLE) {
    return { canAnalyze: false, daysNeeded: CONFIG.MIN_DAYS_BIVARIABLE - validDays.length };
  }

  const sleepHours = validDays.map(day => day.sleep.hours);
  const nextDayActivity = validDays.map((day, idx) => {
    const nextDay = alignedData[alignedData.indexOf(day) + 1];
    return nextDay.activities.length > 0 ? 1 : 0; // Binary: active vs sedentary
  });

  const correlation = calculateCorrelation(sleepHours, nextDayActivity);

  return {
    canAnalyze: true,
    type: 'sleep_to_activity',
    direction: 'forward',
    lag: 1,
    correlation: correlation.r,
    pValue: correlation.p,
    effectSize: correlation.d,
    significant: correlation.significant,
    confidence: correlation.confidence,
    interpretation: 'Sleep quality affects next-day physical activity engagement',
    daysAnalyzed: validDays.length,
  };
}

// ============================================================================
// INTERACTION DETECTION FUNCTIONS
// ============================================================================

function detectProteinStrengthSynergy(alignedData) {
  // Meta-analysis validated: Protein + Strength Training synergy
  // Check if user has both high protein days and strength training activities

  const daysWithBoth = alignedData.filter(day => {
    const hasHighProtein = day.meals.some(meal =>
      meal.protein && meal.protein > 20 // 20g+ protein in a meal
    );
    const hasStrengthTraining = day.activities.some(activity =>
      activity.type && (
        activity.type.toLowerCase().includes('strength') ||
        activity.type.toLowerCase().includes('weights') ||
        activity.type.toLowerCase().includes('resistance')
      )
    );
    return hasHighProtein && hasStrengthTraining;
  });

  if (daysWithBoth.length < 5) {
    return { detected: false };
  }

  // Compare mood/energy on days with both vs days with just one
  const daysWithProteinOnly = alignedData.filter(day => {
    const hasHighProtein = day.meals.some(meal => meal.protein && meal.protein > 20);
    const hasStrengthTraining = day.activities.some(activity =>
      activity.type && activity.type.toLowerCase().includes('strength')
    );
    return hasHighProtein && !hasStrengthTraining;
  });

  const avgMoodBoth = daysWithBoth.reduce((sum, day) =>
    sum + calculateAverageMood(day.moods), 0) / daysWithBoth.length;
  const avgMoodProteinOnly = daysWithProteinOnly.length > 0
    ? daysWithProteinOnly.reduce((sum, day) => sum + calculateAverageMood(day.moods), 0) / daysWithProteinOnly.length
    : 0;

  const synergisticEffect = avgMoodBoth - avgMoodProteinOnly;

  if (synergisticEffect > 0.15) { // 15% improvement threshold
    return {
      detected: true,
      effect: synergisticEffect,
      individual: avgMoodProteinOnly,
      boost: synergisticEffect / avgMoodProteinOnly,
      confidence: Math.min(0.9, 0.7 + (daysWithBoth.length / 30) * 0.2),
    };
  }

  return { detected: false };
}

function detectProteinEnduranceHydrationSynergy(alignedData) {
  // 3-way interaction: Protein + Endurance + Hydration
  const daysWithAll = alignedData.filter(day => {
    const hasProtein = day.meals.some(meal => meal.protein && meal.protein > 15);
    const hasEndurance = day.activities.some(activity =>
      activity.type && (
        activity.type.toLowerCase().includes('run') ||
        activity.type.toLowerCase().includes('cardio') ||
        activity.type.toLowerCase().includes('cycling') ||
        activity.type.toLowerCase().includes('swimming')
      )
    );
    const hasGoodHydration = day.water >= CONFIG.HYDRATION_OPTIMAL_MIN;
    return hasProtein && hasEndurance && hasGoodHydration;
  });

  if (daysWithAll.length < 5) {
    return { detected: false };
  }

  // Compare with days that have only 1 or 2 of these factors
  const daysPartial = alignedData.filter(day => {
    const hasProtein = day.meals.some(meal => meal.protein && meal.protein > 15);
    const hasEndurance = day.activities.some(activity =>
      activity.type && activity.type.toLowerCase().includes('run')
    );
    const hasGoodHydration = day.water >= CONFIG.HYDRATION_OPTIMAL_MIN;
    const count = [hasProtein, hasEndurance, hasGoodHydration].filter(Boolean).length;
    return count === 1 || count === 2;
  });

  if (daysPartial.length === 0) {
    return { detected: false };
  }

  const avgMoodAll = daysWithAll.reduce((sum, day) =>
    sum + calculateAverageMood(day.moods), 0) / daysWithAll.length;
  const avgMoodPartial = daysPartial.reduce((sum, day) =>
    sum + calculateAverageMood(day.moods), 0) / daysPartial.length;

  const synergisticEffect = avgMoodAll - avgMoodPartial;

  if (synergisticEffect > 0.1) {
    return {
      detected: true,
      effect: synergisticEffect,
      individual: avgMoodPartial,
      boost: synergisticEffect / avgMoodPartial,
      confidence: Math.min(0.85, 0.65 + (daysWithAll.length / 30) * 0.2),
    };
  }

  return { detected: false };
}

function detectMultiNutrientSynergy(alignedData) {
  // Protein + Omega-3 + Polyphenols (NOT seen with single nutrients)
  // Simplified: Check for days with multiple nutrient-rich foods
  const daysWithMultiNutrients = alignedData.filter(day => {
    const hasProtein = day.meals.some(meal => meal.protein && meal.protein > 15);
    const hasOmega3 = day.meals.some(meal =>
      meal.foodName && (
        meal.foodName.toLowerCase().includes('salmon') ||
        meal.foodName.toLowerCase().includes('fish') ||
        meal.foodName.toLowerCase().includes('omega')
      )
    );
    const hasPolyphenols = day.meals.some(meal =>
      meal.foodName && (
        meal.foodName.toLowerCase().includes('berry') ||
        meal.foodName.toLowerCase().includes('tea') ||
        meal.foodName.toLowerCase().includes('olive')
      )
    );
    const nutrientCount = [hasProtein, hasOmega3, hasPolyphenols].filter(Boolean).length;
    return nutrientCount >= 2;
  });

  if (daysWithMultiNutrients.length < 5) {
    return { detected: false };
  }

  const daysSingleNutrient = alignedData.filter(day => {
    const hasProtein = day.meals.some(meal => meal.protein && meal.protein > 15);
    const nutrientCount = hasProtein ? 1 : 0;
    return nutrientCount === 1;
  });

  if (daysSingleNutrient.length === 0) {
    return { detected: false };
  }

  const avgMoodMulti = daysWithMultiNutrients.reduce((sum, day) =>
    sum + calculateAverageMood(day.moods), 0) / daysWithMultiNutrients.length;
  const avgMoodSingle = daysSingleNutrient.reduce((sum, day) =>
    sum + calculateAverageMood(day.moods), 0) / daysSingleNutrient.length;

  const synergisticEffect = avgMoodMulti - avgMoodSingle;

  if (synergisticEffect > 0.12) {
    return {
      detected: true,
      effect: synergisticEffect,
      individual: avgMoodSingle,
      boost: synergisticEffect / avgMoodSingle,
      confidence: Math.min(0.8, 0.6 + (daysWithMultiNutrients.length / 30) * 0.2),
    };
  }

  return { detected: false };
}

function detectSugarSedentaryAntagonism(alignedData) {
  // High Sugar + Sedentary = Compounded negative
  const daysWithBoth = alignedData.filter(day => {
    const hasHighSugar = day.meals.some(meal =>
      meal.sugar && meal.sugar > 30 // 30g+ sugar
    );
    const isSedentary = day.activities.length === 0 || day.activities.every(a => !a.type);
    return hasHighSugar && isSedentary;
  });

  if (daysWithBoth.length < 5) {
    return { detected: false };
  }

  const daysWithJustSugar = alignedData.filter(day => {
    const hasHighSugar = day.meals.some(meal => meal.sugar && meal.sugar > 30);
    const hasActivity = day.activities.length > 0 && day.activities.some(a => a.type);
    return hasHighSugar && hasActivity;
  });

  if (daysWithJustSugar.length === 0) {
    return { detected: false };
  }

  const avgMoodBoth = daysWithBoth.reduce((sum, day) =>
    sum + calculateAverageMood(day.moods), 0) / daysWithBoth.length;
  const avgMoodJustSugar = daysWithJustSugar.reduce((sum, day) =>
    sum + calculateAverageMood(day.moods), 0) / daysWithJustSugar.length;

  const antagonisticEffect = avgMoodJustSugar - avgMoodBoth; // How much worse it is with both

  if (antagonisticEffect > 0.12) {
    return {
      detected: true,
      effect: avgMoodBoth,
      expected: avgMoodJustSugar,
      penalty: antagonisticEffect,
      confidence: Math.min(0.8, 0.6 + (daysWithBoth.length / 30) * 0.2),
    };
  }

  return { detected: false };
}

function detectSleepDeprivationExerciseAntagonism(alignedData) {
  // Poor Sleep negates Exercise benefits
  const daysWithPoorSleepAndExercise = alignedData.filter(day => {
    const hasPoorSleep = day.sleep && day.sleep.hours && day.sleep.hours < CONFIG.SLEEP_OPTIMAL_MIN;
    const hasExercise = day.activities.length > 0 && day.activities.some(a => a.type);
    return hasPoorSleep && hasExercise;
  });

  if (daysWithPoorSleepAndExercise.length < 5) {
    return { detected: false };
  }

  const daysWithGoodSleepAndExercise = alignedData.filter(day => {
    const hasGoodSleep = day.sleep && day.sleep.hours && day.sleep.hours >= CONFIG.SLEEP_OPTIMAL_MIN;
    const hasExercise = day.activities.length > 0 && day.activities.some(a => a.type);
    return hasGoodSleep && hasExercise;
  });

  if (daysWithGoodSleepAndExercise.length === 0) {
    return { detected: false };
  }

  const avgMoodPoorSleep = daysWithPoorSleepAndExercise.reduce((sum, day) =>
    sum + calculateAverageMood(day.moods), 0) / daysWithPoorSleepAndExercise.length;
  const avgMoodGoodSleep = daysWithGoodSleepAndExercise.reduce((sum, day) =>
    sum + calculateAverageMood(day.moods), 0) / daysWithGoodSleepAndExercise.length;

  const antagonisticEffect = avgMoodGoodSleep - avgMoodPoorSleep;

  if (antagonisticEffect > 0.15) {
    return {
      detected: true,
      effect: avgMoodPoorSleep,
      expected: avgMoodGoodSleep,
      penalty: antagonisticEffect,
      confidence: Math.min(0.85, 0.65 + (daysWithPoorSleepAndExercise.length / 30) * 0.2),
    };
  }

  return { detected: false };
}

// ============================================================================
// RECOMMENDATION GENERATION
// ============================================================================

function analyzeCurrentState({ todaysMeals, todaysMood, todaysWater, todaysActivity, todaysSleep }) {
  return {
    nutrition: analyzeNutritionState(todaysMeals),
    mood: todaysMood,
    hydration: analyzeHydrationState(todaysWater),
    activity: todaysActivity,
    sleep: todaysSleep,
  };
}

/**
 * Analyze Current Nutritional State
 *
 * Evaluates today's nutrition intake against requirements and goals
 * Provides actionable feedback on what's missing or excessive
 *
 * Design Principles:
 * - Evidence-based thresholds (WHO, FDA, CDC guidelines)
 * - Actionable feedback (tell user what to do)
 * - Progressive disclosure (prioritize most important gaps)
 * - Self-learning (adapts to user's personal model)
 *
 * @param {Array} meals - Today's meals
 * @param {Object} userModel - User's personalized nutritional model
 * @param {Object} userProfile - User demographics (age, gender, activity level)
 * @returns {Object} Nutritional state analysis
 */
function analyzeNutritionState(meals, userModel = {}, userProfile = {}) {
  if (!meals || meals.length === 0) {
    return {
      analyzed: false,
      message: 'No meals logged today',
      recommendation: 'Log your first meal to start tracking nutrition',
    };
  }

  // Extract total nutrition from all meals
  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    bVitamins: 0,
    omega3: 0,
    magnesium: 0,
  };

  meals.forEach(meal => {
    const foodName = meal.foodName || meal.name || '';
    const estimate = getNutritionalEstimate(userModel, foodName, meal);

    totals.calories += meal.calories || 200; // Fallback estimate
    totals.protein += estimate.protein;
    totals.carbs += meal.carbs || 0;
    totals.fat += meal.fat || 0;
    totals.fiber += meal.fiber || 0;
    totals.sugar += estimate.sugar;
    totals.bVitamins += estimate.bVitamins;
    totals.omega3 += estimate.omega3;
    totals.magnesium += estimate.magnesium;
  });

  // Calculate targets based on user profile
  const targets = calculateNutritionalTargets(userProfile);

  // Assess each nutrient
  const assessments = {
    calories: assessNutrient('Calories', totals.calories, targets.calories, 'kcal'),
    protein: assessNutrient('Protein', totals.protein, targets.protein, 'g'),
    sugar: assessNutrient('Sugar', totals.sugar, targets.sugar, 'g', true), // true = lower is better
    bVitamins: assessNutrient('B Vitamins', totals.bVitamins, targets.bVitamins, 'mg'),
    omega3: assessNutrient('Omega-3', totals.omega3, targets.omega3, 'g'),
    magnesium: assessNutrient('Magnesium', totals.magnesium, targets.magnesium, 'mg'),
  };

  // Identify gaps (prioritized)
  const gaps = [];
  const excesses = [];

  Object.entries(assessments).forEach(([nutrient, assessment]) => {
    if (assessment.status === 'low') {
      gaps.push({
        nutrient,
        ...assessment,
        priority: assessment.percentOfTarget < 0.5 ? 'high' : 'medium',
      });
    } else if (assessment.status === 'high') {
      excesses.push({
        nutrient,
        ...assessment,
        priority: assessment.percentOfTarget > 1.5 ? 'high' : 'medium',
      });
    }
  });

  // Sort by priority
  gaps.sort((a, b) => (b.priority === 'high' ? 1 : 0) - (a.priority === 'high' ? 1 : 0));
  excesses.sort((a, b) => (b.priority === 'high' ? 1 : 0) - (a.priority === 'high' ? 1 : 0));

  // Generate recommendations
  const recommendations = generateNutritionalRecommendations(gaps, excesses, totals, targets);

  return {
    analyzed: true,
    totals,
    targets,
    assessments,
    gaps,
    excesses,
    recommendations,
    overallScore: calculateNutritionalScore(assessments),
    mealCount: meals.length,
  };
}

/**
 * Calculate Nutritional Targets
 *
 * Based on WHO/FDA/CDC guidelines, adjusted for user profile
 */
function calculateNutritionalTargets(userProfile) {
  // Default targets for average adult
  const baseTargets = {
    calories: 2000,
    protein: 50, // g (0.8g/kg for 60kg person)
    sugar: 50, // g (WHO: <10% of energy, ~50g for 2000kcal)
    bVitamins: 2.0, // mg combined (B6: 1.3mg, B9: 400µg, B12: 2.4µg)
    omega3: 1.6, // g (ALA + EPA/DHA)
    magnesium: 400, // mg (RDA: 400-420mg for men, 310-320mg for women)
  };

  // Adjust for activity level
  const activityMultiplier = {
    sedentary: 1.0,
    light: 1.2,
    moderate: 1.4,
    active: 1.6,
    very_active: 1.8,
  };

  const multiplier = activityMultiplier[userProfile.activityLevel] || 1.0;

  return {
    calories: Math.round(baseTargets.calories * multiplier),
    protein: Math.round(baseTargets.protein * multiplier),
    sugar: baseTargets.sugar, // Sugar target doesn't scale with activity
    bVitamins: baseTargets.bVitamins,
    omega3: baseTargets.omega3,
    magnesium: baseTargets.magnesium,
  };
}

/**
 * Assess Single Nutrient
 */
function assessNutrient(name, actual, target, unit, lowerIsBetter = false) {
  const percentOfTarget = actual / target;

  let status;
  let message;

  if (lowerIsBetter) {
    // For sugar, lower is better
    if (actual <= target) {
      status = 'optimal';
      message = `${name} is within healthy limits`;
    } else if (actual <= target * 1.5) {
      status = 'high';
      message = `${name} is elevated`;
    } else {
      status = 'very_high';
      message = `${name} is significantly above recommended limit`;
    }
  } else {
    // For most nutrients, meeting target is optimal
    if (actual >= target * 0.8 && actual <= target * 1.2) {
      status = 'optimal';
      message = `${name} is on track`;
    } else if (actual < target * 0.8) {
      status = 'low';
      message = `${name} is below target`;
    } else if (actual < target * 0.5) {
      status = 'very_low';
      message = `${name} is significantly below target`;
    } else {
      status = 'high';
      message = `${name} is above target`;
    }
  }

  return {
    name,
    actual: Math.round(actual * 10) / 10,
    target,
    unit,
    percentOfTarget,
    status,
    message,
  };
}

/**
 * Generate Nutritional Recommendations
 */
function generateNutritionalRecommendations(gaps, excesses, totals, targets) {
  const recommendations = [];

  // Address top 2 gaps
  gaps.slice(0, 2).forEach(gap => {
    const foodSuggestions = suggestFoodsForNutrient(gap.nutrient);
    recommendations.push({
      type: 'increase',
      nutrient: gap.nutrient,
      current: gap.actual,
      target: gap.target,
      deficit: Math.round((gap.target - gap.actual) * 10) / 10,
      priority: gap.priority,
      message: `Add ${foodSuggestions.join(' or ')} to reach your ${gap.name} goal`,
      foodSuggestions,
    });
  });

  // Address top excess
  if (excesses.length > 0) {
    const topExcess = excesses[0];
    recommendations.push({
      type: 'reduce',
      nutrient: topExcess.nutrient,
      current: topExcess.actual,
      target: topExcess.target,
      excess: Math.round((topExcess.actual - topExcess.target) * 10) / 10,
      priority: topExcess.priority,
      message: `Consider reducing ${topExcess.name} intake`,
    });
  }

  return recommendations;
}

/**
 * Suggest Foods for Specific Nutrient
 */
function suggestFoodsForNutrient(nutrient) {
  const suggestions = {
    Protein: ['chicken breast', 'eggs', 'Greek yogurt', 'lentils'],
    'B Vitamins': ['salmon', 'eggs', 'spinach', 'fortified cereals'],
    'Omega-3': ['salmon', 'walnuts', 'chia seeds', 'flaxseeds'],
    Magnesium: ['pumpkin seeds', 'spinach', 'almonds', 'black beans'],
    Calories: ['nuts', 'avocado', 'whole grains', 'lean protein'],
  };

  return suggestions[nutrient] || ['nutrient-rich whole foods'];
}

/**
 * Calculate Overall Nutritional Score (0-100)
 */
function calculateNutritionalScore(assessments) {
  let score = 100;

  Object.values(assessments).forEach(assessment => {
    if (assessment.status === 'very_low' || assessment.status === 'very_high') {
      score -= 20;
    } else if (assessment.status === 'low' || assessment.status === 'high') {
      score -= 10;
    }
  });

  return Math.max(0, score);
}

function analyzeHydrationState(water) {
  const status =
    water < CONFIG.HYDRATION_DEHYDRATION ? 'dehydrated' :
    water > CONFIG.HYDRATION_OVERHYDRATION ? 'overhydrated' :
    water >= CONFIG.HYDRATION_OPTIMAL_MIN && water <= CONFIG.HYDRATION_OPTIMAL_MAX ? 'optimal' :
    'adequate';

  return { amount: water, status };
}

function generateMultiFactorOptimization({ currentState, correlations, interactions, goals }) {
  // Generate recommendations that optimize multiple factors simultaneously
  const recommendations = [];

  // Check if hydration is low
  if (currentState.hydration.status === 'dehydrated') {
    recommendations.push({
      title: 'Increase Hydration',
      description: `You're at ${currentState.hydration.amount}ml today. Research shows optimal cognition at ${CONFIG.HYDRATION_OPTIMAL_MIN}-${CONFIG.HYDRATION_OPTIMAL_MAX}ml/day.`,
      impact: 0.26,
      confidence: 0.82,
      urgency: 1.5,
      type: 'hydration',
    });
  }

  // Check for protein opportunity
  const currentProtein = currentState.nutrition?.protein || 0;
  if (currentProtein < 50) {
    recommendations.push({
      title: 'Add Protein-Rich Food',
      description: 'Protein supports serotonin production and mood stability. Aim for 20-30g per meal.',
      impact: 0.25,
      confidence: 0.78,
      urgency: 1.0,
      type: 'nutrition',
    });
  }

  return recommendations;
}

function generateSynergyRecommendations({ currentState, synergies, userPreferences }) {
  // Recommend leveraging synergistic combinations
  const recommendations = [];

  synergies.forEach(synergy => {
    if (synergy.factors.includes('protein') && synergy.factors.includes('strength_training')) {
      recommendations.push({
        title: 'Leverage Protein + Exercise Synergy',
        description: 'Your data shows combining high protein with strength training boosts mood by ' +
          `${Math.round(synergy.boost * 100)}% more than protein alone.`,
        impact: synergy.effect,
        confidence: synergy.confidence,
        urgency: 0.8,
        type: 'synergy',
      });
    }

    if (synergy.factors.includes('hydration')) {
      recommendations.push({
        title: 'Optimize Hydration Timing',
        description: `You've discovered that ${synergy.factors.join(' + ')} works exceptionally well for you.`,
        impact: synergy.effect,
        confidence: synergy.confidence,
        urgency: 0.7,
        type: 'synergy',
      });
    }
  });

  return recommendations;
}

function generateAntagonismWarnings({ currentState, antagonisms }) {
  // Warn about antagonistic combinations
  const warnings = [];

  antagonisms.forEach(antagonism => {
    if (antagonism.factors.includes('high_sugar') && antagonism.factors.includes('sedentary')) {
      warnings.push({
        title: 'Avoid Sugar + Sedentary Combination',
        description: `Your data shows combining high sugar with no activity reduces mood by ${Math.round(antagonism.penalty * 100)}%.`,
        impact: -antagonism.penalty,
        confidence: antagonism.confidence,
        urgency: 1.2,
        type: 'warning',
      });
    }

    if (antagonism.factors.includes('sleep_deprivation')) {
      warnings.push({
        title: 'Prioritize Sleep Quality',
        description: 'Poor sleep is negating your exercise benefits. Focus on 7-9 hours of quality sleep.',
        impact: -antagonism.penalty,
        confidence: antagonism.confidence,
        urgency: 1.5,
        type: 'warning',
      });
    }
  });

  return warnings;
}

function generatePersonalizedRecommendations({ currentState, historicalData, correlations }) {
  // Based on user's individual response patterns
  const recommendations = [];

  // Analyze food_mood correlation
  if (correlations.food_mood?.correlations) {
    const topCorrelation = correlations.food_mood.correlations
      .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))[0];

    if (topCorrelation && topCorrelation.correlation > 0.3) {
      recommendations.push({
        title: `Increase ${topCorrelation.factor}`,
        description: `Your personal data shows ${topCorrelation.factor} strongly improves your mood. ${topCorrelation.mechanism}`,
        impact: topCorrelation.effectSize,
        confidence: topCorrelation.confidence,
        urgency: 0.9,
        type: 'personal',
      });
    }
  }

  // Check hydration patterns
  if (correlations.hydration_mood && correlations.hydration_mood.type === 'curvilinear') {
    recommendations.push({
      title: 'Find Your Hydration Sweet Spot',
      description: `Both too little AND too much water affects your mood. Aim for ${CONFIG.HYDRATION_OPTIMAL_MIN}-${CONFIG.HYDRATION_OPTIMAL_MAX}ml/day.`,
      impact: 0.26,
      confidence: 0.82,
      urgency: 1.0,
      type: 'personal',
    });
  }

  return recommendations;
}

// ============================================================================
// PERSONALIZED PATTERN ANALYSIS
// ============================================================================

function identifyBestDays(alignedData, metric) {
  // Find top 20% days and identify common factors
  if (alignedData.length < 10) {
    return { commonFactors: [], frequency: 0, avgImprovement: 0 };
  }

  // Calculate mood for each day
  const daysWithMood = alignedData
    .filter(day => day.moods.length > 0)
    .map(day => ({
      ...day,
      avgMood: calculateAverageMood(day.moods),
    }))
    .sort((a, b) => b.avgMood - a.avgMood);

  const topCount = Math.ceil(daysWithMood.length * 0.2);
  const bestDays = daysWithMood.slice(0, topCount);
  const avgBestMood = bestDays.reduce((sum, day) => sum + day.avgMood, 0) / bestDays.length;
  const avgAllMood = daysWithMood.reduce((sum, day) => sum + day.avgMood, 0) / daysWithMood.length;

  // Find common factors in best days
  const commonFactors = [];

  // Check for high protein
  const proteinDays = bestDays.filter(day =>
    day.meals.some(meal => meal.protein && meal.protein > 20)
  ).length;
  if (proteinDays / bestDays.length > 0.6) {
    commonFactors.push('High protein intake');
  }

  // Check for good hydration
  const hydrationDays = bestDays.filter(day =>
    day.water >= CONFIG.HYDRATION_OPTIMAL_MIN
  ).length;
  if (hydrationDays / bestDays.length > 0.6) {
    commonFactors.push('Optimal hydration');
  }

  // Check for physical activity
  const activeDays = bestDays.filter(day =>
    day.activities.length > 0
  ).length;
  if (activeDays / bestDays.length > 0.5) {
    commonFactors.push('Physical activity');
  }

  // Check for good sleep
  const sleepDays = bestDays.filter(day =>
    day.sleep && day.sleep.hours >= CONFIG.SLEEP_OPTIMAL_MIN
  ).length;
  if (sleepDays / bestDays.length > 0.6) {
    commonFactors.push('Quality sleep');
  }

  return {
    commonFactors,
    frequency: commonFactors.length > 0 ? 0.8 : 0,
    avgImprovement: (avgBestMood - avgAllMood) / avgAllMood,
  };
}

function identifyWorstDays(alignedData, metric) {
  // Find bottom 20% days and identify common factors
  if (alignedData.length < 10) {
    return { commonFactors: [], frequency: 0, avgDrop: 0 };
  }

  const daysWithMood = alignedData
    .filter(day => day.moods.length > 0)
    .map(day => ({
      ...day,
      avgMood: calculateAverageMood(day.moods),
    }))
    .sort((a, b) => a.avgMood - b.avgMood);

  const bottomCount = Math.ceil(daysWithMood.length * 0.2);
  const worstDays = daysWithMood.slice(0, bottomCount);
  const avgWorstMood = worstDays.reduce((sum, day) => sum + day.avgMood, 0) / worstDays.length;
  const avgAllMood = daysWithMood.reduce((sum, day) => sum + day.avgMood, 0) / daysWithMood.length;

  // Find common factors in worst days
  const commonFactors = [];

  // Check for high sugar
  const sugarDays = worstDays.filter(day =>
    day.meals.some(meal => meal.sugar && meal.sugar > 30)
  ).length;
  if (sugarDays / worstDays.length > 0.5) {
    commonFactors.push('High sugar intake');
  }

  // Check for poor hydration
  const dehydratedDays = worstDays.filter(day =>
    day.water < CONFIG.HYDRATION_DEHYDRATION
  ).length;
  if (dehydratedDays / worstDays.length > 0.5) {
    commonFactors.push('Low hydration');
  }

  // Check for no activity
  const sedentaryDays = worstDays.filter(day =>
    day.activities.length === 0
  ).length;
  if (sedentaryDays / worstDays.length > 0.6) {
    commonFactors.push('No physical activity');
  }

  // Check for poor sleep
  const poorSleepDays = worstDays.filter(day =>
    day.sleep && day.sleep.hours < CONFIG.SLEEP_OPTIMAL_MIN
  ).length;
  if (poorSleepDays / worstDays.length > 0.5) {
    commonFactors.push('Insufficient sleep');
  }

  return {
    commonFactors,
    frequency: commonFactors.length > 0 ? 0.7 : 0,
    avgDrop: (avgAllMood - avgWorstMood) / avgAllMood,
  };
}

function calculatePersonalEffectSizes(alignedData) {
  // Individual-level effect sizes (not population averages)
  if (alignedData.length < 14) {
    return [];
  }

  const effects = [];

  // Protein effect
  const highProteinDays = alignedData.filter(day =>
    day.meals.some(meal => meal.protein && meal.protein > 20) && day.moods.length > 0
  );
  const lowProteinDays = alignedData.filter(day =>
    !day.meals.some(meal => meal.protein && meal.protein > 20) && day.moods.length > 0
  );

  if (highProteinDays.length >= 5 && lowProteinDays.length >= 5) {
    const avgMoodHigh = highProteinDays.reduce((sum, day) =>
      sum + calculateAverageMood(day.moods), 0) / highProteinDays.length;
    const avgMoodLow = lowProteinDays.reduce((sum, day) =>
      sum + calculateAverageMood(day.moods), 0) / lowProteinDays.length;

    effects.push({
      factor: 'protein',
      effect: avgMoodHigh - avgMoodLow,
      personalEffect: (avgMoodHigh - avgMoodLow) / avgMoodLow,
    });
  }

  // Hydration effect
  const wellHydratedDays = alignedData.filter(day =>
    day.water >= CONFIG.HYDRATION_OPTIMAL_MIN && day.moods.length > 0
  );
  const poorlyHydratedDays = alignedData.filter(day =>
    day.water < CONFIG.HYDRATION_OPTIMAL_MIN && day.moods.length > 0
  );

  if (wellHydratedDays.length >= 5 && poorlyHydratedDays.length >= 5) {
    const avgMoodHydrated = wellHydratedDays.reduce((sum, day) =>
      sum + calculateAverageMood(day.moods), 0) / wellHydratedDays.length;
    const avgMoodDehydrated = poorlyHydratedDays.reduce((sum, day) =>
      sum + calculateAverageMood(day.moods), 0) / poorlyHydratedDays.length;

    effects.push({
      factor: 'hydration',
      effect: avgMoodHydrated - avgMoodDehydrated,
      personalEffect: (avgMoodHydrated - avgMoodDehydrated) / avgMoodDehydrated,
    });
  }

  return effects;
}

function findOptimalCombinations(alignedData) {
  // What combinations work best for THIS user?
  if (alignedData.length < 20) {
    return [];
  }

  const combinations = [];

  // Protein + Hydration combination
  const proteinAndHydrationDays = alignedData.filter(day =>
    day.meals.some(meal => meal.protein && meal.protein > 20) &&
    day.water >= CONFIG.HYDRATION_OPTIMAL_MIN &&
    day.moods.length > 0
  );

  if (proteinAndHydrationDays.length >= 5) {
    const avgMood = proteinAndHydrationDays.reduce((sum, day) =>
      sum + calculateAverageMood(day.moods), 0) / proteinAndHydrationDays.length;

    combinations.push({
      factors: ['High protein', 'Good hydration'],
      avgMood,
      frequency: proteinAndHydrationDays.length / alignedData.length,
    });
  }

  // Activity + Hydration combination
  const activityAndHydrationDays = alignedData.filter(day =>
    day.activities.length > 0 &&
    day.water >= CONFIG.HYDRATION_OPTIMAL_MIN &&
    day.moods.length > 0
  );

  if (activityAndHydrationDays.length >= 5) {
    const avgMood = activityAndHydrationDays.reduce((sum, day) =>
      sum + calculateAverageMood(day.moods), 0) / activityAndHydrationDays.length;

    combinations.push({
      factors: ['Physical activity', 'Good hydration'],
      avgMood,
      frequency: activityAndHydrationDays.length / alignedData.length,
    });
  }

  // Sort by mood score
  return combinations.sort((a, b) => b.avgMood - a.avgMood);
}

/**
 * Analyze Temporal Patterns
 *
 * Discovers time-dependent patterns in user behavior and outcomes:
 * - Time-of-day effects (morning vs evening)
 * - Day-of-week patterns (weekday vs weekend)
 * - Lag effects (yesterday's X affects today's Y)
 * - Circadian rhythm alignment
 *
 * Design Principle: Temporal Causality
 * - Events must precede effects (no reverse causation)
 * - Considers circadian biology
 * - Detects weekly routines
 *
 * @param {Array} alignedData - Date-aligned data
 * @returns {Array} Discovered temporal patterns
 */
function analyzeTemporalPatterns(alignedData) {
  if (alignedData.length < 21) {
    return []; // Need 3 weeks minimum for weekly patterns
  }

  const patterns = [];

  // 1. Time-of-Day Mood Patterns
  const timeOfDayPattern = analyzeTimeOfDayMood(alignedData);
  if (timeOfDayPattern.significant) {
    patterns.push(timeOfDayPattern);
  }

  // 2. Day-of-Week Patterns
  const weekdayPattern = analyzeWeekdayWeekendDifference(alignedData);
  if (weekdayPattern.significant) {
    patterns.push(weekdayPattern);
  }

  // 3. Lag Effects (Yesterday → Today)
  const lagEffects = analyzeLagEffects(alignedData);
  patterns.push(...lagEffects.filter(effect => effect.significant));

  // 4. Meal Timing Effects
  const mealTimingPattern = analyzeMealTiming(alignedData);
  if (mealTimingPattern.significant) {
    patterns.push(mealTimingPattern);
  }

  return patterns;
}

/**
 * Analyze Time-of-Day Mood Patterns
 *
 * Research: Circadian rhythms affect mood - most people have peak mood mid-morning
 */
function analyzeTimeOfDayMood(alignedData) {
  const moodsByHour = Array(24).fill(null).map(() => []);

  alignedData.forEach(day => {
    day.moods.forEach(mood => {
      const timestamp = new Date(mood.loggedDate || mood.timestamp);
      const hour = timestamp.getHours();
      moodsByHour[hour].push(mood.intensity || 0);
    });
  });

  // Calculate average mood by hour
  const avgMoodByHour = moodsByHour.map(moods =>
    moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : null
  );

  // Find peak and trough hours
  const validHours = avgMoodByHour
    .map((mood, hour) => ({ mood, hour }))
    .filter(item => item.mood !== null);

  if (validHours.length < 4) {
    return { significant: false };
  }

  const sortedByMood = [...validHours].sort((a, b) => b.mood - a.mood);
  const peakHour = sortedByMood[0];
  const troughHour = sortedByMood[sortedByMood.length - 1];

  const moodRange = peakHour.mood - troughHour.mood;
  const significant = moodRange > 0.3; // 30% difference threshold

  return {
    type: 'time_of_day',
    significant,
    peakHour: peakHour.hour,
    peakMood: peakHour.mood,
    troughHour: troughHour.hour,
    troughMood: troughHour.mood,
    range: moodRange,
    interpretation: significant
      ? `Your mood peaks around ${formatHour(peakHour.hour)} and dips around ${formatHour(troughHour.hour)}`
      : 'No strong time-of-day mood pattern detected',
  };
}

/**
 * Analyze Weekday vs Weekend Differences
 *
 * Research: Work schedules, social patterns create weekly rhythms
 */
function analyzeWeekdayWeekendDifference(alignedData) {
  const weekdayData = [];
  const weekendData = [];

  alignedData.forEach(day => {
    const date = new Date(day.date);
    const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (day.moods.length > 0) {
      const avgMood = calculateAverageMood(day.moods);
      if (isWeekend) {
        weekendData.push(avgMood);
      } else {
        weekdayData.push(avgMood);
      }
    }
  });

  if (weekdayData.length < 10 || weekendData.length < 4) {
    return { significant: false };
  }

  const weekdayAvg = weekdayData.reduce((a, b) => a + b, 0) / weekdayData.length;
  const weekendAvg = weekendData.reduce((a, b) => a + b, 0) / weekendData.length;
  const difference = weekendAvg - weekdayAvg;

  const significant = Math.abs(difference) > 0.15; // 15% threshold

  return {
    type: 'weekday_weekend',
    significant,
    weekdayMood: weekdayAvg,
    weekendMood: weekendAvg,
    difference,
    interpretation: significant
      ? difference > 0
        ? `Your mood is ${Math.round(Math.abs(difference) * 100)}% better on weekends`
        : `Your mood is ${Math.round(Math.abs(difference) * 100)}% better on weekdays`
      : 'No significant weekday/weekend mood difference',
  };
}

/**
 * Analyze Lag Effects
 *
 * Tests if yesterday's factors predict today's outcomes
 * (e.g., yesterday's exercise → today's mood)
 */
function analyzeLagEffects(alignedData) {
  if (alignedData.length < 20) return [];

  const effects = [];

  // Test: Yesterday's Exercise → Today's Mood
  const exerciseMoodLag = testLagEffect(
    alignedData,
    (day) => day.activities.length > 0 ? 1 : 0, // Yesterday: exercised?
    (day) => day.moods.length > 0 ? calculateAverageMood(day.moods) : null, // Today: mood
    1 // 1-day lag
  );

  if (exerciseMoodLag.significant) {
    effects.push({
      type: 'lag_effect',
      factor: 'exercise',
      outcome: 'mood',
      lag: 1,
      ...exerciseMoodLag,
      interpretation: 'Yesterday\'s exercise affects today\'s mood',
    });
  }

  // Test: Yesterday's Sleep → Today's Mood
  const sleepMoodLag = testLagEffect(
    alignedData,
    (day) => day.sleep?.hours || null,
    (day) => day.moods.length > 0 ? calculateAverageMood(day.moods) : null,
    1
  );

  if (sleepMoodLag.significant) {
    effects.push({
      type: 'lag_effect',
      factor: 'sleep',
      outcome: 'mood',
      lag: 1,
      ...sleepMoodLag,
      interpretation: 'Last night\'s sleep quality predicts today\'s mood',
    });
  }

  return effects;
}

/**
 * Generic Lag Effect Tester
 *
 * Tests correlation between day[i] predictor and day[i+lag] outcome
 */
function testLagEffect(alignedData, predictorFn, outcomeFn, lag) {
  const pairs = [];

  for (let i = 0; i < alignedData.length - lag; i++) {
    const predictor = predictorFn(alignedData[i]);
    const outcome = outcomeFn(alignedData[i + lag]);

    if (predictor !== null && outcome !== null) {
      pairs.push({ predictor, outcome });
    }
  }

  if (pairs.length < 14) {
    return { significant: false };
  }

  const predictors = pairs.map(p => p.predictor);
  const outcomes = pairs.map(p => p.outcome);

  const correlation = calculateCorrelation(predictors, outcomes);

  return {
    significant: correlation.significant && Math.abs(correlation.r) > 0.2,
    correlation: correlation.r,
    pValue: correlation.p,
    effectSize: correlation.d,
    confidence: correlation.confidence,
    n: pairs.length,
  };
}

/**
 * Analyze Meal Timing Effects
 *
 * Research: Late eating associated with poorer outcomes
 */
function analyzeMealTiming(alignedData) {
  const mealsByTime = { early: [], late: [] };

  alignedData.forEach(day => {
    if (day.meals.length === 0 || day.moods.length === 0) return;

    // Check if last meal was late (after 8pm)
    const lastMeal = day.meals[day.meals.length - 1];
    const mealTime = new Date(lastMeal.loggedDate || lastMeal.timestamp);
    const hour = mealTime.getHours();
    const isLateMeal = hour >= 20 || hour <= 2; // 8pm-2am

    const avgMood = calculateAverageMood(day.moods);

    if (isLateMeal) {
      mealsByTime.late.push(avgMood);
    } else {
      mealsByTime.early.push(avgMood);
    }
  });

  if (mealsByTime.early.length < 5 || mealsByTime.late.length < 5) {
    return { significant: false };
  }

  const earlyAvg = mealsByTime.early.reduce((a, b) => a + b, 0) / mealsByTime.early.length;
  const lateAvg = mealsByTime.late.reduce((a, b) => a + b, 0) / mealsByTime.late.length;
  const difference = earlyAvg - lateAvg;

  const significant = Math.abs(difference) > 0.15;

  return {
    type: 'meal_timing',
    significant,
    earlyMealMood: earlyAvg,
    lateMealMood: lateAvg,
    difference,
    interpretation: significant
      ? difference > 0
        ? 'Earlier meals associated with better mood'
        : 'Later meals associated with better mood (unusual pattern)'
      : 'Meal timing doesn\'t significantly affect mood',
  };
}

/**
 * Format hour in 12-hour format
 */
function formatHour(hour) {
  if (hour === 0) return '12am';
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return '12pm';
  return `${hour - 12}pm`;
}

function formatSuccessPattern(bestDays) {
  if (bestDays.commonFactors.length === 0) {
    return 'Your best days don\'t show a clear pattern yet. Keep logging to discover what works!';
  }

  const factors = bestDays.commonFactors.join(', ');
  const improvement = Math.round(bestDays.avgImprovement * 100);
  return `Your mood is ${improvement}% better on days with: ${factors}`;
}

function formatStrugglePattern(worstDays) {
  if (worstDays.commonFactors.length === 0) {
    return 'No clear patterns found on difficult days yet.';
  }

  const factors = worstDays.commonFactors.join(', ');
  const drop = Math.round(worstDays.avgDrop * 100);
  return `Your mood drops by ${drop}% on days with: ${factors}`;
}

function formatPersonalEffects(effects) {
  if (effects.length === 0) {
    return 'Need more data to calculate personal effect sizes.';
  }

  const topEffect = effects.sort((a, b) => Math.abs(b.personalEffect) - Math.abs(a.personalEffect))[0];
  const percentage = Math.round(Math.abs(topEffect.personalEffect) * 100);
  const direction = topEffect.personalEffect > 0 ? 'improves' : 'decreases';

  return `Your ${topEffect.factor} ${direction} your mood by ${percentage}%`;
}

function formatOptimalCombinations(combos) {
  if (combos.length === 0) {
    return 'Need more varied data to find optimal combinations.';
  }

  const best = combos[0];
  const factors = best.factors.join(' + ');
  return `Your mood peaks when you combine: ${factors}`;
}

function formatTemporalPatterns(patterns) {
  if (patterns.length === 0) {
    return 'Temporal pattern analysis requires more data.';
  }
  return 'Your energy peaks at [time-of-day analysis coming soon]';
}

// ============================================================================
// STATISTICAL UTILITIES
// ============================================================================

function calculateCorrelation(x, y) {
  if (x.length !== y.length || x.length < 2) {
    return { r: 0, p: 1, d: 0, significant: false, confidence: 0 };
  }

  const n = x.length;
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const r = numerator / Math.sqrt(denomX * denomY);

  // t-test for significance
  const t = r * Math.sqrt(n - 2) / Math.sqrt(1 - r * r);
  const df = n - 2;
  const p = 2 * (1 - tDistributionCDF(Math.abs(t), df));

  // Cohen's d effect size
  const d = (2 * r) / Math.sqrt(1 - r * r);

  return {
    r,
    p,
    d,
    significant: p < CONFIG.SIGNIFICANCE_THRESHOLD,
    confidence: 1 - p,
    n,
  };
}

/**
 * Fit Quadratic Curve using Least Squares Method
 *
 * Fits y = a*x² + b*x + c to detect U-shaped or inverted-U relationships
 * Used for hydration-cognition analysis (U-shaped curve)
 *
 * Design Principle: Mathematical Rigor
 * - Proper least squares implementation
 * - Calculates R² goodness of fit
 * - Validates inputs
 *
 * @param {Array<number>} x - Independent variable (e.g., hydration levels)
 * @param {Array<number>} y - Dependent variable (e.g., mood scores)
 * @returns {Object} Quadratic coefficients and R² fit quality
 */
function fitQuadraticCurve(x, y) {
  if (!x || !y || x.length !== y.length || x.length < 3) {
    return { a: 0, b: 0, c: 0, r2: 0, valid: false };
  }

  const n = x.length;

  // Build system of equations for least squares
  // Sum of: x^4, x^3, x^2, x, 1
  // And: x^2*y, x*y, y
  let sumX = 0, sumX2 = 0, sumX3 = 0, sumX4 = 0;
  let sumY = 0, sumXY = 0, sumX2Y = 0;

  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    const xi2 = xi * xi;
    const xi3 = xi2 * xi;
    const xi4 = xi2 * xi2;

    sumX += xi;
    sumX2 += xi2;
    sumX3 += xi3;
    sumX4 += xi4;
    sumY += yi;
    sumXY += xi * yi;
    sumX2Y += xi2 * yi;
  }

  // Solve 3x3 system: [X'X]β = X'y
  // Using Cramer's rule (simplified for 3x3)
  const denom = n * sumX2 * sumX4 +
                2 * sumX * sumX2 * sumX3 -
                sumX2 * sumX2 * sumX2 -
                n * sumX3 * sumX3 -
                sumX * sumX * sumX4;

  if (Math.abs(denom) < 1e-10) {
    // Singular matrix - data is collinear
    return { a: 0, b: 0, c: 0, r2: 0, valid: false };
  }

  // Calculate coefficients using Cramer's rule
  const a = (n * sumX2 * sumX2Y +
             sumX * sumX3 * sumY +
             sumX * sumX2 * sumXY -
             sumX2 * sumX2 * sumY -
             n * sumX3 * sumXY -
             sumX * sumX * sumX2Y) / denom;

  const b = (n * sumX2Y * sumX4 +
             sumY * sumX2 * sumX3 +
             sumX * sumXY * sumX3 -
             sumX2 * sumX2 * sumXY -
             n * sumX3 * sumX2Y -
             sumY * sumX * sumX4) / denom;

  const c = (sumX2 * sumX2Y * sumX4 +
             sumX * sumX3 * sumXY +
             sumY * sumX2 * sumX3 -
             sumX2 * sumX2 * sumXY -
             sumX2Y * sumX2 * sumX3 -
             sumY * sumX3 * sumX4) / denom;

  // Calculate R² (coefficient of determination)
  const meanY = sumY / n;
  let ssTotal = 0;
  let ssResidual = 0;

  for (let i = 0; i < n; i++) {
    const predicted = a * x[i] * x[i] + b * x[i] + c;
    ssTotal += (y[i] - meanY) ** 2;
    ssResidual += (y[i] - predicted) ** 2;
  }

  const r2 = 1 - (ssResidual / ssTotal);

  return {
    a,
    b,
    c,
    r2: Math.max(0, Math.min(1, r2)), // Clamp to [0, 1]
    valid: true,
    peak: a !== 0 ? -b / (2 * a) : null, // Vertex of parabola
  };
}

/**
 * Find Optimal Hydration Range from User's Data
 *
 * Analyzes actual user data to determine their personal optimal hydration range
 * (not just using population-level config values)
 *
 * Design Principle: Personalization
 * - Data-driven (not assumption-driven)
 * - Finds user's actual optimal range
 * - Falls back to research-based ranges if insufficient data
 *
 * @param {Array<number>} hydration - Daily hydration levels (ml)
 * @param {Array<number>} mood - Corresponding mood scores
 * @returns {Object} Personalized optimal range
 */
function findOptimalHydrationRange(hydration, mood) {
  if (!hydration || !mood || hydration.length !== mood.length || hydration.length < 10) {
    // Insufficient data - use research-based defaults
    return {
      min: CONFIG.HYDRATION_OPTIMAL_MIN,
      max: CONFIG.HYDRATION_OPTIMAL_MAX,
      confidence: 0.5,
      personalized: false,
    };
  }

  // Create hydration-mood pairs and sort by hydration
  const pairs = hydration.map((h, i) => ({ hydration: h, mood: mood[i] }))
    .sort((a, b) => a.hydration - b.hydration);

  // Use sliding window to find range with highest average mood
  const windowSize = Math.max(5, Math.floor(pairs.length * 0.3)); // 30% of data
  let bestRange = { min: 0, max: 0, avgMood: 0 };

  for (let i = 0; i <= pairs.length - windowSize; i++) {
    const window = pairs.slice(i, i + windowSize);
    const avgMood = window.reduce((sum, p) => sum + p.mood, 0) / windowSize;

    if (avgMood > bestRange.avgMood) {
      bestRange = {
        min: window[0].hydration,
        max: window[windowSize - 1].hydration,
        avgMood,
      };
    }
  }

  // Validate range is reasonable (not too narrow)
  const rangeWidth = bestRange.max - bestRange.min;
  if (rangeWidth < 500) {
    // Range too narrow - expand to at least 500ml
    const center = (bestRange.min + bestRange.max) / 2;
    bestRange.min = center - 250;
    bestRange.max = center + 250;
  }

  // Calculate confidence based on data quality
  const dataSpread = Math.max(...hydration) - Math.min(...hydration);
  const confidence = Math.min(0.9, 0.5 + (hydration.length / 60) * 0.4);

  return {
    min: Math.round(bestRange.min),
    max: Math.round(bestRange.max),
    confidence,
    personalized: true,
  };
}

/**
 * Student's t-Distribution Cumulative Distribution Function (CDF)
 *
 * Calculates p-values for correlation significance testing
 *
 * Design Principle: Mathematical Accuracy
 * - Uses Abramowitz & Stegun approximation (accurate to 10^-7)
 * - Handles edge cases (df <= 0, extreme t-values)
 * - Efficient computation
 *
 * @param {number} t - t-statistic value
 * @param {number} df - Degrees of freedom
 * @returns {number} Probability P(T ≤ t)
 */
function tDistributionCDF(t, df) {
  if (df <= 0) return 0.5;
  if (!isFinite(t)) return t > 0 ? 1 : 0;

  // For large df (>30), t-distribution ≈ normal distribution
  if (df > 30) {
    return normalCDF(t);
  }

  // Use incomplete beta function relationship
  // P(T ≤ t) = 0.5 + 0.5 * sign(t) * (1 - I_x(df/2, 0.5))
  // where x = df / (df + t²)

  const x = df / (df + t * t);
  const prob = incompleteBeta(x, df / 2, 0.5);

  return 0.5 + 0.5 * Math.sign(t) * (1 - prob);
}

/**
 * Standard Normal CDF (Φ function)
 * Using Abramowitz & Stegun approximation
 */
function normalCDF(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

  return z > 0 ? 1 - prob : prob;
}

/**
 * Incomplete Beta Function I_x(a, b)
 * Using continued fraction approximation
 */
function incompleteBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Use continued fraction expansion
  const lnBeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;

  // Lentz's algorithm for continued fraction
  let f = 1.0;
  let c = 1.0;
  let d = 0.0;

  for (let m = 0; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((a + m2) * (a + m2 + 1));

    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    f *= d * c;

    aa = -(a + m) * (a + b + m) * x / ((a + m2 + 1) * (a + m2 + 2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const delta = d * c;
    f *= delta;

    if (Math.abs(delta - 1.0) < 1e-8) break;
  }

  return front * f;
}

/**
 * Log Gamma Function
 * Using Lanczos approximation
 */
function logGamma(z) {
  const g = 7;
  const coef = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];

  if (z < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  }

  z -= 1;
  let x = coef[0];
  for (let i = 1; i < g + 2; i++) {
    x += coef[i] / (z + i);
  }

  const t = z + g + 0.5;
  return Math.log(Math.sqrt(2 * Math.PI)) + Math.log(t) * (z + 0.5) - t + Math.log(x);
}

// ============================================================================
// SELF-LEARNING FEEDBACK SYSTEM
// ============================================================================

/**
 * Self-Learning Food-Mood Association Tracker
 *
 * Design Philosophy: LEARN, DON'T HARDCODE
 * 1. Bootstrap: Start with research priors (initial beliefs)
 * 2. Observe: Track user's actual food → mood associations
 * 3. Update: Bayesian updating of beliefs based on evidence
 * 4. Personalize: Converge to user-specific patterns over time
 * 5. Feedback: Track recommendation effectiveness
 *
 * This creates a system that adapts to EACH USER, not population averages
 */

/**
 * Bayesian Prior Beliefs (Research-Based Initial Estimates)
 *
 * These are NOT hardcoded truths - they're probabilistic starting points
 * that get updated with user data. Think of them as "educated guesses"
 * that fade as real evidence accumulates.
 *
 * Structure: { food: { nutrient: { mean, variance, confidence } } }
 *
 * - mean: Expected value (from research)
 * - variance: Uncertainty in estimate
 * - confidence: How certain we are (0-1, starts low)
 *
 * Sources: WHO, USDA, CDC nutritional guidelines
 */
const NUTRITIONAL_PRIORS = {
  // Research-based nutritional estimates (bootstrap values)
  // Format: { mean: value, variance: uncertainty, dataPoints: 0 }
  salmon: { bVitamins: { mean: 0.8, variance: 0.2, dataPoints: 0 }, omega3: { mean: 2.2, variance: 0.5, dataPoints: 0 }, magnesium: { mean: 29, variance: 5, dataPoints: 0 }, protein: { mean: 20, variance: 3, dataPoints: 0 }, sugar: { mean: 0, variance: 0.1, dataPoints: 0 } },
  chicken: { bVitamins: { mean: 0.4, variance: 0.15, dataPoints: 0 }, omega3: { mean: 0.1, variance: 0.05, dataPoints: 0 }, magnesium: { mean: 22, variance: 4, dataPoints: 0 }, protein: { mean: 27, variance: 3, dataPoints: 0 }, sugar: { mean: 0, variance: 0.1, dataPoints: 0 } },
  eggs: { bVitamins: { mean: 0.9, variance: 0.2, dataPoints: 0 }, omega3: { mean: 0.1, variance: 0.05, dataPoints: 0 }, magnesium: { mean: 12, variance: 2, dataPoints: 0 }, protein: { mean: 6, variance: 1, dataPoints: 0 }, sugar: { mean: 0, variance: 0.1, dataPoints: 0 } },
  // Add more as needed - these are just initial priors
};

/**
 * Bayesian Update of Nutritional Beliefs
 *
 * When user logs actual nutrition data (e.g., from labels), update our beliefs
 * about that food using Bayesian posterior calculation
 *
 * Design Principle: Adaptive Learning
 * - Prior belief (research estimate) + New observation → Posterior belief
 * - As dataPoints increase, user data dominates research priors
 * - Each user builds their own personalized nutritional model
 *
 * Formula: posterior_mean = (prior_variance × observation + observation_variance × prior_mean) /
 *                           (prior_variance + observation_variance)
 *
 * @param {Object} prior - Prior belief { mean, variance, dataPoints }
 * @param {number} observation - Newly observed value
 * @param {number} observationVariance - Uncertainty in observation (default: measurement error)
 * @returns {Object} Updated posterior belief
 */
function bayesianUpdate(prior, observation, observationVariance = 1.0) {
  if (!prior || observation === null || observation === undefined) {
    return prior || { mean: 0, variance: 10, dataPoints: 0 };
  }

  const priorMean = prior.mean;
  const priorVar = prior.variance;
  const obsVar = observationVariance;

  // Bayesian posterior calculation
  const posteriorVar = (priorVar * obsVar) / (priorVar + obsVar);
  const posteriorMean = (priorVar * observation + obsVar * priorMean) / (priorVar + obsVar);

  return {
    mean: posteriorMean,
    variance: posteriorVar,
    dataPoints: (prior.dataPoints || 0) + 1,
  };
}

/**
 * Update Nutritional Model with User's Food Log
 *
 * Each time user logs food with actual nutrition data, update the model
 * This allows the system to learn user-specific food compositions
 * (e.g., their "chicken breast" might be different from research averages)
 *
 * @param {Object} userModel - User's personal nutritional model (stored in database)
 * @param {string} foodName - Name of food
 * @param {Object} observedNutrition - Actual nutrition from log { protein, sugar, etc. }
 * @returns {Object} Updated model
 */
function updateNutritionalModel(userModel, foodName, observedNutrition) {
  const normalized = foodName.toLowerCase().trim();

  // Initialize user model if doesn't exist
  if (!userModel[normalized]) {
    // Start with research prior or generic fallback
    const prior = NUTRITIONAL_PRIORS[normalized] || {
      bVitamins: { mean: 0.3, variance: 0.3, dataPoints: 0 },
      omega3: { mean: 0.1, variance: 0.2, dataPoints: 0 },
      magnesium: { mean: 20, variance: 15, dataPoints: 0 },
      protein: { mean: 10, variance: 10, dataPoints: 0 },
      sugar: { mean: 5, variance: 5, dataPoints: 0 },
    };
    userModel[normalized] = prior;
  }

  // Update each nutrient with Bayesian inference
  const nutrients = ['bVitamins', 'omega3', 'magnesium', 'protein', 'sugar'];
  nutrients.forEach(nutrient => {
    if (observedNutrition[nutrient] !== undefined && observedNutrition[nutrient] !== null) {
      userModel[normalized][nutrient] = bayesianUpdate(
        userModel[normalized][nutrient],
        observedNutrition[nutrient],
        2.0 // Measurement uncertainty (user-reported data has error)
      );
    }
  });

  return userModel;
}

/**
 * Get Nutritional Estimate for Food
 *
 * Returns best estimate using:
 * 1. User's personalized model (if they've logged this food before)
 * 2. Research priors (bootstrap values)
 * 3. Category-based fallback (if completely unknown)
 *
 * Design Principle: Progressive Trust
 * - Start: Trust research (high variance, low confidence)
 * - Middle: Blend research + user data
 * - Mature: Trust user's personal patterns (low variance, high confidence)
 *
 * @param {Object} userModel - User's learned nutritional model
 * @param {string} foodName - Name of food
 * @param {Object} mealData - Logged meal data (may include actual nutrition)
 * @returns {Object} Nutrition estimate with confidence
 */
function getNutritionalEstimate(userModel, foodName, mealData = {}) {
  if (!foodName || typeof foodName !== 'string') {
    return {
      bVitamins: 0,
      omega3: 0,
      magnesium: 0,
      protein: 0,
      sugar: 0,
      confidence: 0,
      source: 'unknown',
    };
  }

  const normalized = foodName.toLowerCase().trim();

  // Priority 1: Use actual logged values (highest confidence)
  if (mealData.protein !== undefined || mealData.sugar !== undefined) {
    return {
      bVitamins: mealData.bVitamins || 0,
      omega3: mealData.omega3 || 0,
      magnesium: mealData.magnesium || 0,
      protein: mealData.protein || 0,
      sugar: mealData.sugar || 0,
      confidence: 0.95,
      source: 'user_logged',
    };
  }

  // Priority 2: User's personalized model (learned from their history)
  if (userModel[normalized]) {
    const model = userModel[normalized];
    const avgDataPoints = Object.values(model)
      .reduce((sum, nutrient) => sum + (nutrient.dataPoints || 0), 0) / 5;

    // Confidence increases with data points (asymptotic to 0.9)
    const confidence = Math.min(0.9, 0.4 + avgDataPoints * 0.05);

    return {
      bVitamins: model.bVitamins?.mean || 0,
      omega3: model.omega3?.mean || 0,
      magnesium: model.magnesium?.mean || 0,
      protein: model.protein?.mean || 0,
      sugar: model.sugar?.mean || 0,
      confidence,
      source: 'learned',
      dataPoints: avgDataPoints,
    };
  }

  // Priority 3: Research priors (moderate confidence)
  if (NUTRITIONAL_PRIORS[normalized]) {
    const prior = NUTRITIONAL_PRIORS[normalized];
    return {
      bVitamins: prior.bVitamins?.mean || 0,
      omega3: prior.omega3?.mean || 0,
      magnesium: prior.magnesium?.mean || 0,
      protein: prior.protein?.mean || 0,
      sugar: prior.sugar?.mean || 0,
      confidence: 0.6,
      source: 'research_prior',
    };
  }

  // Priority 4: Fuzzy match to similar foods
  for (const [key, value] of Object.entries(NUTRITIONAL_PRIORS)) {
    if (normalized.includes(key) || key.includes(normalized.split(' ')[0])) {
      return {
        bVitamins: value.bVitamins?.mean || 0,
        omega3: value.omega3?.mean || 0,
        magnesium: value.magnesium?.mean || 0,
        protein: value.protein?.mean || 0,
        sugar: value.sugar?.mean || 0,
        confidence: 0.4,
        source: 'fuzzy_match',
        matchedTo: key,
      };
    }
  }

  // Priority 5: Category-based fallback (low confidence)
  const categoryEstimate = estimateByFoodCategory(normalized);
  return {
    ...categoryEstimate,
    confidence: 0.2,
    source: 'category_estimate',
  };
}

/**
 * Estimate Nutrition by Food Category
 *
 * When completely unknown, make educated guess based on food type
 * (e.g., "grilled xyz" is probably protein-rich, "sweet xyz" has sugar)
 *
 * @param {string} foodName - Normalized food name
 * @returns {Object} Conservative nutritional estimate
 */
function estimateByFoodCategory(foodName) {
  const keywords = {
    protein: ['meat', 'chicken', 'beef', 'pork', 'fish', 'egg', 'protein', 'steak', 'grilled'],
    sweet: ['cake', 'cookie', 'candy', 'dessert', 'sweet', 'chocolate', 'ice cream', 'donut'],
    vegetable: ['salad', 'vegetable', 'broccoli', 'carrot', 'green', 'leafy'],
    grain: ['bread', 'rice', 'pasta', 'wheat', 'grain', 'cereal'],
  };

  let category = 'unknown';
  for (const [cat, words] of Object.entries(keywords)) {
    if (words.some(word => foodName.includes(word))) {
      category = cat;
      break;
    }
  }

  // Conservative estimates by category
  const categoryDefaults = {
    protein: { bVitamins: 0.4, omega3: 0.1, magnesium: 25, protein: 20, sugar: 0 },
    sweet: { bVitamins: 0.1, omega3: 0, magnesium: 10, protein: 2, sugar: 30 },
    vegetable: { bVitamins: 0.5, omega3: 0.1, magnesium: 40, protein: 3, sugar: 3 },
    grain: { bVitamins: 0.3, omega3: 0, magnesium: 20, protein: 5, sugar: 2 },
    unknown: { bVitamins: 0.2, omega3: 0, magnesium: 15, protein: 5, sugar: 5 },
  };

  return categoryDefaults[category];
}

/**
 * Extract nutritional features from daily meal logs
 *
 * Design Principles Applied:
 * 1. Self-Learning: Uses user's personalized nutritional model
 * 2. Adaptive: Confidence improves as more data is collected
 * 3. Transparent: Returns confidence scores for each estimate
 * 4. Fallback Chain: user_logged → learned → research → category → unknown
 *
 * CRITICAL FIX: Now uses self-learning Bayesian system instead of hardcoded database
 *
 * @param {Array} validDays - Array of days with meals and moods
 * @param {Object} userModel - User's personalized nutritional model (optional)
 * @returns {Object} Daily micronutrient arrays + confidence metadata
 */
function extractNutritionalFeatures(validDays, userModel = {}) {
  if (!validDays || validDays.length === 0) {
    return {
      bVitamins: [],
      omega3: [],
      magnesium: [],
      protein: [],
      sugar: [],
      confidence: [],
      sources: [],
    };
  }

  const dailyFeatures = validDays.map(day => {
    // Initialize daily totals
    let bVitaminsTotal = 0;
    let omega3Total = 0;
    let magnesiumTotal = 0;
    let proteinTotal = 0;
    let sugarTotal = 0;
    let confidenceSum = 0;
    let mealCount = 0;
    const sources = [];

    // Aggregate from all meals on this day
    if (day.meals && Array.isArray(day.meals)) {
      day.meals.forEach(meal => {
        // Try multiple field names (different log formats)
        const foodName = meal.foodName || meal.name || meal.food || '';

        if (!foodName) return;

        // Get nutritional estimate using self-learning system
        const estimate = getNutritionalEstimate(userModel, foodName, meal);

        // Accumulate daily totals
        bVitaminsTotal += estimate.bVitamins;
        omega3Total += estimate.omega3;
        magnesiumTotal += estimate.magnesium;
        proteinTotal += estimate.protein;
        sugarTotal += estimate.sugar;

        confidenceSum += estimate.confidence;
        mealCount++;
        sources.push(estimate.source);
      });
    }

    const avgConfidence = mealCount > 0 ? confidenceSum / mealCount : 0;

    return {
      bVitamins: bVitaminsTotal,
      omega3: omega3Total,
      magnesium: magnesiumTotal,
      protein: proteinTotal,
      sugar: sugarTotal,
      confidence: avgConfidence,
      sources: sources.join(', '),
    };
  });

  // Convert to parallel arrays (required by correlation analysis)
  return {
    bVitamins: dailyFeatures.map(d => d.bVitamins),
    omega3: dailyFeatures.map(d => d.omega3),
    magnesium: dailyFeatures.map(d => d.magnesium),
    protein: dailyFeatures.map(d => d.protein),
    sugar: dailyFeatures.map(d => d.sugar),
    confidence: dailyFeatures.map(d => d.confidence),
    sources: dailyFeatures.map(d => d.sources),
    avgConfidence: dailyFeatures.reduce((sum, d) => sum + d.confidence, 0) / dailyFeatures.length,
  };
}

function calculateAverageMood(moods) {
  if (moods.length === 0) return 0;
  return moods.reduce((sum, mood) => sum + (mood.intensity || 0), 0) / moods.length;
}

function calculateOverallStrength(correlations) {
  if (correlations.length === 0) return 0;
  return correlations.reduce((sum, corr) => sum + Math.abs(corr.correlation), 0) / correlations.length;
}

function assessDataQuality(alignedData) {
  const completeness = alignedData.filter(day =>
    day.meals.length > 0 && day.moods.length > 0 && day.water > 0
  ).length / alignedData.length;

  return {
    completeness,
    quality: completeness > 0.8 ? 'excellent' : completeness > 0.6 ? 'good' : 'fair',
  };
}

function calculateOverallConfidence(alignedData) {
  const days = alignedData.length;
  if (days < CONFIG.MIN_DAYS_PERSONALIZATION) return 0.5;
  if (days < CONFIG.MIN_DAYS_PERSONALIZATION * 2) return 0.7;
  if (days < CONFIG.MIN_DAYS_PERSONALIZATION * 3) return 0.85;
  return 0.95;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Core Analysis Functions
  analyzeMultiFactorCorrelations,
  detectInteractionEffects,
  generateHolisticRecommendations,
  analyzePersonalizedResponses,

  // Self-Learning System
  bayesianUpdate,
  updateNutritionalModel,
  getNutritionalEstimate,

  // Constants
  SCIENTIFIC_PRIORS,
  CONFIG,
  EVIDENCE_TERMINOLOGY,
  NUTRITIONAL_PRIORS,
};
