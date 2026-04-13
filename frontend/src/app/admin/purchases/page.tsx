'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
    const [paymentFilter, setPaymentFilter] = useState('All');

    const [viewRow, setViewRow] = useState<any | null>(null);
    const [copied, setCopied] = useState(false);
    const copyTimeoutRef = useRef<number | null>(null);
    const [editRow, setEditRow] = useState<any | null>(null);
    const [deleteRow, setDeleteRow] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (statusFilter && statusFilter !== 'All') params.status = statusFilter;
            if (paymentFilter && paymentFilter !== 'All') params.payment_status = paymentFilter;
            if (searchTerm) params.search = searchTerm;

            const data = await purchaseService.getAll(params);
            setPurchases(data || []);
        } catch (err) {
            console.error('Failed to load purchases', err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, paymentFilter, searchTerm]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        // reset copied state when view modal changes
        setCopied(false);
        if (copyTimeoutRef.current) {
            window.clearTimeout(copyTimeoutRef.current);
            copyTimeoutRef.current = null;
        }
    }, [viewRow]);

    const purchasesList = Array.isArray(purchases) ? purchases : (purchases && purchases.results) ? purchases.results : [];

    const filtered = purchasesList.filter((p: any) => {
        let ok = true;
        if (statusFilter && statusFilter !== 'All' && p.status !== statusFilter) ok = false;
        if (paymentFilter && paymentFilter !== 'All' && p.payment_status !== paymentFilter) ok = false;
        if (searchTerm) {
            const s = searchTerm.toLowerCase();
            const num = String(p.purchase_number || '').toLowerCase();
            const sup = (p.supplier_name || '').toLowerCase();
            if (!num.includes(s) && !sup.includes(s)) ok = false;
        }
        return ok;
    });

    // ── Handlers ─────────────────────────────────────────────────────────
    const handleViewDetails = async (id: string) => {
        try {
            const data = await purchaseService.getById(id);
            setViewRow(data);
        } catch (err) {
            console.error('Failed to fetch purchase', err);
            alert('Failed to load purchase details');
        }
    };

    const handleUpdateStatus = async () => {
        if (!editRow) return;
        setIsUpdating(true);
        try {
            const payload: any = { status: editRow.status };
            if (editRow.status !== 'cancelled') {
                if (editRow.payment_status) payload.payment_status = editRow.payment_status;
                if (editRow.payment_method) payload.payment_method = editRow.payment_method;
            }
            await purchaseService.update(editRow.id, payload);
            setEditRow(null);
            await load();
        } catch (err) {
            console.error('Failed to update purchase', err);
            alert('Failed to update purchase');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteRow) return;
        setDeleting(true);
        try {
            await purchaseService.delete(deleteRow.id);
            setDeleteRow(null);
            await load();
        } catch (err) {
            console.error('Failed to delete purchase', err);
            alert('Failed to delete purchase');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-[#F59E0B]" /> Purchase Orders
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Manage stock purchases from suppliers</p>
                </div>
                <div>
                    <button
                        onClick={() => router.push('/admin/purchases/add')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md shadow-sm text-sm font-bold"
                        title="New Purchase"
                    >
                        <Plus className="h-4 w-4 text-[#131921]" />
                        <span className="text-[#131921]">New Purchase</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-3 mb-4 items-end">
                <div className="relative flex-1 min-w-[280px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by PO # or supplier..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F59E0B] transition-all"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Payment</label>
                    <select
                        value={paymentFilter}
                        onChange={e => setPaymentFilter(e.target.value)}
                        className="px-3 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg min-w-[140px] outline-none focus:border-[#F59E0B] text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                        <option value="All">All Payments</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="partial">Partial</option>
                        <option value="paid">Paid</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Status</label>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="px-3 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg min-w-[140px] outline-none focus:border-[#F59E0B] text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                        <option value="All">All Statuses</option>
                        <option value="ordered">Ordered</option>
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
                        className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#F59E0B] transition-all shadow-sm disabled:opacity-30"
                        title="Print / Save PDF"
                    >
                        <Printer className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {loading ? 'Loading...' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
            </p>

            {/* ── Amazon Professional Table ── */}
            <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-[13px] border-collapse">
                        <thead>
                            <tr className="bg-[#F0F2F2] dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-left">
                                <th className="px-5 py-2.5 font-bold text-[#232F3E] dark:text-slate-300 uppercase tracking-tight w-24">Order ID</th>
                                <th className="px-5 py-2.5 font-bold text-[#232F3E] dark:text-slate-300 uppercase tracking-tight">Supplier Protocol</th>
                                <th className="px-5 py-2.5 font-bold text-[#232F3E] dark:text-slate-300 uppercase tracking-tight">Processing Date</th>
                                <th className="px-5 py-2.5 font-bold text-[#232F3E] dark:text-slate-300 uppercase tracking-tight">Status</th>
                                <th className="px-5 py-2.5 font-bold text-[#232F3E] dark:text-slate-300 uppercase tracking-tight">Payment Detail</th>
                                <th className="px-5 py-2.5 font-bold text-[#232F3E] dark:text-slate-300 text-right uppercase tracking-tight">Grand Total</th>
                                <th className="px-5 py-2.5 font-bold text-[#232F3E] dark:text-slate-300 text-right uppercase tracking-tight">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-40">
                                            <Package className="h-10 w-10 text-slate-400" />
                                            <p className="text-sm font-medium">No procurement records matching filters</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(p => (
                                    <tr key={p.id} className="hover:bg-[#F7FAFA] dark:hover:bg-white/[0.01] transition-colors group border-b border-slate-100 last:border-0">
                                        <td className="px-5 py-3 align-top whitespace-nowrap">
                                            <span className="text-[#F59E0B] hover:underline font-bold cursor-pointer">#{p.purchase_number}</span>
                                        </td>
                                        <td className="px-5 py-3 align-top">
                                            <p className="font-bold text-[#232F3E] dark:text-slate-200">{p.supplier_name}</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">{p.supplier_phone || 'Direct Source'}</p>
                                        </td>
                                        <td className="px-5 py-3 align-top text-slate-600 dark:text-slate-400 font-medium">
                                            {formatDate(p.created_at)}
                                        </td>
                                        <td className="px-5 py-3 align-top">
                                            <StatusPill status={p.status} />
                                        </td>
                                        <td className="px-5 py-3 align-top">
                                            <div className="flex flex-col gap-1">
                                                <span className="capitalize font-medium text-slate-700 dark:text-slate-300">{p.payment_method ? p.payment_method.replace('_', ' ') : '—'}</span>
                                                <span className={`text-[10px] font-bold uppercase ${p.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                    {p.payment_status || 'Unpaid'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 align-top text-right">
                                            <span className="font-bold text-[#232F3E] dark:text-slate-200 text-sm">
                                                {formatCurrency(p.total_amount)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 align-top">
                                            <div className="flex justify-end items-center gap-1.5 mt-0.5">
                                                {p.tracking_id && (
                                                    <button
                                                        onClick={() => router.push(`/admin/tracking?q=${p.tracking_id}`)}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                                                        title="Track Shipment"
                                                    >
                                                        <Package className="h-4 w-4" />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleViewDetails(p.id)}
                                                    className="p-1.5 text-slate-400 hover:text-[#F59E0B] hover:bg-amber-50 rounded transition-all"
                                                    title="View Details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>

                                                <button
                                                    onClick={() => setEditRow(p)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                                    title="Update Phase"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>

                                                <button
                                                    onClick={() => setDeleteRow(p)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                                                    title="Purge Record"
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

            {/* --- Modals --- */}
            {viewRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                        <div className="flex items-start justify-between p-4 bg-gradient-to-r from-white to-gray-50 border-b">
                            <div>
                                <h1 className="text-2xl font-extrabold text-slate-900">Purchase Order #{viewRow.purchase_number}</h1>
                                <p className="text-sm text-slate-500 mt-1">{formatDate(viewRow.created_at)} · {viewRow.supplier_name || ''}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-xs text-slate-400">Status</p>
                                    <div className="mt-1"><StatusPill status={viewRow.status} /></div>
                                </div>
                                <button onClick={() => setViewRow(null)} className="text-slate-400 hover:text-slate-700 p-2 rounded-md">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="lg:col-span-2 space-y-4">
                                <div className="rounded-lg border border-gray-100 p-4 shadow-sm">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Items</h3>
                                    <ul className="divide-y">
                                        {viewRow.items?.map((item: any) => (
                                            <li key={item.id} className="py-3 flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">{item.product_name}</p>
                                                    <p className="text-xs text-slate-500">{item.quantity} × {formatCurrency(item.unit_price)}</p>
                                                </div>
                                                <div className="font-semibold text-slate-900">{formatCurrency(item.subtotal)}</div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-1 rounded-lg border border-gray-100 p-4 shadow-sm">
                                        <p className="text-xs text-slate-400">Supplier</p>
                                        <p className="text-sm font-semibold text-slate-900">{viewRow.supplier_name || '—'}</p>
                                        {viewRow.supplier_phone && <p className="text-xs text-slate-400 mt-1">{viewRow.supplier_phone}</p>}
                                    </div>
                                    <div className="w-56 rounded-lg border border-gray-100 p-4 shadow-sm">
                                        <p className="text-xs text-slate-400">Payment</p>
                                        <p className="text-sm font-semibold text-slate-900">{viewRow.payment_status || '—'}</p>
                                        <p className="text-xs text-slate-400 mt-1">Method: {viewRow.payment_method || '—'}</p>
                                    </div>
                                </div>
                            </div>

                            <aside className="space-y-4">
                                <div className="rounded-lg border border-gray-100 p-4 shadow-sm bg-white">
                                    <p className="text-xs text-slate-400">Summary</p>
                                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                                        <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency((viewRow.total_amount || 0) - (viewRow.tax_amount || 0) - (viewRow.shipping_cost || 0))}</span></div>
                                        <div className="flex justify-between"><span>Shipping</span><span>{formatCurrency(viewRow.shipping_cost || 0)}</span></div>
                                        <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(viewRow.tax_amount || 0)}</span></div>
                                        <div className="flex justify-between font-semibold text-slate-900 pt-2 border-t mt-2"><span>Total</span><span>{formatCurrency(viewRow.total_amount || 0)}</span></div>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-gray-100 p-4 shadow-sm text-center">
                                    <p className="text-xs text-slate-400">Tracking</p>
                                    <p className="text-sm font-medium text-slate-900">{viewRow.tracking_id || 'N/A'}</p>
                                    <div className="mt-3 grid grid-cols-1 gap-2">
                                        {viewRow.tracking_id && (
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await navigator.clipboard.writeText(viewRow.tracking_id || '');
                                                        setCopied(true);
                                                        if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
                                                        copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
                                                    } catch (err) {
                                                        console.error('Failed to copy tracking id', err);
                                                    }
                                                }}
                                                className="w-full inline-flex justify-center px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded"
                                            >
                                                {copied ? 'Copied' : 'Copy'}
                                            </button>
                                        )}
                                        <button onClick={() => window.print()} className="w-full inline-flex justify-center px-3 py-2 bg-white border border-gray-200 text-sm font-medium rounded">Print</button>
                                    </div>
                                </div>
                            </aside>
                        </div>

                        <div className="p-4 border-t bg-white flex justify-end gap-2">
                            <button onClick={() => setViewRow(null)} className="px-3 py-1.5 rounded-md bg-white border text-sm font-medium">Close</button>
                            <button onClick={() => window.print()} className="px-3 py-1.5 rounded-md bg-gradient-to-r from-amber-500 to-amber-400 text-white font-semibold">Print / Save</button>
                        </div>
                    </div>
                </div>
            )}

            {editRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-lg bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-white to-gray-50 border-b">
                            <div>
                                <h3 className="text-2xl font-extrabold text-slate-900">Update Purchase</h3>
                                <p className="text-sm text-slate-500 mt-1">Order #{editRow.purchase_number} · {formatDate(editRow.created_at)}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-xs text-slate-400">Status</p>
                                    <div className="mt-1"><StatusPill status={editRow.status} /></div>
                                </div>
                                <button onClick={() => setEditRow(null)} className="text-slate-400 hover:text-slate-700 p-2 rounded-md">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4">
                            <form className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-2">Logistics Phase</label>
                                    <select
                                        value={editRow.status}
                                        onChange={e => setEditRow({ ...editRow, status: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm bg-white shadow-sm"
                                    >
                                        {editRow.status !== 'received' && editRow.status !== 'cancelled' && (
                                            <option value={editRow.status} disabled className="italic">{editRow.status}</option>
                                        )}
                                        <option value="received">Received / Arrived</option>
                                        {!(editRow.status === 'shipped' || editRow.status === 'delivered' || editRow.status === 'received') && (
                                            <option value="cancelled">Cancelled</option>
                                        )}
                                    </select>
                                </div>

                                {editRow.status !== 'cancelled' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-2">Payment Status</label>
                                            <select
                                                value={editRow.payment_status || 'unpaid'}
                                                onChange={e => setEditRow({ ...editRow, payment_status: e.target.value })}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm bg-white shadow-sm"
                                            >
                                                <option value="unpaid">Unpaid</option>
                                                <option value="partial">Partial</option>
                                                <option value="paid">Paid</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-2">Payment Method</label>
                                            <select
                                                value={editRow.payment_method || ''}
                                                onChange={e => setEditRow({ ...editRow, payment_method: e.target.value })}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm bg-white shadow-sm"
                                            >
                                                <option value="">Select method</option>
                                                <option value="cash">Cash</option>
                                                <option value="bank_transfer">Bank Transfer</option>
                                                <option value="online_payment">Online Payment</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-2">Notes (optional)</label>
                                    <textarea
                                        value={editRow.notes || ''}
                                        onChange={e => setEditRow({ ...editRow, notes: e.target.value })}
                                        className="w-full min-h-[80px] px-4 py-2 rounded-lg border border-gray-200 text-sm bg-white shadow-sm"
                                        placeholder="Add a short note about this update (internal)"
                                    />
                                </div>
                            </form>
                        </div>

                        <div className="p-4 border-t bg-white flex items-center justify-end gap-2">
                            <button onClick={() => setEditRow(null)} className="px-3 py-1.5 rounded-md bg-white border text-sm font-medium">Cancel</button>
                            <button onClick={handleUpdateStatus} disabled={isUpdating} className="px-3 py-1.5 rounded-md bg-gradient-to-r from-amber-500 to-amber-400 text-white font-semibold shadow-md flex items-center gap-2">
                                {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                                Save changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1a252f] rounded-lg border border-slate-200 dark:border-white/10 max-w-sm w-full shadow-lg animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-100">
                            <div className="w-9 h-9 bg-rose-50 rounded-lg flex items-center justify-center mt-0.5 shrink-0">
                                <AlertTriangle className="h-4 w-4 text-rose-500" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Delete Record</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Permanently delete PO <span className="font-semibold text-[#F59E0B]">#{deleteRow.purchase_number}</span>?
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-2 bg-slate-50">
                            <button onClick={() => setDeleteRow(null)} className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-600 bg-white border border-slate-200 rounded-md">Cancel</button>
                            <button onClick={handleDelete} disabled={deleting} className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white bg-rose-500 rounded-md flex items-center gap-2">
                                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

