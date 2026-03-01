import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Recipe, User } from '../types';
import { Button, Modal } from './UI';
import { EditIcon, DeleteIcon, KeyIcon, TransferIcon, CopyIcon, SparklesIcon, RandomIcon } from './Icons';
import { generateRecipe } from '../services/geminiService';

export interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    text: string;
    confirmText?: string;
    isDanger?: boolean;
}
export const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, text, confirmText = "Ja, fortsätt", isDanger = true }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <h3 className="text-2xl font-bold mb-4 text-slate-800">{title}</h3>
            <p className="text-slate-600 mb-6">{text}</p>
            <div className="flex justify-end space-x-4">
                <Button variant="secondary" onClick={onClose}>Avbryt</Button>
                <Button variant={isDanger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmText}</Button>
            </div>
        </Modal>
    );
};

export interface UserModalProps {
    isOpen: boolean;
    users: Record<string, User>;
    adminUser: string | null;
    onLogin: (user: string, pass: string) => void;
    onCreateUser: (user: string, pass: string) => void;
    onSetInitialPassword: (user: string, pass: string) => void;
    onDeleteUser: (user: string) => Promise<boolean>;
    onRenameUser: (user: string) => void;
    onTransferRecipes: (user: string) => void;
    onResetPassword: (user: string) => void;
    wasAdminOnLogout: boolean;
    showToast: (message: string, type?: 'success' | 'error') => void;
}
export const UserModal: React.FC<UserModalProps> = ({ isOpen, users, adminUser, onLogin, onCreateUser, onSetInitialPassword, onDeleteUser, onRenameUser, onTransferRecipes, onResetPassword, wasAdminOnLogout, showToast }) => {
    const [selectedUser, setSelectedUser] = useState('');
    const [password, setPassword] = useState('');
    const [newUser, setNewUser] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const userList = Object.keys(users).sort((a, b) => a.localeCompare(b));
    const needsInitialPassword = selectedUser && users[selectedUser]?.passwordHash === '';

    useEffect(() => {
        if (isOpen) {
            setSelectedUser('');
            setPassword('');
            setNewUser('');
            setNewPassword('');
            setConfirmPassword('');
        }
    }, [isOpen]);

    const handleCreate = () => {
        if (!newUser.trim()) { showToast('Användarnamn får inte vara tomt.', 'error'); return; }
        if (users[newUser.trim()]) { showToast('Användarnamnet finns redan.', 'error'); return; }
        if (newPassword.length < 4) { showToast('Lösenordet måste vara minst 4 tecken.', 'error'); return; }
        if (newPassword !== confirmPassword) { showToast('Lösenorden matchar inte.', 'error'); return; }
        onCreateUser(newUser.trim(), newPassword);
    };

    const handleLogin = () => {
        if (!selectedUser) return;
        onLogin(selectedUser, password);
        setPassword('');
    }

    const handleSetPassword = () => {
        if (!selectedUser) return;
        if (newPassword.length < 4) { showToast('Lösenordet måste vara minst 4 tecken.', 'error'); return; }
        if (newPassword !== confirmPassword) { showToast('Lösenorden matchar inte.', 'error'); return; }
        onSetInitialPassword(selectedUser, newPassword);
    }

    return (
        <Modal isOpen={isOpen} onClose={() => { }} canClose={false} size="sm">
            <h3 className="text-2xl font-bold mb-6 text-slate-800 text-center">Välkommen!</h3>
            <div className="space-y-4">
                <div>
                    <label htmlFor="user-select" className="block text-sm font-medium text-slate-700 mb-1">Välj en befintlig användare</label>
                    <select id="user-select" value={selectedUser} onChange={e => { setSelectedUser(e.target.value); setPassword(''); }} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500">
                        <option value="">-- Välj --</option>
                        {userList.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>

                    {selectedUser && !needsInitialPassword && (
                        <div className="mt-2">
                            <label htmlFor="password-input" className="sr-only">Lösenord</label>
                            <input id="password-input" type="password" placeholder="Lösenord..." value={password} onChange={e => setPassword(e.target.value)} onKeyUp={e => e.key === 'Enter' && handleLogin()} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" />
                            <Button onClick={handleLogin} disabled={!password} className="w-full mt-2">Logga in</Button>
                        </div>
                    )}
                    {selectedUser && needsInitialPassword && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800 mb-2">Detta är första gången du loggar in. Välj ett lösenord.</p>
                            <input type="password" placeholder="Nytt lösenord" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-3 py-2 mb-2 border border-slate-300 rounded-lg" />
                            <input type="password" placeholder="Bekräfta lösenord" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                            <Button onClick={handleSetPassword} className="w-full mt-2">Spara lösenord och fortsätt</Button>
                        </div>
                    )}
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-slate-300"></div></div>
                    <div className="relative flex justify-center"><span className="bg-white/80 px-2 text-sm text-slate-500">eller</span></div>
                </div>

                <div>
                    <label htmlFor="new-user-input" className="block text-sm font-medium text-slate-700 mb-1">Skapa en ny användare</label>
                    <input type="text" id="new-user-input" placeholder="Ditt namn..." value={newUser} onChange={e => setNewUser(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" />
                    <input type="password" placeholder="Lösenord (minst 4 tecken)" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg" />
                    <input type="password" placeholder="Bekräfta lösenord" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg" />
                    <Button onClick={handleCreate} disabled={!newUser.trim() || !newPassword} className="w-full mt-2">Skapa och fortsätt</Button>
                </div>
            </div>

            {wasAdminOnLogout && (
                <div className="mt-8 pt-6 border-t border-slate-300">
                    <h4 className="text-lg font-bold text-slate-800 mb-3 text-center">Admin - Hantera Användare</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {userList.map(user => (
                            <div key={user} className="flex justify-between items-center bg-slate-100/70 p-2 rounded-lg">
                                <span className="text-slate-800 font-medium">{user}{user === adminUser ? ' (Admin)' : ''}</span>
                                <div className="flex items-center space-x-1">
                                    <button onClick={() => onRenameUser(user)} className="text-slate-500 hover:text-sky-600 p-1 rounded-full hover:bg-sky-100/70" title={`Byt namn på ${user}`}><EditIcon /></button>
                                    {user !== adminUser && <button onClick={() => onResetPassword(user)} className="text-slate-500 hover:text-orange-600 p-1 rounded-full hover:bg-orange-100/70" title={`Återställ lösenord för ${user}`}><KeyIcon /></button>}
                                    {user !== adminUser && <button onClick={() => onTransferRecipes(user)} className="text-slate-500 hover:text-green-600 p-1 rounded-full hover:bg-green-100/70" title={`Överför recept från ${user}`}><TransferIcon /></button>}
                                    {user !== adminUser && <button onClick={() => onDeleteUser(user)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100/70" title={`Ta bort ${user}`}><DeleteIcon /></button>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Modal>
    )
};

export interface RenameUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (newName: string) => void;
    username: string;
    showToast: (message: string, type?: 'success' | 'error') => void;
}
export const RenameUserModal: React.FC<RenameUserModalProps> = ({ isOpen, onClose, onConfirm, username, showToast }) => {
    const [newName, setNewName] = useState('');

    useEffect(() => {
        if (isOpen) setNewName(username);
    }, [isOpen, username]);

    const handleConfirm = () => {
        if (!newName.trim()) { showToast('Användarnamnet får inte vara tomt.', 'error'); return; }
        onConfirm(newName.trim());
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <h3 className="text-2xl font-bold mb-6 text-slate-800">Byt namn</h3>
            <div className="mb-4">
                <label htmlFor="new-username-input" className="block text-sm font-medium text-slate-700 mb-1">Nytt namn för <span className="font-semibold">{username}</span></label>
                <input type="text" id="new-username-input" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" required />
            </div>
            <div className="flex justify-end space-x-4 mt-6">
                <Button variant="secondary" onClick={onClose}>Avbryt</Button>
                <Button type="submit" onClick={handleConfirm}>Spara</Button>
            </div>
        </Modal>
    );
};

export interface ResetPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (password: string) => void;
    username: string;
    showToast: (message: string, type?: 'success' | 'error') => void;
}
export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose, onConfirm, username, showToast }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (isOpen) { setNewPassword(''); setConfirmPassword(''); }
    }, [isOpen]);

    const handleConfirm = () => {
        if (newPassword.length < 4) { showToast('Lösenordet måste vara minst 4 tecken.', 'error'); return; }
        if (newPassword !== confirmPassword) { showToast('Lösenorden matchar inte.', 'error'); return; }
        onConfirm(newPassword);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <h3 className="text-2xl font-bold mb-4 text-slate-800">Återställ lösenord</h3>
            <p className="text-slate-600 mb-6">Ange ett nytt lösenord för användaren <span className="font-semibold">{username}</span>.</p>
            <div className="space-y-3">
                <input type="password" placeholder="Nytt lösenord" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                <input type="password" placeholder="Bekräfta lösenord" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
            </div>
            <div className="flex justify-end space-x-4 mt-8">
                <Button variant="secondary" onClick={onClose}>Avbryt</Button>
                <Button variant="primary" onClick={handleConfirm} disabled={!newPassword}>Spara nytt lösenord</Button>
            </div>
        </Modal>
    );
};

export interface TransferRecipesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (toUser: string) => void;
    fromUser: string | null;
    allUsers: string[];
}
export const TransferRecipesModal: React.FC<TransferRecipesModalProps> = ({ isOpen, onClose, onConfirm, fromUser, allUsers }) => {
    const [toUser, setToUser] = useState('');
    const availableUsers = allUsers.filter(u => u !== fromUser);

    useEffect(() => {
        if (isOpen) setToUser('');
    }, [isOpen]);

    if (!fromUser) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <h3 className="text-2xl font-bold mb-4 text-slate-800">Överför Recept</h3>
            <p className="text-slate-600 mb-6">Överför alla recept skapade av <span className="font-semibold">{fromUser}</span> till en annan användare. Denna åtgärd kan inte ångras.</p>
            <div className="mb-4">
                <label htmlFor="transfer-to-user-select" className="block text-sm font-medium text-slate-700 mb-1">Ny ägare</label>
                <select id="transfer-to-user-select" value={toUser} onChange={e => setToUser(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500">
                    <option value="">-- Välj ny ägare --</option>
                    {availableUsers.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
            </div>
            <div className="flex justify-end space-x-4 mt-8">
                <Button variant="secondary" onClick={onClose}>Avbryt</Button>
                <Button variant="primary" onClick={() => toUser && onConfirm(toUser)} disabled={!toUser}>Bekräfta Överföring</Button>
            </div>
        </Modal>
    );
};

export interface RecipeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (recipe: Omit<Recipe, 'id' | 'createdBy'>, id?: string) => void;
    recipeToEdit?: Recipe | null;
    showToast: (message: string, type?: 'success' | 'error') => void;
}
export const RecipeFormModal: React.FC<RecipeFormModalProps> = ({ isOpen, onClose, onSave, recipeToEdit, showToast }) => {
    const [name, setName] = useState('');
    const [portions, setPortions] = useState('4');
    const [ingredients, setIngredients] = useState('');
    const [instructions, setInstructions] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsGenerating(false);
            if (recipeToEdit) {
                setName(recipeToEdit.name);
                setPortions(String(recipeToEdit.originalPortions));
                setIngredients(recipeToEdit.ingredients);
                setInstructions(recipeToEdit.instructions);
            } else {
                setName(''); setPortions('4'); setIngredients(''); setInstructions('');
            }
        }
    }, [isOpen, recipeToEdit]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, originalPortions: parseInt(portions, 10) || 4, ingredients, instructions }, recipeToEdit?.id);
        onClose();
    };

    const handleGenerateRecipe = async () => {
        if (!name.trim()) { showToast('Skriv ett namn eller en idé för receptet först.', 'error'); return; }
        setIsGenerating(true);
        try {
            const generated = await generateRecipe(name);
            if (generated.name) setName(generated.name);
            if (generated.originalPortions) setPortions(String(generated.originalPortions));
            if (generated.ingredients) setIngredients(generated.ingredients);
            if (generated.instructions) setInstructions(generated.instructions);
            showToast('Recept genererat med AI!', 'success');
        } catch (error) {
            showToast((error as Error).message, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <h3 className="text-2xl font-bold mb-6 text-slate-800">{recipeToEdit ? 'Redigera Recept' : 'Nytt Recept'}</h3>
            <form onSubmit={handleSave}>
                <div className="mb-4 relative">
                    <label htmlFor="recipe-name" className="block text-sm font-medium text-slate-700 mb-1">Namn / Idé</label>
                    <input type="text" id="recipe-name" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" required />
                    <Button type="button" variant="green" onClick={handleGenerateRecipe} isLoading={isGenerating} disabled={isGenerating} className="absolute right-1 bottom-1 px-2 py-1 text-sm shadow-none">
                        {!isGenerating && <><SparklesIcon /><span>Generera med AI</span></>}
                    </Button>
                </div>
                <div className="mb-4">
                    <label htmlFor="recipe-portions" className="block text-sm font-medium text-slate-700 mb-1">Portioner (original)</label>
                    <input type="number" id="recipe-portions" value={portions} onChange={e => setPortions(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" required min="1" />
                </div>
                <div className="mb-4">
                    <label htmlFor="recipe-ingredients" className="block text-sm font-medium text-slate-700 mb-1">Ingredienser</label>
                    <textarea id="recipe-ingredients" rows={5} value={ingredients} onChange={e => setIngredients(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" placeholder="En ingrediens per rad..."></textarea>
                </div>
                <div className="mb-6">
                    <label htmlFor="recipe-instructions" className="block text-sm font-medium text-slate-700 mb-1">Instruktioner</label>
                    <textarea id="recipe-instructions" rows={7} value={instructions} onChange={e => setInstructions(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" placeholder="Skriv varje steg på en ny rad..."></textarea>
                </div>
                <div className="flex justify-end space-x-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Avbryt</Button>
                    <Button type="submit">Spara Recept</Button>
                </div>
            </form>
        </Modal>
    );
};

export interface ViewRecipeModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipe: Recipe | null;
    showToast: (message: string, type?: 'success' | 'error') => void;
}
export const ViewRecipeModal: React.FC<ViewRecipeModalProps> = ({ isOpen, onClose, recipe, showToast }) => {
    const [portions, setPortions] = useState(4);
    const [copyButtonText, setCopyButtonText] = useState('Kopiera');

    useEffect(() => {
        if (isOpen && recipe) {
            setPortions(recipe.originalPortions || 4);
            setCopyButtonText('Kopiera');
        }
    }, [isOpen, recipe]);

    // Gör så att man kan stänga panelen med Escape-knappen
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // Vi renderar panelen även om den är stängd (men gömmer den) för att få till snygga glid-animationer!
    const isVisible = isOpen && recipe !== null;

    const calculatedIngredients = (() => {
        if (!recipe?.ingredients) return [];
        const newPortions = portions;
        const originalPortions = recipe.originalPortions || 1;
        const lines = recipe.ingredients.split('\n').filter(line => line.trim() !== '');

        return lines.map(line => {
            const regex = /^(\d*[\.,]?\d+)/;
            const match = line.match(regex);
            if (match && newPortions > 0) {
                const originalQuantity = parseFloat(match[1].replace(',', '.'));
                const scaledQuantity = (originalQuantity / originalPortions) * newPortions;
                let formattedQuantity = Number(scaledQuantity.toFixed(2)).toString().replace('.', ',');
                return line.replace(regex, formattedQuantity);
            }
            return line;
        });
    })();

    const handleCopy = () => {
        if (!recipe) return;
        const ingredientsText = calculatedIngredients.map(ing => `- ${ing}`).join('\n');
        const instructionsText = (recipe.instructions || '').split('\n').filter(Boolean).map((step, i) => `${i + 1}. ${step}`).join('\n');
        const fullText = `RECEPT: ${recipe.name}\n\nPORTIONER: ${portions}\n\nINGREDIENSER:\n${ingredientsText}\n\nINSTRUKTIONER:\n${instructionsText}`;

        navigator.clipboard.writeText(fullText).then(() => {
            setCopyButtonText('Kopierat!');
            setTimeout(() => setCopyButtonText('Kopiera'), 2000);
        }).catch(() => {
            showToast('Kunde inte kopiera texten.', 'error');
        });
    }

    return (
        <>
            {/* Osynlig bakgrund som fångar klick för att stänga, utan att sudda ut */}
            <div
                className={`fixed inset-0 bg-slate-900/10 z-40 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>

            {/* Själva sidopanelen (Drawer) som glider in från höger */}
            <div className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white/95 backdrop-blur-xl shadow-2xl transform transition-transform duration-300 ease-in-out ${isVisible ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>

                {/* Huvud (Titel och Stäng-kryss) */}
                <div className="p-6 border-b border-slate-200/50 flex justify-between items-start flex-shrink-0">
                    <div className="pr-4">
                        <h3 className="text-2xl font-bold text-slate-800">{recipe?.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">Skapad av: {recipe?.createdBy}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Innehåll (Ingredienser och Instruktioner) */}
                <div className="p-6 flex-grow overflow-y-auto">
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xl font-semibold text-slate-800">Ingredienser</h4>
                            <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
                                <label htmlFor="drawer-portions" className="text-sm font-medium text-slate-600">Portioner:</label>
                                <input type="number" id="drawer-portions" min="1" value={portions} onChange={e => setPortions(parseInt(e.target.value, 10) || 1)} className="w-12 text-center text-sm focus:outline-none focus:text-sky-600 font-semibold" />
                            </div>
                        </div>
                        <ul className="list-disc list-inside text-slate-700 space-y-2">
                            {calculatedIngredients.map((ing, i) => <li key={i}>{ing}</li>)}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-xl font-semibold mb-3 text-slate-800">Instruktioner</h4>
                        <ol className="list-decimal list-inside text-slate-700 space-y-4">
                            {(recipe?.instructions || '').split('\n').filter(Boolean).map((step, i) => <li key={i}>{step}</li>)}
                        </ol>
                    </div>
                </div>

                {/* Fot (Knappar) */}
                <div className="p-6 border-t border-slate-200/50 flex-shrink-0 flex justify-end space-x-3 bg-slate-50/50">
                    <Button variant="secondary" onClick={onClose}>Stäng</Button>
                    <Button variant="primary" onClick={handleCopy}><CopyIcon /> <span>{copyButtonText}</span></Button>
                </div>
            </div>
        </>
    );
};

export interface SelectRecipeModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipes: Record<string, Recipe>;
    onSelect: (recipeId: string) => void;
    dayName: string;
}
export const SelectRecipeModal: React.FC<SelectRecipeModalProps> = ({ isOpen, onClose, recipes, onSelect, dayName }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isRandomMode, setIsRandomMode] = useState(false);
    const [randomRecipe, setRandomRecipe] = useState<Recipe | null>(null);

    const filteredRecipes = useMemo(() =>
        Object.values(recipes)
            .filter((r: Recipe) => r.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a: Recipe, b: Recipe) => a.name.localeCompare(b.name, 'sv'))
        , [recipes, searchTerm]);

    const performRandomization = useCallback(() => {
        const recipeArray = Object.values(recipes);
        if (recipeArray.length > 0) {
            const randomIndex = Math.floor(Math.random() * recipeArray.length);
            setRandomRecipe(recipeArray[randomIndex]);
        } else {
            setRandomRecipe(null);
        }
    }, [recipes]);

    useEffect(() => {
        if (isOpen) { setSearchTerm(''); setIsRandomMode(false); }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl">
            <div className="flex flex-col max-h-[85vh]">
                <h3 className="text-2xl font-bold mb-4 flex-shrink-0 text-slate-800">Välj middag för {dayName}</h3>

                {!isRandomMode ? (
                    <div className="flex flex-col flex-grow min-h-0">
                        <div className="flex items-center space-x-4 mb-4 flex-shrink-0">
                            <input type="search" placeholder="Sök recept..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" />
                            <Button variant="green" onClick={() => { performRandomization(); setIsRandomMode(true); }} className="whitespace-nowrap"><RandomIcon /><span>Slumpa</span></Button>
                        </div>
                        <div className="flex-grow overflow-y-auto space-y-2 pr-2">
                            {filteredRecipes.length > 0 ? filteredRecipes.map(recipe => (
                                <div key={recipe.id} onClick={() => { onSelect(recipe.id); onClose(); }} className="p-3 hover:bg-sky-100/50 rounded-lg cursor-pointer transition-colors duration-200">
                                    {recipe.name}
                                </div>
                            )) : <p className="text-slate-500 text-center p-4">Inga recept hittades.</p>}
                        </div>
                    </div>
                ) : (
                    <div className="text-center flex-grow flex flex-col items-center justify-center">
                        <p className="mb-2 text-slate-600">Ditt slumpade recept är:</p>
                        <p className="text-2xl font-bold mb-6 text-slate-800">{randomRecipe?.name || "Inga recept finns!"}</p>
                        <div className="flex space-x-4">
                            <Button variant="primary" onClick={() => randomRecipe && (onSelect(randomRecipe.id), onClose())} disabled={!randomRecipe}>Välj detta</Button>
                            <Button variant="secondary" onClick={performRandomization}>Slumpa igen</Button>
                        </div>
                    </div>
                )}
                <div className="flex justify-end mt-6 flex-shrink-0">
                    <Button variant="secondary" onClick={onClose}>Stäng</Button>
                </div>
            </div>
        </Modal>
    );
};

export interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    onLoad: () => void;
    onImportRecipes: () => void;
}
export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, onLoad, onImportRecipes }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <h3 className="text-2xl font-bold mb-2 text-slate-800">Datahantering & Backup</h3>
            <p className="text-sm text-slate-500 mb-6">Använd knapparna nedan för att hantera din data.</p>
            <div className="space-y-6">
                <div>
                    <h4 className="text-md font-semibold text-slate-700 mb-2">Fullständig Backup</h4>
                    <p className="text-xs text-slate-500 mb-3">Spara eller återställ all programdata, inklusive användare, recept och matplaner. En återställning skriver över all nuvarande data.</p>
                    <div className="flex items-center space-x-4">
                        <Button variant="secondary" onClick={onLoad} className="w-full">Återställ från fil...</Button>
                        <Button variant="primary" onClick={onSave} className="w-full">Spara backup till fil...</Button>
                    </div>
                </div>
                <div>
                    <h4 className="text-md font-semibold text-slate-700 mb-2">Importera Recept</h4>
                    <p className="text-xs text-slate-500 mb-3">Lägg till recept från en backup-fil till din nuvarande receptbank. Detta påverkar inte användare eller matplaner och skriver inte över existerande recept.</p>
                    <Button variant="secondary" onClick={onImportRecipes} className="w-full">Importera recept från fil...</Button>
                </div>
            </div>
            <div className="flex justify-end mt-8">
                <Button variant="secondary" onClick={onClose}>Stäng</Button>
            </div>
        </Modal>
    );
};

export interface FridgeCleanupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (recipe: Omit<Recipe, 'id' | 'createdBy'>) => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
}
export const FridgeCleanupModal: React.FC<FridgeCleanupModalProps> = ({ isOpen, onClose, onSave, showToast }) => {
    const [ingredients, setIngredients] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Genererat recept state
    const [generatedRecipe, setGeneratedRecipe] = useState<Partial<Recipe> | null>(null);
    const [editName, setEditName] = useState('');
    const [editPortions, setEditPortions] = useState('4');
    const [editIngredients, setEditIngredients] = useState('');
    const [editInstructions, setEditInstructions] = useState('');

    useEffect(() => {
        if (isOpen) {
            setIngredients('');
            setIsGenerating(false);
            setGeneratedRecipe(null);
            setEditName('');
            setEditPortions('4');
            setEditIngredients('');
            setEditInstructions('');
        }
    }, [isOpen]);

    const handleGenerate = async () => {
        if (!ingredients.trim()) {
            showToast('Du måste ange minst en ingrediens.', 'error');
            return;
        }
        setIsGenerating(true);
        try {
            const prompt = `Skapa ett recept med följande ingredienser som bas: ${ingredients}. Du får lägga till vanliga basvaror som kryddor, olja etc.`;
            const recipe = await generateRecipe(prompt);
            setGeneratedRecipe(recipe);
            setEditName(recipe.name || '');
            setEditPortions(String(recipe.originalPortions || 4));
            setEditIngredients(recipe.ingredients || '');
            setEditInstructions(recipe.instructions || '');
            showToast('Recept genererat!', 'success');
        } catch (error) {
            showToast((error as Error).message, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            name: editName,
            originalPortions: parseInt(editPortions, 10) || 4,
            ingredients: editIngredients,
            instructions: editInstructions
        });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <div className="flex items-center space-x-2 mb-6">
                <SparklesIcon />
                <h3 className="text-2xl font-bold text-slate-800">Kylskåpsrensning</h3>
            </div>

            {!generatedRecipe ? (
                <>
                    <p className="text-slate-600 mb-6">Skriv in de ingredienser du vill bli av med (t.ex. halv lök, grädde, gammal zucchini). AI:n knåpar ihop ett recept!</p>
                    <div className="mb-6">
                        <textarea
                            rows={4}
                            value={ingredients}
                            onChange={e => setIngredients(e.target.value)}
                            placeholder="Vad har du i kylen?"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500"
                            disabled={isGenerating}
                        />
                    </div>
                    <div className="flex justify-end space-x-4">
                        <Button variant="secondary" onClick={onClose} disabled={isGenerating}>Avbryt</Button>
                        <Button variant="primary" onClick={handleGenerate} isLoading={isGenerating} disabled={isGenerating || !ingredients.trim()}>
                            Generera Recept
                        </Button>
                    </div>
                </>
            ) : (
                <form onSubmit={handleSave}>
                    <p className="text-slate-600 mb-4 font-medium">Här är ett förslag! Finjustera det gärna innan du sparar.</p>
                    <div className="space-y-4 mb-6 max-h-[50vh] overflow-y-auto pr-2">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Namn</label>
                            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Portioner</label>
                            <input type="number" value={editPortions} onChange={e => setEditPortions(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" required min="1" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ingredienser</label>
                            <textarea rows={5} value={editIngredients} onChange={e => setEditIngredients(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Instruktioner</label>
                            <textarea rows={7} value={editInstructions} onChange={e => setEditInstructions(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" required />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-4">
                        <Button type="button" variant="secondary" onClick={() => setGeneratedRecipe(null)}>Försök igen</Button>
                        <Button type="submit" variant="primary">Spara Recept</Button>
                    </div>
                </form>
            )}
        </Modal>
    );
};