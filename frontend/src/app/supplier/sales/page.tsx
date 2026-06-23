'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    TrendingUp, Loader2, Search, Eye, Trash2, RefreshCw, X, AlertTriangle,
    CreditCard, Receipt, CheckCircle2, ChevronRight, Check, X as XIcon, 
    ShieldCheck, Calendar, History, Download, Filter, Printer, Clock, Activity, FileText
} from 'lucide-react';
import api from '@/lib/axios';
import { purchaseService } from '@/services/purchase.service';
import toast from 'react-hot-toast';

// ── FORMATTERS ────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    new Intl.NumberFormat('en-PK', { 
        style: 'currency', 
        currency: 'PKR', 
        maximumFractionDigits: 0 
    }).format(n);

const formatDateTime = (d: string) => {
    const date = new Date(d);
    return {
        date: date.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })
    };
};

// ── UI COMPONENTS ────────────────────────────────────────────────────────────
const KPICard = ({ label, value, icon: Icon, colorClass }: any) => (
    <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm hover:shadow-md transition-all group">
        <div className="flex justify-between items-start">
            <div className="space-y-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
                <span className={`text-2xl font-bold tracking-tight ${colorClass}`}>{value}</span>
            </div>
            <div className="p-2 bg-slate-50 rounded-full text-slate-300 group-hover:text-slate-400 transition-colors">
                <Icon size={18} />
            </div>
        </div>
    </div>
);

const Badge = ({ children, variant = 'default' }: any) => {
    const variants = {
        default: 'bg-slate-100 text-slate-600 border-slate-200',
        wholesale: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
        retail: 'bg-slate-50 text-slate-600 border-slate-200',
        paid: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
        pending: 'bg-amber-50 text-amber-700 border-amber-200',
        unpaid: 'bg-rose-50 text-rose-600 border-rose-200',
        partial: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold',
    };
    return (
        <span className={`text-[10px] uppercase px-2 py-0.5 rounded border font-bold tracking-wider ${variants[variant as keyof typeof variants]}`}>
            {children}
        </span>
    );
};

// ── DETAIL MODAL ──
const OrderDetailModal = ({ order, onClose, onAccept, onReject, showActions, isUpdating }: { order: any, onClose: () => void, onAccept?: () => void, onReject?: () => void, showActions?: boolean, isUpdating?: boolean }) => {
    if (!order) return null;
    const { date, time } = formatDateTime(order.created_at || order.order_date);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
                {/* Modal Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Order Details</h3>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">#{order.order_number || order.tracking_id} · {date}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-8 max-h-[70vh] overflow-y-auto text-left font-sans custom-scrollbar">
                    <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-slate-50">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">From</label>
                                <p className="text-sm font-bold text-slate-800">{order.customer_name || 'Shop Sale'}</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Type</label>
                                <Badge variant={order.is_wholesale ? 'wholesale' : 'retail'}>{order.is_wholesale ? 'Distributor' : 'Shop Sale'}</Badge>
                            </div>
                        </div>
                        <div className="space-y-4 text-right">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</label>
                                {showActions ? (
                                    <Badge variant="pending">Payment Request</Badge>
                                ) : (
                                    <Badge variant={order.payment_status?.toLowerCase() || 'paid'}>{order.payment_status || 'PAID'}</Badge>
                                )}
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date & Time</label>
                                <p className="text-sm font-bold text-slate-800">{date}, {time}</p>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="mb-8">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Items</label>
                        <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100 font-bold text-slate-600">
                                    <tr>
                                        <th className="p-4">Item Name</th>
                                        <th className="p-4 text-center">Qty</th>
                                        <th className="p-4 text-right">Price</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-slate-800 font-medium">
                                    {(order.items || []).map((item: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4">{item.product_name || item.name || 'Product'}</td>
                                            <td className="p-4 text-center font-bold">
                                                {item.packaging_type === 'CARTON' ? (
                                                    <div className="flex flex-col leading-tight">
                                                        <span>{item.total_units ?? (item.quantity * (item.items_per_carton || 1))} pcs</span>
                                                        <span className="text-[10px] text-slate-400 font-medium">{item.quantity} ctn × {item.items_per_carton || 1}</span>
                                                    </div>
                                                ) : (item.total_units || item.quantity)}
                                            </td>
                                            <td className="p-4 text-right font-bold text-slate-900">{fmt(parseFloat(item.price || item.unit_price || 0))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Receipt Image */}
                    {order.payment_slip && (
                        <div className="mb-8">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Payment Receipt</label>
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <img src={order.payment_slip} alt="Receipt" className="max-h-[300px] rounded-lg mx-auto block shadow-md" />
                            </div>
                        </div>
                    )}

                    {/* Payment Breakdown — shows partial payment details (paid / due / date / method) */}
                    {(() => {
                        const total = parseFloat(order.total_amount || 0);
                        const paid = parseFloat(order.paid_amount || (order.payment_status === 'PAID' ? order.total_amount : 0) || 0);
                        const due = Math.max(0, total - paid);
                        const payDate = order.payment_date
                            ? new Date(order.payment_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—';
                        const method = (order.payment_method || '—').toString().replace('_', ' ');
                        return (
                            <div className="mb-8">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Payment Summary</label>
                                <div className="bg-slate-50 rounded-xl border border-slate-100 p-5 space-y-2.5">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 font-medium">Total Amount</span>
                                        <span className="font-bold tabular-nums text-slate-900">{fmt(total)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 font-medium">Paid Amount</span>
                                        <span className="font-bold tabular-nums text-emerald-600">{fmt(paid)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-2.5 border-t border-slate-200">
                                        <span className="text-slate-500 font-medium">Remaining / Due</span>
                                        <span className={`font-bold tabular-nums ${due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmt(due)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 font-medium">Payment Date</span>
                                        <span className="font-bold text-slate-700">{payDate}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 font-medium">Method</span>
                                        <span className="font-bold text-slate-700 capitalize">{method}</span>
                                    </div>
                                    {order.transaction_id && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500 font-medium">Transaction / Ref</span>
                                            <span className="font-bold text-slate-700 font-mono">{order.transaction_id}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    <div className="flex justify-between items-end pt-6 border-t border-slate-50">
                        <div>
                           {order.payment_notes && (
                               <div className="max-w-xs">
                                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Notes</label>
                                   <p className="text-xs text-slate-500 italic">"{order.payment_notes}"</p>
                               </div>
                           )}
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                            <p className="text-3xl font-black text-[#b12704] mt-1">{fmt(parseFloat(order.total_amount))}</p>
                        </div>
                    </div>
                </div>

                <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-3">
                    {/* Verify / Reject — shown only for pending payment requests */}
                    <div className="flex items-center gap-4">
                        {showActions && (
                            <>
                                <button
                                    onClick={onReject}
                                    disabled={isUpdating}
                                    className="text-sm font-bold text-rose-600 hover:text-rose-700 transition-colors flex items-center gap-1.5 disabled:opacity-60"
                                >
                                    <XIcon size={16} /> Reject
                                </button>
                                <button
                                    onClick={onAccept}
                                    disabled={isUpdating}
                                    className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1.5 disabled:opacity-60"
                                >
                                    {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Accept Payment
                                </button>
                            </>
                        )}
                    </div>
                    <button onClick={onClose} className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">Close</button>
                </div>
            </div>
        </div>
    );
};

export default function SupplierFinancialRegistry() {
    const [filter, setFilter] = useState('all');
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [viewedOrderIds, setViewedOrderIds] = useState<Set<string>>(new Set());
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const [ordersRes, purchasesRes] = await Promise.all([
                api.get('/v1/sales/orders/', { params: { no_pagination: 'true', search: search || undefined } }),
                api.get('/v1/sales/purchases/', { params: { no_pagination: 'true', search: search || undefined } })
            ]);
            const retail = Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data.results || [];
            const purchase = Array.isArray(purchasesRes.data) ? purchasesRes.data : purchasesRes.data.results || [];
            const combined = [
                ...retail.map((r: any) => ({ ...r, is_wholesale: false })),
                ...purchase.map((p: any) => ({ ...p, is_wholesale: true, order_number: p.purchase_number, customer_name: p.created_by_name || 'Distributor Purchase' }))
            ].sort((a, b) => new Date(b.created_at || b.order_date).getTime() - new Date(a.created_at || a.order_date).getTime());
            
            setOrders(combined);
            setLastSync(new Date());
        } catch (error) {
            toast.error("Could not load data");
        } finally {
            setLoading(false); 
        }
    }, [search]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const handleOpenView = (order: any) => {
        setViewedOrderIds(prev => new Set(prev).add(String(order.id)));
        setSelectedOrder(order);
    };

    const handleAcceptPayment = async (id: string) => {
        setIsUpdating(true);
        try {
            await purchaseService.acceptPayment(id);
            toast.success("Payment accepted!");
            fetchOrders();
        } catch {
            toast.error("Could not accept payment");
        } finally {
            setIsUpdating(false); 
        }
    };

    const handleRejectPayment = async (id: string) => {
        const reason = prompt("Why are you rejecting this payment?");
        if (!reason) return;
        setIsUpdating(true);
        try {
            await purchaseService.rejectPayment(id, reason);
            toast.success("Payment rejected");
            fetchOrders();
        } catch {
            toast.error("Could not reject payment");
        } finally {
            setIsUpdating(false); 
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            if (deleteTarget.is_wholesale) {
                await purchaseService.delete(deleteTarget.id);
            } else {
                await api.delete(`/v1/sales/orders/${deleteTarget.id}/`);
            }
            toast.success(`Order #${deleteTarget.order_number || deleteTarget.tracking_id} deleted`);
            setDeleteTarget(null);
            fetchOrders();
        } catch {
            toast.error('Could not delete order');
        } finally {
            setIsDeleting(false);
        }
    };

    // A "payment request" is a distributor payment submitted but not yet verified.
    const isPaymentRequest = (o: any) => o.is_wholesale && o.payment_status !== 'UNPAID' && !o.payment_confirmed;

    const filteredOrders = orders.filter(o => {
        if (filter === 'all') return true;
        if (filter === 'requests') return isPaymentRequest(o);
        return o.payment_status?.toLowerCase() === filter.toLowerCase();
    });

    const requestCount = orders.filter(isPaymentRequest).length;
    const paidCount = orders.filter(o => o.payment_status?.toLowerCase() === 'paid').length;
    const unpaidCount = orders.filter(o => o.payment_status?.toLowerCase() === 'unpaid').length;
    const partialCount = orders.filter(o => o.payment_status?.toLowerCase() === 'partial').length;

    const TABS = [
        { key: 'all', label: 'All', count: orders.length },
        { key: 'requests', label: 'Payment Requests', count: requestCount },
        { key: 'partial', label: 'Partial', count: partialCount },
        { key: 'unpaid', label: 'Unpaid', count: unpaidCount },
        { key: 'paid', label: 'Paid', count: paidCount },
    ];

    // Pagination — 10 per page
    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const paginatedOrders = filteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    // Reset to the first page whenever the filter or search changes.
    useEffect(() => { setPage(1); }, [filter, search]);

    const totalVolume = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const totalPaid = orders.reduce((sum, o) => sum + parseFloat(o.paid_amount || (o.payment_status === 'PAID' ? o.total_amount : 0) || 0), 0);
    const totalRemaining = totalVolume - totalPaid;

    return (
        <div className="max-w-[1200px] mx-auto animate-in fade-in duration-500 font-sans p-6 text-left">
            {selectedOrder && (
                <OrderDetailModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    showActions={isPaymentRequest(selectedOrder)}
                    isUpdating={isUpdating}
                    onAccept={async () => { await handleAcceptPayment(selectedOrder.id); setSelectedOrder(null); }}
                    onReject={async () => { await handleRejectPayment(selectedOrder.id); setSelectedOrder(null); }}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-[16px] font-bold text-slate-900 tracking-tight">Delete this order?</h3>
                            <p className="text-[13px] text-slate-500 font-medium mt-2 leading-relaxed">
                                Delete order <span className="font-bold text-slate-700">#{deleteTarget.order_number || deleteTarget.tracking_id}</span> ({fmt(parseFloat(deleteTarget.total_amount || 0))})? You can't undo this.
                            </p>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                disabled={isDeleting}
                                className="flex-1 h-10 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-all disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[13px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
                            >
                                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <><Trash2 size={14} /> Delete</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Header (Same as Orders Page) ── */}
            <div className="mb-6">
                <div className="flex items-end justify-between mb-1">
                    <div>
                        <h1 className="text-3xl font-medium text-slate-900 leading-tight">Sales & Payments</h1>
                        <p className="text-[13px] text-slate-500 mt-1 font-medium">See your sales, money received, and money still due.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { setLoading(true); fetchOrders(); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#F59E0B] border border-gray-300 bg-white rounded hover:bg-gray-50 transition-all"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 border border-gray-300 bg-white rounded hover:bg-gray-50 transition-all">
                            <Download className="h-3.5 w-3.5" />
                            Export
                        </button>
                    </div>
                </div>
                {lastSync && (
                    <p className="text-[11px] text-gray-400 mb-6 font-medium">
                        Last updated: {lastSync.toLocaleTimeString()}
                    </p>
                )}

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <KPICard label="Money Received" value={fmt(totalPaid)} icon={CheckCircle2} colorClass="text-emerald-600" />
                    <KPICard label="Money Due" value={fmt(totalRemaining)} icon={Clock} colorClass="text-rose-600" />
                    <KPICard label="Total Sales" value={fmt(totalVolume)} icon={History} colorClass="text-slate-900" />
                </div>

                {/* Search Bar (Same as Orders Page) */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => { setSearch(e.target.value); }}
                        placeholder="Search by order number or customer name..."
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-300 rounded focus:outline-none focus:border-[#F59E0B] transition-all"
                    />
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1 sm:gap-2 border-b border-gray-200 overflow-x-auto no-scrollbar">
                    {TABS.map(t => {
                        const active = filter === t.key;
                        const isRequest = t.key === 'requests';
                        return (
                            <button
                                key={t.key}
                                onClick={() => { setFilter(t.key); }}
                                className={`relative flex items-center gap-2 px-3 pb-3 pt-1 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${active ? 'border-[#F59E0B] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                            >
                                {t.label}
                                {t.count > 0 && (
                                    <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-extrabold tabular-nums transition-colors ${
                                        isRequest
                                            ? (active ? 'bg-[#F59E0B] text-white' : 'bg-amber-100 text-amber-700')
                                            : (active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500')
                                    }`}>
                                        {t.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Table (Matching Orders Style) ── */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {/* Table toolbar: result count + active context */}
                <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 bg-slate-50/40">
                    <div className="flex items-center gap-2 text-[13px] font-bold text-slate-700">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-900 text-white text-[11px] tabular-nums">
                            {filteredOrders.length}
                        </span>
                        <span>{TABS.find(t => t.key === filter)?.label || 'Transactions'}</span>
                    </div>
                    {filter === 'requests' && requestCount > 0 && (
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                            <Clock size={12} /> {requestCount} waiting for approval
                        </span>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-gray-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <th className="px-6 py-4">Order</th>
                                <th className="px-6 py-4">From</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading && filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm text-slate-400 font-medium">Loading...</p>
                                    </td>
                                </tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="p-4 bg-slate-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-slate-300">
                                            <FileText size={32} />
                                        </div>
                                        <p className="text-sm text-slate-500 font-bold">Nothing here yet</p>
                                        <p className="text-xs text-slate-400 mt-1">Try a different tab or search.</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedOrders.map(o => {
                                    const isWaiting = o.is_wholesale && o.payment_status !== 'UNPAID' && !o.payment_confirmed;
                                    const { date } = formatDateTime(o.created_at || o.order_date);
                                    
                                    return (
                                        <tr key={o.id} className={`hover:bg-slate-50/70 transition-colors group ${isWaiting ? 'bg-amber-50/30' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className={`flex items-center gap-3 ${isWaiting ? 'border-l-2 border-[#F59E0B] -ml-6 pl-6' : ''}`}>
                                                    <div className="flex flex-col">
                                                        <span className="text-[12px] font-bold text-slate-900">#{o.order_number || o.tracking_id}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold mt-0.5">{date}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${o.is_wholesale ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                                        {o.is_wholesale ? <CreditCard size={16} /> : <Receipt size={16} />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[12px] font-medium text-slate-700">{o.customer_name || 'Shop Sale'}</span>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{o.is_wholesale ? 'Distributor' : 'Shop Sale'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-[12px] font-black text-slate-900">{fmt(parseFloat(o.total_amount))}</span>
                                                {(() => {
                                                    const total = parseFloat(o.total_amount || 0);
                                                    const paid = parseFloat(o.paid_amount || (o.payment_status === 'PAID' ? o.total_amount : 0) || 0);
                                                    const due = Math.max(0, total - paid);
                                                    return o.payment_status?.toLowerCase() === 'partial' && due > 0 ? (
                                                        <div className="text-[10px] font-bold text-rose-600 tabular-nums mt-0.5">
                                                            Due {fmt(due)}
                                                        </div>
                                                    ) : null;
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    {isWaiting ? (
                                                        // Pending distributor request — not yet accepted, so do NOT show "Paid".
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                                                            <Clock size={10} /> Payment Request
                                                        </span>
                                                    ) : (
                                                        <Badge variant={o.payment_status?.toLowerCase() || 'paid'}>{o.payment_status || 'PAID'}</Badge>
                                                    )}
                                                </div>
                                                {isWaiting && (
                                                    <div className="text-[10px] text-slate-500 font-semibold mt-1.5 tabular-nums">
                                                        Paying {fmt(parseFloat(o.paid_amount || o.total_amount || 0))}
                                                        <span className="text-slate-400"> · Left {fmt(Math.max(0, parseFloat(o.total_amount || 0) - parseFloat(o.paid_amount || 0)))}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-end gap-1 items-center">
                                                    <button
                                                        onClick={() => handleOpenView(o)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-[#F59E0B] rounded-md transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye size={13} /> View
                                                    </button>
                                                    <button
                                                        onClick={() => { window.location.href = `/supplier/sales/${o.id}/invoice`; }}
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 rounded-md transition-colors"
                                                        title="Print Invoice"
                                                    >
                                                        <Printer size={13} /> Print
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteTarget(o)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-rose-600 rounded-md transition-colors"
                                                        title="Delete Transaction"
                                                    >
                                                        <Trash2 size={13} /> Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination footer — only when more than one page */}
                {!loading && filteredOrders.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100 bg-slate-50/40">
                        <span className="text-[12px] font-medium text-slate-500 tabular-nums">
                            Showing <span className="font-bold text-slate-700">{(currentPage - 1) * PAGE_SIZE + 1}</span>
                            –<span className="font-bold text-slate-700">{Math.min(currentPage * PAGE_SIZE, filteredOrders.length)}</span> of <span className="font-bold text-slate-700">{filteredOrders.length}</span>
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={currentPage <= 1}
                                className="px-3 py-1.5 text-[12px] font-bold rounded border border-gray-300 bg-white text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <span className="text-[12px] font-bold text-slate-700 tabular-nums px-1">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                                className="px-3 py-1.5 text-[12px] font-bold rounded border border-gray-300 bg-white text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
