'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

// Amber leads: solid fill is the primary CTA, a 10% tint is the secondary action.
const variants: Record<Variant, string> = {
    primary: 'bg-[#F59E0B] hover:bg-[#B4780B] text-white shadow-sm shadow-[#F59E0B]/30',
    secondary: 'bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[#B4780B] border border-[#F59E0B]/40 hover:border-[#F59E0B]/60',
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
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                variants[variant],
                sizes[size],
                className,
            )}
            {...props}
        />
    );
}

export default Button;
