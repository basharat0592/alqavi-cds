"use client";

/*
 * Every print is A5 portrait (148 × 210 mm, 6 mm margins — the printable area is
 * 136 mm wide). Pages printed with the browser's own print (statements, ledgers,
 * reports, lists) are laid out for a wide screen; just before printing, this
 * scales such a page down so its full width fits the A5 page (a long one runs
 * onto more A5 pages), and puts it back afterwards.
 *
 * Pages that already build their own A5 sheet (the invoice pages: .invoice-a5,
 * .invoice-print-scale, .half-block) are left alone. The Trade windows print
 * their own A5 pictures in a separate frame, so they never reach this.
 */
import { useEffect } from 'react';

const PRINTABLE_W_PX = (136 * 96) / 25.4;   // 148 mm less two 6 mm margins

export default function A5PrintFit() {
    useEffect(() => {
        const root = document.documentElement;
        let before: string | null = null;
        const fit = () => {
            if (document.querySelector('.invoice-a5, .invoice-print-scale, .half-block')) return;
            const main = (document.querySelector('main') as HTMLElement | null) || document.body;
            const w = Math.max(main.scrollWidth, main.getBoundingClientRect().width);
            if (!w || w <= PRINTABLE_W_PX) return;
            before = root.style.getPropertyValue('zoom');
            root.style.setProperty('zoom', String(Math.max(0.35, Math.floor((PRINTABLE_W_PX / w) * 1000) / 1000)));
        };
        const undo = () => {
            if (before === null) return;
            if (before) root.style.setProperty('zoom', before); else root.style.removeProperty('zoom');
            before = null;
        };
        window.addEventListener('beforeprint', fit);
        window.addEventListener('afterprint', undo);
        return () => { window.removeEventListener('beforeprint', fit); window.removeEventListener('afterprint', undo); };
    }, []);
    return null;
}
