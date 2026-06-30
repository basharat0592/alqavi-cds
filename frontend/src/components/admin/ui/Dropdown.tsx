'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function Dropdown({
    trigger,
    children,
    align = 'right',
    className,
}: {
    trigger: React.ReactNode;
    children: React.ReactNode;
    align?: 'left' | 'right';
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
            {open && (
                <div
                    className={cn(
                        'absolute z-[100] mt-2 min-w-[200px] bg-white border border-slate-200 rounded-xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.25)] py-1.5 animate-in fade-in zoom-in-95 duration-150',
                        align === 'right' ? 'right-0' : 'left-0',
                        className,
                    )}
                    onClick={() => setOpen(false)}
                >
                    {children}
                </div>
            )}
        </div>
    );
}

export function DropdownItem({
    icon: Icon,
    children,
    onClick,
    href,
    danger,
}: {
    icon?: any;
    children: React.ReactNode;
    onClick?: () => void;
    href?: string;
    danger?: boolean;
}) {
    const cls = cn(
        'flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] font-medium transition-colors text-left',
        danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
    );
    const inner = (
        <>
            {Icon && <Icon size={15} className="shrink-0 opacity-70" />}
            {children}
        </>
    );
    if (href) {
        return (
            <a href={href} className={cls}>
                {inner}
            </a>
        );
    }
    return (
        <button onClick={onClick} className={cls}>
            {inner}
        </button>
    );
}

export default Dropdown;
