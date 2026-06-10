"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    ShoppingCart, Plus, Trash2, X, CheckCircle, Package, ArrowLeft,
    RefreshCw, Save, Search, ChevronDown, User, Banknote, CreditCard,
    Printer, Loader2, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { productService, orderService, userService, companyService, inventoryService } from '@/lib/api';
import { formatCurrency, getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Modal } from '@/components/admin/ui';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - POS (ENTRY FORM STYLE)
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-indigo-600 border-indigo-600 hover:bg-indigo-700 hover:border-indigo-700 text-white shadow-sm shadow-indigo-600/20',
        secondary: 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 shadow-sm',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[32px] px-4 rounded-lg text-[13px] font-semibold border transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] ${styles[variant as keyof typeof styles]} ${className}`}>
            {children}
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
        </button>
    );
};

const Field = ({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="w-full">
        <label className="block text-[13px] font-bold text-slate-700 mb-1">{label}{required && <span className="text-rose-600 ml-0.5">*</span>}</label>
        {children}
    </div>
);

const inputCls = "w-full h-[38px] px-3 border border-slate-200 rounded-lg text-[13px] text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400 bg-white transition-all font-medium";
const selectCls = `${inputCls} cursor-pointer`;

type SaleItem = { 
    product: string; 
    product_name: string; 
    quantity: number; 
    unit_price: number;
    stock: number;
    weight?: string;
    size?: string;
};

/* ─── Searchable Product Selector (Interactive Input) ─── */
const ProductSelector = ({ selectedId, onSelect, products, inputCls }: any) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const filtered = products.filter((p: any) =>
        (p.product_name || p.name || '').toLowerCase().includes(search.toLowerCase()) ||
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

    // Sync search with selected value when closed
    useEffect(() => {
        if (!open) setSearch('');
    }, [open]);

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input
                    className={inputCls + " h-[42px] pl-10 pr-24 bg-white font-bold group-hover:bg-slate-50 transition-all"}
                    placeholder="Type product name or scan..."
                    value={open ? search : (selected ? ((selected.product_name || selected.name || '').replace(/\s*\(.*?\)\s*$/, '').trim()) : '')}
                    onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {selected && !open && (
                        <div className="flex flex-col items-end leading-none">
                            <span className="text-[8px] font-black uppercase text-slate-400">Available</span>
                            <span className={`text-[12px] font-black ${(selected.total_quantity || selected.stock_quantity || (typeof selected.stock === 'number' ? selected.stock : 0)) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {selected.total_quantity || selected.stock_quantity || (typeof selected.stock === 'number' ? selected.stock : 0)}
                            </span>
                        </div>
                    )}
                    <div className="w-px h-6 bg-slate-200 mx-1" />
                    <button 
                        type="button" 
                        onClick={() => setOpen(!open)}
                        className="p-1 hover:bg-slate-100 rounded-full transition-all cursor-pointer outline-none"
                    >
                        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>

            {open && (
                <div className="absolute top-[calc(100%+4px)] left-0 w-[calc(100vw-32px)] sm:w-[400px] md:w-[550px] bg-white border border-slate-200 rounded-xl shadow-2xl z-[1000] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="max-h-[350px] overflow-y-auto scrollbar-thin">
                        {filtered.length === 0 ? (
                            <div className="p-10 text-center bg-slate-50">
                                <Package className="mx-auto h-8 w-8 text-slate-200 mb-2" />
                                <p className="text-[13px] font-bold text-slate-400">No matching items in inventory</p>
                            </div>
                        ) : (
                            filtered.map((p: any) => (
                                <div
                                    key={p.id}
                                    onClick={() => { onSelect(p); setOpen(false); }}
                                    className="flex items-center gap-4 p-3 hover:bg-indigo-50/50 cursor-pointer transition-colors border-b last:border-0 border-slate-100 group"
                                >
                                    <div className="w-10 h-10 bg-white flex items-center justify-center rounded border border-slate-200 shrink-0 overflow-hidden group-hover:border-indigo-400/40 transition-colors">
                                        {(p.image || p.catalog_image) ? (
                                            <img src={getImageUrl(p.image || p.catalog_image)} className="max-w-full max-h-full object-cover" alt="" />
                                        ) : (
                                            <Package size={18} className="text-slate-200" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                                                    {(p.product_name || p.name || '').replace(/\s*\(.*?\)\s*$/, '').trim()}
                                                    {(p.weight || p.size) && (
                                                        <span className="ml-1.5 text-[10px] text-slate-500 font-normal">
                                                            ({p.weight || 'N/A'} - {p.size || 'N/A'})
                                                        </span>
                                                    )}
                                                    <span className={`ml-2 text-[11px] font-black ${(p.total_quantity || p.stock_quantity || 0) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        ({p.total_quantity || p.stock_quantity || 0})
                                                    </span>
                                                </p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">SKU: {p.sku || 'N/A'}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-[14px] font-black text-slate-900 tabular-nums">{formatCurrency(p.selling_price || p.price)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-2 bg-slate-50 border-t border-slate-100 flex justify-between items-center px-4">
                         <span className="text-[10px] font-bold text-slate-400 uppercase italic">Found {filtered.length} items</span>
                         <button onClick={() => setOpen(false)} className="text-[11px] font-black text-indigo-600 hover:text-indigo-700 hover:underline">Close List</button>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─── Searchable Customer Selector (Custom) ─── */
const CustomerSelector = ({ selectedId, onSelect, customers, inputCls }: any) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const filtered = customers.filter((c: any) =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search)) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
    );

    const selected = customers.find((c: any) => String(c.id) === String(selectedId));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getAvatarUrl = (path: string | null) => getImageUrl(path);

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative group">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600" />
                <input
                    className={inputCls + " pl-10 pr-10 cursor-pointer"}
                    placeholder="Search customer account..."
                    value={open ? search : (selected ? `${selected.first_name} ${selected.last_name}` : '')}
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
                            <span className="text-[13px] font-bold text-slate-500 italic">Walk-in Customer (No Account)</span>
                        </div>
                        {filtered.map((c: any) => (
                            <div
                                key={c.id}
                                onClick={() => { onSelect(c); setOpen(false); }}
                                className="flex items-center gap-3 p-3 hover:bg-indigo-50/50 cursor-pointer border-b last:border-0 border-slate-100"
                            >
                                <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                                    {c.avatar ? (
                                        <img src={getAvatarUrl(c.avatar)} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-[12px] font-black text-slate-400">{c.first_name?.[0]}{c.last_name?.[0]}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold text-slate-900 truncate">{c.first_name} {c.last_name}</p>
                                    <p className="text-[10px] text-slate-500 font-medium">Ph: {c.phone || 'N/A'} | {c.email}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function SaleEntryPage() {
    const router = useRouter();
    const [products, setProducts] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    
    // Form and Items State
    const [orderNumber, setOrderNumber] = useState(`SAL-${Date.now().toString().slice(-6)}`);
    const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
    const [customerId, setCustomerId] = useState<string>('');
const [warehouseId, setWarehouseId] = useState<string>('');
    const [guestName, setGuestName] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [items, setItems] = useState<SaleItem[]>([{ product: '', product_name: '', quantity: 1, unit_price: 0, stock: 0, weight: '', size: '' }]);
    
    const [stockError, setStockError] = useState<string | null>(null);
    const [warehouseStock, setWarehouseStock] = useState<any[]>([]);
    const [successOrder, setSuccessOrder] = useState<any | null>(null);

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [p, u, w] = await Promise.all([
                productService.getAll?.({ all_items: 'true' } as any) ?? Promise.resolve([]),
                companyService.getCustomers().catch(() => []) ?? Promise.resolve([]),
                inventoryService.getWarehouses().catch(() => [])
            ]);
            const prodArray = Array.isArray(p) ? p : (p as any)?.results || [];
            
            // Only show ACTIVE products
            setProducts(prodArray.filter((prod: any) => 
                (prod.status === 'ACTIVE' || !prod.status)
            ));
            
            const userArray = Array.isArray(u) ? u : (u as any)?.results || [];
            setUsers(userArray);

            const whArray = Array.isArray(w) ? w : (w as any)?.results || [];
            setWarehouses(whArray);

            // LIVE SYNC: If a warehouse is selected, refresh its specific stock levels too
            if (warehouseId) {
                const stockRes = await inventoryService.getInventory({ warehouse: warehouseId }).catch(() => []);
                const stockData = Array.isArray(stockRes) ? stockRes : (stockRes as any)?.results || [];
                setWarehouseStock(stockData);

                // Update current bill items with latest stock levels from the selected warehouse
                setItems(prev => prev.map(item => {
                    if (!item.product) return item;
                    const ws = stockData.find((s: any) => 
                        (s.product_name?.toLowerCase().trim() === item.product_name?.toLowerCase().trim()) &&
                        (s.weight === item.weight || (!s.weight && !item.weight)) &&
                        (s.size === item.size || (!s.size && !item.size))
                    );
                    return { ...item, stock: ws ? ws.total_quantity : 0 };
                }));
            }
        } catch { 
            if (!silent) toast.error('Failed to sync catalog'); 
        } finally { 
            setLoading(false); 
        }
    }, [warehouseId]); 

    useEffect(() => { loadData(); }, [loadData]);

    // Default warehouse selection - only runs when warehouses are loaded and none is selected
    useEffect(() => {
        if (warehouses.length > 0 && !warehouseId) {
            setWarehouseId(String(warehouses[0].id));
        }
    }, [warehouses]); // Remove warehouseId from dependencies to only auto-select once when list arrives


    // Live Telemetry: Auto-update catalog every 10 seconds to keep stock in sync
    useEffect(() => {
        const timer = setInterval(() => {
            if (!loading && !saving) {
                loadData(true);
            }
        }, 10000); // Increased to 10s to reduce terminal activity/noise
        return () => clearInterval(timer);
    }, [loading, saving, loadData]);

    const addItem = () => setItems(prev => [...prev, { product: '', product_name: '', quantity: 1, unit_price: 0, stock: 0, weight: '', size: '' }]);
    
    const removeItem = (i: number) => {
        if (items.length > 1) setItems(prev => prev.filter((_, idx) => idx !== i));
        else setItems([{ product: '', product_name: '', quantity: 1, unit_price: 0, stock: 0, weight: '', size: '' }]);
    };

    const updateItem = (i: number, pInfo: any) => {
        setItems(prev => prev.map((item, idx) => {
            if (idx !== i) return item;
            return {
                ...item,
                product: String(pInfo.id),
                product_name: pInfo.product_name || pInfo.name,
                unit_price: parseFloat(pInfo.selling_price || pInfo.price || 0),
                stock: pInfo.total_quantity || pInfo.stock_quantity || (typeof pInfo.stock === 'number' ? pInfo.stock : 0),
                quantity: 1,
                weight: pInfo.weight,
                size: pInfo.size
            };
        }));
    };

    const updateQty = (i: number, val: number) => {
        const inputVal = isNaN(val) ? 0 : val;
        setItems(prev => prev.map((item, idx) => {
            if (idx !== i) return item;
            const maxStock = parseInt(item.stock as any) || 0;
            // Allow 0 temporarily for typing, but clamp the upper limit
            const capped = Math.min(inputVal, maxStock > 0 ? maxStock : 999999);
            if (inputVal > maxStock && maxStock > 0) {
                toast.error(`Only ${maxStock} units in stock`, { id: `stock-err-${i}` });
            }
            return { ...item, quantity: capped };
        }));
    };

    const totalBill = items.reduce((sum, item) => {
        const qty = parseInt(item.quantity as any) || 0;
        const price = parseFloat(item.unit_price as any) || 0;
        return sum + (qty * price);
    }, 0);

    const handleSave = async () => {
        setShowConfirm(false);
        setSaving(true);
        try {
            const payload = {
                customer: customerId || null,
                customer_name: customerId 
                    ? (users.find(u => String(u.id) === String(customerId))?.full_name || 'Registered Customer') 
                    : (guestName || 'Walk-in Customer'),
                shipping_address: 'Walk-in Store Selection',
                phone_number: 'N/A',
                notes: `POS Gen: ${orderNumber}`,
                status: 'DELIVERED',
                payment_method: paymentMethod === 'cash' ? 'SHOP' : 'ONLINE',
                warehouse_id: warehouseId,
                items: items.map(i => ({ 
                    id: i.product, 
                    quantity: i.quantity, 
                    price: i.unit_price 
                }))
            };
            const data = await orderService.create(payload);
            setSuccessOrder(data);
            toast.success('Sale finalized!');
        } catch (err: any) { 
            console.error(err);
            const data = err.response?.data;
            let msg = 'Failed to save sale';
            if (typeof data === 'string') msg = data;
            else if (Array.isArray(data)) msg = data[0];
            else if (typeof data === 'object' && data !== null) {
                const val = data.detail || data.error || data.message || Object.values(data)[0];
                msg = Array.isArray(val) ? val[0] : (typeof val === 'string' ? val : JSON.stringify(val));
            }
            
            if (msg.toLowerCase().includes('stock') || msg.toLowerCase().includes('registered')) {
                setStockError(msg);
            } else {
                toast.error(msg);
            }
        } finally { setSaving(false); }
    };

    if (successOrder) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center p-4 text-left">
                <Card className="p-12 max-w-lg w-full text-center animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 text-emerald-600 border border-emerald-100 shadow-sm"><CheckCircle size={40} /></div>
                    <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Order Billed!</h2>
                    <p className="text-[14px] text-slate-600 mt-2 mb-8">Reference <span className="font-bold text-slate-900">#{successOrder.order_number}</span> has been saved.</p>
                    <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-6 mb-8 text-left">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                            <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Total Received</span>
                            <span className="text-[26px] font-black text-slate-900 tabular-nums">{formatCurrency(successOrder.total_amount)}</span>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <Btn variant="secondary" className="flex-1 h-[40px] font-bold" onClick={() => router.push(`/admin/sales/${successOrder.id}/invoice`)}><Printer size={18} /> View Invoice</Btn>
                        <Btn className="flex-1 h-[40px] font-bold" onClick={() => { setSuccessOrder(null); setItems([{ product: '', product_name: '', quantity: 1, unit_price: 0, stock: 0, weight: '', size: '' }]); setOrderNumber(`SAL-${Date.now().toString().slice(-6)}`); }}><Plus size={18} /> New Bill</Btn>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="pb-20 text-left text-slate-800">
            <div className="max-w-[1200px] mx-auto px-0 sm:px-6 pt-1 sm:pt-5">

                <PageHeader
                    title="Point of Sale"
                    breadcrumbs={[
                        { label: 'Console', href: '/admin/dashboard' },
                        { label: 'Sales History', href: '/admin/sales' },
                        { label: 'New Sale' },
                    ]}
                />

                {loading ? (
                    <div className="text-center py-20 text-[13px] text-slate-500 font-medium animate-pulse flex flex-col items-center gap-4">
                        <Loader2 size={32} className="animate-spin text-indigo-600" />
                        Syncing Terminal Catalog...
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-8 items-start">

                        {/* LEFT: Sale Entry Form */}
                        <div className="flex-1 min-w-0 space-y-6">

                            {/* Order Info Panel */}
                            <Card className="overflow-visible animate-in fade-in slide-in-from-top-2">
                                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl">
                                    <h2 className="text-[13px] sm:text-[14px] font-bold uppercase tracking-wider text-slate-700">Order Details</h2>
                                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium italic">Choose customer and how they will pay.</p>
                                </div>
                                <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Order Number" required>
                                        <input className={inputCls} value={orderNumber} onChange={e => setOrderNumber(e.target.value)} />
                                    </Field>
                                    <Field label="Customer Account">
                                        <CustomerSelector 
                                            selectedId={customerId}
                                            customers={users}
                                            inputCls={inputCls}
                                            onSelect={(c: any) => {
                                                if (c) {
                                                    setCustomerId(c.id.toString());
                                                    setGuestName('');
                                                } else {
                                                    setCustomerId('');
                                                }
                                            }}
                                        />
                                    </Field>
                                    <Field label="Walk-in Name">
                                        <input className={inputCls} value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="e.g. Adnan Ali" />
                                    </Field>
                                    <Field label="Source Warehouse" required>
                                        <select className={selectCls} value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                                            <option value="">Choose Warehouse...</option>
                                            {warehouses.map(w => (
                                                <option key={w.id} value={String(w.id)}>{w.name} ({w.location})</option>
                                            ))}
                                        </select>
                                    </Field>
                                </div>
                            </Card>

                            {/* Line Items Detail */}
                            <Card className="relative z-[10] overflow-visible animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between rounded-t-2xl">
                                    <div>
                                        <h2 className="text-[13px] sm:text-[14px] font-bold uppercase tracking-wider text-slate-700">Sale Items</h2>
                                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium italic">Add products and how many to sell.</p>
                                    </div>
                                    <Btn variant="secondary" onClick={addItem} className="font-bold"><Plus size={14} /> Add Item</Btn>
                                </div>
                                <div className="p-3 sm:p-6 space-y-3">
                                    {/* Desktop Table Header - hidden on mobile */}
                                    <div className="hidden sm:grid grid-cols-12 gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-1">
                                        <div className="col-span-6">Choose Product</div>
                                        <div className="col-span-2 text-center">Qty</div>
                                        <div className="col-span-3 text-right">Subtotal</div>
                                        <div className="col-span-1 text-center font-bold">Del</div>
                                    </div>
                                    
                                    {items.map((item, i) => (
                                        <div key={i} className="bg-slate-50/60 border border-slate-200/70 rounded-xl p-3 transition-all hover:border-slate-300 animate-in slide-in-from-left-2 duration-300">
                                            {/* Mobile Card Layout */}
                                            <div className="flex items-start gap-2 sm:hidden">
                                                <div className="flex-1 min-w-0">
                                                    <ProductSelector
                                                        selectedId={item.product}
                                                        products={products.map(p => {
                                                            const ws = warehouseStock.find((s: any) =>
                                                                (s.product_name?.toLowerCase() === p.product_name?.toLowerCase()) &&
                                                                (s.weight === p.weight || (!s.weight && !p.weight)) &&
                                                                (s.size === p.size || (!s.size && !p.size))
                                                            );
                                                            return { ...p, total_quantity: ws ? ws.total_quantity : 0, weight: p.weight, size: p.size };
                                                        })}
                                                        inputCls={selectCls}
                                                        onSelect={(p: any) => updateItem(i, p)}
                                                    />
                                                </div>
                                                <button onClick={() => removeItem(i)} className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-full hover:bg-rose-50 shrink-0 mt-1">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between mt-2 sm:hidden">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">Qty:</span>
                                                    <input
                                                        className={"w-16 h-[28px] px-2 border border-slate-200 rounded-lg text-[13px] outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 text-center font-black text-indigo-600 bg-white transition-all"}
                                                        type="number" min="1"
                                                        value={item.quantity || ''}
                                                        onChange={e => updateQty(i, parseInt(e.target.value))}
                                                    />
                                                    {(parseInt(item.stock as any) > 0) && <span className="text-[9px] font-bold text-slate-400">/{item.stock}</span>}
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[15px] font-black text-slate-900 tabular-nums">{formatCurrency(item.unit_price * item.quantity)}</div>
                                                    {item.product && <div className="text-[9px] text-slate-400 font-bold uppercase">@{formatCurrency(item.unit_price)}</div>}
                                                </div>
                                            </div>

                                            {/* Desktop Row Layout */}
                                            <div className="hidden sm:grid grid-cols-12 gap-3 items-center">
                                                <div className="col-span-6">
                                                    <ProductSelector
                                                        selectedId={item.product}
                                                        products={products.map(p => {
                                                            const ws = warehouseStock.find((s: any) =>
                                                                (s.product_name?.toLowerCase() === p.product_name?.toLowerCase()) &&
                                                                (s.weight === p.weight || (!s.weight && !p.weight)) &&
                                                                (s.size === p.size || (!s.size && !p.size))
                                                            );
                                                            return { ...p, total_quantity: ws ? ws.total_quantity : 0, weight: p.weight, size: p.size };
                                                        })}
                                                        inputCls={selectCls}
                                                        onSelect={(p: any) => updateItem(i, p)}
                                                    />
                                                </div>
                                                <div className="col-span-2 relative">
                                                    <input
                                                        className={inputCls + " text-center font-black text-indigo-600"}
                                                        type="number" min="1"
                                                        value={item.quantity || ''}
                                                        onChange={e => updateQty(i, parseInt(e.target.value))}
                                                    />
                                                    {(parseInt(item.stock as any) > 0) && <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-400 whitespace-nowrap uppercase tracking-tighter">Max: {item.stock}</span>}
                                                </div>
                                                <div className="col-span-3 text-right">
                                                    <div className="text-[16px] font-black text-slate-900 tabular-nums whitespace-nowrap">{formatCurrency(item.unit_price * item.quantity)}</div>
                                                    {item.product && <div className="text-[10px] text-slate-400 font-bold uppercase">@{formatCurrency(item.unit_price)}</div>}
                                                </div>
                                                <div className="col-span-1 flex justify-center">
                                                    <button onClick={() => removeItem(i)} className="text-slate-400 hover:text-rose-600 transition-colors p-2 rounded-full hover:bg-rose-50">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {items.length === 0 && (
                                        <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-300">
                                            <ShoppingCart size={40} className="mx-auto mb-2 opacity-20" />
                                            <p className="text-[13px] italic">No items yet. Click "Add Item" to begin billing.</p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>

                        {/* RIGHT: Bill Summary */}
                        <div className="w-full lg:w-[350px] shrink-0 animate-in slide-in-from-right-4 duration-500">
                            <Card className="overflow-hidden lg:sticky lg:top-4">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                                    <h3 className="text-[14px] font-bold uppercase tracking-widest text-slate-900">Bill Summary</h3>
                                </div>
                                
                                <div className="p-6 space-y-6">
                                    {/* Payment Method Selector */}
                                    <div>
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-3">Payment Mode</label>
                                        <div className="flex p-1 bg-slate-100 rounded-lg gap-1">
                                            <button
                                                onClick={() => setPaymentMethod('cash')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-[12px] font-bold transition-all ${paymentMethod === 'cash' ? 'bg-white text-slate-900 shadow-sm scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                <Banknote size={16} className={paymentMethod === 'cash' ? 'text-emerald-600' : ''} />
                                                Cash
                                            </button>
                                            <button
                                                onClick={() => setPaymentMethod('card')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-[12px] font-bold transition-all ${paymentMethod === 'card' ? 'bg-white text-slate-900 shadow-sm scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                <CreditCard size={16} className={paymentMethod === 'card' ? 'text-sky-600' : ''} />
                                                Card
                                            </button>
                                        </div>
                                    </div>

                                    {/* Financial Breakdown */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-[14px] text-slate-600">
                                            <span>Subtotal ({items.reduce((a,b)=>a+(b.product?b.quantity:0), 0)} items)</span>
                                            <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(totalBill)}</span>
                                        </div>
                                        <div className="flex justify-between text-[14px] text-slate-600">
                                            <span>Service Tax</span>
                                            <span className="text-slate-400 tabular-nums">{formatCurrency(0)}</span>
                                        </div>
                                        <div className="h-px bg-slate-100 my-2" />
                                        <div className="flex justify-between items-center pt-2">
                                            <div>
                                                <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Grand Total</p>
                                                <p className="text-[24px] font-bold text-slate-900 tabular-nums">
                                                    {formatCurrency(totalBill)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        onClick={() => {
                                            if (items.some(i => !i.product)) return toast.error('Please select items for the sale');
                                            if (items.some(i => (i.quantity || 0) < 1)) return toast.error('All quantities must be at least 1');
                                            if (!warehouseId) return toast.error('Please select a source warehouse');
                                            setShowConfirm(true);
                                        }}
                                        disabled={items.some(i => !i.product) || items.length === 0 || saving}
                                        className="w-full"
                                    >
                                        {saving ? <RefreshCw className="animate-spin" size={20} /> : "Finalize & Bill"}
                                    </Button>
                                    
                                    <div className="flex items-center gap-2 justify-center py-2 bg-slate-50/60 rounded-lg border border-slate-100">
                                        <ShieldCheck size={16} className="text-emerald-600" />
                                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Secure Store Checkout</span>
                                    </div>
                                </div>
                            </Card>

                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 animate-in fade-in duration-1000 mt-4">
                                <div className="flex gap-3 items-start">
                                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                                    <div className="text-[12px] leading-relaxed text-slate-600">
                                        <p className="font-bold text-slate-900 uppercase tracking-tighter mb-1">Stock Update</p>
                                        Selling these items will lower your stock levels immediately.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Confirmation Modal ── */}
            <Modal
                open={showConfirm}
                onClose={() => setShowConfirm(false)}
                title="Confirm Sale"
                size="sm"
                footer={
                    <div className="w-full space-y-3">
                        <Button variant="primary" onClick={handleSave} className="w-full">
                            Yes, Complete Sale
                        </Button>
                        <button
                            onClick={() => setShowConfirm(false)}
                            className="w-full text-[13px] text-indigo-600 hover:text-indigo-700 hover:underline font-bold"
                        >
                            Cancel & Review
                        </button>
                    </div>
                }
            >
                <div className="text-center">
                    <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100 text-amber-600">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-[18px] font-bold text-slate-900 mb-2">Finalize this order?</h3>
                    <p className="text-[13px] text-slate-600 leading-relaxed">
                        You are about to process a total of <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(totalBill)}</span> for {items.length} items.
                    </p>
                </div>
            </Modal>

            {/* ── Stock Error Modal ── */}
            <Modal
                open={!!stockError}
                onClose={() => setStockError(null)}
                title="Inventory Issue"
                size="md"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setStockError(null)}>
                            Dismiss
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => {
                                setStockError(null);
                                // Focus the warehouse selector if possible
                                const whSelect = document.querySelector('select[value="' + warehouseId + '"]');
                                (whSelect as any)?.focus();
                            }}
                        >
                            Change Warehouse
                        </Button>
                    </>
                }
            >
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 shrink-0">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-[18px] font-bold text-slate-900 tracking-tight">Stock unavailable</h3>
                </div>

                <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 mb-6">
                    <p className="text-[14px] text-rose-700 font-bold leading-relaxed">
                        {stockError}
                    </p>
                </div>

                <p className="text-[13px] text-slate-600">
                    The current warehouse doesn't have enough units for this order. Please try selecting a different warehouse or adjust the quantities.
                </p>
            </Modal>
        </div>
    );
}
