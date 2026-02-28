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
    
    const userList = Object.keys(users).sort((a,b) => a.localeCompare(b));
    const needsInitialPassword = selectedUser && users[selectedUser]?.passwordHash === '';

    useEffect(() => {
        if(isOpen) {
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
        if(!selectedUser) return;
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
        <Modal isOpen={isOpen} onClose={() => {}} canClose={false} size="sm">
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
    
    if (!isOpen || !recipe) return null;

    const calculatedIngredients = (() => {
        if (!recipe.ingredients) return [];
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
        const ingredientsText = calculatedIngredients.map(ing => `- ${ing}`).join('\n');
        const instructionsText = (recipe.instructions || '').split('\n').filter(Boolean).map((step, i) => `${i+1}. ${step}`).join('\n');
        const fullText = `RECEPT: ${recipe.name}\n\nPORTIONER: ${portions}\n\nINGREDIENSER:\n${ingredientsText}\n\nINSTRUKTIONER:\n${instructionsText}`;
        
        navigator.clipboard.writeText(fullText).then(() => {
            setCopyButtonText('Kopierat!');
            setTimeout(() => setCopyButtonText('Kopiera'), 2000);
        }).catch(err => {
            showToast('Kunde inte kopiera texten.', 'error');
        });
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl">
            <div className="max-h-[85vh] flex flex-col">
                <div className="flex-shrink-0">
                    <div className="flex justify-between items-start">
                         <h3 className="text-3xl font-bold mb-2 text-slate-800">{recipe.name}</h3>
                         <p className="text-sm text-slate-500 mt-2">Skapad av: {recipe.createdBy}</p>
                    </div>
                    <div className="border-b border-slate-300/60 mb-6 pb-4"></div>
                </div>
                <div className="flex-grow overflow-y-auto pr-4">
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="w-full md:w-1/3">
                            <h4 className="text-xl font-semibold mb-2 text-slate-800">Ingredienser</h4>
                            <div className="flex items-center space-x-2 mb-3">
                                <label htmlFor="view-portions-input" className="text-sm font-medium text-slate-600">Portioner:</label>
                                <input type="number" id="view-portions-input" min="1" value={portions} onChange={e => setPortions(parseInt(e.target.value, 10) || 1)} className="w-16 p-1 border rounded-md text-center border-slate-300 focus:ring-sky-500 focus:border-sky-500" />
                            </div>
                            <ul className="list-disc list-inside text-slate-700 space-y-1">
                                {calculatedIngredients.map((ing, i) => <li key={i}>{ing}</li>)}
                            </ul>
                        </div>
                        <div className="w-full md:w-2/3">
                            <h4 className="text-xl font-semibold mb-3 text-slate-800">Instruktioner</h4>
                            <ol className="list-decimal list-inside text-slate-700 space-y-4">
                                {(recipe.instructions || '').split('\n').filter(Boolean).map((step, i) => <li key={i}>{step}</li>)}
                            </ol>
                        </div>
                    </div>
                </div>
                 <div className="flex justify-end mt-8 space-x-4 flex-shrink-0">
                    <Button variant="primary" onClick={handleCopy}><CopyIcon /> <span>{copyButtonText}</span></Button>
                    <Button variant="secondary" onClick={onClose}>Stäng</Button>
                </div>
            </div>
        </Modal>
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
            .sort((a: Recipe,b: Recipe) => a.name.localeCompare(b.name, 'sv'))
    , [recipes, searchTerm]);
    
    const performRandomization = useCallback(() => {
        const recipeArray = Object.values(recipes);
        if(recipeArray.length > 0) {
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