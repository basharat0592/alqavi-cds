'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    ShoppingBag, Plus, Trash2, X, CheckCircle, AlertTriangle,
    Package, Loader2, ArrowLeft, Save, DollarSign, Clipboard, ShieldCheck, User as UserIcon,
    ChevronDown
} from 'lucide-react';
import { productService, userService, orderService, companyService, Product, inventoryService } from '@/lib/api';
import { formatCurrency, getImageUrl } from '@/lib/utils';
import { PageHeader, Card, Button, Modal } from '@/components/admin/ui';

const EMPTY_FORM = {
    order_number: '', 
    customer_name: '',
    customer_id: '',
    phone_number: '',
    order_date: new Date().toISOString().slice(0, 10),
    status: 'delivered', // Standard for walk-in shop sales
    payment_method: 'SHOP',
    payment_status: 'paid', // Standard for walk-in shop sales
    notes: '',
    warehouse: '',
};

type LineItem = { product: string; product_name: string; quantity: number; unit_price: number };

// ── Reusable form field wrappers ──────────────────────────────────────────────
const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
);

const fieldCls = (err?: boolean) =>
    `w-full px-3 py-2 text-sm bg-white border rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400 text-slate-800 ${err ? 'border-red-400' : 'border-slate-200'}`;

const selectCls = `w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 text-slate-800 cursor-pointer disabled:opacity-50`;

// ── Section panel wrapper ─────────────────────────────────────────────────────
const Panel = ({ title, icon: Icon, action, children }: { title: string; icon?: any; action?: React.ReactNode; children: React.ReactNode }) => (
    <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4 text-indigo-600" />}
                <span className="text-sm font-semibold text-slate-800">{title}</span>
            </div>
            {action}
        </div>
        <div className="p-5">{children}</div>
    </Card>
);

/* ─── Searchable Customer Selector (Custom) ─── */
const CustomerSelector = ({ selectedId, onSelect, customers, selectCls }: any) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const filtered = customers.filter((c: any) =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search)) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
    );

    const selected = customers.find((c: any) => String(c.id) === String(selectedId) || `${c.first_name} ${c.last_name}` === selectedId);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';
    const getAvatarUrl = (path: string | null) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative group">
                <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600" />
                <input
                    className={selectCls + " pl-10 pr-10 cursor-pointer"}
                    placeholder="Search customer account..."
                    value={open ? search : (selected ? `${selected.first_name} ${selected.last_name}` : (selectedId || ''))}
                    onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
                    onClick={() => setOpen(!open)}
                    readOnly={!open}
                />
                <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>

            {open && (
                <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-2xl z-[1001] overflow-hidden">
                    <div className="max-h-[300px] overflow-y-auto">
                        <div
                            onClick={() => { onSelect(null); setOpen(false); }}
                            className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 flex items-center gap-3"
                        >
                            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"><X size={14} /></div>
                            <span className="text-[13px] font-bold text-slate-500 italic">Guest Customer (No Account)</span>
                        </div>
                        {filtered.map((c: any) => (
                            <div
                                key={c.id}
                                onClick={() => { onSelect(c); setOpen(false); }}
                                className="flex items-center gap-3 p-3 hover:bg-indigo-50 cursor-pointer border-b last:border-0 border-slate-100"
                            >
                                <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                                    {c.avatar ? (
                                        <img src={getAvatarUrl(c.avatar) || ''} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-[12px] font-black text-slate-400">{c.first_name?.[0]}{c.last_name?.[0]}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold text-slate-800 truncate">{c.first_name} {c.last_name}</p>
                                    <p className="text-[10px] text-slate-500 font-medium">Ph: {c.phone || 'N/A'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─── Searchable Product Selector (Custom) ─── */
const ProductSelector = ({ selectedId, onSelect, products, selectCls }: any) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const filtered = products.filter((p: any) =>
        (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
    );

    const selected = products.find((p: any) => String(p.id) === String(selectedId));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative group">
                <Package size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600" />
                <input
                    className={selectCls + " pl-10 pr-10 cursor-pointer"}
                    placeholder="Search product..."
                    value={open ? search : (selected ? selected.name : '')}
                    onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
                    onClick={() => setOpen(!open)}
                    readOnly={!open}
                />
                <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>

            {open && (
                <div className="absolute top-[calc(100%+4px)] left-0 w-[400px] bg-white border border-slate-200 rounded-xl shadow-2xl z-[1001] overflow-hidden">
                    <div className="max-h-[300px] overflow-y-auto">
                        {filtered.length === 0 && (
                            <div className="p-10 text-center">
                                <p className="text-sm text-slate-400 italic">No products found</p>
                            </div>
                        )}
                        {filtered.map((p: any) => (
                            <div
                                key={p.id}
                                onClick={() => { onSelect(p.id); setOpen(false); }}
                                className={`flex items-center gap-3 p-3 hover:bg-indigo-50 cursor-pointer border-b last:border-0 border-slate-100 ${!p.is_in_stock ? 'opacity-50 grayscale' : ''}`}
                            >
                                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                                    {(p.image || p.catalog_image) ? (
                                        <img src={getImageUrl(p.image || p.catalog_image)} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Package size={20} className="text-slate-300" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[13px] font-bold text-slate-800 truncate">
                                            {p.name}
                                            {(p.weight || p.size) && (
                                                <span className="ml-1.5 text-[10px] text-slate-500 font-normal">
                                                    ({p.weight || 'N/A'} - {p.size || 'N/A'})
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-[13px] font-black text-indigo-600">{formatCurrency(p.selling_price)}</p>
                                    </div>
                                    <p className="text-[10px] font-medium text-slate-500">
                                        Stock: <span className={p.stock > 0 ? 'text-emerald-600' : 'text-red-600'}>{p.stock} units</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function CreateSalePage() {
    const router = useRouter();

    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [items, setItems] = useState<LineItem[]>([{ product: '', product_name: '', quantity: 1, unit_price: 0 }]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [warehouseStock, setWarehouseStock] = useState<any[]>([]);
    const [stockError, setStockError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'alert' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'alert' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [prodsRes, custsRes, whRes] = await Promise.all([
                productService.getAll(),
                companyService.getCustomers(),
                inventoryService.getWarehouses()
            ]);
            
            setProducts(Array.isArray(prodsRes) ? prodsRes : (prodsRes as any)?.results || []);
            setCustomers(Array.isArray(custsRes) ? custsRes : (custsRes as any)?.results || []);
            setWarehouses(Array.isArray(whRes) ? whRes : (whRes as any)?.results || []);

            const num = `POS-${Date.now().toString().slice(-6)}`;
            setForm(prev => ({ ...prev, order_number: num }));
        } catch {
            showToast('Failed to load data', 'alert');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        if (form.warehouse) {
            inventoryService.getInventory({ warehouse: form.warehouse }).then(data => {
                setWarehouseStock(data);
            }).catch(() => setWarehouseStock([]));
        } else {
            setWarehouseStock([]);
        }
    }, [form.warehouse]);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.customer_name) e.customer_name = 'Required';
        if (!form.phone_number) e.phone_number = 'Required';
        if (!form.order_date) e.order_date = 'Required';
        if (!form.warehouse) e.warehouse = 'Required';
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
                customer: form.customer_id || null,
                customer_name: form.customer_name,
                phone_number: form.phone_number,
                items: items.map(item => ({
                    id: item.product, 
                    quantity: item.quantity,
                    price: item.unit_price
                })),
                status: form.status.toUpperCase(),
                payment_method: form.payment_method.toUpperCase(),
                warehouse_id: form.warehouse,
                notes: form.notes
            });
            showToast('Shop sale created successfully!');
            setTimeout(() => router.push('/admin/dashboard'), 1500);
        } catch (e: any) {
            console.error("Sale error:", e);
            const data = e?.response?.data;
            let msg = 'Failed to create sale';
            if (typeof data === 'string') msg = data;
            else if (Array.isArray(data)) msg = data[0];
            else if (typeof data === 'object' && data !== null) {
                const val = data.detail || data.error || data.message || Object.values(data)[0];
                msg = Array.isArray(val) ? val[0] : (typeof val === 'string' ? val : JSON.stringify(val));
            }

            if (msg.toLowerCase().includes('stock') || msg.toLowerCase().includes('registered')) {
                setStockError(msg);
            } else {
                showToast(msg, 'alert');
            }
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
                return { ...item, product: val, product_name: p?.name || '', unit_price: p?.selling_price ? parseFloat(String(p.selling_price)) : item.unit_price };
            }
            return { ...item, [field]: val };
        }));
    };

    const lineTotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
    const grandTotal = lineTotal;

    if (loading) {
        return (
            <div className="flex flex-col h-[60vh] items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                <p className="text-sm text-slate-500">Loading products...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">

            {/* ── Page Header ── */}
            <PageHeader
                title="Create Sale"
                subtitle="Quickly record a physical shop sale"
                breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Create Sale' }]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* ── Left column ── */}
                <div className="lg:col-span-8 space-y-5">

                    {/* Customer Info */}
                    <Panel title="Customer Information" icon={UserIcon}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <FieldLabel required>Customer Account</FieldLabel>
                                <CustomerSelector 
                                    selectedId={form.customer_name}
                                    customers={customers}
                                    selectCls={selectCls}
                                    onSelect={(c: any) => {
                                        if (c) {
                                            setForm(f => ({ 
                                                ...f, 
                                                customer_id: c.id,
                                                customer_name: `${c.first_name} ${c.last_name}`,
                                                phone_number: c.phone || f.phone_number
                                            }));
                                        } else {
                                            setForm(f => ({ ...f, customer_id: '', customer_name: 'Guest Customer' }));
                                        }
                                    }}
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
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                            >
                                <Plus className="h-3.5 w-3.5" /> Add Product
                            </button>
                        }
                    >
                        {errors.items && (
                            <div className="mb-4 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg">
                                <p className="text-rose-600 text-xs">{errors.items}</p>
                            </div>
                        )}

                        {/* Column headers */}
                        <div className="grid grid-cols-12 gap-3 mb-2 px-1">
                            <div className="col-span-6 text-xs font-semibold text-slate-500">Product</div>
                            <div className="col-span-2 text-xs font-semibold text-slate-500 text-center">Qty</div>
                            <div className="col-span-3 text-xs font-semibold text-slate-500">Price</div>
                            <div className="col-span-1"></div>
                        </div>

                        <div className="space-y-2">
                            {items.map((item, i) => (
                                <div key={i} className="grid grid-cols-12 gap-3 items-center p-3 bg-slate-50 border border-slate-100 rounded-lg">
                                    <div className="col-span-6">
                                        <ProductSelector 
                                            selectedId={item.product}
                                            products={products.map(p => {
                                                const ws = warehouseStock.find(s => 
                                                    (s.product_name?.toLowerCase() === p.product_name?.toLowerCase()) &&
                                                    (s.weight === p.weight || (!s.weight && !p.weight)) &&
                                                    (s.size === p.size || (!s.size && !p.size))
                                                );
                                                return {
                                                    ...p,
                                                    stock: ws ? ws.total_quantity : 0
                                                };
                                            })}
                                            selectCls={selectCls}
                                            onSelect={(id: any) => updateItem(i, 'product', id)}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number" min="1"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                                            className={`${fieldCls()} text-center`}
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">PKR</span>
                                            <input
                                                type="number" min="0" step="0.01"
                                                value={item.unit_price}
                                                onChange={(e) => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                                                className={`${fieldCls()} pl-9 font-bold`}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-1 flex justify-center">
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
                            <div>
                                <FieldLabel required>Deduct From Warehouse</FieldLabel>
                                <select
                                    value={form.warehouse}
                                    onChange={e => setForm(f => ({ ...f, warehouse: e.target.value }))}
                                    className={selectCls}
                                >
                                    <option value="">Select Warehouse...</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name} ({w.location})</option>
                                    ))}
                                </select>
                                {errors.warehouse && <p className="text-red-500 text-xs mt-1">{errors.warehouse}</p>}
                            </div>
                        </div>
                    </Panel>

                    {/* Order Summary */}
                    <Panel title="Sale Summary" icon={DollarSign}>
                        <div className="space-y-4">
                            <div className="pt-2">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-slate-500">Items Total</span>
                                    <span className="text-sm font-bold text-slate-700 pr-1 tabular-nums">{formatCurrency(String(lineTotal))}</span>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-3">
                                    <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Total Payable</span>
                                    <span className="text-2xl font-black text-indigo-600 tabular-nums">{formatCurrency(String(grandTotal))}</span>
                                </div>
                            </div>

                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                size="lg"
                                className="w-full uppercase tracking-[0.2em] font-black mt-4"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                {saving ? 'Processing...' : 'Complete Sale'}
                            </Button>
                        </div>
                    </Panel>
                </div>
            </div>

            {/* ── Toast ── */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[300] animate-in slide-in-from-bottom-4 duration-300">
                    <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white text-sm font-bold border-l-4 ${toast.type === 'success' ? 'bg-slate-900 border-indigo-500' : 'bg-rose-600 border-rose-800'}`}>
                        {toast.type === 'success'
                            ? <CheckCircle className="h-5 w-5 text-indigo-400" />
                            : <AlertTriangle className="h-5 w-5 text-white" />}
                        {toast.msg}
                    </div>
                </div>
            )}
            {/* ── Stock Error Modal ── */}
            <Modal
                open={!!stockError}
                onClose={() => setStockError(null)}
                size="sm"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setStockError(null)}>
                            Dismiss
                        </Button>
                        <Button variant="primary" onClick={() => setStockError(null)}>
                            Change Warehouse
                        </Button>
                    </>
                }
            >
                <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 shrink-0">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Inventory Issue</h3>
                </div>

                <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 mb-6">
                    <p className="text-sm text-rose-600 font-bold leading-relaxed">
                        {stockError}
                    </p>
                </div>

                <p className="text-sm text-slate-500 leading-relaxed">
                    The selected warehouse doesn't have sufficient stock for this order. You can try selecting another warehouse or adjust the quantities.
                </p>
            </Modal>
        </div>
    );
}

