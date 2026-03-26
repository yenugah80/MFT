// Shared TypeScript types
// Add shared types here as the project grows

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface FoodItem {
  id: string;
  name: string;
  nutrition: NutritionData;
  servingSize?: string;
  timestamp: string;
}

export interface MoodEntry {
  id: string;
  mood: 'great' | 'good' | 'okay' | 'bad' | 'terrible';
  energy: number;
  timestamp: string;
  notes?: string;
}

export interface WaterEntry {
  id: string;
  amount: number; // in ml
  timestamp: string;
}
