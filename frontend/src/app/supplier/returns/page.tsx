'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    RotateCcw,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    Package,
    RefreshCw,
    Search,
    ChevronRight,
    Eye,
    Trash2,
    XCircle,
    Check,
    ChevronDown,
    ChevronUp,
    MessageSquare,
    AlertCircle
} from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

// ── Pure Amazon Formatting ───────────────────────────────────────────────────
const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });

const fmtDateTime = (d: string) =>
    new Date(d).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

const fmt = (n: number) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

const STATUS_DISPLAY: Record<string, string> = {
    WAITING_FOR_SUPPLIER: 'Waiting for Response',
    pending: 'Pending Registry',
    ACCEPTED: 'Accepted & Synced',
    REJECTED: 'Rejected Protocol',
    CANCELLED: 'Cancelled',
};

const getStatusStyles = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'ACCEPTED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'REJECTED') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (s === 'WAITING_FOR_SUPPLIER' || s === 'PENDING') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
};

export default function SupplierReturns() {
    const [filter, setFilter] = useState('all');
    const [returns, setReturns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);

    const [actionModal, setActionModal] = useState<{ open: boolean; type: 'accept' | 'reject' | null; ret: any | null }>({
        open: false, type: null, ret: null
    });
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; ret: any | null }>({
        open: false, ret: null
    });

    const fetchReturns = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/v1/sales/purchase-returns/', {
                params: { no_pagination: 'true' }
            });
            const results = Array.isArray(data) ? data : data.results || [];
            setReturns(results);
        } catch (err) {
            toast.error("Failed to sync return registry");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReturns();
    }, [fetchReturns]);

    const handleAction = async () => {
        if (!actionModal.ret || !actionModal.type) return;
        setProcessingId(actionModal.ret.id);

        try {
            if (actionModal.type === 'accept') {
                await api.post(`/v1/sales/purchase-returns/${actionModal.ret.id}/accept/`);
                toast.success("Return Accepted & Inventory Synced");
            } else {
                await api.post(`/v1/sales/purchase-returns/${actionModal.ret.id}/reject/`);
                toast.success("Return Rejected Successfully");
            }
            fetchReturns();
            setActionModal({ open: false, type: null, ret: null });
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Action failed");
        } finally {
            setProcessingId(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.ret) return;
        setProcessingId(deleteModal.ret.id);
        try {
            await api.delete(`/v1/sales/purchase-returns/${deleteModal.ret.id}/`);
            toast.success("Return record permanently removed");
            fetchReturns();
            setDeleteModal({ open: false, ret: null });
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Deletion failed");
        } finally {
            setProcessingId(null);
        }
    };

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const filtered = returns.filter(r => {
        const matchesSearch = r.return_number?.toLowerCase().includes(search.toLowerCase()) ||
            r.reason?.toLowerCase().includes(search.toLowerCase());
        const matchesTab = filter === 'all' || r.status === filter;
        return matchesSearch && matchesTab;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginatedReturns = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="max-w-[1000px] mx-auto animate-in fade-in duration-500 font-sans">

            {/* ── Page Header ── */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-medium text-slate-900 leading-tight">Return Registry</h1>
                        <p className="text-[13px] text-slate-500 mt-1 font-medium">Audit and process return requests from the distribution network.</p>
                    </div>
                    <button
                        onClick={fetchReturns}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#F59E0B] border border-gray-300 bg-white rounded hover:bg-gray-50 transition-all"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                            placeholder="Search return ID or reason..."
                            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-300 rounded focus:outline-none focus:border-[#F59E0B] transition-all"
                        />
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-6 border-b border-gray-200">
                    {['all', 'WAITING_FOR_SUPPLIER', 'ACCEPTED', 'REJECTED'].map(t => (
                        <button
                            key={t}
                            onClick={() => { setFilter(t); setCurrentPage(1); }}
                            className={`pb-3 text-sm font-bold capitalize transition-all border-b-2 ${filter === t ? 'border-[#F59E0B] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                        >
                            {t === 'all' ? 'Universal Registry' : t.replace(/_/g, ' ').toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Count ── */}
            <p className="text-sm text-slate-600 mb-5 font-medium">
                Showing <span className="font-bold">{filtered.length} return requests</span> across the network
            </p>

            {/* ── Table Registry ── */}
            {loading && returns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white border border-gray-300 rounded-xl">
                    <Loader2 className="h-8 w-8 text-[#F59E0B] animate-spin" />
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Synchronizing registry...</span>
                </div>
            ) : paginatedReturns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 border border-dashed border-gray-300 bg-white rounded-3xl text-center">
                    <RotateCcw className="h-12 w-12 text-slate-200 mx-auto" />
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No returns found</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-300 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#f0f2f2] border-b border-gray-300 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                    <th className="px-5 py-4 w-12"></th>
                                    <th className="px-5 py-4">Return #</th>
                                    <th className="px-5 py-4">Order #</th>
                                    <th className="px-5 py-4">Reason</th>
                                    <th className="px-5 py-4">Amount</th>
                                    <th className="px-5 py-4">Status</th>
                                    <th className="px-5 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {paginatedReturns.map(ret => {
                                    const isExpanded = expanded === ret.id;
                                    const statusStyle = getStatusStyles(ret.status);
                                    return (
                                        <>
                                            <tr key={ret.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-5 py-4">
                                                    <button
                                                        onClick={() => setExpanded(isExpanded ? null : ret.id)}
                                                        className="w-6 h-6 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:border-[#F59E0B] transition-all"
                                                    >
                                                        {isExpanded ? <ChevronUp size={14} className="text-[#F59E0B]" /> : <ChevronDown size={14} className="text-slate-400" />}
                                                    </button>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-900 group-hover:text-[#F59E0B] transition-colors">#{ret.return_number}</span>
                                                        <span className="text-[11px] text-slate-500 font-bold mt-0.5 uppercase tracking-tight">{fmtDateTime(ret.created_at)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="text-xs font-bold text-slate-600 px-2 py-1 bg-slate-50 rounded border border-gray-200">
                                                        PO: {ret.purchase_number || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <p className="text-xs font-medium text-slate-600 max-w-[200px] truncate italic" title={ret.reason}>
                                                        {ret.reason || 'No context provided'}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="text-sm font-black text-slate-900">{fmt(parseFloat(ret.total_refund_amount))}</span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-tighter ${statusStyle}`}>
                                                        {STATUS_DISPLAY[ret.status] || ret.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {(ret.status === 'WAITING_FOR_SUPPLIER' || ret.status === 'pending') && (
                                                            <>
                                                                <button
                                                                    onClick={() => setActionModal({ open: true, type: 'accept', ret })}
                                                                    className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                                    title="Accept Return"
                                                                >
                                                                    <Check size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setActionModal({ open: true, type: 'reject', ret })}
                                                                    className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-600 rounded-lg border border-rose-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                                                    title="Reject Return"
                                                                >
                                                                    <XCircle size={14} />
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => setDeleteModal({ open: true, ret })}
                                                            className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 text-slate-400 rounded-lg hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm"
                                                            title="Delete Record"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => setExpanded(isExpanded ? null : ret.id)}
                                                            className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 text-slate-400 rounded-lg hover:text-[#F59E0B] hover:border-[#F59E0B] transition-all shadow-sm"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-slate-50/50">
                                                    <td colSpan={7} className="px-14 py-6">
                                                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                                            <div className="px-5 py-3 bg-[#f0f2f2] border-b border-gray-200 flex items-center justify-between">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Return Manifest Breakdown</span>
                                                                <span className="text-[10px] font-black text-[#F59E0B] uppercase tracking-widest">{ret.items?.length || 0} Items Reported</span>
                                                            </div>
                                                            <table className="w-full text-left text-xs">
                                                                <thead>
                                                                    <tr className="text-slate-400 font-bold border-b border-gray-100 uppercase tracking-tighter">
                                                                        <th className="px-5 py-3">Product Description</th>
                                                                        <th className="px-5 py-3 text-center">Qty</th>
                                                                        <th className="px-5 py-3 text-right">Refund Price</th>
                                                                        <th className="px-5 py-3 text-right">Subtotal</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100">
                                                                    {ret.items?.map((it: any, i: number) => (
                                                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                                            <td className="px-5 py-3 font-bold text-slate-700">
                                                                                <div className="flex items-center gap-3">
                                                                                    <Package size={14} className="text-slate-300" />
                                                                                    {it.product_name}
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-5 py-3 text-center font-black text-slate-900">x{it.quantity}</td>
                                                                            <td className="px-5 py-3 text-right text-slate-500">{fmt(parseFloat(it.refund_price))}</td>
                                                                            <td className="px-5 py-3 text-right font-black text-slate-900">{fmt(parseFloat(it.refund_price) * it.quantity)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                                <tfoot>
                                                                    <tr className="bg-slate-50/80 font-black">
                                                                        <td colSpan={3} className="px-5 py-3 text-right text-slate-500 uppercase tracking-widest text-[9px]">Grand Total Refund</td>
                                                                        <td className="px-5 py-3 text-right text-[#F59E0B] text-sm">{fmt(parseFloat(ret.total_refund_amount))}</td>
                                                                    </tr>
                                                                </tfoot>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!loading && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-slate-50/30">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Page {currentPage} of {totalPages || 1}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setCurrentPage(p => Math.max(1, p - 1));
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    disabled={currentPage === 1}
                                    className="h-8 px-3 bg-white border border-gray-200 rounded-lg text-[9px] font-black uppercase text-slate-600 disabled:opacity-30 transition-all flex items-center gap-2 hover:bg-gray-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => {
                                        setCurrentPage(p => Math.min(totalPages, p + 1));
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    disabled={currentPage >= totalPages || totalPages === 0}
                                    className="h-8 px-4 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest disabled:opacity-30 transition-all hover:bg-black active:scale-95 flex items-center gap-2"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Sticky Protocol Box */}
            <div className="mt-12 bg-[#F59E0B]/5 rounded-3xl p-8 border border-[#F59E0B]/10 relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 opacity-5 text-[#F59E0B] rotate-12">
                    <AlertCircle size={160} />
                </div>
                <h4 className="text-[11px] font-black text-[#F59E0B] uppercase tracking-[0.3em] mb-4">RMA Verification Protocol</h4>
                <p className="text-[14px] font-bold text-slate-600 leading-relaxed tracking-tight relative z-10 max-w-2xl">
                    Accepting a return will automatically trigger an inventory synchronization across the regional hub.
                    Rejected returns require a valid reason recorded for the administrative audit trail.
                </p>
            </div>

            {/* Action Modal */}
            {actionModal.open && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-300">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto ${actionModal.type === 'accept' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-[18px] font-black text-slate-900 text-center tracking-tight mb-2 uppercase">Confirm {actionModal.type}</h3>
                        <p className="text-[13px] text-slate-500 font-medium text-center leading-relaxed">
                            You are about to {actionModal.type} the return request <span className="font-bold text-slate-900">#{actionModal.ret?.return_number}</span>.
                            This action is final and will update the financial ledger.
                        </p>
                        <div className="mt-8 flex gap-3">
                            <button onClick={() => setActionModal({ open: false, type: null, ret: null })} className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Cancel</button>
                            <button
                                onClick={handleAction}
                                disabled={!!processingId}
                                className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${actionModal.type === 'accept' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                            >
                                {processingId ? <Loader2 size={16} className="animate-spin" /> : `Confirm ${actionModal.type}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteModal.open && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto bg-rose-50 text-rose-600">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-[18px] font-black text-slate-900 text-center tracking-tight mb-2 uppercase text-rose-600">Delete Record?</h3>
                        <p className="text-[13px] text-slate-500 font-medium text-center leading-relaxed">
                            Are you sure you want to permanently delete return <span className="font-bold text-slate-900">#{deleteModal.ret?.return_number}</span>?
                            This action cannot be undone and will remove it from the audit registry.
                        </p>
                        <div className="mt-8 flex gap-3">
                            <button onClick={() => setDeleteModal({ open: false, ret: null })} className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Discard</button>
                            <button
                                onClick={handleDelete}
                                disabled={!!processingId}
                                className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700"
                            >
                                {processingId ? <Loader2 size={16} className="animate-spin" /> : "Delete Now"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
