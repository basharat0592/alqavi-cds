'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    ShoppingBag, Search, RefreshCw, Loader2, AlertCircle, CheckCircle2, Clock, XCircle, Package,
    ChevronDown, ChevronUp, Activity, Trash2, Eye, ExternalLink, ShieldCheck, FileText, ImageIcon, Download
} from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

const fmt = (n: number) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
    DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock },
    PENDING: { label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    PROCESSING: { label: 'Processing', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Activity },
    SHIPPED: { label: 'Shipped', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Package },
    DELIVERED: { label: 'Delivered', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    RECEIVED: { label: 'Received', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    CANCELLED: { label: 'Cancelled', color: 'bg-red-50 text-red-600 border-red-200', icon: XCircle },
};

const PAY_META: Record<string, { label: string; color: string }> = {
    UNPAID: { label: 'Pending', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    PARTIAL: { label: 'Partial', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    PAID: { label: 'Paid', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
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
    const [paymentEdit, setPaymentEdit] = useState<any | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchOrders = useCallback(async () => {
        try {
            // Fetch all orders - we will filter in the frontend to ensure "Paid + Received" logic
            const { data } = await api.get('/v1/sales/purchases/', {
                params: { search: search || undefined }
            });
            let list = Array.isArray(data) ? data : data.results || [];

            // Filter: If statusFilter is 'all', only show orders that are NOT yet fully closed (Paid + Received/Cancelled)
            if (statusFilter === 'all') {
                list = list.filter((po: any) => {
                    const isClosed = (po.status === 'RECEIVED' || po.status === 'CANCELLED') && po.payment_status === 'PAID';
                    return !isClosed;
                });
            } else if (statusFilter !== 'all') {
                list = list.filter((po: any) => po.status === statusFilter);
            }

            setOrders(list);
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

    const handleUpdatePayment = async () => {
        if (!paymentEdit) return;
        setIsUpdating(true);
        try {
            const payload: any = {
                payment_status: paymentEdit.payment_status,
                payment_method: paymentEdit.payment_method || 'cash',
                paid_amount: paymentEdit.payment_status === 'PAID' ? paymentEdit.total_amount : (paymentEdit.paid_amount || 0),
                payment_date: paymentEdit.date || new Date().toISOString().slice(0, 10),
                payment_notes: paymentEdit.notes || ''
            };
            await api.patch(`/v1/sales/purchases/${paymentEdit.id}/`, payload);
            toast.success("Payment balance updated");
            setPaymentEdit(null);
            fetchOrders();
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Update failed");
        } finally {
            setIsUpdating(false);
        }
    };

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
                    {['all', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'].map(t => (
                        <button
                            key={t}
                            onClick={() => setStatusFilter(t)}
                            className={`pb-3 text-sm font-bold capitalize transition-all border-b-2 ${statusFilter === t ? 'border-[#F59E0B] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                        >
                            {t === 'all' ? 'All Orders' :
                                t === 'PENDING' ? 'Ordered' :
                                    t === 'PROCESSING' ? 'Confirmed' :
                                        t === 'SHIPPED' ? 'In Transit' :
                                            t === 'DELIVERED' ? 'Delivered' : t}
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
                                    <div className="flex gap-4">
                                        {po.status !== 'cancelled' && po.status !== 'received' && (
                                            <div className="flex flex-col gap-1.5 min-w-[150px]">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Order Status</label>
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
                                                    <option value="PENDING">Ordered</option>
                                                    <option value="PROCESSING">Confirmed</option>
                                                    <option value="SHIPPED">In Transit</option>
                                                    <option value="DELIVERED">Delivered</option>
                                                    <option value="RECEIVED">Received (Final)</option>
                                                    <option value="CANCELLED">Cancel Order</option>
                                                </select>
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-1.5 min-w-[150px]">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Payment</label>
                                            <button
                                                onClick={() => setPaymentEdit({ ...po, date: po.payment_date || new Date().toISOString().slice(0, 10), notes: po.payment_notes || '' })}
                                                className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-bold text-slate-700 hover:bg-gray-50 flex items-center justify-between"
                                            >
                                                <span>{po.payment_status || 'UNPAID'}</span>
                                                {po.payment_confirmed ? <ShieldCheck className="h-3 w-3 text-emerald-500" /> : <Activity className="h-3 w-3 text-[#F59E0B]" />}
                                            </button>
                                        </div>
                                    </div>
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

            {/* Payment Modal */}
            {paymentEdit && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-lg border border-gray-200 w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900">Update Payment - #{paymentEdit.purchase_number}</h3>
                            <button onClick={() => setPaymentEdit(null)}><Package className="h-5 w-5 text-gray-400" /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Payment Status</label>
                                    <select
                                        value={paymentEdit.payment_status}
                                        onChange={e => setPaymentEdit({ ...paymentEdit, payment_status: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm font-medium outline-none focus:border-[#F59E0B]"
                                    >
                                        <option value="UNPAID">Unpaid</option>
                                        <option value="PARTIAL">Partial Payment</option>
                                        <option value="PAID">Full Payment</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Method</label>
                                    <select
                                        value={paymentEdit.payment_method || 'cash'}
                                        onChange={e => setPaymentEdit({ ...paymentEdit, payment_method: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm font-medium outline-none focus:border-[#F59E0B]"
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="online">Online</option>
                                    </select>
                                </div>
                            </div>

                            {paymentEdit.payment_status === 'PARTIAL' && (
                                <div className="p-4 bg-amber-50 rounded border border-amber-100 space-y-4 animate-in slide-in-from-top-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1">Paid Amount</label>
                                            <input
                                                type="number"
                                                value={paymentEdit.paid_amount || 0}
                                                onChange={e => setPaymentEdit({ ...paymentEdit, paid_amount: e.target.value })}
                                                className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded text-sm outline-none focus:border-[#F59E0B]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1">Remaining</label>
                                            <div className="h-[34px] px-3 bg-white border border-amber-200 rounded text-sm font-bold text-red-600 flex items-center">
                                                {fmt(paymentEdit.total_amount - (paymentEdit.paid_amount || 0))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Payment Slip and Transaction ID for Supplier */}
                            <div className="p-4 bg-blue-50/50 rounded border border-blue-100 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-bold text-blue-800 uppercase">Payment Verification</span>
                                    {paymentEdit.payment_slip ? (
                                        <a
                                            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${paymentEdit.payment_slip}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-[11px] font-bold text-[#c45500] hover:underline"
                                        >
                                            <ImageIcon size={14} />
                                            View Slip
                                        </a>
                                    ) : (
                                        <span className="text-[11px] italic text-gray-400">No slip uploaded</span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Transaction ID / Ref #</label>
                                        <div className="px-3 py-1.5 bg-white border border-slate-200 rounded text-sm font-mono text-slate-700">
                                            {paymentEdit.transaction_id || '—'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Payment Date</label>
                                        <div className="px-3 py-1.5 bg-white border border-slate-200 rounded text-sm text-slate-700">
                                            {paymentEdit.payment_date || '—'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Confirmation</label>
                                        <div className={`px-3 py-1.5 border rounded text-[11px] font-black uppercase text-center ${paymentEdit.payment_confirmed ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                                            {paymentEdit.payment_confirmed ? 'Verified' : 'Pending Receipt'}
                                        </div>
                                    </div>
                                </div>

                                {!paymentEdit.payment_confirmed && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setIsUpdating(true);
                                            try {
                                                await api.patch(`/v1/sales/purchases/${paymentEdit.id}/`, {
                                                    payment_confirmed: true,
                                                    payment_status: 'PAID'
                                                });
                                                toast.success("Payment Received & Verified!");
                                                setPaymentEdit(null);
                                                fetchOrders();
                                            } catch (err: any) {
                                                toast.error("Verification failed");
                                            } finally {
                                                setIsUpdating(false);
                                            }
                                        }}
                                        className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[12px] shadow-sm transition-all animate-pulse"
                                    >
                                        <ShieldCheck size={16} />
                                        Confirm Receipt & Set as Paid
                                    </button>
                                )}
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    onClick={handleUpdatePayment}
                                    disabled={isUpdating}
                                    className="flex-1 py-2.5 bg-[#F59E0B] hover:bg-[#d97706] text-white rounded font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                                >
                                    {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Update Payment Record
                                </button>
                                <button onClick={() => setPaymentEdit(null)} className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
