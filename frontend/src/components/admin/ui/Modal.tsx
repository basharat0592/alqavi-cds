'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[1600px]',
} as const;

export function Modal({
    open,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    panelClassName,
    bodyClassName,
}: {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: keyof typeof sizes;
    /** Override the panel box (e.g. a taller popup for a full workspace). */
    panelClassName?: string;
    /** Override the scroll body (e.g. drop the default padding). */
    bodyClassName?: string;
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
                className="absolute inset-0 bg-black/25 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />
            <div
                className={cn(
                    'relative w-full bg-white rounded-3xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_24px_60px_-20px_rgba(0,0,0,0.30)] animate-in fade-in zoom-in-95 duration-200',
                    'max-h-[90vh] flex flex-col overflow-hidden',
                    sizes[size],
                    panelClassName,
                )}
            >
                {title && (
                    <div className="flex items-center justify-between px-6 py-5 border-b border-[#F2F2F0] shrink-0">
                        <h3 className="text-[17px] font-semibold text-[#1A1A1A] tracking-[-0.02em]">{title}</h3>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-[#9C9C98] hover:text-[#0E7F98] hover:bg-black/[0.04] transition-colors"
                            aria-label="Close"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}
                <div className={cn('p-5 overflow-y-auto', bodyClassName)}>{children}</div>
                {footer && (
                    <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#F2F2F0] bg-[#FAFAF8] rounded-b-3xl shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Modal;
