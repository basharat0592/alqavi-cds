'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    RotateCcw, Plus, Search, RefreshCw, Trash2, Eye, Edit2,
    X, CheckCircle, AlertTriangle, Loader2, Package, ChevronRight, Save
} from 'lucide-react';
import { purchaseService } from '@/services/purchase.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - RETURNS LIST
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111]',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const inputCls = "w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all";

const statusStyle: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    waiting_for_supplier: 'bg-amber-50 text-amber-700 border-amber-200',
    accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
};

const StatusPill = ({ status }: { status: string }) => (
    <span className={`inline-block px-2 py-0.5 rounded-[3px] border text-[11px] font-bold capitalize ${statusStyle[(status || '').toLowerCase()] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
        {(status || '').replace('_', ' ')}
    </span>
);

export default function PurchaseReturnsPage() {
    const router = useRouter();
    const [returns, setReturns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [viewRow, setViewRow] = useState<any | null>(null);
    const [deleteRow, setDeleteRow] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const r = await purchaseService.getReturns();
            setReturns(Array.isArray(r) ? r : r?.results || []);
        } catch { 
            toast.error('Failed to load returns'); 
        } finally { 
            setLoading(false); 
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => {
        router.push('/admin/purchases/returns/add');
    };

    const handleDelete = async () => {
        if (!deleteRow) return;
        setDeleting(true);
        try {
            await purchaseService.deleteReturn(deleteRow.id);
            toast.success('Return record deleted');
            setDeleteRow(null);
            load(true);
        } catch {
            toast.error('Delete failed');
        } finally {
            setDeleting(false);
        }
    };

    const filtered = returns.filter(r =>
        (r.return_number?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (r.supplier_name?.toLowerCase() || '').includes(search.toLowerCase())
    );

    return (
        <div className="bg-[#F8FAFC] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1250px] mx-auto px-6 pt-5">

                {/* Breadcrumb */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <Link href="/admin/purchases" className="hover:text-[#c45500] hover:underline">Purchases</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500]">Returns</span>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-[22px] font-normal italic">Purchase Returns</h1>
                    <div className="flex items-center gap-2">
                        <Btn variant="secondary" onClick={() => load()}>
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        </Btn>
                        <Btn onClick={openAdd}>
                            <Plus size={14} /> New Return
                        </Btn>
                    </div>
                </div>
                <div className="border-b border-[#ddd] mb-6" />

                {/* Filters & Search */}
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm p-4 mb-6 flex flex-wrap items-center gap-4">
                    <div className="relative w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888c8e]" size={14} />
                        <input
                            className={inputCls + " pl-9"}
                            placeholder="Search by Return # or Supplier..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="h-5 w-[1px] bg-[#ddd] hidden md:block" />
                    <span className="text-[13px] text-[#565959]">
                        Showing {filtered.length} records
                    </span>
                </div>

                {/* Main Table */}
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#f7f8fa] border-b border-[#ddd]">
                                    <th className="px-4 py-3 text-[12px] font-bold uppercase text-[#565959] tracking-wider">Return #</th>
                                    <th className="px-4 py-3 text-[12px] font-bold uppercase text-[#565959] tracking-wider">Details</th>
                                    <th className="px-4 py-3 text-[12px] font-bold uppercase text-[#565959] tracking-wider">Date</th>
                                    <th className="px-4 py-3 text-[12px] font-bold uppercase text-[#565959] tracking-wider">Refund Amount</th>
                                    <th className="px-4 py-3 text-[12px] font-bold uppercase text-[#565959] tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-[12px] font-bold uppercase text-[#565959] tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#eee]">
                                {loading && filtered.length === 0 ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={6} className="px-4 py-4 h-14 bg-gray-50/50" />
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-20 text-center">
                                            <div className="flex flex-col items-center opacity-40">
                                                <RotateCcw size={40} className="mb-2 text-slate-300" />
                                                <p className="text-[14px]">No return records found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(row => (
                                        <tr key={row.id} className="hover:bg-[#f3f7f7] transition-all group">
                                            <td className="px-4 py-4">
                                                <span className="text-[13px] font-bold text-[#007185] hover:underline cursor-pointer group-hover:text-[#c45500]">
                                                    #{row.return_number}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-bold">{row.supplier_name || 'Generic Supplier'}</span>
                                                    <span className="text-[11px] text-[#565959] italic">Ref: {row.purchase_number || 'Standalone'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-[13px] text-[#565959]">{row.return_date}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-[14px] font-bold text-[#B12704]">{formatCurrency(row.total_refund_amount || 0)}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <StatusPill status={row.status} />
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button onClick={() => setViewRow(row)} className="p-1.5 rounded-[3px] border border-transparent hover:border-[#ddd] hover:bg-white text-[#565959] transition-all" title="View"><Eye size={14} /></button>
                                                    <button onClick={() => setDeleteRow(row)} className="p-1.5 rounded-[3px] border border-transparent hover:border-[#ddd] hover:bg-white text-red-500 transition-all" title="Delete"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* View Modal */}
            {viewRow && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-[4px] border border-[#ddd] w-full max-w-lg shadow-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa] flex items-center justify-between">
                            <h3 className="text-[16px] font-bold">Return Record Details</h3>
                            <button onClick={() => setViewRow(null)}><X size={18} className="text-[#565959]" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-y-4 text-[13px]">
                                <div><p className="text-[#565959] mb-1">Return #</p><p className="font-bold">#{viewRow.return_number}</p></div>
                                <div><p className="text-[#565959] mb-1">Date</p><p className="font-bold">{viewRow.return_date}</p></div>
                                <div><p className="text-[#565959] mb-1">Supplier</p><p className="font-bold">{viewRow.supplier_name}</p></div>
                                <div><p className="text-[#565959] mb-1">Status</p><StatusPill status={viewRow.status} /></div>
                            </div>
                            {viewRow.reason && (
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-[3px]">
                                    <p className="text-[12px] font-bold mb-1 opacity-60">REASON</p>
                                    <p className="text-[13px] italic">"{viewRow.reason}"</p>
                                </div>
                            )}
                            <div className="pt-4 border-t border-[#ddd] flex justify-between items-center">
                                <span className="text-[13px]">Total Refund Amount:</span>
                                <span className="text-[20px] font-bold text-[#b12704]">{formatCurrency(viewRow.total_refund_amount || 0)}</span>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-[#f7f8fa] border-t border-[#ddd] flex justify-end">
                            <Btn variant="secondary" onClick={() => setViewRow(null)}>Close</Btn>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteRow && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-[4px] border border-[#ddd] max-w-sm w-full shadow-xl p-6 text-center">
                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={24} className="text-red-600" />
                        </div>
                        <h3 className="text-[16px] font-bold mb-2">Delete Return?</h3>
                        <p className="text-[13px] text-[#565959] mb-6">
                            Are you sure you want to delete <span className="font-bold text-[#000]">#{deleteRow.return_number}</span>? This action cannot be undone.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <Btn variant="secondary" onClick={() => setDeleteRow(null)}>Cancel</Btn>
                            <button onClick={handleDelete} disabled={deleting} className="bg-red-600 text-white rounded-[3px] text-[13px] font-bold hover:bg-red-700 disabled:opacity-50">
                                {deleting ? 'Deleting...' : 'Delete Forever'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
