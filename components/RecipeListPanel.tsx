import React, { useState, useMemo } from 'react';
import type { Recipe } from '../types';
import { Button } from './UI';
import { PlusIcon, EditIcon, DeleteIcon, SparklesIcon } from './Icons';

export interface RecipeListPanelProps {
    recipes: Record<string, Recipe>;
    currentUser: string;
    adminUser: string | null;
    onAdd: () => void;
    onEdit: (recipe: Recipe) => void;
    onDelete: (recipe: Recipe) => void;
    onFridgeCleanup: () => void;
}

export const RecipeListPanel: React.FC<RecipeListPanelProps> = ({ recipes, currentUser, adminUser, onAdd, onEdit, onDelete, onFridgeCleanup }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredRecipes = useMemo(() => {
        const searchIngredients = searchTerm.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
        return Object.values(recipes)
            .filter((recipe: Recipe) => {
                if (searchIngredients.length === 0) return true;
                const recipeIngredients = (recipe.ingredients || '').toLowerCase();
                return searchIngredients.every(si => recipeIngredients.includes(si));
            })
            .sort((a: Recipe, b: Recipe) => a.name.localeCompare(b.name, 'sv'));
    }, [recipes, searchTerm]);

    return (
        <div className="panel p-6 lg:col-span-1">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 truncate mr-2">Receptbank</h2>
                <div className="flex items-center space-x-2 flex-shrink-0">
                    <Button
                        variant="green"
                        onClick={onFridgeCleanup}
                        className="px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm whitespace-nowrap flex items-center shadow-sm"
                        title="Kylskåpsrensning - Skapa recept från rester"
                    >
                        <SparklesIcon />
                        <span className="hidden sm:inline ml-1">Kylskåpsrensning</span>
                    </Button>
                    <Button
                        onClick={onAdd}
                        className="p-1.5 md:p-2 rounded-full shadow-sm flex items-center justify-center"
                        title="Lägg till nytt recept"
                    >
                        <PlusIcon />
                    </Button>
                </div>
            </div>
            <div className="mb-4">
                <label htmlFor="ingredient-search-input" className="sr-only">Sök på ingredienser</label>
                <input type="search" id="ingredient-search-input" placeholder="Sök ingrediens (t.ex. kyckling)..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 bg-white/80" />
            </div>
            <div className="space-y-3 h-[55vh] overflow-y-auto pr-2">
                {filteredRecipes.length > 0 ? filteredRecipes.map((recipe: Recipe) => {
                    const canEdit = recipe.createdBy === currentUser || currentUser === adminUser;
                    return (
                        <div
                            key={recipe.id}
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData('text/plain', recipe.id)}
                            className="bg-white/60 p-4 rounded-lg shadow-sm flex justify-between items-center border border-slate-200/50 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-sky-300 transition-all"
                        >
                            <div className="pointer-events-none">
                                <p className="font-semibold text-slate-800">{recipe.name}</p>
                                <p className="text-xs text-slate-400">Skapad av: {recipe.createdBy || 'Okänd'}</p>
                            </div>
                            <div className="flex space-x-2">
                                <button onClick={() => onEdit(recipe)} disabled={!canEdit} title={!canEdit ? 'Du kan bara redigera dina egna recept' : 'Redigera recept'} className={`p-1 ${canEdit ? 'text-slate-500 hover:text-sky-600' : 'text-slate-400 cursor-not-allowed'}`}><EditIcon /></button>
                                <button onClick={() => onDelete(recipe)} disabled={!canEdit} title={!canEdit ? 'Du kan bara ta bort dina egna recept' : 'Ta bort recept'} className={`p-1 ${canEdit ? 'text-slate-500 hover:text-red-600' : 'text-slate-400 cursor-not-allowed'}`}><DeleteIcon /></button>
                            </div>
                        </div>
                    );
                }) : <p className="text-slate-500 text-center mt-8">{searchTerm ? 'Inga recept matchade din sökning.' : 'Inga recept hittades i receptbanken.'}</p>}
            </div>
        </div>
    );
};