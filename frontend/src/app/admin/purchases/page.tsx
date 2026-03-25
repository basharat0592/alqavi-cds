'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    ShoppingCart, Plus, Search, RefreshCw, Trash2, Eye, Edit2,
    X, CheckCircle, AlertTriangle, Package, ChevronDown, Loader2
} from 'lucide-react';
import { purchaseService } from '@/services/purchase.service';
import { productService } from '@/services/product.service';
import { companyService } from '@/services/company.service';
import { formatDate } from '@/lib/utils';

// ── Shared Styles ────────────────────────────────────────────────────────────
const INPUT = (err?: boolean) =>
    `w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded text-sm outline-none transition-all
     focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-gray-400
     ${err ? 'border-red-600' : 'border-[#a6a6a6] dark:border-slate-700'}`;

const SELECT = () =>
    `w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#a6a6a6] dark:border-slate-700 rounded text-sm outline-none transition-all focus:border-[#e77600]`;

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 border border-[#ddd] dark:border-slate-800 rounded shadow-sm ${className}`}>
        {children}
    </div>
);

const StatusBadge = ({ value }: { value: string }) => {
    const statusColors: Record<string, string> = {
        draft: 'bg-gray-100 text-gray-600 border-gray-200',
        ordered: 'bg-blue-50 text-blue-700 border-blue-100',
        received: 'bg-green-50 text-green-700 border-green-100',
        partially_received: 'bg-amber-50 text-amber-700 border-amber-100',
        cancelled: 'bg-red-50 text-red-600 border-red-100',
        pending: 'bg-yellow-50 text-yellow-700 border-yellow-100',
        partially_paid: 'bg-orange-50 text-orange-700 border-orange-100',
        paid: 'bg-green-50 text-green-700 border-green-100',
    };
    return (
        <span className={`inline-flex px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest ${statusColors[value] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {value.replace('_', ' ')}
        </span>
    );
};

// ── Main Page ────────────────────────────────────────────────────────────────
export default function PurchasesPage() {
    const router = useRouter();
    const [purchases, setPurchases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Detail / delete
    const [viewRow, setViewRow] = useState<any | null>(null);
    const [editRow, setEditRow] = useState<any | null>(null);
    const [deleteRow, setDeleteRow] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await purchaseService.getAll({ search, status: statusFilter });
            setPurchases(Array.isArray(data) ? data : data.results || []);
        } catch {
            showToast('Failed to load purchases', 'error');
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async () => {
        if (!deleteRow) return;
        setDeleting(true);
        try {
            await purchaseService.delete(deleteRow.id);
            showToast('Purchase order deleted successfully.');
            setDeleteRow(null);
            load();
        } catch (e: any) {
            const msg = e?.response?.data?.error || e?.message || 'Delete failed';
            showToast(msg, 'error');
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
            showToast('Status updated successfully!');
            setEditRow(null);
            load();
        } catch (e: any) {
            showToast(e?.response?.data?.error || 'Update failed', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const filtered = purchases.filter(p =>
        (p.purchase_number?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (p.supplier_name?.toLowerCase() || '').includes(search.toLowerCase())
    );

    return (
        <div className="max-w-[1400px] mx-auto pb-12 font-sans px-4 mt-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-6 border border-gray-200 dark:border-slate-800 rounded shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <ShoppingCart className="h-6 w-6 text-[#E68A00]" /> Purchase Orders
                    </h1>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Manage stock purchases from suppliers</p>
                </div>
                <button
                    onClick={() => router.push('/admin/purchases/add')}
                    className="bg-[#E68A00] hover:bg-[#CC7A00] text-[#131921] px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" /> New Purchase
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total Orders', value: purchases.length },
                    { label: 'Draft', value: purchases.filter(p => p.status === 'draft').length },
                    { label: 'Ordered', value: purchases.filter(p => p.status === 'ordered').length },
                    { label: 'Received', value: purchases.filter(p => p.status === 'received').length },
                ].map(({ label, value }) => (
                    <Card key={label} className="p-5">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{label}</p>
                        <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <Card className="mb-6">
                <div className="p-4 flex flex-col md:flex-row gap-3 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by PO number or supplier..." className={`${INPUT()} pl-9`} />
                    </div>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 bg-white dark:bg-slate-800 border border-[#a6a6a6] dark:border-slate-700 rounded text-sm text-gray-700 dark:text-gray-200 outline-none focus:border-[#e77600]">
                        <option value="">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="ordered">Ordered</option>
                        <option value="received">Received</option>
                        <option value="partially_received">Partially Received</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <button onClick={load} className="p-2 border border-[#a6a6a6] rounded hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                        <RefreshCw className={`h-4 w-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </Card>

            {/* Table */}
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <th className="px-6 py-3">PO Number</th>
                                <th className="px-6 py-3">Supplier</th>
                                <th className="px-6 py-3">Products</th>
                                <th className="px-6 py-3">Order Date</th>
                                <th className="px-6 py-3">Total</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Payment</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i}><td colSpan={7} className="px-6 py-4 animate-pulse"><div className="h-4 bg-gray-100 rounded w-full" /></td></tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">No purchase orders found. <button onClick={() => router.push('/admin/purchases/add')} className="text-[#E68A00] font-bold underline">Create one</button></td></tr>
                            ) : filtered.map(row => (
                                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">{row.purchase_number}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-gray-700 dark:text-gray-300">{row.supplier_name || '—'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-1 max-w-[200px]" title={row.purchased_items}>
                                            {row.purchased_items || '—'}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{row.order_date}</td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">PKR {parseFloat(row.total_amount || 0).toLocaleString()}</p>
                                    </td>
                                    <td className="px-6 py-4"><StatusBadge value={row.status} /></td>
                                    <td className="px-6 py-4"><StatusBadge value={row.payment_status} /></td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setViewRow(row)} className="p-1.5 text-gray-500 hover:text-[#E68A00] transition-colors" title="View"><Eye className="h-4 w-4" /></button>
                                            <button onClick={() => setEditRow({ ...row })} className="p-1.5 text-gray-500 hover:text-[#E68A00] transition-colors" title="Edit Status"><Edit2 className="h-4 w-4" /></button>
                                            <button onClick={() => setDeleteRow(row)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* View Modal */}
            {viewRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded border border-gray-300 dark:border-slate-700 w-full max-w-lg shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Order #{viewRow.purchase_number}</h3>
                            <button onClick={() => setViewRow(null)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Supplier</p><p className="font-bold text-gray-900 dark:text-white">{viewRow.supplier_name || '—'}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Date</p><p className="font-medium text-gray-700 dark:text-gray-300">{viewRow.order_date}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</p><StatusBadge value={viewRow.status} /></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment</p><StatusBadge value={viewRow.payment_status} /></div>
                            </div>
                            <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Amount</p>
                                <p className="text-2xl font-black text-[#E68A00]">PKR {parseFloat(viewRow.total_amount || 0).toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="px-5 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 flex justify-end">
                            <button onClick={() => setViewRow(null)} className="px-6 py-1.5 bg-white dark:bg-slate-800 border border-[#adb1b8] rounded text-xs font-bold uppercase tracking-wider">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded border border-gray-300 dark:border-slate-700 max-w-sm w-full shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                            <AlertTriangle className="h-4 w-4 text-[#e47911]" />
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Confirm Delete</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                Are you sure you want to delete purchase order <span className="font-bold text-gray-900 dark:text-white">"{deleteRow.purchase_number}"</span>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700">
                            <button onClick={() => setDeleteRow(null)} className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-[#adb1b8] rounded text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleDelete} disabled={deleting} className="px-6 py-1.5 bg-[#f0c14b] hover:bg-[#ebae1e] border border-[#a88734] rounded text-xs font-bold text-[#111] transition-colors flex items-center gap-2 shadow-sm">
                                {deleting ? <Loader2 className="h-3 w-3 animate-spin text-gray-800" /> : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Status Modal */}
            {editRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded border border-gray-300 dark:border-slate-700 w-full max-w-sm shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Update Status</h3>
                            <button onClick={() => setEditRow(null)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Order Status</label>
                                <select 
                                    value={editRow.status} 
                                    onChange={e => setEditRow({ ...editRow, status: e.target.value })}
                                    className={SELECT()}
                                >
                                    <option value="draft">Draft</option>
                                    <option value="ordered">Ordered</option>
                                    <option value="received">Received</option>
                                    <option value="partially_received">Partially Received</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Payment Status</label>
                                <select 
                                    value={editRow.payment_status} 
                                    onChange={e => setEditRow({ ...editRow, payment_status: e.target.value })}
                                    className={SELECT()}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="partially_paid">Partially Paid</option>
                                    <option value="paid">Paid</option>
                                </select>
                            </div>
                        </div>
                        <div className="px-5 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
                            <button onClick={() => setEditRow(null)} className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-[#adb1b8] rounded text-xs font-medium">Cancel</button>
                            <button 
                                onClick={handleUpdateStatus} 
                                disabled={isUpdating}
                                className="px-6 py-1.5 bg-[#f0c14b] hover:bg-[#ebae1e] border border-[#a88734] rounded text-xs font-bold text-[#111] transition-colors flex items-center gap-2"
                            >
                                {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Update Status'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
            {toast && (
                <div className={`fixed bottom-6 right-6 px-6 py-4 rounded shadow-2xl flex items-center gap-3 min-w-[320px] border-l-4 z-[100] animate-in slide-in-from-bottom-5 duration-300
                    ${toast.type === 'success' ? 'bg-[#131921] text-white border-green-500' : 'bg-red-900 text-white border-red-500'}`}>
                    {toast.type === 'success' ? <CheckCircle className="h-5 w-5 text-green-400" /> : <AlertTriangle className="h-5 w-5 text-yellow-400" />}
                    <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-widest">{toast.type === 'success' ? 'Success' : 'Error'}</p>
                        <p className="text-sm font-medium opacity-90">{toast.msg}</p>
                    </div>
                    <button onClick={() => setToast(null)} className="text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
                </div>
            )}
        </div>
    );
}
