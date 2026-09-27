'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

// Ink leads: a solid near-black fill is the primary CTA, a faint grey chip is
// the secondary action. No brand hue — hierarchy is fill weight, not colour.
const variants: Record<Variant, string> = {
    primary: 'bg-[#1877C2] hover:bg-[#1567AB] text-white',
    secondary: 'bg-[#E8F2FB] hover:bg-[#DCEBF8] text-[#1877C2]',
    outline: 'bg-white hover:bg-[#F8FAFC] text-[#334155] shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
    ghost: 'text-[#64748B] hover:text-[#1567AB] hover:bg-black/[0.04]',
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
