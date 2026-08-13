'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, RotateCcw, Search, ChevronDown, User, Calendar, Store, Globe,
    Package, AlertTriangle, Loader2, Wallet, CheckCircle2
} from 'lucide-react';
import { orderService, salesService } from '@/lib/api';
import api from '@/lib/axios';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button } from '@/components/admin/ui';

const money = (n: number) => formatCurrency(Number(n || 0));
const channelOf = (o: any) => (o?.payment_method === 'SHOP' ? 'Offline (POS)' : 'Online');
const paidOf = (o: any) => {
    const ps = (o?.payment_status || 'PAID').toUpperCase();
    const total = Number(o?.total_amount || 0);
    if (ps === 'PAID' || Number(o?.remaining_amount ?? 0) <= 0) return total;
    return Number(o?.amount_paid ?? 0);
};

export default function AddSaleReturnPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [orderId, setOrderId] = useState('');
    const [search, setSearch] = useState('');
    const [qty, setQty] = useState<Record<string, number>>({});   // itemId -> return qty
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Recent sales = DELIVERED orders from the last 7 days (the returnable window).
    useEffect(() => {
        (async () => {
            try {
                const data = await orderService.getAll({ no_pagination: 'true' });
                const rows = Array.isArray(data) ? data : (data as any)?.results || [];
                const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
                const recent = rows.filter((o: any) =>
                    (o.status || '').toUpperCase() === 'DELIVERED' &&
                    new Date(o.created_at).getTime() >= cutoff
                );
                setOrders(recent);
            } catch { toast.error('Failed to load recent sales'); }
            finally { setLoading(false); }
        })();
    }, []);

    const visibleOrders = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return orders;
        return orders.filter((o: any) =>
            (o.order_number || '').toLowerCase().includes(q) ||
            (o.customer_display_name || o.customer_name || '').toLowerCase().includes(q) ||
            (o.phone_number || '').toLowerCase().includes(q));
    }, [orders, search]);

    const order = useMemo(() => orders.find((o: any) => String(o.id) === String(orderId)), [orders, orderId]);
    const items: any[] = order?.items || [];
    const paid = order ? paidOf(order) : 0;

    const totalRefund = useMemo(
        () => items.reduce((s, it) => s + Number(it.price) * (qty[it.id] || 0), 0),
        [items, qty]
    );
    const exceedsPaid = totalRefund > paid + 0.001;
    const anyQty = Object.values(qty).some(v => v > 0);

    const selectOrder = (id: string) => {
        setOrderId(id);
        setQty({}); // reset chosen quantities
    };

    const submit = async () => {
        if (!order) return toast.error('Select a sale to return.');
        if (!anyQty) return toast.error('Enter the quantity to return for at least one item.');
        if (!reason.trim()) return toast.error('Add a reason for the return.');
        if (exceedsPaid) return toast.error(`Refund cannot exceed the amount paid (${money(paid)}).`);

        const payloadItems = items
            .filter(it => (qty[it.id] || 0) > 0)
            .map(it => ({ product_id: it.product, quantity: qty[it.id], price: Number(it.price) }));

        setSubmitting(true);
        try {
            // 1. Create the return for this sale.
            const created = await salesService.createReturn({
                order: order.id,
                reason: reason.trim(),
                refund_amount: totalRefund,
                items: payloadItems,
            });
            // 2. Accept it immediately so stock is restored and the refund is booked
            //    out of payments (money out) for the current branch.
            try {
                await api.patch(`v1/sales/returns/${created.id}/`, { status: 'ACCEPTED' });
            } catch {
                toast.error('Return created but auto-approval failed — accept it from the list.');
            }
            toast.success('Return added and refund deducted from payments.');
            router.push('/admin/sale-returns');
        } catch (e: any) {
            toast.error(e?.response?.data?.error || e?.response?.data?.detail || 'Failed to add return');
        } finally { setSubmitting(false); }
    };

    return (
        <div className="pb-20 text-left">
            <div className="max-w-[1000px] mx-auto">
                <PageHeader
                    title="Add Sale Return"
                    subtitle="Pick a recent sale (last 7 days) and refund the returned items from payments."
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Sale Returns', href: '/admin/sale-returns' }, { label: 'Add Return' }]}
                    actions={
                        <Button variant="outline" onClick={() => router.push('/admin/sale-returns')}>
                            <ArrowLeft size={14} /> Back
                        </Button>
                    }
                />

                {/* ── 1. SELECT A RECENT SALE ── */}
                <Card className="p-5 mb-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 text-[#B4780B] flex items-center justify-center"><RotateCcw size={16} /></div>
                        <div>
                            <h3 className="text-[14px] font-bold text-slate-900">Recent Sale</h3>
                            <p className="text-[11px] text-slate-400">Delivered sales from the last 7 days</p>
                        </div>
                    </div>

                    <div className="relative mb-3">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by order #, customer or phone…"
                            className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 bg-slate-50/60 text-[13px] outline-none focus:bg-white focus:border-[#F59E0B] focus:ring-4 focus:ring-[#F59E0B]/10 transition-all"
                        />
                    </div>

                    <div className="relative">
                        {/* Custom Dropdown Trigger */}
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="w-full h-11 px-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-800 outline-none focus:border-[#F59E0B] focus:ring-4 focus:ring-[#F59E0B]/10 cursor-pointer disabled:opacity-50 select-none text-left"
                        >
                            <span>
                                {loading ? 'Loading recent sales...' : order ? (
                                    <span className="flex items-center gap-2">
                                        <span className="text-[#B4780B] font-extrabold">#{order.order_number}</span>
                                        <span className="text-slate-300">|</span>
                                        <span className="text-slate-600 font-semibold">{order.customer_display_name || order.customer_name || 'Walk-in'}</span>
                                        <span className="text-slate-300">|</span>
                                        <span className="text-emerald-600 font-extrabold">Paid {money(paid)}</span>
                                    </span>
                                ) : (
                                    <span className="text-slate-400 font-medium">Choose a sale to return...</span>
                                )}
                            </span>
                            <ChevronDown size={15} className={`text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Custom Dropdown Options */}
                        {dropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                                <div className="absolute left-0 right-0 mt-1.5 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-20 divide-y divide-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-1.5 duration-200">
                                    {visibleOrders.length === 0 ? (
                                        <div className="p-4 text-center text-slate-400 text-xs font-semibold">
                                            {loading ? 'Loading recent sales...' : 'No recent sales found.'}
                                        </div>
                                    ) : (
                                        visibleOrders.map((o: any) => {
                                            const isSelected = String(o.id) === String(orderId);
                                            const opaid = paidOf(o);
                                            return (
                                                <div
                                                    key={o.id}
                                                    onClick={() => {
                                                        selectOrder(o.id);
                                                        setDropdownOpen(false);
                                                    }}
                                                    className={`p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'bg-[#F59E0B]/50 hover:bg-[#F59E0B]/10' : ''}`}
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[13px] font-black text-slate-900">#{o.order_number}</span>
                                                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-extrabold uppercase tracking-wide border ${
                                                                channelOf(o) === 'Online' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                                                            }`}>
                                                                {channelOf(o)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2.5 text-slate-500 text-[11px] font-semibold">
                                                            <span className="flex items-center gap-1"><User size={12} className="text-slate-400" /> {o.customer_display_name || o.customer_name || 'Walk-in'}</span>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="flex items-center gap-1"><Calendar size={12} className="text-slate-400" /> {new Date(o.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[12.5px] font-extrabold text-emerald-600 tabular-nums">Paid {money(opaid)}</p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Selected sale summary */}
                    {order && (
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">{channelOf(order) === 'Online' ? <Globe size={11} /> : <Store size={11} />} Type</p>
                                <p className="text-[12.5px] font-bold text-slate-800">{channelOf(order)}</p>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1"><User size={11} /> Customer</p>
                                <p className="text-[12.5px] font-bold text-slate-800 truncate">{order.customer_display_name || order.customer_name || 'Walk-in'}</p>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1"><Calendar size={11} /> Date</p>
                                <p className="text-[12.5px] font-bold text-slate-800">{formatDateTime(order.created_at)}</p>
                            </div>
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                                <p className="text-[10px] font-bold uppercase text-emerald-600/70 mb-1 flex items-center gap-1"><Wallet size={11} /> Paid</p>
                                <p className="text-[12.5px] font-black text-emerald-700 tabular-nums">{money(paid)}</p>
                            </div>
                        </div>
                    )}
                </Card>

                {/* ── 2. ITEMS TO RETURN ── */}
                {order && (
                    <Card className="p-5 mb-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center"><Package size={16} /></div>
                            <h3 className="text-[14px] font-bold text-slate-900">Items to return</h3>
                        </div>
                        <div className="border border-slate-100 rounded-xl overflow-hidden">
                            <table className="w-full text-[12.5px]">
                                <thead className="bg-slate-50/60 text-[10px] font-bold uppercase text-slate-400">
                                    <tr>
                                        <th className="px-4 py-2.5 text-left">Product</th>
                                        <th className="px-3 py-2.5 text-center">Sold</th>
                                        <th className="px-3 py-2.5 text-right">Unit</th>
                                        <th className="px-3 py-2.5 text-center w-28">Return Qty</th>
                                        <th className="px-4 py-2.5 text-right">Refund</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {items.map((it: any) => {
                                        const rq = qty[it.id] || 0;
                                        return (
                                            <tr key={it.id}>
                                                <td className="px-4 py-2.5">
                                                    <p className="font-semibold text-slate-800">{it.product_name}</p>
                                                    {(it.weight || it.size) && <p className="text-[10px] text-[#B4780B] font-bold uppercase">{it.weight}{it.weight && it.size ? ' • ' : ''}{it.size}</p>}
                                                </td>
                                                <td className="px-3 py-2.5 text-center font-bold text-slate-500">{it.quantity}</td>
                                                <td className="px-3 py-2.5 text-right text-slate-600 tabular-nums">{money(it.price)}</td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <input
                                                        type="number" min={0} max={it.quantity} value={rq || ''}
                                                        onChange={e => {
                                                            const v = Math.max(0, Math.min(Number(it.quantity), Number(e.target.value) || 0));
                                                            setQty(p => ({ ...p, [it.id]: v }));
                                                        }}
                                                        placeholder="0"
                                                        className="w-20 h-8 px-2 text-center rounded-lg border border-slate-200 text-[12.5px] tabular-nums outline-none focus:border-[#F59E0B] focus:ring-4 focus:ring-[#F59E0B]/10"
                                                    />
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-bold text-rose-600 tabular-nums">{rq > 0 ? money(Number(it.price) * rq) : '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Reason */}
                        <div className="mt-4">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Reason for return</label>
                            <textarea
                                rows={2} value={reason} onChange={e => setReason(e.target.value)}
                                placeholder="e.g. Damaged item, wrong product, customer changed mind…"
                                className="w-full rounded-xl border border-slate-200 p-3 text-[13px] outline-none focus:border-[#F59E0B] focus:ring-4 focus:ring-[#F59E0B]/10 resize-none"
                            />
                        </div>
                    </Card>
                )}

                {/* ── 3. SUMMARY + SUBMIT ── */}
                {order && (
                    <Card className="p-5">
                        {exceedsPaid && (
                            <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-[12px] text-rose-700 font-semibold">
                                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                                Refund ({money(totalRefund)}) exceeds the amount the customer paid ({money(paid)}). Reduce the return quantity.
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-bold uppercase text-slate-400">Total refund (deducted from payments)</p>
                                <p className={`text-[24px] font-black tabular-nums ${exceedsPaid ? 'text-rose-600' : 'text-slate-900'}`}>{money(totalRefund)}</p>
                            </div>
                            <Button variant="primary" onClick={submit} disabled={submitting || !anyQty || exceedsPaid} className="h-11 px-6">
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                Add Return & Refund
                            </Button>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
