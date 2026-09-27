import React from 'react';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'indigo' | 'green' | 'amber' | 'red' | 'blue';

/* Soft, fully-rounded pills in the reference's muted palette. `indigo` is kept
   as a tone name only so existing call sites keep compiling — it resolves to the
   neutral ink chip, since the system has no brand hue. */
const tones: Record<Tone, string> = {
    neutral: 'bg-[#F4F6F9] text-[#64748B]',
    indigo: 'bg-[#E7ECF2] text-[#0F1A2B]',
    green: 'bg-[#A9E7C5] text-[#14532D]',
    amber: 'bg-[#F9C9A7] text-[#7C3A10]',
    red: 'bg-[#FBD5D5] text-[#991B1B]',
    blue: 'bg-[#D6E4F7] text-[#1E3A8A]',
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
                'inline-flex items-center gap-1 text-[11.5px] font-medium tracking-[-0.01em] px-2 py-0.5 rounded-full',
                tones[tone],
                className,
            )}
        >
            {children}
        </span>
    );
}

export default Badge;
