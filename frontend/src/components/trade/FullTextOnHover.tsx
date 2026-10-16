"use client";

/*
 * Every window: where a box cannot show all its text, pointing at it shows the
 * full text in a large, easy to read tooltip — and only there:
 *   - a cut text cell / label (one line, ending in "…"),
 *   - an input whose value is longer than the box,
 *   - a dropdown whose chosen item is wider than the dropdown.
 * Text that fits (menus, buttons, tiles …) shows nothing.
 */
import { useEffect } from 'react';

const MAX = 800;
const DELAY = 280;

/* One-line text cut by its box (Tailwind `truncate` / `text-ellipsis whitespace-nowrap`). */
const cutText = (el: HTMLElement) => {
    const cs = getComputedStyle(el);
    const oneLine = cs.whiteSpace === 'nowrap' || cs.whiteSpace === 'pre';
    const clips = cs.textOverflow === 'ellipsis' || (oneLine && (cs.overflowX === 'hidden' || cs.overflowX === 'clip'));
    return clips && el.scrollWidth > el.clientWidth + 1;
};
let ctx: CanvasRenderingContext2D | null = null;
const textWidth = (text: string, el: HTMLElement) => {
    ctx = ctx || document.createElement('canvas').getContext('2d');
    if (!ctx) return 0;
    const cs = getComputedStyle(el);
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    return ctx.measureText(text).width;
};

/* The element under the pointer whose text does not fit, and that text. */
function tipFor(start: HTMLElement | null): { el: HTMLElement; text: string } | null {
    let el = start;
    for (let i = 0; el && i < 4 && el !== document.body; i++, el = el.parentElement) {
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            if (el.type === 'checkbox' || el.type === 'radio' || el.type === 'date') return null;
            return el.value && el.scrollWidth > el.clientWidth + 1 ? { el, text: el.value } : null;
        }
        if (el instanceof HTMLSelectElement) {
            const t = el.selectedOptions[0]?.text || '';
            // the arrow and padding take about 34px of the box
            return t && textWidth(t, el) > el.clientWidth - 34 ? { el, text: t } : null;
        }
        if (el instanceof HTMLButtonElement || el.tagName === 'A' || el.tagName === 'NAV') return null;
        if (el.childElementCount <= 4 && (el.innerText || '').length <= MAX && cutText(el)) return { el, text: el.innerText };
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
            const text = hit.text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim().slice(0, MAX);
            if (!text) return;
            // Its own small browser hint would show as well: hold it back while ours shows.
            const own = hit.el.getAttribute('title');
            if (own) { hit.el.dataset.ownTitle = own; hit.el.removeAttribute('title'); }
            timer = setTimeout(() => {
                if (cur !== hit.el) return;
                box.textContent = text;
                box.style.display = 'block';
                place();
            }, DELAY);
        };
        const move = (e: MouseEvent) => { x = e.clientX; y = e.clientY; if (box.style.display === 'block') place(); };
        const out = (e: MouseEvent) => {
            if (!cur || (e.relatedTarget instanceof Node && cur.contains(e.relatedTarget))) return;
            if (cur.dataset.ownTitle) { cur.setAttribute('title', cur.dataset.ownTitle); delete cur.dataset.ownTitle; }
            hide();
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
