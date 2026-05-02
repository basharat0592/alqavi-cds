'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    ShoppingBag, Search, RefreshCw, Loader2, AlertCircle, CheckCircle2, Clock, XCircle, Package,
    ChevronDown, ChevronUp, Activity, Trash2, Eye, ExternalLink, ShieldCheck, FileText, ImageIcon, Download,
    Check, X
} from 'lucide-react';
import api from '@/lib/axios';
import { purchaseService } from '@/services/purchase.service';
import toast from 'react-hot-toast';

const fmt = (n: number) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

const fmtDateTime = (d: string) =>
    new Date(d).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
    DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock },
    PENDING: { label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    PROCESSING: { label: 'Processing', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Activity },
    SHIPPED: { label: 'Shipped', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Package },
    DELIVERED: { label: 'Delivered', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    RECEIVED: { label: 'Received', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    CANCELLED: { label: 'Cancelled', color: 'bg-red-50 text-red-600 border-red-200', icon: XCircle },
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

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchOrders = useCallback(async () => {
        try {
            const { data } = await api.get('/v1/sales/purchases/', {
                params: {
                    search: search || undefined,
                    no_pagination: 'true'
                }
            });
            let list = Array.isArray(data) ? data : data.results || [];

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

    useEffect(() => {
        const t = setInterval(fetchOrders, 30000);
        return () => clearInterval(t);
    }, [fetchOrders]);

    const handleAcceptPayment = async (id: string) => {
        setIsUpdating(true);
        try {
            await purchaseService.acceptPayment(id);
            toast.success("Payment verified successfully!");
            fetchOrders();
            if (paymentEdit?.id === id) setPaymentEdit(null);
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to accept payment");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRejectPayment = async (id: string) => {
        const reason = prompt("Enter reason for rejection:");
        if (reason === null) return;
        
        setIsUpdating(true);
        try {
            await purchaseService.rejectPayment(id, reason);
            toast.success("Payment rejected");
            fetchOrders();
            if (paymentEdit?.id === id) setPaymentEdit(null);
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to reject payment");
        } finally {
            setIsUpdating(false);
        }
    };

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

    const totalPages = Math.ceil(orders.length / itemsPerPage);
    const paginatedOrders = orders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="max-w-[1200px] mx-auto animate-in fade-in duration-500 font-sans p-6">

            {/* ── Header ── */}
            <div className="mb-6">
                <div className="flex items-end justify-between mb-1 text-left">
                    <div>
                        <h1 className="text-3xl font-medium text-slate-900 leading-tight">Sales Orders (Purchases)</h1>
                        <p className="text-[13px] text-slate-500 mt-1 font-medium">Review and fulfill orders placed by distributors.</p>
                    </div>
                    <button
                        onClick={() => { setLoading(true); fetchOrders(); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#F59E0B] border border-gray-300 bg-white rounded hover:bg-gray-50 transition-all"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
                {lastSync && (
                    <p className="text-[11px] text-gray-400 mb-4 text-left">
                        Auto-syncing every 30s · Last synced: {lastSync.toLocaleTimeString()}
                    </p>
                )}

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                        placeholder="Search by PO number or supplier..."
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-300 rounded focus:outline-none focus:border-[#F59E0B] transition-all"
                    />
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-6 border-b border-gray-200">
                    {['all', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'].map(t => (
                        <button
                            key={t}
                            onClick={() => { setStatusFilter(t); setCurrentPage(1); }}
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
                <>
                    <div className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm text-left">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#f0f2f2] border-b border-gray-300">
                                    <th className="px-5 py-3 text-[11px] font-black text-slate-600 uppercase tracking-wider">Order Details</th>
                                    <th className="px-5 py-3 text-[11px] font-black text-slate-600 uppercase tracking-wider">Items</th>
                                    <th className="px-5 py-3 text-[11px] font-black text-slate-600 uppercase tracking-wider">Amount</th>
                                    <th className="px-5 py-3 text-[11px] font-black text-slate-600 uppercase tracking-wider w-[180px]">Status</th>
                                    <th className="px-5 py-3 text-[11px] font-black text-slate-600 uppercase tracking-wider min-w-[200px]">Payment Verification</th>
                                    <th className="px-5 py-3 text-[11px] font-black text-slate-600 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {paginatedOrders.map((po: any) => {
                                    const isExpanded = expanded === po.id;
                                    const isWaiting = po.payment_status && po.payment_status !== 'UNPAID' && !po.payment_confirmed;
                                    return (
                                        <React.Fragment key={po.id}>
                                            <tr className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[13px] font-black text-[#007185] hover:text-[#c45500] cursor-pointer hover:underline" onClick={() => setExpanded(isExpanded ? null : po.id)}>#{po.purchase_number}</span>
                                                        <span className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tight">{fmtDateTime(po.created_at || po.order_date)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-slate-50 border border-slate-100 rounded flex items-center justify-center">
                                                            <ShoppingBag size={14} className="text-slate-300" />
                                                        </div>
                                                        <span className="text-[13px] font-bold text-slate-700">{po.items?.length || 0} Units</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="text-[14px] font-black text-slate-900">{fmt(po.total_amount)}</span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {po.status !== 'cancelled' && po.status !== 'received' ? (
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
                                                            className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-[11px] font-black text-slate-700 outline-none focus:border-[#F59E0B] transition-shadow cursor-pointer uppercase tracking-tight"
                                                        >
                                                            <option value="PENDING">Ordered</option>
                                                            <option value="PROCESSING">Confirmed</option>
                                                            <option value="SHIPPED">In Transit</option>
                                                            <option value="DELIVERED">Delivered</option>
                                                            <option value="RECEIVED">Received (Final)</option>
                                                            <option value="CANCELLED">Cancel Order</option>
                                                        </select>
                                                    ) : (
                                                        <StatusBadge status={po.status} map={STATUS_META} />
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    {isWaiting ? (
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-2 py-1 rounded">
                                                                <Activity size={12} className="text-blue-600 animate-pulse" />
                                                                <span className="text-[10px] font-black text-blue-700 uppercase tracking-tighter">Review Required</span>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={() => setPaymentEdit({ ...po, date: po.payment_date || new Date().toISOString().slice(0, 10), notes: po.payment_notes || '' })}
                                                                    className="flex-1 px-2 py-1 bg-white border border-gray-300 rounded text-[10px] font-black text-slate-700 hover:bg-slate-50 transition-all uppercase"
                                                                >
                                                                    Review
                                                                </button>
                                                                <button
                                                                    onClick={() => handleAcceptPayment(po.id)}
                                                                    disabled={isUpdating}
                                                                    className="px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
                                                                    title="Accept Payment"
                                                                >
                                                                    <Check size={14} strokeWidth={3} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRejectPayment(po.id)}
                                                                    disabled={isUpdating}
                                                                    className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-all shadow-sm disabled:opacity-50"
                                                                    title="Reject Payment"
                                                                >
                                                                    <X size={14} strokeWidth={3} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setPaymentEdit({ ...po, date: po.payment_date || new Date().toISOString().slice(0, 10), notes: po.payment_notes || '' })}
                                                            className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-[11px] font-black text-slate-700 hover:bg-gray-50 flex items-center justify-between group-hover:border-[#F59E0B] transition-all uppercase tracking-tight"
                                                        >
                                                            <span>{po.payment_status || 'UNPAID'}</span>
                                                            {po.payment_confirmed ? <ShieldCheck size={12} className="text-emerald-500" /> : <Activity size={12} className="text-[#F59E0B]" />}
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => setExpanded(isExpanded ? null : po.id)}
                                                            className="p-2 text-slate-400 hover:text-[#007185] hover:bg-[#007185]/5 rounded-lg transition-all"
                                                            title={isExpanded ? "Hide Details" : "Show Details"}
                                                        >
                                                            {isExpanded ? <ChevronUp size={16} /> : <Eye size={16} />}
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
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Delete Record"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Expanded Row Content */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50/80">
                                                    <td colSpan={7} className="px-10 py-6">
                                                        <div className="animate-in slide-in-from-top-2 duration-300">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Itemized Manifest</h4>
                                                                <span className="text-[11px] font-bold text-slate-500">Tracking: {po.tracking_id || 'Internal Logistics'}</span>
                                                            </div>
                                                            <div className="space-y-3">
                                                                {po.items?.map((item: any, idx: number) => (
                                                                    <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0 border-dashed">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                                                                                <Package size={18} className="text-slate-200" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[13px] font-black text-slate-800">{item.product_name || item.product}</p>
                                                                                <p className="text-[10px] text-slate-400 font-medium">SKU Node: {item.sku || 'N/A'}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-10">
                                                                            <div className="text-right">
                                                                                <p className="text-[10px] text-slate-400 font-black uppercase">Unit Price</p>
                                                                                <p className="text-[13px] font-bold text-slate-700">{fmt(item.unit_price)}</p>
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <p className="text-[10px] text-slate-400 font-black uppercase">Quantity</p>
                                                                                <p className="text-[13px] font-black text-slate-900">{item.quantity}x</p>
                                                                            </div>
                                                                            <div className="text-right w-[100px]">
                                                                                <p className="text-[10px] text-slate-400 font-black uppercase">Subtotal</p>
                                                                                <p className="text-[13px] font-black text-[#007185]">{fmt(item.subtotal || item.quantity * item.unit_price)}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="mt-6 pt-6 border-t border-gray-300 flex justify-end">
                                                                <div className="flex items-center gap-10">
                                                                    <div className="text-right bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                                                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Grand Settlement</p>
                                                                        <p className="text-[20px] font-black text-slate-900">{fmt(po.total_amount)}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-slate-50/50 mt-4 rounded-lg">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Page {currentPage} of {totalPages || 1}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="h-9 px-4 bg-white border border-gray-200 rounded-lg text-[10px] font-black uppercase text-slate-600 disabled:opacity-30 flex items-center gap-2 hover:bg-gray-50 active:scale-95"
                            >
                                <ChevronDown size={14} className="rotate-90" /> Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages || totalPages === 0}
                                className="h-9 px-5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-30 transition-all hover:bg-black active:scale-95 flex items-center gap-2"
                            >
                                Next <ChevronUp size={14} className="rotate-90" />
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Payment Modal */}
            {paymentEdit && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-lg border border-gray-200 w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900">Update Payment - #{paymentEdit.purchase_number}</h3>
                            <button onClick={() => setPaymentEdit(null)}><XCircle className="h-5 w-5 text-gray-400" /></button>
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
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Confirmation</label>
                                        <div className={`px-3 py-1.5 border rounded text-[11px] font-black uppercase text-center ${paymentEdit.payment_confirmed ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                                            {paymentEdit.payment_confirmed ? 'Verified' : 'Pending Review'}
                                        </div>
                                    </div>
                                </div>

                                {!paymentEdit.payment_confirmed && paymentEdit.payment_status !== 'UNPAID' && (
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleAcceptPayment(paymentEdit.id)}
                                            disabled={isUpdating}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[12px] shadow-sm transition-all"
                                        >
                                            <ShieldCheck size={16} />
                                            Accept Payment
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRejectPayment(paymentEdit.id)}
                                            disabled={isUpdating}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[12px] shadow-sm transition-all"
                                        >
                                            <XCircle size={16} />
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    onClick={handleUpdatePayment}
                                    disabled={isUpdating}
                                    className="flex-1 py-2.5 bg-[#F59E0B] hover:bg-[#d97706] text-white rounded font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                                >
                                    {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Update Record
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
