'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Plus, Trash2, X, CheckCircle, Package, ArrowLeft, ChevronRight, RefreshCw, Save, Search, ChevronDown } from 'lucide-react';
import { purchaseService } from '@/services/purchase.service';
import { productService } from '@/services/product.service';
import { companyService } from '@/services/company.service';
import { userService } from '@/services/user.service';
import { formatCurrency, getImageUrl } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

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

const inputCls = "w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white";
const selectCls = `${inputCls} cursor-pointer`;

const EMPTY_FORM = {
    purchase_number: '', supplier: '', supplier_name: '',
    order_date: new Date().toISOString().slice(0, 10),
    status: 'ordered', payment_method: 'cash', notes: '',
};

type LineItem = { 
    product: string; 
    product_name: string; 
    packaging_type: 'SINGLE' | 'CARTON';
    items_per_carton: number;
    quantity: number; 
    unit_price: number; 
};

/* ─── Rich Product Selector ─── */
const ProductSelector = ({ selectedId, onSelect, products, inputCls }: any) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const filtered = products.filter((p: any) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
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
                className={inputCls + " h-[42px] flex items-center justify-between text-left px-3 bg-white hover:bg-[#f3f7f7] transition-all group"}
            >
                {selected ? (
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 bg-slate-50 rounded border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {selected.image ? (
                                <img src={getImageUrl(selected.image) || ''} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <Package size={16} className="text-slate-300" />
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[13px] font-bold text-[#0f1111] truncate">{selected.name}</span>
                            <span className="text-[10px] text-slate-500 font-medium">SKU: {selected.sku || 'N/A'}</span>
                        </div>
                    </div>
                ) : <span className="text-[#565959]">Select product...</span>}
                <ChevronDown size={14} className={`text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute top-[calc(100%+4px)] left-0 w-[350px] sm:w-[500px] bg-white border border-slate-300 rounded-[8px] shadow-2xl z-[1000] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b bg-[#fcfdff] sticky top-0 z-[1001]">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                autoFocus
                                placeholder="Search by name or SKU..."
                                className="w-full h-[36px] pl-9 pr-3 border border-slate-300 rounded-[4px] text-[13px] outline-none focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600]/20"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                        {filtered.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50">
                                <Package className="mx-auto h-8 w-8 text-slate-200 mb-2" />
                                <p className="text-[13px] font-medium text-slate-500">No matching products from this supplier</p>
                            </div>
                        ) : (
                            filtered.map((p: any) => (
                                <div
                                    key={p.id}
                                    onClick={() => { onSelect(p.id); setOpen(false); }}
                                    className="flex items-center gap-4 p-3 hover:bg-[#f3f7f7] cursor-pointer transition-colors border-b last:border-0 border-slate-100 group"
                                >
                                    <div className="w-14 h-14 bg-white flex items-center justify-center rounded border border-slate-200 shrink-0 overflow-hidden group-hover:border-[#e77600]/40 transition-colors">
                                        {p.image ? (
                                            <img src={getImageUrl(p.image) || ''} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <Package size={24} className="text-slate-200" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-[14px] font-bold text-[#111] leading-tight group-hover:text-[#c45500] transition-colors">{p.name}</p>
                                            <span className="text-[13px] font-black text-[#B12704] whitespace-nowrap">{formatCurrency(p.retail_price || 0)}</span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1.5 font-medium">
                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">SKU: {p.sku || 'N/A'}</span>
                                            <div className="flex items-center gap-1">
                                                <div className={`h-1.5 w-1.5 rounded-full ${p.quantity > 10 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                <span className="text-[11px] text-slate-500">{p.quantity || 0} in stock</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
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
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [items, setItems] = useState<LineItem[]>([{ 
        product: '', 
        product_name: '', 
        packaging_type: 'SINGLE',
        items_per_carton: 1,
        quantity: 1, 
        unit_price: 0 
    }]);
    const [successOrder, setSuccessOrder] = useState<any | null>(null);

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
                id: s.id, name: s.company || s.name, phone: s.contact || '', city: s.address || '', isUser: false
            }));

            // Prioritize dashboad users over registry records on name overlap
            const merged = Array.from(new Map([...fromCompMapped, ...fromUsers].map(s => [s.name, s])).values());
            setSuppliers(merged);

            setForm(prev => ({ ...prev, purchase_number: `PO-${Date.now().toString().slice(-6)}` }));
        } catch { toast.error('Failed to load data'); } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Fetch supplier-specific products when supplier is selected
    useEffect(() => {
        if (!form.supplier) {
            setProducts([]);
            return;
        }

        const fetchSupplierProducts = async () => {
            try {
                const res = await productService.getAllSupplier({ supplier: form.supplier });
                const raw = res as any;
                setProducts(Array.isArray(raw) ? raw : raw?.results || []);
            } catch (error) {
                console.error("Failed to fetch products for supplier", error);
                setProducts([]);
            }
        };

        fetchSupplierProducts();
    }, [form.supplier]);

    const handleSave = async () => {
        if (!form.supplier || items.some(i => !i.product)) return toast.error('Please fill all required fields');
        
        // Stock Validation
        for (const item of items) {
            const p = products.find(prod => String(prod.id) === String(item.product));
            if (!p) continue;
            
            const totalUnitsNeeded = item.packaging_type === 'CARTON' 
                ? (item.quantity * item.items_per_carton) 
                : item.quantity;
            
            if (totalUnitsNeeded > p.quantity) {
                return toast.error(`Cannot purchase more than ${p.quantity} units of ${p.name}`);
            }
        }

        setSaving(true);
        try {
            const data = await purchaseService.create({ ...form, items });
            setSuccessOrder(data);
            toast.success('Purchase order created!');
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to create purchase';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const addItem = () => setItems(prev => [...prev, { 
        product: '', 
        product_name: '', 
        packaging_type: 'SINGLE',
        items_per_carton: 1,
        quantity: 1, 
        unit_price: 0 
    }]);
    const removeItem = (i: number) => setItems(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);
    const updateItem = (i: number, field: string, val: any) => {
        setItems(prev => prev.map((item, idx) => {
            if (idx !== i) return item;
            if (field === 'product') {
                const p = products.find(p => String(p.id) === String(val));
                return { ...item, product: val, product_name: p?.name || '', unit_price: p?.retail_price ? parseFloat(p.retail_price) : item.unit_price };
            }
            // Strict Clamping for quantities
            if (field === 'quantity' || field === 'items_per_carton' || field === 'packaging_type') {
                const updatedItem = { ...item, [field]: val };
                const p = products.find(prod => String(prod.id) === String(updatedItem.product));
                if (p) {
                    const maxQty = updatedItem.packaging_type === 'CARTON' 
                        ? Math.floor(p.quantity / (updatedItem.items_per_carton || 1)) 
                        : p.quantity;
                    
                    if (updatedItem.quantity > maxQty) {
                        updatedItem.quantity = Math.max(1, maxQty);
                    }
                }
                return updatedItem;
            }
            return { ...item, [field]: val };
        }));
    };

    const lineTotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
    
    const calculateSubtotal = (item: LineItem) => {
        return (item.quantity || 0) * (item.unit_price || 0);
    };

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1100px] mx-auto px-6 pt-5">

                {/* Breadcrumb */}
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

                        {/* LEFT: Form */}
                        <div className="flex-1 min-w-0 space-y-5">

                            {/* Order Info */}
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
                                        <select className={selectCls} value={form.supplier} onChange={e => {
                                            const val = e.target.value;
                                            const matched = suppliers.find(c => String(c.id) === val);
                                            setForm(f => ({ ...f, supplier: val, supplier_name: matched?.name || '' }));
                                        }}>
                                            <option value="">Select supplier...</option>
                                            {suppliers.map(c => <option key={c.id} value={String(c.id)}>{c.name} {c.isUser ? '(Dashboard User)' : '(Manual Entry)'}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Order Date" required>
                                        <input className={inputCls} type="date" value={form.order_date} onChange={e => setForm(f => ({ ...f, order_date: e.target.value }))} />
                                    </Field>
                                    <Field label="Status">
                                        <select className={selectCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                            <option value="ordered">Ordered</option>
                                            <option value="received">Received</option>
                                        </select>
                                    </Field>
                                </div>
                            </div>

                            {/* Line Items */}
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm relative z-[10]">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa] flex items-center justify-between">
                                    <div>
                                        <h2 className="text-[14px] font-bold">Order Items</h2>
                                        <p className="text-[12px] text-[#565959]">Select products, quantities, and prices.</p>
                                    </div>
                                    <Btn variant="secondary" onClick={addItem}><Plus size={14} /> Add Item</Btn>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="grid grid-cols-12 gap-3 text-[11px] font-bold text-[#565959] uppercase tracking-wide px-1">
                                        <div className="col-span-5">Product Selector</div>
                                        <div className="col-span-2">Pack Type</div>
                                        <div className="col-span-2 text-center">Order Qty</div>
                                        <div className="col-span-2 text-center">Pcs/Ctn</div>
                                        <div className="col-span-1 text-center font-bold">Action</div>
                                    </div>
                                    {items.map((item, i) => {
                                        const p = products.find(prod => String(prod.id) === String(item.product));
                                        const maxQty = p ? (item.packaging_type === 'CARTON' ? Math.floor(p.quantity / (item.items_per_carton || 1)) : p.quantity) : 9999;
                                        const isMax = p && item.quantity >= maxQty;

                                        return (
                                        <div key={i} className="grid grid-cols-12 gap-3 items-center bg-[#f7f8fa] border border-[#eee] rounded-[3px] p-3 transition-colors hover:border-slate-300">
                                            <div className="col-span-5">
                                                <ProductSelector 
                                                    selectedId={item.product}
                                                    products={products}
                                                    inputCls={selectCls}
                                                    onSelect={(val: any) => updateItem(i, 'product', val)}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <select 
                                                    className={selectCls + " text-[12px]"} 
                                                    value={item.packaging_type} 
                                                    onChange={e => updateItem(i, 'packaging_type', e.target.value)}
                                                >
                                                    <option value="SINGLE">Single</option>
                                                    <option value="CARTON">Carton</option>
                                                </select>
                                            </div>
                                            <div className="col-span-2 relative">
                                                <input 
                                                    className={inputCls + " text-center font-bold " + (isMax ? 'text-red-600 border-red-400 focus:border-red-500' : 'text-[#c45500]')} 
                                                    type="number" 
                                                    min="1" 
                                                    value={item.quantity} 
                                                    onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} 
                                                />
                                                {isMax && (
                                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-black text-red-600 uppercase tracking-tighter bg-white px-1 leading-none animate-bounce">
                                                        Reached Max!
                                                    </span>
                                                )}
                                            </div>
                                            <div className="col-span-2 text-center">
                                                <input 
                                                    className={inputCls + (item.packaging_type !== 'CARTON' ? ' opacity-50 bg-gray-50' : '') + " text-center font-medium"} 
                                                    type="number" 
                                                    min="1" 
                                                    disabled={item.packaging_type !== 'CARTON'}
                                                    value={item.items_per_carton || 1} 
                                                    onChange={e => updateItem(i, 'items_per_carton', parseInt(e.target.value) || 1)} 
                                                />
                                            </div>
                                            <div className="col-span-1 flex justify-center">
                                                <button onClick={() => removeItem(i)} className="text-[#888] hover:text-red-600 transition-colors p-1">
                                                    <X size={15} />
                                                </button>
                                            </div>
                                            {item.product && (
                                                <div className="col-span-12 flex justify-between items-center text-[12px] text-[#565959] mt-2 pt-2 border-t border-gray-200/50">
                                                    <div className="flex items-center gap-4">
                                                        <div>
                                                            Cost: <span className="font-bold text-[#111]">{formatCurrency(item.unit_price)}</span>
                                                        </div>
                                                        <div className="w-[1px] h-3 bg-gray-300" />
                                                        <div>
                                                            Units: <span className="font-bold text-[#111]">
                                                                {item.packaging_type === 'CARTON' ? (item.quantity * item.items_per_carton) : item.quantity} pcs
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        Subtotal: <span className="font-bold text-[#b12704] text-[14px]">{formatCurrency(calculateSubtotal(item))}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h2 className="text-[14px] font-bold">Notes (Optional)</h2>
                                </div>
                                <div className="p-6">
                                    <textarea
                                        className="w-full p-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] resize-none"
                                        rows={3}
                                        placeholder="Any notes for this purchase order..."
                                        value={form.notes}
                                        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Summary */}
                        <div className="w-full lg:w-[280px] shrink-0 space-y-4">
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h3 className="text-[14px] font-bold">Order Summary</h3>
                                </div>
                                <div className="p-5 space-y-4">
                                    <Field label="Payment Method">
                                        <select className={selectCls} value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                                            <option value="cash">Cash</option>
                                            <option value="bank_transfer">Bank Transfer</option>
                                            <option value="online_payment">Online Payment</option>
                                        </select>
                                    </Field>

                                    <div className="border-t border-[#eee] pt-4 space-y-2">
                                        <div className="flex justify-between text-[13px] text-[#565959]">
                                            <span>Items ({items.length})</span>
                                            <span>{formatCurrency(lineTotal)}</span>
                                        </div>
                                        <div className="flex justify-between text-[15px] font-bold text-[#0f1111] pt-2 border-t border-[#eee]">
                                            <span>Total</span>
                                            <span className="text-[#c45500]">{formatCurrency(lineTotal)}</span>
                                        </div>
                                    </div>

                                    <Btn className="w-full h-[35px] text-[14px] justify-center" onClick={handleSave} loading={saving}>
                                        <Save size={14} /> Create Purchase
                                    </Btn>
                                    <button onClick={() => router.back()} className="w-full text-[12px] text-[#565959] hover:text-[#c45500] hover:underline text-center">
                                        Cancel
                                    </button>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-[4px] p-4 text-[12px] text-amber-700 leading-relaxed">
                                All prices and quantities should be verified before submitting this order.
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Success Modal */}
            {successOrder && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-[4px] border border-[#ddd] p-8 w-full max-w-sm shadow-xl text-center">
                        <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={24} className="text-emerald-600" />
                        </div>
                        <h3 className="text-[17px] font-bold text-[#111] mb-2">Purchase Created!</h3>
                        <p className="text-[13px] text-[#565959]">
                            Order <span className="font-bold text-[#111]">#{successOrder.purchase_number}</span> has been saved successfully.
                            {successOrder.status === 'RECEIVED' && (
                                <span className="block mt-2 text-[#c45500] font-medium italic">
                                    Inventory updated! This order is now in the "Received (Fulfilled)" tab.
                                </span>
                            )}
                        </p>
                        <div className="mt-6 space-y-3">
                            <button onClick={() => router.push('/admin/purchases')} className="w-full h-[31px] bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border border-[#a88734] rounded-[3px] text-[13px] font-medium">
                                View All Purchases
                            </button>
                            <button onClick={() => {
                                setSuccessOrder(null);
                                setForm({ ...EMPTY_FORM, purchase_number: `PO-${Date.now().toString().slice(-6)}` });
                                setItems([{ product: '', product_name: '', quantity: 1, unit_price: 0 }]);
                            }} className="w-full text-[13px] text-[#007185] hover:text-[#c45500] hover:underline">
                                Create Another
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
