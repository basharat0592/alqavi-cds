import React from 'react';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'indigo' | 'green' | 'amber' | 'red' | 'blue';

const tones: Record<Tone, string> = {
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
    indigo: 'bg-[#F59E0B]/10 text-[#B4780B] border-[#F59E0B]/15',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    red: 'bg-rose-50 text-rose-700 border-rose-100',
    blue: 'bg-sky-50 text-sky-700 border-sky-100',
};

export function Badge({
    tone = 'neutral',
    className,
    children,
}: {
    tone?: Tone;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border',
                tones[tone],
                className,
            )}
        >
            {children}
        </span>
    );
}

export default Badge;
