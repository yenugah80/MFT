import { foodLogTable, waterLogTable, moodLogTable } from "../db/schema.js";

export async function logMeal(req, res) {
  try {
    const { userId } = req.auth;
    const {
      foodName,
      calories,
      protein,
      carbs,
      fats,
      servingSize,
      mealType,
      micros,
      nutriscore,
      ecoscore,
      novaScore,
      dietLabels,
      allergens,
      ingredients,
      barcode,
      imageUrl,
      loggedDate,
      source,
    } = req.body;
    if (!foodName) {
      return res.status(400).json({ error: "foodName is required" });
    }
    const result = await req.db
      .insert(foodLogTable)
      .values({
        userId,
        foodName,
        calories: calories ?? null,
        protein: protein ?? null,
        carbs: carbs ?? null,
        fats: fats ?? null,
        servingSize: servingSize ?? null,
        mealType: mealType ?? null,
        micros: micros ?? {},
        nutriscore: nutriscore ?? null,
        ecoscore: ecoscore ?? null,
        novaScore: novaScore ?? null,
        dietLabels: dietLabels ?? [],
        allergens: allergens ?? [],
        ingredients: ingredients ?? [],
        barcode: barcode ?? null,
        imageUrl: imageUrl ?? null,
        loggedDate: loggedDate ? new Date(loggedDate) : new Date(),
        source,
      })
      .returning();

    if (!result || result.length === 0) {
      return res.status(500).json({ error: "Failed to insert meal log" });
    }
    res.status(201).json(result[0]);
  } catch (err) {
    console.error("Error logging meal", err);
    res.status(500).json({ error: "Something went wrong" });
  }
}

export async function logWater(req, res) {
  try {
    const { userId } = req.auth;
    const { amountLiters } = req.body;
    const parsed = parseFloat(amountLiters);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return res.status(400).json({ error: "amountLiters must be a positive number" });
    }
    const result = await req.db
      .insert(waterLogTable)
      .values({
        userId,
        amountLiters: parsed,
      })
      .returning();

    if (!result || result.length === 0) {
      return res.status(500).json({ error: "Failed to insert water log" });
    }
    res.status(201).json(result[0]);
  } catch (err) {
    console.error("Error logging water", err);
    res.status(500).json({ error: "Something went wrong" });
  }
}

export async function logMood(req, res) {
  try {
    const { userId } = req.auth;
    const { mood, note, source } = req.body;
    if (!mood) {
      return res.status(400).json({ error: "mood is required" });
    }
    const result = await req.db
      .insert(moodLogTable)
      .values({
        userId,
        mood,
        note,
        source,
      })
      .returning();

    if (!result || result.length === 0) {
      return res.status(500).json({ error: "Failed to insert mood log" });
    }
    res.status(201).json(result[0]);
  } catch (err) {
    console.error("Error logging mood", err);
    res.status(500).json({ error: "Something went wrong" });
  }
}
