"use client";

/*
 * Every window: when text does not fit its box (a cut grid cell ending in "…",
 * a long value in a narrow input, a dropdown's chosen item), pointing at it
 * shows the full text as a tooltip. One listener for the whole app; elements
 * with their own title keep it.
 */
import { useEffect } from 'react';

const MAX = 600;
const cut = (el: HTMLElement) => {
    const cs = getComputedStyle(el);
    const clipsX = cs.overflowX === 'hidden' || cs.overflowX === 'clip' || cs.textOverflow === 'ellipsis';
    const clipsY = cs.overflowY === 'hidden' || cs.overflowY === 'clip';
    return (clipsX && el.scrollWidth > el.clientWidth + 1) || (clipsY && el.scrollHeight > el.clientHeight + 2);
};
const setTip = (el: HTMLElement, text: string) => {
    if (el.title && !el.dataset.autoTip) return;        // its own tooltip wins
    const t = text.replace(/\s+/g, ' ').trim().slice(0, MAX);
    if (t) { el.title = t; el.dataset.autoTip = '1'; } else if (el.dataset.autoTip) { el.removeAttribute('title'); }
};

export default function FullTextOnHover() {
    useEffect(() => {
        const over = (e: MouseEvent) => {
            let el = e.target as HTMLElement | null;
            for (let i = 0; el && i < 4 && el !== document.body; i++, el = el.parentElement) {
                if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
                    if (el.type !== 'checkbox' && el.type !== 'radio' && el.type !== 'date') {
                        if (el.scrollWidth > el.clientWidth + 1) setTip(el, el.value);
                        else if (el.dataset.autoTip) el.removeAttribute('title');
                    }
                    return;
                }
                if (el instanceof HTMLSelectElement) { setTip(el, el.selectedOptions[0]?.text || ''); return; }
                // Only small text boxes (a cell, a label) — never a whole clipped panel.
                if (el.childElementCount <= 4 && (el.innerText || '').length <= MAX && cut(el)) { setTip(el, el.innerText); return; }
            }
        };
        document.addEventListener('mouseover', over, true);
        return () => document.removeEventListener('mouseover', over, true);
    }, []);
    return null;
}
