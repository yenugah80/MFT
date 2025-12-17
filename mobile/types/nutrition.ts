// ============================================================================
// Frontend / AI Nutrition (Ephemeral)
// ============================================================================

export interface NutritionData {
  id?: string;
  timestamp?: number;

  foodName: string;
  calories: number;

  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sugarAlcohols?: number;

  waterContent?: number;
  electrolytes?: string[];

  micros: {
    name: string;
    amount: number;
    unit: string;
    percentageOfDailyNeeds?: number;
  }[];

  ingredients: {
    name: string;
    description?: string;
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
    icon?: string;
  }[];

  healthScore: number;
  summary: string;
}

// Default empty nutrition data
export const emptyNutrition: NutritionData = {
  foodName: '',
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  micros: [],
  ingredients: [],
  healthScore: 0,
  summary: '',
};
