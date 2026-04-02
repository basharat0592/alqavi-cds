import React from 'react';
import { cn } from '@/lib/utils'; // Assuming cn utility exists, otherwise I will use standard class concatenation or clsx if available

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string;
    description?: string;
    footer?: React.ReactNode;
    children: React.ReactNode;
}

export function Card({ title, description, footer, children, className, ...props }: CardProps) {
    return (
        <div
            className={cn("bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col", className)}
            {...props}
        >
            {(title || description) && (
                <div className="px-6 py-4 border-b border-gray-50">
                    {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
                    {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
                </div>
            )}
            <div className="p-6 flex-1">
                {children}
            </div>
            {footer && (
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
                    {footer}
                </div>
            )}
        </div>
    );
}

