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
    'w-full h-9 px-2 bg-[#F2F2F0] text-[12.5px] font-medium text-[#1A1A1A] outline-none rounded-lg ' +
    'border border-transparent transition-colors placeholder:text-[#9C9C98] placeholder:font-normal ' +
    'hover:bg-[#EDEDEA] focus:bg-white focus:border-[#E0E0DC] focus:ring-2 focus:ring-black/[0.06]';

export const cellNum = cellCls + ' text-right tabular-nums no-spinner';

export const cellDisabled =
    'bg-[#EFEFEC] border-transparent text-[#9C9C98] cursor-not-allowed hover:bg-[#EFEFEC]';

/** Marks a cell that failed validation. Applied only after a save attempt. */
export const cellError =
    ' !border-[#F0A9A9] !bg-[#FCE9E9] focus:!border-[#DC2626] focus:!ring-[#DC2626]/20';

/** The horizontal scroller that keeps header, rows and totals locked together. */
export const gridScroller = 'overflow-x-auto custom-scrollbar border-b border-[#EDEDEA]';

/** Header band. */
export const gridHead = 'bg-[#F5F5F3] border-b border-[#EDEDEA]';

/** Totals band, which also hosts the "add row" control. */
export const gridFoot = 'bg-[#FAFAF8] border-t border-[#EDEDEA] items-center';

/** A row: zebra striped, with a rail that lights up on the row being edited. */
export const gridRow = (index: number) =>
    'relative border-b border-[#F2F2F0] last:border-b-0 transition-colors ' +
    'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-transparent focus-within:before:bg-[#1A1A1A] ' +
    (index % 2 ? 'bg-[#FAFAF8] ' : 'bg-white ') +
    'hover:bg-[#F5F5F3] focus-within:bg-black/[0.03]';

// Written out rather than interpolated — Tailwind only ships classes it can see as literals.
const TH_ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

export const Th = ({ children, align = 'left', required = false }: {
    children: React.ReactNode; align?: keyof typeof TH_ALIGN; required?: boolean;
}) => (
    <div className={`px-2 py-2.5 text-[11.5px] font-medium tracking-[-0.01em] text-[#9C9C98] whitespace-nowrap ${TH_ALIGN[align]}`}>
        {children}{required && <span className="text-[#DC2626] ml-0.5">*</span>}
    </div>
);

export const Cell = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`px-1 py-1 flex items-center ${className}`}>{children}</div>
);

/* Compact field for the bottom settlement strip — smaller than the shared admin
   field so six or seven sit on one row without crowding. */
export const settleInput = ui.inputBase.replace('h-10', 'h-9').replace('text-[13.5px]', 'text-[12.5px]');
export const settleSelect = settleInput + ' cursor-pointer';

export const SField = ({ label, hint, children }: {
    label: string; hint?: string; children: React.ReactNode;
}) => (
    <div className="w-full min-w-0">
        <label className="block text-[11.5px] font-medium tracking-[-0.01em] text-[#9C9C98] mb-1 truncate" title={hint || label}>{label}</label>
        {children}
    </div>
);

/** Section heading used above a settlement strip. */
export const SectionHead = ({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) => (
    <div className="flex items-center gap-2.5 mb-4 select-none">
        {icon && (
            <div className="w-7 h-7 rounded-full bg-[#F0F0EE] text-[#1A1A1A] flex items-center justify-center shrink-0">
                {icon}
            </div>
        )}
        <span className="text-[13px] font-semibold text-[#1A1A1A] tracking-[-0.01em]">{children}</span>
        <div className="h-px flex-1 bg-[#EDEDEA]" />
    </div>
);
