'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    ShoppingCart, Plus, Search, RefreshCw, Trash2, Eye, Edit2,
    X, CheckCircle, AlertTriangle, Package, Loader2, Filter,
    Users, Clock, CreditCard, FileText, Lock, Calendar, FileSpreadsheet, Printer
} from 'lucide-react';
import { purchaseService } from '@/services/purchase.service';
import { formatDate, formatCurrency, exportToCSV } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';

// ── Status pill ───────────────────────────────────────────────────────────────
const statusStyle: Record<string, string> = {
    pending: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    draft: 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200',
    processing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    shipped: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    delivered: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    received: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    cancelled: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
};

const StatusPill = ({ status }: { status: string }) => {
    const s = (status || '').toLowerCase();
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
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [viewRow, setViewRow] = useState<any | null>(null);
    const [editRow, setEditRow] = useState<any | null>(null);
    const [deleteRow, setDeleteRow] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await purchaseService.getAll({
                start_date: dateFrom || undefined,
                end_date: dateTo || undefined,
                status: statusFilter !== 'All' ? statusFilter : undefined,
                search: searchTerm || undefined
            });
            setPurchases(Array.isArray(data) ? data : data.results || []);
        } catch {
            console.error('Failed to load purchases');
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo, statusFilter, searchTerm]);

    useEffect(() => { 
        const handler = setTimeout(() => { load(); }, 400); // Debounce search
        return () => clearTimeout(handler);
    }, [load]);

    // Local filter only for very fast UI feedback on what's already loaded
    const filtered = purchases; 

    const handleDelete = async () => {
        if (!deleteRow) return;
        setDeleting(true);
        try {
            await purchaseService.delete(deleteRow.id);
            setPurchases(prev => prev.filter(p => p.id !== deleteRow.id));
            setDeleteRow(null);
        } catch {
            alert('Delete failed');
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
            setEditRow(null);
            load();
        } catch (e: any) {
            alert(e?.response?.data?.error || 'Update failed');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleViewDetails = async (id: string) => {
        try {
            const detailed = await purchaseService.getById(id);
            setViewRow(detailed);
        } catch {
            alert('Could not fetch details');
        }
    };

    if (loading) return <PageLoader />;

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Purchase Orders</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">View and manage all procurement records</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={load} className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#EEAF1C] hover:border-[#EEAF1C]/40 transition-all" title="Refresh">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => router.push('/admin/purchases/add')} className="flex items-center gap-2 px-4 py-2 bg-[#EEAF1C] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                        <Plus className="h-4 w-4" /> New Purchase
                    </button>
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-col xl:flex-row gap-3 mb-4 items-end">
                <div className="relative flex-1 min-w-[280px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by PO # or supplier..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#EEAF1C] transition-all"
                    />
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">From</label>
                        <input 
                            type="date" 
                            value={dateFrom} 
                            onChange={e => setDateFrom(e.target.value)}
                            className="px-3 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#EEAF1C] text-slate-700 dark:text-slate-300"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">To</label>
                        <input 
                            type="date" 
                            value={dateTo} 
                            onChange={e => setDateTo(e.target.value)}
                            className="px-3 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#EEAF1C] text-slate-700 dark:text-slate-300"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Status</label>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="px-3 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg min-w-[140px] outline-none focus:border-[#EEAF1C] text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                        <option value="All">All Statuses</option>
                        <option value="ordered">Ordered</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="received">Received</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => exportToCSV(purchases, `PurchaseOrders_Export.csv`)}
                        disabled={purchases.length === 0}
                        className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-emerald-600 transition-all shadow-sm disabled:opacity-30" 
                        title="Export to CSV (Excel)"
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                    </button>
                    <button 
                        onClick={() => window.print()}
                        disabled={purchases.length === 0}
                        className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#EEAF1C] transition-all shadow-sm disabled:opacity-30" 
                        title="Print / Save PDF"
                    >
                        <Printer className="h-4 w-4" />
                    </button>
                    <button 
                        onClick={() => { setDateFrom(''); setDateTo(''); setStatusFilter('All'); setSearchTerm(''); }}
                        className="px-3 py-2 text-sm text-slate-400 hover:text-rose-500 transition-colors bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10"
                        title="Reset All Filters"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {loading ? 'Loading...' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
            </p>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-left">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">PO #</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Supplier</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right uppercase tracking-wider">Amount</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {filtered.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-4 py-3">
                                        <span className="text-[#EEAF1C] font-medium text-sm">#{p.purchase_number}</span>
                                        {p.tracking_id && (
                                            <p className="text-[9px] text-slate-400 italic">TRK: {p.tracking_id}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.supplier_name}</p>
                                        <p className="text-xs text-slate-400 font-medium">{p.supplier_phone || ''}</p>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm">{formatDate(p.created_at)}</td>
                                    <td className="px-4 py-3"><StatusPill status={p.status} /></td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{formatCurrency(p.total_amount)}</span>
                                        <p className="text-[10px] text-slate-400 font-medium uppercase">{p.payment_status || ''}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end items-center gap-1">
                                            <button onClick={() => handleViewDetails(p.id)} className="p-1.5 rounded-md text-slate-400 hover:text-[#EEAF1C] hover:bg-blue-50 dark:hover:bg-[#EEAF1C]/10 transition-colors" title="View">
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => setEditRow(p)}
                                                className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                                                title="Update Status"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteRow(p)}
                                                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- Modals --- */}
            {viewRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1a252f] rounded-xl border border-slate-200 dark:border-white/10 max-w-2xl w-full max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">PO #{viewRow.purchase_number}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Procurement details</p>
                            </div>
                            <button onClick={() => setViewRow(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:bg-white/10 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto space-y-5">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/10">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <Users className="h-3.5 w-3.5 text-[#EEAF1C]" />
                                        <p className="text-xs text-slate-500 font-medium">Supplier</p>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{viewRow.supplier_name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{viewRow.supplier_phone || ''}</p>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/10">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                                        <p className="text-xs text-slate-500 font-medium">Date</p>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{formatDate(viewRow.created_at)}</p>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/10">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
                                        <p className="text-xs text-slate-500 font-medium">Logistics</p>
                                    </div>
                                    <StatusPill status={viewRow.status} />
                                </div>
                            </div>
                            <div className="border border-slate-100 dark:border-white/10 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/10 text-left text-xs font-semibold text-slate-500">
                                            <th className="px-4 py-2">Product</th>
                                            <th className="px-4 py-2 text-center">Qty</th>
                                            <th className="px-4 py-2 text-right">Price</th>
                                            <th className="px-4 py-2 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-white/5 text-sm">
                                        {viewRow.items?.map((item: any) => (
                                            <tr key={item.id}>
                                                <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{item.product_name}</td>
                                                <td className="px-4 py-2 text-center text-slate-600">{item.quantity}</td>
                                                <td className="px-4 py-2 text-right text-slate-600">{formatCurrency(item.unit_price)}</td>
                                                <td className="px-4 py-2 text-right font-semibold text-slate-800 dark:text-white">{formatCurrency(item.subtotal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="px-5 py-4 bg-slate-50 dark:bg-white/5 border-t flex justify-end">
                            <button onClick={() => setViewRow(null)} className="px-6 py-2 rounded-lg text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1a252f] rounded-xl border border-slate-200 dark:border-white/10 max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Update Status</h3>
                            <button onClick={() => setEditRow(null)} className="p-1.5 rounded-lg text-slate-400 dark:hover:text-white transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Logistics Phase</label>
                                <select 
                                    value={editRow.status} 
                                    onChange={e => setEditRow({ ...editRow, status: e.target.value })}
                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#EEAF1C] cursor-pointer"
                                >
                                    {/* Only show 'Received' and 'Cancelled' as per business request */}
                                    {/* Always show current status if it's not these two */}
                                    {editRow.status !== 'received' && editRow.status !== 'cancelled' && (
                                        <option value={editRow.status} disabled className="italic">{editRow.status.charAt(0).toUpperCase() + editRow.status.slice(1)} (Current)</option>
                                    )}
                                    
                                    <option value="received">Received / Arrived</option>
                                    
                                    {/* Block Cancellation if Shipped or Delivered/Received */}
                                    {!(editRow.status === 'shipped' || editRow.status === 'delivered' || editRow.status === 'received') && (
                                        <option value="cancelled">Cancelled</option>
                                    )}
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setEditRow(null)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg">
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleUpdateStatus} 
                                    disabled={isUpdating} 
                                    className="px-4 py-2 text-sm font-medium text-white bg-[#EEAF1C] rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {deleteRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1a252f] rounded-xl border border-slate-200 dark:border-white/10 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100">
                            <div className="w-9 h-9 bg-rose-50 rounded-lg flex items-center justify-center mt-0.5 shrink-0">
                                <AlertTriangle className="h-4 w-4 text-rose-500" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Delete Record</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Permanently delete PO <span className="font-semibold text-[#EEAF1C]">#{deleteRow.purchase_number}</span>?
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-3 bg-slate-50">
                            <button onClick={() => setDeleteRow(null)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600 bg-white border border-slate-200 rounded-lg">Cancel</button>
                            <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-white bg-rose-500 rounded-lg flex items-center gap-2">
                                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

