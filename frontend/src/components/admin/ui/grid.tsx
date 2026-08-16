'use client';

import React from 'react';
import { ui } from './tokens';

/**
 * Shared line-item spreadsheet primitives.
 *
 * Extracted from the New Purchase screen so every data-entry grid (purchases,
 * POS, returns) is literally the same code rather than a copy that drifts.
 * Pages supply their own column template and minimum width; everything else —
 * cell chrome, header cells, dividers, the settlement strip — comes from here.
 */

/* A cell carries a visible resting fill + border. A transparent cell reads as
   "nothing here" on a white card, which is what made these grids look unfinished.
   The grid lines frame the columns; the field outline says "you can type here". */
export const cellCls =
    'w-full h-9 px-2 bg-slate-50 text-[12.5px] font-semibold text-slate-900 outline-none rounded-md ' +
    'border border-slate-200 transition-colors placeholder:text-slate-400 placeholder:font-normal ' +
    'hover:border-slate-300 hover:bg-white focus:bg-white focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/30';

export const cellNum = cellCls + ' text-right tabular-nums no-spinner';

export const cellDisabled =
    'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed hover:border-slate-200 hover:bg-slate-100';

/** Marks a cell that failed validation. Applied only after a save attempt. */
export const cellError =
    ' !border-rose-400 !bg-rose-50/60 focus:!border-rose-500 focus:!ring-rose-500/25';

/** The horizontal scroller that keeps header, rows and totals locked together. */
export const gridScroller = 'overflow-x-auto custom-scrollbar border-b border-slate-200';

/** Header band. */
export const gridHead = 'bg-slate-100 border-b border-slate-300';

/** Totals band, which also hosts the "add row" control. */
export const gridFoot = 'bg-slate-50 border-t-2 border-slate-300 items-center';

/** A row: zebra striped, with a rail that lights up on the row being edited. */
export const gridRow = (index: number) =>
    'relative border-b border-slate-200 last:border-b-0 transition-colors ' +
    'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-transparent focus-within:before:bg-[#F59E0B] ' +
    (index % 2 ? 'bg-slate-50/40 ' : 'bg-white ') +
    'hover:bg-slate-50 focus-within:bg-[#F59E0B]/[0.06]';

// Written out rather than interpolated — Tailwind only ships classes it can see as literals.
const TH_ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

export const Th = ({ children, align = 'left', required = false }: {
    children: React.ReactNode; align?: keyof typeof TH_ALIGN; required?: boolean;
}) => (
    <div className={`px-2 py-2 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-600 border-r border-slate-200/80 last:border-r-0 whitespace-nowrap ${TH_ALIGN[align]}`}>
        {children}{required && <span className="text-rose-500 ml-0.5">*</span>}
    </div>
);

export const Cell = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`px-1 py-1 border-r border-slate-100 last:border-r-0 flex items-center ${className}`}>{children}</div>
);

/* Compact field for the bottom settlement strip — smaller than the shared admin
   field so six or seven sit on one row without crowding. */
export const settleInput = ui.inputBase.replace('h-10', 'h-9').replace('text-[13.5px]', 'text-[12.5px]');
export const settleSelect = settleInput + ' cursor-pointer';

export const SField = ({ label, hint, children }: {
    label: string; hint?: string; children: React.ReactNode;
}) => (
    <div className="w-full min-w-0">
        <label className="block text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 mb-1 truncate" title={hint || label}>{label}</label>
        {children}
    </div>
);

/** Section heading used above a settlement strip. */
export const SectionHead = ({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) => (
    <div className="flex items-center gap-2.5 mb-4 select-none">
        {icon && (
            <div className="w-7 h-7 rounded-lg bg-[#F59E0B]/12 text-[#B4780B] flex items-center justify-center ring-1 ring-inset ring-[#F59E0B]/30 shrink-0">
                {icon}
            </div>
        )}
        <span className="text-[12px] font-bold text-slate-800 tracking-tight">{children}</span>
        <div className="h-px flex-1 bg-slate-200/70" />
    </div>
);
