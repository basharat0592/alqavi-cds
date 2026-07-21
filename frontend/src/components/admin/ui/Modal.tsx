'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
} as const;

export function Modal({
    open,
    onClose,
    title,
    children,
    footer,
    size = 'md',
}: {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: keyof typeof sizes;
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />
            <div
                className={cn(
                    'relative w-full bg-white rounded-2xl shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200',
                    'max-h-[90vh] flex flex-col overflow-hidden',
                    sizes[size],
                )}
            >
                {title && (
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
                        <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">{title}</h3>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            aria-label="Close"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}
                <div className="p-5 overflow-y-auto">{children}</div>
                {footer && (
                    <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Modal;
