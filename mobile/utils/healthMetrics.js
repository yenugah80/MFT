/**
 * Health Metrics Calculations
 * Pure functions for BMI, BMR, TDEE calculations with proper validation
 */

export class HealthMetrics {
  /**
   * Calculate Body Mass Index (BMI)
   * @param {number} weightKg - Weight in kilograms
   * @param {number} heightCm - Height in centimeters
   * @returns {number|null} BMI value rounded to 1 decimal, or null if invalid
   */
  static calculateBMI(weightKg, heightCm) {
    if (weightKg == null || heightCm == null || heightCm <= 0) return null;
    const heightM = heightCm / 100;
    return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  }

  /**
   * Get BMI category and color for display
   * @param {number} bmi - BMI value
   * @returns {Object|null} Category label and color
   */
  static getBMICategory(bmi) {
    if (!bmi) return null;
    if (bmi < 18.5) return { label: 'Underweight', color: '#3B82F6' };
    if (bmi < 25) return { label: 'Normal', color: '#10B981' };
    if (bmi < 30) return { label: 'Overweight', color: '#F59E0B' };
    return { label: 'Obese', color: '#EF4444' };
  }

  /**
   * Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation
   * @param {string} gender - 'male', 'female', or 'other'
   * @param {number} weightKg - Weight in kilograms
   * @param {number} heightCm - Height in centimeters
   * @param {number} age - Age in years
   * @returns {number|null} BMR in kcal/day, or null if invalid
   */
  static calculateBMR(gender, weightKg, heightCm, age) {
    if (weightKg == null || heightCm == null || age == null) return null;
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    const offset = { male: 5, female: -161, other: -78 }[gender] ?? -78;
    return Math.round(base + offset);
  }

  /**
   * Calculate Total Daily Energy Expenditure (TDEE)
   * @param {number} bmr - Basal Metabolic Rate
   * @param {string} activityLevel - Activity level key
   * @returns {number|null} TDEE in kcal/day, or null if invalid
   */
  static calculateTDEE(bmr, activityLevel, activityLevels = []) {
    if (!bmr) return null;

    const fallback = 1.2;
    const matched = activityLevels.find((level) => level.key === activityLevel);
    const rawFactor = matched?.factor;
    const factor = typeof rawFactor === "number" ? rawFactor : Number(rawFactor);

    if (!factor || Number.isNaN(factor)) return Math.round(bmr * fallback);

    const clamped = Math.max(1, Math.min(2.5, factor));
    return Math.round(bmr * clamped);
  }

  /**
   * Calculate ideal weight range based on height (using BMI 18.5-24.9)
   * @param {number} heightCm - Height in centimeters
   * @returns {Object|null} Min and max ideal weight
   */
  static getIdealWeightRange(heightCm) {
    if (!heightCm || heightCm <= 0) return null;
    const heightM = heightCm / 100;
    return {
      min: Math.round(18.5 * heightM * heightM),
      max: Math.round(24.9 * heightM * heightM),
    };
  }
}
