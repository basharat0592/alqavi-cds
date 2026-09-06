'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * One surface for a list view: filters, the table, and the pager all live inside
 * the same card so the filter bar reads as the table's own header rather than a
 * floating panel above it.
 *
 *   <TableShell filters={<Filters/>} meta="19 results" footer={<Pagination …/>}>
 *       <table className={ui.table}>…</table>
 *   </TableShell>
 *
 * The table is wrapped in its own horizontal scroller, so wide tables scroll
 * inside the card instead of pushing the page sideways.
 */
export function TableShell({
    filters,
    meta,
    footer,
    children,
    className,
    bodyClassName,
}: {
    /** Filter controls — rendered as the table's header band. */
    filters?: React.ReactNode;
    /** Small right-aligned note in the filter band, e.g. "19 results of 19". */
    meta?: React.ReactNode;
    /** Usually <Pagination/>, which brings its own top border. */
    footer?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    /** Escape hatch for tables that manage their own scrolling. */
    bodyClassName?: string;
}) {
    return (
        <div
            className={cn(
                'bg-white rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.03),0_10px_30px_-14px_rgba(0,0,0,0.12)] overflow-hidden',
                className,
            )}
        >
            {(filters || meta) && (
                <div className="px-4 sm:px-5 py-3.5 border-b border-[#F2F2F0]">
                    <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                        <div className="flex-1 min-w-0">{filters}</div>
                        {meta && (
                            <div className="shrink-0 text-[12.5px] font-medium text-[#9C9C98] tabular-nums">
                                {meta}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className={cn('w-full overflow-x-auto', bodyClassName)}>{children}</div>

            {footer}
        </div>
    );
}

export default TableShell;
