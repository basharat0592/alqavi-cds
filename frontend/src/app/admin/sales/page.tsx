"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { orderService, Order } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime, exportToCSV } from '@/lib/utils';
import {
    ShoppingBag, Search, RefreshCw,
    Plus, Loader2, User, CreditCard, Trash2, AlertTriangle, Clock, Warehouse,
    Printer, Wallet, Package, Phone, MapPin, Calendar, Store, Globe, ChevronDown, X, SlidersHorizontal
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Badge, Modal, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar } from '@/components/admin/ui';
import { PaymentModal } from '@/components/admin/PaymentPanel';

const STATUS_FILTERS = ['All', 'Delivered', 'Cancelled'];

/** Small payment-status chip used in the sales registry. */
function PayStatusCell({ o }: { o: any }) {
    // Cancelled / rejected sales are void — no money was collected.
    if (['CANCELLED', 'REJECTED'].includes((o.status || '').toUpperCase())) {
        return <div className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-tighter">No payment</div>;
    }
    const status = (o.payment_status || 'PAID').toUpperCase();
    const remaining = Number(o.remaining_amount ?? 0);
    if (status === 'PAID' || remaining <= 0) {
        return <div className="text-[10px] text-emerald-600 font-black uppercase mt-1 tracking-tighter">Paid in full</div>;
    }
    const overdue = o.is_overdue;
    return (
        <div className="mt-1 space-y-0.5">
            <div className={`text-[10px] font-black uppercase tracking-tighter ${status === 'PARTIAL' ? 'text-amber-600' : 'text-rose-600'}`}>
                {status === 'PARTIAL' ? 'Partially paid' : 'Unpaid'} · {formatCurrency(remaining)} due
            </div>
            {o.due_date && (
                <div className={`text-[9.5px] font-bold ${overdue ? 'text-rose-600' : 'text-slate-400'}`}>
                    {overdue ? `${o.days_overdue}d overdue` : `Due ${o.due_date}`}
                </div>
            )}
        </div>
    );
}

export default function SalesPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    // Seed the search from ?search= so deep links (e.g. a dashboard "Payments Due"
    // row) land on the list pre-filtered to that order.
    const [searchTerm, setSearchTerm] = useState(() => {
        if (typeof window === 'undefined') return '';
        return new URLSearchParams(window.location.search).get('search') || '';
    });
    const [statusFilter, setStatusFilter] = useState('All');
    const [channelFilter, setChannelFilter] = useState('All');   // All | POS | Online
    const [payFilter, setPayFilter] = useState('All');           // All | Paid | Partial | Unpaid
    const [updatingRow, setUpdatingRow] = useState<string | null>(null);
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
    const [payOrder, setPayOrder] = useState<any | null>(null);
    const [viewOrder, setViewOrder] = useState<any | null>(null);

    // Channel (POS counter vs online store) + effective settlement status.
    const channelOf = (o: any) => (o.payment_method === 'SHOP' ? 'POS' : 'Online');
    const effectivePay = (o: any): 'PAID' | 'PARTIAL' | 'UNPAID' | 'VOID' => {
        // Cancelled / rejected sales are void — no payment is counted (paid 0).
        if (['CANCELLED', 'REJECTED'].includes((o.status || '').toUpperCase())) return 'VOID';
        const ps = (o.payment_status || 'PAID').toUpperCase();
        if (ps === 'PAID' || Number(o.remaining_amount ?? 0) <= 0) return 'PAID';
        return ps === 'PARTIAL' ? 'PARTIAL' : 'UNPAID';
    };

    const handleQuickStatusUpdate = async (orderId: string, newStatus: string) => {
        setUpdatingRow(orderId);
        try {
            await orderService.update(orderId, { status: newStatus.toUpperCase() });
            setOrders(prev => prev.map(o => o.id.toString() === orderId ? { ...o, status: newStatus.toUpperCase() } : o));
            toast.success('Status updated');
        } catch (error) { toast.error('Update failed'); } finally { setUpdatingRow(null); }
    };

    const handleDelete = async () => {
        if (!orderToDelete) return;
        setUpdatingRow(orderToDelete.id.toString());
        try {
            await orderService.delete(orderToDelete.id.toString());
            setOrders(prev => prev.filter(o => o.id.toString() !== orderToDelete.id.toString()));
            toast.success('Sale record deleted successfully.');
            setOrderToDelete(null);
        } catch (error) { toast.error('Delete failed'); setUpdatingRow(null); }
    };

    const loadOrders = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await orderService.getAll();
            const rawOrders = Array.isArray(data) ? data : (data as any).results || [];
            // Strictly enforce that Sales Registry only contains history (Delivered/Cancelled)
            setOrders(rawOrders.filter((o: any) =>
                ['DELIVERED', 'CANCELLED'].includes((o.status || '').toUpperCase())
            ));
        } catch { toast.error('Connection failure'); } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    // AUTO-SYNC (2s)
    useEffect(() => {
        const interval = setInterval(() => {
            if (!loading && !updatingRow) loadOrders(true);
        }, 2000);
        return () => clearInterval(interval);
    }, [loading, updatingRow, loadOrders]);

    const filtered = (orders || []).filter(o => {
        const q = searchTerm.toLowerCase();
        const matchesSearch = (o.order_number || '').toLowerCase().includes(q)
            || o.id.toString().includes(q)
            || ((o as any).customer_name || '').toLowerCase().includes(q)
            || ((o as any).customer_display_name || '').toLowerCase().includes(q)
            || ((o as any).phone_number || '').toLowerCase().includes(q);
        const matchesStatus = statusFilter === 'All' || o.status.toLowerCase() === statusFilter.toLowerCase();
        const matchesChannel = channelFilter === 'All' || channelOf(o) === channelFilter;
        const matchesPay = payFilter === 'All' || effectivePay(o) === payFilter.toUpperCase();
        return matchesSearch && matchesStatus && matchesChannel && matchesPay;
    });

    const getStatusTone = (status: string): 'neutral' | 'indigo' | 'green' | 'amber' | 'red' | 'blue' => {
        const s = status.toLowerCase();
        if (s === 'pending') return 'amber';
        if (s === 'confirmed' || s === 'processing') return 'blue';
        if (s === 'shipped') return 'indigo';
        if (s === 'delivered') return 'green';
        if (s === 'cancelled') return 'red';
        return 'neutral';
    };

    const sel = useTableSelection(filtered);

    const bulkDelete = async (ids: string[]) => {
        await Promise.allSettled(ids.map(id => orderService.delete(id)));
        setOrders(prev => prev.filter(o => !ids.includes(o.id.toString())));
        toast.success(`${ids.length} sale record(s) deleted`);
    };

    if (loading && orders.length === 0) return <PageLoader />;

    return (
        <div className="pb-20 text-left">
            <div className="max-w-[1440px] mx-auto">
                <PageHeader
                    title="Sales History"
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Sales History' }]}
                    actions={
                        <>
                            <Button variant="outline" onClick={() => loadOrders()} disabled={loading}>
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                                <span className="hidden sm:inline">Refresh</span>
                            </Button>
                            <Button variant="primary" onClick={() => router.push('/admin/sale')} className="whitespace-nowrap">
                                <Plus size={14} /> New Sale
                            </Button>
                        </>
                    }
                />

                {/* Filters */}
                <Card className="p-3 sm:p-4 mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                        {/* Search */}
                        <div className="relative flex-1 min-w-0">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search by order #, customer or phone…"
                                className="w-full h-11 pl-11 pr-9 rounded-xl border border-slate-200 bg-slate-50/70 text-[13px] font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                                    <X size={15} />
                                </button>
                            )}
                        </div>

                        {/* Status segmented control */}
                        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 shrink-0 self-start xl:self-auto">
                            {STATUS_FILTERS.map(f => (
                                <button
                                    key={f}
                                    onClick={() => setStatusFilter(f)}
                                    className={`h-9 px-3.5 sm:px-4 rounded-lg text-[12px] font-bold transition-all ${statusFilter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        {/* Channel + Payment dropdowns */}
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="relative flex-1 xl:flex-none">
                                <Store size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                                <select
                                    value={channelFilter}
                                    onChange={e => setChannelFilter(e.target.value)}
                                    className={`w-full xl:w-auto h-11 pl-9 pr-8 rounded-xl border text-[12.5px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none cursor-pointer transition-all ${channelFilter !== 'All' ? 'border-indigo-300 bg-indigo-50/60 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                                >
                                    <option value="All">All Channels</option>
                                    <option value="POS">POS / Counter</option>
                                    <option value="Online">Online Store</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                            </div>

                            <div className="relative flex-1 xl:flex-none">
                                <Wallet size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                                <select
                                    value={payFilter}
                                    onChange={e => setPayFilter(e.target.value)}
                                    className={`w-full xl:w-auto h-11 pl-9 pr-8 rounded-xl border text-[12.5px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none cursor-pointer transition-all ${payFilter !== 'All' ? 'border-indigo-300 bg-indigo-50/60 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                                >
                                    <option value="All">All Payments</option>
                                    <option value="Paid">Paid in full</option>
                                    <option value="Partial">Partially paid</option>
                                    <option value="Unpaid">Unpaid</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                            </div>
                        </div>
                    </div>

                    {/* Result count + clear */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                        <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5">
                            <SlidersHorizontal size={12} className="text-slate-300" />
                            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                            {orders.length ? <span className="text-slate-300">of {orders.length}</span> : null}
                        </span>
                        {(searchTerm || statusFilter !== 'All' || channelFilter !== 'All' || payFilter !== 'All') && (
                            <button
                                onClick={() => { setSearchTerm(''); setStatusFilter('All'); setChannelFilter('All'); setPayFilter('All'); }}
                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 transition-colors"
                            >
                                <X size={12} /> Clear filters
                            </button>
                        )}
                    </div>
                </Card>

                {/* ── Mobile Card List (hidden on md+) ── */}
                <div className="md:hidden space-y-3 mb-6">
                    {filtered.length === 0 ? (
                        <Card className="py-16 text-center">
                            <div className="text-slate-200 mb-3"><ShoppingBag size={48} className="mx-auto" /></div>
                            <p className="text-[13px] text-slate-500 font-medium">No sales found.</p>
                        </Card>
                    ) : filtered.map(o => (
                        <Card key={o.id} className="p-4 space-y-3">
                            {/* Row 1: Order # + Amount */}
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <button onClick={() => setViewOrder(o)} className="text-[13.5px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
                                        #{o.order_number || o.id}
                                    </button>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium mt-0.5">
                                        <Clock size={10} />
                                        {formatDateTime(o.created_at)}
                                    </div>
                                    {(o as any).warehouse_name && (
                                        <div className="text-[10px] text-indigo-600 font-black uppercase tracking-tighter mt-0.5 flex items-center gap-1">
                                            <Warehouse size={10} className="opacity-60" />{(o as any).warehouse_name}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-[13.5px] font-black text-slate-900 tabular-nums">{formatCurrency(o.total_amount)}</div>
                                    <Badge tone={getStatusTone(o.status)} className="mt-1">
                                        {o.status}
                                    </Badge>
                                </div>
                            </div>

                            {/* Row 2: Customer + Payment */}
                            <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                                <div className="flex items-center gap-2">
                                    <User size={13} className="text-slate-400" />
                                    <div>
                                        <div className="text-[12px] font-bold text-slate-900">{(o as any).customer_display_name || (o as any).customer_name || 'Counter Guest'}</div>
                                        {(o as any).customer_type === 'walkin'
                                            ? <div className="text-[10px] text-slate-400 italic">Walk-in · POS</div>
                                            : <div className="text-[10px] text-emerald-600/80 font-semibold">Registered account</div>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-900 justify-end">
                                        <CreditCard size={11} className="text-slate-400" />
                                        {o.payment_method || 'Cash'}
                                        <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase ${channelOf(o) === 'POS' ? 'bg-violet-50 text-violet-600' : 'bg-sky-50 text-sky-600'}`}>{channelOf(o)}</span>
                                    </div>
                                    {(() => {
                                        const ps = effectivePay(o);
                                        const cls = ps === 'PAID' ? 'text-emerald-600' : ps === 'PARTIAL' ? 'text-amber-600' : ps === 'UNPAID' ? 'text-rose-600' : 'text-slate-400';
                                        const label = ps === 'PAID' ? 'Paid in full' : ps === 'PARTIAL' ? 'Partially paid' : ps === 'UNPAID' ? 'Unpaid' : 'No payment';
                                        return <div className={`text-[9px] font-black uppercase tracking-tighter mt-0.5 ${cls}`}>{label}</div>;
                                    })()}
                                </div>
                            </div>

                            {/* Row 3: Actions */}
                            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-2.5">
                                <button onClick={() => setViewOrder(o)} className="text-[12px] font-bold text-slate-600 hover:underline">View</button>
                                <span className="text-slate-300">|</span>
                                <button onClick={() => router.push(`/admin/sales/${o.id}/invoice`)} className="text-[12px] font-bold text-slate-600 hover:underline">Print</button>
                                <span className="text-slate-300">|</span>
                                <button onClick={() => setOrderToDelete(o as Order)} className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* ── Desktop Table (hidden on mobile) ── */}
                <Card className="hidden md:block overflow-hidden animate-in fade-in duration-700">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/60 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                <SelectAllTh sel={sel} />
                                <th className="px-6 py-3">Order Details</th>
                                <th className="px-6 py-3">Customer</th>
                                <th className="px-6 py-3">Payment</th>
                                <th className="px-6 py-3">Modified</th>
                                <th className="px-6 py-3 text-right">Grand Total</th>
                                <th className="px-6 py-3 text-right">Controls</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={7} className="py-24 text-center">
                                    <div className="text-slate-200 mb-4"><ShoppingBag size={60} className="mx-auto" /></div>
                                    <p className="text-[14px] text-slate-500 font-medium">No sales found matching your criteria.</p>
                                </td></tr>
                            ) : (
                                filtered.map(o => (
                                    <tr key={o.id} className="hover:bg-slate-50 transition-colors group text-[13px]">
                                        <RowCheckboxTd sel={sel} id={o.id} />
                                        <td className="px-6 py-4">
                                            <div className="text-[13px] font-bold text-indigo-600 group-hover:text-indigo-700 group-hover:underline cursor-pointer" onClick={() => setViewOrder(o)}>
                                                #{o.order_number || o.id}
                                            </div>
                                            <div className="flex flex-col gap-1 mt-1">
                                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                                                    <Clock size={12} className="text-slate-400" /> {formatDateTime(o.created_at)}
                                                </div>
                                                {(o as any).warehouse_name && (
                                                    <div className="text-[10px] text-indigo-600 flex items-center gap-1.5 font-black uppercase tracking-tighter">
                                                        <Warehouse size={10} className="opacity-60" /> {(o as any).warehouse_name}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-900 font-bold flex items-center gap-2">
                                                <User size={14} className="text-slate-400" /> {(o as any).customer_display_name || (o as any).customer_name || 'Counter Guest'}
                                            </div>
                                            {(o as any).customer_type === 'walkin'
                                                ? <div className="text-[10.5px] text-slate-400 mt-1 font-medium italic">Walk-in · POS</div>
                                                : <div className="text-[10.5px] text-emerald-600/80 mt-1 font-semibold">Registered account</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-900 font-bold">
                                                <CreditCard size={14} className="text-slate-400" /> {o.payment_method || 'Cash'}
                                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight ${channelOf(o) === 'POS' ? 'bg-violet-50 text-violet-600 border border-violet-100' : 'bg-sky-50 text-sky-600 border border-sky-100'}`}>
                                                    {channelOf(o) === 'POS' ? <Store size={9} /> : <Globe size={9} />}{channelOf(o)}
                                                </span>
                                            </div>
                                            <PayStatusCell o={o} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-[12px] text-slate-900 font-bold tabular-nums">
                                                {new Date(o.updated_at || o.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-black uppercase mt-0.5 tracking-tighter tabular-nums">
                                                {new Date(o.updated_at || o.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-[13.5px] font-black text-slate-900 tabular-nums">{formatCurrency(o.total_amount)}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Net Amount</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2.5 transition-opacity">
                                                {Number((o as any).remaining_amount ?? 0) > 0 &&
                                                  !['DELIVERED', 'CANCELLED'].includes((o.status || '').toUpperCase()) && (
                                                    <>
                                                        <button onClick={() => setPayOrder(o)} className="text-[12px] font-bold text-indigo-600 hover:underline">Collect</button>
                                                        <span className="text-slate-300">|</span>
                                                    </>
                                                )}
                                                <button onClick={() => setViewOrder(o)} className="text-[12px] font-bold text-slate-600 hover:underline">View</button>
                                                <span className="text-slate-300">|</span>
                                                <button onClick={() => router.push(`/admin/sales/${o.id}/invoice`)} className="text-[12px] font-bold text-slate-600 hover:underline">Print</button>
                                                <span className="text-slate-300">|</span>
                                                <button onClick={() => setOrderToDelete(o as Order)} className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </Card>

                <BulkBar
                    sel={sel}
                    entity="sales"
                    onDelete={bulkDelete}
                    onExport={() => exportToCSV(
                        sel.selectedItems.map((o: any) => ({
                            order_number: o.order_number || o.id,
                            customer_name: o.customer_name || 'Counter Guest',
                            payment_method: o.payment_method || 'Cash',
                            status: o.status || '',
                            total_amount: o.total_amount ?? 0,
                            warehouse: o.warehouse_name || '',
                            date: formatDateTime(o.created_at),
                        })),
                        'sales.csv',
                    )}
                />

                {/* Summary Note */}
                <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-4 items-start animate-in fade-in duration-1000">
                    <AlertTriangle className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                    <div>
                        <p className="text-[13px] font-bold text-slate-900">Order Integrity</p>
                        <p className="text-[12px] text-slate-600 leading-relaxed">Status changes here are permanent and will trigger stock adjustments where applicable. Ensure you verify physical delivery before marking as 'Delivered'.</p>
                    </div>
                </div>
                {/* Delete Confirmation Modal */}
                <Modal
                    open={!!orderToDelete}
                    onClose={() => setOrderToDelete(null)}
                    title="Delete Sale Record"
                    size="sm"
                    footer={orderToDelete && (
                        <>
                            <Button variant="secondary" onClick={() => setOrderToDelete(null)} disabled={updatingRow === orderToDelete.id.toString()}>Cancel</Button>
                            <Button variant="danger" onClick={handleDelete} disabled={updatingRow === orderToDelete.id.toString()}>
                                {updatingRow === orderToDelete.id.toString() ? <Loader2 size={14} className="animate-spin" /> : 'Yes, Delete'}
                            </Button>
                        </>
                    )}
                >
                    {orderToDelete && (
                        <div className="space-y-4 text-left">
                            <div className="flex justify-center mb-2">
                                <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center">
                                    <Trash2 size={24} className="text-rose-600" />
                                </div>
                            </div>
                            <div className="text-center">
                                <h3 className="text-[15px] font-bold text-slate-900 leading-snug">Permanently delete this order?</h3>
                                <p className="text-[12px] text-slate-600 mt-2 leading-relaxed">
                                    You are about to delete Sale <strong>#{(orderToDelete as any).order_number || orderToDelete.id}</strong>. This action is irreversible and will remove the record entirely.
                                </p>
                            </div>
                        </div>
                    )}
                </Modal>

                {/* Collect-balance modal for credit / partial sales */}
                {payOrder && (
                    <PaymentModal
                        open={!!payOrder}
                        onClose={() => setPayOrder(null)}
                        title={`Payments · Sale #${payOrder.order_number || payOrder.id}`}
                        sourceType="order"
                        sourceId={payOrder.id}
                        total={Number(payOrder.total_amount || 0)}
                        direction="inbound"
                        dueDate={payOrder.due_date || ''}
                        onDueDateChange={async (d) => { try { await orderService.setDueDate(String(payOrder.id), d); } catch { } }}
                        onChanged={() => loadOrders(true)}
                    />
                )}

                {/* ── SALE DETAILS (VIEW) MODAL ── */}
                {viewOrder && (() => {
                    const o: any = viewOrder;
                    const ps = effectivePay(o);
                    const voided = ps === 'VOID';
                    const total = Number(o.total_amount || 0);
                    const paid = voided ? 0 : (ps === 'PAID' ? total : Number(o.amount_paid ?? 0));
                    const remaining = voided ? 0 : Math.max(0, Number(o.remaining_amount ?? (total - paid)));
                    const psCls = ps === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : ps === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : ps === 'UNPAID' ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200';
                    const psLabel = ps === 'PAID' ? 'Paid in full' : ps === 'PARTIAL' ? 'Partially paid' : ps === 'UNPAID' ? 'Unpaid' : 'Cancelled · No payment';
                    return (
                        <Modal
                            open={!!viewOrder}
                            onClose={() => setViewOrder(null)}
                            title={`Sale #${o.order_number || o.id}`}
                            size="lg"
                            footer={
                                <div className="flex items-center justify-between w-full gap-2">
                                    <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-black uppercase tracking-tight ${psCls}`}>{psLabel}</span>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" onClick={() => router.push(`/admin/sales/${o.id}/invoice`)}>
                                            <Printer size={14} /> Print
                                        </Button>
                                        {remaining > 0 && (
                                            <Button variant="primary" onClick={() => { setPayOrder(o); setViewOrder(null); }}>
                                                <Wallet size={14} /> Collect Payment
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            }
                        >
                            <div className="space-y-5 text-left">
                                {/* Meta row */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge tone={getStatusTone(o.status)}>{o.status}</Badge>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${channelOf(o) === 'POS' ? 'bg-violet-50 text-violet-600 border border-violet-100' : 'bg-sky-50 text-sky-600 border border-sky-100'}`}>
                                        {channelOf(o) === 'POS' ? <Store size={10} /> : <Globe size={10} />}{channelOf(o)}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
                                        <Clock size={12} className="text-slate-400" /> {formatDateTime(o.created_at)}
                                    </span>
                                    {o.warehouse_name && (
                                        <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 font-bold">
                                            <Warehouse size={12} /> {o.warehouse_name}
                                        </span>
                                    )}
                                </div>

                                {/* Customer */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1"><User size={11} /> Customer</p>
                                        <p className="text-[13px] font-bold text-slate-900">{o.customer_display_name || o.customer_name || 'Walk-in Customer'}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1"><Phone size={11} /> Phone</p>
                                        <p className="text-[13px] font-semibold text-slate-700">{o.customer_phone || (o.phone_number && o.phone_number !== 'N/A' ? o.phone_number : '—')}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1"><CreditCard size={11} /> Method</p>
                                        <p className="text-[13px] font-semibold text-slate-700">{o.payment_method || 'Cash'}</p>
                                    </div>
                                </div>
                                {o.shipping_address && o.shipping_address !== 'Walk-in Store Selection' && (
                                    <div className="flex items-start gap-2 text-[12px] text-slate-600">
                                        <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" /> {o.shipping_address}
                                    </div>
                                )}

                                {/* Items */}
                                <div className="border border-slate-100 rounded-xl overflow-hidden">
                                    <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        <Package size={12} /> Items ({(o.items || []).length})
                                    </div>
                                    <table className="w-full text-[12px]">
                                        <thead className="text-[9.5px] font-bold uppercase text-slate-400 bg-slate-50/50">
                                            <tr>
                                                <th className="px-4 py-2 text-left">Product</th>
                                                <th className="px-3 py-2 text-center">Qty</th>
                                                <th className="px-3 py-2 text-right">Unit</th>
                                                <th className="px-4 py-2 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {(o.items || []).map((it: any, i: number) => (
                                                <tr key={i}>
                                                    <td className="px-4 py-2.5">
                                                        <p className="font-semibold text-slate-800">{it.product_name}</p>
                                                        {(it.weight || it.size) && <p className="text-[10px] text-indigo-600 font-bold uppercase">{it.weight}{it.weight && it.size ? ' • ' : ''}{it.size}</p>}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center font-bold text-slate-600">{it.quantity}</td>
                                                    <td className="px-3 py-2.5 text-right text-slate-600 tabular-nums">{formatCurrency(it.price)}</td>
                                                    <td className="px-4 py-2.5 text-right font-bold text-slate-900 tabular-nums">{formatCurrency(Number(it.price) * Number(it.quantity))}</td>
                                                </tr>
                                            ))}
                                            {(o.items || []).length === 0 && (
                                                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No items recorded.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Totals */}
                                <div className="ml-auto w-full sm:w-[280px] text-[12.5px] space-y-1.5">
                                    <div className="flex justify-between items-center pt-1 border-t-2 border-slate-200">
                                        <span className="font-black uppercase text-slate-900 text-[12px]">Total</span>
                                        <span className="font-black text-indigo-600 text-[16px] tabular-nums">{formatCurrency(total)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-emerald-600 font-bold uppercase text-[11px]">Paid</span>
                                        <span className="font-bold text-emerald-600 tabular-nums">{formatCurrency(paid)}</span>
                                    </div>
                                    {remaining > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-rose-600 font-black uppercase text-[11px]">Remaining</span>
                                            <span className="font-black text-rose-600 tabular-nums">{formatCurrency(remaining)}</span>
                                        </div>
                                    )}
                                    {remaining > 0 && o.due_date && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 font-bold uppercase text-[11px] flex items-center gap-1"><Calendar size={11} /> Due</span>
                                            <span className={`font-bold tabular-nums ${o.is_overdue ? 'text-rose-600' : 'text-slate-700'}`}>
                                                {formatDate(o.due_date)}{o.is_overdue ? ` · ${o.days_overdue}d late` : ''}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Modal>
                    );
                })()}
            </div>
        </div>
    );
}
