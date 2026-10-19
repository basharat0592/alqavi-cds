"use client";

/*
 * Every window: pressing Enter in a box moves to the next box (as Tab does),
 * with its text selected so it can be typed over — as in the legacy Trade 1.0.
 *   - A box that does its own thing on Enter (search, pick a match, a grid
 *     moving its own cursor) keeps it: nothing more happens when it has
 *     already prevented the default, moved the focus or closed.
 *   - Inside a pop-up, Enter stays inside the pop-up.
 *   - Multi-line notes (textarea) and buttons keep their usual Enter.
 *   - `data-enter="off"` on a box, or on any element around it, turns it off there.
 */
import { useEffect } from 'react';

const FIELDS = 'input, select, textarea';
const SKIP_TYPES = new Set(['hidden', 'button', 'submit', 'reset', 'image', 'file', 'range', 'color']);
const TEXT_TYPES = new Set(['', 'text', 'number', 'search', 'tel', 'email', 'password', 'url']);

const usable = (el: Element): el is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement => {
    const f = el as HTMLInputElement;
    if (f.disabled || f.readOnly || f.tabIndex < 0) return false;
    if (el.tagName === 'INPUT' && SKIP_TYPES.has(f.type)) return false;
    if (el.closest('[data-enter="off"], [inert], [aria-hidden="true"]')) return false;
    if (!el.getClientRects().length) return false;          // hidden
    return getComputedStyle(el).visibility !== 'hidden';
};

/* The pop-up the box is in (the nearest fixed layer), else the whole window. */
const scopeOf = (el: Element): ParentNode => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (p.getAttribute('role') === 'dialog' || getComputedStyle(p).position === 'fixed') return p;
    }
    return document;
};

export default function EnterToNext() {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Enter' || e.defaultPrevented || e.isComposing || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
            const el = e.target as HTMLElement | null;
            if (!el || !el.matches?.('input, select') || el.closest('[data-enter="off"]')) return;
            if (el.tagName === 'INPUT' && SKIP_TYPES.has((el as HTMLInputElement).type)) return;
            // The box's own Enter already did something (moved on, closed it): leave it.
            if (!el.isConnected || document.activeElement !== el) return;
            const list = Array.from(scopeOf(el).querySelectorAll(FIELDS)).filter((x) => x === el || usable(x));
            const next = list[list.indexOf(el) + 1] as HTMLElement | undefined;
            if (!next) return;                                  // the last box: Enter does what it always did
            e.preventDefault();
            next.focus();
            if (next instanceof HTMLInputElement && TEXT_TYPES.has(next.type)) {
                try { next.select(); } catch { /* number boxes in some browsers */ }
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);
    return null;
}
