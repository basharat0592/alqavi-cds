'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, CheckCircle, Package, ArrowLeft, RefreshCw, Search, ChevronDown } from 'lucide-react';
import { purchaseService } from '@/services/purchase.service';
import { productService } from '@/services/product.service';
import { companyService } from '@/services/company.service';
import { userService } from '@/services/user.service';
import { inventoryService } from '@/services/inventory.service';
import { formatCurrency, getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import { WarehouseSelectionModal } from '@/components/admin/WarehouseSelectionModal';
import { PageHeader, Card, Button, Modal, ui } from '@/components/admin/ui';

/* ─── Shared Components ─── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => (
    <Button
        type={type}
        onClick={onClick}
        disabled={loading || disabled}
        variant={variant === 'secondary' ? 'outline' : 'primary'}
        className={className}
    >
        {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
        {children}
    </Button>
);

const Field = ({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="w-full">
        <label className="block text-[13px] font-bold text-slate-700 mb-1">{label}{required && <span className="text-rose-600 ml-0.5">*</span>}</label>
        {children}
    </div>
);

const inputCls = ui.inputBase;
const selectCls = `${inputCls} cursor-pointer`;

const EMPTY_FORM = {
    purchase_number: '', supplier: '', supplier_name: '',
    order_date: new Date().toISOString().slice(0, 10),
    status: 'PENDING', payment_method: 'CASH', notes: '',
    shipping_cost: 0,
    tax_rate: 0,
    warehouse: '',
};

type LineItem = {
    product: string;
    product_name: string;
    packaging_type: 'SINGLE' | 'CARTON';
    items_per_carton: number;
    quantity: number;
    unit_price: number;
};

/* ─── Pure Amazon Style Product Selector ─── */
const ProductSelector = ({ selectedId, onSelect, products, inputCls }: any) => {
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
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={inputCls + " flex items-center justify-between text-left bg-white hover:bg-slate-50 group transition-all duration-200"}
            >
                {selected ? (
                    <div className="flex items-center gap-2 overflow-hidden py-1">
                        <div className="w-8 h-8 rounded border border-slate-100 overflow-hidden shrink-0 bg-white">
                            {selected.image ? (
                                <img src={getImageUrl(selected.image) || ''} className="w-full h-full object-contain p-0.5" alt="" />
                            ) : (
                                <Package size={14} className="text-slate-300 m-auto mt-2" />
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-baseline gap-1 truncate leading-tight">
                                <span className="text-[12px] font-bold text-slate-900">{selected.name.replace(/\s*\(.*?\)\s*$/, '')}</span>
                                {(selected.weight || selected.size) && (
                                    <span className="text-[10px] text-indigo-600 font-black uppercase tracking-tight shrink-0">
                                        - {selected.weight}{selected.weight && selected.size ? ' • ' : ''}{selected.size}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter shrink-0 mt-0.5">SKU: {selected.sku || 'N/A'}</span>
                        </div>
                    </div>
                ) : <span className="text-slate-400 italic">Search products...</span>}
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${open ? 'rotate-180 text-indigo-600' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-[100] w-[180%] left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-[0_4px_20px_rgba(15,23,42,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {/* Search Header */}
                    <div className="p-2.5 bg-slate-50 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                className="w-full pl-9 pr-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none bg-white transition-all"
                                placeholder="Type to filter products..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Results Area */}
                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                        {filtered.length > 0 ? (
                            filtered.map((p: any) => (
                                <div
                                    key={p.id}
                                    className="p-3.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-all flex items-start gap-4 group"
                                    onClick={() => { onSelect(p.id); setOpen(false); }}
                                >
                                    {/* Thumbnail */}
                                    <div className="w-12 h-12 bg-white rounded border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center group-hover:border-indigo-400 transition-colors">
                                        {p.image ? (
                                            <img src={getImageUrl(p.image) || ''} className="w-full h-full object-contain p-1" alt="" />
                                        ) : (
                                            <Package size={20} className="text-slate-200" />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 flex justify-between gap-4 min-w-0">
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-baseline gap-1 leading-[1.2] group-hover:text-indigo-600">
                                                <span className="text-[13px] font-bold text-slate-900 group-hover:underline line-clamp-1">{p.name.replace(/\s*\(.*?\)\s*$/, '')}</span>
                                                {(p.weight || p.size) && (
                                                    <span className="text-[10px] text-indigo-600 font-black uppercase tracking-tight shrink-0">
                                                        - {p.weight}{p.weight && p.size ? ' • ' : ''}{p.size}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-y-0.5 gap-x-2 mt-1">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">SKU: {p.sku || 'N/A'}</span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                <span className={`text-[10px] font-bold ${p.quantity < 10 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                                    {p.quantity} in stock
                                                </span>
                                            </div>
                                        </div>

                                        {/* Price Section */}
                                        <div className="flex flex-col items-end shrink-0">
                                            <span className="text-[15px] font-black text-slate-900">{formatCurrency(p.retail_price || 0)}</span>
                                            <span className="text-[9px] text-slate-400 font-medium">Retail Price</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center flex flex-col items-center gap-2">
                                <Search size={24} className="text-slate-300" />
                                <span className="text-slate-400 text-[13px]">No results found for "{search}"</span>
                            </div>
                        )}
                    </div>

                    {/* Footer View */}
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-center">
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Inventory Management Console</span>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─── Supplier Selector ─── */
const SupplierSelector = ({ selectedId, onSelect, suppliers, inputCls }: any) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const filtered = suppliers.filter((s: any) => s.name.toLowerCase().includes(search.toLowerCase()));
    const selected = suppliers.find((s: any) => String(s.id) === String(selectedId));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={containerRef}>
            <button type="button" onClick={() => setOpen(!open)} className={inputCls + " flex items-center justify-between text-left"}>
                <span className={selected ? 'text-slate-900' : 'text-slate-400'}>{selected ? selected.name : 'Select Supplier...'}</span>
                <ChevronDown size={14} className="text-slate-400" />
            </button>
            {open && (
                <div className="absolute z-[50] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-slate-100"><input className="w-full px-3 py-1.5 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} autoFocus /></div>
                    <div className="max-h-[200px] overflow-y-auto">
                        {filtered.map((s: any) => (
                            <div key={s.id} className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-[13px] text-slate-700 border-b border-slate-100 last:border-0" onClick={() => { onSelect(s.id); setOpen(false); }}>{s.name}</div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function AddPurchasePage() {
    const router = useRouter();
    const [products, setProducts] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [items, setItems] = useState<LineItem[]>([{
        product: '',
        product_name: '',
        packaging_type: 'SINGLE',
        items_per_carton: 1,
        quantity: 1,
        unit_price: 0,
    }]);
    const [successOrder, setSuccessOrder] = useState<any | null>(null);
    const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
    const [tempPayload, setTempPayload] = useState<any>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [usersRes, suppRes] = await Promise.allSettled([
                userService.getAll(),
                (companyService as any).getSuppliers?.() ?? Promise.resolve([])
            ]);

            const usersArr = usersRes.status === 'fulfilled' ? (Array.isArray(usersRes.value) ? usersRes.value : []) : [];
            const fromUsers = usersArr.filter((u: any) => (u.role_name || '').toLowerCase().includes('supplier')).map((u: any) => ({
                id: u.id, name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username, phone: u.phone || '', city: u.address || '', isUser: true
            }));
            const fromCompanyRaw = suppRes.status === 'fulfilled' ? (Array.isArray(suppRes.value) ? suppRes.value : []) : [];
            const fromCompMapped = fromCompanyRaw.map((s: any) => ({
                id: s.id, name: s.company || s.name, phone: s.phone || '', city: s.address || '', isUser: false
            }));

            const merged = Array.from(new Map([...fromCompMapped, ...fromUsers].map(s => [s.name, s])).values());
            setSuppliers(merged);

            try {
                const whRes = await inventoryService.getWarehouses();
                setWarehouses(whRes || []);
            } catch (e) {
                console.error("Failed to fetch warehouses", e);
            }

            setForm(prev => ({ ...prev, purchase_number: `PO-${Date.now().toString().slice(-6)}` }));
        } catch { toast.error('Failed to load data'); } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        if (!form.supplier) { setProducts([]); return; }
        const fetchSupplierProducts = async () => {
            try {
                const res = await productService.getAllSupplier({ supplier: form.supplier });
                const raw = res as any;
                setProducts(Array.isArray(raw) ? raw : raw?.results || []);
            } catch (error) { setProducts([]); }
        };
        fetchSupplierProducts();
    }, [form.supplier]);

    const handleSave = async (warehouseIdOrEvent?: any) => {
        const warehouseId = typeof warehouseIdOrEvent === 'string' ? warehouseIdOrEvent : undefined;
        if (!form.supplier || items.some(i => !i.product)) return toast.error('Please fill all required fields');

        if (form.status === 'RECEIVED' && !warehouseId && !form.warehouse) {
            setTempPayload({ ...form, items });
            setIsWarehouseModalOpen(true);
            return;
        }

        const finalWarehouseId = warehouseId || form.warehouse;

        for (const item of items) {
            const p = products.find(prod => String(prod.id) === String(item.product));
            if (!p) continue;
            const totalUnitsNeeded = item.packaging_type === 'CARTON' ? (item.quantity * item.items_per_carton) : item.quantity;
            if (totalUnitsNeeded > p.quantity) {
                return toast.error(`Cannot purchase more than ${p.quantity} units of ${p.name}`);
            }
        }

        setSaving(true);
        try {
            const payload: any = { ...form, items };
            if (finalWarehouseId) payload.warehouse = finalWarehouseId;
            const data = await purchaseService.create(payload);
            setSuccessOrder(data);
            setIsWarehouseModalOpen(false);
            toast.success('Purchase order created!');
        } catch (err: any) {
            const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to create purchase';
            toast.error(msg);
        } finally { setSaving(false); }
    };

    const addItem = () => setItems(prev => [...prev, {
        product: '',
        product_name: '',
        packaging_type: 'SINGLE',
        items_per_carton: 1,
        quantity: 1,
        unit_price: 0,
    }]);

    const removeItem = (i: number) => setItems(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);

    const updateItem = (i: number, field: string, val: any) => {
        setItems(prev => prev.map((item, idx) => {
            if (idx !== i) return item;
            if (field === 'product') {
                const p = products.find(p => String(p.id) === String(val));
                return { ...item, product: val, product_name: p?.name || '', unit_price: p?.retail_price ? parseFloat(p.retail_price) : item.unit_price };
            }
            return { ...item, [field]: val };
        }));
    };

    const calculateSubtotal = (item: LineItem) => (item.quantity || 0) * (item.unit_price || 0);
    const totalAmount = items.reduce((sum, item) => sum + calculateSubtotal(item), 0);

    return (
        <div className="pb-20">
            <div className="max-w-[1100px] mx-auto">
                <PageHeader
                    title="New Purchase"
                    subtitle="Create a purchase order with supplier, items, and totals."
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Purchases', href: '/admin/purchases' }, { label: 'New Purchase' }]}
                    actions={
                        <Button variant="outline" onClick={() => router.back()}>
                            <ArrowLeft size={14} /> Back
                        </Button>
                    }
                />

                {loading ? (
                    <div className="text-center py-20 text-[13px] text-slate-500">Loading data...</div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                        <div className="flex-1 min-w-0 space-y-5">
                            <Card>
                                <div className="px-6 py-4 border-b border-slate-100">
                                    <h2 className="text-[14px] font-bold text-slate-900 tracking-tight">Order Information</h2>
                                    <p className="text-[12px] text-slate-500">Enter order number, supplier, and date.</p>
                                </div>
                                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <Field label="Order Number" required>
                                        <input className={inputCls} value={form.purchase_number} onChange={e => setForm(f => ({ ...f, purchase_number: e.target.value }))} placeholder="e.g. PO-123456" />
                                    </Field>
                                    <Field label="Supplier" required>
                                        <SupplierSelector selectedId={form.supplier} suppliers={suppliers} inputCls={selectCls} onSelect={(val: any) => {
                                            const matched = suppliers.find(c => String(c.id) === String(val));
                                            setForm(f => ({ ...f, supplier: val, supplier_name: matched?.name || '' }));
                                        }} />
                                    </Field>
                                    <Field label="Order Date" required>
                                        <input className={inputCls} type="date" value={form.order_date} onChange={e => setForm(f => ({ ...f, order_date: e.target.value }))} />
                                    </Field>
                                    <Field label="Payment Method">
                                        <select className={selectCls} value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                                            <option value="CASH">Cash</option>
                                            <option value="BANK_TRANSFER">Bank Transfer</option>
                                            <option value="CHEQUE">Cheque</option>
                                            <option value="ONLINE">Online / UPI</option>
                                            <option value="CREDIT">Credit</option>
                                        </select>
                                    </Field>
                                    <Field label="Shipping Cost">
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">$</span>
                                            <input
                                                className={inputCls + " pl-6"}
                                                type="number"
                                                value={(form as any).shipping_cost || ''}
                                                onChange={e => setForm(f => ({ ...f, shipping_cost: parseFloat(e.target.value) || 0 }))}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </Field>
                                    <Field label="Tax Rate (%)">
                                        <div className="relative">
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">%</span>
                                            <input
                                                className={inputCls + " pr-8"}
                                                type="number"
                                                value={(form as any).tax_rate || ''}
                                                onChange={e => setForm(f => ({ ...f, tax_rate: parseFloat(e.target.value) || 0 }))}
                                                placeholder="0"
                                            />
                                        </div>
                                    </Field>
                                    <Field label="Target Warehouse" required={form.status === 'RECEIVED'}>
                                        <select className={selectCls} value={form.warehouse} onChange={e => setForm(f => ({ ...f, warehouse: e.target.value }))}>
                                            <option value="">Select Warehouse...</option>
                                            {warehouses.map(w => (
                                                <option key={w.id} value={w.id}>{w.name}</option>
                                            ))}
                                        </select>
                                    </Field>
                                </div>
                            </Card>

                            <Card className="relative z-[10]">
                                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-[14px] font-bold text-slate-900 tracking-tight">Order Items</h2>
                                        <p className="text-[12px] text-slate-500">Select products and quantities.</p>
                                    </div>
                                    <Btn variant="secondary" onClick={addItem}><Plus size={14} /> Add Item</Btn>
                                </div>
                                <div className="p-6 space-y-4">
                                    {items.map((item, i) => {
                                        const p = products.find(prod => String(prod.id) === String(item.product));
                                        const maxQty = p ? (item.packaging_type === 'CARTON' ? Math.floor(p.quantity / (item.items_per_carton || 1)) : p.quantity) : 9999;
                                        const isMax = p && item.quantity >= maxQty;

                                        return (
                                            <div key={i} className="bg-white border border-slate-200/70 rounded-xl p-4 transition-all hover:border-indigo-400 hover:shadow-md group">
                                                <div className="grid grid-cols-12 gap-4 items-center">
                                                    <div className="col-span-12 lg:col-span-5">
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Product</label>
                                                        <ProductSelector selectedId={item.product} products={products} inputCls={selectCls} onSelect={(val: any) => updateItem(i, 'product', val)} />
                                                    </div>
                                                    <div className="col-span-4 lg:col-span-2 text-center">
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Type</label>
                                                        <select className={selectCls} value={item.packaging_type} onChange={e => updateItem(i, 'packaging_type', e.target.value)}>
                                                            <option value="SINGLE">Single</option>
                                                            <option value="CARTON">Carton</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-span-4 lg:col-span-2 relative text-center">
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Qty</label>
                                                        <input className={inputCls + " text-center font-bold tabular-nums " + (isMax ? 'text-rose-600 border-rose-400' : 'text-indigo-600')} type="number" min="1" value={item.quantity || ''} onChange={e => {
                                                            let val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                                            const p = products.find(prod => String(prod.id) === String(item.product));
                                                            if (p) {
                                                                const maxQty = item.packaging_type === 'CARTON' ? Math.floor(p.quantity / (item.items_per_carton || 1)) : p.quantity;
                                                                if (val > maxQty) val = maxQty;
                                                            }
                                                            updateItem(i, 'quantity', val);
                                                        }} />
                                                        {isMax && <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[7px] font-black text-rose-600 uppercase">MAX</span>}
                                                    </div>
                                                    <div className="col-span-3 lg:col-span-2 text-center">
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pcs/Ctn</label>
                                                        <input className={inputCls + (item.packaging_type !== 'CARTON' ? ' opacity-50 bg-slate-50' : '') + " text-center tabular-nums"} type="number" min="1" disabled={item.packaging_type !== 'CARTON'} value={item.items_per_carton || ''} onChange={e => updateItem(i, 'items_per_carton', parseInt(e.target.value) || 0)} />
                                                    </div>
                                                    <div className="col-span-1 flex justify-center pt-5"><button onClick={() => removeItem(i)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button></div>
                                                </div>
                                                {item.product && (
                                                    <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-[11px]">
                                                        <div className="flex gap-4 text-slate-500">
                                                            <span>Cost: <b className="text-slate-800 tabular-nums">{formatCurrency(item.unit_price)}</b></span>
                                                            <span className="w-[1px] h-3 bg-slate-200" />
                                                            <span>Total: <b className="text-slate-800 tabular-nums">{item.packaging_type === 'CARTON' ? (item.quantity * item.items_per_carton) : item.quantity} Pcs</b></span>
                                                        </div>
                                                        <div className="text-[14px] font-black text-slate-900 tabular-nums">{formatCurrency(calculateSubtotal(item))}</div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>

                            <Card>
                                <div className="px-6 py-4 border-b border-slate-100"><h2 className="text-[14px] font-bold text-slate-900 tracking-tight">Notes (Optional)</h2></div>
                                <div className="p-6"><textarea className="w-full p-3 border border-slate-200 rounded-lg text-[13px] text-slate-800 outline-none placeholder:text-slate-400 transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10" rows={3} placeholder="Any notes for this purchase..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                            </Card>
                        </div>

                        <div className="w-full lg:w-[300px] space-y-4">
                            <Card className="p-5">
                                <h3 className="text-[14px] font-bold text-slate-900 tracking-tight mb-4">Order Summary</h3>
                                <div className="space-y-3 border-b border-slate-100 pb-4 mb-4">
                                    <div className="flex justify-between text-[13px]">
                                        <span className="text-slate-500">Items Total:</span>
                                        <span className="font-medium text-slate-700 tabular-nums">{formatCurrency(totalAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-[13px]">
                                        <span className="text-slate-500">Shipping:</span>
                                        <span className={((form as any).shipping_cost > 0) ? "font-medium text-slate-700 tabular-nums" : "text-emerald-700 font-bold"}>
                                            {(form as any).shipping_cost > 0 ? formatCurrency((form as any).shipping_cost) : 'FREE'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-[13px]">
                                        <span className="text-slate-500">Estimated Tax ({(form as any).tax_rate}%):</span>
                                        <span className="font-medium text-slate-700 tabular-nums">{formatCurrency((totalAmount * ((form as any).tax_rate || 0)) / 100)}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-[16px] font-bold text-slate-900">Order Total:</span>
                                    <span className="text-[18px] font-black text-slate-900 tabular-nums">
                                        {formatCurrency(totalAmount + ((form as any).shipping_cost || 0) + (totalAmount * ((form as any).tax_rate || 0)) / 100)}
                                    </span>
                                </div>
                                <Btn className="w-full justify-center" loading={saving} onClick={() => handleSave()} disabled={items.some(i => !i.product)}>Place Order</Btn>
                            </Card>
                        </div>
                    </div>
                )}

                <Modal open={!!successOrder} onClose={() => setSuccessOrder(null)} size="sm">
                    <div className="py-4 text-center">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} /></div>
                        <h2 className="text-[20px] font-bold tracking-tight mb-2 text-slate-900">Order Placed Successfully!</h2>
                        <p className="text-[13px] text-slate-500 mb-6">Your purchase order <b className="text-slate-900">{successOrder?.purchase_number}</b> has been recorded.</p>
                        <div className="flex flex-col gap-2">
                            <Btn className="w-full justify-center" onClick={() => router.push('/admin/purchases')}>View All Purchases</Btn>
                            <button onClick={() => setSuccessOrder(null)} className="text-[13px] text-indigo-600 hover:text-indigo-700 hover:underline">Create Another Order</button>
                        </div>
                    </div>
                </Modal>
            </div>

            <WarehouseSelectionModal isOpen={isWarehouseModalOpen} onClose={() => setIsWarehouseModalOpen(false)} onConfirm={(whId) => handleSave(whId)} loading={saving} />
        </div>
    );
}
