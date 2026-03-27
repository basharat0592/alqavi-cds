'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    ShoppingCart, Plus, Search, RefreshCw, Trash2, Eye, Edit2,
    X, CheckCircle, AlertTriangle, Package, ChevronDown, Loader2, ArrowLeft, Save
} from 'lucide-react';
import { purchaseService } from '@/services/purchase.service';
import { productService } from '@/services/product.service';
import { companyService } from '@/services/company.service';
import { formatDate } from '@/lib/utils';

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

const SectionHeader = ({ title, icon: Icon, action }: { title: string; icon?: any; action?: React.ReactNode }) => (
    <div className="bg-[#f6f6f6] dark:bg-slate-800 px-4 py-2 border-b border-[#ddd] dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
            <span className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">{title}</span>
        </div>
        {action}
    </div>
);

const EMPTY_FORM = {
    purchase_number: '', supplier_name: '', supplier_phone: '',
    order_date: new Date().toISOString().slice(0, 10),
    expected_delivery_date: '', tax_amount: '0', shipping_cost: '0',
    status: 'received', payment_status: 'pending', notes: '',
};

type LineItem = { product: string; product_name: string; quantity: number; unit_price: number };

export default function AddPurchasePage() {
    const router = useRouter();
    const [products, setProducts] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [items, setItems] = useState<LineItem[]>([{ product: '', product_name: '', quantity: 1, unit_price: 0 }]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [prodsRes, compsRes, suppRes] = await Promise.allSettled([
                productService.getAll?.({ all_items: 'true' } as any) ?? Promise.resolve([]),
                companyService.getAll(),
                (companyService as any).getSuppliers?.() ?? Promise.resolve([])
            ]);

            if (prodsRes.status === 'fulfilled') {
                const prods = prodsRes.value;
                setProducts(Array.isArray(prods) ? prods : (prods as any)?.results || []);
            }

            const cList = compsRes.status === 'fulfilled' ? (Array.isArray(compsRes.value) ? compsRes.value : []) : [];
            const sList = suppRes.status === 'fulfilled' ? (Array.isArray(suppRes.value) ? suppRes.value : []) : [];
            const merged = [...cList, ...sList];
            const unique = Array.from(new Map(merged.map(item => [item.name, item])).values());
            setCompanies(unique);

            // Generate initial PO number
            const num = `PO-${Date.now().toString().slice(-6)}`;
            setForm(prev => ({ ...prev, purchase_number: num }));

        } catch (e) {
            showToast('Failed to load companies or products', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    useEffect(() => {
        if (!loading && searchParams) {
            const sn = searchParams.get('supplier_name');
            if (sn) {
                const matched = companies.find(c => c.name === sn);

                // Pre-populate items with supplier's products
                const supplierProds = products.filter(p =>
                    p.company_name === sn ||
                    (typeof p.supplier === 'object' && p.supplier?.name === sn) ||
                    (p.supplier_name === sn)
                );

                setForm(f => ({
                    ...f,
                    supplier_name: sn,
                    supplier_phone: matched ? (matched.phone || matched.whatsapp || '') : f.supplier_phone,
                }));

                if (supplierProds.length > 0) {
                    setItems(supplierProds.map(p => ({
                        product: p.id.toString(),
                        product_name: p.name,
                        quantity: 1,
                        unit_price: parseFloat(p.price || 0)
                    })));
                }
            }
        }
    }, [loading, companies, products, searchParams]);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.purchase_number) e.purchase_number = 'Required';
        if (!form.supplier_name) e.supplier_name = 'Required';
        if (!form.order_date) e.order_date = 'Required';
        if (items.some(i => !i.product || i.quantity < 1 || i.unit_price <= 0))
            e.items = 'Each item needs a product, quantity (min 1), and price.';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            await purchaseService.create({ ...form, items });
            showToast('Purchase order created successfully!');
            setTimeout(() => router.push('/admin/purchases'), 1500);
        } catch (e: any) {
            showToast(e?.response?.data?.error || 'Save failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    const addItem = () => setItems(prev => [...prev, { product: '', product_name: '', quantity: 1, unit_price: 0 }]);
    const removeItem = (i: number) => setItems(prev => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

    const updateItem = (i: number, field: string, val: any) => {
        setItems(prev => prev.map((item, idx) => {
            if (idx !== i) return item;
            if (field === 'product') {
                const p = products.find(p => p.id === val || p.id === Number(val));
                return {
                    ...item,
                    product: val,
                    product_name: p?.name || '',
                    unit_price: p?.price ? parseFloat(p.price) : item.unit_price
                };
            }
            return { ...item, [field]: val };
        }));
    };

    const lineTotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
    const grandTotal = lineTotal + parseFloat(form.tax_amount || '0') + parseFloat(form.shipping_cost || '0');

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#E68A00]" />
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto py-8 px-4 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-normal text-gray-900 dark:text-white flex items-center gap-3">
                        <ShoppingCart className="h-7 w-7 text-[#E68A00]" /> Create New Purchase Order
                    </h1>
                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-black">Fill in supplier and product details below</p>
                </div>
                <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-[#C45500] hover:underline flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Go Back
                </button>
            </div>

            <div className="space-y-6">
                <Card>
                    <SectionHeader title="Purchase Meta" icon={Package} />
                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">PO Number *</label>
                            <input
                                value={form.purchase_number}
                                onChange={e => setForm(f => ({ ...f, purchase_number: e.target.value }))}
                                className={INPUT(!!errors.purchase_number)}
                            />
                            {errors.purchase_number && <p className="text-red-500 text-[10px] mt-1">{errors.purchase_number}</p>}
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Supplier Name *</label>
                            <select
                                value={form.supplier_name}
                                onChange={e => {
                                    const val = e.target.value;
                                    const matched = companies.find(c => c.name === val);

                                    // Also pre-populate items when manually selecting from dropdown
                                    const supplierProds = products.filter(p => p.supplier_name === val);
                                    if (supplierProds.length > 0) {
                                        setItems(supplierProds.map(p => ({
                                            product: p.id.toString(),
                                            product_name: p.name,
                                            quantity: 1,
                                            unit_price: parseFloat(p.price || 0)
                                        })));
                                    } else {
                                        setItems([{ product: '', product_name: '', quantity: 1, unit_price: 0 }]);
                                    }

                                    setForm(f => ({
                                        ...f,
                                        supplier_name: val,
                                        supplier_phone: matched ? (matched.phone || matched.whatsapp || '') : f.supplier_phone,
                                    }));
                                }}
                                className={SELECT()}
                            >
                                <option value="">— Select a Company or Supplier —</option>
                                {companies.map(c => (
                                    <option key={`${c.id}-${c.name}`} value={c.name}>{c.name}{c.city ? ` · ${c.city}` : ''}</option>
                                ))}
                            </select>
                            {errors.supplier_name && <p className="text-red-500 text-[10px] mt-1">Please select a supplier</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Contact Number</label>
                            <input value={form.supplier_phone} onChange={e => setForm(f => ({ ...f, supplier_phone: e.target.value }))} className={INPUT()} placeholder="+92..." />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Order Date *</label>
                            <input type="date" value={form.order_date} onChange={e => setForm(f => ({ ...f, order_date: e.target.value }))} className={INPUT(!!errors.order_date)} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Expected Delivery</label>
                            <input type="date" value={form.expected_delivery_date} onChange={e => setForm(f => ({ ...f, expected_delivery_date: e.target.value }))} className={INPUT()} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Status</label>
                            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={SELECT()}>
                                <option value="draft">Draft</option>
                                <option value="ordered">Ordered</option>
                                <option value="received">Received</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Payment Status</label>
                            <select value={form.payment_status} onChange={e => setForm(f => ({ ...f, payment_status: e.target.value }))} className={SELECT()}>
                                <option value="pending">Pending</option>
                                <option value="partially_paid">Partially Paid</option>
                                <option value="paid">Paid</option>
                            </select>
                        </div>
                    </div>
                </Card>

                <Card>
                    <SectionHeader title="Purchase Items" icon={Package} action={
                        <button onClick={addItem} className="text-[10px] font-black text-[#E68A00] uppercase hover:underline flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Add Row
                        </button>
                    } />
                    <div className="p-6">
                        {errors.items && <p className="text-red-500 text-[10px] mb-4 font-bold">{errors.items}</p>}
                        <div className="space-y-4">
                            {items.map((item, i) => (
                                <div key={i} className="grid grid-cols-12 gap-3 items-end border-b border-gray-50 dark:border-slate-800 pb-4 last:border-0 last:pb-0">
                                    <div className="col-span-12 md:col-span-5">
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Product</label>
                                        <select value={item.product} onChange={e => updateItem(i, 'product', e.target.value)} className={SELECT()}>
                                            <option value="">Select Item</option>
                                            {products
                                                .filter(p => !form.supplier_name || p.supplier_name === form.supplier_name)
                                                .map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                                            }
                                        </select>
                                    </div>
                                    <div className="col-span-5 md:col-span-3">
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Quantity</label>
                                        <input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 0)} className={INPUT()} />
                                    </div>
                                    <div className="col-span-5 md:col-span-3">
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Unit Price</label>
                                        <input type="number" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} className={INPUT()} />
                                    </div>
                                    <div className="col-span-2 md:col-span-1 flex justify-center pb-2">
                                        <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <SectionHeader title="Additional Notes" />
                        <div className="p-6">
                            <textarea
                                value={form.notes}
                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                rows={4}
                                className={INPUT() + ' resize-none'}
                                placeholder="Any internal notes or supplier instructions..."
                            />
                        </div>
                    </Card>
                    <Card className="bg-[#fcfcfc] dark:bg-slate-900 border-2 border-[#E68A00]/20">
                        <SectionHeader title="Invoice Summary" />
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>Subtotal:</span>
                                <span>PKR {lineTotal.toLocaleString()}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Shipping</label>
                                    <input type="number" value={form.shipping_cost} onChange={e => setForm(f => ({ ...f, shipping_cost: e.target.value }))} className={INPUT()} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Tax</label>
                                    <input type="number" value={form.tax_amount} onChange={e => setForm(f => ({ ...f, tax_amount: e.target.value }))} className={INPUT()} />
                                </div>
                            </div>
                            <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                                <span className="text-sm font-black uppercase tracking-widest text-[#131921] dark:text-white">Amount Due:</span>
                                <span className="text-2xl font-black text-[#E68A00]">PKR {grandTotal.toLocaleString()}</span>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <button
                        onClick={() => router.push('/admin/purchases')}
                        className="px-8 py-2 bg-white dark:bg-slate-800 border border-[#adb1b8] rounded text-sm font-medium hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-10 py-2 bg-[#f0c14b] border border-[#a88734] rounded text-sm font-bold flex items-center gap-2 hover:bg-[#ebae1e] shadow-sm shadow-orange-100 dark:shadow-none"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin text-gray-800" /> : <Save className="w-4 h-4 text-gray-800" />}
                        {saving ? 'Creating Order...' : 'Create Purchase Order'}
                    </button>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 px-6 py-4 rounded shadow-2xl flex items-center gap-3 min-w-[300px] border-l-4 z-[100] animate-in slide-in-from-bottom-5
                    ${toast.type === 'success' ? 'bg-[#131921] text-white border-green-500' : 'bg-red-900 text-white border-red-500'}`}>
                    {toast.type === 'success' ? <CheckCircle className="h-5 w-5 text-green-400" /> : <AlertTriangle className="h-5 w-5 text-yellow-400" />}
                    <span className="text-sm font-bold uppercase tracking-tight">{toast.msg}</span>
                </div>
            )}
        </div>
    );
}
