'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Package, RefreshCcw, Search, X, Eye, Printer,
    Filter, RefreshCw, AlertTriangle, Check, XCircle, ChevronRight,
    ShoppingBag, User, CreditCard, Clock, Loader2, CheckCircle2, Trash2
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - COMPONENTS
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] shadow-sm',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111] shadow-sm',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] ${styles[variant as keyof typeof styles]} ${className}`}>
            {children}
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
        </button>
    );
};

const inputCls = "w-full h-[35px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all font-medium";

const STATUS_FILTERS = ['All', 'Pending', 'Accepted', 'Rejected'];

// ── Status styling ───────────────────────────────────────────────────────────────
const getStatusStyle = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s === 'accepted' || s === 'authorized') return 'bg-green-50 text-green-700 border-green-200';
    if (s === 'rejected') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-slate-50 text-slate-500 border-slate-200';
};

// ── Return Detail Modal ───────────────────────────────────────────────────────
function ReturnDetailModal({ returnData, onClose, onUpdate }: { returnData: any; onClose: () => void; onUpdate: () => void }) {
    const [loading, setLoading] = useState(false);

    const handleAction = async (status: string) => {
        setLoading(true);
        try {
            await api.patch(`v1/sales/returns/${returnData.id}/`, { status: status.toUpperCase() });
            toast.success(`Return request ${status.toLowerCase()} successfully`);
            onUpdate();
            onClose();
        } catch (e: any) {
            toast.error(e.response?.data?.error || "Failed to update return");
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[4px] border border-[#ddd] max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-[#f7f8fa] border-b border-[#ddd]">
                    <div className="flex items-center gap-2">
                        <Package size={16} className="text-[#565959]" />
                        <h3 className="text-[15px] font-bold text-[#111]">Return Sequence #{returnData.return_number}</h3>
                    </div>
                    <button onClick={onClose} disabled={loading} className="p-1 rounded text-[#565959] hover:text-[#111] transition-all">
                        <XCircle size={18} />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Meta grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-6 border-b border-gray-100">
                        {[
                            { label: 'Source Order', value: <span className="text-[#007185] font-black">{returnData.order_tracking_id}</span> },
                            { label: 'Client Name', value: returnData.customer_name },
                            { label: 'Lifecycle', value: <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-black uppercase border shadow-sm ${getStatusStyle(returnData.status)}`}>{returnData.status}</span> },
                            { label: 'Submission', value: formatDateTime(returnData.created_at) },
                        ].map(({ label, value }) => (
                            <div key={label}>
                                <p className="text-[10px] font-black text-[#565959] uppercase tracking-wider mb-1">{label}</p>
                                <div className="text-[13px] font-bold text-[#111]">{value}</div>
                            </div>
                        ))}
                    </div>

                    <div className="p-5 bg-[#fff4e5] border border-[#ffb347]/30 rounded-[4px] flex gap-4">
                        <AlertTriangle className="text-[#e47911] shrink-0" size={18} />
                        <div>
                            <p className="text-[11px] font-black text-[#111] uppercase tracking-widest mb-1">Return Reason Statement</p>
                            <p className="text-[13px] text-[#565959] leading-relaxed font-medium italic">"{returnData.reason}"</p>
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <p className="text-[11px] font-black text-[#565959] uppercase tracking-widest mb-3">Requested Items for Return</p>
                        <div className="border border-[#ddd] rounded-[4px] overflow-hidden">
                            <table className="w-full text-left text-[13px]">
                                <thead>
                                    <tr className="bg-[#f7f8fa] border-b border-[#ddd]">
                                        <th className="px-4 py-3 text-[10px] font-black text-[#565959] uppercase">Product Details</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-[#565959] uppercase text-center">Quantity</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-[#565959] uppercase text-right">Refund Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#eee]">
                                    {returnData.items.map((item: any) => (
                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-4 font-bold text-[#007185]">{item.product_name}</td>
                                            <td className="px-4 py-4 text-center font-bold text-[#111]">{item.quantity} units</td>
                                            <td className="px-4 py-4 text-right font-black text-[#B12704]">Rs. {(item.price * item.quantity).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-[#fcfdff] font-black">
                                        <td colSpan={2} className="px-4 py-3 text-right text-[#565959] uppercase text-[10px]">Total Refund Amount</td>
                                        <td className="px-4 py-3 text-right text-[16px] text-[#B12704]">
                                            Rs. {(returnData.items?.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0) || 0).toLocaleString()}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="px-8 py-6 bg-[#f7f8fa] border-t border-[#ddd] flex justify-between items-center">
                    <Btn variant="secondary" onClick={onClose} disabled={loading} className="!h-9 !px-8">Dismiss</Btn>
                    {returnData.status.toUpperCase() === 'PENDING' && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleAction('REJECTED')}
                                disabled={loading}
                                className="h-9 px-6 text-[13px] font-bold text-white bg-[#B12704] hover:bg-[#8f2003] border border-[#8f2003] rounded-[3px] shadow-sm transition-all active:scale-[0.98] flex items-center gap-2"
                            >
                                <XCircle size={14} /> Reject Request
                            </button>
                            <button
                                onClick={() => handleAction('ACCEPTED')}
                                disabled={loading}
                                className="h-9 px-8 text-[13px] font-bold text-[#111] bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] rounded-[3px] shadow-sm transition-all active:scale-[0.98] flex items-center gap-2"
                            >
                                <CheckCircle2 size={14} /> Accept & Restock
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SaleReturnsPage() {
    const router = useRouter();
    const [returns, setReturns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedReturn, setSelectedReturn] = useState<any>(null);
    const [returnToDelete, setReturnToDelete] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);

    const loadReturns = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data } = await api.get('v1/sales/returns/');
            setReturns(Array.isArray(data) ? data : data.results || []);
        } catch (e) {
            toast.error("Failed to load return requests");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleDelete = async () => {
        if (!returnToDelete) return;
        setDeleting(true);
        try {
            await api.delete(`v1/sales/returns/${returnToDelete.id}/`);
            toast.success("Return record deleted successfully");
            setReturnToDelete(null);
            loadReturns();
        } catch (e: any) {
            toast.error(e.response?.data?.error || "Failed to delete return record");
        } finally {
            setDeleting(false);
        }
    };

    useEffect(() => {
        loadReturns();
    }, [loadReturns]);

    // AUTO-SYNC (5s)
    useEffect(() => {
        const interval = setInterval(() => {
            if (!loading && !selectedReturn && !returnToDelete) loadReturns(true);
        }, 5000);
        return () => clearInterval(interval);
    }, [loading, selectedReturn, returnToDelete, loadReturns]);

    const filtered = (returns || []).filter(r => {
        const matchesSearch =
            (r.return_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.order_tracking_id || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || (r.status || '').toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
    });

    if (loading && returns.length === 0) return <PageLoader />;

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1440px] mx-auto px-6 pt-5 text-left">

                {/* ── Breadcrumb ── */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500] font-bold">Return Management</span>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-[22px] font-normal text-[#111]">Customer Return Requests</h1>
                    </div>
                    <div className="flex gap-2">
                        <Btn variant="secondary" onClick={() => loadReturns()} loading={loading}>
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                        </Btn>
                    </div>
                </div>
                <div className="border-b border-[#ddd] mb-6" />

                {/* Filters */}
                <div className="bg-white border border-[#ddd] rounded-[4px] p-5 mb-6 shadow-sm flex flex-wrap items-center gap-5 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search by return #, order # or customer..."
                            className={`${inputCls} pl-10`}
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                        {STATUS_FILTERS.map(f => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                className={`px-4 h-[31px] rounded-[3px] text-[12px] font-bold transition-all border whitespace-nowrap ${statusFilter === f ? 'bg-[#e77600] border-[#c45500] text-white shadow-inner' : 'bg-white border-[#adb1b8] text-[#565959] hover:border-[#888c8e]'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Returns Table */}
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden animate-in fade-in duration-700">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f7f8fa] border-b border-[#ddd] text-[11px] font-bold text-[#565959] uppercase tracking-wider">
                                <th className="px-6 py-3">Return ID</th>
                                <th className="px-6 py-3">Source Order</th>
                                <th className="px-6 py-3">Customer</th>
                                <th className="px-6 py-3 text-right">Refund Value</th>
                                <th className="px-6 py-3 text-center">Lifecycle</th>
                                <th className="px-6 py-3 text-right">Controls</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eee]">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={6} className="py-24 text-center">
                                    <div className="opacity-10 mb-4"><Package size={60} className="mx-auto" /></div>
                                    <p className="text-[14px] text-[#565959] font-medium italic">No return requests found matching your criteria.</p>
                                </td></tr>
                            ) : (
                                filtered.map(r => (
                                    <tr key={r.id} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                        <td className="px-6 py-4">
                                            <div className="text-[14px] font-bold text-[#007185] group-hover:underline cursor-pointer" onClick={() => setSelectedReturn(r)}>
                                                #{r.return_number}
                                            </div>
                                            <div className="text-[11px] text-[#565959] mt-1 flex items-center gap-1.5 font-medium">
                                                <Clock size={12} className="text-[#adb1b8]" /> {formatDateTime(r.created_at)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-[#111] font-bold">{r.order_tracking_id}</div>
                                            <div className="text-[10px] text-[#007600] font-black uppercase mt-1 tracking-tighter">Verified Order</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-[#111] font-bold flex items-center gap-2">
                                                <User size={14} className="text-[#adb1b8]" /> {r.customer_name}
                                            </div>
                                            <div className="text-[11px] text-[#565959] mt-1 font-medium italic">Authenticated Account</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-[16px] font-black text-[#B12704]">
                                                Rs. {(r.items?.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0) || 0).toLocaleString()}
                                            </div>
                                            <div className="text-[10px] text-[#565959] font-bold uppercase mt-1">
                                                {r.items?.length || 0} Item{r.items?.length !== 1 ? 's' : ''}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className={`px-3 py-1 rounded-[2px] text-[10px] font-black uppercase border shadow-sm ${getStatusStyle(r.status)}`}>
                                                    {r.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 transition-opacity">
                                                <button onClick={() => setSelectedReturn(r)} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-[#f7f8fa] text-[#565959] shadow-sm" title="Inspect Request"><Eye size={14} /></button>
                                                <button className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-[#f7f8fa] text-[#565959] shadow-sm" title="Print Details"><Printer size={14} /></button>
                                                <button onClick={() => setReturnToDelete(r)} className="p-1.5 border border-rose-200 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 shadow-sm" title="Delete Return">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Summary Note */}
                <div className="mt-8 bg-[#fff4e5] border border-[#ffb347]/30 rounded-[4px] p-4 flex gap-4 items-start animate-in fade-in duration-1000 shadow-sm">
                    <AlertTriangle className="text-[#e47911] shrink-0 mt-0.5" size={18} />
                    <div>
                        <p className="text-[13px] font-bold text-[#111]">Stock Reconciliation Warning</p>
                        <p className="text-[12px] text-[#565959] leading-relaxed">Approving a return will automatically restock the items into the active inventory. Ensure physical items have been received and inspected for damage before 'Accepting' the request.</p>
                    </div>
                </div>
            </div>

            {selectedReturn && <ReturnDetailModal returnData={selectedReturn} onClose={() => setSelectedReturn(null)} onUpdate={loadReturns} />}

            {/* Delete Confirmation Modal */}
            {returnToDelete && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[4px] border border-[#ddd] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 text-left">
                        <div className="bg-[#f7f8fa] border-b border-[#ddd] px-5 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={16} className="text-rose-600" />
                                <span className="text-[13px] font-bold text-[#111]">Delete Return Record</span>
                            </div>
                            <button onClick={() => setReturnToDelete(null)} className="text-[#565959] hover:text-[#111] transition-colors p-1 rounded">
                                <XCircle size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-center mb-2">
                                <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center">
                                    <Trash2 size={24} className="text-rose-600" />
                                </div>
                            </div>
                            <div className="text-center">
                                <h3 className="text-[15px] font-bold text-[#111] leading-snug">Permanently delete this record?</h3>
                                <p className="text-[12px] text-[#565959] mt-2 leading-relaxed">
                                    You are about to delete Return Sequence <strong>#{returnToDelete.return_number}</strong>. This action is irreversible.
                                </p>
                            </div>
                        </div>
                        <div className="px-6 pb-6 flex gap-3">
                            <Btn variant="secondary" onClick={() => setReturnToDelete(null)} className="flex-1 !h-9 shadow-sm" disabled={deleting}>Cancel</Btn>
                            <button onClick={handleDelete} disabled={deleting} className="flex-1 h-9 bg-[#B12704] hover:bg-[#8f2003] hover:shadow transition-all border border-[#8f2003] text-white text-[13px] font-medium rounded-[3px] shadow-sm flex items-center justify-center gap-2 disabled:opacity-50">
                                {deleting ? <Loader2 size={14} className="animate-spin border-t-white" /> : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


