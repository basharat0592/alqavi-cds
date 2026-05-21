"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
    ShoppingCart, Plus, Trash2, X, CheckCircle, Package, ArrowLeft, 
    ChevronRight, RefreshCw, Save, Search, ChevronDown, User, Banknote, CreditCard,
    Printer, Loader2, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { productService, orderService, userService, companyService, inventoryService } from '@/lib/api';
import { formatCurrency, getImageUrl } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - POS (ENTRY FORM STYLE)
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] shadow-sm',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111] shadow-sm',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] ${styles[variant as keyof typeof styles]} ${className}`}>
            {children}
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
        </button>
    );
};

const Field = ({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="w-full">
        <label className="block text-[13px] font-bold text-[#0f1111] mb-1">{label}{required && <span className="text-red-600 ml-0.5">*</span>}</label>
        {children}
    </div>
);

const inputCls = "w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all font-medium";
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
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#e77600] transition-colors" />
                <input
                    className={inputCls + " h-[42px] pl-10 pr-24 bg-white font-bold group-hover:bg-[#fcfdff] transition-all"}
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
                <div className="absolute top-[calc(100%+4px)] left-0 w-[400px] sm:w-[550px] bg-white border border-slate-300 rounded-[6px] shadow-2xl z-[1000] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
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
                                    className="flex items-center gap-4 p-3 hover:bg-[#f3f7f7] cursor-pointer transition-colors border-b last:border-0 border-slate-100 group"
                                >
                                    <div className="w-10 h-10 bg-white flex items-center justify-center rounded border border-slate-200 shrink-0 overflow-hidden group-hover:border-[#e77600]/40 transition-colors">
                                        {(p.image || p.catalog_image) ? (
                                            <img src={getImageUrl(p.image || p.catalog_image)} className="max-w-full max-h-full object-cover" alt="" />
                                        ) : (
                                            <Package size={18} className="text-slate-200" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-bold text-[#111] truncate group-hover:text-[#c45500] transition-colors">
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
                                                <p className="text-[14px] font-black text-[#B12704]">{formatCurrency(p.selling_price || p.price)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-2 bg-slate-50 border-t flex justify-between items-center px-4">
                         <span className="text-[10px] font-bold text-slate-400 uppercase italic">Found {filtered.length} items</span>
                         <button onClick={() => setOpen(false)} className="text-[11px] font-black text-[#007185] hover:underline">Close List</button>
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
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#e77600]" />
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
                <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-slate-300 rounded-[6px] shadow-2xl z-[1001] overflow-hidden">
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
                                className="flex items-center gap-3 p-3 hover:bg-[#f3f7f7] cursor-pointer border-b last:border-0 border-slate-100"
                            >
                                <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                                    {c.avatar ? (
                                        <img src={getAvatarUrl(c.avatar)} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-[12px] font-black text-slate-400">{c.first_name?.[0]}{c.last_name?.[0]}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold text-[#111] truncate">{c.first_name} {c.last_name}</p>
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
        } catch { 
            if (!silent) toast.error('Failed to sync catalog'); 
        } finally { 
            setLoading(false); 
        }
    }, [warehouseId]); // Added warehouseId to dependencies to avoid stale closures if needed later

    useEffect(() => { loadData(); }, [loadData]);

    // Default warehouse selection - only runs when warehouses are loaded and none is selected
    useEffect(() => {
        if (warehouses.length > 0 && !warehouseId) {
            setWarehouseId(String(warehouses[0].id));
        }
    }, [warehouses]); // Remove warehouseId from dependencies to only auto-select once when list arrives

    useEffect(() => {
        if (warehouseId) {
            inventoryService.getInventory({ warehouse: warehouseId }).then(data => {
                const stockData = Array.isArray(data) ? data : (data as any)?.results || [];
                setWarehouseStock(stockData);

                // IMPORTANT: Synchronize stock for all items already in the bill
                setItems(prev => prev.map(item => {
                    if (!item.product) return item;
                    
                    // Match by name, weight, and size to ensure accurate stock for specific variants
                    const ws = stockData.find((s: any) => 
                        (s.product_name?.toLowerCase().trim() === item.product_name?.toLowerCase().trim()) &&
                        (s.weight === item.weight || (!s.weight && !item.weight)) &&
                        (s.size === item.size || (!s.size && !item.size))
                    );

                    return {
                        ...item,
                        stock: ws ? ws.total_quantity : 0
                    };
                }));
            }).catch(() => {
                setWarehouseStock([]);
                // Reset stock to 0 if inventory fetch fails
                setItems(prev => prev.map(item => ({ ...item, stock: 0 })));
            });
        } else {
            setWarehouseStock([]);
            setItems(prev => prev.map(item => ({ ...item, stock: 0 })));
        }
    }, [warehouseId]);

    // Live Telemetry: Auto-update catalog every 2 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            if (!loading && !saving) {
                loadData(true);
            }
        }, 2000);
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
            <div className="bg-[#F8F9FA] min-h-screen flex items-center justify-center p-4 font-sans text-left">
                <div className="bg-white border border-[#ddd] rounded-[4px] p-12 max-w-lg w-full text-center shadow-xl animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 text-green-600 border border-green-100 shadow-sm"><CheckCircle size={40} /></div>
                    <h2 className="text-[28px] font-normal text-[#111]">Order Billed!</h2>
                    <p className="text-[14px] text-[#565959] mt-2 mb-8">Reference <span className="font-bold text-[#111]">#{successOrder.order_number}</span> has been saved.</p>
                    <div className="bg-[#fcfdff] border border-[#eee] rounded-[4px] p-6 mb-8 text-left shadow-inner">
                        <div className="flex justify-between items-center pb-4 border-b border-[#eee]">
                            <span className="text-[12px] font-bold text-[#565959] uppercase tracking-wider">Total Received</span>
                            <span className="text-[26px] font-black text-[#B12704] font-mono">{formatCurrency(successOrder.total_amount)}</span>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <Btn variant="secondary" className="flex-1 h-[40px] font-bold" onClick={() => router.push(`/admin/sales/${successOrder.id}/invoice`)}><Printer size={18} /> View Invoice</Btn>
                        <Btn className="flex-1 h-[40px] font-bold" onClick={() => { setSuccessOrder(null); setItems([{ product: '', product_name: '', quantity: 1, unit_price: 0, stock: 0, weight: '', size: '' }]); setOrderNumber(`SAL-${Date.now().toString().slice(-6)}`); }}><Plus size={18} /> New Bill</Btn>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-left text-[#0f1111]">
            <div className="max-w-[1200px] mx-auto px-6 pt-5">

                {/* ── Breadcrumb ── */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <Link href="/admin/sales" className="hover:text-[#c45500] hover:underline">Sales History</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500] font-bold">New Sale</span>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-[22px] font-normal text-[#111]">New Sale Entry</h1>
                    <button onClick={() => router.back()} className="text-[13px] text-[#007185] hover:text-[#c45500] hover:underline flex items-center gap-1 font-medium transition-all group">
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back
                    </button>
                </div>
                <div className="border-b border-[#ddd] mb-6" />

                {loading ? (
                    <div className="text-center py-20 text-[13px] text-[#565959] font-medium animate-pulse flex flex-col items-center gap-4">
                        <Loader2 size={32} className="animate-spin text-[#c45500]" />
                        Syncing Terminal Catalog...
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-8 items-start">

                        {/* LEFT: Sale Entry Form */}
                        <div className="flex-1 min-w-0 space-y-6">

                            {/* Order Info Panel */}
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm animate-in fade-in slide-in-from-top-2">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h2 className="text-[14px] font-black uppercase tracking-wider text-slate-600">Order Details</h2>
                                    <p className="text-[11px] text-[#565959] mt-1 font-medium italic">Choose customer and how they will pay.</p>
                                </div>
                                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                            </div>

                            {/* Line Items Detail */}
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm relative z-[10] animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa] flex items-center justify-between">
                                    <div>
                                        <h2 className="text-[14px] font-black uppercase tracking-wider text-slate-600">Sale Items</h2>
                                        <p className="text-[11px] text-[#565959] mt-1 font-medium italic">Add products and how many to sell.</p>
                                    </div>
                                    <Btn variant="secondary" onClick={addItem} className="font-bold"><Plus size={14} /> Add Item</Btn>
                                </div>
                                <div className="p-6 space-y-4">
                                    {/* Table Header */}
                                    <div className="grid grid-cols-12 gap-3 text-[10px] font-black text-[#565959] uppercase tracking-[0.1em] px-1 pb-1">
                                        <div className="col-span-6">Choose Product</div>
                                        <div className="col-span-2 text-center">Qty</div>
                                        <div className="col-span-3 text-right">Subtotal</div>
                                        <div className="col-span-1 text-center font-bold">Del</div>
                                    </div>
                                    
                                    {items.map((item, i) => (
                                        <div key={i} className="grid grid-cols-12 gap-3 items-center bg-[#fcfdff] border border-[#eee] rounded-[3px] p-3 transition-all hover:border-[#aaa]/50 group animate-in slide-in-from-left-2 duration-300">
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
                                                            total_quantity: ws ? ws.total_quantity : 0,
                                                            weight: p.weight,
                                                            size: p.size
                                                        };
                                                    })}
                                                    inputCls={selectCls}
                                                    onSelect={(p: any) => updateItem(i, p)}
                                                />
                                            </div>
                                            <div className="col-span-2 relative">
                                                <input 
                                                    className={inputCls + " text-center font-black text-[#c45500]"} 
                                                    type="number" 
                                                    min="1" 
                                                    value={item.quantity || ''} 
                                                    onChange={e => updateQty(i, parseInt(e.target.value))} 
                                                />
                                                {(parseInt(item.stock as any) > 0) && <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-400 whitespace-nowrap uppercase tracking-tighter">Max: {item.stock}</span>}
                                            </div>
                                            <div className="col-span-3 text-right">
                                                <div className="text-[16px] font-black text-[#B12704] font-mono whitespace-nowrap">{formatCurrency(item.unit_price * item.quantity)}</div>
                                                {item.product && <div className="text-[10px] text-[#888] font-bold uppercase">@{formatCurrency(item.unit_price)}</div>}
                                            </div>
                                            <div className="col-span-1 flex justify-center">
                                                <button onClick={() => removeItem(i)} className="text-[#bbb] hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {items.length === 0 && (
                                        <div className="py-10 text-center border-2 border-dashed border-[#eee] rounded-[4px] text-slate-300">
                                            <ShoppingCart size={40} className="mx-auto mb-2 opacity-20" />
                                            <p className="text-[13px] italic">No items yet. Click "Add Item" to begin billing.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Bill Summary */}
                        <div className="w-full lg:w-[350px] shrink-0 animate-in slide-in-from-right-4 duration-500">
                            <div className="bg-white border border-[#ddd] rounded-[8px] shadow-sm overflow-hidden sticky top-4">
                                <div className="px-6 py-4 border-b border-[#eee] bg-slate-50/50">
                                    <h3 className="text-[14px] font-bold uppercase tracking-widest text-[#111]">Bill Summary</h3>
                                </div>
                                
                                <div className="p-6 space-y-6">
                                    {/* Payment Method Selector */}
                                    <div>
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-3">Payment Mode</label>
                                        <div className="flex p-1 bg-slate-100 rounded-lg gap-1">
                                            <button 
                                                onClick={() => setPaymentMethod('cash')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-[12px] font-bold transition-all ${paymentMethod === 'cash' ? 'bg-white text-[#111] shadow-sm scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                <Banknote size={16} className={paymentMethod === 'cash' ? 'text-emerald-600' : ''} />
                                                Cash
                                            </button>
                                            <button 
                                                onClick={() => setPaymentMethod('card')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-[12px] font-bold transition-all ${paymentMethod === 'card' ? 'bg-white text-[#111] shadow-sm scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                <CreditCard size={16} className={paymentMethod === 'card' ? 'text-blue-600' : ''} />
                                                Card
                                            </button>
                                        </div>
                                    </div>

                                    {/* Financial Breakdown */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-[14px] text-slate-600">
                                            <span>Subtotal ({items.reduce((a,b)=>a+(b.product?b.quantity:0), 0)} items)</span>
                                            <span className="font-bold text-[#111]">{formatCurrency(totalBill)}</span>
                                        </div>
                                        <div className="flex justify-between text-[14px] text-slate-600">
                                            <span>Service Tax</span>
                                            <span className="text-slate-400">{formatCurrency(0)}</span>
                                        </div>
                                        <div className="h-px bg-slate-100 my-2" />
                                        <div className="flex justify-between items-center pt-2">
                                            <div>
                                                <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Grand Total</p>
                                                <p className="text-[24px] font-bold text-[#B12704]">
                                                    {formatCurrency(totalBill)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <button 
                                        onClick={() => {
                                            if (items.some(i => !i.product)) return toast.error('Please select items for the sale');
                                            if (items.some(i => (i.quantity || 0) < 1)) return toast.error('All quantities must be at least 1');
                                            if (!warehouseId) return toast.error('Please select a source warehouse');
                                            setShowConfirm(true);
                                        }} 
                                        disabled={items.some(i => !i.product) || items.length === 0 || saving} 
                                        className="w-full py-3 px-4 bg-[#f0c14b] hover:bg-[#f7ca00] text-[#111] rounded-[4px] font-bold text-[14px] transition-all border border-[#a88734] flex items-center justify-center gap-2"
                                    >
                                        {saving ? <RefreshCw className="animate-spin" size={20} /> : "Finalize & Bill"}
                                    </button>
                                    
                                    <div className="flex items-center gap-2 justify-center py-2 bg-slate-50/50 rounded-lg border border-slate-100">
                                        <ShieldCheck size={16} className="text-emerald-600" />
                                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Secure Store Checkout</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#fff4e5] border border-[#ffb347]/30 rounded-[4px] p-5 shadow-sm animate-in fade-in duration-1000 mt-4">
                                <div className="flex gap-3 items-start">
                                    <AlertTriangle className="text-[#e47911] shrink-0 mt-0.5" size={18} />
                                    <div className="text-[12px] leading-relaxed">
                                        <p className="font-bold text-[#111] uppercase tracking-tighter mb-1">Stock Update</p>
                                        Selling these items will lower your stock levels immediately.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Confirmation Modal ── */}
            {showConfirm && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4">
                    <div className="bg-white rounded-[4px] border border-[#ddd] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 text-left">
                        <div className="bg-[#f6f6f6] px-5 py-3 border-b border-[#ddd] flex items-center justify-between">
                            <span className="text-[12px] font-bold text-[#111] uppercase tracking-tighter">Confirm Sale</span>
                            <button onClick={() => setShowConfirm(false)} className="text-[#888] hover:text-[#111]"><X size={18} /></button>
                        </div>
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100 text-amber-600">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-[18px] font-bold text-[#111] mb-2">Finalize this order?</h3>
                            <p className="text-[13px] text-[#565959] leading-relaxed">
                                You are about to process a total of <span className="font-bold text-[#B12704]">{formatCurrency(totalBill)}</span> for {items.length} items.
                            </p>
                            <div className="mt-8 space-y-3">
                                <button 
                                    onClick={handleSave} 
                                    className="w-full h-[35px] bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border border-[#a88734] rounded-[2px] text-[13px] font-bold text-[#111] shadow-sm hover:from-[#f5d78e] hover:to-[#eeb933]"
                                >
                                    Yes, Complete Sale
                                </button>
                                <button 
                                    onClick={() => setShowConfirm(false)}
                                    className="w-full text-[13px] text-[#007185] hover:text-[#c45500] hover:underline font-bold"
                                >
                                    Cancel & Review
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* ── Stock Error Modal ── */}
            {stockError && (
                <div className="fixed inset-0 bg-[#00000080] flex items-center justify-center z-[2000] p-4 backdrop-blur-[2px] animate-in fade-in duration-200">
                    <div className="bg-white rounded-[8px] w-full max-w-[440px] shadow-2xl border border-[#ddd] overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 shrink-0">
                                    <AlertTriangle size={24} />
                                </div>
                                <h3 className="text-[21px] font-medium text-[#111]">Inventory Issue</h3>
                            </div>
                            
                            <div className="bg-[#fff4f4] border border-[#f5c2c2] rounded-[4px] p-4 mb-6">
                                <p className="text-[14px] text-[#c40000] font-bold leading-relaxed">
                                    {stockError}
                                </p>
                            </div>

                            <p className="text-[13px] text-[#565959] mb-8">
                                The current warehouse doesn't have enough units for this order. Please try selecting a different warehouse or adjust the quantities.
                            </p>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#eee]">
                                <button 
                                    onClick={() => setStockError(null)}
                                    className="px-6 py-2 text-[13px] font-medium text-[#111] bg-white border border-[#adb1b8] rounded-[3px] shadow-sm hover:bg-[#f7fafa] transition-colors active:bg-[#edf0f3]"
                                >
                                    Dismiss
                                </button>
                                <button 
                                    onClick={() => {
                                        setStockError(null);
                                        // Focus the warehouse selector if possible
                                        const whSelect = document.querySelector('select[value="' + warehouseId + '"]');
                                        (whSelect as any)?.focus();
                                    }}
                                    className="px-6 py-2 text-[13px] font-medium text-[#111] bg-[#ffd814] border border-[#fcd200] rounded-[3px] shadow-sm hover:bg-[#f7ca00] transition-colors active:bg-[#f0b800]"
                                >
                                    Change Warehouse
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
