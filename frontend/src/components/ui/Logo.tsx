'use client';

import React from 'react';

interface LogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    dark?: boolean;
}

export default function Logo({ className = '', size = 'md', dark = false }: LogoProps) {
    const dimensions = {
        sm: 'h-12 w-auto',
        md: 'h-18 w-auto',
        lg: 'h-28 w-auto',
        xl: 'h-40 w-auto',
    };

    const d = dimensions[size];

    return (
        <div className={`p-0 m-0 leading-[0] ${className}`}>
            <img
                src="/images/logo.png"
                alt="Alqavi Traders"
                className={`${d} object-contain transition-all duration-300 group-hover:scale-105 ${dark ? 'brightness-0' : ''}`}
            />
        </div>
    );
}

