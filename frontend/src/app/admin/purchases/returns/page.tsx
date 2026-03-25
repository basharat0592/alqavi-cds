'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    RotateCcw, Plus, Search, RefreshCw, Trash2, Eye, Edit2,
    X, CheckCircle, AlertTriangle, Loader2
} from 'lucide-react';
import { purchaseService } from '@/services/purchase.service';
import { productService } from '@/services/product.service';

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
    const colors: Record<string, string> = {
        pending: 'bg-yellow-50 text-yellow-700 border-yellow-100',
        completed: 'bg-green-50 text-green-700 border-green-100',
        cancelled: 'bg-red-50 text-red-600 border-red-100',
    };
    return (
        <span className={`inline-flex px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest ${colors[value] || 'bg-gray-100 text-gray-600'}`}>
            {value}
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

    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
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
        } catch { showToast('Failed to load returns', 'error'); }
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
        } catch { showToast('Failed to load details', 'error'); }
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
                showToast('Return updated!');
            } else {
                await purchaseService.createReturn({ ...form, items });
                showToast('Return created!');
            }
            setShowForm(false); load();
        } catch (e: any) {
            showToast(e?.response?.data?.error || 'Save failed', 'error');
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteRow) return;
        setDeleting(true);
        try {
            await purchaseService.deleteReturn(deleteRow.id);
            showToast('Return deleted.'); setDeleteRow(null); load();
        } catch { showToast('Delete failed', 'error'); }
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
        <div className="max-w-[1400px] mx-auto pb-12 font-sans px-4 mt-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-6 border border-gray-200 dark:border-slate-800 rounded shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <RotateCcw className="h-6 w-6 text-[#E68A00]" /> Purchase Returns
                    </h1>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Manage returns sent back to suppliers</p>
                </div>
                <button onClick={openAdd} className="bg-[#E68A00] hover:bg-[#CC7A00] text-[#131921] px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center gap-2">
                    <Plus className="h-4 w-4" /> New Return
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {[
                    { label: 'Total Returns', value: returns.length },
                    { label: 'Pending', value: returns.filter(r => r.status === 'pending').length },
                    { label: 'Completed', value: returns.filter(r => r.status === 'completed').length },
                ].map(({ label, value }) => (
                    <Card key={label} className="p-5">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{label}</p>
                        <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
                    </Card>
                ))}
            </div>

            {/* Inline Form */}
            {showForm && (
                <Card className="mb-6 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                            {editing ? 'Edit Return' : 'New Purchase Return'}
                        </h2>
                        <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="p-5 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Return Number *</label>
                                <input value={form.return_number} onChange={e => setForm(f => ({ ...f, return_number: e.target.value }))} className={INPUT(!!errors.return_number)} disabled={!!editing} />
                                {errors.return_number && <p className="text-red-500 text-[10px] mt-0.5">{errors.return_number}</p>}
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Supplier Name</label>
                                <input value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))} className={INPUT()} placeholder="Supplier..." />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Return Date *</label>
                                <input type="date" value={form.return_date} onChange={e => setForm(f => ({ ...f, return_date: e.target.value }))} className={INPUT(!!errors.return_date)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Related Purchase Order</label>
                                <select value={form.purchase_order} onChange={e => setForm(f => ({ ...f, purchase_order: e.target.value }))} className={SELECT()}>
                                    <option value="">None</option>
                                    {purchases.map(p => <option key={p.id} value={p.id}>{p.purchase_number}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Status</label>
                                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={SELECT()}>
                                    <option value="pending">Pending</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Reason</label>
                            <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className={INPUT()} rows={2} placeholder="Reason for return..." />
                        </div>

                        {!editing && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">Return Items</h3>
                                    <button onClick={addItem} className="text-[10px] font-bold text-[#E68A00] flex items-center gap-1"><Plus className="h-3 w-3" />Add Item</button>
                                </div>
                                {errors.items && <p className="text-red-500 text-[10px] mb-2">{errors.items}</p>}
                                <div className="space-y-2">
                                    {items.map((item, i) => (
                                        <div key={i} className="grid grid-cols-12 gap-2 items-center">
                                            <div className="col-span-5">
                                                <select value={item.product} onChange={e => updateItem(i, 'product', e.target.value)} className={SELECT()}>
                                                    <option value="">Select Product</option>
                                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-3">
                                                <input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} placeholder="Qty" className={INPUT()} />
                                            </div>
                                            <div className="col-span-3">
                                                <input type="number" min="0" step="0.01" value={item.refund_price} onChange={e => updateItem(i, 'refund_price', parseFloat(e.target.value) || 0)} placeholder="Refund Price" className={INPUT()} />
                                            </div>
                                            <div className="col-span-1 flex justify-center">
                                                {items.length > 1 && <button onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500"><X className="h-4 w-4" /></button>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 text-right text-sm font-bold text-gray-700 dark:text-gray-200">
                                    Refund Total: <span className="text-[#E68A00]">PKR {refundTotal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                            <button onClick={() => setShowForm(false)} className="px-5 py-2 bg-white dark:bg-slate-800 border border-[#adb1b8] rounded text-xs font-medium">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-[#E68A00] hover:bg-[#CC7A00] text-[#131921] rounded text-xs font-bold uppercase flex items-center gap-2">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                {saving ? 'Saving...' : (editing ? 'Update Return' : 'Create Return')}
                            </button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Filter Bar */}
            <Card className="mb-6">
                <div className="p-4 flex gap-3 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search returns..." className={`${INPUT()} pl-9`} />
                    </div>
                    <button onClick={load} className="p-2 border border-[#a6a6a6] rounded hover:bg-gray-50">
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
                                <th className="px-6 py-3">Return #</th>
                                <th className="px-6 py-3">PO Ref</th>
                                <th className="px-6 py-3">Supplier</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Refund Total</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i}><td colSpan={7} className="px-6 py-4 animate-pulse"><div className="h-4 bg-gray-100 rounded" /></td></tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">No returns found. <button onClick={openAdd} className="text-[#E68A00] font-bold underline">Create one</button></td></tr>
                            ) : filtered.map(row => (
                                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white text-sm uppercase">{row.return_number}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{row.purchase_number || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{row.supplier_name || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{row.return_date}</td>
                                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white text-sm">PKR {parseFloat(row.total_refund_amount || 0).toLocaleString()}</td>
                                    <td className="px-6 py-4"><StatusBadge value={row.status} /></td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setViewRow(row)} className="p-1.5 text-gray-500 hover:text-[#E68A00]"><Eye className="h-4 w-4" /></button>
                                            <button onClick={() => openEdit(row)} className="p-1.5 text-gray-500 hover:text-[#E68A00]"><Edit2 className="h-4 w-4" /></button>
                                            <button onClick={() => setDeleteRow(row)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
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
                    <div className="bg-white dark:bg-slate-900 rounded border border-gray-300 w-full max-w-md shadow-xl">
                        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                            <h3 className="text-sm font-bold uppercase">{viewRow.return_number}</h3>
                            <button onClick={() => setViewRow(null)}><X className="h-4 w-4 text-gray-400" /></button>
                        </div>
                        <div className="p-5 space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                                <div><p className="text-[10px] font-black text-gray-400 uppercase">Supplier</p><p>{viewRow.supplier_name || '—'}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase">Date</p><p>{viewRow.return_date}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase">Status</p><StatusBadge value={viewRow.status} /></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase">Refund Total</p><p className="text-lg font-black text-[#E68A00]">PKR {parseFloat(viewRow.total_refund_amount || 0).toLocaleString()}</p></div>
                                {viewRow.reason && <div className="col-span-2"><p className="text-[10px] font-black text-gray-400 uppercase">Reason</p><p>{viewRow.reason}</p></div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded border border-gray-300 max-w-sm w-full shadow-xl">
                        <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-200">
                            <AlertTriangle className="h-4 w-4 text-[#e47911]" />
                            <h3 className="text-sm font-bold uppercase">Confirm Delete</h3>
                        </div>
                        <div className="p-5"><p className="text-sm text-gray-700">Delete return <span className="font-bold">"{deleteRow.return_number}"</span>?</p></div>
                        <div className="flex justify-end gap-2 px-5 py-3 bg-gray-50 border-t border-gray-200">
                            <button onClick={() => setDeleteRow(null)} className="px-4 py-1.5 bg-white border border-[#adb1b8] rounded text-xs">Cancel</button>
                            <button onClick={handleDelete} disabled={deleting} className="px-4 py-1.5 bg-[#f0c14b] hover:bg-[#ebae1e] border border-[#a88734] rounded text-xs font-medium text-[#111]">
                                {deleting ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 px-5 py-3 rounded shadow-2xl flex items-center gap-3 min-w-[240px] border-l-4 z-[100] animate-in slide-in-from-bottom-5
                    ${toast.type === 'success' ? 'bg-[#131921] text-white border-[#E68A00]' : 'bg-red-900 text-white border-red-500'}`}>
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-sm font-medium">{toast.msg}</span>
                </div>
            )}
        </div>
    );
}
