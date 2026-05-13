'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Plus, Trash2, CheckCircle, Package, ArrowLeft, ChevronRight, RefreshCw, Search, ChevronDown } from 'lucide-react';
import { purchaseService } from '@/services/purchase.service';
import { productService } from '@/services/product.service';
import { companyService } from '@/services/company.service';
import { userService } from '@/services/user.service';
import { inventoryService } from '@/services/inventory.service';
import { formatCurrency, getImageUrl } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { WarehouseSelectionModal } from '@/components/admin/WarehouseSelectionModal';

/* ─── Shared Components ─── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111]',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const Field = ({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="w-full">
        <label className="block text-[13px] font-bold text-[#0f1111] mb-1">{label}{required && <span className="text-red-600 ml-0.5">*</span>}</label>
        {children}
    </div>
);

const inputCls = "w-full h-[38px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all";
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
                className={inputCls + " flex items-center justify-between text-left bg-white hover:bg-[#f3f7f7] group transition-all duration-200 shadow-sm border-[#888c8e]"}
            >
                {selected ? (
                    <div className="flex items-center gap-2 overflow-hidden py-1">
                        <div className="w-8 h-8 rounded border border-gray-100 overflow-hidden shrink-0 bg-white">
                            {selected.image ? (
                                <img src={getImageUrl(selected.image) || ''} className="w-full h-full object-contain p-0.5" alt="" />
                            ) : (
                                <Package size={14} className="text-gray-300 m-auto mt-2" />
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-baseline gap-1 truncate leading-tight">
                                <span className="text-[12px] font-bold text-[#111]">{selected.name.replace(/\s*\(.*?\)\s*$/, '')}</span>
                                {(selected.weight || selected.size) && (
                                    <span className="text-[10px] text-[#e77600] font-black uppercase tracking-tight shrink-0">
                                        - {selected.weight}{selected.weight && selected.size ? ' • ' : ''}{selected.size}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] text-[#565959] uppercase font-bold tracking-tighter shrink-0 mt-0.5">SKU: {selected.sku || 'N/A'}</span>
                        </div>
                    </div>
                ) : <span className="text-[#565959] italic">Search Amazon products...</span>}
                <ChevronDown size={14} className={`text-[#888c8e] transition-transform duration-300 ${open ? 'rotate-180 text-[#e77600]' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-[100] w-[180%] left-0 mt-1 bg-white border border-[#cdcdcd] rounded-[4px] shadow-[0_4px_20px_rgba(0,0,0,0.25)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {/* Search Header */}
                    <div className="p-2.5 bg-[#f3f3f3] border-b border-[#ddd]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                className="w-full pl-9 pr-3 py-2 text-[13px] border border-[#888c8e] rounded-[3px] focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] outline-none bg-white"
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
                                    className="p-3.5 hover:bg-[#f3f7f7] cursor-pointer border-b border-[#eee] last:border-0 transition-all flex items-start gap-4 group"
                                    onClick={() => { onSelect(p.id); setOpen(false); }}
                                >
                                    {/* Thumbnail */}
                                    <div className="w-12 h-12 bg-white rounded border border-[#ddd] overflow-hidden shrink-0 flex items-center justify-center group-hover:border-[#e77600] transition-colors">
                                        {p.image ? (
                                            <img src={getImageUrl(p.image) || ''} className="w-full h-full object-contain p-1" alt="" />
                                        ) : (
                                            <Package size={20} className="text-gray-200" />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 flex justify-between gap-4 min-w-0">
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-baseline gap-1 leading-[1.2] group-hover:text-[#e77600]">
                                                <span className="text-[13px] font-bold text-[#111] group-hover:underline line-clamp-1">{p.name.replace(/\s*\(.*?\)\s*$/, '')}</span>
                                                {(p.weight || p.size) && (
                                                    <span className="text-[10px] text-[#e77600] font-black uppercase tracking-tight shrink-0">
                                                        - {p.weight}{p.weight && p.size ? ' • ' : ''}{p.size}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-y-0.5 gap-x-2 mt-1">
                                                <span className="text-[10px] font-black text-[#565959] uppercase tracking-wider">SKU: {p.sku || 'N/A'}</span>
                                                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                                <span className={`text-[10px] font-bold ${p.quantity < 10 ? 'text-[#b12704]' : 'text-green-700'}`}>
                                                    {p.quantity} in stock
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Price Section */}
                                        <div className="flex flex-col items-end shrink-0">
                                            <span className="text-[15px] font-black text-[#b12704]">{formatCurrency(p.retail_price || 0)}</span>
                                            <span className="text-[9px] text-gray-400 font-medium">Retail Price</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center flex flex-col items-center gap-2">
                                <Search size={24} className="text-gray-300" />
                                <span className="text-gray-400 text-[13px]">No results found for "{search}"</span>
                            </div>
                        )}
                    </div>

                    {/* Footer View */}
                    <div className="px-4 py-2 bg-[#f8f8f8] border-t border-[#ddd] text-center">
                        <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Inventory Management Console</span>
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
                <span className={selected ? 'text-[#0f1111]' : 'text-[#565959]'}>{selected ? selected.name : 'Select Supplier...'}</span>
                <ChevronDown size={14} className="text-gray-400" />
            </button>
            {open && (
                <div className="absolute z-[50] w-full mt-1 bg-white border border-[#ddd] rounded-md shadow-xl overflow-hidden">
                    <div className="p-2 border-b"><input className="w-full px-3 py-1.5 text-[13px] border rounded outline-none" placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} autoFocus /></div>
                    <div className="max-h-[200px] overflow-y-auto">
                        {filtered.map((s: any) => (
                            <div key={s.id} className="px-4 py-2 hover:bg-[#f3f7f7] cursor-pointer text-[13px] border-b border-gray-50 last:border-0" onClick={() => { onSelect(s.id); setOpen(false); }}>{s.name}</div>
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
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1100px] mx-auto px-6 pt-5">
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <Link href="/admin/purchases" className="hover:text-[#c45500] hover:underline">Purchases</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500]">New Purchase</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-[22px] font-normal">Create Purchase Order</h1>
                    <button onClick={() => router.back()} className="text-[13px] text-[#007185] hover:text-[#c45500] hover:underline flex items-center gap-1">
                        <ArrowLeft size={14} /> Back
                    </button>
                </div>
                <div className="border-b border-[#ddd] mb-6" />

                {loading ? (
                    <div className="text-center py-20 text-[13px] text-[#565959]">Loading data...</div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                        <div className="flex-1 min-w-0 space-y-5">
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h2 className="text-[14px] font-bold">Order Information</h2>
                                    <p className="text-[12px] text-[#565959]">Enter order number, supplier, and date.</p>
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
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">$</span>
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
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">%</span>
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
                            </div>

                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm relative z-[10]">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa] flex items-center justify-between">
                                    <div>
                                        <h2 className="text-[14px] font-bold">Order Items</h2>
                                        <p className="text-[12px] text-[#565959]">Select products and quantities.</p>
                                    </div>
                                    <Btn variant="secondary" onClick={addItem}><Plus size={14} /> Add Item</Btn>
                                </div>
                                <div className="p-6 space-y-4">
                                    {items.map((item, i) => {
                                        const p = products.find(prod => String(prod.id) === String(item.product));
                                        const maxQty = p ? (item.packaging_type === 'CARTON' ? Math.floor(p.quantity / (item.items_per_carton || 1)) : p.quantity) : 9999;
                                        const isMax = p && item.quantity >= maxQty;

                                        return (
                                            <div key={i} className="bg-white border border-[#e3e6e6] rounded-[8px] p-4 transition-all hover:border-[#e77600] hover:shadow-md group">
                                                <div className="grid grid-cols-12 gap-4 items-center">
                                                    <div className="col-span-12 lg:col-span-5">
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Product</label>
                                                        <ProductSelector selectedId={item.product} products={products} inputCls={selectCls} onSelect={(val: any) => updateItem(i, 'product', val)} />
                                                    </div>
                                                    <div className="col-span-4 lg:col-span-2 text-center">
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Type</label>
                                                        <select className={selectCls} value={item.packaging_type} onChange={e => updateItem(i, 'packaging_type', e.target.value)}>
                                                            <option value="SINGLE">Single</option>
                                                            <option value="CARTON">Carton</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-span-4 lg:col-span-2 relative text-center">
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Qty</label>
                                                        <input className={inputCls + " text-center font-bold " + (isMax ? 'text-red-600 border-red-400' : 'text-[#c45500]')} type="number" min="1" value={item.quantity || ''} onChange={e => {
                                                            let val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                                            const p = products.find(prod => String(prod.id) === String(item.product));
                                                            if (p) {
                                                                const maxQty = item.packaging_type === 'CARTON' ? Math.floor(p.quantity / (item.items_per_carton || 1)) : p.quantity;
                                                                if (val > maxQty) val = maxQty;
                                                            }
                                                            updateItem(i, 'quantity', val);
                                                        }} />
                                                        {isMax && <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[7px] font-black text-red-600 uppercase">MAX</span>}
                                                    </div>
                                                    <div className="col-span-3 lg:col-span-2 text-center">
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pcs/Ctn</label>
                                                        <input className={inputCls + (item.packaging_type !== 'CARTON' ? ' opacity-50 bg-gray-50' : '') + " text-center"} type="number" min="1" disabled={item.packaging_type !== 'CARTON'} value={item.items_per_carton || ''} onChange={e => updateItem(i, 'items_per_carton', parseInt(e.target.value) || 0)} />
                                                    </div>
                                                    <div className="col-span-1 flex justify-center pt-5"><button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-500"><Trash2 size={18} /></button></div>
                                                </div>
                                                {item.product && (
                                                    <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between items-center text-[11px]">
                                                        <div className="flex gap-4 text-gray-500">
                                                            <span>Cost: <b className="text-gray-800">{formatCurrency(item.unit_price)}</b></span>
                                                            <span className="w-[1px] h-3 bg-gray-200" />
                                                            <span>Total: <b className="text-gray-800">{item.packaging_type === 'CARTON' ? (item.quantity * item.items_per_carton) : item.quantity} Pcs</b></span>
                                                        </div>
                                                        <div className="text-[14px] font-black text-[#b12704]">{formatCurrency(calculateSubtotal(item))}</div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]"><h2 className="text-[14px] font-bold">Notes (Optional)</h2></div>
                                <div className="p-6"><textarea className="w-full p-3 border rounded text-[13px] outline-none focus:border-[#e77600]" rows={3} placeholder="Any notes for this purchase..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                            </div>
                        </div>

                        <div className="w-full lg:w-[300px] space-y-4">
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm p-5">
                                <h3 className="text-[14px] font-bold mb-4">Order Summary</h3>
                                <div className="space-y-3 border-b pb-4 mb-4">
                                    <div className="flex justify-between text-[13px]">
                                        <span className="text-[#565959]">Items Total:</span>
                                        <span className="font-medium">{formatCurrency(totalAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-[13px]">
                                        <span className="text-[#565959]">Shipping:</span>
                                        <span className={((form as any).shipping_cost > 0) ? "font-medium" : "text-green-700 font-bold"}>
                                            {(form as any).shipping_cost > 0 ? formatCurrency((form as any).shipping_cost) : 'FREE'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-[13px]">
                                        <span className="text-[#565959]">Estimated Tax ({(form as any).tax_rate}%):</span>
                                        <span className="font-medium">{formatCurrency((totalAmount * ((form as any).tax_rate || 0)) / 100)}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-[16px] font-bold">Order Total:</span>
                                    <span className="text-[18px] font-black text-[#b12704]">
                                        {formatCurrency(totalAmount + ((form as any).shipping_cost || 0) + (totalAmount * ((form as any).tax_rate || 0)) / 100)}
                                    </span>
                                </div>
                                <Btn className="w-full h-[35px] text-[14px] justify-center" loading={saving} onClick={() => handleSave()} disabled={items.some(i => !i.product)}>Place Order</Btn>
                            </div>
                        </div>
                    </div>
                )}

                {successOrder && (
                    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-[450px] rounded-[8px] overflow-hidden shadow-2xl scale-in-center">
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} /></div>
                                <h2 className="text-[20px] font-bold mb-2 text-[#0f1111]">Order Placed Successfully!</h2>
                                <p className="text-[13px] text-[#565959] mb-6">Your purchase order <b className="text-[#0f1111]">{successOrder.purchase_number}</b> has been recorded.</p>
                                <div className="flex flex-col gap-2">
                                    <Btn className="w-full h-[35px] justify-center" onClick={() => router.push('/admin/purchases')}>View All Purchases</Btn>
                                    <button onClick={() => setSuccessOrder(null)} className="text-[13px] text-[#007185] hover:underline">Create Another Order</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <WarehouseSelectionModal isOpen={isWarehouseModalOpen} onClose={() => setIsWarehouseModalOpen(false)} onConfirm={(whId) => handleSave(whId)} loading={saving} />
        </div>
    );
}
