'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/25',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80',
    outline: 'bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 shadow-sm',
    ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/25',
};

const sizes: Record<Size, string> = {
    sm: 'h-8 px-3 text-[12.5px] gap-1.5 rounded-lg',
    md: 'h-10 px-4 text-[13.5px] gap-2 rounded-lg',
    lg: 'h-11 px-5 text-[14px] gap-2 rounded-xl',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
    return (
        <button
            className={cn(
                'inline-flex items-center justify-center font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                variants[variant],
                sizes[size],
                className,
            )}
            {...props}
        />
    );
}

export default Button;
