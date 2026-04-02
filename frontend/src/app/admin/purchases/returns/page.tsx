'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    RotateCcw, Plus, Search, RefreshCw, Trash2, Eye, Edit2,
    X, CheckCircle, AlertTriangle, Loader2, Package
} from 'lucide-react';
import { purchaseService } from '@/services/purchase.service';
import { productService } from '@/services/product.service';
import { formatCurrency, formatDate } from '@/lib/utils';

// ── Status pill ───────────────────────────────────────────────────────────────
const statusStyle: Record<string, string> = {
    pending:   'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
};
const StatusPill = ({ status }: { status: string }) => {
    const s = (status || '').toLowerCase();
    return (
        <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold capitalize ${statusStyle[s] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
            {(status || '').replace('_', ' ')}
        </span>
    );
};

const EMPTY_FORM = {
    return_number: '', supplier_name: '', return_date: new Date().toISOString().slice(0, 10),
    purchase_order: '', status: 'pending', reason: '',
};

type LineItem = { product: string; product_name: string; quantity: number; refund_price: number };

export default function PurchaseReturnsPage() {
    const [returns, setReturns] = useState<any[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [items, setItems] = useState<LineItem[]>([{ product: '', product_name: '', quantity: 1, refund_price: 0 }]);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [viewRow, setViewRow] = useState<any | null>(null);
    const [deleteRow, setDeleteRow] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'alert' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'alert' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [r, po, prods] = await Promise.all([
                purchaseService.getReturns(),
                purchaseService.getAll(),
                productService.getAll?.({ all_items: 'true' } as any) ?? Promise.resolve([]),
            ]);
            setReturns(Array.isArray(r) ? r : r?.results || []);
            setPurchases(Array.isArray(po) ? po : po?.results || []);
            setProducts(Array.isArray(prods) ? prods : (prods as any)?.results || []);
        } catch { showToast('Failed to load returns', 'alert'); }
        finally { setLoading(false); }
    }, [search]);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => {
        const num = `PR-${Date.now().toString().slice(-6)}`;
        setForm({ ...EMPTY_FORM, return_number: num });
        setItems([{ product: '', product_name: '', quantity: 1, refund_price: 0 }]);
        setEditing(null); setErrors({}); setShowForm(true);
    };

    const openEdit = async (row: any) => {
        try {
            const detail = await purchaseService.getReturnById(row.id);
            setForm({
                return_number: detail.return_number,
                supplier_name: detail.supplier_name || '',
                return_date: detail.return_date,
                purchase_order: detail.purchase_order || '',
                status: detail.status,
                reason: detail.reason || '',
            });
            setItems((detail.items || []).map((i: any) => ({
                product: i.product, product_name: i.product_name,
                quantity: i.quantity, refund_price: i.refund_price
            })));
            setEditing(detail); setErrors({}); setShowForm(true);
        } catch { showToast('Failed to load details', 'alert'); }
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.return_number) e.return_number = 'Required';
        if (!form.return_date) e.return_date = 'Required';
        if (items.some(i => !i.product || i.quantity < 1 || i.refund_price <= 0))
            e.items = 'All items must have a product, quantity ≥ 1, and price > 0';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            if (editing) {
                await purchaseService.updateReturn(editing.id, { status: form.status, reason: form.reason });
                showToast('Return updated.');
            } else {
                await purchaseService.createReturn({ ...form, items });
                showToast('Return created.');
            }
            setShowForm(false); load();
        } catch (e: any) {
            showToast(e?.response?.data?.error || 'Save failed', 'alert');
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteRow) return;
        setDeleting(true);
        try {
            await purchaseService.deleteReturn(deleteRow.id);
            showToast('Return deleted.'); setDeleteRow(null); load();
        } catch { showToast('Delete failed', 'alert'); }
        finally { setDeleting(false); }
    };

    const addItem = () => setItems(prev => [...prev, { product: '', product_name: '', quantity: 1, refund_price: 0 }]);
    const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
    const updateItem = (i: number, field: string, val: any) => {
        setItems(prev => prev.map((item, idx) => {
            if (idx !== i) return item;
            if (field === 'product') {
                const p = products.find(p => p.id === val || p.id === Number(val));
                return { ...item, product: val, product_name: p?.name || '', refund_price: p?.price ? parseFloat(p.price) : item.refund_price };
            }
            return { ...item, [field]: val };
        }));
    };

    const refundTotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.refund_price || 0), 0);
    const filtered = returns.filter(r =>
        (r.return_number?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (r.supplier_name?.toLowerCase() || '').includes(search.toLowerCase())
    );

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Purchase Returns</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage supplier return records and refund credits</p>
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
                        onClick={openAdd}
                        className="flex items-center gap-2 px-4 py-2 bg-[#F7CA00] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        New Return
                    </button>
                </div>
            </div>

            {/* ── Inline Form ── */}
            {showForm && (
                <div className="mb-6 bg-white dark:bg-[#1B1C1E] border border-[#F7CA00]/30 rounded-xl shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                        <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                            {editing ? 'Edit Return' : 'New Purchase Return'}
                        </h2>
                        <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="p-5 space-y-5">
                        {/* Header Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Return Number *</label>
                                <input
                                    value={form.return_number}
                                    onChange={(e) => setForm(f => ({ ...f, return_number: e.target.value }))}
                                    disabled={!!editing}
                                    className={`w-full px-3 py-2 text-sm bg-white dark:bg-[#1B1C1E] border rounded-lg outline-none focus:border-[#F7CA00] focus:ring-2 focus:ring-[#F7CA00]/10 transition-all placeholder:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed ${errors.return_number ? 'border-red-400' : 'border-slate-200 dark:border-white/10'}`}
                                />
                                {errors.return_number && <p className="text-red-500 text-xs mt-1">{errors.return_number}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Supplier</label>
                                <input
                                    value={form.supplier_name}
                                    onChange={(e) => setForm(f => ({ ...f, supplier_name: e.target.value }))}
                                    placeholder="Enter supplier name"
                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] focus:ring-2 focus:ring-[#F7CA00]/10 transition-all placeholder:text-slate-400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Return Date *</label>
                                <input
                                    type="date"
                                    value={form.return_date}
                                    onChange={(e) => setForm(f => ({ ...f, return_date: e.target.value }))}
                                    className={`w-full px-3 py-2 text-sm bg-white dark:bg-[#1B1C1E] border rounded-lg outline-none focus:border-[#F7CA00] focus:ring-2 focus:ring-[#F7CA00]/10 transition-all ${errors.return_date ? 'border-red-400' : 'border-slate-200 dark:border-white/10'}`}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Linked Purchase Order</label>
                                <select
                                    value={form.purchase_order}
                                    onChange={e => setForm(f => ({ ...f, purchase_order: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] text-slate-800 dark:text-slate-200 cursor-pointer"
                                >
                                    <option value="">None (standalone return)</option>
                                    {purchases.map(p => <option key={p.id} value={p.id}>{p.purchase_number}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Status</label>
                                <select
                                    value={form.status}
                                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] text-slate-800 dark:text-slate-200 cursor-pointer"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Reason</label>
                            <textarea
                                value={form.reason}
                                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                                placeholder="Describe the reason for this return..."
                                rows={2}
                                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] focus:ring-2 focus:ring-[#F7CA00]/10 resize-none placeholder:text-slate-400 text-slate-800 dark:text-slate-200"
                            />
                        </div>

                        {/* Line Items (only on create) */}
                        {!editing && (
                            <div className="border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <Package className="h-3.5 w-3.5 text-[#F7CA00]" />
                                        Return Items
                                    </span>
                                    <button onClick={addItem} className="text-xs text-[#F7CA00] hover:underline font-medium flex items-center gap-1">
                                        <Plus className="h-3.5 w-3.5" /> Add Item
                                    </button>
                                </div>
                                {errors.items && <p className="text-red-500 text-xs px-4 py-2 bg-red-50 dark:bg-red-500/10">{errors.items}</p>}
                                <div className="divide-y divide-slate-100 dark:divide-white/5">
                                    {items.map((item, i) => (
                                        <div key={i} className="grid grid-cols-12 gap-3 px-4 py-3 items-center">
                                            <div className="col-span-6">
                                                <select
                                                    value={item.product}
                                                    onChange={e => updateItem(i, 'product', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] text-slate-800 dark:text-slate-200 cursor-pointer"
                                                >
                                                    <option value="">Select product</option>
                                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    type="number" min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                                                    placeholder="Qty"
                                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] text-slate-800 dark:text-slate-200"
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <input
                                                    type="number" min="0" step="0.01"
                                                    value={item.refund_price}
                                                    onChange={(e) => updateItem(i, 'refund_price', parseFloat(e.target.value) || 0)}
                                                    placeholder="Refund price"
                                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] text-slate-800 dark:text-slate-200"
                                                />
                                            </div>
                                            <div className="col-span-1 flex justify-center">
                                                {items.length > 1 && (
                                                    <button onClick={() => removeItem(i)} className="p-1 rounded text-slate-300 hover:text-red-500 transition-colors">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10">
                                    <span className="text-xs text-slate-500">Total Refund</span>
                                    <span className="text-sm font-bold text-[#F7CA00]">{formatCurrency(refundTotal)}</span>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-[#F7CA00] hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60 shadow-sm">
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {saving ? 'Saving...' : (editing ? 'Save Changes' : 'Create Return')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Search Bar ── */}
            <div className="flex gap-2 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by return number or supplier..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] focus:ring-2 focus:ring-[#F7CA00]/10 transition-all placeholder:text-slate-400"
                    />
                </div>
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
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Return #</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">PO Reference</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Supplier</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Date</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right whitespace-nowrap">Refund Amount</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Status</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading && filtered.length === 0 ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="px-4 py-4">
                                            <div className="h-4 bg-slate-100 dark:bg-white/5 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-16 text-center">
                                        <RotateCcw className="h-10 w-10 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">No purchase returns found.</p>
                                        <button onClick={openAdd} className="text-sm text-[#F7CA00] hover:underline font-medium">
                                            Create your first return record
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(row => (
                                    <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="px-4 py-3">
                                            <span className="text-[#F7CA00] font-medium text-sm">#{row.return_number}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-slate-500 dark:text-slate-400 text-sm">{row.purchase_number || '—'}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-slate-800 dark:text-slate-200 font-medium text-sm">{row.supplier_name || '—'}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-slate-500 dark:text-slate-400 text-sm">{row.return_date || '—'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-slate-800 dark:text-slate-200 font-semibold text-sm">{formatCurrency(row.total_refund_amount || 0)}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusPill status={row.status} />
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
                                                    onClick={() => openEdit(row)}
                                                    className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                                                    title="Edit"
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
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Return #{viewRow.return_number}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Return details</p>
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
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Return Date</p>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{viewRow.return_date || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Status</p>
                                    <StatusPill status={viewRow.status} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">PO Reference</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">{viewRow.purchase_number || '—'}</p>
                                </div>
                            </div>
                            {viewRow.reason && (
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Reason</p>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{viewRow.reason}</p>
                                </div>
                            )}
                            <div className="pt-3 border-t border-slate-100 dark:border-white/10">
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Refund</p>
                                <p className="text-2xl font-bold text-[#F7CA00]">{formatCurrency(viewRow.total_refund_amount || 0)}</p>
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
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete Return Record</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Are you sure you want to delete <span className="font-semibold text-slate-700 dark:text-slate-300">#{deleteRow.return_number}</span>? This cannot be undone.
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
