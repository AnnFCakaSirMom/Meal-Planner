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
        recipeName: { type: Type.STRING, description: "Receptets namn på svenska." },
        portions: { type: Type.INTEGER, description: "Antal portioner receptet är för, som ett heltal." },
        ingredients: {
            type: Type.ARRAY,
            description: "En lista med strängar, där varje sträng är en ingrediens med dess mängd (t.ex. '2 dl mjöl', '3 stora ägg').",
            items: { type: Type.STRING },
        },
        instructions: {
            type: Type.ARRAY,
            description: "En lista med strängar, där varje sträng är ett enskilt steg i tillagningsinstruktionerna.",
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
            contents: `Generera ett recept på svenska baserat på denna idé: "${prompt}". Ange ett standardreceptnamn, antal portioner, en lista med ingredienser och steg-för-steg-instruktioner.`,
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