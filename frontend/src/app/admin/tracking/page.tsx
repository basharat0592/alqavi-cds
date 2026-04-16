'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Search, Package, Truck, CheckCircle2, AlertCircle, Clock,
    RefreshCw, Loader2, Filter, ChevronDown, X, ArrowUpRight,
    AlertTriangle, TrendingUp, ShoppingBag, Users, Eye, ListFilter
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { supplierService } from '@/services/supplier.service';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

/* ── Status config ────────────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; icon: any }> = {
    PENDING:   { label: 'Pending',   color: 'text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',   dot: 'bg-amber-400',   icon: Clock },
    ACCEPTED:  { label: 'Accepted',  color: 'text-blue-700 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',           dot: 'bg-blue-400',    icon: CheckCircle2 },
    DELIVERED: { label: 'Delivered', color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20', dot: 'bg-emerald-400', icon: Package },
    CANCELLED: { label: 'Cancelled', color: 'text-red-700 bg-red-50 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20',                 dot: 'bg-red-400',     icon: AlertCircle },
};

const TIMELINE_STEPS = [
    { key: 'PENDING',   label: 'Order Placed',  icon: ShoppingBag },
    { key: 'ACCEPTED',  label: 'Accepted',       icon: CheckCircle2 },
    { key: 'DELIVERED', label: 'Delivered',      icon: Package },
];

/* ── Stat Card ────────────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, color, bg }: any) {
    return (
        <div className="bg-white dark:bg-[#1a252f] rounded-2xl border border-slate-200 dark:border-white/5 p-5 flex items-center justify-between shadow-sm">
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
            </div>
            <div className={cn('p-3.5 rounded-2xl', bg)}>
                <Icon className={cn('h-5 w-5', color)} />
            </div>
        </div>
    );
}

/* ── Status Badge ─────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status?.toUpperCase()] || STATUS_CONFIG.PENDING;
    const Icon = cfg.icon;
    return (
        <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border', cfg.color)}>
            <Icon className="h-3 w-3" />
            {cfg.label}
        </span>
    );
}

/* ── PO Timeline ──────────────────────────────────────────────── */
function POTimeline({ status }: { status: string }) {
    const upper = status?.toUpperCase();
    const currentIdx = TIMELINE_STEPS.findIndex(s => s.key === upper);
    const isCancelled = upper === 'CANCELLED';

    return (
        <div className="relative flex items-center justify-between px-2 mt-4">
            {/* Connector line */}
            <div className="absolute left-6 right-6 top-4 h-[3px] bg-slate-100 dark:bg-white/5 rounded-full" />
            {!isCancelled && currentIdx >= 0 && (
                <div
                    className="absolute left-6 top-4 h-[3px] bg-[#F59E0B] rounded-full transition-all duration-700"
                    style={{ width: `calc(${(currentIdx / (TIMELINE_STEPS.length - 1)) * 100}% * ((100% - 3rem) / 100%))` }}
                />
            )}
            {TIMELINE_STEPS.map((step, idx) => {
                const done = !isCancelled && idx <= currentIdx;
                const current = !isCancelled && idx === currentIdx;
                const Icon = step.icon;
                return (
                    <div key={step.key} className="flex flex-col items-center z-10 gap-2">
                        <div className={cn(
                            'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500',
                            isCancelled ? 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a252f] text-slate-300' :
                            done ? 'border-[#F59E0B] bg-[#F59E0B] text-white shadow-md shadow-amber-200 dark:shadow-amber-900/30' :
                            'border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a252f] text-slate-300',
                            current && 'scale-110'
                        )}>
                            <Icon className="h-3.5 w-3.5" />
                        </div>
                        <p className={cn('text-[9px] font-black uppercase tracking-widest text-center leading-tight',
                            isCancelled ? 'text-slate-300 dark:text-white/20' :
                            done ? 'text-[#F59E0B]' : 'text-slate-300 dark:text-white/20'
                        )}>{step.label}</p>
                        {current && !isCancelled && <span className="w-1 h-1 bg-[#F59E0B] rounded-full animate-pulse" />}
                    </div>
                );
            })}
        </div>
    );
}

/* ── PO Detail Drawer ─────────────────────────────────────────── */
function PODrawer({ order, onClose, onUpdateStatus }: { order: any; onClose: () => void; onUpdateStatus: (id: string, status: string) => void }) {
    const [updating, setUpdating] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(false);

    const handleStatus = async (status: string) => {
        setUpdating(true);
        try {
            await onUpdateStatus(order.id, status);
        } finally {
            setUpdating(false);
            setConfirmCancel(false);
        }
    };

    const upper = order.status?.toUpperCase();
    const canAccept = upper === 'PENDING';
    const canDeliver = upper === 'ACCEPTED';
    const canCancel = ['PENDING', 'ACCEPTED'].includes(upper);

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#131921] w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 dark:border-white/10 shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
                {/* Drawer Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-white/5 shrink-0">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Purchase Order</p>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">{order.tracking_id}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <StatusBadge status={order.status} />
                        <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors">
                            <X className="h-4 w-4 text-slate-500" />
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-6">
                    {/* Timeline */}
                    <div className="bg-slate-50 dark:bg-white/[0.02] rounded-2xl p-5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Order Progress</p>
                        <POTimeline status={order.status} />
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: 'Supplier', value: order.supplier_name || '—' },
                            { label: 'Created By', value: order.admin_name || 'System' },
                            { label: 'Order Date', value: formatDate(order.created_at) },
                            { label: 'Total Items', value: `${order.item_count || 0} SKUs` },
                            { label: 'Total Amount', value: `Rs.${Number(order.total_amount || 0).toLocaleString()}` },
                            { label: 'Notes', value: order.notes || 'No notes' },
                        ].map((info, i) => (
                            <div key={i} className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl p-4">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{info.label}</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{info.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Items Table */}
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Order Items</p>
                        <div className="rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-white/[0.03]">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                                        <th className="text-right px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                                        <th className="text-right px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Unit Price</th>
                                        <th className="text-right px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(order.items || []).map((item: any, i: number) => (
                                        <tr key={i} className="border-t border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{item.product_name}</td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-600 dark:text-white/60">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-600 dark:text-white/60">Rs.{Number(item.cost_price).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right font-black text-slate-900 dark:text-white">Rs.{Number(item.line_total || item.quantity * item.cost_price).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-50 dark:bg-white/[0.03] border-t border-slate-200 dark:border-white/10">
                                    <tr>
                                        <td colSpan={3} className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Grand Total</td>
                                        <td className="px-4 py-3 text-right font-black text-[#F59E0B] text-base">Rs.{Number(order.total_amount || 0).toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Action Footer */}
                {(canAccept || canDeliver || canCancel) && (
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex gap-3 shrink-0">
                        {canCancel && !confirmCancel && (
                            <button onClick={() => setConfirmCancel(true)} disabled={updating} className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all">
                                Cancel Order
                            </button>
                        )}
                        {confirmCancel && (
                            <button onClick={() => handleStatus('CANCELLED')} disabled={updating} className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all flex items-center justify-center gap-2">
                                {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                                Confirm Cancel
                            </button>
                        )}
                        {canAccept && (
                            <button onClick={() => handleStatus('ACCEPTED')} disabled={updating} className="flex-1 py-3 bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                                {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                Mark Accepted
                            </button>
                        )}
                        {canDeliver && (
                            <button onClick={() => handleStatus('DELIVERED')} disabled={updating} className="flex-1 py-3 bg-[#F59E0B] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#D97706] transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20">
                                {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
                                Mark Delivered
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Main Page ─────────────────────────────────────────────────── */
export default function OrderTrackingPage() {
    const searchParams = useSearchParams();
    const [orders, setOrders] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [supplierFilter, setSupplierFilter] = useState(searchParams.get('supplier') || 'ALL');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);

    const supplierName = searchParams.get('name');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [ordersRes, suppliersRes] = await Promise.all([
                supplierService.getOrders(supplierFilter !== 'ALL' ? { supplier: supplierFilter } : {}),
                supplierService.getAll(),
            ]);
            setOrders(ordersRes);
            setSuppliers(suppliersRes);
        } catch {
            toast.error('Failed to load tracking data');
        } finally {
            setLoading(false);
        }
    }, [supplierFilter]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            const updated = await supplierService.updateOrderStatus(id, status);
            setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updated } : o));
            if (selectedOrder?.id === id) setSelectedOrder({ ...selectedOrder, ...updated });
            toast.success(`Order marked as ${status.toLowerCase()}`);
        } catch {
            toast.error('Failed to update order status');
        }
    };

    const filtered = orders.filter(o => {
        const matchSearch = (o.tracking_id || '').toLowerCase().includes(search.toLowerCase()) ||
            (o.supplier_name || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'ALL' || o.status?.toUpperCase() === statusFilter;
        return matchSearch && matchStatus;
    });

    // Stats
    const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'PENDING').length,
        accepted: orders.filter(o => o.status === 'ACCEPTED').length,
        delivered: orders.filter(o => o.status === 'DELIVERED').length,
    };

    const STATUS_FILTERS = ['ALL', 'PENDING', 'ACCEPTED', 'DELIVERED', 'CANCELLED'];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-3">
                        <div className="p-2.5 bg-[#F59E0B]/10 rounded-2xl">
                            <Truck className="h-7 w-7 text-[#F59E0B]" />
                        </div>
                        Purchase Order <span className="text-[#F59E0B]">Tracker</span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
                        {supplierName
                            ? `Showing orders for supplier: ${supplierName}`
                            : 'Monitor all supplier purchase orders and delivery status.'}
                    </p>
                </div>
                <button onClick={loadData} className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-500 hover:text-[#F59E0B] hover:border-[#F59E0B]/30 transition-all shadow-sm self-start">
                    <RefreshCw className={cn('h-5 w-5', loading && 'animate-spin')} />
                </button>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard label="Total Orders" value={stats.total} icon={ListFilter} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-500/10" />
                <StatCard label="Pending" value={stats.pending} icon={Clock} color="text-amber-600" bg="bg-amber-50 dark:bg-amber-500/10" />
                <StatCard label="Accepted" value={stats.accepted} icon={CheckCircle2} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-500/10" />
                <StatCard label="Delivered" value={stats.delivered} icon={Package} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-500/10" />
            </div>

            {/* ── Filters ── */}
            <div className="bg-[#131921] rounded-3xl p-4 flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search by tracking ID or supplier name..."
                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-white text-sm font-medium outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B]/30 transition-all placeholder:text-zinc-600"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* Supplier Filter Dropdown */}
                <div className="relative">
                    <select
                        value={supplierFilter}
                        onChange={e => setSupplierFilter(e.target.value)}
                        className="appearance-none pl-4 pr-10 py-3 bg-white/5 border border-white/5 rounded-2xl text-white text-sm font-bold outline-none focus:ring-2 focus:ring-[#F59E0B]/20 cursor-pointer min-w-[180px]"
                    >
                        <option value="ALL" className="bg-[#131921]">All Suppliers</option>
                        {suppliers.map(s => (
                            <option key={s.id} value={s.id} className="bg-[#131921]">{s.name}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                </div>

                {/* Status Filter Pills */}
                <div className="flex gap-2 items-center flex-wrap">
                    {STATUS_FILTERS.map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={cn(
                                'px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
                                statusFilter === s
                                    ? 'bg-[#F59E0B] text-white shadow-lg shadow-amber-500/20'
                                    : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                            )}
                        >
                            {s === 'ALL' ? 'All' : STATUS_CONFIG[s]?.label || s}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Orders Table / List ── */}
            {loading ? (
                <div className="space-y-4">
                    {Array(5).fill(0).map((_, i) => (
                        <div key={i} className="h-20 bg-slate-200 dark:bg-white/5 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="py-24 text-center">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Package className="h-10 w-10 text-slate-300 dark:text-white/10" />
                    </div>
                    <p className="text-lg font-black text-slate-400 uppercase tracking-wide">No orders found</p>
                    <p className="text-sm text-slate-400 mt-2">Try adjusting your filters or search query.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-[#1a252f] rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/5">
                        {['Tracking ID', 'Supplier', 'Date', 'Items', 'Total', 'Status', ''].map((h, i) => (
                            <div key={i} className={cn('text-[9px] font-black text-slate-400 uppercase tracking-widest',
                                i === 0 ? 'col-span-2' : i === 1 ? 'col-span-2' : i === 6 ? 'col-span-1 text-right' : 'col-span-2'
                            )}>{h}</div>
                        ))}
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                        {filtered.map(order => {
                            const cfg = STATUS_CONFIG[order.status?.toUpperCase()] || STATUS_CONFIG.PENDING;
                            return (
                                <div
                                    key={order.id}
                                    onClick={() => setSelectedOrder(order)}
                                    className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors group items-center"
                                >
                                    <div className="col-span-2">
                                        <p className="text-sm font-black text-slate-900 dark:text-white font-mono">{order.tracking_id}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-sm font-semibold text-slate-700 dark:text-white/80 truncate">{order.supplier_name}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-xs font-medium text-slate-500 dark:text-white/40">{formatDate(order.created_at)}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-xs font-bold text-slate-600 dark:text-white/60">{order.item_count} SKUs</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-sm font-black text-slate-900 dark:text-white">Rs.{Number(order.total_amount || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="col-span-1">
                                        <StatusBadge status={order.status} />
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        <div className="p-2 bg-slate-100 dark:bg-white/5 rounded-xl group-hover:bg-[#F59E0B]/10 group-hover:text-[#F59E0B] text-slate-400 transition-all">
                                            <Eye className="h-3.5 w-3.5" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-3 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-200 dark:border-white/5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Showing {filtered.length} of {orders.length} purchase orders
                        </p>
                    </div>
                </div>
            )}

            {/* ── PO Detail Drawer ── */}
            {selectedOrder && (
                <PODrawer
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onUpdateStatus={handleUpdateStatus}
                />
            )}
        </div>
    );
}
