import React from 'react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
    const sizes = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16'
    };

    return (
        <div className="relative">
            <div className={`${sizes[size]} border-4 border-pink-200 rounded-full animate-spin border-t-pink-600`}></div>
            <div className={`absolute inset-0 ${sizes[size]} border-4 border-transparent rounded-full animate-pulse`}></div>
        </div>
    );
}
