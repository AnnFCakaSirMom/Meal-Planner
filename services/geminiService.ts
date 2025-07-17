import type { Recipe } from '../types';

interface GeneratedRecipeData {
    recipeName: string;
    portions: number;
    ingredients: string[];
    instructions: string[];
}

export const generateRecipe = async (prompt: string): Promise<Partial<Recipe>> => {
    try {
        // Call our own secure backend function instead of Gemini directly
        const response = await fetch('/api/generate-recipe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }),
        });

        const responseData = await response.json();

        if (!response.ok) {
            // Use the error message from our backend function
            throw new Error(responseData.error || 'Något gick fel på servern.');
        }

        const generatedData = responseData as GeneratedRecipeData;

        // Map the response to the format the app expects
        return {
            name: generatedData.recipeName,
            originalPortions: generatedData.portions,
            ingredients: generatedData.ingredients.join('\n'),
            instructions: generatedData.instructions.join('\n'),
        };

    } catch (error) {
        console.error("Error calling internal API route:", error);
        // Rethrow the error so the UI can catch it and display it
        throw new Error(`Misslyckades med att generera recept: ${(error as Error).message}`);
    }
};
