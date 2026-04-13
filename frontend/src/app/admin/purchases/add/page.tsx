'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ShoppingCart, Plus, Trash2, X, CheckCircle, AlertTriangle,
    Package, Loader2, ArrowLeft, Save, DollarSign, Clipboard, ShieldCheck,
    Hash
} from 'lucide-react';
import { purchaseService } from '@/services/purchase.service';
import { productService } from '@/services/product.service';
import { companyService } from '@/services/company.service';
import { userService } from '@/services/user.service';
import { formatCurrency } from '@/lib/utils';

const EMPTY_FORM = {
    purchase_number: '', supplier: '', supplier_name: '', supplier_phone: '',
    order_date: new Date().toISOString().slice(0, 10),
    expected_delivery_date: '', tax_amount: '0', shipping_cost: '0',
    status: 'ordered', payment_status: 'unpaid', payment_method: 'cash', notes: '',
};

type LineItem = {
    product: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    packaging_type: 'piece' | 'pack' | 'carton';
    pieces_per_unit: number;
};

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

export default function AddPurchasePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const hasPrefilled = useRef(false);

    const [products, setProducts] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [items, setItems] = useState<LineItem[]>([{
        product: '',
        product_name: '',
        quantity: 1,
        unit_price: 0,
        packaging_type: 'piece',
        pieces_per_unit: 1
    }]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'alert' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'alert' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [prodsRes, usersRes, suppRes] = await Promise.allSettled([
                productService.getAll?.({ all_items: 'true', include_pending: 'true', include_supplier_only: 'true' } as any) ?? Promise.resolve([]),
                userService.getAll(),
                (companyService as any).getSuppliers?.() ?? Promise.resolve([])
            ]);

            if (prodsRes.status === 'fulfilled') {
                const prods = prodsRes.value;
                setProducts(Array.isArray(prods) ? prods : (prods as any)?.results || []);
            }

            // Registered Suppliers from Supplier Page (Users with Supplier role)
            const users = usersRes.status === 'fulfilled' ? (Array.isArray(usersRes.value) ? usersRes.value : []) : [];
            const registeredSuppliers = users.filter((u: any) =>
                (u.role_name || '').toLowerCase().includes('supplier')
            ).map((u: any) => ({
                id: u.id,
                name: u.business_name || `${u.first_name || ''} ${u.last_name || ''}`.trim(),
                phone: u.phone_number || u.phone || '',
                city: u.address || ''
            }));

            // Also include official Supplier model records
            const suppliersList = suppRes.status === 'fulfilled' ? (Array.isArray(suppRes.value) ? suppRes.value : []) : [];

            // Merge both for complete registry
            const merged = [...registeredSuppliers, ...suppliersList];
            const unique = Array.from(new Map(merged.map(item => [item.name, item])).values());

            setSuppliers(unique);

            const num = `PO-${Date.now().toString().slice(-6)}`;
            setForm(prev => ({ ...prev, purchase_number: num }));
        } catch {
            showToast('Failed to load data', 'alert');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        if (!loading && searchParams && !hasPrefilled.current) {
            const sn = searchParams.get('supplier_name');
            const pid = searchParams.get('product_id');
            const qty = parseInt(searchParams.get('quantity') || '1');

            if (pid && products.length > 0) {
                const foundProduct = products.find(prod => String(prod.id) === pid);
                if (foundProduct) {
                    hasPrefilled.current = true;
                    setItems([{
                        product: foundProduct.id.toString(),
                        product_name: foundProduct.name,
                        quantity: qty,
                        unit_price: parseFloat(foundProduct.price || 0),
                        packaging_type: foundProduct.unit_type || 'piece',
                        pieces_per_unit: foundProduct.pieces_per_unit || 1
                    }]);
                    const vendor = foundProduct.supplier_name || foundProduct.company_name || sn || '';
                    if (vendor) {
                        const matchedSupplier = suppliers.find(c => c.name.toLowerCase().trim() === vendor.toLowerCase().trim());
                        setForm(f => ({
                            ...f,
                            supplier: matchedSupplier ? matchedSupplier.id : f.supplier,
                            supplier_name: matchedSupplier ? matchedSupplier.name : vendor,
                            supplier_phone: matchedSupplier ? (matchedSupplier.phone || matchedSupplier.whatsapp || '') : f.supplier_phone
                        }));
                    }
                }
            } else if (sn && products.length > 0) {
                hasPrefilled.current = true;
                const matched = suppliers.find(c => c.name.toLowerCase().trim() === sn.toLowerCase().trim());
                const currentSn = matched ? matched.name : sn;
                setForm(f => ({
                    ...f,
                    supplier: matched ? matched.id : f.supplier,
                    supplier_name: currentSn,
                    supplier_phone: matched ? (matched.phone || matched.whatsapp || '') : f.supplier_phone
                }));
                const supplierProds = products.filter(p => p.company_name === currentSn || p.supplier_name === currentSn);
                if (supplierProds.length > 0) {
                    setItems(supplierProds.map(p => ({
                        product: p.id.toString(),
                        product_name: p.name,
                        quantity: 1,
                        unit_price: parseFloat(p.price || 0),
                        packaging_type: p.unit_type || 'piece',
                        pieces_per_unit: p.pieces_per_unit || 1
                    })));
                }
            }
        }
    }, [loading, suppliers, products, searchParams]);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.purchase_number) e.purchase_number = 'Missing purchase number';
        if (!form.supplier) e.supplier = 'Missing supplier field';
        if (!form.order_date) e.order_date = 'Missing order date';
        if (items.some(i => !i.product)) e.items = 'Missing product field in items';
        else if (items.some(i => i.quantity < 1 || i.unit_price <= 0)) e.items = 'Invalid item quantity or price';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const [successOrder, setSuccessOrder] = useState<any | null>(null);

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const res = await purchaseService.create({ ...form, items });
            setSuccessOrder(res);
            showToast('Purchase order created successfully!');
        } catch (e: any) {
            showToast(e?.response?.data?.error || 'Failed to create purchase order', 'alert');
        } finally {
            setSaving(false);
        }
    };

    const addItem = () => setItems(prev => [...prev, {
        product: '',
        product_name: '',
        quantity: 1,
        unit_price: 0,
        packaging_type: 'piece',
        pieces_per_unit: 1
    }]);
    const removeItem = (i: number) => setItems(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);
    const updateItem = (i: number, field: string, val: any) => {
        setItems(prev => prev.map((item, idx) => {
            if (idx !== i) return item;
            if (field === 'product') {
                const p = products.find(p => p.id === val || p.id === Number(val));
                return {
                    ...item,
                    product: val,
                    product_name: p?.name || '',
                    unit_price: p?.price ? parseFloat(p.price) : item.unit_price,
                    packaging_type: p?.unit_type || 'piece',
                    pieces_per_unit: p?.pieces_per_unit || 1
                };
            }
            return { ...item, [field]: val };
        }));
    };

    const lineTotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
    const grandTotal = lineTotal + parseFloat(form.tax_amount || '0') + parseFloat(form.shipping_cost || '0');

    if (loading) {
        return (
            <div className="flex flex-col h-[60vh] items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 text-[#F59E0B] animate-spin" />
                <p className="text-sm text-slate-500">Loading product and supplier data...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">

            {/* ── Page Header ── */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">New Purchase Order</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Create a new inbound procurement record</p>
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
                                <FieldLabel required>PO Number</FieldLabel>
                                <input
                                    value={form.purchase_number}
                                    onChange={(e) => setForm(f => ({ ...f, purchase_number: e.target.value }))}
                                    className={fieldCls(!!errors.purchase_number)}
                                />
                                {errors.purchase_number && <p className="text-red-500 text-xs mt-1">{errors.purchase_number}</p>}
                            </div>
                            <div>
                                <FieldLabel required>Supplier Entity</FieldLabel>
                                <select
                                    value={form.supplier}
                                    onChange={e => {
                                        const val = e.target.value;
                                        const matched = suppliers.find(c => String(c.id) === val);
                                        const currentName = matched ? matched.name : '';

                                        // Filter products specifically for this supplier ID
                                        const supplierProds = products.filter(p =>
                                            p.supplier === Number(val) ||
                                            (currentName && String(p.supplier_name || '').toLowerCase() === currentName.toLowerCase())
                                        );

                                        if (supplierProds.length > 0) {
                                            setItems(supplierProds.slice(0, 1).map(p => ({
                                                product: p.id.toString(),
                                                product_name: p.name,
                                                quantity: 1,
                                                unit_price: parseFloat(p.price || 0),
                                                packaging_type: 'piece',
                                                pieces_per_unit: 1
                                            })));
                                        } else {
                                            setItems([{
                                                product: '',
                                                product_name: '',
                                                quantity: 1,
                                                unit_price: 0,
                                                packaging_type: 'piece',
                                                pieces_per_unit: 1
                                            }]);
                                        }

                                        setForm(f => ({
                                            ...f,
                                            supplier: val,
                                            supplier_name: currentName
                                        }));
                                    }}
                                    className={`${selectCls} ${errors.supplier ? 'border-red-400' : ''}`}
                                >
                                    <option value="">Select a registered supplier...</option>
                                    {suppliers.map(c => (
                                        <option key={`${c.id}-${c.name}`} value={String(c.id)}>{c.name}{c.city ? ` — ${c.city}` : ''}</option>
                                    ))}
                                </select>
                                {errors.supplier && <p className="text-red-500 text-xs mt-1">{errors.supplier}</p>}
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

                    {/* Order Items */}
                    <Panel
                        title="Order Items"
                        icon={Package}
                        action={
                            <button
                                onClick={addItem}
                                className="flex items-center gap-2 px-4 py-2 text-[12px] font-bold text-white bg-[#F59E0B] rounded-xl hover:bg-amber-600 transition-all shadow-sm"
                            >
                                <Plus className="h-4 w-4" strokeWidth={2.5} /> Add Item
                            </button>
                        }
                    >
                        {errors.items && (
                            <div className="mb-6 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-center gap-3">
                                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                                <p className="text-red-600 text-xs font-medium">{errors.items}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            {items.map((item, i) => (
                                <div key={i} className="relative group bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl p-5 hover:border-[#F59E0B]/40 transition-all">

                                    <div className="flex flex-col md:flex-row items-end justify-between gap-4">
                                        <div className="flex-1 w-full">
                                            <FieldLabel required>Product</FieldLabel>
                                            <select
                                                value={String(item.product)}
                                                onChange={e => updateItem(i, 'product', e.target.value)}
                                                className={selectCls + " font-medium text-slate-800 dark:text-white"}
                                            >
                                                <option value="">Select a product...</option>
                                                {products
                                                    .filter(p => {
                                                        if (!form.supplier) return true;
                                                        const pSupplierId = p.supplier && typeof p.supplier === 'object' ? p.supplier.id : p.supplier;
                                                        return String(pSupplierId) === String(form.supplier) ||
                                                            String(p.supplier_name || '').toLowerCase() === String(form.supplier_name).toLowerCase();
                                                    })
                                                    .map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)
                                                }
                                            </select>
                                        </div>

                                        <div className="w-full md:w-32">
                                            <FieldLabel required>Quantity</FieldLabel>
                                            <div className="relative">
                                                <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input
                                                    type="number" min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                                                    className={fieldCls() + " pl-9 font-bold text-slate-900 dark:text-white"}
                                                />
                                            </div>
                                        </div>

                                        <div className="w-full md:w-40">
                                            <FieldLabel required>Price (Each)</FieldLabel>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input
                                                    type="number" min="0" step="0.01"
                                                    value={item.unit_price}
                                                    onChange={(e) => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                                                    className={fieldCls() + " pl-9 text-right font-bold text-slate-900 dark:text-white"}
                                                />
                                            </div>
                                        </div>

                                        <div className="w-full md:w-auto mt-4 md:mt-0 pb-1">
                                            <button
                                                onClick={() => removeItem(i)}
                                                className="flex items-center justify-center p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-3 flex items-center justify-end border-t border-slate-50 dark:border-white/5">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-4">Subtotal</p>
                                        <p className="text-lg font-bold text-[#F59E0B]">{formatCurrency((item.quantity || 0) * (item.unit_price || 0))}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Panel>
                </div>

                {/* ── Right column ── */}
                <div className="lg:col-span-4 space-y-5">
                    <Panel title="Order Status & Summary" icon={ShieldCheck}>
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
                                    <option value="received">Received</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            
                            <div>
                                <FieldLabel>Payment Method</FieldLabel>
                                <select
                                    value={form.payment_method}
                                    onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                                    className={selectCls}
                                >
                                    <option value="cash">Cash</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="online_payment">Online Payment</option>
                                </select>
                            </div>

                            {/* Grand total */}
                            <div className="pt-4 border-t border-slate-100 dark:border-white/10 mt-6">
                                <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-white/10">
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Total Amount</span>
                                    <span className="text-2xl font-bold text-[#F59E0B]">{formatCurrency(lineTotal)}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full py-4 bg-[#F59E0B] text-white text-sm font-bold uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-xl mt-6"
                            >
                                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5 stroke-[2.5]" />}
                                {saving ? 'Creating...' : 'Create Order'}
                            </button>
                        </div>
                    </Panel>
                </div>
            </div>

            {/* ── Al-Qavi premium Success Modal ── */}
            {successOrder && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1a252f] rounded-[20px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col border border-slate-200 dark:border-white/10">
                        <div className="p-8 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100 dark:border-emerald-500/20">
                                <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">Order Confirmed</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium">Order #{successOrder.purchase_number} has been recorded successfully.</p>

                            <div className="w-full space-y-3">
                                <button
                                    onClick={() => router.push('/admin/purchases')}
                                    className="w-full py-3.5 bg-[#F59E0B] hover:bg-slate-900 dark:hover:bg-white text-white dark:hover:text-slate-900 rounded-xl text-xs font-bold shadow-lg shadow-[#F59E0B]/20 transition-all uppercase tracking-widest"
                                >
                                    View Orders
                                </button>
                                <button
                                    onClick={() => setSuccessOrder(null)}
                                    className="w-full py-3.5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all uppercase tracking-widest"
                                >
                                    New Order
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast ── */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[300] animate-in slide-in-from-bottom-4 duration-300">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
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
