
export interface User {
  passwordHash: string;
}

export interface Recipe {
  id: string;
  name: string;
  originalPortions: number;
  ingredients: string;
  instructions: string;
  createdBy: string;
}

export interface MealPlan {
  [day: string]: {
    [meal: string]: string | null; // recipeId
  };
}

export interface UserMealPlans {
  [weekId: string]: MealPlan;
}

export interface AppData {
  users: Record<string, User>;
  recipes: Record<string, Recipe>;
  mealPlans: Record<string, UserMealPlans>;
  adminUser: string | null;
}
