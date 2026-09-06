'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

// Ink leads: a solid near-black fill is the primary CTA, a faint grey chip is
// the secondary action. No brand hue — hierarchy is fill weight, not colour.
const variants: Record<Variant, string> = {
    primary: 'bg-[#F59E0B] hover:bg-[#D97706] text-white shadow-[0_1px_2px_rgba(0,0,0,0.12)]',
    secondary: 'bg-[#119AB8]/10 hover:bg-[#119AB8]/[0.16] text-[#0E7F98]',
    outline: 'bg-white hover:bg-[#FAFAF8] text-[#3A3A38] shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
    ghost: 'text-[#5B5B58] hover:text-[#0E7F98] hover:bg-black/[0.04]',
    danger: 'bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-[0_1px_2px_rgba(0,0,0,0.12)]',
};

const sizes: Record<Size, string> = {
    sm: 'h-8 px-3 text-[12.5px] gap-1.5 rounded-lg',
    md: 'h-10 px-4 text-[13.5px] gap-2 rounded-xl',
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
                'inline-flex items-center justify-center font-medium tracking-[-0.01em] transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/[0.08]',
                variants[variant],
                sizes[size],
                className,
            )}
            {...props}
        />
    );
}

export default Button;
