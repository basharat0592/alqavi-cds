import React from 'react';
import { cn } from '@/lib/utils';

/** Borderless white surface. Separation comes from a wide, very soft shadow —
 *  adding a hairline border back would break the look everywhere at once. */
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'bg-white rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.03),0_10px_30px_-14px_rgba(0,0,0,0.12)]',
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export default Card;
