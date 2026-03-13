'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
    RotateCcw, Search, X, RefreshCw, Eye, Plus, CheckCircle,
    Clock, XCircle, DollarSign, Package, Trash2, Save,
    AlertTriangle, ChevronDown, FileText, ArrowUpRight,
    Loader2, Ban, BadgeCheck, User, ShoppingBag, CreditCard,
    Banknote, Wallet, Tag, Info, Calendar
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
   COMPONENTS & STYLES
   ══════════════════════════════════════════════ */

const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 border border-[#ddd] dark:border-slate-800 rounded shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ title, icon: Icon }: { title: string; icon: any }) => (
    <div className="bg-[#f6f6f6] dark:bg-slate-800 px-4 py-2 border-b border-[#ddd] dark:border-slate-800 flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        <span className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">{title}</span>
    </div>
);

const INPUT = (err?: boolean) =>
    `w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded text-sm outline-none transition-all
    focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-gray-400
    ${err ? 'border-red-600' : 'border-[#a6a6a6] dark:border-slate-700'}`;

const LABEL = "block text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5";

const PRIMARY_BTN = "bg-[#f0c14b] hover:bg-[#ebae1e] border border-[#a88734] text-gray-900 font-bold rounded-[3px] shadow-sm text-sm py-2 px-4 transition-all flex items-center justify-center gap-2 active:bg-[#e2b13c]";
const SECONDARY_BTN = "bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-[#adb1b8] dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-[3px] shadow-sm text-sm font-medium py-2 px-4 transition-all flex items-center justify-center gap-2 active:bg-gray-100 dark:active:bg-slate-600";

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
    pending: { label: 'Pending', cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800', icon: Clock, dot: 'bg-amber-400' },
    approved: { label: 'Approved', cls: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800', icon: BadgeCheck, dot: 'bg-blue-500' },
    rejected: { label: 'Rejected', cls: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800', icon: Ban, dot: 'bg-red-500' },
    refunded: { label: 'Refunded', cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', icon: CheckCircle, dot: 'bg-emerald-500' },
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
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-tight border ${cfg.cls}`}>
            <Icon className="h-3 w-3" />{cfg.label}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
            <SectionCard className="max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-4 py-2 bg-[#f6f6f6] dark:bg-slate-800 border-b border-[#ddd] dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">
                            Return Details: {ret.return_number || `#${String(ret.id).slice(-6).toUpperCase()}`}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-6 bg-white dark:bg-slate-900">
                    {/* Status Banner */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 rounded-sm">
                        <div className="flex items-center gap-3">
                            <StatusBadge status={ret.status} />
                            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                Submitted on {formatDate(ret.created_at || ret.return_date)}
                            </p>
                        </div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">Amount: {formatCurrency(ret.total_amount || computedTotal)}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <p className={LABEL}>Customer Information</p>
                                <div className="p-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 space-y-2 rounded-sm">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{ret.customer_name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{ret.customer_email || 'No email'}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{ret.customer_phone || 'No phone'}</p>
                                </div>
                            </div>
                            <div>
                                <p className={LABEL}>Original Order</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">{ret.order_number || 'Internal Return'}</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className={LABEL}>Refund Method</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{refLabel}</p>
                            </div>
                            <div>
                                <p className={LABEL}>Return Reason</p>
                                <div className="p-2 border border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-400 text-xs font-bold rounded-sm">
                                    {ret.reason}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <p className={LABEL}>Returned Items</p>
                        <div className="border border-gray-200 dark:border-slate-700 rounded-sm overflow-hidden">
                            <table className="w-full text-[11px]">
                                <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-left">
                                    <tr>
                                        <th className="px-4 py-2">Item</th>
                                        <th className="text-center px-4 py-2">Qty</th>
                                        <th className="text-center px-4 py-2">Condition</th>
                                        <th className="text-right px-4 py-2">Price</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-bold text-gray-900 dark:text-white">
                                    {ret.items.map((item, i) => (
                                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-2.5">{item.product_name}</td>
                                            <td className="px-4 py-2.5 text-center">{item.quantity}</td>
                                            <td className="px-4 py-2.5 text-center">
                                                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-sm italic lowercase">
                                                    {item.condition || 'new'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right">{formatCurrency(parseFloat(String(item.unit_price || 0)))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {ret.notes && (
                        <div>
                            <p className={LABEL}>Additional Notes</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-slate-800/30 p-3 border border-gray-100 dark:border-slate-800 rounded-sm whitespace-pre-wrap">
                                {ret.notes}
                            </p>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800 border-t border-[#ddd] dark:border-slate-700 flex items-center justify-between">
                    <button onClick={onClose} className={SECONDARY_BTN}>
                        Close Detail
                    </button>
                    <div className="flex items-center gap-2">
                        {isPending && (
                            <>
                                <button onClick={onReject} className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded transition-colors uppercase tracking-widest leading-none pt-1">
                                    Reject Request
                                </button>
                                <button onClick={onApprove} className={PRIMARY_BTN}>
                                    <BadgeCheck className="h-4 w-4" /> Approve Return
                                </button>
                            </>
                        )}
                        {isApproved && (
                            <button onClick={onRefund} className="bg-[#57a024] hover:bg-[#4a8a1e] text-white font-bold rounded-[3px] shadow-sm text-sm py-2 px-6 transition-all flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" /> Finalize Refund
                            </button>
                        )}
                    </div>
                </div>
            </SectionCard>
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

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-6">
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-sm transition-colors group">
                    <ChevronDown className="h-5 w-5 text-gray-500 rotate-90 group-hover:text-[#e77600]" />
                </button>
                <div>
                    <h2 className="text-xl font-bold dark:text-white">Create Sale Return</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Initialize a new customer return request and refund processing</p>
                </div>
            </div>

            <SectionCard className="max-w-4xl mx-auto shadow-md">
                <SectionHeader title="New Return Configuration" icon={Plus} />

                <div className="p-8 space-y-8 bg-white dark:bg-slate-900">
                    {errors.submit && (
                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold p-3 rounded-sm flex items-center gap-2">
                             <AlertTriangle className="h-4 w-4" /> {errors.submit}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Customer Information */}
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-bold text-[#e47911] uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 pb-1 flex items-center gap-2">
                                <User className="h-3 w-3" /> Customer Information
                            </h4>
                            <div>
                                <label className={LABEL}>Customer Name <span className="text-red-500">*</span></label>
                                <input value={form.customer_name} onChange={e => set('customer_name', e.target.value)} placeholder="Full name of customer" className={INPUT(!!errors.customer_name)} />
                                {errors.customer_name && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.customer_name}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={LABEL}>Phone Contact</label>
                                    <input value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)} placeholder="+92 ..." className={INPUT()} />
                                </div>
                                <div>
                                    <label className={LABEL}>Reference Order #</label>
                                    <input value={form.order_number} onChange={e => set('order_number', e.target.value)} placeholder="ORD-XXXX" className={INPUT()} />
                                </div>
                            </div>
                        </div>

                        {/* Return Configuration */}
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-bold text-[#e47911] uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 pb-1 flex items-center gap-2">
                                <ShoppingBag className="h-3 w-3" /> Return Configuration
                            </h4>
                            <div>
                                <label className={LABEL}>Primary Reason for Return</label>
                                <select value={form.reason} onChange={e => set('reason', e.target.value)} className={INPUT()}>
                                    {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={LABEL}>Refund Preferred Method</label>
                                <select value={form.refund_method} onChange={e => set('refund_method', e.target.value)} className={INPUT()}>
                                    {REFUND_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Returned Products */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-1">
                            <h4 className="text-[11px] font-bold text-[#e47911] uppercase tracking-widest flex items-center gap-2">
                                <Package className="h-3 w-3" /> Returned Products List
                            </h4>
                            <button onClick={addItem} className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline uppercase tracking-widest flex items-center gap-1 transition-all">
                                <Plus className="h-3 w-3" /> Add Product Item
                            </button>
                        </div>

                        <div className="border border-gray-200 dark:border-slate-700 rounded-sm overflow-hidden">
                            <table className="w-full text-xs">
                                <thead className="bg-[#f6f6f6] dark:bg-slate-800 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-tight text-left">
                                    <tr>
                                        <th className="px-4 py-3">Product Description</th>
                                        <th className="w-24 px-4 py-3 text-center">Unit Qty</th>
                                        <th className="w-32 px-4 py-3 text-center">Unit Price</th>
                                        <th className="w-40 px-4 py-3">Physical Condition</th>
                                        <th className="w-12 px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                    {items.map((item, i) => (
                                        <tr key={i} className="bg-white dark:bg-slate-900 group hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="p-3">
                                                <input value={item.product_name} onChange={e => updateItem(i, 'product_name', e.target.value)}
                                                    placeholder="Product name or SKU" className={INPUT() + " !py-1.5 dark:bg-slate-900"} />
                                            </td>
                                            <td className="p-3 text-center">
                                                <input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                                                    className={INPUT() + " !py-1.5 text-center dark:bg-slate-900 inline-block !w-20"} />
                                            </td>
                                            <td className="p-3">
                                                <input type="number" step="0.01" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)}
                                                    placeholder="0.00" className={INPUT() + " !py-1.5 text-right dark:bg-slate-900"} />
                                            </td>
                                            <td className="p-3">
                                                <select value={item.condition} onChange={e => updateItem(i, 'condition', e.target.value)} className={INPUT() + " !py-1.5 !text-[11px] dark:bg-slate-900"}>
                                                    <option value="">Select Condition...</option>
                                                    {ITEM_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-3 text-center">
                                                <button onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-600 transition-colors opacity-60 hover:opacity-100">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        {computedTotal > 0 && (
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-sm flex items-center justify-between">
                                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-widest">Calculated Refund Total:</span>
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(computedTotal)}</span>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className={LABEL}>Administrative Notes</label>
                        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
                            placeholder="Add internal notes or customer feedback for processing this return..."
                            className={INPUT() + " resize-none dark:bg-slate-900"} />
                    </div>
                </div>

                <div className="px-8 py-5 bg-gray-50 dark:bg-slate-800 border-t border-[#ddd] dark:border-slate-700 flex items-center justify-between">
                    <button onClick={onClose} className={SECONDARY_BTN + " !px-8"}>Discard & Return</button>
                    <button onClick={handleSave} disabled={saving} className={PRIMARY_BTN + " !px-10 uppercase tracking-widest border-b-2 border-b-[#a88734]"}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {saving ? 'Processing...' : 'Submit Request'}
                    </button>
                </div>
            </SectionCard>
        </div>
    );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════ */
const STATUS_FILTERS = ['All', 'Pending', 'Approved', 'Rejected', 'Refunded'];

export default function SaleReturnsPage() {
    const { isAuthenticated } = useAdminAuth();
    const [returns, setReturns] = useState<SaleReturn[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<SaleReturn | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const load = () => {
        setLoading(true);
        // Simulate API fetch from local storage
        setTimeout(() => {
            setReturns(saleReturnService.getAll());
            setLoading(false);
        }, 400);
    };

    useEffect(() => { load(); }, []);

    const filtered = returns.filter(r => {
        const q = search.toLowerCase();
        return !search ||
            r.customer_name.toLowerCase().includes(q) ||
            (r.return_number || '').toLowerCase().includes(q) ||
            (r.order_number || '').toLowerCase().includes(q) ||
            r.reason.toLowerCase().includes(q);
    });

    const stats = {
        total: returns.length,
        refundedAmount: returns.filter(r => r.status === 'refunded').reduce((s, r) => s + parseFloat(String(r.total_amount || 0)), 0),
        pending: returns.filter(r => r.status === 'pending').length,
        refunded: returns.filter(r => r.status === 'refunded').length,
    };

    const mutate = (id: string | number, updater: () => SaleReturn) => {
        try {
            const updated = updater();
            setReturns(prev => prev.map(r => String(r.id) === String(id) ? updated : r));
            if (selected && String(selected.id) === String(id)) setSelected(updated);
            return updated;
        } catch { showToast('Operation failed.', 'error'); return null; }
    };

    const handleApprove = (r: SaleReturn) => {
        const u = mutate(r.id, () => saleReturnService.approve(r.id));
        if (u) showToast(`${u.return_number} approved!`);
    };

    const handleReject = (r: SaleReturn) => {
        if (!confirm('Are you sure you want to reject this return request?')) return;
        const u = mutate(r.id, () => saleReturnService.reject(r.id));
        if (u) showToast('Return request rejected.');
    };

    const handleRefund = (r: SaleReturn) => {
        const u = mutate(r.id, () => saleReturnService.refund(r.id));
        if (u) showToast(`Refund processed for ${u.return_number}`);
    };

    const handleDelete = (r: SaleReturn) => {
        if (!confirm(`Delete return records for ${r.return_number}?`)) return;
        saleReturnService.delete(r.id);
        setReturns(prev => prev.filter(x => String(x.id) !== String(r.id)));
        showToast('Record deleted.');
    };

    const handleSaved = (saved: SaleReturn) => {
        setReturns(prev => [saved, ...prev]);
        setFormOpen(false);
        showToast(`Return ${saved.return_number} submitted!`);
    };

    if (!isAuthenticated) return null;

    return (
        <div className="max-w-[1600px] mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in duration-500">
            {formOpen ? (
                <CreateModal
                    onClose={() => setFormOpen(false)}
                    onSaved={handleSaved}
                />
            ) : (
                <>
                    {/* Header Area */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ddd] dark:border-slate-800 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-[#232f3e] p-2 rounded-sm shadow-inner">
                                <RotateCcw className="h-6 w-6 text-[#f0c14b]" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold dark:text-white">Sale Returns Ledger</h1>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-sm">
                                        Management Hub
                                    </span>
                                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> {stats.pending} Pending Actions
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={load} className={SECONDARY_BTN + " !py-1.5"}>
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button onClick={() => setFormOpen(true)} className={PRIMARY_BTN + " !py-2 uppercase tracking-wide border-b-2 border-b-[#a88734]"}>
                                <Plus className="h-4 w-4" /> Create Return Request
                            </button>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Requests', val: stats.total, icon: FileText, sub: 'Lifetime returns' },
                            { label: 'Refunded Total', val: formatCurrency(stats.refundedAmount), icon: DollarSign, sub: 'Processed cash out' },
                            { label: 'Pending Review', val: stats.pending, icon: Clock, sub: 'Needs attention', cls: 'text-amber-600' },
                            { label: 'Success Rate', val: stats.total ? `${Math.round((stats.refunded / stats.total) * 100)}%` : '0%', icon: CheckCircle, sub: 'Resolution rate' },
                        ].map((s, i) => (
                            <SectionCard key={i} className="p-4 flex items-center gap-4">
                                <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-sm border border-gray-100 dark:border-slate-700">
                                    <s.icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{s.label}</p>
                                    <p className={`text-xl font-bold dark:text-white ${s.cls || ''}`}>{s.val}</p>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{s.sub}</p>
                                </div>
                            </SectionCard>
                        ))}
                    </div>

                    {/* Main Content Area */}
                    <SectionCard>
                        <SectionHeader title="Return Requests History" icon={RotateCcw} />

                        {/* Filtering Bar */}
                        <div className="p-3 bg-[#f6f6f6] dark:bg-slate-800/40 border-b border-[#ddd] dark:border-slate-800 flex flex-col md:flex-row items-center gap-4">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#e77600] transition-colors" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Find by Transaction ID, Customer or Order #..."
                                    className={INPUT() + " !pl-10 !py-2"}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <p className={LABEL + " !mb-0 mr-2 whitespace-nowrap"}>Quick Filters:</p>
                                <div className="flex items-center gap-1">
                                    {STATUS_FILTERS.map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setSearch(f === 'All' ? '' : f)}
                                            className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest border border-[#ddd] dark:border-slate-700 rounded-[3px] bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors active:shadow-inner"
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Table Body */}
                        {loading ? (
                            <div className="py-24 flex flex-col items-center justify-center bg-white dark:bg-slate-900">
                                <div className="w-10 h-10 border-4 border-[#eee] dark:border-slate-800 border-t-[#f0c14b] rounded-full animate-spin mb-4" />
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Records...</p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="py-24 text-center bg-white dark:bg-slate-900 border-x-0">
                                <Info className="h-10 w-10 text-gray-200 dark:text-slate-800 mx-auto mb-4" />
                                <p className="text-sm font-bold text-gray-800 dark:text-white">No return requests found</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Try adjusting your filters or search keywords.</p>
                                <button onClick={() => { setSearch(''); load(); }} className="mt-4 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline hover:text-[#e47911] uppercase tracking-widest">
                                    Clear all filters
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto bg-white dark:bg-slate-900">
                                <table className="w-full text-sm">
                                    <thead className="bg-[#fcfcfc] dark:bg-slate-800/80 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-tight text-left border-b border-gray-100 dark:border-slate-800">
                                        <tr className="text-[10px]">
                                            <th className="px-6 py-3">Return ID</th>
                                            <th className="px-4 py-3">Customer Information</th>
                                            <th className="px-4 py-3">Reference Order</th>
                                            <th className="px-4 py-3">Total Amount</th>
                                            <th className="px-4 py-3">Return Date</th>
                                            <th className="px-4 py-3">Request Status</th>
                                            <th className="px-6 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800 transition-all">
                                        {filtered.map((ret) => (
                                            <tr key={ret.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40 group transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                                                        {ret.return_number || `#${String(ret.id).slice(-6).toUpperCase()}`}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                                        {ret.items.length} Product{ret.items.length !== 1 ? 's' : ''}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-sm bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">{ret.customer_name[0]?.toUpperCase()}</span>
                                                        </div>
                                                        <p className="font-bold text-gray-800 dark:text-slate-200 text-sm">{ret.customer_name}</p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 italic">
                                                        {ret.order_number || 'Direct Return'}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <p className="font-bold text-[#e47911] text-sm">
                                                        {formatCurrency(ret.total_amount || 0)}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                                    {formatDate(ret.return_date || ret.created_at)}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <StatusBadge status={ret.status} />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => setSelected(ret)}
                                                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-blue-200 dark:hover:border-blue-900 rounded-sm shadow-sm transition-all"
                                                            title="View Details"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        {ret.status === 'pending' && (
                                                            <button
                                                                onClick={() => handleApprove(ret)}
                                                                className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-900 rounded-sm shadow-sm transition-all"
                                                                title="Approve"
                                                            >
                                                                <CheckCircle className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(ret)}
                                                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-red-200 dark:hover:border-red-900 rounded-sm shadow-sm transition-all"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filtered.length > 50 && (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-8 text-center bg-gray-50/50 dark:bg-slate-900/50">
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest italic animate-pulse">End of Ledger Records</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SectionCard>
                </>
            )}

            {/* Modals Container */}
            <div className="relative z-[100]">
                {selected && (
                    <DetailModal
                        ret={selected}
                        onClose={() => setSelected(null)}
                        onApprove={() => handleApprove(selected)}
                        onReject={() => handleReject(selected)}
                        onRefund={() => handleRefund(selected)}
                    />
                )}
            </div>

            {/* Toast Container */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[200] animate-in slide-in-from-right duration-300">
                    <div className={`flex items-center gap-3 px-6 py-3 rounded shadow-2xl border-l-[6px] ${toast.type === 'success' ? 'bg-[#232f3e] border-[#f0c14b] text-white' : 'bg-red-900 border-red-500 text-white'}`}>
                        {toast.type === 'success' ? <Check className="h-5 w-5 text-[#f0c14b]" /> : <AlertTriangle className="h-5 w-5 text-red-400" />}
                        <p className="text-sm font-bold tracking-tight">{toast.msg}</p>
                        <button onClick={() => setToast(null)} className="ml-4 hover:opacity-70 transition-opacity">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
