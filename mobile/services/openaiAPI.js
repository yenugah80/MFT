const API_KEY = process.env.OPENAI_API_KEY || "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"; // Reads OPENAI_API_KEY from environment when available

export const OpenAIAPI = {
  generateFoodDetails: async (query) => {
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
