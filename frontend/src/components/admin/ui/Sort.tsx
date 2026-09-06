'use client';

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export type SortDir = 'asc' | 'desc';
export interface SortState {
    key: string | null;
    dir: SortDir;
    toggle: (k: string) => void;
}

/**
 * Reusable client-side table sorter. Auto-detects numeric vs text columns.
 * Pass an optional `accessor` to map a column key to a comparable value.
 */
export function useSort<T = any>(
    rows: T[],
    initialKey: string | null = null,
    initialDir: SortDir = 'desc',
    accessor?: (row: T, key: string) => any,
): { sorted: T[]; key: string | null; dir: SortDir; toggle: (k: string) => void } {
    const [key, setKey] = useState<string | null>(initialKey);
    const [dir, setDir] = useState<SortDir>(initialDir);

    const toggle = (k: string) => {
        if (key === k) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else { setKey(k); setDir('asc'); }
    };

    const sorted = useMemo(() => {
        if (!key) return rows;
        const get = (o: any) => (accessor ? accessor(o, key) : o?.[key]);
        return [...rows].sort((a, b) => {
            let av = get(a);
            let bv = get(b);
            const an = Number(av);
            const bn = Number(bv);
            const numeric =
                av != null && bv != null && String(av).trim() !== '' && String(bv).trim() !== '' &&
                !isNaN(an) && !isNaN(bn);
            if (numeric) return dir === 'asc' ? an - bn : bn - an;
            av = String(av ?? '').toLowerCase();
            bv = String(bv ?? '').toLowerCase();
            if (av < bv) return dir === 'asc' ? -1 : 1;
            if (av > bv) return dir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [rows, key, dir, accessor]);

    return { sorted, key, dir, toggle };
}

/** A clickable, sort-aware table header cell. */
export function SortableTh({
    label, sortKey, sort, className = '', align = 'left',
}: {
    label: string;
    sortKey: string;
    sort: SortState;
    className?: string;
    align?: 'left' | 'right' | 'center';
}) {
    const active = sort.key === sortKey;
    return (
        <th className={className}>
            <button
                type="button"
                onClick={() => sort.toggle(sortKey)}
                className={`inline-flex items-center gap-1 hover:text-[#1A1A1A] transition-colors select-none ${align === 'right' ? 'flex-row-reverse' : ''} ${active ? 'text-[#1A1A1A]' : ''}`}
            >
                {label}
                {active
                    ? (sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
                    : <ChevronsUpDown size={12} className="opacity-40" />}
            </button>
        </th>
    );
}
