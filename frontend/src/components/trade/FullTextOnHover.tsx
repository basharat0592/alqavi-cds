"use client";

/*
 * Every window: pointing at something shows its full text in a large, easy
 * to read tooltip (bigger than the window's own text):
 *   - text that does not fit its box (a cut grid cell ending in "…"),
 *   - a long value in a narrow input, a dropdown's chosen item,
 *   - anything with a hint (`title`) — shown in this tooltip instead of the
 *     browser's small one.
 * One listener for the whole app.
 */
import { useEffect } from 'react';

const MAX = 800;
const DELAY = 280;

const clipped = (el: HTMLElement) => {
    const cs = getComputedStyle(el);
    const clipsX = cs.overflowX === 'hidden' || cs.overflowX === 'clip' || cs.textOverflow === 'ellipsis';
    const clipsY = cs.overflowY === 'hidden' || cs.overflowY === 'clip';
    return (clipsX && el.scrollWidth > el.clientWidth + 1) || (clipsY && el.scrollHeight > el.clientHeight + 2);
};
const clean = (s: string) => s.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim().slice(0, MAX);

/* The element under the pointer that has something to show, and what. */
function tipFor(start: HTMLElement | null): { el: HTMLElement; text: string } | null {
    let el = start;
    for (let i = 0; el && i < 6 && el !== document.body; i++, el = el.parentElement) {
        // A hint of its own: keep it out of the browser's small tooltip, show it in ours.
        const own = el.getAttribute('title');
        if (own) { el.dataset.tip = own; el.removeAttribute('title'); }
        if (el.dataset.tip) return { el, text: el.dataset.tip };
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            if (el.type === 'checkbox' || el.type === 'radio' || el.type === 'date') return null;
            return el.value && el.scrollWidth > el.clientWidth + 1 ? { el, text: el.value } : null;
        }
        if (el instanceof HTMLSelectElement) {
            const t = el.selectedOptions[0]?.text || '';
            return t && t.length > 18 ? { el, text: t } : null;
        }
        // Only small text boxes (a cell, a label) — never a whole clipped panel.
        if (el.childElementCount <= 4 && (el.innerText || '').length <= MAX && clipped(el)) return { el, text: el.innerText };
    }
    return null;
}

export default function FullTextOnHover() {
    useEffect(() => {
        const box = document.createElement('div');
        box.setAttribute('role', 'tooltip');
        box.style.cssText = [
            'position:fixed', 'z-index:2147483000', 'pointer-events:none', 'display:none', 'max-width:min(560px,90vw)',
            'padding:7px 11px', 'border-radius:6px', 'background:#1f2370', 'color:#fff', 'font:600 15px/1.4 Inter,system-ui,sans-serif',
            'white-space:pre-wrap', 'word-break:break-word', 'box-shadow:0 8px 24px -8px rgba(0,0,0,.45)',
        ].join(';');
        document.body.appendChild(box);
        let cur: HTMLElement | null = null;
        let timer: ReturnType<typeof setTimeout> | null = null;
        let x = 0, y = 0;
        const place = () => {
            const r = box.getBoundingClientRect();
            let left = x + 14, top = y + 18;
            if (left + r.width > window.innerWidth - 6) left = Math.max(6, window.innerWidth - r.width - 6);
            if (top + r.height > window.innerHeight - 6) top = Math.max(6, y - r.height - 10);
            box.style.left = `${left}px`; box.style.top = `${top}px`;
        };
        const hide = () => { if (timer) clearTimeout(timer); timer = null; cur = null; box.style.display = 'none'; };
        const over = (e: MouseEvent) => {
            x = e.clientX; y = e.clientY;
            const hit = tipFor(e.target as HTMLElement | null);
            if (!hit) { if (cur) hide(); return; }
            if (hit.el === cur) return;
            hide();
            cur = hit.el;
            const text = clean(hit.text);
            if (!text) return;
            timer = setTimeout(() => {
                if (cur !== hit.el) return;
                box.textContent = text;
                box.style.display = 'block';
                place();
            }, DELAY);
        };
        const move = (e: MouseEvent) => { x = e.clientX; y = e.clientY; if (box.style.display === 'block') place(); };
        const out = (e: MouseEvent) => {
            if (cur && !(e.relatedTarget instanceof Node && cur.contains(e.relatedTarget))) hide();
        };
        document.addEventListener('mouseover', over, true);
        document.addEventListener('mousemove', move, true);
        document.addEventListener('mouseout', out, true);
        document.addEventListener('mousedown', hide, true);
        document.addEventListener('keydown', hide, true);
        window.addEventListener('scroll', hide, true);
        window.addEventListener('blur', hide);
        return () => {
            document.removeEventListener('mouseover', over, true);
            document.removeEventListener('mousemove', move, true);
            document.removeEventListener('mouseout', out, true);
            document.removeEventListener('mousedown', hide, true);
            document.removeEventListener('keydown', hide, true);
            window.removeEventListener('scroll', hide, true);
            window.removeEventListener('blur', hide);
            box.remove();
        };
    }, []);
    return null;
}
