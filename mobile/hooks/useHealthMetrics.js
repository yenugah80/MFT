import { useMemo } from "react";
import { HealthMetrics } from "../utils/healthMetrics";
import { parseNumber, parseInteger } from "../utils/numberParsing";

/**
 * Custom hook for health metrics calculation
 * Memoizes BMI, BMR, and TDEE calculations
 */
export default function useHealthMetrics(basics, activityLevels = []) {
  // Parse numbers
  const parsedNumbers = useMemo(() => {
    const weight = parseNumber(basics.weightKg);
    const height = parseNumber(basics.heightCm);
    const age = parseInteger(basics.age);
    return { weight, height, age };
  }, [basics.weightKg, basics.heightCm, basics.age]);

  // Calculate BMI
  const bmi = useMemo(
    () => HealthMetrics.calculateBMI(parsedNumbers.weight, parsedNumbers.height),
    [parsedNumbers.weight, parsedNumbers.height]
  );

  // Get BMI category
  const bmiCategory = useMemo(
    () => HealthMetrics.getBMICategory(bmi),
    [bmi]
  );

  // Calculate BMR
  const bmr = useMemo(
    () =>
      HealthMetrics.calculateBMR(
        basics.gender,
        parsedNumbers.weight,
        parsedNumbers.height,
        parsedNumbers.age
      ),
    [basics.gender, parsedNumbers.weight, parsedNumbers.height, parsedNumbers.age]
  );

  // Calculate TDEE
  const tdee = useMemo(
    () => HealthMetrics.calculateTDEE(bmr, basics.activityLevel, activityLevels),
    [bmr, basics.activityLevel, activityLevels]
  );

  // Get ideal weight range
  const idealWeightRange = useMemo(
    () => HealthMetrics.getIdealWeightRange(parsedNumbers.height),
    [parsedNumbers.height]
  );

  return {
    bmi,
    bmiCategory,
    bmr,
    tdee,
    idealWeightRange,
  };
}
