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
                        'absolute z-[100] mt-2 min-w-[200px] bg-white rounded-2xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_18px_44px_-16px_rgba(0,0,0,0.28)] py-2 animate-in fade-in zoom-in-95 duration-150',
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
        'flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13.5px] font-medium tracking-[-0.01em] transition-colors text-left',
        danger ? 'text-[#DC2626] hover:bg-[#FCE9E9]' : 'text-[#5B5B58] hover:bg-[#F5F5F3] hover:text-[#0E7F98]',
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
