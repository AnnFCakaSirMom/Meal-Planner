import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppData, Recipe } from './types';
import { hashPassword, getWeekId, getWeekStartDate } from './utils/helpers';
import { LogoutIcon, SettingsIcon, PrevIcon, NextIcon } from './components/Icons';
import { Toast, LoadingScreen } from './components/UI';
import { ConfirmModal, UserModal, RenameUserModal, ResetPasswordModal, TransferRecipesModal, RecipeFormModal, ViewRecipeModal, SelectRecipeModal, SettingsModal, FridgeCleanupModal } from './components/Modals';
import { RecipeListPanel } from './components/RecipeListPanel';

const initialAppData: AppData = { users: {}, recipes: {}, mealPlans: {}, adminUser: null };

export default function App() {
    const [isLoading, setIsLoading] = useState(true);
    const [appData, setAppData] = useState<AppData>(initialAppData);
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [wasAdminOnLogout, setWasAdminOnLogout] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const isInitialized = useRef(false);

    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error', key: number } | null>(null);
    const [showToast, setShowToast] = useState(false);

    const [modals, setModals] = useState({
        user: true, recipeForm: false, viewRecipe: false, selectRecipe: false,
        settings: false, confirm: false, renameUser: false, transferRecipes: false, resetPassword: false, fridgeCleanup: false
    });

    const [recipeToEdit, setRecipeToEdit] = useState<Recipe | null>(null);
    const [recipeToView, setRecipeToView] = useState<Recipe | null>(null);
    const [targetSlot, setTargetSlot] = useState<{ day: string, dayName: string } | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ action: () => void, title: string, text: string, confirmText?: string, isDanger?: boolean } | null>(null);
    const [userToRename, setUserToRename] = useState<string | null>(null);
    const [userToTransferFrom, setUserToTransferFrom] = useState<string | null>(null);
    const [userToResetPassword, setUserToResetPassword] = useState<string | null>(null);

    // activeDayTab kan nu också vara 'översikt'
    const [activeDayTab, setActiveDayTab] = useState('måndag');

    // Växlar mellan huvudvyer på mobil (plan eller recipes)
    const [activeMobileTab, setActiveMobileTab] = useState<'plan' | 'recipes'>('plan');

    useEffect(() => {
        const loadDataFromServer = async () => {
            try {
                const response = await fetch('/api/get-app-data');
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                if (data && typeof data === 'object' && !Array.isArray(data)) {
                    setAppData({ ...initialAppData, ...data } as AppData);
                } else {
                    setAppData(initialAppData);
                }
            } catch (error) {
                displayToast('Kunde inte ladda data från servern.', 'error');
                setAppData(initialAppData);
            } finally {
                setIsLoading(false);
                isInitialized.current = true;
            }
        };
        loadDataFromServer();
    }, []);

    const syncToDB = useCallback(async (collectionName: string, docId: string, data: any, isDelete = false) => {
        try {
            await fetch('/api/update-doc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ collectionName, docId, data, isDelete }),
            });
        } catch (error) {
            console.error('Kunde inte synka till databasen:', error);
        }
    }, []);

    const displayToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        setToastInfo({ message, type, key: Date.now() });
    }, []);

    useEffect(() => {
        if (toastInfo) {
            setShowToast(true);
            const timer = setTimeout(() => setShowToast(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [toastInfo]);

    const handleLogin = useCallback(async (username: string, pass: string) => {
        const user = appData.users[username];
        if (!user) { displayToast('Användare hittades inte.', 'error'); return; }
        const passHash = await hashPassword(pass);
        if (passHash === user.passwordHash) {
            setCurrentUser(username);
            setModals(prev => ({ ...prev, user: false }));
        } else {
            displayToast('Fel lösenord.', 'error');
        }
    }, [appData.users, displayToast]);

    const handleCreateUser = useCallback(async (username: string, pass: string) => {
        const passHash = await hashPassword(pass);
        const userData = { passwordHash: passHash };
        setAppData(prev => {
            const newAdmin = prev.adminUser === null ? username : prev.adminUser;
            if (prev.adminUser === null) syncToDB('settings', 'main', { adminUser: username });
            return { ...prev, users: { ...prev.users, [username]: userData }, adminUser: newAdmin };
        });
        syncToDB('users', username, userData);
        setCurrentUser(username);
        setModals(prev => ({ ...prev, user: false }));
    }, [syncToDB]);

    const handleSetInitialPassword = useCallback(async (username: string, pass: string) => {
        const passHash = await hashPassword(pass);
        const userData = { passwordHash: passHash };
        setAppData(prev => ({ ...prev, users: { ...prev.users, [username]: userData } }));
        syncToDB('users', username, userData);
        displayToast('Lösenord sparat!', 'success');
        await handleLogin(username, pass);
    }, [displayToast, handleLogin, syncToDB]);

    const handleResetPassword = useCallback(async (password: string) => {
        if (!userToResetPassword) return;
        const passHash = await hashPassword(password);
        const userData = { passwordHash: passHash };
        setAppData(prev => ({ ...prev, users: { ...prev.users, [userToResetPassword]: userData } }));
        syncToDB('users', userToResetPassword, userData);
        displayToast(`Lösenordet för ${userToResetPassword} har återställts.`, 'success');
        setModals(p => ({ ...p, resetPassword: false }));
        setUserToResetPassword(null);
    }, [userToResetPassword, displayToast, syncToDB]);

    const openResetPasswordModal = useCallback((user: string) => { setUserToResetPassword(user); setModals(p => ({ ...p, resetPassword: true })); }, []);

    const handleSwitchUser = useCallback(() => {
        setWasAdminOnLogout(currentUser === appData.adminUser);
        setCurrentUser(null);
        setModals(prev => ({ ...prev, user: true }));
    }, [currentUser, appData.adminUser]);

    const handleDeleteUser = useCallback(async (userToDelete: string) => {
        return new Promise<boolean>(resolve => {
            setConfirmAction({
                action: () => {
                    setAppData(prev => {
                        const newUsers = { ...prev.users }; delete newUsers[userToDelete];
                        const newMealPlans = { ...prev.mealPlans }; delete newMealPlans[userToDelete];
                        const newRecipes = { ...prev.recipes };
                        Object.values(newRecipes).forEach((recipe: Recipe) => {
                            if (recipe.createdBy === userToDelete) {
                                newRecipes[recipe.id] = { ...recipe, createdBy: prev.adminUser || 'Borttagen användare' };
                                syncToDB('recipes', recipe.id, newRecipes[recipe.id]);
                            }
                        });
                        return { ...prev, users: newUsers, mealPlans: newMealPlans, recipes: newRecipes };
                    });
                    syncToDB('users', userToDelete, null, true);
                    syncToDB('mealPlans', userToDelete, null, true);
                    displayToast(`Användare ${userToDelete} borttagen.`, 'success');
                    resolve(true);
                },
                title: "Ta bort användare", text: `Är du säker på att du vill ta bort "${userToDelete}"? Deras matplaner raderas, men recepten blir kvar och ägs av admin.`, isDanger: true
            });
            setModals(prev => ({ ...prev, confirm: true }));
        });
    }, [displayToast, syncToDB]);

    const openRenameUserModal = useCallback((oldName: string) => { setUserToRename(oldName); setModals(prev => ({ ...prev, renameUser: true })); }, []);

    const handleRenameUser = useCallback((oldName: string, newName: string) => {
        if (!newName || newName === oldName) { setModals(prev => ({ ...prev, renameUser: false })); return; }
        if (appData.users[newName]) { displayToast(`Användarnamnet "${newName}" finns redan.`, 'error'); return; }

        const newUsers = { ...appData.users };
        newUsers[newName] = newUsers[oldName]; delete newUsers[oldName];
        syncToDB('users', newName, newUsers[newName]);
        syncToDB('users', oldName, null, true);

        const newMealPlans = { ...appData.mealPlans };
        if (newMealPlans[oldName]) {
            newMealPlans[newName] = newMealPlans[oldName]; delete newMealPlans[oldName];
            syncToDB('mealPlans', newName, newMealPlans[newName]);
            syncToDB('mealPlans', oldName, null, true);
        }

        const newRecipes = { ...appData.recipes };
        Object.values(newRecipes).forEach((recipe: Recipe) => {
            if (recipe.createdBy === oldName) {
                newRecipes[recipe.id] = { ...recipe, createdBy: newName };
                syncToDB('recipes', recipe.id, newRecipes[recipe.id]);
            }
        });

        const newAdmin = appData.adminUser === oldName ? newName : appData.adminUser;
        if (newAdmin !== appData.adminUser) syncToDB('settings', 'main', { adminUser: newAdmin });

        setAppData({ users: newUsers, mealPlans: newMealPlans, recipes: newRecipes, adminUser: newAdmin });
        if (currentUser === oldName) setCurrentUser(newName);
        displayToast(`Användare ändrad till "${newName}".`, 'success');
        setModals(prev => ({ ...prev, renameUser: false }));
    }, [appData, currentUser, displayToast, syncToDB]);

    const handleSaveRecipe = useCallback((recipeData: Omit<Recipe, 'id' | 'createdBy'>, id?: string) => {
        const recipeId = id || `recipe_${Date.now()}`;

        setAppData(prev => {
            const newRecipes = { ...prev.recipes };
            const newRecipe = { ...recipeData, id: recipeId, createdBy: id ? newRecipes[recipeId].createdBy : currentUser! };
            newRecipes[recipeId] = newRecipe;
            syncToDB('recipes', recipeId, newRecipe);
            return { ...prev, recipes: newRecipes };
        });
        displayToast('Recept sparat!', 'success');
    }, [currentUser, displayToast, syncToDB]);

    const handleAddRecipe = useCallback(() => { setRecipeToEdit(null); setModals(p => ({ ...p, recipeForm: true })); }, []);
    const handleEditRecipe = useCallback((recipe: Recipe) => { setRecipeToEdit(recipe); setModals(p => ({ ...p, recipeForm: true })); }, []);
    const handleViewRecipe = useCallback((recipe: Recipe) => { setRecipeToView(recipe); setModals(p => ({ ...p, viewRecipe: true })); }, []);
    const handleCloseViewRecipe = useCallback(() => { setModals(p => ({ ...p, viewRecipe: false })); setRecipeToView(null); }, []);

    const handleDeleteRecipe = useCallback((recipe: Recipe) => {
        setConfirmAction({
            action: () => {
                setAppData(prev => {
                    const newRecipes = { ...prev.recipes }; delete newRecipes[recipe.id];
                    const newMealPlans = JSON.parse(JSON.stringify(prev.mealPlans)) as typeof prev.mealPlans;

                    Object.keys(newMealPlans).forEach(user => {
                        let userChanged = false;
                        Object.keys(newMealPlans[user]).forEach(week => {
                            Object.keys(newMealPlans[user][week]).forEach(day => {
                                if (newMealPlans[user][week][day]?.['middag'] === recipe.id) {
                                    newMealPlans[user][week][day]['middag'] = null;
                                    userChanged = true;
                                }
                            });
                        });
                        if (userChanged) syncToDB('mealPlans', user, newMealPlans[user]);
                    });
                    return { ...prev, recipes: newRecipes, mealPlans: newMealPlans };
                });
                syncToDB('recipes', recipe.id, null, true);
                displayToast(`Recept "${recipe.name}" borttaget.`, 'success');
            },
            title: "Ta bort recept", text: `Är du säker på att du vill ta bort "${recipe.name}"? Detta kan inte ångras.`
        });
        setModals(p => ({ ...p, confirm: true }));
    }, [displayToast, syncToDB]);

    const handleUpdateMealPlan = useCallback((day: string, recipeId: string | null) => {
        if (!currentUser) return;
        const weekId = getWeekId(currentDate);
        setAppData(prev => {
            const newMealPlans = JSON.parse(JSON.stringify(prev.mealPlans)) as typeof prev.mealPlans;
            if (!newMealPlans[currentUser]) newMealPlans[currentUser] = {};
            if (!newMealPlans[currentUser][weekId]) newMealPlans[currentUser][weekId] = {};
            if (!newMealPlans[currentUser][weekId][day]) newMealPlans[currentUser][weekId][day] = {};
            newMealPlans[currentUser][weekId][day]['middag'] = recipeId;

            syncToDB('mealPlans', currentUser, newMealPlans[currentUser]);
            return { ...prev, mealPlans: newMealPlans };
        });
        if (recipeId) displayToast('Måltid tillagd i planen!', 'success');
    }, [currentUser, currentDate, displayToast, syncToDB]);

    const openTransferRecipesModal = useCallback((fromUser: string) => { setUserToTransferFrom(fromUser); setModals(prev => ({ ...prev, transferRecipes: true })); }, []);

    const handleTransferRecipes = useCallback((toUser: string) => {
        if (!userToTransferFrom) return;
        let transferredCount = 0;

        setAppData(prev => {
            const newRecipes = { ...prev.recipes };
            Object.values(newRecipes).forEach((recipe: Recipe) => {
                if (recipe.createdBy === userToTransferFrom) {
                    newRecipes[recipe.id] = { ...recipe, createdBy: toUser };
                    syncToDB('recipes', recipe.id, newRecipes[recipe.id]);
                    transferredCount++;
                }
            });
            displayToast(transferredCount > 0 ? `${transferredCount} recept har överförts från ${userToTransferFrom} till ${toUser}.` : `Inga recept att överföra från ${userToTransferFrom}.`, 'success');
            return { ...prev, recipes: newRecipes };
        });

        setModals(prev => ({ ...prev, transferRecipes: false }));
        setUserToTransferFrom(null);
    }, [userToTransferFrom, displayToast, syncToDB]);

    const handleSaveToFile = useCallback(() => { displayToast('Backup skapad (endast lokalt i demo)', 'success'); setModals(p => ({ ...p, settings: false })) }, [displayToast]);
    const handleLoadFromFile = useCallback(() => { displayToast('Filuppladdning kräver full backend-sync för tillfället', 'error') }, [displayToast]);
    const handleImportRecipesFromFile = useCallback(() => { displayToast('Funktionen importera recept behöver justeras för granular sync.', 'error') }, [displayToast]);

    const weekId = getWeekId(currentDate);
    const weekStart = getWeekStartDate(currentDate);
    const daysOfWeek = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];
    const currentMealPlan = currentUser ? appData.mealPlans[currentUser]?.[weekId] : {};

    if (isLoading) return <LoadingScreen message="Synkroniserar med molnet..." />;

    if (!currentUser) {
        return (
            <>
                {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} show={showToast} />}
                <UserModal isOpen={modals.user} users={appData.users} adminUser={appData.adminUser} onLogin={handleLogin} onCreateUser={handleCreateUser} onSetInitialPassword={handleSetInitialPassword} onDeleteUser={handleDeleteUser} onRenameUser={openRenameUserModal} onTransferRecipes={openTransferRecipesModal} onResetPassword={openResetPasswordModal} wasAdminOnLogout={wasAdminOnLogout} showToast={displayToast} />
                <RenameUserModal isOpen={modals.renameUser} onClose={() => setModals(p => ({ ...p, renameUser: false }))} onConfirm={(newName) => handleRenameUser(userToRename!, newName)} username={userToRename || ''} showToast={displayToast} />
                <ResetPasswordModal isOpen={modals.resetPassword} onClose={() => setModals(p => ({ ...p, resetPassword: false }))} onConfirm={handleResetPassword} username={userToResetPassword || ''} showToast={displayToast} />
                <TransferRecipesModal isOpen={modals.transferRecipes} onClose={() => { setModals(p => ({ ...p, transferRecipes: false })); setUserToTransferFrom(null); }} onConfirm={handleTransferRecipes} fromUser={userToTransferFrom} allUsers={Object.keys(appData.users)} />
                <ConfirmModal isOpen={modals.confirm} onClose={() => setModals(p => ({ ...p, confirm: false }))} onConfirm={() => { if (confirmAction) { confirmAction.action(); setConfirmAction(null); } setModals(p => ({ ...p, confirm: false })); }} title={confirmAction?.title || ""} text={confirmAction?.text || ""} isDanger={confirmAction?.isDanger} confirmText={confirmAction?.confirmText} />
            </>
        );
    }

    return (
        <div className="container mx-auto p-3 md:p-8 max-w-7xl pb-24 lg:pb-8">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} show={showToast} />}
            <RecipeFormModal isOpen={modals.recipeForm} onClose={() => setModals(p => ({ ...p, recipeForm: false }))} onSave={handleSaveRecipe} recipeToEdit={recipeToEdit} showToast={displayToast} />
            <FridgeCleanupModal isOpen={modals.fridgeCleanup} onClose={() => setModals(p => ({ ...p, fridgeCleanup: false }))} onSave={(data) => handleSaveRecipe(data, undefined)} showToast={displayToast} />
            <ViewRecipeModal isOpen={modals.viewRecipe} onClose={handleCloseViewRecipe} recipe={recipeToView} showToast={displayToast} />
            <SelectRecipeModal isOpen={modals.selectRecipe} onClose={() => setModals(p => ({ ...p, selectRecipe: false }))} recipes={appData.recipes} onSelect={(recipeId) => { handleUpdateMealPlan(targetSlot!.day, recipeId); setModals(p => ({ ...p, selectRecipe: false })); }} dayName={targetSlot?.dayName || ''} />
            <SettingsModal isOpen={modals.settings} onClose={() => setModals(p => ({ ...p, settings: false }))} onSave={handleSaveToFile} onLoad={handleLoadFromFile} onImportRecipes={handleImportRecipesFromFile} />
            <ConfirmModal isOpen={modals.confirm} onClose={() => setModals(p => ({ ...p, confirm: false }))} onConfirm={() => { if (confirmAction) { confirmAction.action(); setConfirmAction(null); } setModals(p => ({ ...p, confirm: false })); }} title={confirmAction?.title || ""} text={confirmAction?.text || ""} isDanger={confirmAction?.isDanger} confirmText={confirmAction?.confirmText} />

            <header className="flex flex-col md:block text-center mb-6 md:mb-10 relative">
                <h1 className="text-3xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-sky-600 to-teal-600 pb-1">Matplanerare</h1>
                <div className="flex md:absolute md:top-0 md:right-0 items-center justify-center space-x-2 mt-2 md:mt-0">
                    <div className="flex items-center space-x-1 glass-card px-3 py-1.5 rounded-full">
                        <span className="font-semibold text-slate-700 text-sm md:text-base drop-shadow-sm">{currentUser}</span>
                        <button onClick={handleSwitchUser} className="p-1.5 text-slate-500 hover:text-sky-600 transition-colors" title="Logga ut"><LogoutIcon /></button>
                    </div>
                    <button onClick={() => setModals(p => ({ ...p, settings: true }))} className="p-2 glass-card text-slate-500 hover:text-sky-600 rounded-full transition-colors flex items-center justify-center" title="Inställningar">
                        <SettingsIcon />
                    </button>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
                {/* VECKOPLAN: Visas på dator ELLER om 'plan' är vald på mobil */}
                <div className={`panel p-3 md:p-6 lg:col-span-3 ${activeMobileTab === 'plan' ? 'block' : 'hidden lg:block'}`}>
                    <div className="flex justify-between items-center mb-4 md:mb-6">
                        <h2 className="text-lg md:text-2xl font-bold text-slate-800">Veckoplan</h2>
                        <div className="flex items-center space-x-1 md:space-x-2">
                            <button onClick={() => setCurrentDate(d => new Date(d.setDate(d.getDate() - 7)))} className="p-2 rounded-full hover:bg-black/5 transition-colors text-slate-500"><PrevIcon /></button>
                            <span className="text-sm md:text-lg font-bold w-20 md:w-32 text-center text-slate-700">V {weekId.split('-W')[1]}</span>
                            <button onClick={() => setCurrentDate(d => new Date(d.setDate(d.getDate() + 7)))} className="p-2 rounded-full hover:bg-black/5 transition-colors text-slate-500"><NextIcon /></button>
                        </div>
                    </div>

                    <div className="flex md:hidden overflow-x-auto pb-3 mb-4 space-x-2 snap-x hide-scrollbar">
                        {/* NY FLIK: Översikt */}
                        <button
                            onClick={() => setActiveDayTab('översikt')}
                            className={`snap-start whitespace-nowrap px-4 py-2.5 rounded-full text-sm font-bold shadow-sm transition-all border ${activeDayTab === 'översikt' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-200'}`}
                        >
                            Översikt
                        </button>
                        {daysOfWeek.map(dayName => {
                            const dayKey = dayName.toLowerCase();
                            const isActive = activeDayTab === dayKey;
                            return (
                                <button
                                    key={`tab-${dayKey}`}
                                    onClick={() => setActiveDayTab(dayKey)}
                                    className={`snap-start whitespace-nowrap px-4 py-2.5 rounded-full text-sm font-bold shadow-sm transition-all border ${isActive ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-200'}`}
                                >
                                    {dayName}
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                        {daysOfWeek.map((dayName, i) => {
                            const dayDate = new Date(weekStart); dayDate.setDate(weekStart.getDate() + i);
                            const dayKey = dayName.toLowerCase();
                            const recipeId = currentMealPlan?.[dayKey]?.['middag'];
                            const recipe = recipeId ? appData.recipes[recipeId] : null;

                            // Om 'översikt' är vald visas alla, annars bara den valda fliken
                            const isVisibleOnMobile = activeDayTab === 'översikt' || activeDayTab === dayKey;

                            return (
                                <div key={dayKey} className={`flex-col space-y-2 ${isVisibleOnMobile ? 'flex' : 'hidden md:flex'}`}>
                                    {/* H3 visas alltid på desktop. På mobil visas den bara om vi är i "Översikt"-läget */}
                                    <h3 className={`font-bold text-slate-700 ${activeDayTab === 'översikt' ? 'block text-left pl-1 mt-2' : 'hidden md:block md:text-center'}`}>
                                        {dayName} <span className="text-sm font-normal text-slate-500">{dayDate.getDate()}/{dayDate.getMonth() + 1}</span>
                                    </h3>
                                    <div
                                        onClick={() => { if (!recipe) { setTargetSlot({ day: dayKey, dayName: dayName }); setModals(p => ({ ...p, selectRecipe: true })); } }}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            const droppedRecipeId = e.dataTransfer.getData('text/plain');
                                            if (droppedRecipeId) handleUpdateMealPlan(dayKey, droppedRecipeId);
                                        }}
                                        className={`min-h-[140px] md:min-h-[150px] p-3 xl:p-2.5 flex flex-col transition-all duration-200 ${recipe ? 'glass-card justify-between shadow-sm cursor-pointer' : 'bg-white/40 backdrop-blur-sm border-2 border-dashed border-white/60 rounded-2xl justify-center items-center cursor-pointer hover:border-sky-300 hover:bg-white/50'}`}
                                    >
                                        {recipe ? (
                                            <>
                                                <p className="font-bold text-base md:text-sm xl:text-xs flex-grow text-slate-800 pointer-events-none leading-tight overflow-hidden text-ellipsis line-clamp-3 sm:line-clamp-4">{recipe.name}</p>
                                                <div className="flex gap-2 mt-4 md:mt-1">
                                                    <button onClick={(e) => { e.stopPropagation(); handleViewRecipe(recipe); }} className="flex-1 bg-sky-50/80 hover:bg-sky-100/80 backdrop-blur-sm text-sky-700 py-2.5 md:py-1 rounded-xl text-sm font-bold border border-sky-200 shadow-sm transition-colors">Visa</button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleUpdateMealPlan(dayKey, null); }} className="flex-1 bg-red-50/80 hover:bg-red-100/80 backdrop-blur-sm text-red-600 py-2.5 md:py-1 rounded-xl text-sm font-bold border border-red-200 shadow-sm transition-colors">Radera</button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center space-y-1">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">+</div>
                                                <span className="text-slate-500 text-sm font-medium">Planera middag</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RECEPTBANK: Visas på dator ELLER om 'recipes' är vald på mobil */}
                <div className={`${activeMobileTab === 'recipes' ? 'block' : 'hidden lg:block'} lg:col-span-1`}>
                    <RecipeListPanel recipes={appData.recipes} currentUser={currentUser} adminUser={appData.adminUser} onAdd={handleAddRecipe} onEdit={handleEditRecipe} onDelete={handleDeleteRecipe} onFridgeCleanup={() => setModals(p => ({ ...p, fridgeCleanup: true }))} />
                </div>
            </main>

            {/* BOTTENMENY: Visas bara på mobil */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white/60 backdrop-blur-xl border-t border-white/50 lg:hidden z-40 px-6 py-3 flex justify-around items-center shadow-[0_-8px_32px_rgba(0,0,0,0.1)]">
                <button
                    onClick={() => setActiveMobileTab('plan')}
                    className={`flex flex-col items-center space-y-1 transition-colors ${activeMobileTab === 'plan' ? 'text-sky-600 drop-shadow-sm' : 'text-slate-500'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Veckoplan</span>
                </button>
                <button
                    onClick={() => setActiveMobileTab('recipes')}
                    className={`flex flex-col items-center space-y-1 transition-colors ${activeMobileTab === 'recipes' ? 'text-sky-600 drop-shadow-sm' : 'text-slate-500'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.584.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Receptbank</span>
                </button>
            </nav>
        </div>
    );
}