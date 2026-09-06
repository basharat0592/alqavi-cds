'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    Wallet, Plus, Trash2, CheckCircle2, Clock, AlertTriangle, Loader2,
    CalendarClock, Paperclip, X,
} from 'lucide-react';
import { installmentService, InstallmentSourceType } from '@/services/payment.service';
import { Modal } from '@/components/admin/ui';

const METHODS: { value: string; label: string }[] = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'online', label: 'Online / UPI' },
    { value: 'wallet', label: 'Mobile Wallet' },
    { value: 'other', label: 'Other' },
];

export interface PaymentPanelProps {
    sourceType: InstallmentSourceType;
    sourceId: string | number;
    /** Transaction total (or refund target for returns). */
    total: number;
    /** 'inbound' = money we receive (sale), 'outbound' = money we pay (purchase / refund). */
    direction?: 'inbound' | 'outbound';
    /** Current due date stored on the parent (yyyy-mm-dd) — shown + editable. */
    dueDate?: string | null;
    /** Persist a new due date on the parent transaction (parent owns the API call). */
    onDueDateChange?: (isoDate: string) => void | Promise<void>;
    /** Called after any installment is added/removed so the parent can refresh. */
    onChanged?: () => void;
    currency?: string;
    /** Show the "needs verification" toggle (supplier/counterparty confirms). */
    allowVerify?: boolean;
    readOnly?: boolean;
    className?: string;
}

const fmt = (n: number, cur = 'Rs') =>
    `${cur} ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const fmtDateTime = (iso: string) => {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString(undefined, {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    } catch { return iso; }
};

const localNow = () => {
    // yyyy-MM-ddTHH:mm for <input type="datetime-local">, in local time.
    const d = new Date();
    const pad = (x: number) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function PaymentPanel({
    sourceType, sourceId, total, direction = 'inbound', dueDate,
    onDueDateChange, onChanged, currency = 'Rs', allowVerify = false,
    readOnly = false, className = '',
}: PaymentPanelProps) {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // add-form state
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('cash');
    const [paidAt, setPaidAt] = useState(localNow());
    const [reference, setReference] = useState('');
    const [note, setNote] = useState('');
    const [slip, setSlip] = useState<File | null>(null);
    const [needsVerify, setNeedsVerify] = useState(false);
    const [localDue, setLocalDue] = useState(dueDate || '');

    useEffect(() => { setLocalDue(dueDate || ''); }, [dueDate]);

    const load = async () => {
        setLoading(true);
        try {
            const data = await installmentService.list(sourceType, sourceId);
            setItems(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setError('Could not load payment history.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (sourceId) load(); /* eslint-disable-next-line */ }, [sourceType, sourceId]);

    const paid = useMemo(
        () => items.filter(i => i.status === 'confirmed').reduce((s, i) => s + Number(i.amount || 0), 0),
        [items],
    );
    const pendingAmt = useMemo(
        () => items.filter(i => i.status === 'pending').reduce((s, i) => s + Number(i.amount || 0), 0),
        [items],
    );
    const remaining = Math.max(0, Number(total || 0) - paid);
    const pct = total > 0 ? Math.min(100, Math.round((paid / Number(total)) * 100)) : 0;

    // Prefill the Amount field with this sale's remaining balance so it shows directly
    // (updates after the history loads and after each payment). Only fills when the
    // field is empty, so it never overwrites a value the user has typed/cleared.
    useEffect(() => {
        if (!loading && !readOnly && remaining > 0 && amount === '') {
            setAmount(String(Number(remaining.toFixed(2))));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, remaining, readOnly]);

    const addPayment = async () => {
        const amt = Number(amount);
        if (!amt || amt <= 0) { setError('Enter a valid amount.'); return; }
        setSaving(true);
        setError(null);
        try {
            const fd = new FormData();
            fd.append('source_type', sourceType);
            fd.append('source_id', String(sourceId));
            fd.append('amount', String(amt));
            fd.append('method', method);
            fd.append('paid_at', new Date(paidAt).toISOString());
            fd.append('reference', reference);
            fd.append('note', note);
            fd.append('direction', direction);
            fd.append('status', needsVerify ? 'pending' : 'confirmed');
            if (slip) fd.append('slip', slip);
            await installmentService.create(fd);
            setAmount(''); setReference(''); setNote(''); setSlip(null); setNeedsVerify(false);
            setPaidAt(localNow());
            await load();
            onChanged?.();
        } catch (e: any) {
            setError(e?.response?.data ? JSON.stringify(e.response.data) : 'Failed to record payment.');
        } finally {
            setSaving(false);
        }
    };

    const removePayment = async (id: number) => {
        setSaving(true);
        try {
            await installmentService.delete(id);
            await load();
            onChanged?.();
        } catch {
            setError('Failed to delete payment.');
        } finally {
            setSaving(false);
        }
    };

    const toggleConfirm = async (item: any) => {
        setSaving(true);
        try {
            await installmentService.update(item.id, {
                status: item.status === 'confirmed' ? 'pending' : 'confirmed',
            });
            await load();
            onChanged?.();
        } catch {
            setError('Failed to update payment.');
        } finally {
            setSaving(false);
        }
    };

    const persistDue = async (val: string) => {
        setLocalDue(val);
        if (onDueDateChange && val) await onDueDateChange(val);
    };

    const statusColor = remaining <= 0
        ? 'text-emerald-600'
        : paid > 0 ? 'text-amber-600' : 'text-rose-600';
    const statusLabel = remaining <= 0 ? 'Fully settled' : paid > 0 ? 'Partially settled' : 'Unsettled';

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</p>
                    <p className="text-[15px] font-bold text-slate-900 tabular-nums">{fmt(total, currency)}</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Paid</p>
                    <p className="text-[15px] font-bold text-emerald-700 tabular-nums">{fmt(paid, currency)}</p>
                </div>
                <div className={`rounded-xl border px-3 py-2.5 ${remaining > 0 ? 'border-rose-100 bg-rose-50/60' : 'border-slate-200 bg-slate-50/60'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${remaining > 0 ? 'text-rose-500' : 'text-slate-400'}`}>Remaining</p>
                    <p className={`text-[15px] font-bold tabular-nums ${remaining > 0 ? 'text-rose-600' : 'text-slate-500'}`}>{fmt(remaining, currency)}</p>
                </div>
            </div>

            {/* Progress */}
            <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className={statusColor}>{statusLabel}</span>
                    <span className="text-slate-400 tabular-nums">{pct}%{pendingAmt > 0 ? ` · ${fmt(pendingAmt, currency)} awaiting verification` : ''}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${remaining <= 0 ? 'bg-emerald-500' : 'bg-[#F59E0B]'}`} style={{ width: `${pct}%` }} />
                </div>
            </div>

            {/* Due date */}
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5">
                <CalendarClock className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-[12px] font-semibold text-slate-600">Payment due date</span>
                <input
                    type="date"
                    value={localDue || ''}
                    disabled={readOnly || !onDueDateChange}
                    onChange={e => persistDue(e.target.value)}
                    className="ml-auto h-8 rounded-lg border border-slate-200 px-2.5 text-[12.5px] text-slate-800 outline-none focus:border-[#F59E0B] focus:ring-4 focus:ring-[#F59E0B]/10 disabled:bg-slate-50 disabled:text-slate-400"
                />
            </div>

            {/* History */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50/70 border-b border-slate-100">
                    <Wallet className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Payment History</span>
                    <span className="ml-auto text-[10px] font-bold text-slate-400">{items.length} record{items.length !== 1 ? 's' : ''}</span>
                </div>
                {loading ? (
                    <div className="px-3 py-6 text-center text-[12px] text-slate-400 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                    </div>
                ) : items.length === 0 ? (
                    <div className="px-3 py-6 text-center text-[12px] text-slate-400">No payments recorded yet.</div>
                ) : (
                    <div className="divide-y divide-slate-50 max-h-56 overflow-y-auto">
                        {items.map((it, idx) => (
                            <div key={it.id} className="flex items-center gap-3 px-3 py-2">
                                <span className={`flex items-center justify-center w-6 h-6 rounded-lg shrink-0 ${it.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600' : it.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {it.status === 'confirmed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : it.status === 'pending' ? <Clock className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[12.5px] font-semibold text-slate-800 tabular-nums">
                                        {fmt(Number(it.amount), currency)}
                                        <span className="ml-2 text-[10.5px] font-medium text-slate-400 uppercase">{(METHODS.find(m => m.value === it.method)?.label) || it.method}</span>
                                    </p>
                                    <p className="text-[10.5px] text-slate-400 truncate">
                                        Payment {idx + 1} · {fmtDateTime(it.paid_at)}{it.reference ? ` · ${it.reference}` : ''}
                                        {it.created_by_name ? ` · by ${it.created_by_name}` : ''}
                                        {it.status === 'pending' ? ' · awaiting verification' : ''}
                                    </p>
                                </div>
                                {it.slip_url && (
                                    <a href={it.slip_url} target="_blank" rel="noreferrer" className="p-1 text-slate-400 hover:text-[#0E7F98]" title="View slip">
                                        <Paperclip className="w-3.5 h-3.5" />
                                    </a>
                                )}
                                {!readOnly && allowVerify && it.status !== 'confirmed' && (
                                    <button onClick={() => toggleConfirm(it)} disabled={saving} className="text-[10.5px] font-bold text-emerald-600 hover:underline" title="Confirm">Verify</button>
                                )}
                                {!readOnly && (
                                    <button onClick={() => removePayment(it.id)} disabled={saving} className="p-1 text-slate-300 hover:text-rose-600" title="Delete">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add payment */}
            {!readOnly && remaining > 0 && (
                <div className="rounded-xl border border-[#F59E0B]/15 bg-[#F59E0B]/30 p-3 space-y-2.5">
                    <div className="flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5 text-[#1A1A1A]" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]">Record a Payment</span>
                        <button
                            type="button"
                            onClick={() => setAmount(String(remaining))}
                            className="ml-auto text-[10.5px] font-bold text-[#119AB8] hover:underline"
                        >
                            Pay full ({fmt(remaining, currency)})
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">Amount</label>
                            <input
                                type="number" min={0} max={remaining} value={amount}
                                onChange={e => setAmount(e.target.value)} placeholder="0.00"
                                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-[13px] outline-none focus:border-[#F59E0B] focus:ring-4 focus:ring-[#F59E0B]/10 tabular-nums"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">Method</label>
                            <select value={method} onChange={e => setMethod(e.target.value)}
                                className="w-full h-9 px-2 rounded-lg border border-slate-200 text-[13px] bg-white outline-none focus:border-[#F59E0B] focus:ring-4 focus:ring-[#F59E0B]/10">
                                {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">Date &amp; Time</label>
                            <input type="datetime-local" value={paidAt} onChange={e => setPaidAt(e.target.value)}
                                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-[12.5px] outline-none focus:border-[#F59E0B] focus:ring-4 focus:ring-[#F59E0B]/10" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">Reference / Cheque #</label>
                            <input value={reference} onChange={e => setReference(e.target.value)} placeholder="Optional"
                                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-[13px] outline-none focus:border-[#F59E0B] focus:ring-4 focus:ring-[#F59E0B]/10" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <label className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-slate-600 cursor-pointer">
                            <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                            <span>{slip ? slip.name.slice(0, 18) : 'Attach slip'}</span>
                            <input type="file" accept="image/*,application/pdf" className="hidden"
                                onChange={e => setSlip(e.target.files?.[0] || null)} />
                        </label>
                        {allowVerify && (
                            <label className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-slate-600 cursor-pointer">
                                <input type="checkbox" checked={needsVerify} onChange={e => setNeedsVerify(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-[#1A1A1A] focus:ring-[#F59E0B]" />
                                Needs verification
                            </label>
                        )}
                        <button
                            onClick={addPayment} disabled={saving || !amount}
                            className="ml-auto inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-white text-[12.5px] font-bold disabled:opacity-50 transition-colors"
                        >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            Add Payment
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <p className="flex items-start gap-1.5 text-[11.5px] text-rose-600 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {error}
                </p>
            )}
        </div>
    );
}

/** Convenience modal wrapper around PaymentPanel for list pages. */
export function PaymentModal({
    open, onClose, title = 'Manage Payments', ...panel
}: { open: boolean; onClose: () => void; title?: string } & PaymentPanelProps) {
    return (
        <Modal open={open} onClose={onClose} title={title} size="lg">
            <PaymentPanel {...panel} />
        </Modal>
    );
}

export default PaymentPanel;
