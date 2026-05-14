'use client';

import { getImageUrl } from '@/lib/utils';

interface LogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    dark?: boolean;
    src?: string;
}

export default function Logo({ className = '', size = 'md', dark = false, src }: LogoProps) {
    const dimensions = {
        sm: 'h-12 w-auto',
        md: 'h-18 w-auto',
        lg: 'h-28 w-auto',
        xl: 'h-40 w-auto',
    };

    const d = dimensions[size];
    const finalSrc = getImageUrl(src) || "/images/logo.png";

    return (
        <div className={`p-0 m-0 leading-[0] ${className}`}>
            <img
                src={finalSrc}
                alt="Alqavi Traders"
                className={`${d} object-contain transition-all duration-300 group-hover:scale-105 ${dark ? 'brightness-0' : ''}`}
            />
        </div>
    );
}

