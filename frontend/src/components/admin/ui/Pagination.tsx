'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared table pagination — consistent across every admin list page.
 *
 *   <Pagination page={page} totalPages={n} onPage={setPage} total={rows.length} pageSize={10} />
 *
 * Renders a compact page-window with first/last, Prev/Next, and an optional
 * "Showing X–Y of Z" summary. Hides itself when there's a single page.
 */
export function Pagination({
    page,
    totalPages,
    onPage,
    total,
    pageSize,
    className,
}: {
    page: number;
    totalPages: number;
    onPage: (p: number) => void;
    /** Total row count (for the "Showing X–Y of Z" summary). Optional. */
    total?: number;
    /** Rows per page (for the summary). Optional. */
    pageSize?: number;
    className?: string;
}) {
    if (totalPages <= 1) {
        // Still show the summary line when there are rows on a single page.
        if (!total || !pageSize) return null;
    }

    // Build a compact window of page numbers with ellipses: 1 … 4 5 [6] 7 8 … 20
    const pages: (number | '…')[] = [];
    const win = 1; // neighbours on each side of current
    for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || (p >= page - win && p <= page + win)) {
            pages.push(p);
        } else if (pages[pages.length - 1] !== '…') {
            pages.push('…');
        }
    }

    const from = total && pageSize ? (page - 1) * pageSize + 1 : 0;
    const to = total && pageSize ? Math.min(page * pageSize, total) : 0;

    const btn =
        'inline-flex items-center justify-center h-8 min-w-8 px-2.5 rounded-lg text-[12.5px] font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none';

    return (
        <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100', className)}>
            {total != null && pageSize != null ? (
                <p className="text-[12px] text-slate-500 font-medium order-2 sm:order-1">
                    Showing <span className="font-bold text-slate-700 tabular-nums">{total === 0 ? 0 : from}</span>–
                    <span className="font-bold text-slate-700 tabular-nums">{to}</span> of{' '}
                    <span className="font-bold text-slate-700 tabular-nums">{total}</span>
                </p>
            ) : <span className="order-2 sm:order-1" />}

            {totalPages > 1 && (
                <div className="flex items-center gap-1 order-1 sm:order-2">
                    <button
                        className={cn(btn, 'text-slate-600 hover:bg-slate-100')}
                        onClick={() => onPage(Math.max(1, page - 1))}
                        disabled={page <= 1}
                        aria-label="Previous page"
                    >
                        <ChevronLeft size={15} /> Prev
                    </button>

                    {pages.map((p, i) =>
                        p === '…' ? (
                            <span key={`e${i}`} className="px-1.5 text-slate-400 text-[12.5px] select-none">…</span>
                        ) : (
                            <button
                                key={p}
                                onClick={() => onPage(p)}
                                className={cn(
                                    btn,
                                    p === page
                                        ? 'bg-[#13B0D1] text-white shadow-sm shadow-[#13B0D1]/25'
                                        : 'text-slate-600 hover:bg-slate-100',
                                )}
                                aria-current={p === page ? 'page' : undefined}
                            >
                                {p}
                            </button>
                        ),
                    )}

                    <button
                        className={cn(btn, 'text-slate-600 hover:bg-slate-100')}
                        onClick={() => onPage(Math.min(totalPages, page + 1))}
                        disabled={page >= totalPages}
                        aria-label="Next page"
                    >
                        Next <ChevronRight size={15} />
                    </button>
                </div>
            )}
        </div>
    );
}

export default Pagination;
