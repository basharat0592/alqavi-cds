import React from 'react';
import { cn } from '@/lib/utils';

/** White surface with a hairline border — the dashboard's card treatment.
 *  Separation comes from the border, not a shadow. */
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'bg-white rounded-2xl border border-[#E7ECF2]',
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export default Card;
