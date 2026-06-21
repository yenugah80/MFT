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

// ~7MB base64 cap (raw image ≈ 5MB → base64 ≈ 6.7MB + small overhead)
const MAX_IMAGE_B64_CHARS = 7 * 1024 * 1024;

export const imageAnalysisSchema = z.object({
  image: z
    .string({ required_error: "Image base64 data is required" })
    .max(MAX_IMAGE_B64_CHARS, "Image too large. Maximum size is 5 MB.")
    .refine(
      (v) => /^data:image\/(jpeg|jpg|png|webp|gif);base64,/.test(v),
      "Invalid image format. Supported: jpeg, png, webp, gif."
    ),
  highAccuracy: z.boolean().optional().default(false),
  includeIngredients: z.boolean().optional().default(false),
});
