'use client';

import { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
    RotateCcw, Search, X, RefreshCw, Eye, Plus, CheckCircle,
    Clock, XCircle, DollarSign, Package, Trash2, Save,
    AlertTriangle, ChevronDown, FileText, ArrowUpRight,
    Loader2, Ban, BadgeCheck, User, ShoppingBag, CreditCard,
    Banknote, Wallet, Tag
} from 'lucide-react';

/* ══════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════ */
interface ReturnItem {
    product_name: string;
    quantity: number;
    unit_price: number | string;
    condition: string;
}

interface SaleReturn {
    id: string | number;
    return_number?: string;
    order_number?: string;
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    return_date: string;
    status: 'pending' | 'approved' | 'rejected' | 'refunded' | string;
    refund_method: string;
    items: ReturnItem[];
    total_amount: number | string;
    reason: string;
    notes?: string;
    created_at?: string;
    processed_at?: string;
    processed_by?: string;
}

/* ══════════════════════════════════════════════
   LOCAL SERVICE
══════════════════════════════════════════════ */
const KEY = 'qavi_sale_returns';

const saleReturnService = {
    getAll: (): SaleReturn[] => {
        if (typeof window === 'undefined') return [];
        return JSON.parse(localStorage.getItem(KEY) || '[]');
    },
    create: (data: Omit<SaleReturn, 'id' | 'return_number' | 'created_at'>): SaleReturn => {
        const all = saleReturnService.getAll();
        const r: SaleReturn = {
            ...data,
            id: `SR-${Date.now()}`,
            return_number: `SR-${String(all.length + 1).padStart(4, '0')}`,
            created_at: new Date().toISOString(),
        };
        all.unshift(r);
        localStorage.setItem(KEY, JSON.stringify(all));
        return r;
    },
    update: (id: string | number, patch: Partial<SaleReturn>): SaleReturn => {
        const all = saleReturnService.getAll();
        const i = all.findIndex(r => String(r.id) === String(id));
        if (i === -1) throw new Error('Not found');
        all[i] = { ...all[i], ...patch };
        localStorage.setItem(KEY, JSON.stringify(all));
        return all[i];
    },
    delete: (id: string | number) => {
        localStorage.setItem(KEY, JSON.stringify(saleReturnService.getAll().filter(r => String(r.id) !== String(id))));
    },
    approve: (id: string | number) => saleReturnService.update(id, { status: 'approved', processed_at: new Date().toISOString(), processed_by: 'Admin' }),
    reject: (id: string | number) => saleReturnService.update(id, { status: 'rejected', processed_at: new Date().toISOString(), processed_by: 'Admin' }),
    refund: (id: string | number) => saleReturnService.update(id, { status: 'refunded', processed_at: new Date().toISOString() }),
};

/* ══════════════════════════════════════════════
   CONFIG
══════════════════════════════════════════════ */
const STATUS_CFG: Record<string, { label: string; cls: string; icon: any; dot: string }> = {
    pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock, dot: 'bg-amber-400' },
    approved: { label: 'Approved', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: BadgeCheck, dot: 'bg-blue-500' },
    rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-700 border-red-200', icon: Ban, dot: 'bg-red-500' },
    refunded: { label: 'Refunded', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle, dot: 'bg-emerald-500' },
};

const RETURN_REASONS = [
    'Defective / Damaged Product',
    'Wrong Item Received',
    'Not as Described',
    'Changed Mind',
    'Allergic Reaction',
    'Duplicate Order',
    'Product Expired',
    'Other',
];

const REFUND_METHODS = [
    { value: 'original_payment', label: 'Original Payment Method', icon: CreditCard },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: Banknote },
    { value: 'store_credit', label: 'Store Credit', icon: Wallet },
    { value: 'cash', label: 'Cash Refund', icon: DollarSign },
];

const ITEM_CONDITIONS = ['Unopened / Sealed', 'Opened – Good Condition', 'Damaged', 'Partially Used'];

/* ══════════════════════════════════════════════
   STATUS BADGE
══════════════════════════════════════════════ */
function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CFG[(status || 'pending').toLowerCase()] || STATUS_CFG.pending;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${cfg.cls}`}>
            <Icon className="h-3 w-3" strokeWidth={2.5} />{cfg.label}
        </span>
    );
}

/* ══════════════════════════════════════════════
   DETAIL MODAL
══════════════════════════════════════════════ */
function DetailModal({ ret, onClose, onApprove, onReject, onRefund }: {
    ret: SaleReturn; onClose: () => void;
    onApprove: () => void; onReject: () => void; onRefund: () => void;
}) {
    const computedTotal = ret.items.reduce((s, i) => s + parseFloat(String(i.unit_price || 0)) * (i.quantity || 1), 0);
    const refLabel = REFUND_METHODS.find(m => m.value === ret.refund_method)?.label || ret.refund_method;
    const isPending = ret.status === 'pending';
    const isApproved = ret.status === 'approved';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-[#FF9900]/10 border border-[#FF9900]/20 rounded-xl flex items-center justify-center">
                            <RotateCcw className="h-5 w-5 text-[#FF9900]" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-gray-900">
                                {ret.return_number || `#${String(ret.id).slice(-6).toUpperCase()}`}
                            </h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                Sale Return · {formatDate(ret.created_at || ret.return_date)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusBadge status={ret.status} />
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors ml-1">
                            <X className="h-4 w-4 text-gray-400" />
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 p-7 space-y-5">
                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Customer', val: ret.customer_name },
                            { label: 'Original Order #', val: ret.order_number || '—' },
                            { label: 'Email', val: ret.customer_email || '—' },
                            { label: 'Phone', val: ret.customer_phone || '—' },
                            { label: 'Return Date', val: formatDate(ret.return_date) },
                            { label: 'Refund Via', val: refLabel },
                        ].map(({ label, val }) => (
                            <div key={label} className="bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
                                <p className="font-black text-gray-900 text-sm truncate">{val}</p>
                            </div>
                        ))}
                    </div>

                    {/* Reason banner */}
                    <div className="bg-amber-50 border border-amber-100 px-4 py-3 rounded-xl flex items-center gap-3">
                        <Tag className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 mb-0.5">Return Reason</p>
                            <p className="text-sm font-bold text-amber-800">{ret.reason}</p>
                        </div>
                    </div>

                    {/* Processing info */}
                    {ret.processed_at && (
                        <div className="bg-blue-50 border border-blue-100 px-4 py-3 rounded-xl flex items-center gap-3">
                            <BadgeCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            <div>
                                <p className="text-xs font-black text-blue-700">Processed by {ret.processed_by || 'Admin'}</p>
                                <p className="text-[10px] text-blue-400 font-medium">{formatDate(ret.processed_at, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                            </div>
                        </div>
                    )}

                    {/* Items */}
                    {ret.items.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Returned Items</p>
                            <div className="space-y-2">
                                {ret.items.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                                        <div>
                                            <p className="font-black text-gray-900 text-sm">{item.product_name || `Item ${i + 1}`}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] text-gray-400 font-medium">Qty: {item.quantity}</span>
                                                {item.condition && (
                                                    <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold border border-blue-100">{item.condition}</span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="font-black text-gray-900 text-sm">{formatCurrency(parseFloat(String(item.unit_price || 0)) * (item.quantity || 1))}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {ret.notes && (
                        <div className="bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Notes</p>
                            <p className="text-sm font-medium text-gray-700">{ret.notes}</p>
                        </div>
                    )}

                    {/* Total */}
                    <div className="flex items-center justify-between bg-[#FF9900]/10 px-6 py-4 rounded-xl border border-[#FF9900]/20">
                        <p className="font-black text-gray-900 uppercase tracking-widest text-[10px]">Refund Amount</p>
                        <p className="text-2xl font-black text-[#FF9900]">{formatCurrency(ret.total_amount || computedTotal)}</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-7 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-white transition-all">Close</button>
                    <div className="flex items-center gap-2">
                        {isPending && (
                            <>
                                <button onClick={onReject} className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 text-red-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-100 transition-all">
                                    <Ban className="h-3.5 w-3.5" /> Reject
                                </button>
                                <button onClick={onApprove} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-sm">
                                    <BadgeCheck className="h-3.5 w-3.5" /> Approve
                                </button>
                            </>
                        )}
                        {isApproved && (
                            <button onClick={onRefund} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all shadow-sm">
                                <CheckCircle className="h-3.5 w-3.5" /> Process Refund
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════
   CREATE MODAL
══════════════════════════════════════════════ */
function CreateModal({ onClose, onSaved }: { onClose: () => void; onSaved: (r: SaleReturn) => void }) {
    const [form, setForm] = useState({
        customer_name: '', customer_email: '', customer_phone: '',
        order_number: '', return_date: new Date().toISOString().slice(0, 10),
        reason: RETURN_REASONS[0], refund_method: 'original_payment', notes: '',
    });
    const [items, setItems] = useState<ReturnItem[]>([{ product_name: '', quantity: 1, unit_price: '', condition: '' }]);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const set = (k: string, v: string) => { setForm(p => ({ ...p, [k]: v })); if (errors[k]) setErrors(p => ({ ...p, [k]: '' })); };
    const updateItem = (i: number, k: keyof ReturnItem, v: any) => setItems(p => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
    const addItem = () => setItems(p => [...p, { product_name: '', quantity: 1, unit_price: '', condition: '' }]);
    const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
    const computedTotal = items.reduce((s, i) => s + parseFloat(String(i.unit_price || 0)) * (i.quantity || 1), 0);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.customer_name.trim()) e.customer_name = 'Customer name is required';
        if (!form.return_date) e.return_date = 'Return date is required';
        if (items.every(i => !i.product_name.trim())) e.items = 'At least one item is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const saved = saleReturnService.create({
                ...form,
                status: 'pending',
                items: items.filter(i => i.product_name.trim()),
                total_amount: computedTotal.toFixed(2),
            });
            onSaved(saved);
        } catch { setErrors({ submit: 'Failed to save.' }); }
        finally { setSaving(false); }
    };

    const inputCls = (k: string) =>
        `w-full border rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 transition-all bg-white ${errors[k] ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-[#FF9900]/20 focus:border-[#FF9900]'}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[94vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#FF9900]/10 border border-[#FF9900]/20 rounded-xl flex items-center justify-center">
                            <RotateCcw className="h-5 w-5 text-[#FF9900]" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-gray-900">New Sale Return</h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer return & refund request</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X className="h-5 w-5 text-gray-400" /></button>
                </div>

                <div className="overflow-y-auto flex-1 p-7 space-y-5">
                    {errors.submit && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-bold px-4 py-3 rounded-xl flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />{errors.submit}
                        </div>
                    )}

                    {/* Customer Info */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                            <User className="h-3.5 w-3.5" /> Customer Information
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5 block">Customer Name <span className="text-red-500">*</span></label>
                                <input value={form.customer_name} onChange={e => set('customer_name', e.target.value)} placeholder="Full name" className={inputCls('customer_name')} />
                                {errors.customer_name && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.customer_name}</p>}
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5 block">Order # (Optional)</label>
                                <input value={form.order_number} onChange={e => set('order_number', e.target.value)} placeholder="e.g. ORD-0042" className={inputCls('order_number')} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5 block">Email</label>
                                <input type="email" value={form.customer_email} onChange={e => set('customer_email', e.target.value)} placeholder="customer@email.com" className={inputCls('customer_email')} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5 block">Phone</label>
                                <input value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)} placeholder="+92 300 1234567" className={inputCls('customer_phone')} />
                            </div>
                        </div>
                    </div>

                    {/* Return Info */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                            <ShoppingBag className="h-3.5 w-3.5" /> Return Information
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5 block">Return Date <span className="text-red-500">*</span></label>
                                <input type="date" value={form.return_date} onChange={e => set('return_date', e.target.value)} className={inputCls('return_date')} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5 block">Refund Method</label>
                                <div className="relative">
                                    <select value={form.refund_method} onChange={e => set('refund_method', e.target.value)}
                                        className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] bg-white pr-8">
                                        {REFUND_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5 block">Return Reason</label>
                                <div className="relative">
                                    <select value={form.reason} onChange={e => set('reason', e.target.value)}
                                        className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] bg-white pr-8">
                                        {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                <Package className="h-3.5 w-3.5" /> Return Items <span className="text-red-500">*</span>
                            </p>
                            <button onClick={addItem} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#FF9900] hover:text-[#e68a00] transition-colors">
                                <Plus className="h-3.5 w-3.5" /> Add Item
                            </button>
                        </div>
                        {errors.items && <p className="text-red-500 text-[10px] font-bold mb-2">{errors.items}</p>}

                        <div className="grid grid-cols-[9px_1fr_50px_80px_110px_28px] gap-1.5 px-1 mb-1.5">
                            {['', 'Product Name', 'Qty', 'Price', 'Condition', ''].map((h, i) => (
                                <p key={i} className="text-[9px] font-black uppercase tracking-widest text-gray-400">{h}</p>
                            ))}
                        </div>

                        <div className="space-y-2">
                            {items.map((item, i) => (
                                <div key={i} className="grid grid-cols-[9px_1fr_50px_80px_110px_28px] gap-1.5 items-center">
                                    <div className={`w-2 h-2 rounded-full mt-0.5 ${STATUS_CFG.pending.dot}`} />
                                    <input value={item.product_name} onChange={e => updateItem(i, 'product_name', e.target.value)}
                                        placeholder="Product name"
                                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] w-full" />
                                    <input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                                        className="border border-gray-200 rounded-xl px-2 py-2 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] text-center w-full" />
                                    <input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)}
                                        placeholder="0.00"
                                        className="border border-gray-200 rounded-xl px-2 py-2 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] w-full" />
                                    <div className="relative">
                                        <select value={item.condition} onChange={e => updateItem(i, 'condition', e.target.value)}
                                            className="w-full appearance-none border border-gray-200 rounded-xl px-2 py-2 text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] bg-white pr-5 truncate">
                                            <option value="">Condition</option>
                                            {ITEM_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                                    </div>
                                    <button onClick={() => removeItem(i)} className="flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg w-7 h-8 transition-colors flex-shrink-0">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {computedTotal > 0 && (
                            <div className="mt-3 flex items-center justify-end gap-2">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Refund:</span>
                                <span className="text-lg font-black text-[#FF9900]">{formatCurrency(computedTotal)}</span>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5 block">Notes (Optional)</label>
                        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                            placeholder="Additional notes..."
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] resize-none" />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-7 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-white transition-all">Cancel</button>
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

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
const STATUS_FILTERS = ['All', 'Pending', 'Approved', 'Rejected', 'Refunded'];

export default function SaleReturnsPage() {
    const [returns, setReturns] = useState<SaleReturn[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<SaleReturn | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const load = () => {
        setLoading(true);
        setTimeout(() => { setReturns(saleReturnService.getAll()); setLoading(false); }, 300);
    };

    useEffect(() => { load(); }, []);

    const filtered = returns.filter(r => {
        const q = search.toLowerCase();
        return !search || r.customer_name.toLowerCase().includes(q) ||
            (r.return_number || '').toLowerCase().includes(q) ||
            (r.order_number || '').toLowerCase().includes(q) ||
            r.reason.toLowerCase().includes(q);
    });

    const totalRefund = returns.reduce((s, r) => s + parseFloat(String(r.total_amount || 0)), 0);
    const pendingCount = returns.filter(r => r.status === 'pending').length;
    const refundedCount = returns.filter(r => r.status === 'refunded').length;

    const mutate = (id: string | number, updater: () => SaleReturn) => {
        try {
            const updated = updater();
            setReturns(prev => prev.map(r => String(r.id) === String(id) ? updated : r));
            if (selected && String(selected.id) === String(id)) setSelected(updated);
            return updated;
        } catch { showToast('Operation failed.', 'error'); return null; }
    };

    const handleApprove = (r: SaleReturn) => { const u = mutate(r.id, () => saleReturnService.approve(r.id)); if (u) showToast(`${u.return_number} approved!`); };
    const handleReject = (r: SaleReturn) => { if (!confirm('Reject this return?')) return; const u = mutate(r.id, () => saleReturnService.reject(r.id)); if (u) showToast('Return rejected.'); };
    const handleRefund = (r: SaleReturn) => { const u = mutate(r.id, () => saleReturnService.refund(r.id)); if (u) showToast(`Refund of ${formatCurrency(u.total_amount || 0)} processed!`); };
    const handleDelete = (r: SaleReturn) => { if (!confirm(`Delete ${r.return_number}?`)) return; saleReturnService.delete(r.id); setReturns(prev => prev.filter(x => String(x.id) !== String(r.id))); showToast('Return deleted.'); };
    const handleSaved = (saved: SaleReturn) => { setReturns(prev => [saved, ...prev]); setFormOpen(false); showToast(`${saved.return_number} submitted!`); };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12 font-sans px-3 sm:px-6 mt-6 relative z-0">

            {/* Ambient glow */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] right-[-5%] w-[35%] h-[45%] rounded-full bg-[#FF9900]/10 blur-[120px]" />
                <div className="absolute bottom-[10%] left-[-10%] w-[30%] h-[40%] rounded-full bg-[#FF9900]/8 blur-[100px]" />
            </div>

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-8 right-8 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-white border border-gray-100 px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px]">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${toast.type === 'success' ? 'bg-[#FF9900]' : 'bg-red-500'}`}>
                            {toast.type === 'success' ? <CheckCircle className="h-5 w-5 text-white" /> : <XCircle className="h-5 w-5 text-white" />}
                        </div>
                        <p className="text-gray-900 text-sm font-bold">{toast.msg}</p>
                    </div>
                </div>
            )}

            {/* ── Header + Stats ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-7 sm:px-10 pt-7 pb-5 border-b border-gray-100/60">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#FF9900] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#FF9900]/20">
                            <RotateCcw className="h-6 w-6 text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">Sale Returns</h1>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                Customer return requests &amp; refund management
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 self-start sm:self-auto">
                        <button onClick={load} disabled={loading}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all rounded-xl disabled:opacity-50">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={2.5} /> Refresh
                        </button>
                        <button onClick={() => setFormOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#FF9900] text-[#131921] font-black text-xs uppercase tracking-widest hover:bg-[#e68a00] transition-all shadow-sm rounded-xl">
                            <Plus className="h-4 w-4" strokeWidth={2.5} /> New Return
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100/60">
                    {[
                        { label: 'Total Returns', val: loading ? '—' : String(returns.length), color: 'text-gray-900', subColor: 'text-gray-400', bg: 'bg-gray-50 border-gray-100 text-gray-400', Icon: FileText },
                        { label: 'Total Refunds', val: loading ? '—' : formatCurrency(totalRefund), color: 'text-[#FF9900]', subColor: 'text-[#FF9900]', bg: 'bg-[#FF9900]/10 border-[#FF9900]/20 text-[#FF9900]', Icon: DollarSign },
                        { label: 'Pending', val: loading ? '—' : String(pendingCount), color: 'text-amber-600', subColor: 'text-amber-500', bg: 'bg-amber-50 border-amber-100 text-amber-400', Icon: Clock },
                        { label: 'Refunded', val: loading ? '—' : String(refundedCount), color: 'text-emerald-600', subColor: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-100 text-emerald-400', Icon: CheckCircle },
                    ].map(s => (
                        <div key={s.label} className="flex items-center justify-between px-6 sm:px-8 py-4">
                            <div>
                                <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${s.subColor}`}>{s.label}</p>
                                <p className={`text-2xl font-black tracking-tight ${s.color}`}>{s.val}</p>
                            </div>
                            <div className={`w-9 h-9 border rounded-xl flex items-center justify-center shadow-sm ${s.bg}`}>
                                <s.Icon className="w-4 h-4" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pending alert */}
            {pendingCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 flex items-center gap-3">
                    <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="h-4 w-4 text-amber-600" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-black text-amber-800">
                            {pendingCount} customer return{pendingCount > 1 ? 's' : ''} awaiting review
                        </p>
                        <p className="text-xs text-amber-600 font-medium">Approve to proceed with refund or reject the request.</p>
                    </div>
                    <button onClick={() => setSearch('')}
                        className="flex items-center gap-1.5 text-xs font-black text-amber-700 border border-amber-300 px-3 py-1.5 rounded-xl hover:bg-amber-100 transition-all">
                        View Pending <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            {/* ── Table Card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">

                {/* Search bar */}
                <div className="px-5 sm:px-8 py-5 border-b border-gray-100/50 flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center gap-2.5 bg-white border border-gray-200 px-4 py-2.5 rounded-xl flex-1 min-w-[180px] focus-within:ring-2 focus-within:ring-[#FF9900]/20 focus-within:border-[#FF9900] shadow-sm transition-all">
                        <Search className="h-4 w-4 text-gray-400 flex-shrink-0" strokeWidth={2.5} />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search by customer, order #, reason..."
                            className="text-sm text-gray-900 outline-none w-full bg-transparent font-bold placeholder:font-medium placeholder:text-gray-400" />
                        {search && <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500 transition-colors"><X className="h-3.5 w-3.5" /></button>}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#FF9900] whitespace-nowrap bg-[#FF9900]/10 px-3 py-2 rounded-xl border border-[#FF9900]/20">
                        {filtered.length} return{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Table body */}
                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center">
                        <div className="w-10 h-10 border-4 border-[#FF9900]/20 border-t-[#FF9900] rounded-full animate-spin mb-4" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading returns...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-24 text-center px-6">
                        <div className="w-20 h-20 bg-[#FF9900]/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-[#FF9900]/20">
                            <RotateCcw className="h-9 w-9 text-[#FF9900]/40" />
                        </div>
                        <h3 className="font-black text-gray-900 text-lg mb-1">
                            {search ? 'No returns match your search' : 'No sale returns yet'}
                        </h3>
                        <p className="text-sm font-medium text-gray-400 mb-6 max-w-xs mx-auto">
                            {search ? 'Try adjusting your search.' : 'Start by creating your first customer return request.'}
                        </p>
                        {(search) ? (
                            <button onClick={() => setSearch('')} className="text-xs font-black text-[#FF9900] uppercase tracking-widest hover:underline">Clear search</button>
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
                                    <th className="text-left px-6 py-4">Customer</th>
                                    <th className="text-left px-6 py-4">Order #</th>
                                    <th className="text-left px-6 py-4">Reason</th>
                                    <th className="text-left px-6 py-4">Refund Via</th>
                                    <th className="text-right px-6 py-4">Amount</th>
                                    <th className="text-left px-6 py-4">Date</th>
                                    <th className="text-left px-6 py-4">Status</th>
                                    <th className="text-center px-6 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(ret => {
                                    const refLabel = REFUND_METHODS.find(m => m.value === ret.refund_method)?.label || ret.refund_method;
                                    const RefIcon = REFUND_METHODS.find(m => m.value === ret.refund_method)?.icon || CreditCard;
                                    return (
                                        <tr key={ret.id} className="hover:bg-[#FF9900]/5 transition-all duration-300 group border-b border-gray-50/50 last:border-0">
                                            <td className="px-8 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-[#FF9900]/10 border border-[#FF9900]/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                                                        <RotateCcw className="h-4 w-4 text-[#FF9900]" strokeWidth={2.5} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900 text-sm group-hover:text-[#FF9900] transition-colors">
                                                            {ret.return_number || `#${String(ret.id).slice(-6).toUpperCase()}`}
                                                        </p>
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{ret.items.length} item{ret.items.length !== 1 ? 's' : ''}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-[#FF9900]/10 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-[#FF9900] font-black text-xs">{ret.customer_name[0]?.toUpperCase()}</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900 text-sm">{ret.customer_name}</p>
                                                        {ret.customer_email && <p className="text-[10px] text-gray-400 font-medium truncate max-w-[120px]">{ret.customer_email}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-gray-500">{ret.order_number || '—'}</p>
                                            </td>
                                            <td className="px-6 py-4 max-w-[150px]">
                                                <p className="text-xs font-bold text-gray-600 truncate">{ret.reason}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <RefIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                                    <p className="text-xs font-bold text-gray-600 truncate max-w-[100px]">{refLabel}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="font-black text-[#FF9900] text-sm">{formatCurrency(ret.total_amount || 0)}</p>
                                            </td>
                                            <td className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">
                                                {formatDate(ret.return_date || ret.created_at)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={ret.status} />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    <button onClick={() => setSelected(ret)} title="View Details"
                                                        className="p-2 bg-white border border-transparent hover:border-[#FF9900]/20 hover:bg-[#FF9900]/5 text-[#FF9900] rounded-xl hover:scale-110 hover:shadow-sm transition-all">
                                                        <Eye className="h-4 w-4" strokeWidth={2.5} />
                                                    </button>
                                                    {ret.status === 'pending' && (
                                                        <>
                                                            <button onClick={() => handleApprove(ret)} title="Approve"
                                                                className="p-2 bg-white border border-transparent hover:border-blue-200 hover:bg-blue-50 text-blue-500 rounded-xl hover:scale-110 hover:shadow-sm transition-all">
                                                                <BadgeCheck className="h-4 w-4" strokeWidth={2.5} />
                                                            </button>
                                                            <button onClick={() => handleReject(ret)} title="Reject"
                                                                className="p-2 bg-white border border-transparent hover:border-red-200 hover:bg-red-50 text-red-400 rounded-xl hover:scale-110 hover:shadow-sm transition-all">
                                                                <Ban className="h-4 w-4" strokeWidth={2.5} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {ret.status === 'approved' && (
                                                        <button onClick={() => handleRefund(ret)} title="Process Refund"
                                                            className="p-2 bg-white border border-transparent hover:border-emerald-200 hover:bg-emerald-50 text-emerald-500 rounded-xl hover:scale-110 hover:shadow-sm transition-all">
                                                            <CheckCircle className="h-4 w-4" strokeWidth={2.5} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDelete(ret)} title="Delete"
                                                        className="p-2 bg-white border border-transparent hover:border-red-200 hover:bg-red-50 text-red-400 rounded-xl hover:scale-110 hover:shadow-sm transition-all">
                                                        <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selected && (
                <DetailModal ret={selected} onClose={() => setSelected(null)}
                    onApprove={() => handleApprove(selected)}
                    onReject={() => handleReject(selected)}
                    onRefund={() => handleRefund(selected)} />
            )}
            {formOpen && <CreateModal onClose={() => setFormOpen(false)} onSaved={handleSaved} />}
        </div>
    );
}
