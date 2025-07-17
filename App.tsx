
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { AppData, Recipe, User, UserMealPlans } from './types';
import { generateRecipe } from './services/geminiService';

// --- AUTH & HELPER FUNCTIONS ---
const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const getWeekId = (d: Date): string => {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    const weekNumber = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    return `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
};

const getWeekStartDate = (d: Date): Date => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(date.setDate(diff));
};

const initialAppData: AppData = {
    users: {},
    recipes: {},
    mealPlans: {},
    adminUser: null
};

// --- SVG ICONS ---
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const PrevIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>;
const NextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 2a1 1 0 00-1 1v1.586l-1.707 1.707A1 1 0 003 8v4a1 1 0 00.293.707L5 14.414V16a1 1 0 102 0v-1.586l1.707-1.707A1 1 0 009 12V8a1 1 0 00-.293-.707L7 5.586V4a1 1 0 00-1-1H5zM15 2a1 1 0 00-1 1v1.586l-1.707 1.707A1 1 0 0013 8v4a1 1 0 00.293.707L15 14.414V16a1 1 0 102 0v-1.586l1.707-1.707A1 1 0 0019 12V8a1 1 0 00-.293-.707L17 5.586V4a1 1 0 00-1-1h-1z" clipRule="evenodd" /></svg>;
const RandomIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const TransferIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 7H8z" /><path d="M12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 13H12z" /></svg>;
const KeyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" /></svg>;
const SpinnerIcon = () => <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

// --- GENERIC COMPONENTS ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'green';
    children: React.ReactNode;
    isLoading?: boolean;
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ variant = 'primary', children, className = '', isLoading = false, ...props }, ref) => {
    const baseClasses = "px-4 py-2 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-px flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const variantClasses = {
        primary: "bg-sky-600 text-white hover:bg-sky-700 btn-primary",
        secondary: "bg-slate-200 text-slate-800 hover:bg-slate-300",
        danger: "bg-red-600 text-white hover:bg-red-700 btn-danger",
        green: "bg-teal-500 text-white hover:bg-teal-600 btn-green",
    };
    return (
        <button ref={ref} className={`${baseClasses} ${variantClasses[variant]} ${className}`} disabled={isLoading || props.disabled} {...props}>
            {isLoading && <SpinnerIcon />}
            {children}
        </button>
    );
});

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    canClose?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, canClose = true, size = 'md' }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && canClose) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose, canClose]);

    if (!isOpen) return null;
    
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
    }

    return (
        <div 
            className="fixed inset-0 modal-backdrop flex items-center justify-center p-4 z-40"
            onClick={canClose ? onClose : undefined}
        >
            <div
                className={`modal-content rounded-2xl shadow-2xl p-6 md:p-8 w-full ${sizeClasses[size]} transform animate-fade-in-up`}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
};

interface ToastProps {
    message: string;
    type: 'success' | 'error';
    show: boolean;
}
const Toast: React.FC<ToastProps> = ({ message, type, show }) => {
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    return (
        <div className={`fixed top-5 right-5 text-white px-6 py-3 rounded-lg shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${show ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'} ${bgColor}`}>
            <p>{message}</p>
        </div>
    );
};

const LoadingScreen: React.FC = () => (
    <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-sky-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p className="text-slate-600 text-lg">Laddar data...</p>
        </div>
    </div>
);

// --- APP-SPECIFIC COMPONENTS ---

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    text: string;
    confirmText?: string;
    isDanger?: boolean;
}
const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, text, confirmText = "Ja, fortsätt", isDanger = true }) => {
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

interface UserModalProps {
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
const UserModal: React.FC<UserModalProps> = ({ isOpen, users, adminUser, onLogin, onCreateUser, onSetInitialPassword, onDeleteUser, onRenameUser, onTransferRecipes, onResetPassword, wasAdminOnLogout, showToast }) => {
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
        if (!newUser.trim()) {
            showToast('Användarnamn får inte vara tomt.', 'error'); return;
        }
        if (users[newUser.trim()]) {
            showToast('Användarnamnet finns redan.', 'error'); return;
        }
        if (newPassword.length < 4) {
             showToast('Lösenordet måste vara minst 4 tecken.', 'error'); return;
        }
        if (newPassword !== confirmPassword) {
            showToast('Lösenorden matchar inte.', 'error'); return;
        }
        onCreateUser(newUser.trim(), newPassword);
    };
    
    const handleLogin = () => {
        if(!selectedUser) return;
        onLogin(selectedUser, password);
        setPassword('');
    }
    
    const handleSetPassword = () => {
        if (!selectedUser) return;
        if (newPassword.length < 4) {
             showToast('Lösenordet måste vara minst 4 tecken.', 'error'); return;
        }
        if (newPassword !== confirmPassword) {
            showToast('Lösenorden matchar inte.', 'error'); return;
        }
        onSetInitialPassword(selectedUser, newPassword);
    }
    
    return (
        <Modal isOpen={isOpen} onClose={() => {}} canClose={false} size="sm">
            <h3 className="text-2xl font-bold mb-6 text-slate-800 text-center">Välkommen!</h3>
            <div className="space-y-4">
                {/* --- LOGIN --- */}
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
                
                {/* --- CREATE USER --- */}
                <div>
                    <label htmlFor="new-user-input" className="block text-sm font-medium text-slate-700 mb-1">Skapa en ny användare</label>
                    <input type="text" id="new-user-input" placeholder="Ditt namn..." value={newUser} onChange={e => setNewUser(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" />
                    <input type="password" placeholder="Lösenord (minst 4 tecken)" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg" />
                    <input type="password" placeholder="Bekräfta lösenord" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg" />
                    <Button onClick={handleCreate} disabled={!newUser.trim() || !newPassword} className="w-full mt-2">Skapa och fortsätt</Button>
                </div>
            </div>

            {/* --- ADMIN PANEL --- */}
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

interface RenameUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (newName: string) => void;
    username: string;
    showToast: (message: string, type?: 'success' | 'error') => void;
}
const RenameUserModal: React.FC<RenameUserModalProps> = ({ isOpen, onClose, onConfirm, username, showToast }) => {
    const [newName, setNewName] = useState('');

    useEffect(() => {
        if (isOpen) {
            setNewName(username);
        }
    }, [isOpen, username]);

    const handleConfirm = () => {
        if (!newName.trim()) {
            showToast('Användarnamnet får inte vara tomt.', 'error');
            return;
        }
        onConfirm(newName.trim());
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <h3 className="text-2xl font-bold mb-6 text-slate-800">Byt namn</h3>
            <div className="mb-4">
                <label htmlFor="new-username-input" className="block text-sm font-medium text-slate-700 mb-1">Nytt namn för <span className="font-semibold">{username}</span></label>
                <input
                    type="text"
                    id="new-username-input"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500"
                    required
                />
            </div>
            <div className="flex justify-end space-x-4 mt-6">
                <Button variant="secondary" onClick={onClose}>Avbryt</Button>
                <Button type="submit" onClick={handleConfirm}>Spara</Button>
            </div>
        </Modal>
    );
};

interface ResetPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (password: string) => void;
    username: string;
    showToast: (message: string, type?: 'success' | 'error') => void;
}
const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose, onConfirm, username, showToast }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (isOpen) {
            setNewPassword('');
            setConfirmPassword('');
        }
    }, [isOpen]);

    const handleConfirm = () => {
        if (newPassword.length < 4) {
             showToast('Lösenordet måste vara minst 4 tecken.', 'error'); return;
        }
        if (newPassword !== confirmPassword) {
            showToast('Lösenorden matchar inte.', 'error'); return;
        }
        onConfirm(newPassword);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <h3 className="text-2xl font-bold mb-4 text-slate-800">Återställ lösenord</h3>
            <p className="text-slate-600 mb-6">
                Ange ett nytt lösenord för användaren <span className="font-semibold">{username}</span>.
            </p>
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

interface TransferRecipesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (toUser: string) => void;
    fromUser: string | null;
    allUsers: string[];
}
const TransferRecipesModal: React.FC<TransferRecipesModalProps> = ({ isOpen, onClose, onConfirm, fromUser, allUsers }) => {
    const [toUser, setToUser] = useState('');
    const availableUsers = allUsers.filter(u => u !== fromUser);

    useEffect(() => {
        if (isOpen) {
            setToUser('');
        }
    }, [isOpen]);

    const handleConfirm = () => {
        if (toUser) {
            onConfirm(toUser);
        }
    };

    if (!fromUser) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <h3 className="text-2xl font-bold mb-4 text-slate-800">Överför Recept</h3>
            <p className="text-slate-600 mb-6">
                Överför alla recept skapade av <span className="font-semibold">{fromUser}</span> till en annan användare. Denna åtgärd kan inte ångras.
            </p>
            <div className="mb-4">
                <label htmlFor="transfer-to-user-select" className="block text-sm font-medium text-slate-700 mb-1">Ny ägare</label>
                <select 
                    id="transfer-to-user-select" 
                    value={toUser} 
                    onChange={e => setToUser(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500"
                >
                    <option value="">-- Välj ny ägare --</option>
                    {availableUsers.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
            </div>
            <div className="flex justify-end space-x-4 mt-8">
                <Button variant="secondary" onClick={onClose}>Avbryt</Button>
                <Button variant="primary" onClick={handleConfirm} disabled={!toUser}>
                    Bekräfta Överföring
                </Button>
            </div>
        </Modal>
    );
};

interface RecipeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (recipe: Omit<Recipe, 'id' | 'createdBy'>, id?: string) => void;
    recipeToEdit?: Recipe | null;
    showToast: (message: string, type?: 'success' | 'error') => void;
}
const RecipeFormModal: React.FC<RecipeFormModalProps> = ({ isOpen, onClose, onSave, recipeToEdit, showToast }) => {
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
                setName('');
                setPortions('4');
                setIngredients('');
                setInstructions('');
            }
        }
    }, [isOpen, recipeToEdit]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            name,
            originalPortions: parseInt(portions, 10) || 4,
            ingredients,
            instructions
        }, recipeToEdit?.id);
        onClose();
    };
    
    const handleGenerateRecipe = async () => {
        if (!name.trim()) {
            showToast('Skriv ett namn eller en idé för receptet först.', 'error');
            return;
        }
        setIsGenerating(true);
        try {
            const generated = await generateRecipe(name);
            if (generated.name) setName(generated.name);
            if (generated.originalPortions) setPortions(String(generated.originalPortions));
            if (generated.ingredients) setIngredients(generated.ingredients);
            if (generated.instructions) setInstructions(generated.instructions);
            showToast('Recept genererat med AI!', 'success');
        } catch (error) {
            console.error(error);
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

interface ViewRecipeModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipe?: Recipe | null;
    showToast: (message: string, type?: 'success' | 'error') => void;
}
const ViewRecipeModal: React.FC<ViewRecipeModalProps> = ({ isOpen, onClose, recipe, showToast }) => {
    const [portions, setPortions] = useState(recipe?.originalPortions || 4);
    const [copyButtonText, setCopyButtonText] = useState('Kopiera');

    useEffect(() => {
        if (recipe) {
            setPortions(recipe.originalPortions || 4);
        }
    }, [recipe]);
    
    if (!recipe) return null;

    const calculatedIngredients = useMemo(() => {
        if (!recipe || !recipe.ingredients) return [];
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
    }, [recipe, portions]);
    
    const handleCopy = () => {
        if (!recipe) return;

        const ingredientsText = calculatedIngredients.map(ing => `- ${ing}`).join('\n');
        const instructionsText = (recipe.instructions || '').split('\n').filter(Boolean).map((step, i) => `${i+1}. ${step}`).join('\n');
        const fullText = `RECEPT: ${recipe.name}\n\nPORTIONER: ${portions}\n\nINGREDIENSER:\n${ingredientsText}\n\nINSTRUKTIONER:\n${instructionsText}`;
        
        navigator.clipboard.writeText(fullText).then(() => {
            setCopyButtonText('Kopierat!');
            setTimeout(() => setCopyButtonText('Kopiera'), 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
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
                                <input type="number" id="view-portions-input" min="1" value={portions} onChange={e => setPortions(parseInt(e.target.value, 10))} className="w-16 p-1 border rounded-md text-center border-slate-300 focus:ring-sky-500 focus:border-sky-500" />
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

interface SelectRecipeModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipes: Record<string, Recipe>;
    onSelect: (recipeId: string) => void;
    dayName: string;
}
const SelectRecipeModal: React.FC<SelectRecipeModalProps> = ({ isOpen, onClose, recipes, onSelect, dayName }) => {
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
        if (isOpen) {
            setSearchTerm('');
            setIsRandomMode(false);
        }
    }, [isOpen]);

    const handleRandomClick = () => {
        performRandomization();
        setIsRandomMode(true);
    }
    
    const handleAcceptRandom = () => {
        if (randomRecipe) {
            onSelect(randomRecipe.id);
            onClose();
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl">
            <div className="flex flex-col max-h-[85vh]">
                <h3 className="text-2xl font-bold mb-4 flex-shrink-0 text-slate-800">Välj middag för {dayName}</h3>
                
                {!isRandomMode ? (
                    <div className="flex flex-col flex-grow min-h-0">
                        <div className="flex items-center space-x-4 mb-4 flex-shrink-0">
                            <input type="search" placeholder="Sök recept..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" />
                            <Button variant="green" onClick={handleRandomClick} className="whitespace-nowrap"><RandomIcon /><span>Slumpa</span></Button>
                        </div>
                        <div className="flex-grow overflow-y-auto space-y-2 pr-2">
                           {filteredRecipes.length > 0 ? filteredRecipes.map(recipe => (
                               <div key={recipe.id} onClick={() => onSelect(recipe.id)} className="p-3 hover:bg-sky-100/50 rounded-lg cursor-pointer transition-colors duration-200">
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
                            <Button variant="primary" onClick={handleAcceptRandom} disabled={!randomRecipe}>Välj detta</Button>
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

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    onLoad: () => void;
    onImportRecipes: () => void;
}
const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, onLoad, onImportRecipes }) => {
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


// --- MAIN APP ---
export default function App() {
    const [isLoading, setIsLoading] = useState(true);
    const [appData, setAppData] = useState<AppData>(initialAppData);
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [wasAdminOnLogout, setWasAdminOnLogout] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const isInitialized = useRef(false);
    
    // Toast state
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error', key: number } | null>(null);
    const [showToast, setShowToast] = useState(false);

    // Modal states
    const [modals, setModals] = useState({
        user: true,
        recipeForm: false,
        viewRecipe: false,
        selectRecipe: false,
        settings: false,
        confirm: false,
        renameUser: false,
        transferRecipes: false,
        resetPassword: false,
    });
    
    // State for modal data
    const [recipeToEdit, setRecipeToEdit] = useState<Recipe | null>(null);
    const [recipeToView, setRecipeToView] = useState<Recipe | null>(null);
    const [targetSlot, setTargetSlot] = useState<{ day: string, dayName: string } | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ action: () => void, title: string, text: string, confirmText?: string, isDanger?: boolean } | null>(null);
    const [userToRename, setUserToRename] = useState<string | null>(null);
    const [userToTransferFrom, setUserToTransferFrom] = useState<string | null>(null);
    const [userToResetPassword, setUserToResetPassword] = useState<string | null>(null);
    
    // --- Data Persistence & Migration ---
    useEffect(() => {
        try {
            const savedData = localStorage.getItem('matplanerareData');
            if (savedData) {
                let parsedData = JSON.parse(savedData);
                
                // Extra validation to ensure parsedData is a non-null object
                if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
                    // --- Data migration from string[] to object with password hash ---
                    if (parsedData.users && Array.isArray(parsedData.users)) {
                        console.log("Migrating old user data structure...");
                        const newUsersObject: Record<string, User> = {};
                        parsedData.users.forEach((username: string) => {
                            newUsersObject[username] = { passwordHash: '' }; // Set empty hash to force password creation
                        });
                        parsedData.users = newUsersObject;
                        displayToast('Användarsystemet har uppdaterats. Vänligen välj ett lösenord.', 'success');
                    }
                    
                    // Ensure all top-level keys exist to prevent crashes from malformed data
                    const validatedData = {
                        ...initialAppData,
                        ...parsedData,
                    };
                    
                    setAppData(validatedData as AppData);
                } else {
                    // If data is not a valid object, ignore it and start fresh.
                    setAppData(initialAppData);
                }
            }
        } catch (error) {
            console.error("Failed to load data from localStorage", error);
            setAppData(initialAppData);
        } finally {
            setIsLoading(false);
            isInitialized.current = true;
        }
    }, []);

    useEffect(() => {
        if(isInitialized.current) {
            try {
                localStorage.setItem('matplanerareData', JSON.stringify(appData));
            } catch (error) {
                console.error("Failed to save data to localStorage", error);
                displayToast('Kunde inte spara ändringar.', 'error');
            }
        }
    }, [appData]);
    
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

    // --- AUTHENTICATION HANDLERS ---
    const handleLogin = useCallback(async (username: string, pass: string) => {
        const user = appData.users[username];
        if (!user) {
            displayToast('Användare hittades inte.', 'error');
            return;
        }
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
        setAppData(prev => {
            const newUsers = { ...prev.users, [username]: { passwordHash: passHash } };
            const newAdmin = prev.adminUser === null ? username : prev.adminUser;
            return { ...prev, users: newUsers, adminUser: newAdmin };
        });
        setCurrentUser(username);
        setModals(prev => ({ ...prev, user: false }));
    }, []);

    const handleSetInitialPassword = useCallback(async (username: string, pass: string) => {
        const passHash = await hashPassword(pass);
        setAppData(prev => {
            const newUsers = { ...prev.users };
            newUsers[username] = { passwordHash: passHash };
            return { ...prev, users: newUsers };
        });
        displayToast('Lösenord sparat!', 'success');
        await handleLogin(username, pass);
    }, [displayToast, handleLogin]);
    
    const handleResetPassword = useCallback(async (password: string) => {
        if (!userToResetPassword) return;
        const passHash = await hashPassword(password);
        setAppData(prev => {
            const newUsers = { ...prev.users };
            newUsers[userToResetPassword] = { passwordHash: passHash };
            return { ...prev, users: newUsers };
        });
        displayToast(`Lösenordet för ${userToResetPassword} har återställts.`, 'success');
        setModals(p => ({ ...p, resetPassword: false }));
        setUserToResetPassword(null);
    }, [userToResetPassword, displayToast]);
    
    const openResetPasswordModal = useCallback((user: string) => {
        setUserToResetPassword(user);
        setModals(p => ({ ...p, resetPassword: true }));
    }, []);

    const handleSwitchUser = useCallback(() => {
        setWasAdminOnLogout(currentUser === appData.adminUser);
        setCurrentUser(null);
        setModals(prev => ({...prev, user: true}));
    }, [currentUser, appData.adminUser]);
    
    // --- CRUD & OTHER HANDLERS ---
    
    const handleDeleteUser = useCallback(async (userToDelete: string) => {
        return new Promise<boolean>(resolve => {
            setConfirmAction({
                action: () => {
                    setAppData(prev => {
                        const newUsers = { ...prev.users };
                        delete newUsers[userToDelete];
                        const newMealPlans = { ...prev.mealPlans };
                        delete newMealPlans[userToDelete];
                        return { ...prev, users: newUsers, mealPlans: newMealPlans };
                    });
                    displayToast(`Användare ${userToDelete} borttagen.`, 'success');
                    resolve(true);
                },
                title: "Ta bort användare",
                text: `Är du säker på att du vill ta bort "${userToDelete}"? All deras data raderas permanent.`,
                isDanger: true
            });
            setModals(prev => ({ ...prev, confirm: true }));
        });
    }, [displayToast]);
    
    const openRenameUserModal = useCallback((oldName: string) => {
        setUserToRename(oldName);
        setModals(prev => ({ ...prev, renameUser: true }));
    }, []);
    
    const handleRenameUser = useCallback((oldName: string, newName: string) => {
        if (!newName || newName === oldName) {
            setModals(prev => ({...prev, renameUser: false }));
            return;
        }
        if (appData.users[newName]) {
            displayToast(`Användarnamnet "${newName}" finns redan.`, 'error');
            return;
        }

        // Calculation
        const newUsers = { ...appData.users };
        const userData = newUsers[oldName];
        delete newUsers[oldName];
        newUsers[newName] = userData;
        
        const newMealPlans = { ...appData.mealPlans };
        if (newMealPlans[oldName]) {
            newMealPlans[newName] = newMealPlans[oldName];
            delete newMealPlans[oldName];
        }
        
        const newRecipes = { ...appData.recipes };
        Object.values(newRecipes).forEach((recipe: Recipe) => {
            if(recipe.createdBy === oldName) {
                newRecipes[recipe.id] = { ...recipe, createdBy: newName };
            }
        });
        
        const newAdmin = appData.adminUser === oldName ? newName : appData.adminUser;
        
        // State update
        setAppData({ users: newUsers, mealPlans: newMealPlans, recipes: newRecipes, adminUser: newAdmin });
        
        // Side effects
        if (currentUser === oldName) {
            setCurrentUser(newName);
        }
        displayToast(`Användare ändrad till "${newName}".`, 'success');
        setModals(prev => ({...prev, renameUser: false }));
    }, [appData, currentUser, displayToast]);


    const handleSaveRecipe = useCallback((recipeData: Omit<Recipe, 'id' | 'createdBy'>, id?: string) => {
        setAppData(prev => {
            const newRecipes = { ...prev.recipes };
            const recipeId = id || `recipe_${Date.now()}`;
            newRecipes[recipeId] = {
                ...newRecipes[recipeId],
                ...recipeData,
                id: recipeId,
                createdBy: id ? newRecipes[recipeId].createdBy : currentUser!,
            };
            return { ...prev, recipes: newRecipes };
        });
        displayToast('Recept sparat!', 'success');
    }, [currentUser, displayToast]);
    
    const handleAddRecipe = useCallback(() => {
        setRecipeToEdit(null);
        setModals(p => ({ ...p, recipeForm: true }));
    }, []);
    
    const handleEditRecipe = useCallback((recipe: Recipe) => {
        setRecipeToEdit(recipe);
        setModals(p => ({ ...p, recipeForm: true }));
    }, []);
    
    const handleDeleteRecipe = useCallback((recipe: Recipe) => {
        setConfirmAction({
            action: () => {
                setAppData(prev => {
                    const newRecipes = { ...prev.recipes };
                    delete newRecipes[recipe.id];
                    const newMealPlans = JSON.parse(JSON.stringify(prev.mealPlans)) as typeof prev.mealPlans;
                    Object.keys(newMealPlans).forEach(user => {
                        Object.keys(newMealPlans[user]).forEach(week => {
                            Object.keys(newMealPlans[user][week]).forEach(day => {
                                if (newMealPlans[user][week][day]?.['middag'] === recipe.id) {
                                    newMealPlans[user][week][day]['middag'] = null;
                                }
                            });
                        });
                    });
                    return { ...prev, recipes: newRecipes, mealPlans: newMealPlans };
                });
                displayToast(`Recept "${recipe.name}" borttaget.`, 'success');
            },
            title: "Ta bort recept",
            text: `Är du säker på att du vill ta bort "${recipe.name}"? Detta kan inte ångras.`
        });
        setModals(p => ({ ...p, confirm: true }));
    }, [displayToast]);

    const handleUpdateMealPlan = useCallback((day: string, recipeId: string | null) => {
        if (!currentUser) return;
        const weekId = getWeekId(currentDate);
        setAppData(prev => {
            const newMealPlans = JSON.parse(JSON.stringify(prev.mealPlans)) as typeof prev.mealPlans;
            if (!newMealPlans[currentUser]) newMealPlans[currentUser] = {};
            if (!newMealPlans[currentUser][weekId]) newMealPlans[currentUser][weekId] = {};
            if (!newMealPlans[currentUser][weekId][day]) newMealPlans[currentUser][weekId][day] = {};
            newMealPlans[currentUser][weekId][day]['middag'] = recipeId;
            return { ...prev, mealPlans: newMealPlans };
        });
        if (recipeId) {
             displayToast('Måltid tillagd i planen!', 'success');
        }
    }, [currentUser, currentDate, displayToast]);

    const openTransferRecipesModal = useCallback((fromUser: string) => {
        setUserToTransferFrom(fromUser);
        setModals(prev => ({ ...prev, transferRecipes: true }));
    }, []);

    const handleTransferRecipes = useCallback((toUser: string) => {
        if (!userToTransferFrom) return;

        // 1. Calculation
        const newRecipes = { ...appData.recipes };
        let transferredCount = 0;
        Object.values(newRecipes).forEach((recipe: Recipe) => {
            if (recipe.createdBy === userToTransferFrom) {
                newRecipes[recipe.id] = { ...recipe, createdBy: toUser };
                transferredCount++;
            }
        });

        // 2. State update
        setAppData(prev => ({ ...prev, recipes: newRecipes }));

        // 3. Side effect (toast)
        if (transferredCount > 0) {
            displayToast(`${transferredCount} recept har överförts från ${userToTransferFrom} till ${toUser}.`, 'success');
        } else {
             displayToast(`Inga recept att överföra från ${userToTransferFrom}.`, 'success');
        }

        // 4. Other state updates
        setModals(prev => ({ ...prev, transferRecipes: false }));
        setUserToTransferFrom(null);
    }, [userToTransferFrom, appData.recipes, displayToast]);
    
    const handleSaveToFile = useCallback(() => {
        try {
            const dataStr = JSON.stringify(appData, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `matplanerare_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            displayToast('Backup-fil skapas!', 'success');
            setModals(p => ({ ...p, settings: false }));
        } catch (err) {
            console.error('Error saving file:', err);
            displayToast('Kunde inte spara filen.', 'error');
        }
    }, [appData, displayToast]);

    const handleLoadFromFile = useCallback(() => {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';
            input.onchange = (event) => {
                const target = event.target as HTMLInputElement;
                const file = target.files?.[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const contents = e.target?.result as string;
                        const data = JSON.parse(contents) as AppData;

                        if (data && typeof data === 'object' && typeof data.users === 'object' && typeof data.recipes === 'object' && typeof data.mealPlans === 'object' && data.adminUser !== undefined) {
                             setConfirmAction({
                                action: () => {
                                    setAppData(data);
                                    displayToast('Data återställd från fil!', 'success');
                                    setCurrentUser(null);
                                    setWasAdminOnLogout(false);
                                    setModals({ 
                                        user: true, recipeForm: false, viewRecipe: false,
                                        selectRecipe: false, settings: false, confirm: false, renameUser: false,
                                        transferRecipes: false, resetPassword: false
                                    });
                                },
                                title: "Återställ från fil",
                                text: "Detta kommer att skriva över all nuvarande data med innehållet från filen. Är du säker?",
                                isDanger: true,
                                confirmText: "Ja, återställ"
                            });
                            setModals(p => ({ ...p, settings: false, confirm: true }));
                        } else {
                            displayToast('Filen verkar vara tom eller har fel format.', 'error');
                        }
                    } catch (parseError) {
                        console.error('Error parsing file:', parseError);
                        displayToast('Kunde inte läsa filen. Se till att det är en giltig JSON-backup.', 'error');
                    }
                };
                reader.onerror = () => {
                     console.error('Error reading file:', reader.error);
                     displayToast('Kunde inte läsa filen.', 'error');
                };
                reader.readAsText(file);
            };
            input.click();
        } catch (err) {
            console.error('Error opening file picker:', err);
            displayToast('Kunde inte öppna filväljaren.', 'error');
        }
    }, [displayToast]);

    const handleImportRecipesFromFile = useCallback(() => {
        if (!currentUser) {
            displayToast('Du måste vara inloggad för att importera recept.', 'error');
            return;
        }
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const contents = e.target?.result as string;
                    const data = JSON.parse(contents) as Partial<AppData>;

                    if (!data.recipes || typeof data.recipes !== 'object' || Array.isArray(data.recipes)) {
                        displayToast('Ogiltig fil. Saknar ett giltigt "recipes" objekt.', 'error');
                        return;
                    }
                    
                    setAppData(prev => {
                        let importedCount = 0;
                        let renamedCount = 0;
                        const newRecipes = { ...prev.recipes };
                        const recipesToImport = data.recipes as Record<string, Recipe>;

                        Object.values(recipesToImport).forEach((recipe: Recipe) => {
                            if (recipe && recipe.id && recipe.name) {
                                let finalId = recipe.id;
                                if (newRecipes[finalId]) {
                                    finalId = `${recipe.id}_imp_${Date.now()}${Math.floor(Math.random() * 1000)}`;
                                    renamedCount++;
                                }
                                // Assign the current user as the creator
                                newRecipes[finalId] = { ...recipe, id: finalId, createdBy: currentUser! };
                                importedCount++;
                            }
                        });
                         if (importedCount > 0) {
                            let toastMessage = `${importedCount} recept har importerats.`;
                            if (renamedCount > 0) {
                                toastMessage += ` ${renamedCount} fick nya ID:n för att undvika dubbletter.`;
                            }
                            displayToast(toastMessage, 'success');
                            setModals(p => ({ ...p, settings: false }));
                        } else {
                            displayToast('Inga giltiga recept att importera hittades i filen.', 'error');
                        }
                        return { ...prev, recipes: newRecipes };
                    });

                } catch (parseError) {
                    console.error('Error parsing imported file:', parseError);
                    displayToast('Kunde inte läsa filen. Se till att det är en giltig JSON-backup.', 'error');
                }
            };
            reader.onerror = () => {
                 displayToast('Kunde inte läsa filen.', 'error');
            };
            reader.readAsText(file);
        };
        input.click();
    }, [displayToast, currentUser]);

    const weekId = getWeekId(currentDate);
    const weekStart = getWeekStartDate(currentDate);
    const daysOfWeek = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];
    const currentMealPlan = currentUser ? appData.mealPlans[currentUser]?.[weekId] : {};

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (!currentUser) {
        return (
            <>
                {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} show={showToast} />}
                <UserModal 
                    isOpen={modals.user}
                    users={appData.users}
                    adminUser={appData.adminUser}
                    onLogin={handleLogin}
                    onCreateUser={handleCreateUser}
                    onSetInitialPassword={handleSetInitialPassword}
                    onDeleteUser={handleDeleteUser}
                    onRenameUser={openRenameUserModal}
                    onTransferRecipes={openTransferRecipesModal}
                    onResetPassword={openResetPasswordModal}
                    wasAdminOnLogout={wasAdminOnLogout}
                    showToast={displayToast}
                />
                <RenameUserModal
                    isOpen={modals.renameUser}
                    onClose={() => setModals(p => ({...p, renameUser: false}))}
                    onConfirm={(newName) => handleRenameUser(userToRename!, newName)}
                    username={userToRename || ''}
                    showToast={displayToast}
                />
                <ResetPasswordModal
                    isOpen={modals.resetPassword}
                    onClose={() => setModals(p => ({...p, resetPassword: false}))}
                    onConfirm={handleResetPassword}
                    username={userToResetPassword || ''}
                    showToast={displayToast}
                />
                 <TransferRecipesModal
                    isOpen={modals.transferRecipes}
                    onClose={() => {
                        setModals(p => ({ ...p, transferRecipes: false }));
                        setUserToTransferFrom(null);
                    }}
                    onConfirm={handleTransferRecipes}
                    fromUser={userToTransferFrom}
                    allUsers={Object.keys(appData.users)}
                />
                 <ConfirmModal 
                    isOpen={modals.confirm} 
                    onClose={() => setModals(p => ({ ...p, confirm: false }))} 
                    onConfirm={() => { if(confirmAction) { confirmAction.action(); setConfirmAction(null); } setModals(p=>({...p, confirm: false})); }} 
                    title={confirmAction?.title || ""} 
                    text={confirmAction?.text || ""} 
                    isDanger={confirmAction?.isDanger} 
                    confirmText={confirmAction?.confirmText} 
                 />
            </>
        );
    }
    
    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} show={showToast} />}
            <RecipeFormModal isOpen={modals.recipeForm} onClose={() => setModals(p => ({ ...p, recipeForm: false }))} onSave={handleSaveRecipe} recipeToEdit={recipeToEdit} showToast={displayToast} />
            <ViewRecipeModal isOpen={modals.viewRecipe} onClose={() => setModals(p => ({ ...p, viewRecipe: false }))} recipe={recipeToView} showToast={displayToast}/>
            <SelectRecipeModal isOpen={modals.selectRecipe} onClose={() => setModals(p => ({ ...p, selectRecipe: false }))} recipes={appData.recipes} onSelect={(recipeId) => { handleUpdateMealPlan(targetSlot!.day, recipeId); setModals(p => ({...p, selectRecipe: false})); }} dayName={targetSlot?.dayName || ''} />
            <SettingsModal isOpen={modals.settings} onClose={() => setModals(p => ({ ...p, settings: false }))} onSave={handleSaveToFile} onLoad={handleLoadFromFile} onImportRecipes={handleImportRecipesFromFile} />
            <ConfirmModal isOpen={modals.confirm} onClose={() => setModals(p => ({ ...p, confirm: false }))} onConfirm={() => { if(confirmAction) { confirmAction.action(); setConfirmAction(null); } setModals(p=>({...p, confirm: false})); }} title={confirmAction?.title || ""} text={confirmAction?.text || ""} isDanger={confirmAction?.isDanger} confirmText={confirmAction?.confirmText} />
            
            <header className="text-center mb-10 relative">
                <h1 className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-sky-600 to-teal-600 pb-2">Matplanerare</h1>
                <p className="text-slate-500 mt-2 text-lg">Planera din vecka, en middag i taget.</p>
                <div className="absolute top-0 right-0 flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-700">{currentUser}{currentUser === appData.adminUser ? ' (Admin)' : ''}</span>
                        <button onClick={handleSwitchUser} className="p-2 text-slate-500 hover:text-sky-600 hover:bg-white/50 rounded-full transition-colors" title="Logga ut"><LogoutIcon /></button>
                    </div>
                     <button onClick={() => setModals(p => ({ ...p, settings: true }))} className="p-2 text-slate-500 hover:text-sky-600 hover:bg-white/50 rounded-full transition-colors" title="Datahantering & Backup">
                        <SettingsIcon />
                    </button>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Weekly Planner */}
                <div className="panel p-6 lg:col-span-3">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-800">Veckoplan</h2>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => setCurrentDate(d => new Date(d.setDate(d.getDate() - 7)))} className="p-2 rounded-full hover:bg-black/5 transition-colors text-slate-500 hover:text-slate-700"><PrevIcon /></button>
                            <span className="text-lg font-semibold w-32 text-center text-slate-700">Vecka {weekId.split('-W')[1]}</span>
                            <button onClick={() => setCurrentDate(d => new Date(d.setDate(d.getDate() + 7)))} className="p-2 rounded-full hover:bg-black/5 transition-colors text-slate-500 hover:text-slate-700"><NextIcon /></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                        {daysOfWeek.map((dayName, i) => {
                            const dayDate = new Date(weekStart);
                            dayDate.setDate(weekStart.getDate() + i);
                            const dayKey = dayName.toLowerCase();
                            const recipeId = currentMealPlan?.[dayKey]?.['middag'];
                            const recipe = recipeId ? appData.recipes[recipeId] : null;

                            return (
                                <div key={dayKey} className="flex flex-col space-y-2">
                                    <h3 className="font-bold text-center text-slate-700">{dayName} <span className="text-sm font-normal text-slate-500">{dayDate.getDate()}/{dayDate.getMonth()+1}</span></h3>
                                    <div 
                                        onClick={() => {
                                            if (!recipe) {
                                                setTargetSlot({ day: dayKey, dayName: dayName });
                                                setModals(p => ({ ...p, selectRecipe: true }));
                                            }
                                        }}
                                        className={`min-h-[160px] rounded-xl p-3 flex flex-col border-2 transition-all duration-200 ${recipe ? 'bg-white/60 shadow-md border-solid border-slate-200/50 justify-between' : 'bg-transparent border-dashed border-slate-300/80 justify-center items-center cursor-pointer hover:border-sky-400 hover:bg-white/40'}`}
                                    >
                                        {recipe ? (
                                            <>
                                                <p className="font-semibold text-sm flex-grow break-words text-slate-800">{recipe.name}</p>
                                                <div className="text-right mt-1">
                                                    <button onClick={(e) => { e.stopPropagation(); setRecipeToView(recipe); setModals(p => ({ ...p, viewRecipe: true})); }} className="view-meal-btn text-sky-600 hover:text-sky-800 text-xs font-semibold">Visa</button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleUpdateMealPlan(dayKey, null); }} className="remove-meal-btn text-red-500 hover:text-red-700 text-xs font-semibold ml-2">Ta bort</button>
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-slate-400 text-sm">Middag</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Recipe List */}
                <RecipeListPanel recipes={appData.recipes} currentUser={currentUser} adminUser={appData.adminUser} onAdd={handleAddRecipe} onEdit={handleEditRecipe} onDelete={handleDeleteRecipe} />
            </main>
        </div>
    );
}

// Sub-component for recipe list to keep App component cleaner
interface RecipeListPanelProps {
    recipes: Record<string, Recipe>;
    currentUser: string;
    adminUser: string | null;
    onAdd: () => void;
    onEdit: (recipe: Recipe) => void;
    onDelete: (recipe: Recipe) => void;
}
const RecipeListPanel: React.FC<RecipeListPanelProps> = ({ recipes, currentUser, adminUser, onAdd, onEdit, onDelete }) => {
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
        <div className="panel p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Receptbank</h2>
                <Button 
                    onClick={onAdd}
                    className="p-2 rounded-full"
                    title="Lägg till nytt recept"
                >
                    <PlusIcon />
                </Button>
            </div>
            <div className="mb-4">
                <label htmlFor="ingredient-search-input" className="sr-only">Sök på ingredienser</label>
                <input type="search" id="ingredient-search-input" placeholder="Sök ingrediens (t.ex. kyckling, tomat)..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 bg-white/80" />
            </div>
            <div className="space-y-3 h-[55vh] overflow-y-auto pr-2">
                {filteredRecipes.length > 0 ? filteredRecipes.map((recipe: Recipe) => {
                    const canEdit = recipe.createdBy === currentUser || currentUser === adminUser;
                    return (
                        <div key={recipe.id} className="bg-white/60 p-4 rounded-lg shadow-sm flex justify-between items-center border border-slate-200/50">
                            <div>
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