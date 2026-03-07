'use client';

import { useState, useEffect } from 'react';
import { purchaseService } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
    ShoppingCart, Search, X, RefreshCw, Eye, Plus,
    CheckCircle, Clock, Truck, XCircle, DollarSign,
    Package, Building2, Trash2, Save,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════ */
interface PurchaseItem {
    product_name: string;
    quantity: number;
    unit_price: number | string;
}

interface Purchase {
    id: string | number;
    po_number?: string;
    supplier?: string | { name?: string; company_name?: string };
    status?: string;
    total_amount?: number | string;
    items?: PurchaseItem[];
    notes?: string;
    created_at?: string;
    expected_date?: string;
    received_date?: string;
}

/* ═══════════════════════════════════════════════════════
   STATUS CONFIG
═══════════════════════════════════════════════════════ */
const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ComponentType<any> }> = {
    pending:   { label: 'Pending',   cls: 'bg-amber-50 text-amber-700 border-amber-200',   icon: Clock },
    ordered:   { label: 'Ordered',   cls: 'bg-blue-50 text-blue-700 border-blue-200',       icon: Truck },
    received:  { label: 'Received',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
    cancelled: { label: 'Cancelled', cls: 'bg-red-50 text-red-700 border-red-200',         icon: XCircle },
};

function PurchaseStatusBadge({ status }: { status?: string }) {
    const key = (status || 'pending').toLowerCase();
    const cfg = STATUS_CONFIG[key] || STATUS_CONFIG.pending;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${cfg.cls}`}>
            <Icon className="h-3 w-3" strokeWidth={2.5} />
            {cfg.label}
        </span>
    );
}

/* ═══════════════════════════════════════════════════════
   DETAIL MODAL
═══════════════════════════════════════════════════════ */
function PurchaseDetailModal({ purchase, onClose }: { purchase: Purchase; onClose: () => void }) {
    const supplierName = typeof purchase.supplier === 'object'
        ? (purchase.supplier?.company_name || purchase.supplier?.name || 'Unknown')
        : (purchase.supplier || 'Unknown');
    const items = purchase.items || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/50">
                    <div>
                        <h2 className="text-lg font-black text-gray-900">
                            PO #{purchase.po_number || String(purchase.id).slice(-6).toUpperCase()}
                        </h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                            {formatDate(purchase.created_at, { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-8 space-y-6">
                    {/* Supplier + Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Supplier</p>
                            <p className="font-black text-gray-900 text-sm">{supplierName}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Status</p>
                            <PurchaseStatusBadge status={purchase.status} />
                        </div>
                    </div>

                    {/* Dates */}
                    {(purchase.expected_date || purchase.received_date) && (
                        <div className="grid grid-cols-2 gap-4">
                            {purchase.expected_date && (
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-1">Expected</p>
                                    <p className="font-black text-blue-700 text-sm">{formatDate(purchase.expected_date)}</p>
                                </div>
                            )}
                            {purchase.received_date && (
                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">Received</p>
                                    <p className="font-black text-emerald-700 text-sm">{formatDate(purchase.received_date)}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Items */}
                    {items.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Purchase Items</p>
                            <div className="space-y-2">
                                {items.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                                        <div>
                                            <p className="font-black text-gray-900 text-sm">{item.product_name || `Item ${i + 1}`}</p>
                                            <p className="text-[10px] text-gray-400 font-medium">Qty: {item.quantity || 1}</p>
                                        </div>
                                        <p className="font-black text-gray-900 text-sm">
                                            {formatCurrency(parseFloat(String(item.unit_price || 0)) * (item.quantity || 1))}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {purchase.notes && (
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Notes</p>
                            <p className="text-sm font-medium text-gray-700">{purchase.notes}</p>
                        </div>
                    )}

                    {/* Total */}
                    <div className="flex items-center justify-between bg-[#FF9900]/10 px-6 py-4 rounded-xl border border-[#FF9900]/20">
                        <p className="font-black text-gray-900 uppercase tracking-widest text-[10px]">Total Amount</p>
                        <p className="text-2xl font-black text-[#FF9900]">
                            {formatCurrency(purchase.total_amount || 0)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   CREATE / EDIT MODAL
═══════════════════════════════════════════════════════ */
function PurchaseFormModal({
    purchase, onClose, onSaved,
}: {
    purchase?: Purchase | null;
    onClose: () => void;
    onSaved: (p: Purchase) => void;
}) {
    const isEdit = !!purchase;
    const [supplier, setSupplier] = useState(
        typeof purchase?.supplier === 'object' ? (purchase.supplier?.company_name || purchase.supplier?.name || '') : (purchase?.supplier || '')
    );
    const [status, setStatus] = useState(purchase?.status || 'Pending');
    const [totalAmount, setTotalAmount] = useState(String(purchase?.total_amount || ''));
    const [notes, setNotes] = useState(purchase?.notes || '');
    const [expectedDate, setExpectedDate] = useState(
        purchase?.expected_date ? purchase.expected_date.slice(0, 10) : ''
    );
    const [items, setItems] = useState<PurchaseItem[]>(purchase?.items || [{ product_name: '', quantity: 1, unit_price: '' }]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const addItem = () => setItems(prev => [...prev, { product_name: '', quantity: 1, unit_price: '' }]);
    const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
    const updateItem = (i: number, field: keyof PurchaseItem, value: string | number) => {
        setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
    };

    const computedTotal = items.reduce((sum, item) => {
        return sum + (parseFloat(String(item.unit_price || 0)) * (item.quantity || 1));
    }, 0);

    const handleSave = async () => {
        if (!supplier.trim()) { setError('Supplier name is required.'); return; }
        setSaving(true);
        setError('');
        try {
            const payload = {
                supplier: supplier.trim(),
                status,
                total_amount: totalAmount || computedTotal.toFixed(2),
                notes,
                expected_date: expectedDate || undefined,
                items: items.filter(it => it.product_name.trim()),
            };
            let saved: Purchase;
            if (isEdit && purchase) {
                saved = await purchaseService.update(purchase.id, payload) as Purchase;
            } else {
                saved = await purchaseService.create(payload) as Purchase;
            }
            onSaved(saved || { ...payload, id: `PO-${Date.now()}`, created_at: new Date().toISOString() } as Purchase);
        } catch {
            setError('Failed to save. Please try again.');
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#FF9900] rounded-xl flex items-center justify-center">
                            <ShoppingCart className="h-5 w-5 text-[#131921]" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900">{isEdit ? 'Edit Purchase Order' : 'New Purchase Order'}</h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fill in the details below</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-8 space-y-5">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-bold px-4 py-3 rounded-xl">
                            {error}
                        </div>
                    )}

                    {/* Supplier + Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Supplier *</label>
                            <input
                                value={supplier}
                                onChange={e => setSupplier(e.target.value)}
                                placeholder="Supplier name or company"
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Status</label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all bg-white"
                            >
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                    <option key={k} value={v.label}>{v.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Expected Date + Total */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Expected Date</label>
                            <input
                                type="date"
                                value={expectedDate}
                                onChange={e => setExpectedDate(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">
                                Total Amount <span className="normal-case text-gray-400 font-medium">(auto-computed if blank)</span>
                            </label>
                            <input
                                type="number"
                                value={totalAmount}
                                onChange={e => setTotalAmount(e.target.value)}
                                placeholder={computedTotal > 0 ? String(computedTotal.toFixed(2)) : '0.00'}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all"
                            />
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Items</label>
                            <button onClick={addItem}
                                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#FF9900] hover:text-[#e68a00] transition-colors">
                                <Plus className="h-3.5 w-3.5" /> Add Item
                            </button>
                        </div>
                        <div className="space-y-2">
                            {items.map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <input
                                        value={item.product_name}
                                        onChange={e => updateItem(i, 'product_name', e.target.value)}
                                        placeholder="Product name"
                                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all"
                                    />
                                    <input
                                        type="number" min="1"
                                        value={item.quantity}
                                        onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                                        placeholder="Qty"
                                        className="w-20 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all"
                                    />
                                    <input
                                        type="number" min="0" step="0.01"
                                        value={item.unit_price}
                                        onChange={e => updateItem(i, 'unit_price', e.target.value)}
                                        placeholder="Unit price"
                                        className="w-28 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all"
                                    />
                                    <button onClick={() => removeItem(i)}
                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        {computedTotal > 0 && (
                            <div className="mt-3 text-right text-xs font-black text-[#FF9900] uppercase tracking-widest">
                                Computed Total: {formatCurrency(computedTotal)}
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Notes</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Additional notes or instructions..."
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
                    <button onClick={onClose}
                        className="px-5 py-2.5 border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#FF9900] text-[#131921] font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#e68a00] transition-all shadow-sm disabled:opacity-60">
                        {saving
                            ? <div className="w-4 h-4 border-2 border-[#131921]/20 border-t-[#131921] rounded-full animate-spin" />
                            : <Save className="h-4 w-4" />
                        }
                        {saving ? 'Saving...' : isEdit ? 'Update' : 'Create PO'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   STATUS FILTER LIST
═══════════════════════════════════════════════════════ */
const STATUS_FILTERS = ['All', 'Pending', 'Ordered', 'Received', 'Cancelled'];

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
export default function PurchasesPage() {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [editPurchase, setEditPurchase] = useState<Purchase | null>(null);
    const [deleting, setDeleting] = useState<string | number | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const data = await purchaseService.getAll({ ordering: '-created_at' });
            setPurchases(Array.isArray(data) ? data : []);
        } catch { }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const filtered = purchases.filter(p => {
        const q = search.toLowerCase();
        const supplierStr = typeof p.supplier === 'object'
            ? (p.supplier?.company_name || p.supplier?.name || '')
            : (p.supplier || '');
        const matchSearch = !search
            || (p.po_number || '').toLowerCase().includes(q)
            || String(p.id).toLowerCase().includes(q)
            || supplierStr.toLowerCase().includes(q);
        const matchStatus = statusFilter === 'All' || (p.status || '').toLowerCase() === statusFilter.toLowerCase();
        return matchSearch && matchStatus;
    });

    // Stats
    const totalSpent = purchases.reduce((s, p) => s + parseFloat(String(p.total_amount || 0)), 0);
    const pendingCount = purchases.filter(p => (p.status || '').toLowerCase() === 'pending').length;
    const receivedCount = purchases.filter(p => (p.status || '').toLowerCase() === 'received').length;

    const getSupplierName = (p: Purchase) => {
        if (!p.supplier) return '—';
        if (typeof p.supplier === 'object') return p.supplier.company_name || p.supplier.name || '—';
        return p.supplier;
    };

    const handleDelete = async (p: Purchase) => {
        if (!confirm(`Delete PO #${p.po_number || p.id}? This cannot be undone.`)) return;
        setDeleting(p.id);
        await purchaseService.delete(p.id);
        setPurchases(prev => prev.filter(x => String(x.id) !== String(p.id)));
        setDeleting(null);
    };

    const handleSaved = (saved: Purchase) => {
        setPurchases(prev => {
            const idx = prev.findIndex(x => String(x.id) === String(saved.id));
            if (idx !== -1) { const updated = [...prev]; updated[idx] = saved; return updated; }
            return [saved, ...prev];
        });
        setFormOpen(false);
        setEditPurchase(null);
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12 font-sans px-3 sm:px-6 mt-6 relative z-0">

            {/* Ambient Glow */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#FF9900]/10 blur-[120px]" />
                <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-orange-50/30 blur-[100px]" />
            </div>

            {/* ── Header + Stats Card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Title + Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-7 sm:px-10 pt-7 pb-5 border-b border-gray-100/60">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-[#FF9900] rounded-xl flex items-center justify-center flex-shrink-0">
                            <ShoppingCart className="h-5 w-5 text-[#131921]" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">Purchase Orders</h1>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                Manage supplier purchase orders
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 self-start sm:self-auto">
                        <button onClick={load} disabled={loading}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest hover:bg-gray-50 hover:shadow-sm transition-all rounded-xl disabled:opacity-50">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={2.5} />
                            Refresh
                        </button>
                        <button onClick={() => { setEditPurchase(null); setFormOpen(true); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#FF9900] text-[#131921] font-black text-xs uppercase tracking-widest hover:bg-[#e68a00] transition-all shadow-sm rounded-xl">
                            <Plus className="h-4 w-4" strokeWidth={2.5} />
                            New PO
                        </button>
                    </div>
                </div>

                {/* 4 Stat strips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100/60">
                    <div className="flex items-center justify-between px-6 sm:px-8 py-4">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Total POs</p>
                            <p className="text-2xl font-black text-gray-900 tracking-tight">{loading ? '—' : purchases.length}</p>
                        </div>
                        <div className="w-9 h-9 bg-white border border-gray-100 rounded-xl flex items-center justify-center shadow-sm">
                            <ShoppingCart className="w-4 h-4 text-gray-400" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between px-6 sm:px-8 py-4">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-[#FF9900] mb-0.5">Total Spent</p>
                            <p className="text-2xl font-black text-[#FF9900] tracking-tight">
                                {loading ? '—' : formatCurrency(totalSpent)}
                            </p>
                        </div>
                        <div className="w-9 h-9 bg-[#FF9900]/10 border border-[#FF9900]/20 rounded-xl flex items-center justify-center shadow-sm">
                            <DollarSign className="w-4 h-4 text-[#FF9900]" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between px-6 sm:px-8 py-4">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-0.5">Pending</p>
                            <p className="text-2xl font-black text-amber-600 tracking-tight">{loading ? '—' : pendingCount}</p>
                        </div>
                        <div className="w-9 h-9 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center shadow-sm">
                            <Clock className="w-4 h-4 text-amber-500" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between px-6 sm:px-8 py-4">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Received</p>
                            <p className="text-2xl font-black text-emerald-600 tracking-tight">{loading ? '—' : receivedCount}</p>
                        </div>
                        <div className="w-9 h-9 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center shadow-sm">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Table Card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                {/* Search + Filter */}
                <div className="px-5 sm:px-8 py-5 border-b border-gray-100/50 bg-gradient-to-b from-white to-transparent flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center gap-2.5 bg-white border border-gray-200 px-4 py-2.5 rounded-xl flex-1 min-w-[180px] focus-within:ring-2 focus-within:ring-[#FF9900]/20 focus-within:border-[#FF9900] shadow-sm transition-all">
                        <Search className="h-4 w-4 text-gray-400 flex-shrink-0" strokeWidth={2.5} />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by PO #, supplier name..."
                            className="text-sm text-gray-900 outline-none w-full bg-transparent font-bold placeholder:font-medium placeholder:text-gray-400"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500 transition-colors">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Status pills */}
                    <div className="flex gap-2 flex-wrap">
                        {STATUS_FILTERS.map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all duration-200 ${statusFilter === s
                                    ? 'bg-[#FF9900] text-[#131921] border-transparent shadow-sm -translate-y-0.5'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}>
                                {s}
                            </button>
                        ))}
                    </div>

                    <span className="text-[10px] font-black uppercase tracking-widest text-[#FF9900] whitespace-nowrap bg-[#FF9900]/10 px-3 py-2 rounded-xl border border-[#FF9900]/20">
                        {filtered.length} order{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center">
                        <div className="w-10 h-10 border-4 border-[#FF9900]/20 border-t-[#FF9900] rounded-full animate-spin mb-4" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading purchase orders...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-24 text-center px-6">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                            <Package className="h-8 w-8 text-gray-300" />
                        </div>
                        <p className="font-black text-gray-900 mb-1">
                            {search || statusFilter !== 'All' ? 'No orders match your filters' : 'No purchase orders yet'}
                        </p>
                        <p className="text-sm font-medium text-gray-400 mt-1">
                            {search || statusFilter !== 'All'
                                ? 'Try adjusting your search or status filter.'
                                : 'Create your first purchase order to get started.'}
                        </p>
                        {(search || statusFilter !== 'All') && (
                            <button onClick={() => { setSearch(''); setStatusFilter('All'); }}
                                className="mt-4 text-xs font-black text-[#FF9900] uppercase tracking-widest hover:underline">
                                Clear filters
                            </button>
                        )}
                        {(!search && statusFilter === 'All') && (
                            <button onClick={() => setFormOpen(true)}
                                className="mt-4 flex items-center gap-2 mx-auto px-5 py-2.5 bg-[#FF9900] text-[#131921] font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#e68a00] transition-all">
                                <Plus className="h-4 w-4" /> Create First PO
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="text-left px-8 py-4">PO #</th>
                                    <th className="text-left px-6 py-4">Supplier</th>
                                    <th className="text-left px-6 py-4">Date</th>
                                    <th className="text-left px-6 py-4">Expected</th>
                                    <th className="text-left px-6 py-4">Total</th>
                                    <th className="text-left px-6 py-4">Status</th>
                                    <th className="text-center px-6 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(purchase => (
                                    <tr key={purchase.id}
                                        className="hover:bg-white/60 transition-all duration-300 group border-b border-gray-50/50 last:border-0">
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-[#FF9900]/10 to-[#FF9900]/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300 border border-[#FF9900]/20">
                                                    <ShoppingCart className="h-4 w-4 text-[#FF9900]" strokeWidth={2.5} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 text-sm group-hover:text-[#FF9900] transition-colors">
                                                        #{purchase.po_number || String(purchase.id).slice(-6).toUpperCase()}
                                                    </p>
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                                        ID: {String(purchase.id).slice(0, 8)}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <Building2 className="h-3.5 w-3.5 text-blue-500" strokeWidth={2.2} />
                                                </div>
                                                <p className="font-black text-gray-900 text-sm">{getSupplierName(purchase)}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                            {formatDate(purchase.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                            {purchase.expected_date ? formatDate(purchase.expected_date) : '—'}
                                        </td>
                                        <td className="px-6 py-4 font-black text-gray-900">
                                            {formatCurrency(purchase.total_amount || 0)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <PurchaseStatusBadge status={purchase.status} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                <button onClick={() => setSelectedPurchase(purchase)}
                                                    className="p-2 bg-white border border-transparent hover:border-[#FF9900]/20 hover:bg-[#FF9900]/5 text-[#FF9900] rounded-xl hover:scale-110 hover:shadow-sm transition-all"
                                                    title="View Details">
                                                    <Eye className="h-4 w-4" strokeWidth={2.5} />
                                                </button>
                                                <button onClick={() => { setEditPurchase(purchase); setFormOpen(true); }}
                                                    className="p-2 bg-white border border-transparent hover:border-blue-200 hover:bg-blue-50 text-blue-500 rounded-xl hover:scale-110 hover:shadow-sm transition-all"
                                                    title="Edit">
                                                    <Save className="h-4 w-4" strokeWidth={2.5} />
                                                </button>
                                                <button onClick={() => handleDelete(purchase)}
                                                    disabled={deleting === purchase.id}
                                                    className="p-2 bg-white border border-transparent hover:border-red-200 hover:bg-red-50 text-red-400 rounded-xl hover:scale-110 hover:shadow-sm transition-all disabled:opacity-50"
                                                    title="Delete">
                                                    {deleting === purchase.id
                                                        ? <div className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                                                        : <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                                                    }
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedPurchase && (
                <PurchaseDetailModal purchase={selectedPurchase} onClose={() => setSelectedPurchase(null)} />
            )}

            {/* Create/Edit Modal */}
            {formOpen && (
                <PurchaseFormModal
                    purchase={editPurchase}
                    onClose={() => { setFormOpen(false); setEditPurchase(null); }}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
}
