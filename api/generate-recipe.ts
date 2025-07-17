import { GoogleGenAI, Type } from "@google/genai";

// This is the Vercel Edge function handler config.
export const config = {
  runtime: 'edge',
};

// This code runs on Vercel's servers, not in the browser.
// Here, process.env.API_KEY is secure.
if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set for the serverless function.");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const recipeSchema = {
    type: Type.OBJECT,
    properties: {
        recipeName: { type: Type.STRING, description: "The name of the recipe." },
        portions: { type: Type.INTEGER, description: "The number of portions the recipe serves, as an integer." },
        ingredients: {
            type: Type.ARRAY,
            description: "An array of strings, where each string is one ingredient with its quantity (e.g., '1 cup flour', '2 large eggs').",
            items: { type: Type.STRING },
        },
        instructions: {
            type: Type.ARRAY,
            description: "An array of strings, where each string is a single step in the cooking instructions.",
            items: { type: Type.STRING },
        },
    },
    required: ["recipeName", "portions", "ingredients", "instructions"],
};

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { prompt } = await request.json();

        if (!prompt || typeof prompt !== 'string') {
            return new Response(JSON.stringify({ error: 'Prompt is required and must be a string' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate a recipe based on this idea: "${prompt}". Provide a standard recipe name, the number of portions it serves, a list of ingredients, and the step-by-step instructions.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: recipeSchema,
            },
        });

        const jsonText = response.text;
        
        // We parse and stringify to ensure it's valid and clean before sending.
        const generatedData = JSON.parse(jsonText);

        return new Response(JSON.stringify(generatedData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Error in serverless function:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new Response(JSON.stringify({ error: 'Failed to generate recipe.', details: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
