'use client';

/**
 * Reusable bulk-actions toolkit for admin tables.
 *
 * Drop-in usage on any list page:
 *   const sel = useTableSelection(rows);                       // rows: any[] with `id`
 *   <SelectAllTh sel={sel} />  in the table head
 *   <RowCheckboxTd sel={sel} id={row.id} />  in each row
 *   <BulkBar
 *       sel={sel}
 *       entity="products"
 *       onDelete={(ids) => Promise.all(ids.map(id => productService.delete(id))).then(loadData)}
 *       statusActions={[{ label: 'Activate', apply: ids => ... }]}
 *       onExport={() => exportToCSV(sel.selectedItems, 'products.csv')}
 *   />
 *
 * The hook prunes ids that leave the list, exposes select-all / indeterminate
 * state, and BulkBar handles the confirm modal + busy state internally.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Trash2, X, Download, ChevronDown, AlertTriangle, Loader2, CheckSquare, FileText, Printer } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

/* ───────────────────────── hook ───────────────────────── */

export interface TableSelection<T = any> {
    selected: Set<string>;
    selectedIds: string[];
    selectedItems: T[];
    count: number;
    isSelected: (id: string | number) => boolean;
    toggle: (id: string | number) => void;
    toggleAll: () => void;
    clear: () => void;
    allSelected: boolean;
    someSelected: boolean;
}

export function useTableSelection<T = any>(
    items: T[],
    getId: (item: T) => string | number = (i: any) => i?.id,
): TableSelection<T> {
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const ids = useMemo(() => (items || []).map((i) => String(getId(i))), [items, getId]);
    const idsKey = ids.join(',');

    // Drop selections for rows that have left the list (filter/search/delete).
    useEffect(() => {
        setSelected((prev) => {
            const next = new Set([...prev].filter((id) => ids.includes(id)));
            return next.size === prev.size ? prev : next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idsKey]);

    const toggle = (id: string | number) =>
        setSelected((prev) => {
            const key = String(id);
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });

    const toggleAll = () =>
        setSelected((prev) => (prev.size >= ids.length ? new Set() : new Set(ids)));

    const clear = () => setSelected(new Set());

    const selectedIds = [...selected];
    const selectedItems = (items || []).filter((i) => selected.has(String(getId(i))));

    return {
        selected,
        selectedIds,
        selectedItems,
        count: selected.size,
        isSelected: (id) => selected.has(String(id)),
        toggle,
        toggleAll,
        clear,
        allSelected: ids.length > 0 && selected.size >= ids.length,
        someSelected: selected.size > 0 && selected.size < ids.length,
    };
}

/* ───────────────────────── checkbox primitives ───────────────────────── */

export function Checkbox({
    checked,
    indeterminate,
    onChange,
    className = '',
}: {
    checked: boolean;
    indeterminate?: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    className?: string;
}) {
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (ref.current) ref.current.indeterminate = !!indeterminate && !checked;
    }, [indeterminate, checked]);
    return (
        <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            onClick={(e) => e.stopPropagation()}
            className={`w-4 h-4 accent-[#B4780B] cursor-pointer rounded border-slate-300 ${className}`}
        />
    );
}

/** Header cell with the select-all checkbox. */
export function SelectAllTh({ sel, className = '' }: { sel: TableSelection; className?: string }) {
    return (
        <th className={`px-4 py-4 w-10 ${className}`}>
            <Checkbox
                checked={sel.allSelected}
                indeterminate={sel.someSelected}
                onChange={sel.toggleAll}
            />
        </th>
    );
}

/** Row cell with the per-row checkbox. */
export function RowCheckboxTd({
    sel,
    id,
    className = '',
}: {
    sel: TableSelection;
    id: string | number;
    className?: string;
}) {
    return (
        <td className={`px-4 py-4 w-10 ${className}`} onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={sel.isSelected(id)} onChange={() => sel.toggle(id)} />
        </td>
    );
}

/* ───────────────────────── bulk action bar ───────────────────────── */

export interface BulkStatusAction {
    label: string;
    apply: (ids: string[]) => Promise<any> | any;
}

export function BulkBar({
    sel,
    entity = 'items',
    onDelete,
    statusActions,
    onExport,
    onPdf,
    onPrint,
}: {
    sel: TableSelection;
    /** Plural noun for messaging, e.g. "products". */
    entity?: string;
    /** Called with the selected ids; should perform deletion AND refresh the list. */
    onDelete?: (ids: string[]) => Promise<any> | any;
    /** Optional status changes (Activate / Deactivate / order status, …). */
    statusActions?: BulkStatusAction[];
    /** Export the current selection (e.g. exportToCSV(sel.selectedItems, ...)). */
    onExport?: () => void;
    /** Download the current selection as a branded PDF invoice. */
    onPdf?: () => void;
    /** Print the current selection (e.g. open each invoice's print view). */
    onPrint?: (ids: string[]) => void;
}) {
    const [confirm, setConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);

    if (sel.count === 0) return null;

    const run = async (fn: () => Promise<any> | any) => {
        setBusy(true);
        try {
            await fn();
            sel.clear();
        } finally {
            setBusy(false);
            setStatusOpen(false);
        }
    };

    return (
        <>
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] animate-in slide-in-from-bottom-4 fade-in duration-300">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700/50">
                    <div className="flex items-center gap-2 pl-2 pr-3 border-r border-white/15">
                        <CheckSquare size={16} className="text-[#FBBF24]" />
                        <span className="text-[13px] font-bold tabular-nums">{sel.count}</span>
                        <span className="text-[12px] text-slate-300">selected</span>
                    </div>

                    {statusActions && statusActions.length > 0 && (
                        <div className="relative">
                            <button
                                disabled={busy}
                                onClick={() => setStatusOpen((o) => !o)}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-semibold text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                            >
                                Set status <ChevronDown size={14} />
                            </button>
                            {statusOpen && (
                                <div className="absolute bottom-full mb-2 left-0 min-w-[180px] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150">
                                    {statusActions.map((a) => (
                                        <button
                                            key={a.label}
                                            disabled={busy}
                                            onClick={() => run(() => a.apply(sel.selectedIds))}
                                            className="w-full text-left px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            {a.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {onExport && (
                        <button
                            disabled={busy}
                            onClick={onExport}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-semibold text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                            <Download size={14} /> Export
                        </button>
                    )}

                    {onPdf && (
                        <button
                            disabled={busy}
                            onClick={onPdf}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-semibold text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                            <FileText size={14} /> Download PDF
                        </button>
                    )}

                    {onPrint && (
                        <button
                            disabled={busy}
                            onClick={() => onPrint(sel.selectedIds)}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-semibold text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                            <Printer size={14} /> Print
                        </button>
                    )}

                    {onDelete && (
                        <button
                            disabled={busy}
                            onClick={() => setConfirm(true)}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors disabled:opacity-50"
                        >
                            <Trash2 size={14} /> Delete
                        </button>
                    )}

                    <button
                        onClick={sel.clear}
                        disabled={busy}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                        aria-label="Clear selection"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {onDelete && (
                <Modal
                    open={confirm}
                    onClose={() => !busy && setConfirm(false)}
                    size="sm"
                    footer={
                        <>
                            <Button variant="ghost" onClick={() => setConfirm(false)} disabled={busy}>
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                disabled={busy}
                                onClick={() =>
                                    run(async () => {
                                        await onDelete(sel.selectedIds);
                                        setConfirm(false);
                                    })
                                }
                            >
                                {busy && <Loader2 size={14} className="animate-spin" />}
                                {busy ? 'Deleting…' : `Delete ${sel.count}`}
                            </Button>
                        </>
                    }
                >
                    <div className="text-center py-2">
                        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-600 border border-rose-100">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-[20px] font-bold text-slate-900 tracking-tight">
                            Delete {sel.count} {entity}?
                        </h3>
                        <p className="text-[13px] text-slate-600 mt-3 leading-relaxed">
                            This will permanently remove the selected {entity}. This action cannot be undone.
                        </p>
                    </div>
                </Modal>
            )}
        </>
    );
}

export default BulkBar;
