import { z } from "zod";

export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({ error: error.errors });
  }
};

export const profileBasicsSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  age: z.coerce.number().min(1).max(120).optional(),
  weightKg: z.coerce.number().positive().optional(),
  heightCm: z.coerce.number().positive().optional(),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]).optional(),
});

export const nutritionGoalsSchema = z.object({
  primaryGoal: z.enum(["lose_weight", "maintain_weight", "gain_muscle"]).optional(),
  dailyCalories: z.coerce.number().positive().optional(),
  proteinG: z.coerce.number().nonnegative().optional(),
  carbsG: z.coerce.number().nonnegative().optional(),
  fatsG: z.coerce.number().nonnegative().optional(),
  waterLiters: z.coerce.number().nonnegative().optional(),
});

export const imageAnalysisSchema = z.object({
  image: z.string({ required_error: "Image base64 data is required" }),
});
