import React from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.06)]',
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export default Card;
