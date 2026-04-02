'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    ShoppingCart, Plus, Search, RefreshCw, Trash2, Eye, Edit2,
    X, CheckCircle, AlertTriangle, Package, Loader2, Filter
} from 'lucide-react';
import { purchaseService } from '@/services/purchase.service';
import { formatDate, formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import PageLoader from '@/components/ui/PageLoader';

// ── Status pill ───────────────────────────────────────────────────────────────
const statusStyle: Record<string, string> = {
    draft:              'bg-slate-100 text-slate-600 border-slate-200',
    ordered:            'bg-blue-50 text-blue-700 border-blue-200',
    received:           'bg-emerald-50 text-emerald-700 border-emerald-200',
    partially_received: 'bg-amber-50 text-amber-700 border-amber-200',
    cancelled:          'bg-red-50 text-red-600 border-red-200',
    pending:            'bg-amber-50 text-amber-700 border-amber-200',
    partially_paid:     'bg-indigo-50 text-indigo-700 border-indigo-200',
    paid:               'bg-emerald-50 text-emerald-700 border-emerald-200',
};
const StatusPill = ({ status }: { status: string }) => {
    const s = (status || '').toLowerCase().replace(' ', '_');
    return (
        <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold capitalize ${statusStyle[s] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
            {(status || '').replace('_', ' ')}
        </span>
    );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PurchasesPage() {
    const router = useRouter();
    const [purchases, setPurchases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const [viewRow, setViewRow] = useState<any | null>(null);
    const [editRow, setEditRow] = useState<any | null>(null);
    const [deleteRow, setDeleteRow] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'alert' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'alert' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await purchaseService.getAll({ search, status: statusFilter });
            setPurchases(Array.isArray(data) ? data : data.results || []);
        } catch {
            showToast('Failed to load purchases', 'alert');
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter]);

    useEffect(() => { load(); }, [load]);

    if (loading) return <PageLoader />;

    const handleDelete = async () => {
        if (!deleteRow) return;
        setDeleting(true);
        try {
            await purchaseService.delete(deleteRow.id);
            showToast('Purchase order deleted.');
            setDeleteRow(null);
            load();
        } catch (e: any) {
            showToast(e?.response?.data?.error || e?.message || 'Delete failed', 'alert');
        } finally {
            setDeleting(false);
        }
    };

    const handleUpdateStatus = async () => {
        if (!editRow) return;
        setIsUpdating(true);
        try {
            await purchaseService.update(editRow.id, {
                status: editRow.status,
                payment_status: editRow.payment_status
            });
            showToast('Status updated.');
            setEditRow(null);
            load();
        } catch (e: any) {
            showToast(e?.response?.data?.error || 'Update failed', 'alert');
        } finally {
            setIsUpdating(false);
        }
    };

    const filtered = purchases.filter(p =>
        (p.purchase_number?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (p.supplier_name?.toLowerCase() || '').includes(search.toLowerCase())
    );

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Purchase Orders</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage inbound procurement records</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={load}
                        className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#F7CA00] hover:border-[#F7CA00]/40 transition-all"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => router.push('/admin/purchases/add')}
                        className="flex items-center gap-2 px-4 py-2 bg-[#F7CA00] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        New Purchase Order
                    </button>
                </div>
            </div>

            {/* ── Filters Bar ── */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by PO number or supplier..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] focus:ring-2 focus:ring-[#F7CA00]/10 transition-all placeholder:text-slate-400"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                    <option value="">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="ordered">Ordered</option>
                    <option value="received">Received</option>
                    <option value="partially_received">Partially Received</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            {/* ── Results count ── */}
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {loading ? 'Loading...' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
            </p>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-left">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">PO Number</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Supplier</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Items</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Order Date</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right whitespace-nowrap">Total</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Status</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Payment</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading && filtered.length === 0 ? (
                                Array(6).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={8} className="px-4 py-4">
                                            <div className="h-4 bg-slate-100 dark:bg-white/5 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-16 text-center">
                                        <Package className="h-10 w-10 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">No purchase orders found.</p>
                                        <button
                                            onClick={() => router.push('/admin/purchases/add')}
                                            className="text-sm text-[#F7CA00] hover:underline font-medium"
                                        >
                                            Create your first purchase order
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(row => (
                                    <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-4 py-3">
                                            <span className="text-[#F7CA00] font-medium text-sm">#{row.purchase_number}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-slate-800 dark:text-slate-200 font-medium text-sm">{row.supplier_name || '—'}</span>
                                        </td>
                                        <td className="px-4 py-3 max-w-[180px]">
                                            <span className="text-slate-500 dark:text-slate-400 text-sm truncate block" title={row.purchased_items}>
                                                {row.purchased_items || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-slate-500 dark:text-slate-400 text-sm">{row.order_date || '—'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-slate-800 dark:text-slate-200 font-semibold text-sm">{formatCurrency(row.total_amount || 0)}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusPill status={row.status} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusPill status={row.payment_status} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end items-center gap-1">
                                                <button
                                                    onClick={() => setViewRow(row)}
                                                    className="p-1.5 rounded-md text-slate-400 hover:text-[#F7CA00] hover:bg-blue-50 dark:hover:bg-[#F7CA00]/10 transition-colors"
                                                    title="View details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setEditRow({ ...row })}
                                                    className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                                                    title="Update status"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteRow(row)}
                                                    className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── View Modal ── */}
            {viewRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1B1C1E] rounded-xl border border-slate-200 dark:border-white/10 w-full max-w-md shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Purchase Order #{viewRow.purchase_number}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Order details</p>
                            </div>
                            <button onClick={() => setViewRow(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Supplier</p>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{viewRow.supplier_name || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Order Date</p>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{viewRow.order_date || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Order Status</p>
                                    <StatusPill status={viewRow.status} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Payment Status</p>
                                    <StatusPill status={viewRow.payment_status} />
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-100 dark:border-white/10">
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Amount</p>
                                <p className="text-2xl font-bold text-[#F7CA00]">{formatCurrency(viewRow.total_amount || 0)}</p>
                            </div>
                        </div>
                        <div className="px-5 py-3 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/10 flex justify-end">
                            <button onClick={() => setViewRow(null)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Modal ── */}
            {deleteRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1B1C1E] rounded-xl border border-slate-200 dark:border-white/10 max-w-sm w-full shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100 dark:border-white/10">
                            <div className="w-9 h-9 bg-red-100 dark:bg-red-500/10 rounded-lg flex items-center justify-center mt-0.5 shrink-0">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete Purchase Order</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Are you sure you want to delete <span className="font-semibold text-slate-700 dark:text-slate-300">#{deleteRow.purchase_number}</span>? This action cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-3">
                            <button onClick={() => setDeleteRow(null)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60">
                                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Update Status Modal ── */}
            {editRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1B1C1E] rounded-xl border border-slate-200 dark:border-white/10 w-full max-w-sm shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Update Order Status</h3>
                            <button onClick={() => setEditRow(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Order Status</label>
                                <select
                                    value={editRow.status}
                                    onChange={e => setEditRow({ ...editRow, status: e.target.value })}
                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] focus:ring-2 focus:ring-[#F7CA00]/10 text-slate-800 dark:text-slate-200 cursor-pointer"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="ordered">Ordered</option>
                                    <option value="received">Received</option>
                                    <option value="partially_received">Partially Received</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Payment Status</label>
                                <select
                                    value={editRow.payment_status}
                                    onChange={e => setEditRow({ ...editRow, payment_status: e.target.value })}
                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] focus:ring-2 focus:ring-[#F7CA00]/10 text-slate-800 dark:text-slate-200 cursor-pointer"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="partially_paid">Partially Paid</option>
                                    <option value="paid">Paid</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-3 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/10">
                            <button onClick={() => setEditRow(null)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateStatus}
                                disabled={isUpdating}
                                className="px-4 py-2 text-sm font-medium text-white bg-[#F7CA00] hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60 shadow-sm"
                            >
                                {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast ── */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[300] animate-in slide-in-from-bottom-4 duration-300">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-[#F7CA00]' : 'bg-red-600'}`}>
                        {toast.type === 'success'
                            ? <CheckCircle className="h-4 w-4 shrink-0" />
                            : <AlertTriangle className="h-4 w-4 shrink-0" />}
                        {toast.msg}
                    </div>
                </div>
            )}
        </div>
    );
}
