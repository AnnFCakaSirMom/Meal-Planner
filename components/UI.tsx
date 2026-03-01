import React, { useEffect } from 'react';
import { SpinnerIcon } from './Icons';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'green';
    children: React.ReactNode;
    isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ variant = 'primary', children, className = '', isLoading = false, ...props }, ref) => {
    const baseClasses = "px-4 py-2 rounded-xl transition-all duration-300 shadow-sm hover:shadow-lg transform hover:-translate-y-px flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed border";
    const variantClasses = {
        primary: "bg-sky-600/90 text-white hover:bg-sky-600 btn-primary border-sky-400",
        secondary: "bg-white/60 text-slate-700 hover:bg-white/80 border-slate-200 backdrop-blur-sm",
        danger: "bg-red-600/90 text-white hover:bg-red-600 btn-danger border-red-400",
        green: "bg-teal-500/90 text-white hover:bg-teal-500 btn-green border-teal-400",
    };
    return (
        <button ref={ref} className={`${baseClasses} ${variantClasses[variant]} ${className}`} disabled={isLoading || props.disabled} {...props}>
            {isLoading && <SpinnerIcon />}
            {children}
        </button>
    );
});

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    canClose?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, canClose = true, size = 'md' }) => {
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
                className={`modal-content rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.2)] p-6 md:p-8 w-full ${sizeClasses[size]} transform animate-fade-in-up`}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
};

export interface ToastProps {
    message: string;
    type: 'success' | 'error';
    show: boolean;
}

export const Toast: React.FC<ToastProps> = ({ message, type, show }) => {
    const bgColor = type === 'success' ? 'bg-green-500/90 border-green-400' : 'bg-red-500/90 border-red-400';
    return (
        <div className={`fixed top-5 right-5 text-white px-6 py-3 rounded-2xl shadow-xl backdrop-blur-xl border transform transition-all duration-300 ease-in-out z-50 ${show ? 'translate-x-0 opacity-100' : 'translate-x-[calc(100%+2rem)] opacity-0'} ${bgColor}`}>
            <p className="font-medium drop-shadow-sm">{message}</p>
        </div>
    );
};

export const LoadingScreen: React.FC<{ message?: string }> = ({ message = "Laddar data..." }) => (
    <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center glass-panel p-8">
            <svg className="animate-spin h-10 w-10 text-sky-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p className="text-slate-700 font-medium text-lg">{message}</p>
        </div>
    </div>
);