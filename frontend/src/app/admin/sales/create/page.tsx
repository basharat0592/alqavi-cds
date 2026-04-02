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
    order_number: '', customer_id: '',
    order_date: new Date().toISOString().slice(0, 10),
    status: 'ordered', payment_status: 'pending', notes: '',
};

type LineItem = { product: string; product_name: string; quantity: number; unit_price: number };

// ── Reusable form field wrappers ──────────────────────────────────────────────
const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
        {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
);

const fieldCls = (err?: boolean) =>
    `w-full px-3 py-2 text-sm bg-white dark:bg-[#1B1C1E] border rounded-lg outline-none focus:border-[#F7CA00] focus:ring-2 focus:ring-[#F7CA00]/10 transition-all placeholder:text-slate-400 text-slate-800 dark:text-slate-200 ${err ? 'border-red-400' : 'border-slate-200 dark:border-white/10'}`;

const selectCls = `w-full px-3 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] focus:ring-2 focus:ring-[#F7CA00]/10 text-slate-800 dark:text-slate-200 cursor-pointer disabled:opacity-50`;

// ── Section panel wrapper ─────────────────────────────────────────────────────
const Panel = ({ title, icon: Icon, action, children }: { title: string; icon?: any; action?: React.ReactNode; children: React.ReactNode }) => (
    <div className="bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5">
            <div className="flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4 text-[#F7CA00]" />}
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
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [items, setItems] = useState<LineItem[]>([{ product: '', product_name: '', quantity: 1, unit_price: 0 }]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'alert' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'alert' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [prodsRes, usersRes] = await Promise.all([
                productService.getAll(),
                userService.getAll()
            ]);

            setProducts(Array.isArray(prodsRes) ? prodsRes : (prodsRes as any)?.results || []);
            
            const rawUsers = Array.isArray(usersRes) ? usersRes : (usersRes as any)?.results || [];
            const customerUsers = rawUsers.filter((u: any) => {
                if (u.is_active === false) return false; // Exclude inactive accounts
                const rName = (u.role_name || (typeof u.role === 'string' ? u.role : '')).toLowerCase();
                if (u.is_superuser || u.is_staff) return false; // Exclude system administrators
                if (['admin', 'supplier', 'manager'].includes(rName)) return false; // Exclude internal/supplier roles
                return true; // Include customers and standard public users
            });
            setUsers(customerUsers);

            const num = `SO-${Date.now().toString().slice(-6)}`;
            setForm(prev => ({ ...prev, order_number: num }));
        } catch {
            showToast('Failed to load data', 'alert');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.customer_id) e.customer_id = 'Required';
        if (!form.order_date) e.order_date = 'Required';
        if (items.some(i => !i.product || i.quantity < 1 || i.unit_price <= 0))
            e.items = 'All items require a product, quantity ≥ 1, and valid unit price';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            await orderService.create({
                customer_id: parseInt(form.customer_id),
                items: items.map(item => ({
                    product_id: parseInt(item.product),
                    quantity: item.quantity,
                    price: item.unit_price
                })),
                status: form.status,
                payment_status: form.payment_status
            });
            showToast('Sale order created successfully!');
            setTimeout(() => router.push('/admin/sales'), 1500);
        } catch (e: any) {
             console.error("Sale error:", e);
             showToast(e?.response?.data?.error || 'Failed to create sale order', 'alert');
        } finally {
            setSaving(false);
        }
    };

    const addItem = () => setItems(prev => [...prev, { product: '', product_name: '', quantity: 1, unit_price: 0 }]);
    const removeItem = (i: number) => setItems(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);
    const updateItem = (i: number, field: string, val: any) => {
        setItems(prev => prev.map((item, idx) => {
            if (idx !== i) return item;
            if (field === 'product') {
                const p = products.find(p => String(p.id) === String(val));
                return { ...item, product: val, product_name: p?.name || '', unit_price: p?.price ? parseFloat(String(p.price)) : item.unit_price };
            }
            return { ...item, [field]: val };
        }));
    };

    const lineTotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
    const grandTotal = lineTotal; // Extend here if discounts/tax are needed in frontend

    if (loading) {
        return (
            <div className="flex flex-col h-[60vh] items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 text-[#F7CA00] animate-spin" />
                <p className="text-sm text-slate-500">Loading order data...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">

            {/* ── Page Header ── */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">New Sale Order</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Create a new outbound sales record</p>
                </div>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* ── Left column ── */}
                <div className="lg:col-span-8 space-y-5">

                    {/* Order Details */}
                    <Panel title="Order Details" icon={Clipboard}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <FieldLabel required>Order Number</FieldLabel>
                                <input
                                    value={form.order_number}
                                    readOnly disabled
                                    className={`${fieldCls()} bg-slate-50 dark:bg-white/5 opacity-80 cursor-not-allowed`}
                                />
                            </div>
                            <div>
                                <FieldLabel required>Customer</FieldLabel>
                                <select
                                    value={form.customer_id}
                                    onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
                                    className={`${selectCls} ${errors.customer_id ? 'border-red-400' : ''}`}
                                >
                                    <option value="">Select customer...</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.username} {u.email ? `(${u.email})` : ''}</option>
                                    ))}
                                </select>
                                {errors.customer_id && <p className="text-red-500 text-xs mt-1">{errors.customer_id}</p>}
                            </div>
                            <div>
                                <FieldLabel required>Order Date</FieldLabel>
                                <input
                                    type="date"
                                    value={form.order_date}
                                    onChange={(e) => setForm(f => ({ ...f, order_date: e.target.value }))}
                                    className={fieldCls(!!errors.order_date)}
                                />
                                {errors.order_date && <p className="text-red-500 text-xs mt-1">{errors.order_date}</p>}
                            </div>
                        </div>
                    </Panel>

                    {/* Items Table */}
                    <Panel
                        title="Order Items"
                        icon={Package}
                        action={
                            <button
                                onClick={addItem}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#F7CA00] bg-blue-50 dark:bg-[#F7CA00]/10 rounded-lg hover:bg-blue-100 dark:hover:bg-[#F7CA00]/20 transition-colors"
                            >
                                <Plus className="h-3.5 w-3.5" /> Add Item
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
                            <div className="col-span-6 text-xs font-semibold text-slate-500">Product</div>
                            <div className="col-span-2 text-xs font-semibold text-slate-500">Qty</div>
                            <div className="col-span-3 text-xs font-semibold text-slate-500">Unit Price</div>
                            <div className="col-span-1"></div>
                        </div>

                        <div className="space-y-2">
                            {items.map((item, i) => (
                                <div key={i} className="grid grid-cols-12 gap-3 items-center p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] rounded-lg">
                                    <div className="col-span-6">
                                        <select
                                            value={String(item.product)}
                                            onChange={e => updateItem(i, 'product', e.target.value)}
                                            className={selectCls}
                                        >
                                            <option value="">Select product...</option>
                                            {products.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number" min="1"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                                            className={fieldCls()}
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <input
                                            type="number" min="0" step="0.01"
                                            value={item.unit_price}
                                            onChange={(e) => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                                            className={fieldCls()}
                                        />
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        <button
                                            onClick={() => removeItem(i)}
                                            className="p-1.5 rounded text-slate-300 hover:text-red-500 transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Line total */}
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 flex justify-between items-center text-sm">
                            <span className="text-slate-500">Items subtotal</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(String(lineTotal))}</span>
                        </div>
                    </Panel>
                </div>

                {/* ── Right column ── */}
                <div className="lg:col-span-4 space-y-5">

                    {/* Status */}
                    <Panel title="Order Status" icon={ShieldCheck}>
                        <div className="space-y-4">
                            <div>
                                <FieldLabel>Order Status</FieldLabel>
                                <select
                                    value={form.status}
                                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                                    className={selectCls}
                                >
                                    <option value="draft">Draft</option>
                                    <option value="ordered">Ordered</option>
                                    <option value="processing">Processing</option>
                                    <option value="shipped">Shipped</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div>
                                <FieldLabel>Payment Status</FieldLabel>
                                <select
                                    value={form.payment_status}
                                    onChange={e => setForm(f => ({ ...f, payment_status: e.target.value }))}
                                    className={selectCls}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="partially_paid">Partially Paid</option>
                                    <option value="paid">Paid</option>
                                </select>
                            </div>
                        </div>
                    </Panel>

                    {/* Order Summary */}
                    <Panel title="Order Summary" icon={DollarSign}>
                        <div className="space-y-4">
                            {/* Grand total */}
                            <div className="pt-2">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-slate-500">Subtotal</span>
                                    <span className="text-sm text-slate-700 dark:text-slate-300">{formatCurrency(String(lineTotal))}</span>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-white/10 mt-3">
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Total</span>
                                    <span className="text-xl font-bold text-[#F7CA00]">{formatCurrency(String(grandTotal))}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full py-2.5 bg-[#F7CA00] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm mt-2"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {saving ? 'Creating...' : 'Create Sale Order'}
                            </button>
                        </div>
                    </Panel>
                </div>
            </div>

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
