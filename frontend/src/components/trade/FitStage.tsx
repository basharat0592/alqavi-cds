"use client";

import { useEffect, useState } from 'react';

/**
 * Lays its children out on a design-size stage and scales it to exactly fill
 * the browser window, so a screen looks the same — same proportions, everything
 * visible at once — on a small laptop and on a large monitor.
 *
 * The scale is min(windowW / width, windowH / height); the stage then takes the
 * window's full width and height in design pixels, so there is no empty margin
 * and no scrollbar. Below `minViewport` (phones / narrow windows) it renders
 * unscaled so the page's own responsive layout takes over.
 *
 * Note: CSS transforms re-anchor `position: fixed`, so pop-ups/modals should be
 * rendered outside the stage.
 */
export default function FitStage({
    width, height, minViewport = 0, className = '', children,
}: {
    width: number; height: number; minViewport?: number; className?: string; children: React.ReactNode;
}) {
    const [st, setSt] = useState<{ s: number; w: number; h: number } | null>(null);

    useEffect(() => {
        const fit = () => {
            const vw = window.innerWidth, vh = window.innerHeight;
            if (vw < minViewport) { setSt(null); return; }
            const s = Math.min(vw / width, vh / height);
            setSt({ s, w: vw / s, h: vh / s });
        };
        fit();
        window.addEventListener('resize', fit);
        return () => window.removeEventListener('resize', fit);
    }, [width, height, minViewport]);

    // Same element structure scaled or not, so crossing the threshold on resize
    // never remounts (and resets) the page underneath.
    return (
        <div className={st ? 'h-screen w-screen overflow-hidden' : 'h-full w-full'}>
            <div
                className={className}
                style={st
                    ? { width: st.w, height: st.h, transform: `scale(${st.s})`, transformOrigin: '0 0' }
                    : { width: '100%', height: '100%' }}
            >
                {children}
            </div>
        </div>
    );
}
