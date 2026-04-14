'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    ShoppingBag, Plus, Trash2, X, CheckCircle, AlertTriangle,
    Package, Loader2, ArrowLeft, Save, DollarSign, Clipboard, ShieldCheck, User as UserIcon
} from 'lucide-react';
import { productService, userService, orderService, Product } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

const EMPTY_FORM = {
    order_number: '', 
    customer_name: '',
    phone_number: '',
    order_date: new Date().toISOString().slice(0, 10),
    status: 'delivered', // Standard for walk-in shop sales
    payment_method: 'SHOP',
    payment_status: 'paid', // Standard for walk-in shop sales
    notes: '',
};

type LineItem = { product: string; product_name: string; quantity: number; unit_price: number; cost_price: number; margin_percent: number; };

// ── Reusable form field wrappers ──────────────────────────────────────────────
const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
        {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
);

const fieldCls = (err?: boolean) =>
    `w-full px-3 py-2 text-sm bg-white dark:bg-[#1a252f] border rounded-lg outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10 transition-all placeholder:text-slate-400 text-slate-800 dark:text-slate-200 ${err ? 'border-red-400' : 'border-slate-200 dark:border-white/10'}`;

const selectCls = `w-full px-3 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10 text-slate-800 dark:text-slate-200 cursor-pointer disabled:opacity-50`;

// ── Section panel wrapper ─────────────────────────────────────────────────────
const Panel = ({ title, icon: Icon, action, children }: { title: string; icon?: any; action?: React.ReactNode; children: React.ReactNode }) => (
    <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5">
            <div className="flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4 text-[#F59E0B]" />}
                <span className="text-sm font-semibold text-slate-800 dark:text-white">{title}</span>
            </div>
            {action}
        </div>
        <div className="p-5">{children}</div>
    </div>
);

export default function CreateSalePage() {
    const router = useRouter();

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [items, setItems] = useState<LineItem[]>([{ product: '', product_name: '', quantity: 1, unit_price: 0, cost_price: 0, margin_percent: 0 }]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'alert' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'alert' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const prodsRes = await productService.getAll();
            setProducts(Array.isArray(prodsRes) ? prodsRes : (prodsRes as any)?.results || []);

            const num = `POS-${Date.now().toString().slice(-6)}`;
            setForm(prev => ({ ...prev, order_number: num }));
        } catch {
            showToast('Failed to load products', 'alert');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.customer_name) e.customer_name = 'Required';
        if (!form.phone_number) e.phone_number = 'Required';
        if (!form.order_date) e.order_date = 'Required';
        const invalidItems = items.filter(i => !i.product || i.quantity < 1 || i.unit_price <= 0);
        if (invalidItems.length > 0) {
            e.items = 'All items require a product, quantity ≥ 1, and valid unit price';
        } else if (items.some(i => i.cost_price > 0 && i.unit_price < i.cost_price)) {
            e.items = 'Selling price cannot be less than the supplier (stock) price.';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            await orderService.create({
                customer_name: form.customer_name,
                phone_number: form.phone_number,
                items: items.map(item => ({
                    id: item.product, 
                    quantity: item.quantity,
                    price: item.unit_price
                })),
                status: form.status.toUpperCase(),
                payment_method: form.payment_method.toUpperCase(),
                notes: form.notes
            });
            showToast('Shop sale created successfully!');
            setTimeout(() => router.push('/admin/dashboard'), 1500);
        } catch (e: any) {
            console.error("Sale error:", e);
            showToast(e?.response?.data?.error || 'Failed to create sale', 'alert');
        } finally {
            setSaving(false);
        }
    };

    const addItem = () => setItems(prev => [...prev, { product: '', product_name: '', quantity: 1, unit_price: 0, cost_price: 0, margin_percent: 0 }]);
    const removeItem = (i: number) => setItems(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);
    const updateItem = (i: number, field: string, val: any) => {
        setItems(prev => prev.map((item, idx) => {
            if (idx !== i) return item;
            if (field === 'product') {
                const p = products.find(p => String(p.id) === String(val));
                const cp = p?.cost_price ? parseFloat(String(p.cost_price)) : 0;
                const sp = p?.selling_price ? parseFloat(String(p.selling_price)) : 0;
                return { 
                    ...item, 
                    product: val, 
                    product_name: p?.product_name || p?.name || '', 
                    cost_price: cp,
                    unit_price: sp || item.unit_price,
                    margin_percent: cp > 0 ? parseFloat((((sp - cp) / cp) * 100).toFixed(2)) : 0
                };
            }
            if (field === 'unit_price') {
                const newPrice = parseFloat(val) || 0;
                return {
                    ...item,
                    unit_price: newPrice,
                    margin_percent: item.cost_price > 0 ? parseFloat((((newPrice - item.cost_price) / item.cost_price) * 100).toFixed(2)) : 0
                };
            }
            if (field === 'margin_percent') {
                const newMargin = parseFloat(val) || 0;
                const newPrice = item.cost_price + (item.cost_price * newMargin / 100);
                return {
                    ...item,
                    margin_percent: newMargin,
                    unit_price: parseFloat(newPrice.toFixed(2))
                };
            }
            return { ...item, [field]: val };
        }));
    };

    const lineTotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
    const grandTotal = lineTotal;

    if (loading) {
        return (
            <div className="flex flex-col h-[60vh] items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 text-[#F59E0B] animate-spin" />
                <p className="text-sm text-slate-500">Loading products...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">

            {/* ── Page Header ── */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Point of Sale (Shop)</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Quickly record a physical shop sale</p>
                </div>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* ── Left column ── */}
                <div className="lg:col-span-8 space-y-5">

                    {/* Customer Info */}
                    <Panel title="Customer Information" icon={UserIcon}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <FieldLabel required>Customer Name</FieldLabel>
                                <input
                                    placeholder="Enter name..."
                                    value={form.customer_name}
                                    onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                                    className={fieldCls(!!errors.customer_name)}
                                />
                                {errors.customer_name && <p className="text-red-500 text-xs mt-1">{errors.customer_name}</p>}
                            </div>
                            <div>
                                <FieldLabel required>Phone Number</FieldLabel>
                                <input
                                    placeholder="Enter mobile..."
                                    value={form.phone_number}
                                    onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
                                    className={fieldCls(!!errors.phone_number)}
                                />
                                {errors.phone_number && <p className="text-red-500 text-xs mt-1">{errors.phone_number}</p>}
                            </div>
                        </div>
                    </Panel>

                    {/* Items Table */}
                    <Panel
                        title="Sale Items"
                        icon={Package}
                        action={
                            <button
                                onClick={addItem}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#F59E0B] bg-[#F59E0B]/5 rounded-lg hover:bg-[#F59E0B]/10 transition-colors"
                            >
                                <Plus className="h-3.5 w-3.5" /> Add Product
                            </button>
                        }
                    >
                        {errors.items && (
                            <div className="mb-4 px-3 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
                                <p className="text-red-600 text-xs">{errors.items}</p>
                            </div>
                        )}

                        {/* Column headers */}
                        <div className="grid grid-cols-12 gap-3 mb-2 px-1">
                            <div className="col-span-5 text-xs font-semibold text-slate-500">Product</div>
                            <div className="col-span-2 text-xs font-semibold text-slate-500 text-center">Qty</div>
                            <div className="col-span-4 text-xs font-semibold text-slate-500">Price & Margin</div>
                            <div className="col-span-1"></div>
                        </div>

                        <div className="space-y-2">
                            {items.map((item, i) => (
                                <div key={i} className="grid grid-cols-12 gap-3 items-start p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] rounded-lg">
                                    <div className="col-span-5">
                                        <select
                                            value={String(item.product)}
                                            onChange={e => updateItem(i, 'product', e.target.value)}
                                            className={selectCls}
                                        >
                                            <option value="">Select product...</option>
                                            {products.map(p => (
                                                <option key={p.id} value={String(p.id)} disabled={p.status !== 'ACTIVE' || p.total_quantity < 1}>
                                                    {p.product_name} {p.total_quantity < 1 ? '(Out of Stock)' : `(${p.total_quantity} left)`}
                                                </option>
                                            ))}
                                        </select>
                                        {item.product && (
                                            <div className="mt-1.5 flex items-center gap-2 px-1">
                                                <span className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-wider">Stock Price: </span>
                                                <span className="text-[10px] text-slate-500">{formatCurrency(String(item.cost_price))}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number" min="1"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                                            className={`${fieldCls()} text-center`}
                                        />
                                    </div>
                                    <div className="col-span-4">
                                        <div className="flex gap-2">
                                            <div className="relative w-1/3">
                                                <input
                                                    type="number" step="0.1"
                                                    value={item.margin_percent}
                                                    onChange={(e) => updateItem(i, 'margin_percent', e.target.value)}
                                                    className={`${fieldCls(item.cost_price > 0 && item.unit_price < item.cost_price)} text-center pr-5`}
                                                    title="Margin %"
                                                />
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">%</span>
                                            </div>
                                            <div className="relative w-2/3">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">PKR</span>
                                                <input
                                                    type="number" min="0" step="0.01"
                                                    value={item.unit_price}
                                                    onChange={(e) => updateItem(i, 'unit_price', e.target.value)}
                                                    className={`${fieldCls(item.cost_price > 0 && item.unit_price < item.cost_price)} pl-9 font-bold`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-1 flex justify-center pt-2">
                                        <button
                                            onClick={() => removeItem(i)}
                                            className="p-1.5 rounded text-slate-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Panel>
                </div>

                {/* ── Right column ── */}
                <div className="lg:col-span-4 space-y-5">

                    {/* Sale Settings */}
                    <Panel title="Settings" icon={ShieldCheck}>
                        <div className="space-y-4">
                            <div>
                                <FieldLabel>Payment Method</FieldLabel>
                                <select
                                    value={form.payment_method}
                                    onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                                    className={selectCls}
                                >
                                    <option value="SHOP">Shop (Cash)</option>
                                    <option value="COD">C.O.D</option>
                                    <option value="ONLINE">Online Transfer</option>
                                </select>
                            </div>
                            <div>
                                <FieldLabel>Date</FieldLabel>
                                <input
                                    type="date"
                                    value={form.order_date}
                                    onChange={(e) => setForm(f => ({ ...f, order_date: e.target.value }))}
                                    className={fieldCls()}
                                />
                            </div>
                        </div>
                    </Panel>

                    {/* Order Summary */}
                    <Panel title="Sale Summary" icon={DollarSign}>
                        <div className="space-y-4">
                            <div className="pt-2">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-slate-500">Items Total</span>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 pr-1">{formatCurrency(String(lineTotal))}</span>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-white/10 mt-3">
                                    <span className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Total Payable</span>
                                    <span className="text-2xl font-black text-[#F59E0B]">{formatCurrency(String(grandTotal))}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full py-3 bg-[#F59E0B] text-white text-sm font-black uppercase tracking-[0.2em] rounded-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-[#F59E0B]/20 mt-4 active:scale-95"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                {saving ? 'Processing...' : 'Complete Sale'}
                            </button>
                        </div>
                    </Panel>
                </div>
            </div>

            {/* ── Toast ── */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[300] animate-in slide-in-from-bottom-4 duration-300">
                    <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white text-sm font-bold border-l-4 ${toast.type === 'success' ? 'bg-slate-900 border-[#F59E0B]' : 'bg-red-600 border-red-800'}`}>
                        {toast.type === 'success'
                            ? <CheckCircle className="h-5 w-5 text-[#F59E0B]" />
                            : <AlertTriangle className="h-5 w-5 text-white" />}
                        {toast.msg}
                    </div>
                </div>
            )}
        </div>
    );
}

