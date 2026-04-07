'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    Package, ShoppingBag, Search, Clock, CheckCircle, Truck,
    AlertTriangle, XCircle, RefreshCw, Eye, PackageCheck, Trash2
} from 'lucide-react';
import api from '@/lib/axios';

/* ═══════════════════════════════════════════════════════
   STATUS CONFIG
═══════════════════════════════════════════════════════ */
const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    ordered:          { label: 'Ordered',    className: 'bg-blue-50   text-blue-700   border-blue-100',    icon: ShoppingBag },
    confirmed:        { label: 'Confirmed',  className: 'bg-indigo-50 text-indigo-700 border-indigo-100',  icon: CheckCircle },
    pending:          { label: 'Pending',    className: 'bg-amber-50  text-amber-600  border-amber-100',   icon: Clock },
    processing:       { label: 'Processing', className: 'bg-purple-50 text-purple-700 border-purple-100',  icon: RefreshCw },
    shipped:          { label: 'Shipped',    className: 'bg-sky-50    text-sky-700    border-sky-100',     icon: Truck },
    delivered:        { label: 'Delivered',  className: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle },
    cancelled:        { label: 'Cancelled',  className: 'bg-rose-50   text-rose-600   border-rose-100',    icon: XCircle },
    rejected:         { label: 'Rejected',   className: 'bg-red-50    text-red-700    border-red-100',     icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status?.toLowerCase()] ?? { label: status, className: 'bg-gray-50 text-gray-600 border-gray-100', icon: Package };
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${cfg.className}`}>
            <Icon className="h-3 w-3" />
            {cfg.label}
        </span>
    );
}

/* ═══════════════════════════════════════════════════════
   FILTER TABS
═══════════════════════════════════════════════════════ */
const FILTER_TABS = [
    { key: 'all',       label: 'All Orders' },
    { key: 'active',    label: 'Active' },
    { key: 'shipped',   label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
];

function matchFilter(status: string, filter: string) {
    const s = status?.toLowerCase();
    if (filter === 'all')       return true;
    if (filter === 'active')    return ['ordered', 'pending', 'confirmed', 'processing'].includes(s);
    if (filter === 'shipped')   return s === 'shipped';
    if (filter === 'delivered') return s === 'delivered';
    if (filter === 'cancelled') return ['cancelled', 'rejected'].includes(s);
    return true;
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
export default function OrdersPage() {
    const [orders, setOrders]               = useState<any[]>([]);
    const [loading, setLoading]             = useState(true);
    const [filter, setFilter]               = useState('all');
    const [search, setSearch]               = useState('');
    const [cancelTarget, setCancelTarget]   = useState<any>(null);
    const [receivedTarget, setReceivedTarget] = useState<any>(null);
    const [deleteTarget, setDeleteTarget]   = useState<any>(null);
    const [actionError, setActionError]     = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    /* ── Fetch orders (silent=true skips spinner) ── */
    const fetchOrders = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await api.get('/v1/sales/orders/');
            const data = res.data.results ?? res.data;
            setOrders(Array.isArray(data) ? data : []);
        } catch {
            // silent fail on background polls
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(() => fetchOrders(true), 8000);
        return () => clearInterval(interval);
    }, [fetchOrders]);

    /* ── Direct cancel (no admin approval needed) ── */
    const handleCancel = async () => {
        if (!cancelTarget) return;
        setActionLoading(true);
        setActionError('');
        try {
            await api.post(`/v1/sales/orders/${cancelTarget.id}/cancel/`);
            setOrders(prev => prev.map(o =>
                o.id === cancelTarget.id ? { ...o, status: 'cancelled' } : o
            ));
            setCancelTarget(null);
        } catch (err: any) {
            setActionError(err.response?.data?.error ?? 'Failed to cancel order. Please try again.');
        } finally {
            setActionLoading(false);
        }
    };

    /* ── Confirm received → delivered ── */
    const handleReceived = async () => {
        if (!receivedTarget) return;
        setActionLoading(true);
        setActionError('');
        try {
            await api.post(`/v1/sales/orders/${receivedTarget.id}/received/`);
            setOrders(prev => prev.map(o =>
                o.id === receivedTarget.id ? { ...o, status: 'delivered' } : o
            ));
            setReceivedTarget(null);
        } catch (err: any) {
            console.error('Confirm Error:', err);
            setActionError(err.response?.data?.error || err.message || 'Failed to confirm receipt.');
        } finally {
            setActionLoading(false);
        }
    };

    /* ── Delete order ── */
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setActionLoading(true);
        setActionError('');
        try {
            await api.delete(`/v1/sales/orders/${deleteTarget.id}/delete/`);
            setOrders(prev => prev.filter(o => o.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (err: any) {
            setActionError(err.response?.data?.error ?? 'Failed to delete order.');
        } finally {
            setActionLoading(false);
        }
    };

    /* ── Helpers ── */
    const canCancel = (status: string) =>
        ['ordered', 'pending', 'confirmed', 'processing'].includes(status?.toLowerCase());

    const isShipped = (status: string) => status?.toLowerCase() === 'shipped';

    const filtered = orders.filter(o => {
        if (!matchFilter(o.status, filter)) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return o.order_number?.toLowerCase().includes(q) || o.status?.toLowerCase().includes(q);
    });

    return (
        <div className="max-w-[1000px] mx-auto animate-in fade-in duration-500 pb-20">

            {/* ── Header ── */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
                    <button
                        onClick={() => fetchOrders()}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by order number..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-[#F7CA00] transition-all"
                    />
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-6 border-b border-gray-200 overflow-x-auto">
                    {FILTER_TABS.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setFilter(t.key)}
                            className={`pb-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
                                filter === t.key
                                    ? 'border-[#F7CA00] text-slate-900'
                                    : 'border-transparent text-slate-400 hover:text-slate-700'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Orders Table ── */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order #</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Items</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && orders.length === 0 ? (
                            Array(4).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={6} className="px-4 py-4">
                                        <div className="h-4 bg-gray-100 rounded-full w-full" />
                                    </td>
                                </tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-10 py-20 text-center">
                                    <ShoppingBag className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                                    <p className="text-sm font-bold text-slate-400 mb-4">No orders found</p>
                                    <Link href="/shop" className="inline-block px-6 py-2 bg-[#F7CA00] text-slate-900 font-bold rounded-lg text-xs hover:bg-[#1E40AF] hover:text-white transition-all">
                                        Shop Now
                                    </Link>
                                </td>
                            </tr>
                        ) : (
                            filtered.map(order => (
                                <tr key={order.id} className="hover:bg-gray-50/70 transition-colors group">

                                    {/* Order # */}
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-sm text-slate-900 group-hover:text-[#F7CA00] transition-colors">
                                            #{order.order_number}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-medium capitalize">
                                            {order.payment_method || 'Standard'}
                                        </div>
                                    </td>

                                    {/* Date */}
                                    <td className="px-4 py-3">
                                        <div className="text-xs font-bold text-slate-700">
                                            {new Date(order.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                            {new Date(order.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>

                                    {/* Items */}
                                    <td className="px-4 py-3">
                                        <div className="text-xs font-bold text-slate-700">
                                            {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? 's' : ''}
                                        </div>
                                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                            {order.items?.[0]?.product_name ?? '—'}
                                            {(order.items?.length ?? 0) > 1 ? ` +${order.items.length - 1} more` : ''}
                                        </div>
                                    </td>

                                    {/* Total */}
                                    <td className="px-4 py-3">
                                        <div className="text-sm font-black text-slate-900">
                                            PKR {order.total_amount?.toLocaleString()}
                                        </div>
                                        <div className={`text-[10px] font-bold uppercase ${order.payment_status === 'completed' ? 'text-emerald-600' : 'text-amber-500'}`}>
                                            {order.payment_status ?? 'Pending'}
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="px-4 py-3 text-center">
                                        <StatusBadge status={order.status} />
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-2 flex-wrap">
                                            {/* Track link always visible */}
                                            <Link
                                                href={`/dashboard/track?order=${order.order_number}`}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#F7CA00] hover:bg-amber-50 transition-colors"
                                                title="Track Order"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Link>

                                            {/* Cancel — only before shipped */}
                                            {canCancel(order.status) && (
                                                <button
                                                    onClick={() => { setCancelTarget(order); setActionError(''); }}
                                                    className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            )}

                                            {/* Order Received — only when shipped */}
                                            {isShipped(order.status) && (
                                                <button
                                                    onClick={() => { setReceivedTarget(order); setActionError(''); }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    <CheckCircle className="h-3.5 w-3.5" />
                                                    Order Received
                                                </button>
                                            )}

                                            {/* Delete — only for cancelled/delivered orders */}
                                            {['cancelled', 'rejected', 'delivered'].includes(order.status?.toLowerCase()) && (
                                                <button
                                                    onClick={() => { setDeleteTarget(order); setActionError(''); }}
                                                    className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                                    title="Delete Order"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Table Footer */}
                {filtered.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {filtered.length} order{filtered.length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-[10px] font-bold text-slate-300 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            Live — updates every 8s
                        </p>
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════
                CANCEL CONFIRMATION MODAL
            ══════════════════════════════════════════ */}
            {cancelTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
                        <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mb-5 mx-auto">
                            <XCircle className="h-7 w-7 text-rose-500" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Cancel Order?</h3>
                        <p className="text-sm text-slate-500 text-center mb-6">
                            You are about to cancel order{' '}
                            <span className="font-bold text-slate-800">#{cancelTarget.order_number}</span>.
                            This action cannot be undone.
                        </p>

                        {actionError && (
                            <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 font-bold text-center">
                                {actionError}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setCancelTarget(null); setActionError(''); }}
                                disabled={actionLoading}
                                className="flex-1 py-3 border border-gray-200 text-slate-600 font-bold rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
                            >
                                Keep Order
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={actionLoading}
                                className="flex-1 py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50"
                            >
                                {actionLoading ? 'Cancelling...' : 'Yes, Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════
                ORDER RECEIVED CONFIRMATION MODAL
            ══════════════════════════════════════════ */}
            {receivedTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
                        <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-5 mx-auto">
                            <CheckCircle className="h-7 w-7 text-emerald-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Confirm Order Received?</h3>
                        <p className="text-sm text-slate-500 text-center mb-2">
                            Confirm that you have received order{' '}
                            <span className="font-bold text-slate-800">#{receivedTarget.order_number}</span>.
                        </p>
                        <p className="text-xs text-slate-400 text-center mb-6">
                            This will mark the order as <span className="font-bold text-emerald-600">Delivered</span> and close it automatically.
                        </p>

                        {actionError && (
                            <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 font-bold text-center">
                                {actionError}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setReceivedTarget(null); setActionError(''); }}
                                disabled={actionLoading}
                                className="flex-1 py-3 border border-gray-200 text-slate-600 font-bold rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
                            >
                                Not Yet
                            </button>
                            <button
                                onClick={handleReceived}
                                disabled={actionLoading}
                                className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                            >
                                {actionLoading ? 'Confirming...' : 'Yes, Received!'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════
                DELETE CONFIRMATION MODAL
            ══════════════════════════════════════════ */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
                        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-5 mx-auto">
                            <Trash2 className="h-7 w-7 text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Delete Order?</h3>
                        <p className="text-sm text-slate-500 text-center mb-6">
                            Permanently delete order{' '}
                            <span className="font-bold text-slate-800">#{deleteTarget.order_number}</span>{' '}
                            from your history? This cannot be undone.
                        </p>

                        {actionError && (
                            <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 font-bold text-center">
                                {actionError}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setDeleteTarget(null); setActionError(''); }}
                                disabled={actionLoading}
                                className="flex-1 py-3 border border-gray-200 text-slate-600 font-bold rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
                            >
                                Keep It
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={actionLoading}
                                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                            >
                                {actionLoading ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
