'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RowAction = {
    label: string;
    /** lucide icon component */
    icon?: any;
    onClick?: () => void;
    /** Navigates with the app router instead of firing onClick. */
    href?: string;
    /** Renders in red and sits below a divider. */
    danger?: boolean;
    disabled?: boolean;
};

/** Falsy entries are dropped, so call sites can write `cond && {…}` inline. */
export type RowActionInput = RowAction | false | null | undefined;

const MENU_W = 176;
const MARGIN = 8;

/**
 * The single per-row "Actions" menu used by every admin table.
 *
 * The menu is rendered into a portal with fixed coordinates rather than as an
 * absolutely-positioned child: every table on the admin side sits inside an
 * `overflow-x-auto` scroller, which would clip a normal dropdown on the last
 * column — the exact column these menus live in. Fixed + portal sidesteps the
 * clipping entirely, at the cost of having to close on scroll (below), since a
 * portalled menu cannot follow its row.
 */
export function RowActions({
    items,
    label = 'Actions',
    className,
}: {
    items: RowActionInput[];
    label?: string;
    className?: string;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const actions = items.filter(Boolean) as RowAction[];

    const place = useCallback(() => {
        const el = btnRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const height = Math.min(actions.length * 38 + 16, 320);
        // Flip above the trigger when the viewport has no room below it.
        const below = window.innerHeight - r.bottom;
        const top = below < height + MARGIN ? Math.max(MARGIN, r.top - height - 6) : r.bottom + 6;
        const left = Math.min(
            Math.max(MARGIN, r.right - MENU_W),
            window.innerWidth - MENU_W - MARGIN,
        );
        setPos({ top, left });
    }, [actions.length]);

    useLayoutEffect(() => {
        if (open) place();
    }, [open, place]);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
            setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        // A portalled menu can't track its row, so any scroll dismisses it.
        const onScroll = () => setOpen(false);
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onScroll);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onScroll);
        };
    }, [open]);

    if (actions.length === 0) return null;

    const run = (a: RowAction) => {
        setOpen(false);
        if (a.disabled) return;
        if (a.href) { router.push(a.href); return; }
        a.onClick?.();
    };

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
                aria-haspopup="menu"
                aria-expanded={open}
                className={cn(
                    'inline-flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-lg text-[12.5px] font-medium tracking-[-0.01em] transition-colors',
                    open ? 'bg-[#E8E8E4] text-[#1A1A1A]' : 'bg-[#F2F2F0] text-[#5B5B58] hover:bg-[#E8E8E4] hover:text-[#0E7F98]',
                    className,
                )}
            >
                {label}
                <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} />
            </button>

            {open && pos && typeof document !== 'undefined' && createPortal(
                <div
                    ref={menuRef}
                    role="menu"
                    style={{ top: pos.top, left: pos.left, width: MENU_W }}
                    className="fixed z-[300] py-1.5 bg-white rounded-2xl shadow-[0_2px_4px_rgba(0,0,0,0.04),0_18px_44px_-16px_rgba(0,0,0,0.28)] animate-in fade-in zoom-in-95 duration-150"
                >
                    {actions.map((a, i) => {
                        const Icon = a.icon;
                        const firstDanger = a.danger && !actions[i - 1]?.danger && i > 0;
                        return (
                            <React.Fragment key={a.label}>
                                {firstDanger && <div className="my-1 h-px bg-[#F2F2F0]" />}
                                <button
                                    type="button"
                                    role="menuitem"
                                    disabled={a.disabled}
                                    onClick={e => { e.stopPropagation(); run(a); }}
                                    className={cn(
                                        'flex items-center gap-2.5 w-full px-3.5 py-2 text-[13.5px] font-medium tracking-[-0.01em] text-left transition-colors disabled:opacity-40 disabled:pointer-events-none',
                                        a.danger
                                            ? 'text-[#DC2626] hover:bg-[#FCE9E9]'
                                            : 'text-[#5B5B58] hover:bg-[#F5F5F3] hover:text-[#0E7F98]',
                                    )}
                                >
                                    {Icon && <Icon size={15} strokeWidth={1.7} className="shrink-0 opacity-80" />}
                                    {a.label}
                                </button>
                            </React.Fragment>
                        );
                    })}
                </div>,
                document.body,
            )}
        </>
    );
}

export default RowActions;
