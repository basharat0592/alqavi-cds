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
    onPageSize,
    pageSizeOptions = [5, 10, 25, 50, 100],
    className,
}: {
    page: number;
    totalPages: number;
    onPage: (p: number) => void;
    /** Total row count (for the "Showing X–Y of Z" summary). Optional. */
    total?: number;
    /** Rows per page — also drives the rows-per-page picker when onPageSize is given. */
    pageSize?: number;
    /** Supply to render the rows-per-page picker. */
    onPageSize?: (n: number) => void;
    /** Defaults to 5 / 10 / 25 / 50 / 100. */
    pageSizeOptions?: number[];
    className?: string;
}) {
    if (totalPages <= 1 && !onPageSize) {
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
        'inline-flex items-center justify-center h-9 min-w-9 px-2.5 rounded-xl text-[13px] font-medium tracking-[-0.01em] transition-colors disabled:opacity-40 disabled:pointer-events-none';

    return (
        <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[#F2F2F0]', className)}>
          <div className="flex items-center gap-3 order-2 sm:order-1">
            {onPageSize && (
                <label className="flex items-center gap-2 text-[12.5px] text-[#9C9C98] font-medium shrink-0">
                    <span className="hidden sm:inline">Rows</span>
                    <select
                        value={pageSize ?? pageSizeOptions[0]}
                        onChange={e => onPageSize(Number(e.target.value))}
                        aria-label="Rows per page"
                        className="h-8 pl-2.5 pr-7 rounded-lg bg-[#F2F2F0] border border-transparent text-[12.5px] font-medium text-[#B4780B] outline-none cursor-pointer transition-colors hover:bg-[#EDEDEA] focus:bg-white focus:border-[#F59E0B]/40 focus:ring-4 focus:ring-[#F59E0B]/15"
                    >
                        {pageSizeOptions.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                </label>
            )}
            {total != null && pageSize != null ? (
                <p className="text-[12.5px] text-[#9C9C98] font-medium">
                    Showing <span className="font-semibold text-[#3A3A38] tabular-nums">{total === 0 ? 0 : from}</span>–
                    <span className="font-semibold text-[#3A3A38] tabular-nums">{to}</span> of{' '}
                    <span className="font-semibold text-[#3A3A38] tabular-nums">{total}</span>
                </p>
            ) : null}
          </div>

            {totalPages > 1 && (
                <div className="flex items-center gap-1 order-1 sm:order-2">
                    <button
                        className={cn(btn, 'text-[#5B5B58] hover:bg-[#F2F2F0]')}
                        onClick={() => onPage(Math.max(1, page - 1))}
                        disabled={page <= 1}
                        aria-label="Previous page"
                    >
                        <ChevronLeft size={15} /> Prev
                    </button>

                    {pages.map((p, i) =>
                        p === '…' ? (
                            <span key={`e${i}`} className="px-1.5 text-[#B4B4B0] text-[12.5px] select-none">…</span>
                        ) : (
                            <button
                                key={p}
                                onClick={() => onPage(p)}
                                className={cn(
                                    btn,
                                    p === page
                                        ? 'bg-[#F59E0B] text-white'
                                        : 'text-slate-600 hover:bg-slate-100',
                                )}
                                aria-current={p === page ? 'page' : undefined}
                            >
                                {p}
                            </button>
                        ),
                    )}

                    <button
                        className={cn(btn, 'text-[#5B5B58] hover:bg-[#F2F2F0]')}
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
