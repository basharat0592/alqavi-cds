'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, Search, RefreshCw, Loader2, AlertCircle, CheckCircle2, Clock, XCircle, Package, ChevronDown, ChevronUp, Activity, Trash2 } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

const fmt = (n: number) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
    draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock },
    pending: { label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    processing: { label: 'Processing', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Activity },
    shipped: { label: 'Shipped', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Package },
    delivered: { label: 'Delivered', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    received: { label: 'Received', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    partially_received: { label: 'Partial', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertCircle },
    cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-600 border-red-200', icon: XCircle },
};

const PAY_META: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    partially_paid: { label: 'Partial', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    paid: { label: 'Paid', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
};

function StatusBadge({ status, map }: { status: string; map: Record<string, { label: string; color: string; icon?: any }> }) {
    const meta = map[status] || { label: status, color: 'bg-slate-100 text-slate-600 border-slate-200' };
    const Icon = (meta as any).icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-widest ${meta.color}`}>
            {Icon && <Icon className="h-3 w-3" />} {meta.label}
        </span>
    );
}

export default function SupplierOrders() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [expanded, setExpanded] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    const fetchOrders = useCallback(async () => {
        try {
            // If statusFilter is 'all', we exclude finalized orders so they "move" to Sales Registry
            const params: any = { search: search || undefined };
            if (statusFilter === 'all') {
                params.exclude_status = 'delivered,received,cancelled';
            } else {
                params.status = statusFilter;
            }

            const { data } = await api.get('/v1/sales/purchases/', { params });
            setOrders(Array.isArray(data) ? data : data.results || []);
            setLastSync(new Date());
        } catch {
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const t = setInterval(fetchOrders, 30000);
        return () => clearInterval(t);
    }, [fetchOrders]);

    const TABS = ['all', 'ordered', 'processing', 'shipped'];

    return (
        <div className="max-w-[900px] mx-auto animate-in fade-in duration-500 pb-20">

            {/* ── Header ── */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-1">
                    <h1 className="text-3xl font-medium text-slate-900">Purchase Orders</h1>
                    <button
                        onClick={() => { setLoading(true); fetchOrders(); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#F59E0B] border border-gray-300 bg-white rounded hover:bg-gray-50 transition-all"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
                {lastSync && (
                    <p className="text-[11px] text-gray-400 mb-4">
                        Auto-syncing every 30s · Last synced: {lastSync.toLocaleTimeString()}
                    </p>
                )}

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by PO number or supplier..."
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-300 rounded focus:outline-none focus:border-[#F59E0B] transition-all"
                    />
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-6 border-b border-gray-200">
                    {TABS.map(t => (
                        <button
                            key={t}
                            onClick={() => setStatusFilter(t)}
                            className={`pb-3 text-sm font-bold capitalize transition-all border-b-2 ${statusFilter === t ? 'border-[#F59E0B] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                        >
                            {t === 'all' ? 'All Orders' : t}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Count ── */}
            {!loading && (
                <p className="text-sm text-slate-600 mb-5 font-medium">
                    <span className="font-bold">{orders.length} orders</span> assigned to your account
                </p>
            )}

            {/* ── Content ── */}
            {loading ? (
                <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-sm font-medium">Loading your orders...</span>
                </div>
            ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 border border-gray-200 bg-white rounded-lg">
                    <ShoppingBag className="h-12 w-12 text-gray-200" />
                    <p className="text-sm font-bold text-slate-500">No purchase orders found</p>
                    <p className="text-xs text-slate-400">Orders assigned by the admin will show up here</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((po: any) => {
                        const isExpanded = expanded === po.id;
                        return (
                            <div key={po.id} className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">

                                {/* Card Header - Amazon Style */}
                                <div className="bg-[#f0f2f2] border-b border-gray-300 px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 text-[11px] font-medium text-slate-600 uppercase tracking-wider">
                                    <div className="flex gap-8">
                                        <div className="flex flex-col gap-0.5">
                                            <span>Order Date</span>
                                            <span className="text-sm font-bold text-slate-800 normal-case">
                                                {fmtDate(po.order_date)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span>Total</span>
                                            <span className="text-sm font-bold text-slate-800">{fmt(po.total_amount)}</span>
                                        </div>
                                        <div className="hidden sm:flex flex-col gap-0.5">
                                            <span>Payment</span>
                                            <StatusBadge status={po.payment_status} map={PAY_META} />
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1">
                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">PO # {po.purchase_number}</span>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setExpanded(isExpanded ? null : po.id)}
                                                className="flex items-center gap-1 text-[#F59E0B] hover:text-[#F59E0B] font-bold transition-colors"
                                            >
                                                {isExpanded ? 'Hide details' : 'Order details'}
                                                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                            </button>
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Remove record for PO #${po.purchase_number}?`)) {
                                                        try {
                                                            setLoading(true);
                                                            await api.delete(`/v1/sales/purchases/${po.id}/`);
                                                            toast.success("Order record removed.");
                                                            fetchOrders();
                                                        } catch {
                                                            toast.error("Deletion failed.");
                                                            setLoading(false);
                                                        }
                                                    }
                                                }}
                                                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                title="Delete Record"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded flex items-center justify-center shrink-0">
                                            <ShoppingBag className="h-8 w-8 text-gray-300" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <StatusBadge status={po.status} map={STATUS_META} />
                                                {po.tracking_id && (
                                                    <span className="px-2 py-0.5 bg-[#F59E0B]/10 text-[#8a7100] border border-[#F59E0B]/20 rounded text-[10px] font-bold uppercase tracking-tight">
                                                        Tracking: {po.tracking_id}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm font-bold text-slate-800">{po.purchased_items || `${po.items?.length || 0} items`}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">Supplier Profile: {po.supplier_name || '—'}</p>
                                        </div>
                                    </div>

                                    {/* Status Management */}
                                    {po.status !== 'cancelled' && po.status !== 'received' && (
                                        <div className="flex flex-col gap-1.5 min-w-[180px]">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Update Status</label>
                                            <select
                                                value={po.status}
                                                onChange={async (e) => {
                                                    const newStatus = e.target.value;
                                                    setLoading(true);
                                                    try {
                                                        await api.patch(`/v1/sales/purchases/${po.id}/`, { status: newStatus });
                                                        toast.success(`Order ${po.purchase_number} is now ${newStatus}`);
                                                        fetchOrders();
                                                    } catch {
                                                        toast.error("Failed to update status");
                                                        setLoading(false);
                                                    }
                                                }}
                                                className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-bold text-slate-700 outline-none focus:border-[#F59E0B] transition-shadow cursor-pointer"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="processing">Processing</option>
                                                <option value="shipped">Shipped</option>
                                                <option value="delivered">Delivered</option>
                                                <option value="received">Mark Received (Final)</option>
                                                <option value="cancelled">Cancel Order</option>
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {/* Expanded Items Panel */}
                                {isExpanded && po.items && po.items.length > 0 && (
                                    <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Order Items</p>
                                        <div className="space-y-2">
                                            {po.items.map((item: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                                    <div className="flex items-center gap-2">
                                                        <Package className="h-4 w-4 text-gray-300 shrink-0" />
                                                        <span className="text-sm font-semibold text-slate-700">{item.product_name || item.product}</span>
                                                    </div>
                                                    <div className="flex items-center gap-6 text-right">
                                                        <span className="text-xs text-slate-500">Qty: <b>{item.quantity}</b></span>
                                                        <span className="text-xs text-slate-500">Price: <b>{fmt(item.unit_price)}</b></span>
                                                        <span className="text-sm font-bold text-slate-800">{fmt(item.subtotal || item.quantity * item.unit_price)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Totals */}
                                        <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
                                            <div className="text-right text-sm">
                                                <span className="text-slate-500 mr-8">Grand Total</span>
                                                <span className="font-black text-slate-900">{fmt(po.total_amount)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Footer */}
            <div className="mt-12 text-center">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">End of Order Registry</p>
            </div>
        </div>
    );
}
