'use client';

import React from 'react';

interface LogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className = '', size = 'md' }: LogoProps) {
    const dimensions = {
        sm: 'h-10 w-auto',
        md: 'h-16 w-auto',
        lg: 'h-24 w-auto',
        xl: 'h-32 w-auto',
    };

    const d = dimensions[size];

    return (
        <div className={`flex flex-col items-center group shrink-0 ${className}`}>
            <img 
                src="/images/logo.png" 
                alt="Al-Qavi Traders Logo" 
                className={`${d} object-contain transition-all duration-300 group-hover:scale-105`}
            />
        </div>
    );
}

