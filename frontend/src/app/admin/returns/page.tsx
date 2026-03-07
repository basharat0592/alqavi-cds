'use client';

import { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
    RotateCcw, Search, X, RefreshCw, Eye, Plus, CheckCircle,
    Clock, XCircle, DollarSign, Package, Trash2, Save,
    AlertTriangle, ChevronDown, FileText, ArrowUpRight,
    Loader2, Ban, BadgeCheck, MoreHorizontal
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════ */
interface ReturnItem {
    product_name: string;
    quantity: number;
    unit_price: number | string;
    reason: string;
}

interface PurchaseReturn {
    id: string | number;
    return_number?: string;
    original_po?: string;
    supplier: string;
    return_date: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed' | string;
    items: ReturnItem[];
    total_amount: number | string;
    reason: string;
    notes?: string;
    created_at?: string;
    approved_at?: string;
    approved_by?: string;
}

/* ═══════════════════════════════════════════════════════
   LOCAL STORAGE SERVICE
═══════════════════════════════════════════════════════ */
const returnService = {
    getKey: () => 'qavi_purchase_returns',

    getAll: (): PurchaseReturn[] => {
        if (typeof window === 'undefined') return [];
        return JSON.parse(localStorage.getItem(returnService.getKey()) || '[]');
    },

    create: (data: Omit<PurchaseReturn, 'id' | 'return_number' | 'created_at'>): PurchaseReturn => {
        const all = returnService.getAll();
        const newReturn: PurchaseReturn = {
            ...data,
            id: `RET-${Date.now()}`,
            return_number: `RET-${String(all.length + 1).padStart(4, '0')}`,
            created_at: new Date().toISOString(),
        };
        all.unshift(newReturn);
        localStorage.setItem(returnService.getKey(), JSON.stringify(all));
        return newReturn;
    },

    update: (id: string | number, updates: Partial<PurchaseReturn>): PurchaseReturn => {
        const all = returnService.getAll();
        const idx = all.findIndex(r => String(r.id) === String(id));
        if (idx === -1) throw new Error('Not found');
        all[idx] = { ...all[idx], ...updates };
        localStorage.setItem(returnService.getKey(), JSON.stringify(all));
        return all[idx];
    },

    delete: (id: string | number): void => {
        const all = returnService.getAll().filter(r => String(r.id) !== String(id));
        localStorage.setItem(returnService.getKey(), JSON.stringify(all));
    },

    approve: (id: string | number): PurchaseReturn =>
        returnService.update(id, {
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: 'Admin',
        }),

    reject: (id: string | number): PurchaseReturn =>
        returnService.update(id, { status: 'rejected' }),

    complete: (id: string | number): PurchaseReturn =>
        returnService.update(id, { status: 'completed' }),
};

/* ═══════════════════════════════════════════════════════
   STATUS CONFIG
═══════════════════════════════════════════════════════ */
const STATUS_CFG: Record<string, { label: string; cls: string; icon: any; dot: string }> = {
    pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock, dot: 'bg-amber-400' },
    approved: { label: 'Approved', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: BadgeCheck, dot: 'bg-blue-500' },
    rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-700 border-red-200', icon: Ban, dot: 'bg-red-500' },
    completed: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle, dot: 'bg-emerald-500' },
};

const RETURN_REASONS = [
    'Defective / Damaged Product',
    'Wrong Item Received',
    'Quality Not Matching',
    'Expired / Near-Expiry Product',
    'Overstocked / Excess Quantity',
    'Duplicate Order',
    'Other',
];

function StatusBadge({ status }: { status: string }) {
    const k = (status || 'pending').toLowerCase();
    const cfg = STATUS_CFG[k] || STATUS_CFG.pending;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${cfg.cls}`}>
            <Icon className="h-3 w-3" strokeWidth={2.5} />
            {cfg.label}
        </span>
    );
}

/* ═══════════════════════════════════════════════════════
   RETURN DETAIL MODAL
═══════════════════════════════════════════════════════ */
function DetailModal({ ret, onClose, onApprove, onReject, onComplete }: {
    ret: PurchaseReturn;
    onClose: () => void;
    onApprove: () => void;
    onReject: () => void;
    onComplete: () => void;
}) {
    const total = ret.items.reduce((s, i) => s + parseFloat(String(i.unit_price || 0)) * (i.quantity || 1), 0);
    const isPending = ret.status === 'pending';
    const isApproved = ret.status === 'approved';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center">
                            <RotateCcw className="h-5 w-5 text-red-500" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900">
                                {ret.return_number || `#${String(ret.id).slice(-6).toUpperCase()}`}
                            </h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                Return Purchase — {formatDate(ret.created_at || ret.return_date)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusBadge status={ret.status} />
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors ml-2">
                            <X className="h-5 w-5 text-gray-400" />
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 p-8 space-y-6">

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Supplier</p>
                            <p className="font-black text-gray-900 text-sm">{ret.supplier || '—'}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Original PO #</p>
                            <p className="font-black text-gray-900 text-sm">{ret.original_po || '—'}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Return Date</p>
                            <p className="font-black text-gray-900 text-sm">{formatDate(ret.return_date)}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Return Reason</p>
                            <p className="font-black text-gray-900 text-sm">{ret.reason || '—'}</p>
                        </div>
                    </div>

                    {/* Approved info */}
                    {ret.approved_at && (
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-3">
                            <BadgeCheck className="h-5 w-5 text-blue-500 flex-shrink-0" />
                            <div>
                                <p className="text-xs font-black text-blue-700">Approved by {ret.approved_by}</p>
                                <p className="text-[10px] text-blue-500 font-medium">{formatDate(ret.approved_at, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                            </div>
                        </div>
                    )}

                    {/* Items */}
                    {ret.items.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Return Items</p>
                            <div className="space-y-2">
                                {ret.items.map((item, i) => (
                                    <div key={i} className="flex items-start justify-between bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-gray-900 text-sm">{item.product_name || `Item ${i + 1}`}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <p className="text-[10px] text-gray-400 font-medium">Qty: {item.quantity || 1}</p>
                                                {item.reason && (
                                                    <span className="text-[9px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-bold border border-red-100">
                                                        {item.reason}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="font-black text-gray-900 text-sm ml-4 flex-shrink-0">
                                            {formatCurrency(parseFloat(String(item.unit_price || 0)) * (item.quantity || 1))}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {ret.notes && (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                            <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 mb-1">Notes</p>
                            <p className="text-sm font-medium text-amber-800">{ret.notes}</p>
                        </div>
                    )}

                    {/* Total */}
                    <div className="flex items-center justify-between bg-[#FF9900]/10 px-6 py-4 rounded-xl border border-[#FF9900]/20">
                        <p className="font-black text-gray-900 uppercase tracking-widest text-[10px]">Refund Amount</p>
                        <p className="text-2xl font-black text-[#FF9900]">
                            {formatCurrency(ret.total_amount || total)}
                        </p>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all">
                        Close
                    </button>
                    <div className="flex items-center gap-2">
                        {isPending && (
                            <>
                                <button onClick={onReject}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-red-50 border border-red-200 text-red-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-100 transition-all">
                                    <Ban className="h-4 w-4" /> Reject
                                </button>
                                <button onClick={onApprove}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-[#FF9900] text-[#131921] font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#e68a00] transition-all shadow-sm">
                                    <BadgeCheck className="h-4 w-4" /> Approve Return
                                </button>
                            </>
                        )}
                        {isApproved && (
                            <button onClick={onComplete}
                                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all shadow-sm">
                                <CheckCircle className="h-4 w-4" /> Mark as Completed
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   CREATE / EDIT MODAL
═══════════════════════════════════════════════════════ */
function ReturnFormModal({ onClose, onSaved }: {
    onClose: () => void;
    onSaved: (r: PurchaseReturn) => void;
}) {
    const [supplier, setSupplier] = useState('');
    const [originalPo, setOriginalPo] = useState('');
    const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
    const [reason, setReason] = useState(RETURN_REASONS[0]);
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<ReturnItem[]>([
        { product_name: '', quantity: 1, unit_price: '', reason: '' }
    ]);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const addItem = () => setItems(p => [...p, { product_name: '', quantity: 1, unit_price: '', reason: '' }]);
    const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
    const updateItem = (i: number, field: keyof ReturnItem, val: any) =>
        setItems(p => p.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

    const computedTotal = items.reduce((s, i) => s + parseFloat(String(i.unit_price || 0)) * (i.quantity || 1), 0);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!supplier.trim()) e.supplier = 'Supplier name is required';
        if (!returnDate) e.returnDate = 'Return date is required';
        if (items.every(i => !i.product_name.trim())) e.items = 'At least one item is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const saved = returnService.create({
                supplier,
                original_po: originalPo,
                return_date: returnDate,
                status: 'pending',
                reason,
                notes,
                total_amount: computedTotal.toFixed(2),
                items: items.filter(i => i.product_name.trim()),
            });
            onSaved(saved);
        } catch {
            setErrors({ submit: 'Failed to save. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    const inputCls = (field: string) =>
        `w-full border rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 transition-all bg-white ${errors[field]
            ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
            : 'border-gray-200 focus:ring-[#FF9900]/20 focus:border-[#FF9900]'
        }`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center">
                            <RotateCcw className="h-5 w-5 text-red-500" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900">New Purchase Return</h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fill in the return details below</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-8 space-y-5">

                    {errors.submit && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-bold px-4 py-3 rounded-xl flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {errors.submit}
                        </div>
                    )}

                    {/* Supplier + PO */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">
                                Supplier <span className="text-red-500">*</span>
                            </label>
                            <input value={supplier} onChange={e => setSupplier(e.target.value)}
                                placeholder="Supplier name" className={inputCls('supplier')} />
                            {errors.supplier && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.supplier}</p>}
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">
                                Original PO #
                            </label>
                            <input value={originalPo} onChange={e => setOriginalPo(e.target.value)}
                                placeholder="e.g. PO-0042" className={inputCls('originalPo')} />
                        </div>
                    </div>

                    {/* Date + Reason */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">
                                Return Date <span className="text-red-500">*</span>
                            </label>
                            <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)}
                                className={inputCls('returnDate')} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">
                                Return Reason
                            </label>
                            <div className="relative">
                                <select value={reason} onChange={e => setReason(e.target.value)}
                                    className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all bg-white pr-10">
                                    {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                Return Items <span className="text-red-500">*</span>
                            </label>
                            <button onClick={addItem}
                                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#FF9900] hover:text-[#e68a00] transition-colors">
                                <Plus className="h-3.5 w-3.5" /> Add Item
                            </button>
                        </div>

                        {errors.items && (
                            <p className="text-red-500 text-[10px] font-bold mb-2">{errors.items}</p>
                        )}

                        <div className="space-y-3">
                            {/* Column headers */}
                            <div className="grid grid-cols-[1fr_60px_90px_120px_32px] gap-2 px-1">
                                {['Product Name', 'Qty', 'Unit Price', 'Reason', ''].map(h => (
                                    <p key={h} className="text-[9px] font-black uppercase tracking-widest text-gray-400">{h}</p>
                                ))}
                            </div>

                            {items.map((item, i) => (
                                <div key={i} className="grid grid-cols-[1fr_60px_90px_120px_32px] gap-2 items-start">
                                    <input value={item.product_name}
                                        onChange={e => updateItem(i, 'product_name', e.target.value)}
                                        placeholder="Product name"
                                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all w-full" />
                                    <input type="number" min="1"
                                        value={item.quantity}
                                        onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all w-full text-center" />
                                    <input type="number" min="0" step="0.01"
                                        value={item.unit_price}
                                        onChange={e => updateItem(i, 'unit_price', e.target.value)}
                                        placeholder="0.00"
                                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all w-full" />
                                    <div className="relative">
                                        <select value={item.reason}
                                            onChange={e => updateItem(i, 'reason', e.target.value)}
                                            className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all bg-white pr-6 truncate">
                                            <option value="">—</option>
                                            {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                                    </div>
                                    <button onClick={() => removeItem(i)}
                                        className="w-8 h-9 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {computedTotal > 0 && (
                            <div className="mt-4 flex items-center justify-end gap-2">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Refund Amount:</span>
                                <span className="text-base font-black text-[#FF9900]">{formatCurrency(computedTotal)}</span>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Notes</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                            placeholder="Additional notes about this return..."
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all resize-none" />
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
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {saving ? 'Saving...' : 'Submit Return'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
const STATUS_FILTERS = ['All', 'Pending', 'Approved', 'Rejected', 'Completed'];

export default function ReturnsPage() {
    const [returns, setReturns] = useState<PurchaseReturn[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedReturn, setSelectedReturn] = useState<PurchaseReturn | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const load = () => {
        setLoading(true);
        setTimeout(() => {
            setReturns(returnService.getAll());
            setLoading(false);
        }, 300);
    };

    useEffect(() => { load(); }, []);

    const filtered = returns.filter(r => {
        const q = search.toLowerCase();
        const matchSearch = !search
            || (r.return_number || '').toLowerCase().includes(q)
            || r.supplier.toLowerCase().includes(q)
            || (r.original_po || '').toLowerCase().includes(q)
            || r.reason.toLowerCase().includes(q);
        const matchStatus = statusFilter === 'All' || r.status.toLowerCase() === statusFilter.toLowerCase();
        return matchSearch && matchStatus;
    });

    // Stats
    const totalRefund = returns.reduce((s, r) => s + parseFloat(String(r.total_amount || 0)), 0);
    const pendingCount = returns.filter(r => r.status === 'pending').length;
    const approvedCount = returns.filter(r => r.status === 'approved').length;
    const completedCount = returns.filter(r => r.status === 'completed').length;

    const handleApprove = (ret: PurchaseReturn) => {
        try {
            const updated = returnService.approve(ret.id);
            setReturns(prev => prev.map(r => String(r.id) === String(ret.id) ? updated : r));
            setSelectedReturn(updated);
            showToast(`Return ${updated.return_number} approved!`);
        } catch { showToast('Failed to approve.', 'error'); }
    };

    const handleReject = (ret: PurchaseReturn) => {
        if (!confirm('Reject this return request?')) return;
        try {
            const updated = returnService.reject(ret.id);
            setReturns(prev => prev.map(r => String(r.id) === String(ret.id) ? updated : r));
            setSelectedReturn(updated);
            showToast('Return rejected.');
        } catch { showToast('Failed to reject.', 'error'); }
    };

    const handleComplete = (ret: PurchaseReturn) => {
        try {
            const updated = returnService.complete(ret.id);
            setReturns(prev => prev.map(r => String(r.id) === String(ret.id) ? updated : r));
            setSelectedReturn(updated);
            showToast('Return marked as completed!');
        } catch { showToast('Failed to complete.', 'error'); }
    };

    const handleDelete = (ret: PurchaseReturn) => {
        if (!confirm(`Delete return ${ret.return_number}? This cannot be undone.`)) return;
        returnService.delete(ret.id);
        setReturns(prev => prev.filter(r => String(r.id) !== String(ret.id)));
        showToast('Return deleted.');
    };

    const handleSaved = (saved: PurchaseReturn) => {
        setReturns(prev => [saved, ...prev]);
        setFormOpen(false);
        showToast(`Return ${saved.return_number} submitted!`);
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12 font-sans px-3 sm:px-6 mt-6 relative z-0">

            {/* Ambient Glow */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-red-100/40 blur-[120px]" />
                <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-[#FF9900]/8 blur-[100px]" />
            </div>

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-8 right-8 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-white border border-gray-100 px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px]">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                            {toast.type === 'success' ? <CheckCircle className="h-5 w-5 text-white" /> : <XCircle className="h-5 w-5 text-white" />}
                        </div>
                        <p className="text-gray-900 text-sm font-bold">{toast.msg}</p>
                    </div>
                </div>
            )}

            {/* ── Header + Stats ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-7 sm:px-10 pt-7 pb-5 border-b border-gray-100/60">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <RotateCcw className="h-5 w-5 text-red-500" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">Purchase Returns</h1>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                Manage supplier return requests & refunds
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 self-start sm:self-auto">
                        <button onClick={load} disabled={loading}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest hover:bg-gray-50 hover:shadow-sm transition-all rounded-xl disabled:opacity-50">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={2.5} />
                            Refresh
                        </button>
                        <button onClick={() => setFormOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#FF9900] text-[#131921] font-black text-xs uppercase tracking-widest hover:bg-[#e68a00] transition-all shadow-sm rounded-xl">
                            <Plus className="h-4 w-4" strokeWidth={2.5} />
                            New Return
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100/60">
                    {[
                        { label: 'Total Returns', val: loading ? '—' : returns.length, color: 'text-gray-900', icon: FileText, iconCls: 'bg-gray-50 border-gray-100 text-gray-400' },
                        { label: 'Total Refunds', val: loading ? '—' : formatCurrency(totalRefund), color: 'text-[#FF9900]', icon: DollarSign, iconCls: 'bg-[#FF9900]/10 border-[#FF9900]/20 text-[#FF9900]' },
                        { label: 'Pending', val: loading ? '—' : pendingCount, color: 'text-amber-600', icon: Clock, iconCls: 'bg-amber-50 border-amber-100 text-amber-500' },
                        { label: 'Completed', val: loading ? '—' : completedCount, color: 'text-emerald-600', icon: CheckCircle, iconCls: 'bg-emerald-50 border-emerald-100 text-emerald-500' },
                    ].map(s => (
                        <div key={s.label} className="flex items-center justify-between px-6 sm:px-8 py-4">
                            <div>
                                <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${s.color}`}>{s.label}</p>
                                <p className={`text-2xl font-black tracking-tight ${s.color}`}>{s.val}</p>
                            </div>
                            <div className={`w-9 h-9 border rounded-xl flex items-center justify-center shadow-sm ${s.iconCls}`}>
                                <s.icon className="w-4 h-4" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pending Attention Banner */}
            {pendingCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 flex items-center gap-3">
                    <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="h-4 w-4 text-amber-600" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-black text-amber-800">
                            {pendingCount} return{pendingCount > 1 ? 's' : ''} awaiting your review
                        </p>
                        <p className="text-xs text-amber-600 font-medium">Click on a return and approve or reject it.</p>
                    </div>
                    <button onClick={() => setStatusFilter('Pending')}
                        className="flex items-center gap-1.5 text-xs font-black text-amber-700 border border-amber-300 px-3 py-1.5 rounded-xl hover:bg-amber-100 transition-all">
                        View Pending <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            {/* ── Table Card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                {/* Search + Filters */}
                <div className="px-5 sm:px-8 py-5 border-b border-gray-100/50 flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center gap-2.5 bg-white border border-gray-200 px-4 py-2.5 rounded-xl flex-1 min-w-[180px] focus-within:ring-2 focus-within:ring-[#FF9900]/20 focus-within:border-[#FF9900] shadow-sm transition-all">
                        <Search className="h-4 w-4 text-gray-400 flex-shrink-0" strokeWidth={2.5} />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search by supplier, PO #, reason..."
                            className="text-sm text-gray-900 outline-none w-full bg-transparent font-bold placeholder:font-medium placeholder:text-gray-400" />
                        {search && (
                            <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500 transition-colors">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

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
                        {filtered.length} return{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center">
                        <div className="w-10 h-10 border-4 border-[#FF9900]/20 border-t-[#FF9900] rounded-full animate-spin mb-4" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading returns...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-24 text-center px-6">
                        <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-red-100">
                            <RotateCcw className="h-9 w-9 text-red-300" />
                        </div>
                        <h3 className="font-black text-gray-900 text-lg mb-1">
                            {search || statusFilter !== 'All' ? 'No returns match your filters' : 'No return requests yet'}
                        </h3>
                        <p className="text-sm font-medium text-gray-400 mb-6 max-w-xs mx-auto">
                            {search || statusFilter !== 'All'
                                ? 'Try adjusting your search or status filter.'
                                : 'Create your first purchase return to track refunds from suppliers.'}
                        </p>
                        {(search || statusFilter !== 'All') ? (
                            <button onClick={() => { setSearch(''); setStatusFilter('All'); }}
                                className="text-xs font-black text-[#FF9900] uppercase tracking-widest hover:underline">
                                Clear filters
                            </button>
                        ) : (
                            <button onClick={() => setFormOpen(true)}
                                className="flex items-center gap-2 mx-auto px-6 py-3 bg-[#FF9900] text-[#131921] font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#e68a00] transition-all shadow-sm">
                                <Plus className="h-4 w-4" /> Create First Return
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="text-left px-8 py-4">Return #</th>
                                    <th className="text-left px-6 py-4">Supplier</th>
                                    <th className="text-left px-6 py-4">Original PO</th>
                                    <th className="text-left px-6 py-4">Date</th>
                                    <th className="text-left px-6 py-4">Reason</th>
                                    <th className="text-right px-6 py-4">Refund Amt</th>
                                    <th className="text-left px-6 py-4">Status</th>
                                    <th className="text-center px-6 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(ret => (
                                    <tr key={ret.id}
                                        className="hover:bg-white/60 transition-all duration-300 group border-b border-gray-50/50 last:border-0">

                                        {/* Return # */}
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-red-50/80 border border-red-100/70 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                                                    <RotateCcw className="h-4 w-4 text-red-400" strokeWidth={2.5} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 text-sm group-hover:text-[#FF9900] transition-colors">
                                                        {ret.return_number || `#${String(ret.id).slice(-6).toUpperCase()}`}
                                                    </p>
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                                        {ret.items.length} item{ret.items.length !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Supplier */}
                                        <td className="px-6 py-4">
                                            <p className="font-black text-gray-900 text-sm">{ret.supplier}</p>
                                        </td>

                                        {/* PO */}
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-gray-500">{ret.original_po || '—'}</p>
                                        </td>

                                        {/* Date */}
                                        <td className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                            {formatDate(ret.return_date || ret.created_at)}
                                        </td>

                                        {/* Reason */}
                                        <td className="px-6 py-4 max-w-[160px]">
                                            <p className="text-xs font-bold text-gray-600 truncate">{ret.reason}</p>
                                        </td>

                                        {/* Refund */}
                                        <td className="px-6 py-4 text-right">
                                            <p className="font-black text-gray-900 text-sm">{formatCurrency(ret.total_amount || 0)}</p>
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4">
                                            <StatusBadge status={ret.status} />
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                <button onClick={() => setSelectedReturn(ret)}
                                                    className="p-2 bg-white border border-transparent hover:border-[#FF9900]/20 hover:bg-[#FF9900]/5 text-[#FF9900] rounded-xl hover:scale-110 hover:shadow-sm transition-all"
                                                    title="View Details">
                                                    <Eye className="h-4 w-4" strokeWidth={2.5} />
                                                </button>
                                                {ret.status === 'pending' && (
                                                    <>
                                                        <button onClick={() => handleApprove(ret)}
                                                            className="p-2 bg-white border border-transparent hover:border-blue-200 hover:bg-blue-50 text-blue-500 rounded-xl hover:scale-110 hover:shadow-sm transition-all"
                                                            title="Approve">
                                                            <BadgeCheck className="h-4 w-4" strokeWidth={2.5} />
                                                        </button>
                                                        <button onClick={() => handleReject(ret)}
                                                            className="p-2 bg-white border border-transparent hover:border-red-200 hover:bg-red-50 text-red-400 rounded-xl hover:scale-110 hover:shadow-sm transition-all"
                                                            title="Reject">
                                                            <Ban className="h-4 w-4" strokeWidth={2.5} />
                                                        </button>
                                                    </>
                                                )}
                                                {ret.status === 'approved' && (
                                                    <button onClick={() => handleComplete(ret)}
                                                        className="p-2 bg-white border border-transparent hover:border-emerald-200 hover:bg-emerald-50 text-emerald-500 rounded-xl hover:scale-110 hover:shadow-sm transition-all"
                                                        title="Mark Completed">
                                                        <CheckCircle className="h-4 w-4" strokeWidth={2.5} />
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(ret)}
                                                    className="p-2 bg-white border border-transparent hover:border-red-200 hover:bg-red-50 text-red-400 rounded-xl hover:scale-110 hover:shadow-sm transition-all"
                                                    title="Delete">
                                                    <Trash2 className="h-4 w-4" strokeWidth={2.5} />
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
            {selectedReturn && (
                <DetailModal
                    ret={selectedReturn}
                    onClose={() => setSelectedReturn(null)}
                    onApprove={() => handleApprove(selectedReturn)}
                    onReject={() => handleReject(selectedReturn)}
                    onComplete={() => handleComplete(selectedReturn)}
                />
            )}

            {/* Create Form Modal */}
            {formOpen && (
                <ReturnFormModal onClose={() => setFormOpen(false)} onSaved={handleSaved} />
            )}
        </div>
    );
}
