// Get OpenAI API key from environment variables
const API_KEY = process.env.OPENAI_API_KEY;

// Warn in development if API key is missing
if (!API_KEY && __DEV__) {
  console.warn('[OpenAI] No API key found. Set OPENAI_API_KEY in .env to enable AI features.');
}

// Throw error in production if API key is missing
if (!API_KEY && !__DEV__) {
  console.error('[OpenAI] OPENAI_API_KEY must be set in production environment');
}

export const OpenAIAPI = {
  generateFoodDetails: async (query) => {
    // Return null if API key is not configured
    if (!API_KEY) {
      console.warn('[OpenAI] Cannot generate food details: API key not configured');
      return null;
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `You are a nutritional assistant. Analyze the food query and return a JSON object.
              Structure:
              {
                "id": "ai_${Date.now()}",
                "title": "Food Name",
                "description": "Brief description including key ingredients",
                "calories": "number",
                "protein": "number g",
                "carbs": "number g",
                "fat": "number g",
                "nutriscore": "A/B/C/D/E",
                "ingredients": ["ingredient 1", "ingredient 2"],
                "category": "General"
              }
              Return ONLY valid JSON. If food is unrecognized, return null.`
            },
            {
              role: "user",
              content: `Analyze this food item: ${query}`
            }
          ],
          temperature: 0.7
        })
      });

      const data = await response.json();
      
      if (data.choices && data.choices[0].message.content) {
        const content = data.choices[0].message.content;
        // Attempt to parse JSON from the response
        try {
            // Remove any markdown formatting if present
            const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (e) {
            console.error("Failed to parse OpenAI response:", e);
            return null;
        }
      }
      return null;
    } catch (error) {
      console.error("Error calling OpenAI:", error);
      return null;
    }
  },

  transformOpenAIData: (data) => {
    if (!data) return null;
    return {
      ...data,
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80", // Generic food placeholder
      source: "openai",
      type: "ai_generated",
      cookTime: "N/A",
      servings: "1 serving",
      instructions: data.ingredients || []
    };
  }
};
