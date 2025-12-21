const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

// Initialize OpenAI (ensure OPENAI_API_KEY is in your .env file)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post('/analyze/ocr', async (req, res) => {
  try {
    const { rawText, userContext } = req.body;

    if (!rawText) {
      return res.status(400).json({ error: 'No text provided' });
    }

    const prompt = `
      Analyze the following text extracted from a food image (label, menu, or receipt).
      Extract the nutritional information, identify the food item, and list ingredients/micronutrients if available.
      
      Text:
      """
      ${rawText}
      """
      
      Return ONLY a valid JSON object with this structure (no markdown formatting):
      {
        "foodName": "string",
        "calories": number,
        "macros": {
          "protein": number, // in grams
          "fat": number, // in grams
          "carbs": number // in grams
        },
        "micros": ["string"], // e.g. ["Vitamin A 10%", "Calcium 20mg"]
        "ingredients": "string", // comma separated list
        "confidenceScore": number // 0-1 based on text clarity
      }
      If data is missing, estimate based on the food name or set to null.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const resultText = completion.choices[0].message.content;
    
    // Robust JSON extraction: finds the first '{' and last '}' to ignore AI chatter
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    const data = JSON.parse(jsonMatch ? jsonMatch[0] : resultText);

    res.json(data);

  } catch (error) {
    console.error('AI Analysis Error:', error);
    res.status(500).json({ error: 'Failed to analyze nutrition data' });
  }
});

module.exports = router;