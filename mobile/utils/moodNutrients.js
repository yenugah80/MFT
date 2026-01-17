/**
 * Mood-Nutrient Correlations
 *
 * Research-backed connections between nutrients and mood/cognitive function.
 *
 * Sources:
 * - Harvard Health: Nutritional Psychiatry
 * - PMC: Food and Mood research
 * - Mass General Brigham: How Food Affects Mood
 */

// ============================================================================
// MOOD-AFFECTING NUTRIENTS
// ============================================================================

export const MOOD_NUTRIENTS = {
  omega3: {
    id: 'omega3',
    name: 'Omega-3',
    fullName: 'Omega-3 Fatty Acids',
    icon: 'fish',
    color: '#3B82F6',
    dailyTarget: 1.6, // grams (ALA) - varies by type
    unit: 'g',
    moodEffect: 'positive',
    benefits: [
      'Supports brain cell membrane health',
      'Reduces inflammation linked to depression',
      'Improves memory and cognitive function',
    ],
    deficiencySymptoms: [
      'Low mood',
      'Poor concentration',
      'Fatigue',
    ],
    topFoods: ['salmon', 'mackerel', 'sardines', 'walnuts', 'flaxseed', 'chia seeds'],
    researchNote: 'Higher omega-3 intake associated with 17% lower depression risk',
  },

  vitaminB6: {
    id: 'vitaminB6',
    name: 'Vitamin B6',
    fullName: 'Pyridoxine',
    icon: 'leaf',
    color: '#10B981',
    dailyTarget: 1.3, // mg
    unit: 'mg',
    moodEffect: 'positive',
    benefits: [
      'Essential for serotonin synthesis',
      'Supports dopamine production',
      'Helps regulate mood hormones',
    ],
    deficiencySymptoms: [
      'Irritability',
      'Depression',
      'Confusion',
    ],
    topFoods: ['chicken', 'turkey', 'fish', 'potatoes', 'bananas', 'chickpeas'],
    researchNote: 'Required for neurotransmitter synthesis - direct mood impact',
  },

  vitaminB12: {
    id: 'vitaminB12',
    name: 'Vitamin B12',
    fullName: 'Cobalamin',
    icon: 'flash',
    color: '#EF4444',
    dailyTarget: 2.4, // mcg
    unit: 'mcg',
    moodEffect: 'positive',
    benefits: [
      'Maintains healthy nerve cells',
      'Helps produce mood-regulating chemicals',
      'Prevents fatigue and weakness',
    ],
    deficiencySymptoms: [
      'Depression',
      'Memory problems',
      'Fatigue',
      'Mood swings',
    ],
    topFoods: ['meat', 'fish', 'eggs', 'dairy', 'fortified cereals'],
    researchNote: 'Deficiency strongly linked to depression - common in vegetarians',
  },

  folate: {
    id: 'folate',
    name: 'Folate',
    fullName: 'Vitamin B9 / Folic Acid',
    icon: 'leaf',
    color: '#84CC16',
    dailyTarget: 400, // mcg
    unit: 'mcg',
    moodEffect: 'positive',
    benefits: [
      'Essential for serotonin metabolism',
      'Supports brain function',
      'Works with B12 for mental health',
    ],
    deficiencySymptoms: [
      'Depression',
      'Cognitive decline',
      'Fatigue',
    ],
    topFoods: ['spinach', 'asparagus', 'brussels sprouts', 'avocado', 'lentils', 'beans'],
    researchNote: 'Low folate found in 15-38% of depressed adults',
  },

  magnesium: {
    id: 'magnesium',
    name: 'Magnesium',
    fullName: 'Magnesium',
    icon: 'fitness',
    color: '#8B5CF6',
    dailyTarget: 400, // mg (men), 310 (women)
    unit: 'mg',
    moodEffect: 'positive',
    benefits: [
      'Regulates stress response (HPA axis)',
      'Supports GABA function (calming)',
      'Reduces anxiety symptoms',
    ],
    deficiencySymptoms: [
      'Anxiety',
      'Irritability',
      'Insomnia',
      'Muscle tension',
    ],
    topFoods: ['dark chocolate', 'almonds', 'spinach', 'avocado', 'black beans', 'pumpkin seeds'],
    researchNote: 'Magnesium supplementation shown to improve depression in 2 weeks',
  },

  iron: {
    id: 'iron',
    name: 'Iron',
    fullName: 'Iron',
    icon: 'barbell',
    color: '#F97316',
    dailyTarget: 8, // mg (men), 18 (women)
    unit: 'mg',
    moodEffect: 'positive',
    benefits: [
      'Carries oxygen to brain',
      'Supports energy levels',
      'Essential for dopamine function',
    ],
    deficiencySymptoms: [
      'Fatigue',
      'Poor concentration',
      'Apathy',
      'Weakness',
    ],
    topFoods: ['red meat', 'spinach', 'lentils', 'tofu', 'fortified cereals', 'oysters'],
    researchNote: 'Iron deficiency is most common nutritional deficiency worldwide',
  },

  zinc: {
    id: 'zinc',
    name: 'Zinc',
    fullName: 'Zinc',
    icon: 'shield',
    color: '#06B6D4',
    dailyTarget: 11, // mg (men), 8 (women)
    unit: 'mg',
    moodEffect: 'positive',
    benefits: [
      'Supports neurotransmitter function',
      'Modulates stress response',
      'Protects brain cells',
    ],
    deficiencySymptoms: [
      'Depression',
      'Reduced appetite',
      'Impaired cognition',
    ],
    topFoods: ['oysters', 'beef', 'crab', 'pumpkin seeds', 'chickpeas', 'cashews'],
    researchNote: 'Zinc levels often low in people with depression',
  },

  vitaminD: {
    id: 'vitaminD',
    name: 'Vitamin D',
    fullName: 'Vitamin D',
    icon: 'sunny',
    color: '#FBBF24',
    dailyTarget: 600, // IU (15 mcg)
    unit: 'IU',
    moodEffect: 'positive',
    benefits: [
      'Regulates mood-related genes',
      'Supports serotonin production',
      'Reduces inflammation',
    ],
    deficiencySymptoms: [
      'Seasonal depression',
      'Low energy',
      'Mood swings',
    ],
    topFoods: ['fatty fish', 'egg yolks', 'fortified milk', 'mushrooms (UV-exposed)'],
    researchNote: 'Vitamin D deficiency linked to 14% higher depression risk',
  },

  tryptophan: {
    id: 'tryptophan',
    name: 'Tryptophan',
    fullName: 'L-Tryptophan',
    icon: 'moon',
    color: '#6366F1',
    dailyTarget: 250, // mg (varies)
    unit: 'mg',
    moodEffect: 'positive',
    benefits: [
      'Precursor to serotonin',
      'Supports melatonin production',
      'Improves sleep quality',
    ],
    deficiencySymptoms: [
      'Low mood',
      'Sleep problems',
      'Anxiety',
    ],
    topFoods: ['turkey', 'chicken', 'eggs', 'cheese', 'nuts', 'seeds', 'tofu'],
    researchNote: 'Essential amino acid - must come from diet',
  },
};

// ============================================================================
// NEGATIVE MOOD FACTORS (Foods/nutrients to limit)
// ============================================================================

export const NEGATIVE_MOOD_FACTORS = {
  addedSugar: {
    id: 'addedSugar',
    name: 'Added Sugar',
    icon: 'warning',
    color: '#EF4444',
    dailyLimit: 25, // grams (WHO recommendation)
    unit: 'g',
    moodEffect: 'negative',
    risks: [
      'Blood sugar spikes and crashes',
      'Increased inflammation',
      'Disrupted gut-brain axis',
    ],
    researchNote: 'High sugar intake linked to 23% higher depression risk',
  },

  ultraProcessed: {
    id: 'ultraProcessed',
    name: 'Ultra-Processed Foods',
    icon: 'fast-food',
    color: '#F97316',
    moodEffect: 'negative',
    risks: [
      'Low nutrient density',
      'Inflammatory additives',
      'Gut microbiome disruption',
    ],
    researchNote: 'NOVA 4 foods associated with depression and anxiety',
  },

  alcohol: {
    id: 'alcohol',
    name: 'Alcohol',
    icon: 'beer',
    color: '#7C3AED',
    moodEffect: 'negative',
    risks: [
      'Disrupts REM sleep',
      'Depletes B vitamins',
      'Depressant effect on CNS',
    ],
    researchNote: 'Even moderate alcohol affects sleep quality and mood',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all mood-positive nutrients
 * @returns {Array} Array of nutrient objects
 */
export function getMoodNutrients() {
  return Object.values(MOOD_NUTRIENTS);
}

/**
 * Get nutrient info by ID
 * @param {string} nutrientId - Nutrient ID
 * @returns {object|null} Nutrient info or null
 */
export function getNutrientInfo(nutrientId) {
  return MOOD_NUTRIENTS[nutrientId] || null;
}

/**
 * Calculate mood-nutrient score based on intake
 * @param {object} nutrientIntake - { omega3: 1.2, magnesium: 350, ... }
 * @returns {object} Score and recommendations
 */
export function calculateMoodNutrientScore(nutrientIntake) {
  const nutrients = getMoodNutrients();
  let totalScore = 0;
  let maxScore = 0;
  const deficiencies = [];
  const adequate = [];

  nutrients.forEach(nutrient => {
    const intake = nutrientIntake[nutrient.id] || 0;
    const target = nutrient.dailyTarget;
    const percentage = Math.min((intake / target) * 100, 100);

    maxScore += 100;
    totalScore += percentage;

    if (percentage < 50) {
      deficiencies.push({
        ...nutrient,
        intake,
        percentage,
        gap: target - intake,
      });
    } else if (percentage >= 80) {
      adequate.push({
        ...nutrient,
        intake,
        percentage,
      });
    }
  });

  const overallScore = Math.round((totalScore / maxScore) * 100);

  return {
    score: overallScore,
    level: overallScore >= 80 ? 'excellent' : overallScore >= 60 ? 'good' : overallScore >= 40 ? 'fair' : 'low',
    deficiencies,
    adequate,
    recommendation: deficiencies.length > 0
      ? `Consider adding more ${deficiencies.slice(0, 2).map(d => d.topFoods[0]).join(' or ')}`
      : 'Great job meeting your mood-supporting nutrient needs!',
  };
}

/**
 * Get food suggestions to improve a specific nutrient
 * @param {string} nutrientId - Nutrient ID
 * @returns {Array} Array of food suggestions
 */
export function getFoodSuggestionsForNutrient(nutrientId) {
  const nutrient = MOOD_NUTRIENTS[nutrientId];
  if (!nutrient) return [];

  return nutrient.topFoods.map(food => ({
    food,
    nutrient: nutrient.name,
    benefit: nutrient.benefits[0],
  }));
}

/**
 * Get mood insight based on nutrient intake pattern
 * @param {object} avgNutrientIntake - Average daily intake over period
 * @returns {object} Insight with title, message, recommendations
 */
export function getMoodNutrientInsight(avgNutrientIntake) {
  const result = calculateMoodNutrientScore(avgNutrientIntake);

  if (result.deficiencies.length === 0) {
    return {
      type: 'positive',
      title: 'Mood-Supporting Nutrition',
      message: 'Your nutrient intake supports healthy mood regulation.',
      icon: 'happy',
      color: '#10B981',
    };
  }

  const topDeficiency = result.deficiencies[0];
  return {
    type: 'actionable',
    title: `${topDeficiency.name} Opportunity`,
    message: `Low ${topDeficiency.name} intake may affect your mood. ${topDeficiency.researchNote}`,
    icon: 'nutrition',
    color: topDeficiency.color,
    suggestion: `Try adding ${topDeficiency.topFoods.slice(0, 3).join(', ')} to your diet.`,
  };
}

/**
 * Check if a food is mood-positive based on nutrients
 * @param {object} foodNutrients - { omega3: 0.5, magnesium: 50, ... }
 * @returns {object} Mood impact assessment
 */
export function assessFoodMoodImpact(foodNutrients) {
  const positiveNutrients = [];
  const nutrients = getMoodNutrients();

  nutrients.forEach(nutrient => {
    const amount = foodNutrients[nutrient.id] || 0;
    const percentOfDaily = (amount / nutrient.dailyTarget) * 100;

    if (percentOfDaily >= 10) {
      positiveNutrients.push({
        name: nutrient.name,
        amount,
        unit: nutrient.unit,
        percentOfDaily: Math.round(percentOfDaily),
        benefit: nutrient.benefits[0],
      });
    }
  });

  if (positiveNutrients.length === 0) {
    return {
      impact: 'neutral',
      message: null,
      nutrients: [],
    };
  }

  return {
    impact: 'positive',
    message: `Good source of ${positiveNutrients.map(n => n.name).join(', ')}`,
    nutrients: positiveNutrients,
  };
}

export default {
  MOOD_NUTRIENTS,
  NEGATIVE_MOOD_FACTORS,
  getMoodNutrients,
  getNutrientInfo,
  calculateMoodNutrientScore,
  getFoodSuggestionsForNutrient,
  getMoodNutrientInsight,
  assessFoodMoodImpact,
};
